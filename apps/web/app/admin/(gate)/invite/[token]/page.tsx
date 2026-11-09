import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { sha256Hex } from "@/lib/admin/tokens";
import { roleName } from "@/lib/admin/permissions";
import { GateCard } from "../../GateCard";
import { AcceptInvite } from "../../GateForms";
import { gateSignOut } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team invite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!hasServiceKey() || !/^[A-Za-z0-9_-]{32,64}$/.test(token)) return <GateCard title="This invite link is not valid" sub="Ask for a new invite."><span /></GateCard>;
  const { data: inv } = await createAdminClient().from("admin_invites").select("email, roles, expires_at, accepted_at, cancelled_at").eq("token_hash", await sha256Hex(token)).maybeSingle();
  if (!inv || inv.accepted_at || inv.cancelled_at || new Date(inv.expires_at) <= new Date()) {
    return <GateCard title="This invite is no longer valid" sub="Invites work once and expire after 72 hours. Ask the person who invited you for a new one."><span /></GateCard>;
  }
  const { data: { user } } = await (await createClient()).auth.getUser();
  const roles = (inv.roles as string[]).map((r) => roleName(r)).join(", ");
  const next = `/admin/invite/${token}`;
  if (!user) {
    return (
      <GateCard title="Join the UXGate team" sub={`You were invited as ${roles}. Sign in with ${inv.email} to accept.`}>
        <Link className="a-btn pri" href={`/admin/signin?next=${encodeURIComponent(next)}`}>Sign in to accept</Link>
        <p className="t-xs ink-3">No UXGate account for {inv.email} yet? Create one on the UXGate sign-up page with that exact email, then open this link again.</p>
      </GateCard>
    );
  }
  if ((user.email ?? "").toLowerCase() !== inv.email) {
    return (
      <GateCard title="This invite is for another email" sub={`It was sent to ${inv.email}, and you are signed in as ${user.email}.`}>
        <form action={gateSignOut}><button className="a-btn pri" type="submit">Sign out and use {inv.email}</button></form>
      </GateCard>
    );
  }
  return (
    <GateCard title="Join the UXGate team" sub={`Signed in as ${user.email}. Your roles: ${roles}. Two-step sign-in comes next.`}>
      <AcceptInvite token={token} />
    </GateCard>
  );
}
