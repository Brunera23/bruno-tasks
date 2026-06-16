import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
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
        const m = { getToken: () => Promise.resolve('mock-token'), onMessage: () => {} };
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

test('Double Enter test', async ({ page }) => {
  await page.locator('#btnAdd').click();
  await expect(page.locator('#modal')).toHaveClass(/open/);
  await page.locator('#fT').fill('Double Enter Task');
  
  // press enter twice quickly
  await page.locator('#fT').press('Enter');
  await page.locator('#fT').press('Enter');
  
  await expect(page.locator('#modal')).not.toHaveClass(/open/);
  await expect(page.locator('.item-body')).toHaveCount(1);
});
