"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, check, run, who, type ActionResult } from "@/lib/admin/guard";
import { reasonFrom, textFrom } from "@/lib/admin/form";
import { certId } from "@/lib/certificate-share";
import { pathTitle } from "@/lib/admin/data/learners";
import { emailLayout } from "@/lib/server/email/layout";
import { REVOKE_REASONS } from "@/lib/admin/rules";
import { sendEmail } from "@/lib/server/email/send";

type R = ActionResult;


async function cert(code: string) {
  if (!/^[0-9a-f]{12}$/.test(code)) throw new AdminError("invalid", "Reload the page and try again.");
  const { data } = await createAdminClient().from("certificates").select("code, path_id, user_id").eq("code", code).maybeSingle();
  if (!data) throw new AdminError("invalid", "That certificate was not found.");
  return data;
}

export async function revokeCertificate(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("certs.manage");
    const c = await cert(String(f.get("code") ?? ""));
    const id = certId(c.path_id, c.code);
    if (String(f.get("typed") ?? "").trim().toUpperCase() !== id) throw new AdminError("invalid", `Type ${id} exactly to confirm.`);
    const key = String(f.get("public") ?? "") as keyof typeof REVOKE_REASONS;
    const pub = REVOKE_REASONS[key];
    if (!pub) throw new AdminError("invalid", "Choose the reason shown on the public page.");
    const reason = reasonFrom(f);
    const db = createAdminClient();
    check(await db.rpc("admin_revoke_certificate", { ...who(ctx), p_code: c.code, p_public_reason: pub, p_reason: reason }));
    // The learner hears it from us first, in their language.
    const { data: u } = await db.auth.admin.getUserById(c.user_id);
    const { data: p } = await db.from("profiles").select("locale").eq("user_id", c.user_id).maybeSingle();
    if (u?.user?.email) {
      const ar = p?.locale === "ar";
      const l = emailLayout({
        locale: ar ? "ar" : "en", preheader: ar ? `الشهادة ${id} لم تعد صالحة` : `Certificate ${id} is no longer valid`,
        heading: ar ? "لم تعد شهادتك صالحة" : "Your certificate is no longer valid",
        paragraphs: [
          ar ? `أوقفنا شهادة «${pathTitle(c.path_id, "ar")}» (${id}). صفحتها العامة تقول الآن إنها لم تعد صالحة، للسبب التالي: ${pub.ar}` : `We revoked your "${pathTitle(c.path_id, "en")}" certificate (${id}). Its public page now says it is no longer valid, for this reason: ${pub.en}`,
          ar ? "تقدّمك ومهاراتك باقية في حسابك. إن كان هذا خطأ، ردّ على هذه الرسالة." : "Your progress and skills stay in your account. If this is a mistake, reply to this email.",
        ],
        footer: "transactional",
      });
      await sendEmail({ to: u.user.email, subject: ar ? "لم تعد شهادتك صالحة" : "Your certificate is no longer valid", html: l.html, text: l.text, kind: "certificate_revoked", userId: c.user_id, from: "UXGate Support <support@uxgate.org>" });
    }
  }, "Revoked. The public page now says it is no longer valid.");
}

export async function reissueCertificate(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("certs.manage");
    const c = await cert(String(f.get("code") ?? ""));
    const name = textFrom(f, "name", 60);
    if (name && name.length < 2) throw new AdminError("invalid", "A name needs at least 2 characters.");
    check(await createAdminClient().rpc("admin_reissue_certificate", { ...who(ctx), p_code: c.code, p_name: name, p_reason: reasonFrom(f) }));
  }, `Re-issued. The certificate and its share preview show the new name.`);
}
