import { test, expect } from '@playwright/test';

test.describe('Tier 1: Feature 5 (Mobile & View Switching)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    await page.goto('/', { waitUntil: 'networkidle' });
    
    await page.evaluate(() => {
      (window as any).showLoginScreen = () => {}; // Prevent Firebase from showing login screen again
      (window as any).currentUser = { uid: 'test', email: 'test@test.com', displayName: 'Test' };
      // Disable view transitions for stable testing
      (window as any).document.startViewTransition = undefined;
      if (typeof (window as any).showApp === 'function') {
        (window as any).showApp();
      }
      if (typeof (window as any).render === 'function') {
        (window as any).render();
      }
    });
  });

  test('Desktop View Navigation', async ({ page }) => {
    // Set viewport to desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    
    const dashNav = page.locator('.nav-item[data-view="dash"]');
    const medNav = page.locator('.nav-item[data-view="med"]');
    const tasksNav = page.locator('.nav-item[data-view="tasks"]');
    const dashView = page.locator('#dashView');
    const medView = page.locator('#medView');
    const tasksView = page.locator('#tasksView');

    await dashNav.click();
    await expect(dashView).toBeVisible();
    await expect(dashNav).toHaveClass(/active/);
    await expect(medNav).not.toHaveClass(/active/);
    await expect(tasksNav).not.toHaveClass(/active/);
    await expect(tasksView).not.toBeVisible();
    
    await medNav.click();
    await expect(medView).toBeVisible();
    await expect(medNav).toHaveClass(/active/);
    await expect(dashNav).not.toHaveClass(/active/);
    await expect(tasksNav).not.toHaveClass(/active/);
    await expect(tasksView).not.toBeVisible();
    await expect(dashView).not.toBeVisible();
    
    await tasksNav.click();
    await expect(tasksView).toBeVisible();
    await expect(tasksNav).toHaveClass(/active/);
    await expect(dashNav).not.toHaveClass(/active/);
    await expect(medNav).not.toHaveClass(/active/);
    await expect(medView).not.toBeVisible();
    await expect(dashView).not.toBeVisible();
  });

  test('Mobile Navigation Visibility', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    await expect(page.locator('.mob-nav')).toBeVisible();
    // Sidebar should be hidden in mobile layout
    await expect(page.locator('.sidebar')).not.toBeVisible();
  });

  test('Mobile View Switching', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    const dashTab = page.locator('.mob-tab[data-view="dash"]');
    const medTab = page.locator('.mob-tab[data-view="med"]');
    const tasksTab = page.locator('.mob-tab[data-view="tasks"]');
    const dashView = page.locator('#dashView');
    const medView = page.locator('#medView');
    const tasksView = page.locator('#tasksView');

    await dashTab.click();
    await expect(dashView).toBeVisible();
    await expect(dashTab).toHaveClass(/active/);
    await expect(medTab).not.toHaveClass(/active/);
    await expect(tasksTab).not.toHaveClass(/active/);
    await expect(tasksView).not.toBeVisible();
    
    await medTab.click();
    await expect(medView).toBeVisible();
    await expect(medTab).toHaveClass(/active/);
    await expect(dashTab).not.toHaveClass(/active/);
    await expect(tasksTab).not.toHaveClass(/active/);
    await expect(tasksView).not.toBeVisible();
    await expect(dashView).not.toBeVisible();

    await tasksTab.click();
    await expect(tasksView).toBeVisible();
    await expect(tasksTab).toHaveClass(/active/);
    await expect(dashTab).not.toHaveClass(/active/);
    await expect(medTab).not.toHaveClass(/active/);
    await expect(medView).not.toBeVisible();
    await expect(dashView).not.toBeVisible();
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
    await mobSheetOv.click({ position: { x: 5, y: 5 }, force: true });
    
    await expect(mobSheet).not.toBeVisible();
    await expect(mobSheetOv).not.toBeVisible();
  });

  test('Responsive Adaptability', async ({ page }) => {
    // Start mobile
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Click tasks
    await page.locator('.mob-tab[data-view="tasks"]').click();
    await expect(page.locator('#tasksView')).toBeVisible();
    
    // Change to desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Assert tasks remains visible
    await expect(page.locator('#tasksView')).toBeVisible();
    // Desktop nav tasks is active
    await expect(page.locator('.nav-item[data-view="tasks"]')).toHaveClass(/active/);
    // Mob nav hidden
    await expect(page.locator('.mob-nav')).not.toBeVisible();
    await expect(page.locator('.sidebar')).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('.mob-nav')).toBeVisible();
    await expect(page.locator('.sidebar')).not.toBeVisible();
    await expect(page.locator('#tasksView')).toBeVisible();
    await expect(page.locator('.mob-tab[data-view="tasks"]')).toHaveClass(/active/);
  });
});
