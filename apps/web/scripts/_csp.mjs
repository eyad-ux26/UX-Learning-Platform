import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright-core");
const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:1280,height:800}}); const p = await ctx.newPage();
const bad = [];
p.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) bad.push(m.text().slice(0,200)); });
p.on("pageerror", (e) => bad.push("pageerror " + e.message));
for (const u of ["/en","/ar","/en/signin","/en/signup","/en/onboarding","/en/app","/en/app/path/P01","/en/app/profile","/en/app/lesson/P01-U01-L01"]) { await p.goto("http://localhost:3100"+u); await p.waitForTimeout(700); }
// a step of the lesson with sound
await p.locator(".choice").first().click().catch(()=>{});
console.log("violations:", bad.length, bad.slice(0,5));
await b.close();
