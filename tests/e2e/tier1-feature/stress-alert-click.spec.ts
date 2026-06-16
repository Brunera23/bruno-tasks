import { test, expect } from '@playwright/test';

test('Stress double click submit on alert form', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bt-v5', '[]');
  });

  await page.goto('/');
  await page.addStyleTag({ content: '#loginScreen { display: none !important; } .shell { display: flex !important; } .fab { display: flex !important; }' });

  // Open the Fab Menu then Alert Form
  await page.locator('#fab').click();
  await page.locator('#fmAlert').click();

  await page.locator('#aMsg').fill('Stress alert');

  // Trigger double click
  const btn = page.locator('#alertForm button[type="submit"]');
  await btn.click({ force: true, noWaitAfter: true });
  await btn.click({ force: true, noWaitAfter: true });
  await btn.click({ force: true, noWaitAfter: true });

  await page.waitForTimeout(500);

  const tasks = await page.locator('.item-title').allTextContents();
  console.log('Alert Tasks:', tasks);
  expect(tasks.filter(t => t === 'Stress alert').length).toBe(1);
});
