// Runs axe on the main screens in English light and Arabic night, phone and laptop.
// Start the app first (UG_DEV_FIXTURE=1 npx next start -p 3100), then: node scripts/a11y.mjs [baseUrl]
import { createRequire } from "node:module";
import AxeBuilder from "@axe-core/playwright";

const { chromium } = createRequire(import.meta.url)("playwright"); // installed with the browser, not a project dependency

const base = process.argv[2] ?? "http://localhost:3100";
const pages = ["", "/signup", "/signin", "/onboarding", "/app", "/app/path/P01", "/app/profile", "/app/lesson/P01-U01-L01"];
const views = [
  ["en", "light", { width: 1440, height: 900 }],
  ["ar", "dark", { width: 390, height: 844 }],
];
const browser = await chromium.launch();
let bad = 0;
for (const [locale, scheme, viewport] of views) {
  for (const p of pages) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto(`${base}/${locale}${p}`);
    await page.waitForTimeout(600);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    bad += serious.length;
    console.log(`${locale} ${viewport.width} ${p || "/"}: ${serious.length ? "FAIL" : "ok"} (${violations.length} total)`);
    for (const v of serious) console.log(`   ${v.impact} ${v.id}: ${v.help} · ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    await ctx.close();
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
