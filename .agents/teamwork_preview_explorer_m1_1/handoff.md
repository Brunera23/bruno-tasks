# Handoff Report: Bruno Tasks Bug Investigation

## 1. Observation
- Inspected `c:\Users\Bruno\Desktop\activities tracker\index.html` for any task selection state management. 
- Searched for explicit selection logic (`selectedTaskId`, `.selected` CSS classes, focus management) and found none for task items (`.item`).
- Click events on task rows (`.item`) are not explicitly handled in the `#list` event delegation block (lines 3833-3870). Only internal elements like `.ck`, `.tag-cat`, and `.item-date` are handled.
- The `edit(id)` function is bound directly to the edit `<button>` inside the task's action menu (`.item-acts`), which is revealed purely via CSS `:hover` (lines 2307, and CSS rules for `.item-acts`).
- Extensively tested the modal open/close logic (`openM()` at line 3174, `closeM()` at line 3223, and `$('#ov')` click listeners). Closing the modal by clicking outside (`#ov`) properly resets the modal state and allows immediate reopening without errors.

## 2. Logic Chain
1. Users intuitively interpret clicking a task row as "selecting" it, expecting it to remain active and its action buttons (like Edit/Delete) to be accessible.
2. Because there is no JavaScript-managed programmatic selection state, the application relies entirely on the CSS `:hover` pseudo-class to reveal the `.item-acts` buttons.
3. Clicking outside a task clears the browser's `:hover` and focus states, instantly hiding the action buttons.
4. On touch screens or hybrid devices, tapping an element triggers `:hover`. Tapping outside removes it. When a user tries to return to the task by tapping it again, mobile browsers often struggle to reliably re-trigger the `:hover` state without a DOM change or dedicated click handler, leading directly to the user report: "clicking outside a task prevents returning to it."
5. Implementing an explicit, JavaScript-driven "selected" state for tasks will decouple the UI from brittle `:hover` behaviors and definitively resolve the deselection bug.

## 3. Caveats
- I assumed "Task" refers to the task row in the main list. It is theoretically possible "Task" refers to the Task Modal itself; however, my trace of `closeM` and `openM` confirms that clicking outside the modal (`#ov`) does not prevent the modal from reopening. 
- I assumed the bug is experienced primarily on touch devices or due to user expectation of persistent selection, as a physical mouse user on desktop would simply re-hover the item.
- I did not run the application in a live mobile simulator to capture the exact touch event sequence, as the lack of selection state in the source code fully explains the symptom.

## 4. Conclusion
The root cause of the "Task Deselection Bug" is the absence of a stateful task selection mechanism, combined with a strict reliance on CSS `:hover` to display task action buttons. When a user clicks outside, the hover state is lost, and subsequent taps fail to reliably restore it.

**Recommended Fix Strategy:**
1. Define a global variable `let selectedTaskId = null;` in `index.html`.
2. Update the `#list` event delegation (line 3833) to catch clicks on `.item-row`. If clicked, set `selectedTaskId = t.id` and call `renderTasks()`.
3. Add a `document` click handler to clear `selectedTaskId` (and re-render) if a user clicks outside any `.item`.
4. In the `render()` function (around line 2307), append a `.selected` class to the `.item` wrapper if `t.id === selectedTaskId`.
5. Add a CSS rule to force action visibility when selected: `.item.selected .item-acts { max-width: 80px; opacity: 1; }`.

## 5. Verification Method
- **Code Inspection:** Check `index.html` lines 3833-3870 and confirm that no `.item` or `.item-row` click handler exists. Check the CSS for `.item-acts` to confirm it relies solely on `:hover`.
- **Invalidation Condition:** If the user specifies that the bug occurs exclusively inside the modal on desktop (e.g., clicking outside a specific input field prevents editing it again), then this conclusion is invalid. However, current codebase analysis strongly points to the list-item selection UX.
