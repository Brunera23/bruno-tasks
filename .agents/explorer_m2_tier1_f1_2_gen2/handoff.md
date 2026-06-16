# Feature 1 Testing Strategy & Findings

## 1. Observation
1. **Login Integrity Violation**: The previous test implementation forcefully bypassed the `#loginScreen` and revealed `.shell` by using `page.evaluate()` to manipulate `style.display` and `localStorage`. This circumvents the native authentication flow of the application.
2. **Action Integrity Violation**: Action buttons like edit and delete on tasks were interacted with using `evaluate(b => b.click())`. Inspecting the application's CSS reveals that these action buttons (`.a-btn` inside `.item-acts`) are explicitly hidden (`max-width: 0; opacity: 0`) until the parent task row (`.item`) is hovered (`.item:hover .item-acts { opacity: 1 }`). Playwright's native `click()` fails on invisible elements, which is why the previous implementation resorted to forced evaluations.
3. **Status Popover Evaluation**: The test interacted with the status popup (`#stPop`) using evaluations without ensuring the popup CSS animations (`transform`, `opacity`) were complete.

## 2. Logic Chain
1. **Navigating the Login Screen Natively**: Since the application relies on Firebase Authentication (specifically Google popup) and there is no hidden "Guest" bypass natively in the application code, the correct E2E testing approach is to mock the external Firebase library *before* the application initializes. By injecting a mock `firebase` object using `page.addInitScript()` and intercepting the loading of Firebase scripts using `page.route()`, Playwright can natively interact with the application. The test will simply do `await page.click('#loginBtn')`, and the mocked Firebase API will immediately resolve, causing the application to naturally run its own `showApp()` and `fbInit()` sequences without DOM manipulation.
2. **Clicking Hidden Action Buttons Natively**: To natively click the "Edit" or "Delete" buttons on a task, the test must simulate standard user behavior by hovering over the task item first (`await item.hover()`). This triggers the CSS `:hover` state, making the action buttons visible and actionable for a standard `await locator.click()`.
3. **Popup Native Interaction**: Instead of forcibly evaluating clicks on popup options, the test must wait for the popups (`#stPop` or `#cfWrap`) to become visibly present and stable using `await expect(stPop).toBeVisible()` before clicking the internal elements. 

## 3. Caveats
- Mocking Firebase at the global `window.firebase` level is required since we cannot spawn real Google auth popups in headless CI environments. 
- It is important to also mock the offline `firestore` functions in `addInitScript` so the app defaults to its `localStorage` fallback gracefully and avoids console errors when trying to sync data.

## 4. Conclusion
The integrity violations can be completely resolved by utilizing `page.addInitScript()` to mock Firebase Auth, using `locator.hover()` before interacting with row-level actions, and using strict Playwright assertions before clicks. I have designed 5 Tier 1 E2E tests reflecting these best practices.

## 5. Verification Method
When implemented, these tests can be verified using `npx playwright test tests/e2e/tier1-feature/f1-task-management.spec.ts`. The tests will pass without utilizing `force: true` (unless absolutely necessary due to an animation overlap) or `evaluate(b => b.click())`, and no direct modifications to the application's `index.html` will be required.

---

# Proposed Test Cases (Feature 1: Task Management)

### Test 1: Native Authentication & App Boot
**Description:** Verify the user can natively click the login button and the application correctly transitions to the main shell.
**Steps:**
1. Navigate to `/`.
2. Wait for `#loginScreen` to be visible.
3. Click `#loginBtn`.
4. Wait for `.shell` and `#tasksView` to become visible.

### Test 2: Create a Task
**Description:** Verify that a user can create a new task.
**Steps:**
1. Click `#btnAdd`.
2. Wait for `#modal.open` to be visible.
3. Fill `#fT` with "New Test Task".
4. Click `#form button[type="submit"]`.
5. Assert that `.item-title` containing "New Test Task" is visible in the list.

### Test 3: Update a Task
**Description:** Verify that a user can hover over a task to reveal actions, and update the task.
**Steps:**
1. Create a task and find its row (`.item`).
2. **Hover** the row: `await item.hover()`.
3. Click the edit button: `await item.locator('.a-btn:has(svg use[href="#i-edit"])').click()`.
4. Wait for `#modal.open` to be visible.
5. Change the title in `#fT` to "Updated Task" and submit.
6. Assert that `.item-title` containing "Updated Task" is visible.

### Test 4: Change Status to Doing
**Description:** Verify that interacting with the status popover correctly updates the task status.
**Steps:**
1. Create a task and find its row.
2. Click the status circle: `await item.locator('.ck').click()`.
3. Wait for the popup: `await expect(page.locator('#stPop')).toBeVisible()`.
4. Click the "Doing" option: `await page.locator('.st-opt[data-st="doing"]').click()`.
5. Assert that the checkbox (`.ck`) now has the `.doing-st` class.

### Test 5: Delete a Task
**Description:** Verify that a user can hover over a task, click delete, and confirm the deletion.
**Steps:**
1. Create a task and find its row (`.item`).
2. **Hover** the row: `await item.hover()`.
3. Click the delete button: `await item.locator('.a-btn.del').click()`.
4. Wait for the confirmation dialog: `await expect(page.locator('#cfWrap')).toBeVisible()`.
5. Click confirm: `await page.locator('#cfYes').click()`.
6. Assert that the task item is hidden/removed from the DOM.

---

### Recommended Firebase Mock Script (BeforeEach Setup)

```typescript
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.firebase = window.firebase || {};
    window.firebase.auth = () => ({
      signInWithPopup: async () => {
        const user = { uid: 'test', email: 'test@example.com', displayName: 'Test User' };
        if (window._authCb) window._authCb(user);
        return { user };
      },
      onAuthStateChanged: (cb) => {
        window._authCb = cb;
        cb(null);
      },
      GoogleAuthProvider: class {}
    });
    window.firebase.auth.GoogleAuthProvider = class {};
    
    window.firebase.firestore = () => ({
      enablePersistence: async () => {},
      collection: () => ({
        doc: () => ({
          get: async () => ({ exists: false }),
          set: async () => {},
          delete: async () => {},
          onSnapshot: () => {}
        })
      })
    });
    window.firebase.firestore.FieldValue = { serverTimestamp: () => Date.now() };
  });

  // Block real firebase scripts from overwriting our mock
  await page.route('**/firebase-*-compat.js', route => route.fulfill({ body: '' }));

  await page.goto('/');
  await page.waitForSelector('#loginScreen', { state: 'visible' });
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#tasksView', { state: 'visible' });
});
```
