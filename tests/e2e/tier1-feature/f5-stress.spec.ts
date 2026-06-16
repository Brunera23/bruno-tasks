import { test, expect } from '@playwright/test';

test.describe('Tier 1: Feature 5 Challenge', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    await page.goto('/', { waitUntil: 'networkidle' });
    
    await page.evaluate(() => {
      (window as any).showLoginScreen = () => {}; 
      (window as any).currentUser = { uid: 'test', email: 'test@test.com', displayName: 'Test' };
      (window as any).document.startViewTransition = undefined;
      if (typeof (window as any).showApp === 'function') {
        (window as any).showApp();
      }
      if (typeof (window as any).render === 'function') {
        (window as any).render();
      }
    });
  });

  test('Challenge 1: Mobile Mais Sheet Toggle without force', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    const maisTab = page.locator('#mobCatMgr');
    await maisTab.click();
    
    const mobSheet = page.locator('#mobSheet');
    const mobSheetOv = page.locator('#mobSheetOv');
    
    await expect(mobSheet).toBeVisible();
    await expect(mobSheetOv).toBeVisible();
    
    // Removing `force: true` to see if it is naturally clickable
    // If it fails here, the original test was hiding a bug!
    await mobSheetOv.click({ position: { x: 5, y: 5 } });
    
    await expect(mobSheet).not.toBeVisible();
    await expect(mobSheetOv).not.toBeVisible();
  });

  test('Challenge 2: Viewport Visibility check is sufficient?', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const dashTab = page.locator('.mob-tab[data-view="dash"]');
    await dashTab.click();
    const dashView = page.locator('#dashView');
    
    // original test does: await expect(dashView).toBeVisible();
    // Does it actually check if it's rendered within the viewport, or just that display !== none?
    await expect(dashView).toBeInViewport();
  });
});
