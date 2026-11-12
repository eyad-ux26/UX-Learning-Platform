import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Locale, Mock, MockBlock } from "@uxgate/content/types";
// @ts-expect-error plain ESM helper shared with the validator and the preview build
import { loadContent, resolveAll } from "../../../scripts/lib/content.mjs";
import { MockView, accessibleBrand } from "../src/ui/MockView";
import { ART_NAMES } from "../src/ui/art";
import vocab from "../src/mock-vocab.json";

/** Every block kind the app draws (the validator reads the same list). A kind outside it would show as plain text. */
const KINDS: string[] = vocab.kinds;

type Found = { where: string; mock: Mock };
function mocksIn(node: unknown, where: string, out: Found[]) {
  if (Array.isArray(node)) node.forEach((n) => mocksIn(n, where, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "mock" && v && typeof v === "object" && Array.isArray((v as Mock).blocks)) out.push({ where, mock: v as Mock });
      mocksIn(v, where, out);
    }
  }
}
const all: Found[] = [];
for (const p of loadContent()) for (const u of p.units) for (const l of [...u.lessons, ...u.bank]) mocksIn(resolveAll(l.steps, p.fixtures, [], l._file), l._file, all);

const blocksOf = (m: Mock): MockBlock[] => {
  const out: MockBlock[] = [];
  const walk = (bs: MockBlock[] = []) => bs.forEach((b) => { out.push(b); walk(b.blocks); });
  walk(m.blocks);
  walk(m.overlay?.blocks);
  return out;
};
const render = (mock: Mock, locale: Locale) => renderToStaticMarkup(<MockView mock={mock} locale={locale} label="Example" tag="Example" chip="MOCK" />);

