# Handoff: Explorer 1

## Observation
- Analyzed `TEST_INFRA.md` which requires 5 Tier-1 test cases for "Categories & Projects" per the F3 requirement.
- Investigated `index.html` structure to find HTML elements and UI logic.
- **Projects**:
  - Found `#projNav` for the projects list in the sidebar.
  - Adding a Project: Triggered by `#addProjBtn` which opens `#addProjWrap`. Input is `#apName` and save button is `#apSave`.
  - Editing a Project: `proj-item` div has a `[data-proj-more]` button. Clicking this opens `#pActionSheet`, which has a button with text "Editar Projeto". Saving uses the same `#addProjWrap` fields.
  - Toggling Project Visibility: Handled by `.proj-toggle` buttons on each `.proj-item`. Toggles a `.on` class.
- **Categories**:
  - Found `#catNav` for the categories list in the sidebar.
  - Category modal is opened via `#catMgrBtn` (`#modalCat` shows up).
  - Adding a Category: Handled by `#catAddBtn` -> fill `#ceN` -> click `#ceSave`.
  - Editing a Category: Handled by clicking the edit icon (`.cat-mgr-actions button:not(.del)`) on the `.cat-mgr-item` -> fill `#ceN` -> click `#ceSave`.

## Logic Chain
1. To cover exactly 5 tests for Feature 3 as instructed, I scoped the tests around the 5 main interactions found in the code related to Projects and Categories: Project Creation, Project Edition, Project Visibility Toggle, Category Creation, and Category Edition.
2. Found the corresponding exact Playwright locators for all 5 tests:
   - Create Project: `page.locator('#addProjBtn')`, `page.locator('#apName')`, `page.locator('#apSave')`, verify in `page.locator('#projNav')`.
   - Edit Project: `page.locator('.proj-item', { hasText: '...' }).locator('[data-proj-more]')`, `page.locator('#pActionSheet button', { hasText: 'Editar Projeto' })`.
   - Project Visibility: `page.locator('.proj-item', { hasText: '...' }).locator('.proj-toggle')`.
   - Create Category: `page.locator('#catMgrBtn')`, `page.locator('#catAddBtn')`, `page.locator('#ceN')`, `page.locator('#ceSave')`, verify in `page.locator('#catNav')`.
   - Edit Category: `page.locator('.cat-mgr-item', { hasText: '...' }).locator('.cat-mgr-actions button:not(.del)')`.

## Caveats
- Did not implement the tests myself as constrained.
- The default project "Bruno" can be used for visibility testing.
- The new project UUID suffix is dynamically generated in JS `uid()`, so tests should rely on text matching (`hasText`).

## Conclusion
The exact locators and test strategy for the 5 tests required for Tier 1 F3 (Categories & Projects) have been mapped successfully. The locators correctly map to the underlying app logic in `index.html`. 

## Verification Method
Run `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts` when the implementer agent completes the work.
