"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, check, requireFresh, run, who, type ActionResult } from "@/lib/admin/guard";
import { GRANT_PHRASE, INVITE_HOURS, reasonOf } from "@/lib/admin/rules";
import { newToken, sha256Hex } from "@/lib/admin/tokens";
import { PERMISSION_KEYS, roleName } from "@/lib/admin/permissions";
import { hasTwoStep, listMembers } from "@/lib/admin/data/team";
import { sendEmail } from "@/lib/server/email/send";
import { emailLayout, siteOrigin } from "@/lib/server/email/layout";
import { membersOfRole, syncTeamTools } from "@/lib/admin/team-tools-sync";

type R = ActionResult;
const reason = (f: FormData) => {
  const r = reasonOf(f.get("reason"));
  if (!r) throw new AdminError("invalid", "Write a reason of at least 3 characters.");
  return r;
};
const uuid = (v: unknown) => {
  const p = z.string().uuid().safeParse(v);
  if (!p.success) throw new AdminError("invalid", "Something is missing. Reload the page and try again.");
  return p.data;
};
const rolesOf = (f: FormData) => f.getAll("roles").map(String).filter((r) => /^[a-z][a-z0-9_]{1,40}$/.test(r));

async function sendInvite(email: string, roles: string[], token: string, from: string) {
  const href = `${siteOrigin()}/admin/invite/${token}`;
  const l = emailLayout({
    locale: "en", preheader: "You are invited to the UXGate admin panel", heading: "Join the UXGate team",
    paragraphs: [`${from} invited you to the UXGate admin panel as ${roles.map((r) => roleName(r)).join(", ")}.`,
      `Accept with a UXGate account that uses this email address (${email}). You will set up two-step sign-in with an authenticator app.`],
    button: { label: "Accept the invite", href, showLink: true },
    notes: [`The link works once and expires in ${INVITE_HOURS} hours.`], safety: "Not expecting this? You can ignore this email.", footer: "transactional",
  });
  return sendEmail({ to: email, subject: "You are invited to the UXGate admin panel", html: l.html, text: l.text, kind: "admin_invite" });
}

export async function inviteMember(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.invite");
    const email = z.string().email().max(254).safeParse(String(f.get("email") ?? "").trim().toLowerCase());
    if (!email.success) throw new AdminError("invalid", "Enter a full email, like name@example.com.");
    const roles = rolesOf(f);
    if (!roles.length) throw new AdminError("invalid", "Choose at least one role. A new person sees nothing until they have a role.");
    const token = newToken();
    check(await createAdminClient().rpc("admin_invite", { ...who(ctx), p_email: email.data, p_roles: roles, p_token_hash: await sha256Hex(token) }));
    const sent = await sendInvite(email.data, roles, token, ctx.name);
    if (!sent.ok) throw new AdminError("failed", "The invite is saved but the email did not go out. Use Resend invite.");
  }, "Invite sent.");
}

export async function resendInvite(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.invite");
    const id = uuid(f.get("invite"));
    const db = createAdminClient();
    const { data: inv } = await db.from("admin_invites").select("email, roles").eq("id", id).is("accepted_at", null).is("cancelled_at", null).maybeSingle();
    if (!inv) throw new AdminError("invalid", "That invite is no longer open.");
    const token = newToken();
    // A fresh invite (new link, new 72 hours) replaces the old one.
    check(await db.rpc("admin_invite", { ...who(ctx), p_email: inv.email, p_roles: inv.roles, p_token_hash: await sha256Hex(token) }));
    const sent = await sendInvite(inv.email, inv.roles, token, ctx.name);
    if (!sent.ok) throw new AdminError("failed", "The email did not go out. Try again in a minute.");
  }, "A new invite link was sent.");
}

export async function cancelInvite(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.invite");
    check(await createAdminClient().rpc("admin_cancel_invite", { ...who(ctx), p_invite: uuid(f.get("invite")) }));
  }, "Invite cancelled.");
}

export async function changeRoles(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.invite");
    const target = uuid(f.get("user"));
    if (target === ctx.userId) throw new AdminError("forbidden", "Nobody changes their own roles. Ask another admin.");
    const r = reason(f);
    await requireFresh(ctx, f.get("code") as string | null);
    check(await createAdminClient().rpc("admin_set_roles", { ...who(ctx), p_target: target, p_roles: rolesOf(f), p_reason: r }));
    await syncTeamTools([target]);
  }, "Roles changed.");
}

export async function setMemberStatus(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.invite");
    const status = f.get("status") === "suspended" ? "suspended" : "active";
    const r = reason(f);
    await requireFresh(ctx, f.get("code") as string | null);
    const target = uuid(f.get("user"));
    check(await createAdminClient().rpc("admin_set_status", { ...who(ctx), p_target: target, p_status: status, p_reason: r }));
    await syncTeamTools([target]);
  }, "Done.");
}

export async function removeMember(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.invite");
    const r = reason(f);
    await requireFresh(ctx, f.get("code") as string | null);
    const target = uuid(f.get("user"));
    check(await createAdminClient().rpc("admin_remove_member", { ...who(ctx), p_target: target, p_reason: r }));
    await syncTeamTools([target]);
  }, "Removed from the team.");
}