describe("MockView draws every mock in the content", () => {
  it("finds the content's mocks", () => expect(all.length).toBeGreaterThan(1000));

  it("knows every block kind the content uses", () => {
    const unknown = new Set<string>();
    for (const f of all) for (const b of blocksOf(f.mock)) if (!KINDS.includes(b.kind)) unknown.add(`${b.kind} (${f.where})`);
    expect([...unknown]).toEqual([]);
  });

  it("renders every mock without throwing", () => {
    const bad: string[] = [];
    for (const f of all) for (const locale of ["en", "ar"] as const) try { render(f.mock, locale); } catch (e) { bad.push(`${f.where} ${locale}: ${(e as Error).message.slice(0, 80)} :: ${JSON.stringify(f.mock).slice(0, 300)}`); }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("renders each mock in English and Arabic, with overlays, FABs and structured kinds drawn", () => {
    const marks: Record<string, string> = { slider: 'class="sl', calendar: 'class="cal', wheel: 'class="whl"', chips: 'class="cps', stepper: 'class="stp' };
    for (const f of all) for (const locale of ["en", "ar"] as const) {
      const html = render(f.mock, locale);
      if (f.mock.overlay) expect(html, f.where).toContain(`ov ov-${f.mock.overlay.type}`);
      if (f.mock.fab) expect(html, f.where).toContain("k-fab");
      for (const b of blocksOf(f.mock)) if (marks[b.kind]) expect(html, `${b.kind} in ${f.where}`).toContain(marks[b.kind]);
    }
  });
});

describe("Mock vocabulary", () => {
  it("draws every art name the validator accepts", () => expect([...ART_NAMES].sort()).toEqual([...vocab.art].sort()));
  it("lists the props of every block kind, including every prop MockView reads", () => {
    const props = vocab.props as Record<string, string[]>;
    expect(KINDS.filter((k) => !props[k])).toEqual([]);
    const listed = new Set(Object.values(props).flat());
    const src = readFileSync(new URL("../src/ui/MockView.tsx", import.meta.url), "utf8");
    const read = new Set([...src.matchAll(/\bb\.([a-zA-Z]+)/g)].map((m) => m[1]));
    expect([...read].filter((p) => !listed.has(p))).toEqual([]);
  });
});

describe("MockView details", () => {
  const T = (en: string, ar: string) => ({ en, ar });
  it("draws a dialog over a dimmed screen, and a toast without dimming", () => {
    const dialog = render({ blocks: [{ kind: "title", text: "Cards" }], overlay: { type: "dialog", close: true, blocks: [{ kind: "heading", text: "Remove?" }] } }, "en");
    expect(dialog).toContain('class="scrim"');
    expect(dialog).toContain('class="ovx"');
    const toast = render({ blocks: [], overlay: { type: "toast", blocks: [{ kind: "text", text: "Saved" }] } }, "en");
    expect(toast).not.toContain("scrim");
  });
  it("isolates codes inside Arabic text without flipping the whole line", () => {
    const html = render({ blocks: [{ kind: "heading", text: T("Remove Visa ending 4821?", "حذف Visa التي تنتهي بـ 4821؟") }] }, "ar");
    expect(html).not.toContain("<bdi");
    expect(render({ blocks: [{ kind: "meta", text: T("Gate WS-204", "البوابة WS-204") }] }, "ar")).toContain("⁦WS-204⁩");
  });
  it("draws **bold** in mock text", () => {
    expect(render({ blocks: [{ kind: "text", text: "Pay **EGP 120** now" }] }, "en")).toContain("<b>EGP 120</b>");
  });
  it("accepts a plain-string caption", () => {
    expect(render({ caption: "320 px" as never, blocks: [] }, "en")).toContain("Example · 320 px");
  });
  it("draws app chrome with the product name and brand colour", () => {
    const app = { id: "kanz", name: T("Kanz", "كنز"), color: "#0E7C66", icon: "wallet" };
    const html = render({ app, appbar: { title: T("Saved cards", "البطاقات المحفوظة"), back: true }, tabbar: { active: 0, items: [{ icon: "house", text: "Home" }, { icon: "user", aria: "Profile" }] },
      blocks: [{ kind: "listitem", art: "bank-card", text: "Visa •••• 4821", sub: "Expires 08/27", chevron: true }] } as never, "en");
    expect(html).toContain("Kanz");
    expect(html).toContain("--mock-brand:#0E7C66");
    expect(html).toContain("xi-house-fill");
    expect(html).toContain("<svg");
    expect(html).not.toContain(">MOCK<");
  });
  it("shows a browser bar with the URL on wide frames", () => {
    const html = render({ frame: "wide", url: "maktaba.example/search", blocks: [{ kind: "searchbar", text: "UX books" }] } as never, "en");
    expect(html).toContain("maktaba.example/search");
  });
  it("points carets and arrows the reading way in Arabic", () => {
    const mock = { appbar: { title: T("Cards", "البطاقات"), back: true }, blocks: [{ kind: "listitem", text: "Visa", chevron: true }, { kind: "button", icon: "arrow-right", text: "Next" }, { kind: "button", icon: "arrows-left-right", text: "Swap" }] } as never;
    const en = render(mock, "en"), ar = render(mock, "ar");
    expect(en).toContain("xi-caret-left xm-back");
    expect(ar).toContain("xi-caret-right xm-back");
    expect(ar).toContain("xi-caret-left");
    expect(ar).toContain("xi-arrow-left");
    expect(ar).toContain("xi-arrows-left-right");
  });
  it("darkens a light product colour until white text on it passes AA, and keeps dark ones", () => {
    expect(accessibleBrand("#F97316")).not.toBe("#F97316");
    expect(accessibleBrand("#1C3D6E")).toBe("#1C3D6E");
    const html = render({ app: { id: "nashat", name: "Nashat", color: "#F97316", icon: "barbell" }, blocks: [{ kind: "button", text: "Join" }] } as never, "en");
    expect(html).toContain(`--mock-brand:${accessibleBrand("#F97316")}`);
    expect(html).toContain("background:#F97316"); // the label swatch keeps the exact colour
  });
  it("quotes the screen reader strip with the language's own quote marks", () => {
    const mock = { blocks: [], reader: T("Button, Pay", "زر، ادفع") } as never;
    expect(render(mock, "en")).toContain("“Button, Pay”");
    expect(render(mock, "ar")).toContain("«زر، ادفع»");
  });
});

describe("line charts follow the reading direction", () => {
  const T = (en: string, ar: string) => ({ en, ar });
  const chart = { blocks: [{ kind: "chart", type: "line", values: [10, 20, 30], labels: [T("Jan", "يناير"), T("Feb", "فبراير"), T("Mar", "مارس")] }] } as never;
  const points = (html: string) => (html.match(/points="([^"]+)"/)?.[1] ?? "").split(" ").map((p) => p.split(",").map(Number));
  it("starts at the left in English and at the right in Arabic, so a rising trend rises toward the end of the labels", () => {
    const en = points(render(chart, "en")), ar = points(render(chart, "ar"));
    expect(en.map((p) => p[0])).toEqual([0, 50, 100]);
    expect(ar.map((p) => p[0])).toEqual([100, 50, 0]);
    expect(ar.map((p) => p[1])).toEqual(en.map((p) => p[1])); // same values, mirrored in x only
  });
});

describe("overlays, rows and accordions (test feedback, 12 Nov)", () => {
  const T = (en: string, ar: string) => ({ en, ar });
  it("puts a top banner under the app bar, in the flow, and other overlays above the screen", () => {
    const html = render({ appbar: { title: T("Where to?", "إلى أين؟") }, blocks: [{ kind: "text", text: "Home" }], overlay: { type: "banner", close: true, blocks: [{ kind: "text", text: "Saved" }] } } as never, "ar");
    expect(html.indexOf("xm-appbar")).toBeLessThan(html.indexOf("ov-banner"));
    expect(html.indexOf("ov-banner")).toBeLessThan(html.indexOf("xm-body"));
    expect(html).not.toContain("has-ov");
    const dialog = render({ blocks: [{ kind: "image", art: "map-route" }], overlay: { type: "dialog", blocks: [{ kind: "text", text: "Declined" }] } } as never, "en");
    expect(dialog.indexOf("xm-body")).toBeLessThan(dialog.indexOf("ov-dialog"));
    expect(readFileSync(new URL("../src/mock.css", import.meta.url), "utf8")).toMatch(/\.exmock \.ov\{z-index:6\}/);
    // The base overlay rule must come before its variants, or a toast turns white (its light action text then fails contrast).
    const css = readFileSync(new URL("../src/mock.css", import.meta.url), "utf8");
    const base = css.indexOf(".exmock .ov{position:absolute");
    for (const v of ["ov-toast", "ov-sheet", "ov-full", "ov-banner", "ov-dialog", "ov-menu", "ov-side"]) expect(base).toBeLessThan(css.indexOf(`.exmock .${v}{`));
  });
  it("lines a button up with the field box beside it, under a blank label line", () => {
    const row = { kind: "row", blocks: [{ kind: "field", label: T("Promo code", "كود الخصم"), text: "" }, { kind: "button", text: T("Apply", "طبّق") }] };
    const html = render({ blocks: [row] } as never, "en");
    expect(html).toContain("row2 has-field");
    expect(html).toMatch(/<div class="row-side"><div class="fl" aria-hidden="true">.<\/div><div class="b k-button"/);
  });
  it("makes accordions a button that opens and closes, and keeps closed content ready", () => {
    const acc = { kind: "accordion", text: T("Track my parcel", "تتبّع شحنتي"), blocks: [{ kind: "small", text: "Use the code" }] };
    const html = render({ blocks: [acc] } as never, "en");
    expect(html).toContain('<button type="button" class="ac-h" aria-expanded="false">');
    expect(html).toMatch(/<div class="ac-b" hidden="">.*Use the code/);
  });
  it("draws a 'more' row that says the list goes on", () => {
    const html = render({ blocks: [{ kind: "more", text: T("+12 more questions", "+12 سؤالًا آخر") }] } as never, "ar");
    expect(html).toContain("k-more is-fade");
    expect(html).toContain("سؤالًا آخر");
  });
});

describe("small pictures show the whole drawing", () => {
  it("fits art at size s (meet, on the drawing's own background) and keeps the slice for bigger sizes", () => {
    for (const art of ART_NAMES) {
      const s = render({ blocks: [{ kind: "image", art, size: "s" }] } as never, "en");
      expect(s, art).toContain('preserveAspectRatio="xMidYMid meet"');
      expect(s, art).toMatch(/class="b k-image size-s has-art" style="background:#[0-9A-Fa-f]{6}"/);
      expect(render({ blocks: [{ kind: "image", art, size: "l" }] } as never, "en"), art).toContain('preserveAspectRatio="xMidYMid slice"');
    }
  });
  it("stretches the drawing's edge columns beside a small drawing, so its bands reach both edges", () => {
    const s = render({ blocks: [{ kind: "image", art: "desert", size: "s" }] } as never, "en");
    expect(s).toContain('class="xm-art-edge is-start"');
    expect(s).toContain('class="xm-art-edge is-end"');
    expect(render({ blocks: [{ kind: "image", art: "desert", size: "l" }] } as never, "en")).not.toContain("xm-art-edge");
  });
});

describe("other paths follow-ups (12 Nov)", () => {
  it("greys out calendar days before the 'before' day", () => {
    const html = render({ blocks: [{ kind: "calendar", months: [{ title: "May", start: 0, days: 31 }], before: [0, 12] }] } as never, "en");
    expect(html).toContain('<i class="cd cdx">11</i>');
    expect(html).toContain('<i class="cd">12</i>');
  });
  it("zooms a laptop page down on a phone instead of letting its rows clip", () => {
    const css = readFileSync(new URL("../src/mock.css", import.meta.url), "utf8");
    expect(css).toContain(".xm-wide{container-type:inline-size}");
    const steps = [...css.matchAll(/@container[^{]*max-width:([\d.]+)px\)\{\.xm-wide>\.xm-shell\{inline-size:(\d+)px;zoom:([\d.]+)\}\}/g)];
    expect(steps.length).toBeGreaterThan(5);
    // At the narrowest width of each step, the zoomed page must still fit.
    for (const [, max, w, z] of steps) expect(Number(w) * Number(z)).toBeLessThanOrEqual(Number(max) - 19.98 + 0.5);
  });
});
