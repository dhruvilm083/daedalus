// Takes a 16:10 screenshot of each public project into shots/<id>.png.
// Sites with `clip` also get a short looping video, shots/<id>.mp4 (needs ffmpeg).
// With `intro`, the clip starts at first paint instead of after load, to catch the site's opening animation.
// calendAI and Scrapify sit behind sign-in, so their shots are made by hand from a local copy with a mock account.
// NATO CUAS needs a data folder, so it is fed a made-up one from scripts/fake-cuas.mjs and caught mid-replay.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const SITES = {
  statusofai: { url: "https://statusofai.vercel.app", clip: 8 },
  dmphotos: { url: "https://dmphotos.ca", dark: true },
  washtag: { url: "https://washtag.app", dark: true },
  natocuas: { url: "https://nato-cuas.vercel.app", fakeData: true },
  makeachangehomes: { url: "https://makeachangehomes.ca", clip: 4.5, intro: true },
};

const isLight = (page) =>
  page.evaluate(() => {
    const pick = (el) => getComputedStyle(el).backgroundColor;
    const c = [pick(document.body), pick(document.documentElement)].find((v) => v && v !== "rgba(0, 0, 0, 0)") || "rgb(255,255,255)";
    const [r, g, b] = c.match(/\d+/g).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 128;
  });

const report = {};
const browser = await chromium.launch();
for (const [id, site] of Object.entries(SITES)) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: site.dark ? "dark" : "light" });
  const page = await context.newPage();
  try {
    // some sites never go network-idle (analytics, chat widgets), so fall back to the load event
    await page.goto(site.url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => page.goto(site.url, { waitUntil: "load", timeout: 60000 }));
    await page.waitForTimeout(2500);
    // let an opening animation finish before the still is taken
    if (site.intro) await page.waitForTimeout(site.clip * 1000);
    if (site.dark && (await isLight(page))) {
      // Fall back to the site's own theme button when it ignores the system setting.
      const toggle = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[title*="theme" i], button[title*="dark" i]').first();
      if (await toggle.count()) await toggle.click();
      else await page.locator("button").last().click();
      await page.waitForTimeout(1500);
    }
    if (site.fakeData) {
      const dir = join(mkdtempSync(join(tmpdir(), "cuas-")), "FAKE-CUAS-DataChallenge");
      execFileSync("node", ["scripts/fake-cuas.mjs", dir]);
      await page.locator("input[type=file]").first().setInputFiles(dir);
      const range = page.locator("input[type=range]").first();
      await range.waitFor({ state: "attached", timeout: 60000 });
      // jump to just under halfway, where all three fake drones are in view
      const t = await range.evaluate((el) => String(Math.round((+el.min + (+el.max - +el.min) * 0.45) / 100) * 100));
      await range.fill(t);
      await page.waitForTimeout(8000); // basemap tiles
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `shots/${id}.png` });
    const about = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content ?? "",
      credit: [...document.querySelectorAll("footer, footer *, body *")].map((e) => e.textContent.trim()).find((t) => /made with/i.test(t) && t.length < 80) ?? "",
    }));
    console.log("about", id, JSON.stringify(about));
    report[id] = about;
    console.log("ok", id, site.dark ? `light=${await isLight(page)}` : "");
  } catch (e) {
    console.log("failed", id, e.message);
    report[id] = { error: e.message.split("\n")[0] };
  }
  await context.close();

  if (site.clip) {
    // Record the page as it animates, then trim the load and encode a small mp4 that loops in the showcase.
    const dir = mkdtempSync(join(tmpdir(), `clip-${id}-`));
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir, size: { width: 1440, height: 900 } } });
    const page = await ctx.newPage();
    const started = Date.now();
    try {
      let lead;
      if (site.intro) {
        // start the clip at first paint, so it opens on the site's own load animation
        await page.goto(site.url, { waitUntil: "commit", timeout: 60000 });
        await page.waitForFunction(() => document.body && document.body.children.length > 0, null, { timeout: 30000, polling: 20 });
        lead = (Date.now() - started) / 1000;
      } else {
        await page.goto(site.url, { waitUntil: "networkidle", timeout: 60000 });
        lead = (Date.now() - started) / 1000 + 1.5;
      }
      await page.waitForTimeout(1500 + site.clip * 1000);
      await ctx.close();
      const raw = join(dir, readdirSync(dir).find((f) => f.endsWith(".webm")));
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(lead), "-i", raw, "-t", String(site.clip),
        "-vf", "scale=1280:-2,fps=30", "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", "-an", `shots/${id}.mp4`]);
      console.log("ok clip", id);
    } catch (e) {
      console.log("failed clip", id, e.message);
      await ctx.close().catch(() => {});
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
await browser.close();
// what each site's title and footer credit said, and any failures, so they're visible without the Actions logs
writeFileSync("shots/report.json", JSON.stringify(report, null, 2) + "\n");
