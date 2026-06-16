# Handoff Report: F3 Tests (Categories & Projects)

## Observation
- Test architecture uses Playwright. Target file is `tests/e2e/tier1-feature/f3-categories-projects.spec.ts` (as defined in `TEST_INFRA.md` and `SCOPE.md`).
- We need exactly 5 test cases for Feature 3.
- The app stores categories in the `cats` array and `DEF_CATS`, while "Nos" project categories are `NOS_CATS`.
- Projects are managed via `projects` array and can be personal or shared.
- `index.html` implements specific UI elements and locators for Projects:
  - Add Project: `#addProjBtn` in sidebar.
  - Project Modal: `#addProjWrap`, `#apName`, `#apIcons .ap-opt`, `#apColors .ap-c-opt`, `#apSave`.
  - Sidebar Project list: `.proj-item[data-proj="<id>"]`.
  - Project Action Menu: `.a-btn[data-proj-more="<id>"]` -> opens `#pActionSheet` with Edit, Share, Delete buttons. Delete uses `delProj(id)`.
  - Project Visibility Toggle: `.proj-toggle[data-proj-toggle="<id>"]`.
- `index.html` implements locators for Categories:
  - Manage Categories: `#catMgrBtn`.
  - Category List Modal: `#catMgrView` with list `#catMgrList` containing `.cat-mgr-item`.
  - Add Category: `#catAddBtn`.
  - Edit Category View: `#catEditView`, `#ceN`, `#ceIcons .icon-opt`, `#ceColors .color-opt`, `#ceSave`.
  - Delete Category: `.cat-mgr-actions .a-btn.del` -> `#cfYes`.
- Task Form uses `#fProj` (project selector) and `#fCWrap` (category selector).
- `getCatsForProject(projId)` logic returns `NOS_CATS` for `'nos'` project and `cats` for personal projects, dynamically updating the task form options.

## Logic Chain
1. To comprehensively cover Feature 3 (Categories & Projects) with exactly 5 tests, we must validate both entity lifecycles (Create/Edit/Delete) and their interactions (Project visibility filtering, Category scoping by project).
2. **TC1: Create and verify a new Project.** Exercises the Add Project modal, verifying it renders in the left sidebar and is available in the task form.
3. **TC2: Create and Edit a Category.** Exercises the Category Manager, adding a new custom category and editing its name/icon, verifying updates persist in the Category Manager list.
4. **TC3: Project Visibility Toggle.** Exercises the `.proj-toggle` to ensure hiding a project accurately filters out its tasks from the main view and showing restores them.
5. **TC4: Category Scoping by Project (Bruno vs Nós).** Exercises the form interaction where selecting the "Nós" project updates the available categories to `NOS_CATS` and selecting "Bruno" updates them to the standard `cats`.
6. **TC5: Delete Category and Project.** Exercises the deletion workflows (Project via `#pActionSheet` -> Excluir, Category via `.a-btn.del`), confirming the confirmation modals (`#cfYes`) and verify their removal from the UI.

## Caveats
- The app has mobile-specific menus (e.g., `#mobCatMgr`, `openMobSettings()`). These Tier 1 tests focus on the primary (desktop) locators. Mobile aspects are generally covered in Tier 4/Feature 5 tests.
- Shared project invitation logic is not covered here, as it requires mocking the Firebase backend which may not be fully set up for local E2E. The tests focus on UI behavior and local state.
- Category deletions are soft/hard depending on tasks; we assume basic deletion testing without complex task relationships.

## Conclusion
The recommended strategy provides 5 distinct test cases mapping perfectly to the Feature 3 requirements (Categories & Projects). The exact Playwright locators identified allow immediate implementation of robust E2E test cases.

## Verification Method
1. A worker will implement the 5 tests in `tests/e2e/tier1-feature/f3-categories-projects.spec.ts` using the provided locators and scenarios.
2. Run `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts` to verify they all pass.
3. Ensure no regressions in other tests.
