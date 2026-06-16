import { test, expect } from '@playwright/test';

test.describe('Feature 2: Modal & UI State Resilience (Tier 1)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log('PAGE ERROR:', exception));
    // Block Firebase scripts to prevent real auth/firestore calls
    await page.route('https://www.gstatic.com/firebasejs/**', route => route.abort());
    // Block service worker to prevent page reload during tests
    await page.route('**/sw.js**', route => route.abort());

    await page.addInitScript(() => {
      localStorage.setItem('bt-v5', '[]');
      localStorage.setItem('bt-cats', '[]');
      localStorage.setItem('bt-log', '[]');

      // Mock Firebase global
      window.firebase = {
        initializeApp: () => {},
        firestore: () => ({
          enablePersistence: () => Promise.resolve(),
          collection: () => ({
            doc: () => ({
              get: () => Promise.resolve({ exists: false }),
              set: () => Promise.resolve(),
              delete: () => Promise.resolve(),
              onSnapshot: () => () => {}
            }),
            add: () => Promise.resolve()
          }),
        }),
        auth: () => ({
          getRedirectResult: () => Promise.resolve(),
          signInWithPopup: () => Promise.resolve(),
          onAuthStateChanged: (cb) => {
            // Simulate successful login immediately
            setTimeout(() => cb({ uid: 'mock-uid', email: 'mock@mock.com', displayName: 'Mock User' }), 10);
          }
        }),
        messaging: () => {
          const m = {
            getToken: () => Promise.resolve('mock-token'),
            onMessage: () => {}
          };
          m.isSupported = () => false;
          return m;
        }
      };
      window.firebase.firestore.FieldValue = { serverTimestamp: () => Date.now() };
      window.firebase.auth.GoogleAuthProvider = class {};
    });

    await page.goto('/');
    
    // Force CSS to bypass login screen and force visibility
    await page.addStyleTag({ content: `
      #loginScreen { display: none !important; }
      .shell { display: flex !important; opacity: 1 !important; visibility: visible !important; }
      #fab { display: flex !important; }
    ` });

    // Wait for the app to render after mock auth state changed
    await page.waitForSelector('.shell', { state: 'visible' });
    await expect(page.locator('#btnAdd')).toBeVisible();
  });

  test('1. Open a task modal, click the close button, verify modal closes', async ({ page }) => {
    await page.locator('#btnAdd').click();
    
    const modal = page.locator('#modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveClass(/open/);
    
    await page.locator('#mCancel').click();
    await expect(modal).not.toHaveClass(/open/);
  });

  test('2. Open a task modal, click outside the modal, verify modal closes', async ({ page }) => {
    await page.locator('#btnAdd').click();
    const modal = page.locator('#modal');
    await expect(modal).toHaveClass(/open/);

    const overlay = page.locator('#ov');
    await overlay.click({ position: { x: 10, y: 10 } });

    await expect(modal).not.toHaveClass(/open/);
  });

  test('3. Open a task modal, press Escape key, verify modal closes', async ({ page }) => {
    await page.locator('#btnAdd').click();
    const modal = page.locator('#modal');
    await expect(modal).toHaveClass(/open/);

    await page.keyboard.press('Escape');

    await expect(modal).not.toHaveClass(/open/);
  });

  test('4. Open a task modal, close it, and open the same task modal again', async ({ page }) => {
    await page.locator('#btnAdd').click();
    const modal = page.locator('#modal');
    await expect(modal).toHaveClass(/open/);

    await page.locator('#mCancel').click();
    await expect(modal).not.toHaveClass(/open/);

    await page.locator('#btnAdd').click();
    await expect(modal).toHaveClass(/open/);
  });

  test('5. Open a task modal, close it, and open a different task modal', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);
    await page.locator('#fT').fill('Task 1');
    await page.locator('#modal button[type="submit"]').click();
    await expect(page.locator('#modal')).not.toHaveClass(/open/);

    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);
    await page.locator('#fT').fill('Task 2');
    await page.locator('#modal button[type="submit"]').click();
    await expect(page.locator('#modal')).not.toHaveClass(/open/);

    // After adding two tasks, the list is re-rendered
    // wait for it to stabilize
    const itemBodies = page.locator('.item-body');
    await expect(itemBodies).toHaveCount(2);
    await expect(itemBodies.nth(1)).toBeVisible();

    // Click the title instead of the body center to avoid clicking .tag-cat or other tags
    const itemTitles = page.locator('.item-title');
    await itemTitles.nth(0).click();
    const modal = page.locator('#modal');
    await expect(modal).toHaveClass(/open/);
    const firstTitle = await page.locator('#fT').inputValue();

    await page.locator('#mCancel').click();
    await expect(modal).not.toHaveClass(/open/);

    await itemTitles.nth(1).click();
    await expect(modal).toHaveClass(/open/);
    
    const secondTitle = await page.locator('#fT').inputValue();
    
    expect(firstTitle).not.toEqual(secondTitle);
    const titles = [firstTitle, secondTitle].sort();
    expect(titles).toEqual(['Task 1', 'Task 2']);
  });

  test('6. Stress Test: Double click submit button to check for double submission', async ({ page }) => {
    // 1. Open modal
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);

    // 2. Fill title
    await page.locator('#fT').fill('Double Submit Test Task');

    // 3. Double click submit very quickly
    await page.locator('#modal button[type="submit"]').dblclick();

    // 4. Wait for modal to close
    await expect(page.locator('#modal')).not.toHaveClass(/open/);

    // 5. Verify only ONE task was created
    const itemBodies = page.locator('.item-body');
    // We should wait a little bit just in case
    await page.waitForTimeout(500);
    
    // There should be exactly 1 item if double submit is prevented
    await expect(itemBodies).toHaveCount(1);
    
    const taskTitle = await page.locator('.item-title').innerText();
    expect(taskTitle).toContain('Double Submit Test Task');
  });
});
