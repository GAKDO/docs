// 안내서 구성도를 PNG로 뽑는다 (발표 자료·README용).
//   사용: node scripts/render-guide.mjs   (먼저 레포 루트에서 python3 -m http.server 8765)
// 필요: Playwright + Chromium. 결과: guide/trace-mvp-architecture.png, guide/trace-mvp-architecture-dark.png
import { chromium } from "playwright";

const base = process.env.GUIDE_URL || "http://localhost:8765/guide/";
const browser = await chromium.launch();
for (const [theme, file] of [["light", "guide/trace-mvp-architecture.png"], ["dark", "guide/trace-mvp-architecture-dark.png"]]) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto(`${base}?only=arch&theme=${theme}`);
  await page.waitForSelector("html[data-ready]");
  await page.evaluate(() => document.fonts.ready);
  await (await page.$(".arch-card")).screenshot({ path: file });
  console.log("만듦:", file);
  await page.close();
}
await browser.close();
