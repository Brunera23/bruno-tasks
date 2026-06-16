import { test, expect } from '@playwright/test';

test.describe('Feature 6: Widget Panel Rendering (Tier 1)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log(`PAGE ERROR: ${exception}`));
    
    // Use addInitScript to establish a standard test state authentically
    await page.addInitScript(() => {
      let fb;
      Object.defineProperty(window, 'firebase', {
        get: () => fb,
        set: (v) => {
          fb = v;
          let authFn = fb.auth;
          Object.defineProperty(fb, 'auth', {
            get: () => {
              if (!authFn) return undefined;
              const mockedAuth = function() {
                const authObj = authFn.apply(this, arguments);
                authObj.onAuthStateChanged = (cb) => {
                  setTimeout(() => {
                    cb({ uid: 'playwright-test', email: 'test@example.com', displayName: 'Test User' });
                  }, 10);
                  return () => {};
                };
                return authObj;
              };
              mockedAuth.GoogleAuthProvider = authFn.GoogleAuthProvider;
              return mockedAuth;
            },
            set: (val) => {
              authFn = val;
            }
          });
        }
      });
    });
    
    await page.goto('/');
    
    // Wait for the app to authentically render the main shell (no CSS hacks)
    await expect(page.locator('.shell')).toBeVisible();
  });

  test('1. Toggle Widget Panel Visibility', async ({ page }) => {
    const wkToggle = page.locator('#wkToggle');
    const wdgPanel = page.locator('#wdgPanel');

    const initiallyOpen = await wdgPanel.evaluate((el) => el.classList.contains('open'));
    
    await wkToggle.click();
    if (initiallyOpen) {
      await expect(wdgPanel).not.toHaveClass(/open/);
    } else {
      await expect(wdgPanel).toHaveClass(/open/);
    }

    await wkToggle.click();
    if (initiallyOpen) {
      await expect(wdgPanel).toHaveClass(/open/);
    } else {
      await expect(wdgPanel).not.toHaveClass(/open/);
    }
  });

  test('2. Expand and Collapse a Widget Card', async ({ page }) => {
    const wdgPanel = page.locator('#wdgPanel');
    const isOpen = await wdgPanel.evaluate((el) => el.classList.contains('open'));
    if (!isOpen) {
      await page.locator('#wkToggle').click();
      await expect(wdgPanel).toHaveClass(/open/);
    }

    const focoHeader = page.locator('[data-wdg-expand="foco"]');
    const card = focoHeader.locator('xpath=ancestor::div[contains(@class, "wdg-card")][1]');

    const initiallyCompact = await card.evaluate((el) => el.classList.contains('compact'));

    await focoHeader.click();
    if (initiallyCompact) {
      await expect(card).not.toHaveClass(/compact/);
    } else {
      await expect(card).toHaveClass(/compact/);
    }

    await focoHeader.click();
    if (initiallyCompact) {
      await expect(card).toHaveClass(/compact/);
    } else {
      await expect(card).not.toHaveClass(/compact/);
    }
  });

  test('3. Widget State Persistence on Reload', async ({ page }) => {
    const wdgPanel = page.locator('#wdgPanel');
    let isOpen = await wdgPanel.evaluate((el) => el.classList.contains('open'));
    if (!isOpen) {
      await page.locator('#wkToggle').click();
      await expect(wdgPanel).toHaveClass(/open/);
    }

    const nextHeader = page.locator('[data-wdg-expand="next"]');
    const card = nextHeader.locator('xpath=ancestor::div[contains(@class, "wdg-card")][1]');
    
    const initiallyCompact = await card.evaluate((el) => el.classList.contains('compact'));
    
    await nextHeader.click();
    if (initiallyCompact) {
      await expect(card).not.toHaveClass(/compact/);
    } else {
      await expect(card).toHaveClass(/compact/);
    }

    const expectedStateCompact = !initiallyCompact;

    await page.reload();
    await expect(page.locator('.shell')).toBeVisible();

    isOpen = await wdgPanel.evaluate((el) => el.classList.contains('open'));
    if (!isOpen) {
      await page.locator('#wkToggle').click();
      await expect(wdgPanel).toHaveClass(/open/);
    }

    const cardAfter = page.locator('[data-wdg-expand="next"]').locator('xpath=ancestor::div[contains(@class, "wdg-card")][1]');
    if (expectedStateCompact) {
      await expect(cardAfter).toHaveClass(/compact/);
    } else {
      await expect(cardAfter).not.toHaveClass(/compact/);
    }
  });

  test('4. Filter Tasks by Widget Context', async ({ page }) => {
    const wdgPanel = page.locator('#wdgPanel');
    const isOpen = await wdgPanel.evaluate((el) => el.classList.contains('open'));
    if (!isOpen) {
      await page.locator('#wkToggle').click();
      await expect(wdgPanel).toHaveClass(/open/);
    }

    const filterBtn = page.locator('[data-wdg-filter="next"]');
    await filterBtn.click();

    await expect(page.locator('#pageTitle')).toHaveText(/Próximas Prioridades/i);
    await expect(page.locator('.wdg-filter-x').first()).toBeVisible();
  });

  test('5. Week Widget Specific Filtering', async ({ page }) => {
    const wdgPanel = page.locator('#wdgPanel');
    const isOpen = await wdgPanel.evaluate((el) => el.classList.contains('open'));
    if (!isOpen) {
      await page.locator('#wkToggle').click();
      await expect(wdgPanel).toHaveClass(/open/);
    }

    const todayElement = page.locator('.wk-day.is-today').first();
    await todayElement.click();

    await expect(page.locator('#pageTitle')).toHaveText(/Hoje/i);
    await expect(page.locator('.wdg-filter-x').first()).toBeVisible();
  });
});
