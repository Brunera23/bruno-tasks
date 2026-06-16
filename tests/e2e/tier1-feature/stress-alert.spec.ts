import { test, expect } from '@playwright/test';

test('Stress double submit on alert form', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bt-v5', '[]');
    localStorage.setItem('bt-cats', '[]');
    localStorage.setItem('bt-log', '[]');
    (window as any).currentUser = { uid: 'test-uid', displayName: 'Test User' };
    (window as any)._fbReady = false;
    (window as any)._fbInitDone = false;
  });

  await page.goto('/');
  await page.addStyleTag({ content: '#loginScreen { display: none !important; } .shell { display: flex !important; } #fab { display: flex !important; }' });

  // Open the Fab Menu then Alert Form
  await page.evaluate(() => (window as any).openAlertForm());

  await page.locator('#aMsg').fill('Stress alert');

  // Trigger double click
  const btn = page.locator('#alertForm button[type="submit"]');
  await btn.click({ force: true, noWaitAfter: true });
  await btn.click({ force: true, noWaitAfter: true });
  await btn.click({ force: true, noWaitAfter: true });

  await page.waitForTimeout(500);

  const tasks = await page.locator('.item-title').allTextContents();
  console.log(tasks);
  
  // Is it duplicated?
  expect(tasks.filter(t => t === 'Stress alert').length).toBe(1);
});
