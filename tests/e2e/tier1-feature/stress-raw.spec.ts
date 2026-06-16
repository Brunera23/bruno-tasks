import { test, expect } from '@playwright/test';

test('Stress emit submit events', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bt-v5', '[]');
  });

  await page.goto('/');
  await page.addStyleTag({ content: '#loginScreen { display: none !important; } .shell { display: flex !important; }' });

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

  await page.evaluate(() => (window as any).openNoteForm());
  await page.locator('#nMsg').fill('Stress note');

  await page.evaluate(() => {
    const form = document.getElementById('noteForm');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });

  await page.waitForTimeout(500);
  const tasks2 = await page.locator('.item-title').allTextContents();
  console.log('Note tasks:', tasks2);

  await page.evaluate(() => (window as any).openM());
  await page.locator('#fT').fill('Stress task');

  await page.evaluate(() => {
    const form = document.getElementById('form');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });

  await page.waitForTimeout(500);
  const tasks3 = await page.locator('.item-title').allTextContents();
  console.log('Main tasks:', tasks3);
  
  expect(tasks3.filter(t => t === 'Stress task').length).toBe(1);
  expect(tasks3.filter(t => t === 'Stress alert').length).toBe(1);
  expect(tasks3.filter(t => t === 'Stress note').length).toBe(1);
});
