import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Locale, Mock, MockBlock } from "@uxgate/content/types";
// @ts-expect-error plain ESM helper shared with the validator and the preview build
import { loadContent, resolveRefs } from "../../../scripts/lib/content.mjs";
import { MockView } from "../src/ui/MockView";

/** Every block kind the app draws. A kind outside this list would show as plain text, so the test fails until it is added. */
const KINDS = ["title", "heading", "text", "meta", "small", "chip", "pill", "line", "button", "link", "image", "banner", "tip", "iconbtn",
  "field", "select", "radio", "check", "toggle", "stepper", "segmented", "slider", "calendar", "wheel", "chips", "divider", "group", "row"];

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
for (const p of loadContent()) for (const u of p.units) for (const l of [...u.lessons, ...u.bank]) mocksIn(resolveRefs(l.steps, p.fixtures, [], l._file), l._file, all);

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
});
