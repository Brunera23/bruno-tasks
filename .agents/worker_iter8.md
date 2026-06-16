# Observation
- Running e2e tests in `tests/e2e/tier1-feature/f5-mobile-view-switching.spec.ts` reported `Error: expect(locator).toBeVisible() failed` due to an underlying `BROWSER ERROR: Cannot read properties of null (reading 'classList')` during view switches.
- Searched for `.classList` usages inside `index.html`, and isolated `$('#fmWrap').classList.contains('open')` within the `switchView()` function. `fmWrap` does not exist in the DOM, causing a null reference error.
- Fixed the null reference by swapping `$('#fmWrap')` to `$('#modal')` and substituting the manual toggle with the application's native `closeM()` method.
- Re-running the test revealed a subsequent failure in `Mobile Mais Sheet Toggle`, where `await expect(mobSheetOv).not.toBeVisible()` failed to confirm disappearance.
- Inspection of the `.mob-sheet` and `.mob-sheet-ov` classes revealed they lacked `visibility: hidden`, leaving them fundamentally `visible` to Playwright even when translated completely outside the viewport using `transform: translateY(100%)` or `opacity: 0` inside an animation context.

# Logic Chain
- The test failure originally stemmed from a DOM lookup for an obsolete ID (`#fmWrap`) which crashed the `switchView` method and prevented navigation tests from passing.
- Swapping the check to `#modal` and calling `closeM()` restores the functionality.
- The Playwright failure for visibility expectation was caused by Playwright's behavior of evaluating elements without strict hidden CSS rules as still 'visible', particularly those translated offscreen by `translateY(100%)`.
- To fix the visibility tracking in automated tests, `visibility: hidden` (and `visibility: visible` on `.open`) was added to the `.mob-sheet` and `.mob-sheet-ov` classes across relevant viewports.
- Running the tests validated that these fixes resolved both the crash and visibility check errors.

# Caveats
No caveats.

# Conclusion
The tests have been successfully repaired by fixing the obsolete `fmWrap` reference inside `switchView` in `index.html` and properly handling CSS visibility bounds on mobile sheet overlays to fulfill Playwright constraints.

# Verification Method
Run `npx playwright test tests/e2e/tier1-feature/f5-mobile-view-switching.spec.ts` from `c:\Users\Bruno\Desktop\activities tracker`. All 5 tests will pass successfully.
