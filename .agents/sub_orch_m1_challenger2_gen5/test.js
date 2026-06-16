const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file:///c:/Users/Bruno/Desktop/activities tracker/.agents/sub_orch_m1_challenger2_gen5/test.html');

  // Test 1: Click A then B quickly
  const items = await page.$$('.item-title');
  await items[0].click(); // detail=1
  await new Promise(r => setTimeout(r, 50));
  await items[1].click(); // detail=1 on a different element

  await new Promise(r => setTimeout(r, 500));
  const log = await page.$eval('#log', el => el.innerHTML);
  console.log('Log after rapid click A then B:', log.trim());
  // Expected if bug is present: "A opened<br>B opened<br>"

  await browser.close();
})();
