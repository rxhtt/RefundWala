import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const shots = [
  { name: "screenshot-consumer-hero.png", url: "http://localhost:3000", scrollY: 0 },
  { name: "screenshot-consumer-cases.png", url: "http://localhost:3000", scrollY: 900 },
  { name: "screenshot-consumer-evidence.png", url: "http://localhost:3000", scrollY: 1600 },
  { name: "screenshot-agent-hero.png", url: "http://localhost:3001", scrollY: 0 },
  { name: "screenshot-agent-queue.png", url: "http://localhost:3001", scrollY: 850 },
  { name: "screenshot-merchant-hero.png", url: "http://localhost:3002", scrollY: 0 },
  { name: "screenshot-merchant-cases.png", url: "http://localhost:3002", scrollY: 850 }
];

const outDir = path.resolve("E:/Codex-Idea/docs/assets");
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 720 } });

for (const shot of shots) {
  await page.goto(shot.url, { waitUntil: "networkidle" });
  await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY ?? 0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, shot.name), fullPage: false });
}

await browser.close();
console.log("Screenshots captured to", outDir);
