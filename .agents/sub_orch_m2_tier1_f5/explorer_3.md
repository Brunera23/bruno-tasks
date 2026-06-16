# Handoff Report: Tier 1 - Feature 5 (Mobile & View Switching)

## Observation
- **Breakpoints**: A CSS media query (`@media(max-width:768px)`) determines the layout toggle. Below this width, `.sidebar` is set to `display: none` and `.mob-nav` is set to `display: block`.
- **Desktop Navigation**: The desktop view relies on `.sidebar` containing `.nav-item` elements with `data-view` attributes (`tasks`, `dash`, `med`).
- **Mobile Navigation**: The mobile view relies on `.mob-nav` containing `.mob-tab` elements with `data-view` attributes or specific IDs (like `#mobCatMgr`).
- **Views**: The application uses three main views controlled via the `active` class: `#tasksView`, `#dashView`, `#medView`.
- **Mais Settings Sheet**: Clicking the `#mobCatMgr` button in the mobile navigation calls `openMobSettings()`, which populates and displays the bottom sheet `#mobSheet` and its overlay `#mobSheetOv`.

## Logic Chain
1. To comprehensively test Mobile & View Switching, we must first verify that the UI renders the correct navigation mode depending on the viewport width (Desktop > 768px vs. Mobile <= 768px).
2. Once the mobile view is confirmed, we must verify that the mobile navigation tabs (`.mob-tab`) successfully interact with the views (`#tasksView`, `#dashView`, `#medView`), assigning the `.active` class to the appropriate target.
3. The 'Mais' (More) sheet is specific to mobile navigation and must open correctly when its trigger (`#mobCatMgr`) is clicked, providing access to settings and account options.
4. We must ensure that the responsive design dynamically adjusts without breaking functionality, validating toggling between mobile and desktop viewport sizes.

## Caveats
- No code was implemented; this is strictly a test design.
- Assumes standard Playwright viewport resolutions (e.g., Desktop: 1280x720, Mobile: 375x812) will be used to correctly trigger the 768px breakpoint.

## Conclusion
The test strategy should incorporate the following 5 specific Playwright test cases placed in `tests/e2e/tier1-feature/f5-mobile-view-switching.spec.ts`:

1. **Verify Desktop Navigation Layout**
   - **Viewport**: Desktop (Width > 768px).
   - **Action**: Check initial render.
   - **Locators**: Verify `.sidebar` is visible, `.mob-nav` is hidden, and `.nav-item` buttons are accessible.

2. **Verify Mobile Navigation Layout**
   - **Viewport**: Mobile (Width <= 768px).
   - **Action**: Check initial render.
   - **Locators**: Verify `.sidebar` is hidden, and `.mob-nav` with `.mob-tab` elements are visible.

3. **Verify Mobile View Switching**
   - **Viewport**: Mobile (Width <= 768px).
   - **Action**: Click `.mob-tab[data-view="tasks"]`, `.mob-tab[data-view="dash"]`, and `.mob-tab[data-view="med"]` sequentially.
   - **Locators**: Verify the `.active` class is correctly applied to `#tasksView`, `#dashView`, and `#medView` respectively.

4. **Verify 'Mais' Sheet Opens via Mobile Navigation**
   - **Viewport**: Mobile (Width <= 768px).
   - **Action**: Click `#mobCatMgr`.
   - **Locators**: Verify `#mobSheet` and `#mobSheetOv` gain the `.open` class and are visible.

5. **Verify Responsive Viewport Toggling**
   - **Action**: Start in Desktop viewport and verify `.sidebar` visibility. Resize the viewport to Mobile dimensions and verify `.sidebar` disappears while `.mob-nav` appears. Resize back to Desktop and verify `.sidebar` returns. 

## Verification Method
1. Create the Playwright test file at `tests/e2e/tier1-feature/f5-mobile-view-switching.spec.ts` matching the strategy.
2. Run `npx playwright test tests/e2e/tier1-feature/f5-mobile-view-switching.spec.ts`.
3. Success condition: All 5 tests pass flawlessly under their specified viewport configurations.
