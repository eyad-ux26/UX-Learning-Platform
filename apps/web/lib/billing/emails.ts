// Billing emails in English and Arabic (copy from canvas v63, EmailPages: receipt, renewSoon, payFailed, cancelled,
// refundYes, refundNo, walletDue), plus the student link and the note to support about a refund request.
// Billing emails always arrive: they cannot be turned off. Pure: returns subject, HTML and text.
import { formatMoney } from "./pricing";
import type { Payment, RefundRequest } from "./engine";
import { REFUND_DAYS, RETRY_DAYS, type Sub } from "./subscription";

export type EmailKind = "receipt" | "renewSoon" | "payFailed" | "cancelled" | "refundYes" | "refundNo" | "walletDue" | "studentLink" | "refundAsked";
export type Locale = "en" | "ar";

export type EmailInput = {
  locale: Locale;
  site: string;
  name: string | null;
  sub?: Sub | null;
  payment?: Payment | null;
  request?: RefundRequest | null;
  extra?: Record<string, string>;
};

export type Email = { subject: string; preheader: string; html: string; text: string };

const DAY = 86_400_000;
const dt = (iso: string | null | undefined, locale: Locale, long = false) =>
  iso ? new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: long || locale === "ar" ? "long" : "short", year: "numeric", timeZone: "Africa/Cairo" }).format(new Date(iso)) : "";
const dm = (iso: string | null | undefined, locale: Locale) =>
  iso ? new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "long", timeZone: "Africa/Cairo" }).format(new Date(iso)) : "";
const plus = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString();

const cardName = (brand: string | null | undefined, last4: string | null | undefined, locale: Locale) => {
  if (brand === "wallet") return locale === "ar" ? `محفظة إلكترونية •••• ${last4 ?? ""}` : `Mobile wallet •••• ${last4 ?? ""}`;
  const b = brand ? brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase() : locale === "ar" ? "البطاقة" : "Card";
  return last4 ? `${b} •••• ${last4}` : b;
};
const planName = (period: string, locale: Locale) => `UXGate Pro · ${period === "year" ? (locale === "ar" ? "سنوي" : "annual") : locale === "ar" ? "شهري" : "monthly"}`;

type Body = { subject: string; preheader: string; heading: string; paragraphs: string[]; rows?: [string, string][]; button?: { label: string; href: string }; notes?: string[]; why: string; dir?: "rtl" | "ltr" };

