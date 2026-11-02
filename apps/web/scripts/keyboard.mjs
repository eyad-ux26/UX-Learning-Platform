// Plays a lesson using only the keyboard (Tab, Space, Enter) to prove it can be done without a mouse.
// Start the app first (UG_DEV_FIXTURE=1 npx next start -p 3100), then: node scripts/keyboard.mjs [baseUrl] [locale]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright-core");

const base = process.argv[2] ?? "http://localhost:3100";
const locale = process.argv[3] ?? "en";
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await (await browser.newContext({ viewport: { width: Number(process.env.W ?? 1440), height: Number(process.env.H ?? 900) } })).newPage();
await page.goto(`${base}/${locale}/app/lesson/P01-U01-L01`);
await page.waitForSelector(".ug");
await page.waitForTimeout(500);

const active = () => page.evaluate(() => { const e = document.activeElement; return e ? { tag: e.tagName, role: e.getAttribute("role"), cls: e.className, locked: e.getAttribute("aria-disabled") === "true", text: (e.textContent || "").trim().slice(0, 40) } : null; });
const tabUntil = async (test, max = 40) => { for (let i = 0; i < max; i++) { await page.keyboard.press("Tab"); const a = await active(); if (a && test(a)) return a; } return null; };

let steps = 0, checks = 0;
for (let guard = 0; guard < 60; guard++) {
  if (await page.locator(".lesson-end, .end").count()) break;
  await page.evaluate(() => document.body.focus());
  const primary = await page.locator(".btn-primary").last();
  const label = ((await primary.textContent()) || "").trim();
  const isCheck = /^(Check|تحقّق|تحقق)/.test(label);
  if (isCheck) {
    // pick the first open answer (dimmed or locked ones are skipped) with the keyboard, then press Check with the keyboard
    const first = await tabUntil((a) => !a.locked && (a.cls.includes("choice") || a.role === "radio" || a.role === "checkbox" || a.cls.includes("opt")));
    if (first) { await page.keyboard.press("Space"); }
    await page.evaluate(() => (document.activeElement)?.blur?.());
    const c = await tabUntil((a) => /^(Check|تحقّق|تحقق)/.test(a.text));
    if (!c) { console.log("FAIL: could not reach Check with Tab"); process.exit(1); }
    await page.keyboard.press("Enter");
    checks++;
  } else {
    // a wrong answer: use the keyboard to open "Show the answer" when it is offered, else just move on
    const retry = locale === "en" ? "Try again" : "حاول مرة أخرى";
    const showAns = locale === "en" ? "Show the answer" : "اعرض الإجابة";
    const reveal = label === retry && (await page.getByRole("button", { name: showAns }).count()) > 0;
    const target = reveal ? showAns : label;
    const n = await tabUntil((a) => a.text === target);
    if (!n) { console.log("FAIL: could not reach", target); process.exit(1); }
    await page.keyboard.press("Enter");
  }
  if (process.env.DEBUG) console.log(steps, JSON.stringify(label), await page.locator(".btn").allTextContents());
  steps++;
  await page.waitForTimeout(250);
}
const ended = (await page.locator("text=/XP/").count()) > 0;
console.log(`keyboard-only: ${steps} actions, ${checks} checks, reached end: ${ended}`);
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
await browser.close();
process.exit(ended ? 0 : 1);
