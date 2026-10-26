// Takes a 16:10 screenshot of each live project into shots/<id>.png.
import { chromium } from "playwright";

const SITES = {
  calendai: "https://calendai.ca",
  scrapify: "https://scrapify-akdm.vercel.app",
  statusofai: "https://statusofai.vercel.app",
  dmphotos: "https://dmphotos.ca",
};

const browser = await chromium.launch();
for (const [id, url] of Object.entries(SITES)) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `shots/${id}.png` });
    console.log("ok", id);
  } catch (e) {
    console.log("failed", id, e.message);
  }
  await page.close();
}
await browser.close();
