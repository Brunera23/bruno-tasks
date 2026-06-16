const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file:///c:/Users/Bruno/Desktop/activities tracker/.agents/sub_orch_m1_rev1_gen5/test_selection.html');
  
  // Select the text
  await page.evaluate(() => {
    const range = document.createRange();
    const node = document.getElementById('text').firstChild;
    range.setStart(node, 0);
    range.setEnd(node, 6); // "Select"
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  
  // Verify selection exists
  const initialSel = await page.evaluate(() => window.getSelection().toString());
  console.log('Initial selection:', initialSel);
  
  // Capture console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // Click on the target
  const target = await page.$('#target');
  await target.click();
  
  await browser.close();
})();
