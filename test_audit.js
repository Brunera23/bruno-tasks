const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const filePath = 'file:///' + path.resolve('index.html').replace(/\\/g, '/');
  console.log('Navigating to', filePath);
  await page.goto(filePath);
  
  // Wait for the app to initialize
  await page.waitForTimeout(500);

  // Check if we can add a task
  await page.fill('#aInput', 'Task 1');
  await page.click('#aBtn');
  
  await page.waitForTimeout(500);

  // Click on the body of the task to see if edit modal opens
  const itemBody = page.locator('.item-body').first();
  await itemBody.click();
  
  await page.waitForTimeout(500);

  // Check if modal opened
  let isModalOpen = await page.evaluate(() => document.body.classList.contains('modal-open'));
  console.log('Modal opened from body click:', isModalOpen);
  
  // Close the modal by clicking outside
  const ov = page.locator('#ov');
  await ov.click({ position: { x: 10, y: 10 }, force: true });
  
  await page.waitForTimeout(500);

  isModalClosed = await page.evaluate(() => !document.body.classList.contains('modal-open'));
  console.log('Modal closed:', isModalClosed);
  
  await browser.close();
})();