async function tellSuperAdmins(except: string, subject: string, lines: string[]) {
  const members = await listMembers();
  await Promise.all(members.filter((m) => m.status === "active" && m.roles.includes("super_admin") && m.userId !== except).map((m) => {
    const l = emailLayout({ locale: "en", preheader: subject, heading: subject, paragraphs: lines, button: { label: "Open Super admins", href: `${siteOrigin()}/admin/team/super-admins` }, footer: "transactional" });
    return sendEmail({ to: m.email, subject, html: l.html, text: l.text, kind: "admin_super" });
  }));
}

export async function grantSuper(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.super");
    const target = uuid(f.get("user"));
    if (String(f.get("typed") ?? "").trim() !== GRANT_PHRASE) throw new AdminError("invalid", `Type ${GRANT_PHRASE} exactly.`);
    const r = reason(f);
    if (!(await hasTwoStep(target))) throw new AdminError("invalid", "This person must turn on two-step sign-in first.");
    await requireFresh(ctx, f.get("code") as string | null);
    check(await createAdminClient().rpc("admin_request_super", { ...who(ctx), p_target: target, p_reason: r }));
    const m = (await listMembers()).find((x) => x.userId === target);
    await tellSuperAdmins(ctx.userId, "A super admin grant is waiting 24 hours", [`${ctx.name} (${ctx.email}) asked to make ${m?.email ?? "a team member"} a super admin.`, `Reason: ${r}`, "It takes effect in 24 hours. Any super admin can cancel it before then."]);
  }, "Grant started. It takes effect in 24 hours unless a super admin cancels it.");
}

export async function cancelGrant(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.super");
    const r = reason(f);
    check(await createAdminClient().rpc("admin_cancel_super", { ...who(ctx), p_grant: uuid(f.get("grant")), p_reason: r }));
    await tellSuperAdmins(ctx.userId, "A super admin grant was cancelled", [`${ctx.name} cancelled a pending super admin grant.`, `Reason: ${r}`]);
  }, "Grant cancelled.");
}

export async function removeSuper(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.super");
    const r = reason(f);
    await requireFresh(ctx, f.get("code") as string | null);
    check(await createAdminClient().rpc("admin_remove_super", { ...who(ctx), p_target: uuid(f.get("user")), p_reason: r }));
    await tellSuperAdmins(ctx.userId, "Super admin removed", [`${ctx.name} removed super admin from a team member.`, `Reason: ${r}`]);
  }, "Super admin removed.");
}

const roleId = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

export async function saveRole(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.roles");
    const name = String(f.get("name") ?? "").trim();
    if (name.length < 2 || name.length > 60) throw new AdminError("invalid", "Give the role a name of 2 to 60 characters.");
    const perms = f.getAll("perms").map(String).filter((p) => (PERMISSION_KEYS as string[]).includes(p) && p !== "team.super");
    if (!perms.length) throw new AdminError("invalid", "Tick at least one permission.");
    const description = String(f.get("description") ?? "").trim().slice(0, 300);
    const existing = String(f.get("id") ?? "");
    const db = createAdminClient();
    const r = reason(f);
    await requireFresh(ctx, f.get("code") as string | null);
    if (existing) {
      const { data: before } = await db.from("admin_roles").select("name, description, permissions, builtin").eq("id", existing).maybeSingle();
      if (!before || before.builtin) throw new AdminError("invalid", "Built-in roles cannot be changed.");
      check(await db.from("admin_roles").update({ name, description, permissions: perms }).eq("id", existing));
      await syncTeamTools(await membersOfRole(existing));
      check(await db.rpc("admin_log", { ...who(ctx), p_action: "team.role_changed", p_area: "team", p_target_type: "role", p_target_id: existing, p_target_label: name, p_before: before, p_after: { name, description, permissions: perms }, p_reason: r }));
    } else {
      const id = `custom_${roleId(name)}`.slice(0, 41);
      check(await db.from("admin_roles").insert({ id, name, description, permissions: perms, created_by: ctx.userId }));
      check(await db.rpc("admin_log", { ...who(ctx), p_action: "team.role_created", p_area: "team", p_target_type: "role", p_target_id: id, p_target_label: name, p_before: null, p_after: { name, description, permissions: perms }, p_reason: r }));
    }
  }, "Role saved.");
}

export async function deleteRole(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("team.roles");
    const id = String(f.get("id") ?? "");
    const db = createAdminClient();
    const { data: before } = await db.from("admin_roles").select("name, permissions, builtin").eq("id", id).maybeSingle();
    if (!before || before.builtin) throw new AdminError("invalid", "Built-in roles cannot be deleted.");
    const { count } = await db.from("admin_member_roles").select("user_id", { count: "exact", head: true }).eq("role_id", id);
    if (count) throw new AdminError("conflict", `${count} people still have this role. Change their roles first.`);
    const r = reason(f);
    check(await db.from("admin_roles").delete().eq("id", id));
    check(await db.rpc("admin_log", { ...who(ctx), p_action: "team.role_deleted", p_area: "team", p_target_type: "role", p_target_id: id, p_target_label: before.name, p_before: before, p_after: null, p_reason: r }));
  }, "Role deleted.");
}
