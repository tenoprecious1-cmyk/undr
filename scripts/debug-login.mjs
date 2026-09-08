import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
page.on("response", async (res) => {
  if (res.url().includes("/login") && res.request().method() === "POST") {
    console.log("STATUS", res.status());
    console.log("HEADERS", JSON.stringify(await res.allHeaders(), null, 2));
    try {
      console.log("BODY", (await res.text()).slice(0, 500));
    } catch (e) {
      console.log("body read err", e.message);
    }
  }
});
page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
await page.goto("http://localhost:3000/login");
await page.fill('input[name="email"]', "seed_1@undr.demo");
await page.fill('input[name="password"]', "DemoPass123!");
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
console.log("final url:", page.url());
await browser.close();
