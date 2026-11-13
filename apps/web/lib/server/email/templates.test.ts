import { describe, expect, it } from "vitest";
import { badgeEmail, count, deletedEmail, goalEmail, reminderEmail, welcomeEmail, type EmailOut } from "./templates";
import { emailLayout, esc } from "./layout";
import en from "../../../messages/en/emails.json";
import ar from "../../../messages/ar/emails.json";

const EVIL = `<script>alert("x")</script>&'`;
const UNSUB = "https://uxgate.org/api/notifications/unsubscribe?t=abc.def&l=en";
const SIGNIN = "https://uxgate.org/en/signin?from=email";

type Kind = "reminder" | "goal" | "welcome" | "badge" | "deleted";
const render = (kind: Kind, locale: "en" | "ar", evil = false): EmailOut => {
  const x = evil ? EVIL : "";
  switch (kind) {
    case "reminder":
      return reminderEmail({
        locale,
        name: `Yasmin${x}`,
        lessonTitle: `Pick the right control · Lesson 2${x}`,
        lessonLead: `Radio buttons or a dropdown?${x}`,
        minutes: 6,
        lessonHref: "/en/app/lesson/forms-u2-l2",
        time: `8:00 PM${x}`,
        settingsHref: "/en/app/settings",
        unsubscribeHref: UNSUB,
      });
    case "goal":
      return goalEmail({
        locale,
        done: 1,
        goal: 2,
        streak: 12,
        minutes: 5,
        reviewDue: 3,
        lessonHref: "/en/app",
        time: `8:00 PM${x}`,
        settingsHref: "/en/app/settings",
        unsubscribeHref: UNSUB,
      });
    case "welcome":
      return welcomeEmail({
        locale,
        name: `Yasmin${x}`,
        pathTitle: `Forms That Flow${x}`,
        unitTitle: `Ask only what you need${x}`,
        startHref: "/en/app",
        time: "8:00 PM",
        settingsHref: "/en/app/settings",
      });
    case "badge":
      return badgeEmail({
        locale,
        skill: `Cut fields you do not need${x}`,
        where: `Forms That Flow · Unit 1${x}`,
        badgesHref: "/en/app/profile",
        settingsHref: "/en/app/settings",
        unsubscribeHref: UNSUB,
      });
    case "deleted":
      return deletedEmail({ locale, deleteAfter: "2026-12-02T10:00:00Z", signinHref: SIGNIN });
  }
};

const KINDS: Kind[] = ["reminder", "goal", "welcome", "badge", "deleted"];
const preheaderOf = (html: string) => html.match(/<div style="display:none;[^"]*">([^<]*?)(&#847;|<)/)?.[1] ?? "";

