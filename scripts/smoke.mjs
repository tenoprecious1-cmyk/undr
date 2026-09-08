import { chromium } from "playwright";

const BASE = "http://localhost:3000";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

function log(msg) {
  console.log(`\n=== ${msg} ===`);
}

try {
  log("Landing page");
  await page.goto(BASE + "/");
  console.log("title:", await page.title());

  log("Login as seed_1@undr.demo");
  await page.goto(BASE + "/login");
  await page.fill('input[name="email"]', "seed_1@undr.demo");
  await page.fill('input[name="password"]', "DemoPass123!");
  await Promise.all([page.waitForURL("**/home", { timeout: 10000 }), page.click('button[type="submit"]')]);
  console.log("Logged in, url:", page.url());

  await page.screenshot({ path: "/tmp/undr-home.png", fullPage: true });
  const postCount = await page.locator("article").count();
  console.log("Posts visible on home:", postCount);
  const trending = await page.locator("aside", { hasText: "WHAT'S HOT" }).first().innerText();
  console.log("Trending sidebar snippet:", trending.slice(0, 200).replace(/\n+/g, " | "));

  log("Explore -> Chaos tab");
  await page.goto(BASE + "/explore?tab=chaos");
  await page.waitForSelector("article");
  console.log("Chaos-tab posts:", await page.locator("article").count());
  await page.screenshot({ path: "/tmp/undr-explore-chaos.png", fullPage: true });

  log("Dedicated Chaos page");
  await page.goto(BASE + "/chaos");
  await page.waitForSelector("article");
  console.log("Chaos page posts:", await page.locator("article").count());
  await page.screenshot({ path: "/tmp/undr-chaos.png", fullPage: true });

  log("Trending page");
  await page.goto(BASE + "/trending");
  await page.waitForSelector("article");
  console.log("Trending page posts:", await page.locator("article").count());
  await page.screenshot({ path: "/tmp/undr-trending.png", fullPage: true });

  log("Hashtag page #COCCS");
  await page.goto(BASE + "/hashtag/coccs");
  await page.waitForSelector("article");
  console.log("Hashtag #coccs posts:", await page.locator("article").count());

  log("React to first post on home + verify optimistic count bump");
  await page.goto(BASE + "/home");
  await page.waitForSelector("article");
  const firstHeart = page.locator("article").first().locator("button", { hasText: /^\d/ }).nth(1);
  const before = await page.locator("article").first().locator("button").nth(2).innerText();
  await page.locator("article").first().locator("button").nth(2).click();
  await page.waitForTimeout(600);
  const after = await page.locator("article").first().locator("button").nth(2).innerText();
  console.log("Reaction count before/after click:", before, "->", after);

  log("Open post detail + reply");
  const firstPostLink = await page.locator("article a[href^='/post/']").first().getAttribute("href");
  await page.goto(BASE + firstPostLink);
  await page.waitForSelector('textarea[name="content"]');
  await page.fill('textarea[name="content"]', "Smoke test reply from Playwright ✅");
  await page.click('button:has-text("DROP")');
  await page.waitForTimeout(1200);
  console.log("Post detail URL after reply:", page.url());
  await page.screenshot({ path: "/tmp/undr-post-detail.png", fullPage: true });

  log("Vote on the poll in Explore > Polls");
  await page.goto(BASE + "/explore?tab=polls");
  await page.waitForSelector("article");
  const pollButtons = page.locator("article").first().locator("button", { hasText: /Yes|No/ });
  console.log("Poll option buttons found:", await pollButtons.count());
  if ((await pollButtons.count()) > 0) {
    await pollButtons.first().click();
    await page.waitForTimeout(700);
    const pollText = await page.locator("article").first().innerText();
    console.log("Poll after vote snippet:", pollText.split("\n").slice(0, 6).join(" | "));
  }

  log("Bookmarks page");
  await page.goto(BASE + "/bookmarks");
  await page.waitForTimeout(500);
  console.log("Bookmarks page loaded ok, url:", page.url());

  log("Profile page");
  await page.goto(BASE + "/profile");
  await page.waitForSelector("h1");
  console.log("Profile heading:", await page.locator("h1").first().innerText());
  await page.screenshot({ path: "/tmp/undr-profile.png", fullPage: true });

  log("Signup flow (new user)");
  await page.goto(BASE + "/signup");
  const email = `smoketest_${Date.now()}@undr.demo`;
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "SmokeTest123!");
  await page.selectOption('select[name="level"]', "200 Level");
  await page.fill('input[name="faculty"]', "COCCS");
  await page.fill('input[name="department"]', "Computer Science");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log("Signup result URL:", page.url());
  await page.screenshot({ path: "/tmp/undr-signup-result.png", fullPage: true });

  log("Mobile viewport check");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/home");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/undr-mobile-home.png", fullPage: false });

  console.log("\nSMOKE TEST DONE OK");
} catch (err) {
  console.error("SMOKE TEST FAILED:", err);
  await page.screenshot({ path: "/tmp/undr-failure.png", fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
