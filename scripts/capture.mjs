import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1080 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.QALA_URL || 'http://localhost:5174');
await page.waitForSelector('.city-map canvas');
await page.screenshot({ path: 'docs/screenshots/city-ru.png', fullPage: false });
await page.getByRole('button', { name: 'EN', exact: true }).click();
await page.screenshot({ path: 'docs/screenshots/city-en.png', fullPage: false });
console.log(
  JSON.stringify({
    errors,
    title: await page.title(),
    canvas: await page.locator('canvas').count(),
    overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  }),
);
await browser.close();
