// Runs axe on the main screens in English light and Arabic night, phone and laptop.
// Start the app first (UG_DEV_FIXTURE=1 npx next start -p 3100), then: node scripts/a11y.mjs [baseUrl]
import { createRequire } from "node:module";
import AxeBuilder from "@axe-core/playwright";

const { chromium } = createRequire(import.meta.url)("playwright-core"); // comes with @axe-core/playwright; the browser is installed by `npx playwright-core install chromium`

const base = process.argv[2] ?? "http://localhost:3100";
const pages = ["", "/signup", "/signin", "/onboarding", "/app", "/app/path/P01", "/app/paths", "/app/paths/P01", "/app/review", "/app/streak", "/app/skills", "/app/badges", "/app/profile", "/app/lesson/P01-U01-L01", "/app/lesson/P10-U02-L03", "/app/lesson/P10-U02-L04", "/try", "/try/steps", "/try/video", "/app/settings", "/app/settings/notifications", "/app/settings/data", "/app/inbox", "/app/help", "/app/requests", "/app/requests/00000000-0000-4000-9000-000000000001", "/goodbye", "/paths", "/paths/forms-that-flow", "/paths/patterns-that-fit", "/privacy", "/terms", "/offline", "/maintenance", "/no-such-page", "/forgot",
  // Slice 5: paywall, plans, checkout, results and billing (fixture states, no database).
  "/app/path/P01?paywall=P01-U02", "/app/profile?paywall=cert", "/app/plans", "/app/plans?offer=founding&country=SA", "/app/checkout?period=year",
  "/app/checkout/return?state=success", "/app/checkout/return?state=failed", "/app/settings/billing", "/app/settings/billing?state=failed",
  "/app/settings/billing?state=wallet", "/app/settings/billing?state=active", "/app/settings/billing/cancel?state=active", "/app/settings/billing/refund?state=active", "/app/settings/billing/requests?state=requested",
  "/app/settings/billing/receipt/fixture-pay-2?state=active", "/app/settings/billing?state=lapsed"];
const views = [
  ["en", "light", { width: 1440, height: 900 }],
  ["ar", "dark", { width: 390, height: 844 }],
];
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || process.env.CHROME_PATH || undefined });
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

// Design audit L4: on a phone the example is a thumbnail that opens full screen. Check a choose step after Check (thumbnail + feedback),
// then the full-screen example, and that Esc closes it and gives focus back to the thumbnail.
const axeOn = async (page, label) => {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  bad += serious.length;
  console.log(`${label}: ${serious.length ? "FAIL" : "ok"}`);
  for (const v of serious) console.log(`   ${v.impact} ${v.id}: ${v.help} · ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
};
for (const [locale, scheme] of [["ar", "dark"], ["en", "light"]]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(`${base}/${locale}/try/choose`);
  await page.waitForSelector(".ug");
  await page.waitForTimeout(600);
  await page.locator(".choice").nth(1).click();
  await page.locator(".player-foot .btn-primary, .player-foot .split-seg").last().click();
  await page.waitForTimeout(600);
  const thumb = page.locator(".lp-thumb-hit").first();
  if (!(await thumb.count())) { bad++; console.log(`${locale} 390x664 example thumbnail: FAIL (never appeared)`); await ctx.close(); continue; }
  await axeOn(page, `${locale} 390x664 example thumbnail after Check`);
  await thumb.click();
  await page.waitForTimeout(400);
  if (!(await page.locator(".lp-exfull[role=dialog]").count())) { bad++; console.log(`${locale} full-screen example: FAIL (never opened)`); }
  else {
    await axeOn(page, `${locale} 390x664 full-screen example`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const back = await page.evaluate(() => document.activeElement?.classList.contains("lp-thumb-hit") && !document.querySelector(".lp-exfull"));
    if (!back) bad++;
    console.log(`${locale} Esc closes the example and focus returns: ${back ? "ok" : "FAIL"}`);
  }
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
