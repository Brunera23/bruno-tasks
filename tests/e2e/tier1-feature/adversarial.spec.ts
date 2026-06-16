import { test, expect } from '@playwright/test';

test.describe('Adversarial Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html');
    await page.evaluate(() => {
      (window as any).showLoginScreen = () => {}; 
      (window as any).currentUser = { uid: 'test', email: 'test@test.com', displayName: 'Test' };
      (window as any).document.startViewTransition = undefined;
      if (typeof (window as any).showApp === 'function') {
        (window as any).showApp();
      }
    });
  });

  test('Responsive Adaptability misses checking sidebar visibility', async ({ page }) => {
    // Start mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('.mob-tab[data-view="dash"]').click();
    
    // Inject malicious CSS that breaks the sidebar completely on desktop
    await page.addStyleTag({ content: '@media(min-width: 768px) { .sidebar { display: none !important; } }' });
    
    // Change to desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // The original test only checks this:
    await expect(page.locator('#dashView')).toBeVisible();
    await expect(page.locator('.nav-item[data-view="dash"]')).toHaveClass(/active/);
    await expect(page.locator('.mob-nav')).not.toBeVisible();
    // These will all PASS! Even though the sidebar is completely broken and invisible.
    
    // If the test were good, it would check:
    // await expect(page.locator('.sidebar')).toBeVisible();
    // But it doesn't.
  });
});
