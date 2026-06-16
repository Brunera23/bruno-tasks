# Handoff Report

## Observation
1. **Login Screen Bypassing**: The previous worker bypassed the login screen using `page.evaluate(() => { document.getElementById('loginScreen').style.display = 'none'; ... })`. The UI contains a `#loginBtn` which triggers `firebase.auth().signInWithPopup(googleProvider)`. Playwright tests cannot easily interact with real Google popups without explicit accounts and dealing with flakiness.
2. **Click Bypassing**: The worker used `.evaluate(b => b.click())` on `.a-btn` (Edit/Delete buttons) and `.ck` (Checkboxes), and `#cfYes` (Confirmation). 
3. **Hidden Action Buttons**: Inspecting `index.html` CSS reveals that `.item-acts` (container for `.a-btn` Edit/Delete buttons) has `opacity: 0` by default and becomes `opacity: 1` only upon `:hover` (`@media(hover:hover) { .item:hover .item-acts { opacity: 1 } }`).
4. **Checkbox and Confirmation Modals**: The `.ck` elements have a large `::after` pseudo-element for touch targets which might cause hit-testing confusion if Playwright attempts to click the center but an overlay or padding intercepts. The `#cfWrap` modal relies on a `.25s` CSS transition to change `pointer-events: none` to `all`.

## Logic Chain
1. **Login Navigation**: To natively interact with `#loginBtn` without a real Google popup, we must mock the `firebase.auth()` API or intercept the Firebase Identity Toolkit network request. Mocking `signInWithPopup` via `page.addInitScript()` allows the test to call `page.locator('#loginBtn').click()` natively, which then immediately resolves the mock promise and triggers the app's native `showApp()` entry flow.
2. **Action Buttons**: The Edit and Delete buttons were obscured because Playwright enforces visibility checks, and elements with `opacity: 0` are considered non-actionable. The correct approach is to call `item.hover()` to reveal the buttons natively, wait for them to become visible, and then call `locator.click()`.
3. **Checkbox and Modals**: The `.ck` checkbox should be clicked with `locator.click()`. If pseudo-elements overlap, `locator.click({ force: true })` is acceptable as a fallback, but native `.click()` usually works if we wait for stability. For `#cfYes`, the test must wait for `#cfWrap` to have the `.open` class and for the CSS transition to complete (Playwright's default actionability checks will handle this if we don't bypass them with `evaluate`).

## Caveats
- I am assuming Firebase Authentication is loaded globally (`window.firebase`) and that `signInWithPopup` can be mocked securely via `page.addInitScript()`. If the app uses modular Firebase, we'd intercept the network request to `https://identitytoolkit.googleapis.com/...` instead.
- If hover interactions are flaky in headless mode, we may need to use `.click({ force: true })` on the buttons, but `hover()` is the standard native Playwright fix for `opacity: 0` on hover states.

## Conclusion
The implementation cheated by bypassing visibility and pointer-events constraints via `evaluate()`. To fix this:
1. **Mock Login**: Use `page.addInitScript` to mock `firebase.auth().signInWithPopup`, allowing a native `page.locator('#loginBtn').click()`.
2. **Native Interaction**: Use `item.hover()` to reveal action buttons before clicking them. Wait for modals (`#cfWrap`, `#stPop`) to become fully visible.

### 5 Proposed Test Cases for Feature 1 (Task Management)
1. **Create a task**: Natively click `#btnAdd`, wait for `#modal.open`, fill `#fT`, natively click `#form button[type="submit"]`. Verify item appears in the task list natively.
2. **Update a task**: Locate `.item`, call `locator.hover()` to reveal `.item-acts`, natively click `.a-btn` (Edit). Wait for `#modal.open`, modify text in `#fT`, click submit. Verify text updates.
3. **Change status to Doing**: Click `.ck` natively. Wait for `#stPop.show` to become visible. Natively click `.st-opt[data-st="doing"]`. Verify `.ck` has class `doing-st`.
4. **Change status to Done**: Click `.ck` natively. Wait for `#stPop.show`. Natively click `.st-opt[data-st="done"]`. Verify `.ck` has class `on` and item has class `completed`.
5. **Delete a task**: Call `locator.hover()` on `.item` to reveal `.item-acts`. Natively click `.del` button. Wait for `#cfWrap.open`. Natively click `#cfYes`. Verify `.item` is detached from DOM.

## Verification Method
1. Run `npx playwright test tests/e2e/tier1-feature/f1-task-management.spec.ts`.
2. Observe the Playwright trace viewer or headed mode to ensure `#loginBtn` is physically clicked and no `evaluate(b => b.click())` is used in the test code.
3. Ensure the test fails if the CSS hover or modal transitions are broken, confirming the E2E is validating real UI behavior.
