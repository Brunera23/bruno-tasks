const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Route mocking
  await page.route('https://www.gstatic.com/firebasejs/**', route => route.abort());

  await page.addInitScript(() => {
    const listeners = [];
    window.firebase = {
      initializeApp: () => {},
      firestore: () => {
        const collectionMock = {
          doc: () => ({
            get: async () => ({ exists: false }),
            set: async () => {},
            delete: async () => {},
            onSnapshot: (cb) => {
              setTimeout(() => cb({
                exists: true,
                data: () => ({ tasks: "[]", cats: "[]", log: "[]" })
              }), 10);
              return () => {};
            }
          }),
          add: async () => {}
        };
        return {
          enablePersistence: async () => {},
          collection: () => collectionMock
        };
      },
      auth: () => {
        if (!window._mockAuth) {
          window._mockAuth = {
            getRedirectResult: async () => ({}),
            signInWithPopup: async () => {
              const user = { uid: 'test-123', displayName: 'Test User', email: 'test@example.com' };
              listeners.forEach(cb => cb(user));
            },
            signOut: async () => {
              listeners.forEach(cb => cb(null));
            },
            onAuthStateChanged: (cb) => {
              listeners.push(cb);
              setTimeout(() => cb(null), 10);
            }
          };
        }
        return window._mockAuth;
      },
      messaging: () => ({
        isSupported: () => false
      })
    };
    window.firebase.auth.GoogleAuthProvider = function() {};
    window.firebase.firestore.FieldValue = {
      serverTimestamp: () => Date.now()
    };
  });

  await page.goto('file://c:/Users/Bruno/Desktop/activities tracker/index.html');

  // Verify login screen is shown
  const loginVisible = await page.isVisible('#loginScreen');
  console.log('Login screen visible:', loginVisible);

  // Click login
  await page.click('#loginBtn');

  // Wait a bit for auth state change
  await page.waitForTimeout(1000);

  // Verify app is shown
  const shellVisible = await page.isVisible('.shell');
  console.log('Shell visible:', shellVisible);

  const displayName = await page.textContent('#suName');
  console.log('Display name:', displayName);

  await browser.close();
})();
