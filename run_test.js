const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/test_double_click.html');
  
  page.on('console', msg => console.log('Browser log:', msg.text()));
  
  console.log('Single click:');
  await page.click('.item-body', { delay: 50 });
  await page.waitForTimeout(300);
  
  console.log('Double click:');
  await page.dblclick('.item-body', { delay: 50 });
  await page.waitForTimeout(300);
  
  await browser.close();
})();
