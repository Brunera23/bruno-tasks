import { test, expect } from '@playwright/test';

test.describe('Tier 1: Feature 5 (Mobile & View Switching)', () => {
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

  test('Mobile Mais Sheet Toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    const maisTab = page.locator('#mobCatMgr');
    await maisTab.click();
    
    const mobSheet = page.locator('#mobSheet');
    const mobSheetOv = page.locator('#mobSheetOv');
    
    await expect(mobSheet).toBeVisible();
    await expect(mobSheetOv).toBeVisible();
    
    // Click outside the sheet (at the very top-left of the overlay)
    // REMOVED force: true
    await mobSheetOv.click({ position: { x: 5, y: 5 } });
    
    await expect(mobSheet).not.toBeVisible();
    await expect(mobSheetOv).not.toBeVisible();
  });
});
