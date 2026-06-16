import { test, expect } from '@playwright/test';

test('Sheet resize bug', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    (window as any).showLoginScreen = () => {};
    (window as any).currentUser = { uid: 'test', email: 'test@test.com', displayName: 'Test' };
    (window as any).document.startViewTransition = undefined;
    if (typeof (window as any).showApp === 'function') (window as any).showApp();
    if (typeof (window as any).render === 'function') (window as any).render();
  });

  await page.setViewportSize({ width: 375, height: 812 });
  
  // open sheet
  await page.locator('#mobCatMgr').click();
  await expect(page.locator('#mobSheet')).toBeVisible();

  // resize to desktop
  await page.setViewportSize({ width: 1280, height: 800 });

  // Is it still visible?
  const isVisible = await page.locator('#mobSheet').isVisible();
  console.log('mobSheet visible after resize:', isVisible);
  
  // if it's visible, does it block interaction?
  // Try to click a desktop nav item
  try {
    await page.locator('.nav-item[data-view="tasks"]').click({ timeout: 2000 });
    console.log('Could click desktop nav!');
  } catch (e) {
    console.log('Could NOT click desktop nav - blocked by overlay!');
  }
});
