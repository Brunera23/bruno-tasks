import { test, expect } from '@playwright/test';

test('Stress double click submit', async ({ page }) => {
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

  await page.evaluate(() => {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('modal-open');
  });

  await page.locator('#btnAdd').click();
  await page.locator('#fT').fill('Stress test clicks');

  // Trigger click fast
  const btn = page.locator('#modal button[type="submit"]');
  await btn.click({ force: true, noWaitAfter: true });
  await btn.click({ force: true, noWaitAfter: true });
  await btn.click({ force: true, noWaitAfter: true });

  await page.waitForTimeout(500);

  const tasks = await page.locator('.item-title').allTextContents();
  console.log(tasks);
  
  // It shouldn't create duplicates
  expect(tasks.filter(t => t === 'Stress test clicks').length).toBe(1);
});
