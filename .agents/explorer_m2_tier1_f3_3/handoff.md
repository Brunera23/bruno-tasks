# Handoff Report: Feature 3 (Categories & Projects) Playwright Strategy

## 1. Observation
- `index.html` implements Projects using the `.sidebar-projects` navigation (`#projNav` element) and Categories using `.sidebar-cats` (`#catNav` element).
- **Projects** can be created clicking `button#addProjBtn`. The modal `#addProjWrap` captures the name (`#apName`), icon (`#apIcons .ap-opt`), color (`#apColors .ap-c-opt`), and is saved via `#apSave`. Projects are edited via `#pActionSheet` using `[data-proj-more="<id>"]`.
- **Categories** are managed via a Settings Modal (`#modalCat`) opened by clicking `button#catMgrBtn`. New categories are added via `#catAddBtn` opening `#catEditView` (`#ceN` for name, `#ceIcons` and `#ceColors` for styling, `#ceSave` for submit).
- **Task form assignment**: The project selector is at `#fProj button[data-v="<proj_id>"]` (or matching by text since custom IDs are dynamic). The category selector is at `#fCWrap`, which opens a dropdown (`#fCMenu .cs-opt`). Clicking a project dynamically updates the category picker (line 3808).
- Empty categories are visually hidden from the sidebar (`catsToShow.filter(...)`), but tasks assigned to them will make them appear, validating assignment.

## 2. Logic Chain
- To achieve exactly 5 test cases covering Tier 1 Feature Coverage for "Categories & Projects" (Feature 3), we must cover the core CRUD loops for both entities and their critical interaction (scoping categories to a project and assigning them to a task).
- **Test 1**: Verify Project Creation (tests `#addProjBtn` -> `#addProjWrap`).
- **Test 2**: Verify Project Editing (tests `#pActionSheet` -> `#addProjWrap`).
- **Test 3**: Verify Category Creation (tests `#catMgrBtn` -> `#catAddBtn` -> `#catEditView`).
- **Test 4**: Verify Category Editing (tests `#catMgrBtn` -> `.cat-mgr-item .a-btn`).
- **Test 5**: Verify Task Assignment & Project-Category Interaction (tests creating a task, selecting the custom project, selecting the custom category, saving, and verifying the category pill appears in the sidebar and filtering works).

## 3. Caveats
- Playwright's `locator('text="<string>"')` will be required for matching dynamic IDs (like `proj_xyz` or `cat_xyz`) since they are generated using `uid()` and not predetermined.
- Since empty categories are hidden from the sidebar, Test 3 and Test 4 should verify existence within the Category Manager (`#catMgrList`), while Test 5 will verify existence in the sidebar (`#catNav`) after the task is created.
- Project editing opens the same modal as project creation (`#addProjWrap`), but with populated values. The test must clear the `#apName` and `#ceN` fields before typing the updated string during edit operations.

## 4. Conclusion
Implement the following 5 tests in `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`:
1. `should create a new project with custom icon and color`: Use `#addProjBtn`, `#apName`, `#apSave`. Assert `.proj-item .proj-name` has the project text.
2. `should edit an existing project name`: Click `.proj-item:has-text("ProjectName") [data-proj-more]`, click "Editar Projeto", edit `#apName`, save. Assert updated text in `.proj-item .proj-name`.
3. `should create a new category via category manager`: Use `#catMgrBtn`, `#catAddBtn`, `#ceN`, `#ceSave`. Assert in `#catMgrList .cat-mgr-name`.
4. `should edit an existing category`: Open `#catMgrBtn`, click edit (`.a-btn:has(svg use[href="#i-edit"])`) on the created category, update `#ceN`, `#ceSave`. Assert in `#catMgrList .cat-mgr-name`.
5. `should assign task to specific project and category, and filter by it`: Open `#btnAdd`, click project `#fProj button:has-text("ProjectName")`, select category `#fCWrap` -> `#fCMenu .cs-opt:has-text("CategoryName")`, fill `#fT`, save. Assert category pill appears in `.cat-nav-item` and task is visible when filtered.

## 5. Verification Method
- Ensure the implementer agent places these exactly in `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`.
- Execute the tests using `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts`.
- The tests pass if all 5 feature cases succeed and successfully interact with the locators identified above in a local HTTP server environment serving `index.html`.
