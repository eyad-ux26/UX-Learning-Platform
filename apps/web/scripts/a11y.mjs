// Runs axe on the main screens in English light and Arabic night, phone and laptop.
// Start the app first (UG_DEV_FIXTURE=1 npx next start -p 3100), then: node scripts/a11y.mjs [baseUrl]
import { createRequire } from "node:module";
import AxeBuilder from "@axe-core/playwright";

const { chromium } = createRequire(import.meta.url)("playwright-core"); // comes with @axe-core/playwright; the browser is installed by `npx playwright-core install chromium`

const base = process.argv[2] ?? "http://localhost:3100";
const pages = ["", "/signup", "/signin", "/onboarding", "/app", "/app/path/P01", "/app/profile", "/app/lesson/P01-U01-L01", "/app/lesson/P10-U02-L03", "/app/lesson/P10-U02-L04", "/try", "/try/steps", "/try/video", "/app/settings", "/app/settings/notifications", "/app/settings/data", "/app/inbox", "/app/help", "/app/requests", "/app/requests/00000000-0000-4000-9000-000000000001", "/goodbye", "/paths", "/paths/forms-that-flow", "/paths/patterns-that-fit", "/privacy", "/terms", "/offline", "/maintenance", "/no-such-page", "/forgot"];
const views = [
  ["en", "light", { width: 1440, height: 900 }],
  ["ar", "dark", { width: 390, height: 844 }],
];
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
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

// The collapsed "Show the example again" bar only appears once a choose step is checked on a phone, so open the dev choose page, check it, and run axe on that state.
for (const [locale, scheme] of [["ar", "dark"], ["en", "light"]]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(`${base}/${locale}/try/choose`);
  await page.waitForSelector(".ug");
  await page.waitForTimeout(600);
  await page.locator(".choice").nth(1).click();
  await page.locator(".btn-primary").last().click();
  await page.waitForTimeout(600);
  if (!(await page.locator(".mock-again").count())) { bad++; console.log(`${locale} 390 collapsed example bar: FAIL (never appeared)`); }
  else {
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    bad += serious.length;
    console.log(`${locale} 390 collapsed example bar: ${serious.length ? "FAIL" : "ok"}`);
    for (const v of serious) console.log(`   ${v.impact} ${v.id}: ${v.help} · ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  }
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
