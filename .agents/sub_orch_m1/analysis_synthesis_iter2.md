# Analysis Synthesis (Iteration 2)

## Consensus
Explorer 3 (Gen 2) confirmed the finding from Challenger 2: The global `Escape` keydown listener in `index.html` unconditionally calls `closeM()`. `closeM()` removes the `modal-open` class from `document.body` (unfreezing the scroll). However, the listener does not call the corresponding close functions for secondary modals (e.g., `closeMobSheet()`, `closeAlertForm()`). If a user presses `Escape` while a secondary modal is open, the background scroll is incorrectly unfrozen while the secondary modal remains open, causing a state desynchronization.

## Resolved Conflicts
N/A

## Dissenting Views
N/A

## Gaps
None.

## Recommended Fix Strategy
Rewrite the Escape key listener in `index.html` to conditionally close the topmost active modal instead of unconditionally executing `closeM()`.
1. Check if secondary modals are open (e.g., `#alertSheet`, `#mobSheet`, `#noteSheet`, `#addProjWrap`, `#pActionSheet`) and call their respective close functions.
2. Check if `#modal` is open and call `closeM()`.
3. Check if `#modalCat` is open and call `closeCatMgr()`.
4. Only call `closeM()` or remove `modal-open` classes if the appropriate overlay was actually open.
