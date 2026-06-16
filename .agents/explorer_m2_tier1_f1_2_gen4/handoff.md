# Observation

1. The previous iteration's test failed with `TypeError: Cannot read properties of undefined (reading 'auth')` because `window.firebase.auth()` was mocked using `page.evaluate()` or similar *after* the page loaded, which caused a race condition or failed because the Firebase scripts were not yet fully initialized or were blocked incorrectly.
2. The feedback also noted an "Integrity Violation (Opaque-box)" because the test manually called `showApp()`, `render()`, and `updateSidebarUser()` to simulate login, bypassing the app's native `auth.onAuthStateChanged` lifecycle callback.
3. In `index.html`, Firebase is initialized immediately after its script tags. The app expects `window.firebase.auth()` to exist and registers the callback via `auth.onAuthStateChanged(user => { ... })`.

# Logic Chain

1. To prevent the `undefined (reading 'auth')` error and ensure complete control over Firebase initialization without race conditions, we must block the real Firebase scripts from loading using `page.route('https://www.gstatic.com/firebasejs/**', route => route.abort())`.
2. With the real scripts blocked, we must provide a complete, synchronous mock of `window.firebase` using `page.addInitScript()` before the page evaluates its inline script.
3. To respect the app's native authentication lifecycle (fixing the Integrity Violation), our mocked `auth.onAuthStateChanged` must capture the callback provided by the application.
4. Our mocked `signInWithPopup` must not manually call app functions. Instead, it should simply call the captured `onAuthStateChanged` callback with a dummy user object. This allows the application to naturally process the login, populate the UI, and transition the views exactly as it does in production.
5. Our `firestore` mock needs to provide dummy responses for `.doc().get()` and `.onSnapshot()` so that the app's sync logic (`fbListen`, `fbInit`) successfully resolves without throwing errors or wiping local test data.

# Conclusion

We will provide a solid, deterministic testing strategy utilizing `page.addInitScript` to fully mock Firebase and capture the `onAuthStateChanged` callback, allowing `signInWithPopup` to trigger a natural application boot. We will implement 5 robust tests adhering to all provided constraints (Service Worker blocking, dynamic UIDs, exact string matching, and dual state assertion).

# Verification Method

1. Run the Playwright test suite.
2. The tests should no longer throw `TypeError: Cannot read properties of undefined`.
3. The tests should naturally log in by clicking `#loginBtn`, waiting for `.shell` to become visible, indicating that `onAuthStateChanged` fired properly and transitioned the app without manual intervention.

---

### Proposed Testing Strategy & Mock Implementation

**1. Firebase Mock Setup (added to test `beforeEach`)**

```javascript
// Block Service Worker to prevent caching issues
await context.route('**/sw.js', route => route.abort());

// Block real Firebase scripts to prevent race conditions and overwrites
await page.route('https://www.gstatic.com/firebasejs/**', route => route.abort());

// Inject complete Firebase mock before page load
await page.addInitScript(() => {
  const listeners = [];
  window.firebase = {
    initializeApp: () => {},
    firestore: () => ({
      enablePersistence: async () => {},
      collection: () => ({
        doc: () => ({
          get: async () => ({ exists: false }),
          set: async () => {},
          delete: async () => {},
          onSnapshot: (cb) => {
            // Provide a clean slate on first load
            setTimeout(() => cb({
              exists: true,
              data: () => ({ tasks: "[]", cats: "[]", log: "[]" })
            }), 10);
            return () => {};
          }
        }),
        add: async () => {}
      })
    }),
    auth: () => {
      if (!window._mockAuth) {
        window._mockAuth = {
          getRedirectResult: async () => ({}),
          signInWithPopup: async () => {
            // Naturally trigger the app's auth lifecycle!
            const mockUser = { uid: 'test-123', displayName: 'Test User', email: 'test@example.com' };
            listeners.forEach(cb => cb(mockUser));
          },
          signOut: async () => {
            listeners.forEach(cb => cb(null));
          },
          onAuthStateChanged: (cb) => {
            listeners.push(cb);
            // App starts logged out
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
```

### Proposed 5 Playwright Test Cases

**Test 1: App initialization and natural login simulation**
- Load the page.
- Verify `#loginScreen` is visible.
- Click `#loginBtn`.
- Verify the `.shell` container becomes visible (this proves that our mocked `signInWithPopup` successfully fired `onAuthStateChanged` and the app naturally rendered itself).
- Verify the sidebar user name `#suName` displays the mock user's name.

**Test 2: Create a task**
- Perform login.
- Generate a dynamic UID for the test run (e.g., `const testId = Date.now()`).
- Click the `#fab` button.
- Fill the `#fT` input with the exact string `"Test Task " + testId`.
- Select priority "Alta" (`#fP [data-v="alta"]`).
- Submit the form (`#form button[type="submit"]`).
- Assert: Find `.item-title` using exact text matching (`hasText: new RegExp('^Test Task ' + testId + '$')`) and verify it is visible.

**Test 3: Edit a task**
- Perform login and create `"Edit Task " + testId`.
- Locate the task in the list and click its edit button (`.item-acts .a-btn:not(.del)`).
- Clear the `#fT` input and fill it with `"Edit Task " + testId + " - Updated"`.
- Submit the form.
- Assert: The list no longer contains the old string.
- Assert: The list contains the exact updated string.

**Test 4: Complete a task (Dual state assertion)**
- Perform login and create `"Complete Task " + testId`.
- Locate the task and click its checkbox (`.ck`).
- Assert (Dual State): Since the app's configuration determines if completed tasks are hidden or shown crossed-out, check both possibilities.
  ```javascript
  const taskLocator = page.locator('.item', { hasText: new RegExp('^Complete Task ' + testId + '$') });
  await page.waitForTimeout(500); // give it time to animate
  const isVisible = await taskLocator.isVisible();
  if (isVisible) {
      await expect(taskLocator).toHaveClass(/item-done/);
  } else {
      expect(isVisible).toBe(false); // Valid state if showDone is false
  }
  ```

**Test 5: Delete a task**
- Perform login and create `"Delete Task " + testId`.
- Locate the task and click its delete button (`.a-btn.del`).
- Wait for the confirmation modal (`#cfWrap`) and click the `#cfYes` button.
- Assert: Verify the task no longer exists in the DOM.
