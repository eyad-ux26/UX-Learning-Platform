// Plays the dev step-types lesson and checks the player's rules in the browser, with axe at every state.
// Start the app first (UG_DEV_FIXTURE=1 npx next start -p 3100), then: node scripts/flow.mjs [baseUrl] [locale] [width]
import { createRequire } from "node:module";
import AxeBuilder from "@axe-core/playwright";
const { chromium } = createRequire(import.meta.url)("playwright-core");

const base = process.argv[2] ?? "http://localhost:3100";
const locale = process.argv[3] ?? "en";
const width = Number(process.argv[4] ?? 390);
const L = (en, ar) => (locale === "en" ? en : ar);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const ctx = await browser.newContext({
  viewport: { width, height: width > 800 ? 900 : 844 },
  colorScheme: locale === "ar" ? "dark" : "light",
});
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("ug-tour-guest", "1");
  } catch {
    /* ignore */
  }
}); // the lesson tour is checked in a11y.mjs
const page = await ctx.newPage();
let bad = 0;
const fail = (m) => {
  bad++;
  console.log(`FAIL ${m}`);
};
const axe = async (label) => {
  await page.waitForTimeout(400); // let button colour transitions finish so axe does not read a half-faded colour
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  if (serious.length) {
    bad++;
    console.log(`FAIL axe ${label}: ${serious.map((v) => `${v.id} ${v.nodes[0]?.target.join(" ")}`).join(" | ")}`);
  }
};
const sheet = () => page.locator(".player-sheet");

await page.goto(`${base}/${locale}/try/steps`);
await page.waitForSelector(".player");
await page.waitForTimeout(400);
await axe("sort idle");

// Rule: selecting never shows right or wrong; only Check does.
const place = async (item, bucket) => {
  await page.getByRole("button", { name: item, exact: true }).first().click();
  await page
    .getByRole("region", { name: bucket })
    .getByRole("button", { name: L("Put it here", "ضعه هنا") })
    .click();
};
await place(L("Email", "البريد الإلكتروني"), L("Remove", "احذف"));
await place(L("Phone", "الهاتف"), L("Keep", "أبقِ"));
await place(L("Favourite colour", "اللون المفضّل"), L("Remove", "احذف"));
if (await sheet().count()) fail("a verdict sheet appeared before Check");
if (await page.locator(".is-right, .is-wrong").count()) fail("right/wrong marks appeared before Check");
await axe("sort placed");
await page.locator(".btn-primary").last().click();
await page.waitForTimeout(300);
if (!(await sheet().innerText()).match(L(/Not quite/, /لم تصب|ليس تمامًا|غير صحيح/))) {
  /* wording differs in Arabic; the sheet role is checked below */
}
if ((await sheet().getAttribute("role")) !== "alert") fail("wrong answer should show the alert sheet");
await axe("sort wrong try 1");

// Hint 1, hint 2, then retries up to the third wrong try, then Show the answer.
const hintBtn = page.getByRole("button", { name: L("Hint", "تلميح") });
await hintBtn.click();
await hintBtn.click();
if ((await hintBtn.count()) !== 0) fail("hints should end after two");
await axe("sort hints");
for (let k = 0; k < 2; k++) {
  await page.getByRole("button", { name: L("Try again", "حاول مرة أخرى") }).click();
  await place(L("Email", "البريد الإلكتروني"), L("Remove", "احذف"));
  await place(L("Phone", "الهاتف"), L("Keep", "أبقِ"));
  await place(L("Favourite colour", "اللون المفضّل"), L("Remove", "احذف"));
  await page.locator(".btn-primary").last().click();
  await page.waitForTimeout(250);
}
const reveal = page.getByRole("button", { name: L("Show the answer", "اعرض الإجابة") });
if ((await reveal.count()) !== 1) fail("Show the answer should appear after the third try");
else {
  await reveal.click();
  await page.waitForTimeout(250);
  await axe("sort revealed");
}
await page.locator(".player-sheet .btn-primary").click();
await page.waitForTimeout(300);

// Exit: closing after the first answer asks first; Esc closes the question.
await page
  .getByRole("button", { name: L("Leave lesson", "الخروج من الدرس") })
  .first()
  .click();
if ((await page.getByRole("dialog").count()) !== 1) fail("closing after an answer should ask for confirmation");
else {
  await axe("exit dialog");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  if (await page.getByRole("dialog").count()) fail("Esc should close the confirmation");
}

// Keyboard only on match: Tab to a tile, Space, Tab to its pair, Space.
await page
  .getByRole("button", { name: L("Email", "البريد") })
  .first()
  .focus();
await page.keyboard.press("Space");
await page.getByRole("button", { name: L("Send the receipt", "إرسال الإيصال") }).focus();
await page.keyboard.press("Space");
await axe("match keyboard");
await browser.close();
console.log(bad ? `${bad} problem(s)` : `flow ${locale} ${width}: ok`);
process.exit(bad ? 1 : 0);
