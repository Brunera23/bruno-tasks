## 1. Observation
- In `index.html`, the login screen `.login-screen` overlays the application. Authentication relies entirely on `firebase.auth().onAuthStateChanged` and `signInWithPopup`. There is NO guest or bypass button in the UI natively.
- In `index.html` CSS, `.item-acts` (which contains the edit and delete `.a-btn` buttons for tasks) is styled with `max-width: 0` and `opacity: 0` by default. It only becomes visible and actionable when the parent `.item` is hovered (`.item:hover .item-acts`).
- The previous test used `evaluate(b => b.click())` for the edit and delete buttons, and for the task checkbox `.ck`. It also used `evaluate` to manipulate DOM styles (`display: 'none'`) to hide `#loginScreen` and bypass Firebase Auth entirely.

## 2. Logic Chain
- The Playwright tests failed the integrity audit because `evaluate` bypasses Playwright's native visibility and actionability checks, masking potential UI rendering bugs.
- Because `.item-acts` is hidden via CSS opacity and width until hovered, a native `locator.click()` will fail unless the element is explicitly hovered first. Simulating a user hover via `await item.hover()` makes the buttons natively visible and actionable, removing the need for `evaluate()`.
- The `.ck` checkbox is naturally visible. The previous worker likely used `evaluate` lazily. A native `checkbox.click()` will work fine. 
- Bypassing the login screen via DOM manipulation is an integrity violation. Because there is no native guest button in `index.html`, we cannot natively "click a guest button." To navigate the login screen "natively" in Playwright without DOM manipulation, the standard E2E practice is to use `page.addInitScript()` to mock the `firebase` global object before the page loads. This satisfies the requirement of not manipulating the DOM while allowing the application to naturally render the `.shell` via its own `onAuthStateChanged` callback. Alternatively, if a true UI bypass is required, a guest button MUST be implemented in the application source code.

## 3. Caveats
- If `page.addInitScript` is also considered an integrity violation by the strict auditor (as it injects JS), then the *only* way to bypass the login natively without DOM manipulation is to add a Guest mode bypass directly into `index.html`, or configure the project to use the Firebase Auth Emulator and actually click `#loginBtn`.
- Clicking the `.ck` checkbox natively might fail if Playwright clicks it before the event listeners from `renderItem` are fully attached, but since it's inline rendered, this shouldn't be an issue.

## 4. Conclusion
- **Login screen**: Use `page.addInitScript` to mock `firebase.auth().onAuthStateChanged` and simulate an authenticated user natively at the API level, rather than forcefully hiding DOM elements.
- **Action buttons**: Use `await item.hover()` before interacting with the edit (`.a-btn:has(svg use[href="#i-edit"])`) and delete (`.a-btn.del`) buttons.
- **Checkboxes**: Use native `await checkbox.click()`.
- **Status popover**: Wait for the `#stPop` element to acquire the `.show` class before clicking options.

### Proposed 5 Playwright Tests

1. **Create a task**
   - **Steps**: Native click on `#btnAdd` -> Fill `#fT` with task title -> Click `#form button[type="submit"]`.
   - **Locators**: `locator('.item-title', { hasText: '...' })`.
   - **Verification**: Expect the new task title to be visible.

2. **Update a task**
   - **Steps**: `await item.hover()` -> Native click on `locator('.a-btn:has(svg use[href="#i-edit"])')` -> Fill `#fT` -> Click `#form button[type="submit"]`.
   - **Locators**: `item.locator('.a-btn:has(svg use[href="#i-edit"])')`, `#fT`.
   - **Verification**: Expect the updated title to be visible.

3. **Change status to Doing**
   - **Steps**: Native click on the checkbox `locator('.ck')` -> Wait for `#stPop.show` -> Native click on "Fazendo" `locator('.st-opt[data-st="doing"]')`.
   - **Locators**: `item.locator('.ck')`, `#stPop.show`, `.st-opt[data-st="doing"]`.
   - **Verification**: Expect checkbox to have `.doing-st` class.

4. **Change status to Done**
   - **Steps**: Native click on the checkbox `locator('.ck')` -> Wait for `#stPop.show` -> Native click on "Concluído" `locator('.st-opt[data-st="done"]')`.
   - **Locators**: `item.locator('.ck')`, `#stPop.show`, `.st-opt[data-st="done"]`.
   - **Verification**: Expect the item to have `.completed` class.

5. **Delete a task**
   - **Steps**: `await item.hover()` -> Native click on `locator('.a-btn.del')` -> Wait for `#cfWrap.open` or `#cfWrap.show` -> Native click on `#cfYes`.
   - **Locators**: `item.locator('.a-btn.del')`, `#cfWrap`, `#cfYes`.
   - **Verification**: Expect the `.item` to be hidden.

## 5. Verification Method
1. Implement the proposed test script using `page.addInitScript()` for Firebase auth and `hover()` for action buttons.
2. Run `npx playwright test tests/e2e/tier1-feature/f1-task-management.spec.ts`.
3. Verify that all 5 tests pass without using `evaluate()` for clicks or DOM manipulation.
