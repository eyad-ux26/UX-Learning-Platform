// Browser entry for the unit preview: draws a mock with the app's own renderer, so a preview
// shows the same screen a learner sees. scripts/build-preview.mjs bundles it into the page.
import { renderToStaticMarkup } from "react-dom/server";
import type { Locale, Mock } from "@uxgate/content/types";
import { MockView, type RegionCtx } from "../../packages/player/src/ui/MockView";

type Opts = { regions?: boolean; selected?: string[]; locked?: boolean };

function regionIds(node: unknown, out: Record<string, string>) {
  if (Array.isArray(node)) node.forEach((n) => regionIds(n, out));
  else if (node && typeof node === "object") {
    const r = (node as { region?: unknown }).region;
    if (typeof r === "string") out[r] = r;
    Object.values(node).forEach((v) => regionIds(v, out));
  }
  return out;
}

function html(mock: Mock, locale: Locale, opts?: Opts): string {
  const tag = locale === "ar" ? "مثال" : "Example";
  const regions: RegionCtx | undefined = opts?.regions
    ? { selected: opts.selected ?? [], state: () => "", labels: regionIds(mock, {}), onPick: () => {}, locked: !!opts.locked, rightWord: "", wrongWord: "" }
    : undefined;
  return renderToStaticMarkup(<MockView mock={mock} locale={locale} label={tag} tag={tag} regions={regions} />);
}

(globalThis as unknown as { UXMock: { html: typeof html } }).UXMock = { html };
