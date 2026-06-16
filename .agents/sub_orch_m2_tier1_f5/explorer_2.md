# Observation

- **Desktop Navigation:** Uses `.nav-item` elements with `data-view` attributes (`"tasks"`, `"dash"`, `"med"`). The active view container (`#tasksView`, `#dashView`, `#medView`) receives the `.active` class.
- **Mobile Navigation:** Uses `.mob-tab` elements with `data-view` attributes (`"tasks"`, `"dash"`, `"med"`). It becomes visible (`display: block`) under mobile viewport settings, while the `.sidebar` becomes hidden (`display: none`).
- **"Mais" Sheet:** Accessed via `.mob-tab#mobCatMgr`. Clicking it opens the `#mobSheet` by adding the `.open` class.
- **Settings Options:** Inside `#mobSheet`, there are buttons like `#msCategories`. Clicking `#msCategories` closes the sheet and opens the category manager (`#catMgrView`).

# Logic Chain

To verify Feature 5 (Mobile & View Switching), we need 5 targeted test cases that cover the core flows for desktop and mobile users:
1. **Desktop View Switching:** Ensure that clicking the sidebar items changes the active view container. This ensures core desktop navigation works.
2. **Responsive Layout Change:** Resize the viewport from desktop to mobile. Verify that `.sidebar` is hidden and `.mob-nav` is visible. This confirms the media query structure.
3. **Mobile View Switching:** In mobile view, tap the bottom tabs (`.mob-tab`). Verify that the respective views (`#tasksView`, `#dashView`, `#medView`) become active. This ensures mobile interaction logic is wired correctly.
4. **Mobile "Mais" Sheet Opening:** In mobile view, tap `#mobCatMgr`. Verify `#mobSheet` gets `.open` class. This tests the mobile settings sheet invocation.
5. **Mobile "Mais" Navigation to Categories:** Inside the open sheet, click `#msCategories`. Verify the `#modalCat` and `#catMgrView` become visible/open. This verifies nested navigation out of the mobile sheet.

# Caveats

- Playwright tests should use `page.setViewportSize()` to toggle between desktop (e.g., 1280x720) and mobile (e.g., 375x812) viewports.
- Some transitions involve `setTimeout` (e.g., opening the category manager after `#msCategories` click takes ~350ms), so `expect().toBeVisible()` with Playwright's auto-retries is needed rather than immediate checks.
- When the categories modal is opened, the `#ovCat` and `#modalCat` overlays receive `.open`.

# Conclusion

The required test suite for Tier 1: Feature 5 should consist of the following 5 test cases in `tests/e2e/tier1-feature/f5-mobile-view-switching.spec.ts`:

1. **Desktop View Switching:** Click `.nav-item[data-view="dash"]`, etc., and expect `#dashView` to have `.active` class.
2. **Responsive Layout Check:** Resize viewport to 375x812. Expect `.sidebar` to be hidden and `.mob-nav` to be visible.
3. **Mobile View Switching:** At 375x812, click `.mob-tab[data-view="med"]`, etc., and expect `#medView` to have `.active` class.
4. **Mobile "Mais" Sheet:** Click `#mobCatMgr` and expect `#mobSheet` to have `.open` class.
5. **Mobile Sheet to Categories:** Inside the sheet, click `#msCategories` and expect `#modalCat` to be visible with `#catMgrView` displayed.

# Verification Method

Run the playwright tests using the project test command (e.g., `npx playwright test tests/e2e/tier1-feature/f5-mobile-view-switching.spec.ts`) after implementation to confirm that all 5 tests pass without timing out on element visibility checks.
