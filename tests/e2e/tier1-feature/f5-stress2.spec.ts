import { test, expect } from '@playwright/test';

test.describe('Tier 1: Feature 5 Challenge - Weak Assertions', () => {
  test.beforeEach(async ({ page }) => {
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

  test('Missing medView assertion allows broken state', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    const dashTab = page.locator('.mob-tab[data-view="dash"]');
    const medTab = page.locator('.mob-tab[data-view="med"]');
    const tasksTab = page.locator('.mob-tab[data-view="tasks"]');
    const dashView = page.locator('#dashView');
    const medView = page.locator('#medView');
    const tasksView = page.locator('#tasksView');

    await dashTab.click();
    
    // Intentionally break the application by forcing medView to be visible
    await page.evaluate(() => {
        document.getElementById('medView')!.style.display = 'block';
    });
    
    // Now run the EXACT assertions from the original test for the "dashTab" click:
    await expect(dashView).toBeVisible();
    await expect(dashTab).toHaveClass(/active/);
    await expect(medTab).not.toHaveClass(/active/);
    await expect(tasksTab).not.toHaveClass(/active/);
    await expect(tasksView).not.toBeVisible();

    // The assertions will PASS, hiding the fact that medView is also visible simultaneously!
  });
});
