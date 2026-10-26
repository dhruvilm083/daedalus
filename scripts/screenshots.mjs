// Takes a 16:10 screenshot of each public project into shots/<id>.png.
// calendAI and Scrapify sit behind sign-in, so their shots are made by hand from a local copy with a mock account.
import { chromium } from "playwright";

const SITES = {
  statusofai: { url: "https://statusofai.vercel.app" },
  dmphotos: { url: "https://dmphotos.ca", dark: true },
  washtag: { url: "https://washtag-green.vercel.app" },
};

const isLight = (page) =>
  page.evaluate(() => {
    const pick = (el) => getComputedStyle(el).backgroundColor;
    const c = [pick(document.body), pick(document.documentElement)].find((v) => v && v !== "rgba(0, 0, 0, 0)") || "rgb(255,255,255)";
    const [r, g, b] = c.match(/\d+/g).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 128;
  });

const browser = await chromium.launch();
for (const [id, site] of Object.entries(SITES)) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: site.dark ? "dark" : "light" });
  const page = await context.newPage();
  try {
    await page.goto(site.url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);
    if (site.dark && (await isLight(page))) {
      // Fall back to the site's own theme button when it ignores the system setting.
      const toggle = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[title*="theme" i], button[title*="dark" i]').first();
      if (await toggle.count()) await toggle.click();
      else await page.locator("button").last().click();
      await page.waitForTimeout(1500);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `shots/${id}.png` });
    console.log("ok", id, site.dark ? `light=${await isLight(page)}` : "");
  } catch (e) {
    console.log("failed", id, e.message);
  }
  await context.close();
}
await browser.close();