function content(kind: EmailKind, i: EmailInput): Body {
  const L = i.locale, ar = L === "ar";
  const billing = `${i.site}/${L}/app/settings/billing`;
  const sub = i.sub ?? null, pay = i.payment ?? null;
  const name = i.name?.trim() || (ar ? "" : "");
  const hi = (en: string, a: string) => (ar ? a : en);
  const why = hi("This email is about your payments, so it always arrives.", "هذه الرسالة تخص مدفوعاتك، لذلك تصل دائمًا.");
  const money = (n: number, cur: string) => formatMoney(n, cur, L);

  switch (kind) {
    case "receipt": {
      const p = pay!;
      const amount = money(p.amountMinor, p.currency);
      const next = sub && sub.status === "active" ? hi(`${money(sub.renewAmountMinor, sub.currency)} on ${dt(sub.currentPeriodEnd, L)}`, `${money(sub.renewAmountMinor, sub.currency)} في ${dt(sub.currentPeriodEnd, L)}`) : null;
      const rows: [string, string][] = [
        [hi("Receipt", "رقم الإيصال"), p.receiptNo], [hi("Date", "التاريخ"), dt(p.paidAt, L)], [hi("Plan", "الخطة"), planName(p.period, L)],
        [hi("Paid with", "طريقة الدفع"), cardName(p.cardBrand, p.cardLast4, L)], [hi("Amount", "المبلغ"), amount],
      ];
      if (next) rows.push([hi("Next charge", "الدفعة التالية"), next]);
      return {
        subject: hi(`Your UXGate receipt · ${amount}`, `إيصال UXGate · ${amount}`),
        preheader: hi(`${planName(p.period, L).replace(" · ", ", ")} · paid on ${dt(p.paidAt, L)}`, `${planName(p.period, L).replace(" · ", " ")} · دُفع في ${dt(p.paidAt, L)}`),
        heading: name ? hi(`Thanks, ${name}. Here is your receipt.`, `شكرًا يا ${name}، هذا إيصالك.`) : hi("Thanks. Here is your receipt.", "شكرًا لك، هذا إيصالك."),
        paragraphs: [hi("Your payment went through, and Pro is on.", "تمّت عملية الدفع، وأصبح Pro مفعّلًا.")],
        rows,
        button: { label: hi("Download the receipt (PDF)", "نزّل الإيصال (PDF)"), href: `${billing}/receipt/${p.id}` },
        notes: [hi(`Changed your mind? You can ask for a refund until ${dm(plus(p.paidAt, REFUND_DAYS), L)} in Settings, Plan and billing.`, `غيّرت رأيك؟ يمكنك طلب استرداد المبلغ حتى ${dm(plus(p.paidAt, REFUND_DAYS), L)} من الإعدادات، «الخطة والدفع».`)],
        why,
      };
    }
    case "renewSoon": {
      const s = sub!;
      const amount = money(s.renewAmountMinor, s.currency), on = dt(s.currentPeriodEnd, L), onLong = dt(s.currentPeriodEnd, L, true), day = dm(s.currentPeriodEnd, L);
      return {
        subject: hi(`Your annual plan renews on ${day}`, `تتجدّد خطتك السنوية في ${day}`),
        preheader: hi(`${amount} on ${on}. Nothing to do if you want to keep it.`, `${amount} في ${on}. لا تحتاج إلى فعل شيء إن أردت الاستمرار.`),
        heading: hi("Your annual plan renews in 7 days", "تتجدّد خطتك السنوية بعد 7 أيام"),
        paragraphs: [hi(`We will charge your card on ${onLong}, so you keep UXGate Pro for another year.`, `سنخصم المبلغ من بطاقتك في ${onLong}، ليستمر معك UXGate Pro سنة أخرى.`)],
        rows: [[hi("Renews on", "تاريخ التجديد"), on], [hi("Amount", "المبلغ"), amount], [hi("Card", "البطاقة"), cardName(s.cardBrand, s.cardLast4, L)]],
        button: { label: hi("Manage my plan", "إدارة خطتي"), href: billing },
        notes: [hi(`Don’t want it? Cancel before ${day} and you won’t be charged. You can also switch to monthly.`, `لا تريد التجديد؟ ألغِ قبل ${day} ولن يُخصم أي مبلغ. ويمكنك أيضًا الانتقال إلى الخطة الشهرية.`)],
        why,
      };
    }
    case "payFailed": {
      const s = sub!;
      const amount = money(s.renewAmountMinor, s.currency), charge = dm(s.currentPeriodEnd, L), until = dm(s.graceUntil, L);
      const [r1, r2] = RETRY_DAYS.map((d) => dm(plus(s.currentPeriodEnd, d), L));
      return {
        subject: hi("We couldn’t take your UXGate payment", "لم نتمكّن من تحصيل دفعة UXGate"),
        preheader: hi(`Pro stays on until ${until}. Updating your card takes a minute.`, `يبقى Pro مفعّلًا حتى ${until}. تحديث البطاقة يستغرق دقيقة.`),
        heading: hi("Your payment didn’t go through", "لم تتم عملية الدفع"),
        paragraphs: s.provider === "paddle"
          ? [hi(`Your bank declined the ${amount} charge on ${charge}. This often happens when a card expires or online payments are turned off.`, `رفض البنك دفعة ${amount} في ${charge}. يحدث هذا غالبًا عند انتهاء صلاحية البطاقة أو إيقاف الدفع عبر الإنترنت.`),
            hi(`Pro stays on until ${until}, and we will try again in the next few days.`, `يبقى Pro مفعّلًا حتى ${until}، وسنحاول مرة أخرى خلال الأيام القادمة.`)]
          : [hi(`Your bank declined the ${amount} charge on ${charge}. This often happens when a card expires or online payments are turned off.`, `رفض البنك دفعة ${amount} في ${charge}. يحدث هذا غالبًا عند انتهاء صلاحية البطاقة أو إيقاف الدفع عبر الإنترنت.`),
            hi(`Pro stays on until ${until}, and we will try again on ${r1} and ${r2}.`, `يبقى Pro مفعّلًا حتى ${until}، وسنحاول مرة أخرى في ${r1} و${r2}.`)],
        button: { label: hi("Update my card", "حدّث بطاقتي"), href: billing },
        notes: [hi("Your progress is safe, whatever happens.", "تقدّمك محفوظ مهما حدث.")],
        why,
      };
    }
    case "cancelled": {
      const s = sub!;
      const long = dt(s.currentPeriodEnd, L, true), day = dm(s.currentPeriodEnd, L);
      return {
        subject: hi("Your UXGate Pro plan is cancelled", "أُلغيت خطة UXGate Pro"),
        preheader: hi(`Pro stays on until ${long}.`, `يبقى Pro مفعّلًا حتى ${long}.`),
        heading: hi("Your plan is cancelled", "أُلغيت خطتك"),
        paragraphs: [hi(`We won’t charge you again. Pro stays on until ${long}. After that, all your progress stays in your account, and Unit 1 of every path stays open.`, `لن نخصم منك أي مبلغ بعد الآن. يبقى Pro مفعّلًا حتى ${long}، وبعدها يبقى كل تقدّمك في حسابك، والوحدة 1 من كل مسار متاحة.`)],
        button: { label: hi("Resume my plan", "استأنف خطتي"), href: billing },
        notes: [hi(`Resume before ${day} and nothing changes.`, `استأنف قبل ${day} ولن يتغيّر شيء.`)],
        why,
      };
    }
    case "refundYes": {
      const p = pay!;
      const amount = money(p.amountMinor, p.currency), card = cardName(p.cardBrand, p.cardLast4, L);
      return {
        subject: hi("Your refund is approved", "قُبل طلب استرداد المبلغ"),
        preheader: hi(`${amount} back to ${card} in 5 to 10 working days.`, `يعود ${amount} إلى ${card} خلال 5 إلى 10 أيام عمل.`),
        heading: hi("Your refund is approved", "قُبل طلب الاسترداد"),
        paragraphs: [hi(`We sent ${amount} back to ${card}. Banks take 5 to 10 working days to show it.`, `أعدنا ${amount} إلى ${card}. يستغرق ظهوره في البنك من 5 إلى 10 أيام عمل.`),
          hi("Pro has ended. Your progress, streak and badges stay in your account, and Unit 1 of every path stays open.", "انتهى Pro. ويبقى تقدّمك وسلسلتك وشاراتك في حسابك، والوحدة 1 من كل مسار متاحة.")],
        button: { label: hi("See my requests", "اعرض طلباتي"), href: `${billing}/requests` },
        notes: [hi("The UXGate team", "فريق UXGate")],
        why,
      };
    }
    case "refundNo": {
      const p = pay!, r = i.request!;
      const amount = money(p.amountMinor, p.currency);
      const until = sub?.currentPeriodEnd ? dm(sub.currentPeriodEnd, L) : "";
      return {
        subject: hi("About your refund request", "بخصوص طلب استرداد المبلغ"),
        preheader: hi("The charge was more than 7 days ago.", "مرّ أكثر من 7 أيام على الدفعة."),
        heading: hi("We can’t refund this charge", "لا يمكننا استرداد هذه الدفعة"),
        paragraphs: [hi(`You wrote to us on ${dm(r.createdAt, L)} about the ${amount} charge on ${dm(p.paidAt, L)}. Refunds are possible within 7 days of a charge, so we can’t refund this one.`, `راسلتنا في ${dm(r.createdAt, L)} بخصوص دفعة ${amount} في ${dm(p.paidAt, L)}. يمكن استرداد المبلغ خلال 7 أيام من الدفعة، لذلك لا يمكننا استرداد هذه الدفعة.`),
          ...(until ? [hi(`You can still cancel. You won’t be charged again, and Pro stays on until ${until}.`, `ما زال بإمكانك الإلغاء، فلن يُخصم منك أي مبلغ بعد الآن، ويبقى Pro مفعّلًا حتى ${until}.`)] : [])],
        button: { label: hi("Manage my plan", "إدارة خطتي"), href: billing },
        notes: [hi("If something went wrong with the charge itself, reply to this email and we will look again.", "إن حدث خطأ في الدفعة نفسها، ردّ على هذه الرسالة وسنراجعها مرة أخرى."), hi("The UXGate team", "فريق UXGate")],
        why,
      };
    }
    case "walletDue": {
      const s = sub!;
      const amount = money(s.renewAmountMinor, s.currency), by = dm(s.currentPeriodEnd, L);
      return {
        subject: hi(`Your plan renews on ${by} · pay with your wallet`, `تتجدّد خطتك في ${by} · ادفع بمحفظتك`),
        preheader: hi(`${amount} by ${by} keeps Pro going. Wallets don’t renew by themselves.`, `ادفع ${amount} قبل ${by} ليستمر Pro. المحافظ لا تتجدّد تلقائيًا.`),
        heading: hi("Time to pay for next month", "حان وقت الدفع للشهر القادم"),
        paragraphs: [hi(`You pay for UXGate Pro with a mobile wallet, and wallets can’t renew by themselves. Pay ${amount} by ${by} to keep Pro going.`, `تدفع اشتراك UXGate Pro بمحفظة إلكترونية، والمحافظ لا تتجدّد تلقائيًا. ادفع ${amount} قبل ${by} ليستمر Pro.`),
          hi("Miss the date? Pro stays on for 7 more days, so you have time.", "فاتك الموعد؟ يبقى Pro مفعّلًا 7 أيام أخرى، فلديك وقت.")],
        rows: [[hi("Plan", "الخطة"), planName(s.period, L)], [hi("Amount", "المبلغ"), amount], [hi("Pay by", "ادفع قبل"), dt(s.currentPeriodEnd, L)]],
        button: { label: hi("Pay with my wallet", "ادفع بمحفظتي"), href: billing },
        notes: [hi("Want it to renew by itself? Pay with a card instead, from Plan and billing.", "تريد أن يتجدّد تلقائيًا؟ ادفع ببطاقة بدلًا من ذلك، من «الخطة والدفع».")],
        why,
      };
    }
    case "studentLink":
      return {
        subject: hi("Confirm your student price", "أكّد سعر الطلاب"),
        preheader: hi("The link works for 24 hours.", "يعمل الرابط لمدة 24 ساعة."),
        heading: hi("Confirm your university email", "أكّد بريدك الجامعي"),
        paragraphs: [hi("Use the button to confirm this address and get 40% off UXGate Pro.", "استخدم الزر لتأكيد هذا العنوان والحصول على خصم 40% على UXGate Pro.")],
        button: { label: hi("Confirm my student price", "أكّد سعر الطلاب"), href: i.extra?.link ?? `${i.site}/${L}/app/plans` },
        notes: [hi("The link works once, for 24 hours. Didn’t ask for this? You can ignore this email.", "يعمل الرابط مرة واحدة لمدة 24 ساعة. لم تطلب هذا؟ يمكنك تجاهل هذه الرسالة.")],
        why: hi("This email is about your payments, so it always arrives.", "هذه الرسالة تخص مدفوعاتك، لذلك تصل دائمًا."),
      };
    case "refundAsked": {
      const p = pay!, r = i.request!;
      return {
        subject: `Refund request · ${formatMoney(p.amountMinor, p.currency, "en")} · ${p.receiptNo}`,
        preheader: `Asked on ${dt(r.createdAt, "en")}. Answer within 2 working days.`,
        heading: "A learner asked for a refund",
        paragraphs: [`Reason: “${r.reason}”`, "Refund it in the provider’s dashboard (Pro ends when the refund is made) or decline it. The admin panel will do this in one place later."],
        rows: [["Learner", i.extra?.email ?? ""], ["Receipt", p.receiptNo], ["Charge", `${formatMoney(p.amountMinor, p.currency, "en")} on ${dt(p.paidAt, "en")}`], ["Provider", `${p.provider} · ${p.providerPaymentId}`], ["Request id", r.id]],
        why: "Sent to support@uxgate.org for every refund request.",
        dir: "ltr",
      };
    }
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One 600px column, solid colours, the button ledge drawn as a bottom border, system fonts (slice 4 email layout). */
export function renderEmail(kind: EmailKind, input: EmailInput): Email {
  const b = content(kind, input);
  const dir = b.dir ?? (input.locale === "ar" ? "rtl" : "ltr");
  const align = dir === "rtl" ? "right" : "left";
  const font = "system-ui,-apple-system,'Segoe UI',Roboto,Tahoma,Arial,sans-serif";
  const rows = b.rows?.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #D3E8F0;margin:16px 0">${b.rows.map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #D3E8F0;font-size:14px;color:#3D5D73;text-align:${align}">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #D3E8F0;font-size:14px;font-weight:700;color:#012E4B;text-align:${dir === "rtl" ? "left" : "right"}">${esc(v)}</td></tr>`).join("")}</table>`
    : "";
  const button = b.button ? `<p style="margin:20px 0"><a href="${esc(b.button.href)}" style="display:inline-block;background:#005F99;color:#FFFFFF;font-weight:700;font-size:17px;text-decoration:none;padding:14px 26px;border-radius:14px;border-bottom:4px solid #003F66">${esc(b.button.label)}</a></p>` : "";
  const html = `<!doctype html><html lang="${input.locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(b.subject)}</title></head>
<body style="margin:0;background:#EEF3F6;font-family:${font};color:#012E4B">
<span style="display:none;max-height:0;overflow:hidden">${esc(b.preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px" dir="${dir}">
<tr><td style="padding:0 4px 16px;text-align:${align}"><img src="${esc(input.site)}/brand/logo.svg" alt="UXGate" height="30" style="height:30px"></td></tr>
<tr><td style="background:#FFFFFF;border:1px solid #D3E8F0;border-radius:16px;padding:24px 22px;text-align:${align}">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#012E4B">${esc(b.heading)}</h1>
${b.paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:16px;line-height:${input.locale === "ar" ? 1.8 : 1.6}">${esc(p)}</p>`).join("")}
${rows}${button}
${(b.notes ?? []).map((n) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#3D5D73">${esc(n)}</p>`).join("")}
</td></tr>
<tr><td style="padding:16px 8px;font-size:12.5px;line-height:1.5;color:#4B555E;text-align:${align}">${esc(b.why)}<br>${esc(input.locale === "ar" ? "UXGate · uxgate.org · لديك سؤال؟ ردّ على هذه الرسالة أو راسلنا على support@uxgate.org." : "UXGate · uxgate.org · Questions? Reply to this email or write to support@uxgate.org.")}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [b.heading, "", ...b.paragraphs, "", ...(b.rows ?? []).map(([k, v]) => `${k}: ${v}`), "", ...(b.button ? [`${b.button.label}: ${b.button.href}`, ""] : []), ...(b.notes ?? []), "", b.why].join("\n");
  return { subject: b.subject, preheader: b.preheader, html, text };
}
