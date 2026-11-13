// Night mode must survive a language switch (client-side navigation replaces <html>).
// Start the app first (UG_DEV_FIXTURE=1 npx next start -p 3100), then: node scripts/theme.mjs [baseUrl]
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright-core");
const base = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || process.env.CHROME_PATH || undefined,
});
let bad = 0;
for (const path of ["/en", "/en/onboarding", "/en/app", "/en/app/path/P01"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "ug-theme", value: "dark", url: base }]);
  const page = await ctx.newPage();
  await page.goto(base + path);
  await page.waitForTimeout(600);
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  const before = await theme();
  await page.locator("a[hreflang=ar]").first().click();
  await page.waitForURL(/\/ar/);
  await page.waitForTimeout(500);
  const toAr = await theme();
  await page.locator("a[hreflang=en]").first().click();
  await page.waitForURL(/\/en/);
  await page.waitForTimeout(500);
  const back = await theme();
  const ok = before === "dark" && toAr === "dark" && back === "dark";
  if (!ok) bad++;
  console.log(`${path}: ${before} -> ${toAr} -> ${back} ${ok ? "ok" : "FAIL"}`);
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
