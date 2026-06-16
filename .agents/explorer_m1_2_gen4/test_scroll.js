const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`
    <html style="scroll-behavior: smooth">
      <body style="min-height: 3000px"></body>
    </html>
  `);
  await page.evaluate(() => window.scrollTo(0, 1000));
  const sy = await page.evaluate(() => window.scrollY);
  console.log('scrollY after smooth scrollTo:', sy);
  await browser.close();
})();
