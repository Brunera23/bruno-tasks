# Handoff Report - Feature 6: Widget Panel Rendering Tests

## 1. Observation
- The application uses `index.html` to render a main UI with a side Widget Panel (`#wdgPanel`).
- The Widget Panel is toggled by clicking `#wkToggle` (which adds the `open` class to `#wdgPanel` and the `wdg-open` class to `.main`).
- The Widget Panel contains 7 different widgets generated via Javascript `renderWidgets()`. The widgets are: `overdue`, `week`, `foco`, `next`, `progress`, `blocked`, and `habits`.
- Each widget is structured as a `.wdg-card` with a `.wdg-head` (containing a title, drag icon, and a `.wdg-filter-btn`) and a `.wdg-body` (containing `.wdg-summary` and `.wdg-body-full`).
- Clicking `.wdg-head[data-wdg-expand="..."]` toggles a `compact` class on the `.wdg-card`, switching visibility between `.wdg-summary` and `.wdg-body-full`.
- Clicking a widget's filter button (`.wdg-filter-btn[data-wdg-filter="..."]`) updates the global task filter, modifying the `#pageTitle` to reflect the active widget and displaying a `.wdg-filter-x` button to clear it.
- Specific widgets contain inner interactive elements. For example, the `week` widget has `.wk-day` elements representing days of the week, which apply a date-specific filter when clicked (e.g., filtering for `Hoje`).

## 2. Logic Chain
- To achieve Tier 1 (happy-path feature coverage), we must ensure the core mechanics of the Widget Panel function correctly: visibility, layout persistence (expand/collapse), and interaction with the main app state (global filters).
- **Test Case 1** will verify the core visibility toggle (`#wkToggle`), as it is the primary entry point to the feature.
- **Test Case 2** will verify the default rendering of the widgets, ensuring all expected widgets load successfully and display their respective titles.
- **Test Case 3** will cover the compact/expand functionality within a specific widget card (e.g., `foco`), asserting that the `.compact` class triggers the correct view changes.
- **Test Case 4** will cover the global filtering applied by clicking a widget's header filter button (e.g., `next`), verifying that the page title changes and the clear button `.wdg-filter-x` appears.
- **Test Case 5** will cover inner-widget interactions by clicking a day inside the `week` widget (e.g., `.wk-day.is-today`), verifying that context-specific inner filters work correctly.

## 3. Caveats
- Drag-and-drop widget reordering is implemented in the codebase but omitted from these Tier 1 test cases due to the complexity and potential flakiness of pointer-based drags in opaque-box tests.
- We assume the default LocalStorage state. The `wdgState` stores the compact/expand configuration persistently. If previous tests modify LocalStorage, `foco` might already be compact, requiring test isolation.
- The UI data is dependent on task dates. For instance, the `week` widget uses `is-today`. The opaque-box locators reflect this dynamic state without requiring precise data injection.

## 4. Conclusion
The following 5 Tier 1 Playwright test case strategies provide comprehensive happy-path coverage for Feature 6 (Widget Panel Rendering).

### Proposed Test Cases:

**Test Case 1: Toggle Widget Panel Visibility**
*   **Actions:** Click the `#wkToggle` button.
*   **Assertions:** Assert `#wdgPanel` has class `open`. Click `#wkToggle` again. Assert `#wdgPanel` does not have class `open`.

**Test Case 2: Verify Default Widgets Rendering**
*   **Actions:** Click `#wkToggle` to open the widget panel.
*   **Assertions:** Count `.wdg-card` elements to ensure exactly 7 widgets exist. Assert specific widgets exist by locator (e.g., `.wdg-card[data-wdg="week"]`) and their titles are visible (e.g., "Carga da Semana" inside `.wdg-name`).

**Test Case 3: Expand and Collapse Widget View**
*   **Actions:** Open the widget panel. Click the header of the "Foco do Dia" widget (`.wdg-head[data-wdg-expand="foco"]`).
*   **Assertions:** Assert `.wdg-card[data-wdg="foco"]` has the `compact` class. Assert `.wdg-summary` is visible and `.wdg-body-full` is hidden (or visually zero-height). Click the header again. Assert the `compact` class is removed.

**Test Case 4: Apply Global Task Filter via Widget Header**
*   **Actions:** Open the widget panel. Click the filter button inside the "Próximas Prioridades" widget (`.wdg-filter-btn[data-wdg-filter="next"]`).
*   **Assertions:** Assert `#pageTitle` contains the text "Próximas Prioridades". Assert the clear filter button `.wdg-filter-x` is visible. Click `.wdg-filter-x`. Assert `#pageTitle` reverts to the default "Tarefas" (or selected category).

**Test Case 5: Apply Internal Widget Filter (Week Day)**
*   **Actions:** Open the widget panel. Locate the "Carga da Semana" widget (`[data-wdg="week"]`). Click the specific day representing today (`.wk-day.is-today`).
*   **Assertions:** Assert `#pageTitle` contains the text "Hoje". Assert `.wdg-filter-x` is visible. Click `.wdg-filter-x` to ensure the filter clears correctly.

## 5. Verification Method
- The tests can be implemented in a Playwright `.spec.ts` file targeting the `index.html` application.
- To verify the locators and behaviors, manually serve `index.html` via a local HTTP server and perform the actions listed above using Chrome DevTools.
- Verify that `class="open"` strictly controls `#wdgPanel` visibility and the `#pageTitle` DOM updates instantly upon filtering.
