# Handoff Report: Escape Key State Desync Vulnerability

## Observation
In `index.html`, the global `Escape` keydown listener (around line 3893) reads:
```javascript
  // Escape closes
  if(e.key==='Escape'){closeM();closeCatMgr();$('#cfWrap').classList.remove('open');$('#wdgPanel').classList.remove('open');$('#wkToggle').classList.remove('open');$('.main').classList.remove('wdg-open');return}
```
When `closeM()` is executed (defined around line 3225), it performs the following DOM manipulations:
```javascript
function closeM(){
  $('#ov').classList.remove('open');$('#modal').classList.remove('open');
  // Restore body scroll
  document.body.classList.remove('modal-open');document.body.style.top='';
  // ... (scroll restoration logic)
}
```
However, the application uses multiple secondary modals (e.g., Alert Form via `openAlertForm()`, Mobile Sheet via `openMobSheet()`, Note Form via `openNoteForm()`). When these secondary modals are opened, they also add the `modal-open` class to `document.body` to freeze background scrolling. For example, `closeMobSheet()` (line 4276) independently handles removing the `open` classes for its elements (`#mobSheet`, `#mobSheetOv`) and unfreezing the body scroll. 

The Escape listener does not invoke `closeAlertForm()`, `closeNoteForm()`, or `closeMobSheet()`.

## Logic Chain
1. When a secondary modal (like the Mobile Sheet or Alert Form) is opened, its open function adds the `modal-open` class to `document.body`, freezing the background scroll. It also adds the `open` class to the specific modal's DOM elements (e.g., `#mobSheet` and `#mobSheetOv`).
2. If the user presses `Escape`, the global `keydown` event listener unconditionally calls `closeM()`.
3. `closeM()` removes the `modal-open` class from `document.body`, thereby restoring background scroll.
4. Because the listener does not call the corresponding close functions for the secondary modals (e.g., `closeMobSheet()`), the `open` class is never removed from the secondary modal elements.
5. As a result, the secondary modal remains fully visible, but the background scroll is unfrozen, causing the UI state desync.

## Caveats
- `openNoteForm` / `closeNoteForm` appear to be dead/unreachable code in the current iteration (its FAB button reference was removed), but the structural vulnerability still applies to it.
- Other modal-like elements, such as `pActionSheet` or `addProjWrap`, do not set `modal-open`, so while they don't cause a scroll desync, they also cannot be dismissed with the Escape key under the current implementation.
- The `Escape` listener doesn't check if the main modal (`#modal`) is actually open before calling `closeM()`.

## Conclusion
The bug is caused by the global Escape listener blindly executing `closeM()` without checking which modal is actually open, inadvertently unfreezing the background scroll for secondary modals while leaving them visually open.

**Recommended Fix Strategy:**
Rewrite the Escape key listener to conditionally close the topmost active modal. It should check for the presence of the `.open` class on specific modals and call their respective close functions, rather than unconditionally calling `closeM()`.

Example strategy:
```javascript
if(e.key==='Escape'){
  if($('#alertSheet')?.classList.contains('open')) { closeAlertForm(); return; }
  if($('#mobSheet')?.classList.contains('open')) { closeMobSheet(); return; }
  if($('#noteSheet')?.classList.contains('open')) { closeNoteForm(); return; }
  if($('#modalCat')?.classList.contains('open')) { closeCatMgr(); return; }
  if($('#modal')?.classList.contains('open')) { closeM(); return; }
  // Add checks for #cfWrap, #addProjWrap, #pActionSheet, etc.
  
  // Non-modal panels fallback
  $('#wdgPanel').classList.remove('open');
  $('#wkToggle').classList.remove('open');
  $('.main').classList.remove('wdg-open');
  return;
}
```

## Verification Method
1. Launch the application and open a secondary modal (e.g., trigger `openMobSheet()` or `openAlertForm()` via console, or use the mobile bottom sheet/settings).
2. Verify that the background cannot be scrolled (inspect `document.body` for the `modal-open` class).
3. Press the `Escape` key.
4. Notice that the modal remains visually open on the screen, but the background can now be scrolled (`modal-open` was incorrectly stripped by `closeM()`).
5. Apply the fix (conditionally calling the correct close function based on which modal has the `open` class).
6. Repeat the steps. Pressing `Escape` should now properly dismiss the secondary modal and unfreeze the scroll as a single atomic action.