describe("app emails", () => {
  for (const kind of KINDS)
    for (const locale of ["en", "ar"] as const) {
      describe(`${kind} · ${locale}`, () => {
        const e = render(kind, locale);
        it("has a subject, a preheader, html and text, and nothing undefined", () => {
          expect(e.subject.trim()).not.toBe("");
          expect(preheaderOf(e.html).trim()).not.toBe("");
          expect(e.text).toContain(e.html.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1].replace(/&#39;/g, "'") ?? "<no h1>");
          for (const s of [e.subject, e.html, e.text]) {
            expect(s).not.toMatch(/undefined|null|NaN|\[object Object\]/);
            expect(s).not.toMatch(/\{[a-z]+\}/); // a placeholder left unfilled
          }
        });
        it("is one 600px column with the right direction and language", () => {
          expect(e.html).toContain("max-width:600px");
          expect(e.html).toContain(`<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">`);
          if (locale === "ar") expect(e.html).toContain('dir="rtl"');
          else expect(e.html).not.toContain('dir="rtl"');
          expect(e.html).not.toMatch(/(src|href)="\/(?!\/)/); // every address is absolute
        });
        it("uses the fixed footer and never names a person as the sender", () => {
          expect(e.html).toContain("support@uxgate.org");
          expect(e.html).not.toMatch(/Eyad|إياد/);
        });
        it("has the one-click turn-off link only where it belongs", () => {
          const href = esc(UNSUB);
          if (kind === "reminder" || kind === "goal" || kind === "badge") {
            expect(e.html).toContain(`href="${href}"`);
            expect(e.text).toContain(UNSUB);
          } else {
            expect(e.html).not.toContain("/api/notifications/unsubscribe");
            expect(e.text).not.toContain("/api/notifications/unsubscribe");
          }
        });
        it("escapes every value", () => {
          if (kind === "deleted") return;
          const x = render(kind, locale, true);
          expect(x.html).not.toContain("<script>");
          expect(x.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;");
        });
      });
    }

  it("the sign-in button in the deleted email is followed by its link as text", () => {
    for (const locale of ["en", "ar"] as const) {
      const { html, text } = render("deleted", locale);
      const btn = html.indexOf('class="em-btn"');
      const raw = html.indexOf(`>${esc(SIGNIN)}</a>`);
      expect(btn).toBeGreaterThan(0);
      expect(raw).toBeGreaterThan(btn);
      expect(html.slice(html.lastIndexOf("<p", raw), raw)).toContain('dir="ltr"');
      expect(text).toContain(SIGNIN);
      expect(html).toContain(locale === "ar" ? "2 ديسمبر 2026" : "2 December 2026");
    }
  });

  it("follows the design copy", () => {
    expect(render("reminder", "en").html).toContain("Ready for today’s lesson, Yasmin?");
    expect(render("reminder", "en").html).toContain("Your next lesson takes about 6 minutes.");
    expect(preheaderOf(render("reminder", "en").html)).toBe("Pick the right control · Lesson 2 · about 6 minutes");
    expect(render("reminder", "ar").html).toContain("درسك التالي يستغرق حوالي 6 دقائق.");
    expect(render("goal", "en").html).toContain(
      "You did 1 of your 2 lessons today. The next one takes about 5 minutes, and makes 12 days in a row.",
    );
    expect(render("goal", "ar").html).toContain(
      "أنهيت درسًا من درسين اليوم. الدرس التالي يستغرق حوالي 5 دقائق، وبه تصل إلى 12 يومًا متتاليًا.",
    );
    expect(preheaderOf(render("goal", "en").html)).toBe("About 5 minutes. Your review is ready too.");
    expect(render("goal", "ar").html).toContain("3 مهارات جاهزة للمراجعة");
    expect(render("welcome", "ar").subject).toBe("أهلًا بك في UXGate يا ياسمين".replace("ياسمين", "Yasmin"));
    expect(render("deleted", "en").subject).toBe("Your UXGate account is set to be deleted");
  });

  it("works without a name", () => {
    const w = welcomeEmail({
      locale: "en",
      name: "  ",
      pathTitle: "Forms That Flow",
      unitTitle: "Ask only what you need",
      startHref: "/en/app",
      settingsHref: "/en/app/settings",
    });
    expect(w.subject).toBe("Welcome to UXGate");
    expect(w.html).not.toMatch(/,\s*</);
  });

  it("counts in Arabic with the right plural forms", () => {
    const f = ar.emails.count.aboutMinutes;
    expect(count("ar", f, 1)).toBe("حوالي دقيقة واحدة");
    expect(count("ar", f, 2)).toBe("حوالي دقيقتين");
    expect(count("ar", f, 7)).toBe("حوالي 7 دقائق");
    expect(count("ar", f, 15)).toBe("حوالي 15 دقيقة");
    expect(count("en", en.emails.count.aboutMinutes, 1)).toBe("about 1 minute");
  });

  it("refuses links that are not web or mail addresses", () => {
    const { html } = emailLayout({
      locale: "en",
      preheader: "p",
      heading: "h",
      paragraphs: [],
      button: { label: "Go", href: "javascript:alert(1)" },
      footer: "transactional",
    });
    expect(html).not.toContain("javascript:");
  });

  it("English and Arabic email strings have the same keys", () => {
    const keys = (o: unknown, p = ""): string[] =>
      Object.entries(o as object).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });
});
