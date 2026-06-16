import { test, expect } from '@playwright/test';

test('auth test error log', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.route('https://www.gstatic.com/firebasejs/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        console.log('Mock Firebase loaded!');
        window.firebase = {
          initializeApp: () => {},
          auth: () => {
            console.log('auth called');
            return {
              onAuthStateChanged: (cb) => {
                console.log('onAuthStateChanged called');
                setTimeout(() => cb({ uid: 'e2e-user', email: 'e2e@example.com', displayName: 'E2E Tester' }), 50);
              },
              signInWithPopup: async () => {},
              signOut: async () => {},
              getRedirectResult: async () => ({})
            };
          },
          firestore: () => {
            console.log('firestore called');
            return {
              collection: () => ({
                doc: () => ({
                  onSnapshot: () => () => {},
                  get: async () => ({ exists: false, data: () => ({}) }),
                  set: async () => {},
                  update: async () => {},
                  delete: async () => {}
                }),
                add: async () => {},
                where: () => ({
                  onSnapshot: () => () => {}
                }),
                onSnapshot: () => () => {}
              }),
              enableMultiTabIndexedDbPersistence: async () => {}
            };
          }
        };
        window.firebase.auth.GoogleAuthProvider = class {};
        window.firebase.firestore.FieldValue = { serverTimestamp: () => new Date() };
      `
    });
  });
  
  await page.goto('/');
  await page.waitForTimeout(2000);
});
