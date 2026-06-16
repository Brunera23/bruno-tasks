import { test, expect } from '@playwright/test';

test.describe('Feature 2: Adversarial Modal UI State', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log('PAGE ERROR:', exception));
    await page.route('https://www.gstatic.com/firebasejs/**', route => route.abort());
    await page.route('**/sw.js**', route => route.abort());

    await page.addInitScript(() => {
      localStorage.setItem('bt-v5', '[]');
      localStorage.setItem('bt-cats', '[]');
      localStorage.setItem('bt-log', '[]');

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
    
    await page.addStyleTag({ content: `
      #loginScreen { display: none !important; }
      .shell { display: flex !important; opacity: 1 !important; visibility: visible !important; }
      #fab { display: flex !important; }
    ` });

    await page.waitForSelector('.shell', { state: 'visible' });
    await expect(page.locator('#btnAdd')).toBeVisible();
  });

  test('double submit check via fast Ctrl+Enter key presses', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);
    
    await page.locator('#fT').fill('Stress Test Task');
    
    // Press Ctrl+Enter multiple times very fast
    for(let i = 0; i < 5; i++) {
        await page.keyboard.press('Control+Enter');
    }
    
    await page.waitForTimeout(500); // wait for UI updates
    
    // Check how many items were added
    const itemBodies = page.locator('.item-body');
    const count = await itemBodies.count();
    console.log(`Added ${count} items via Ctrl+Enter`);
    expect(count).toBe(1);
  });
  
  test('double submit check via fast multiple clicks', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);
    
    await page.locator('#fT').fill('Stress Test Task Click');
    
    // Click submit multiple times
    for(let i = 0; i < 5; i++) {
        await page.locator('#modal button[type="submit"]').click({ force: true });
    }
    
    await page.waitForTimeout(500); // wait for UI updates
    
    const itemBodies = page.locator('.item-body');
    const count = await itemBodies.count();
    console.log(`Added ${count} items via click`);
    expect(count).toBe(1);
  });
  
});
