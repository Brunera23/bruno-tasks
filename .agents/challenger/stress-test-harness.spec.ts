import { test, expect } from '@playwright/test';

test('Stress emit submit events', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bt-v5', '[]');
  });

  await page.goto('/');
  await page.addStyleTag({ content: '#loginScreen { display: none !important; } .shell { display: flex !important; }' });

  // 1. Alert form stress test
  await page.evaluate(() => (window as any).openAlertForm());
  await page.locator('#aMsg').fill('Stress alert');

  await page.evaluate(() => {
    const form = document.getElementById('alertForm');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });

  await page.waitForTimeout(500);
  const tasks = await page.locator('.item-title').allTextContents();
  console.log('Alert tasks:', tasks);
  
  // 2. Note form crash verification
  try {
    await page.evaluate(() => (window as any).openNoteForm());
  } catch (e) {
    console.log('openNoteForm crashed:', e.message);
  }
});
