# Handoff Report: Feature 1 (Task Management) Testing Strategy

## Observation
- Upon reviewing `index.html` (lines ~1440 and its related CSS), the `.modal` has a CSS transition rule: `transition: all .3s var(--ease-spring);` and the `.modal-overlay` has `transition: opacity .3s var(--ease-std);`.
- The user feedback explicitly states that Playwright was clicking elements underneath before the animation completed, leading to timeouts because the main content or overlay intercepts the pointer events while it is technically fading out.
- The `askDel` deletion flow uses a separate confirmation modal (`#cfWrap`) with a similar `.cf-wrap.open` transition (200ms).

## Logic Chain
1. Modal open/close animations take 300ms. Removing the `.open` class triggers the transition but doesn't immediately remove the modal's pointer event blocking until the 300ms fade finishes.
2. Playwright's `waitForSelector(..., { state: 'hidden' })` correctly waits for the `.open` class to vanish, but because Playwright's actionability checks are extremely fast, it may attempt a click while the opacity fade transition is still running.
3. To cleanly bypass this flakiness, tests must append a `await page.waitForTimeout(300)` immediately after waiting for the `.open` state to disappear (or appear).
4. For tests interacting with UI immediately after adding/editing a task, using `{ force: true }` on clicks further ensures reliability if an animation is slightly lingering. 
5. Applying these rules alongside the required fixes (Firebase mock, exact string matches, `sw.js` block) forms the basis for the Tier 1 Feature 1 QA scripts.

## Caveats
- Relying on `waitForTimeout(300)` adds static wait times, which can marginally slow down the test suite. An alternative is waiting for pointer-events to equal 'none' via `page.waitForFunction`, but `waitForTimeout` is more universally robust against framework-specific layout trashing during animation.

## Conclusion
To fully resolve the flakiness, any Playwright action that triggers the task modal or delete confirmation must be enclosed with explicit wait helpers that check for visibility *and* exhaust the 300ms CSS transition.

Below are the 5 proposed Playwright test cases covering Feature 1 CRUD capabilities, keeping dynamic UIDs, exact string matching, dual state assertion, and Firebase/SW blocks.

```typescript
import { test, expect } from '@playwright/test';

// Centralize the animation handling
async function waitForModalOpen(page) {
  await page.waitForSelector('#modal.open', { state: 'visible' });
  await page.waitForTimeout(300); // Allow CSS spring animation to complete
}

async function waitForModalClose(page) {
  await page.waitForSelector('#modal.open', { state: 'hidden' });
  await page.waitForTimeout(300); // Allow CSS fade out to clear pointer-events
}

test.beforeEach(async ({ page }) => {
  // Block Service Worker & Firebase
  await page.route('**/sw.js**', route => route.abort());
  await page.route('https://www.gstatic.com/firebasejs/**', route => route.abort());

  // Mock Firebase to bypass auth and db latency
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

test('TC1: Create a task', async ({ page }) => {
  await page.locator('#btnAdd').click({ force: true });
  await waitForModalOpen(page);
  
  await page.locator('#fT').fill('Exact Match Task');
  await page.locator('#btnSave').click();
  
  await waitForModalClose(page);
  // Exact text assertion
  await expect(page.locator('.item-title').first()).toHaveText('Exact Match Task');
});

test('TC2: Edit a task', async ({ page }) => {
  // Setup task
  await page.locator('#btnAdd').click({ force: true });
  await waitForModalOpen(page);
  await page.locator('#fT').fill('Old Task');
  await page.locator('#btnSave').click();
  await waitForModalClose(page);
  
  // Click edit button
  await page.locator('.a-btn').locator('svg use[href="#i-edit"]').locator('..').first().click({ force: true });
  await waitForModalOpen(page);
  
  await page.locator('#fT').fill('Updated Task Exact');
  await page.locator('#btnSave').click();
  
  await waitForModalClose(page);
  await expect(page.locator('.item-title').first()).toHaveText('Updated Task Exact');
});

test('TC3: Mark task as Done/Undone', async ({ page }) => {
  // Setup task
  await page.locator('#btnAdd').click({ force: true });
  await waitForModalOpen(page);
  await page.locator('#fT').fill('Checkable Task');
  await page.locator('#btnSave').click();
  await waitForModalClose(page);
  
  const checkbox = page.locator('.ck').first();
  const item = page.locator('.item').first();
  
  // Mark as Done
  await checkbox.click({ force: true });
  // Dual state assertion
  await expect(item).toHaveClass(/completed/);
  await expect(checkbox).toHaveClass(/on/);
  
  // Undo Done
  await checkbox.click({ force: true });
  await expect(item).not.toHaveClass(/completed/);
  await expect(checkbox).not.toHaveClass(/on/);
});

test('TC4: Delete a task', async ({ page }) => {
  // Setup task
  await page.locator('#btnAdd').click({ force: true });
  await waitForModalOpen(page);
  await page.locator('#fT').fill('Task to Delete');
  await page.locator('#btnSave').click();
  await waitForModalClose(page);
  
  // Click delete icon
  await page.locator('.a-btn.del').first().click({ force: true });
  
  // Confirmation wrapper has transition
  await page.waitForSelector('#cfWrap.open', { state: 'visible' });
  await page.waitForTimeout(200); 
  
  await page.locator('#cfYes').click({ force: true });
  
  await page.waitForSelector('#cfWrap.open', { state: 'hidden' });
  await page.waitForTimeout(200);
  
  await expect(page.locator('.item')).toHaveCount(0);
});

test('TC5: Create a task with Double Enter', async ({ page }) => {
  await page.locator('#btnAdd').click({ force: true });
  await waitForModalOpen(page);
  await page.locator('#fT').fill('Double Enter Exact');
  
  await page.locator('#fT').press('Enter');
  await page.locator('#fT').press('Enter');
  
  await waitForModalClose(page);
  await expect(page.locator('.item-title').first()).toHaveText('Double Enter Exact');
});
```

## Verification Method
1. Create a `tests/e2e/tier1-feature/f1-task-crud.spec.ts` incorporating these tests.
2. Run `npx playwright test tests/e2e/tier1-feature/f1-task-crud.spec.ts --repeat-each=10` to stress-test for flakiness.
3. If no timeouts occur, the animation handling is solid.
