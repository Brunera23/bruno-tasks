# Handoff Report

## Observation
- The global `Escape` key listener is located at line 3893 of `index.html`:
  ```javascript
  if(e.key==='Escape'){closeM();closeCatMgr();$('#cfWrap').classList.remove('open');$('#wdgPanel').classList.remove('open');$('#wkToggle').classList.remove('open');$('.main').classList.remove('wdg-open');return}
  ```
- This listener unconditionally calls `closeM()` without checking if the primary modal (`#modal`) is actually open.
- The `closeM()` function (lines 3225-3232) unconditionally executes logic to unfreeze the background scroll:
  ```javascript
  document.body.classList.remove('modal-open');document.body.style.top='';
  document.documentElement.style.scrollBehavior='auto';
  window.scrollTo(0,parseInt(document.body.dataset.scrollY||'0'));
  ```
- Other secondary modals, such as Alert Form (`#alertSheet`), Note Form (`#noteSheet`), and Mobile/Settings Sheet (`#mobSheet`), use their own open functions (`openAlertForm()`, `openNoteForm()`, `openMobSheet()`/`openMobSettings()`) which also set the `modal-open` class to lock the body scroll.
- The `Escape` listener does not invoke their respective close functions (`closeAlertForm()`, `closeNoteForm()`, `closeMobSheet()`).

## Logic Chain
1. When the user opens a secondary modal (like Alert Form), the `modal-open` class is added to `document.body` and `dataset.scrollY` is set to freeze scrolling. The modal's DOM element receives the `open` class.
2. If the user presses the `Escape` key, the event listener unconditionally calls `closeM()`.
3. `closeM()` executes its scroll-unfreezing logic, clearing the `modal-open` class and resetting `window.scrollTo`.
4. However, because `closeAlertForm()` (or `closeNoteForm()`, `closeMobSheet()`) is never called by the Escape listener, the `open` class is never removed from the secondary modal.
5. The result is the visual state desynchronization reported by Challenger 2: the modal is still fully visible, but the body scroll is unfrozen.
6. A secondary side effect of this implementation is that pressing `Escape` when *no* modal is open will still trigger `closeM()`, executing a `window.scrollTo()` and potentially causing a disruptive scroll jump if the user had scrolled down the page.

## Caveats
- I did not test the exact rendering impact on mobile since I don't have a mobile environment here, but the code logic confirms the unfreeze happens.
- There are other overlays/modals that lack `Escape` key handling entirely (e.g. `addProjWrap`, `pActionSheet`, `fabMenu`, `notesBoardWrap`, `invWrap`). While not strictly causing a scroll desync (as they don't add `modal-open`), it's a UX gap that they cannot be closed with `Escape`.

## Conclusion
The root cause is that the `Escape` keydown event listener unconditionally calls `closeM()` without checking if the primary modal is active, and fails to call the close functions for secondary modals (`closeAlertForm`, `closeNoteForm`, `closeMobSheet`).

**Fix Strategy:**
Update the `Escape` key listener to conditionally close modals only if they are actively open.
```javascript
  if(e.key==='Escape'){
    const modal = $('#modal'); if(modal && modal.classList.contains('open')) closeM();
    const alertSheet = $('#alertSheet'); if(alertSheet && alertSheet.classList.contains('open') && typeof closeAlertForm === 'function') closeAlertForm();
    const noteSheet = $('#noteSheet'); if(noteSheet && noteSheet.classList.contains('open') && typeof closeNoteForm === 'function') closeNoteForm();
    const mobSheet = $('#mobSheet'); if(mobSheet && mobSheet.classList.contains('open') && typeof closeMobSheet === 'function') closeMobSheet();
    
    // (Optional but recommended: do the same for other overlays)
    closeCatMgr(); // already safe, doesn't mess with scroll
    const cfWrap = $('#cfWrap'); if(cfWrap) cfWrap.classList.remove('open');
    const wdgPanel = $('#wdgPanel'); if(wdgPanel) wdgPanel.classList.remove('open');
    const wkToggle = $('#wkToggle'); if(wkToggle) wkToggle.classList.remove('open');
    const main = $('.main'); if(main) main.classList.remove('wdg-open');
    
    // Add missing overlays for better UX
    const apWrap = $('#addProjWrap'); if(apWrap) apWrap.classList.remove('open');
    const paSheet = $('#pActionSheet'); if(paSheet) paSheet.classList.remove('open');
    if (typeof closeNotesBoard === 'function') closeNotesBoard();
    if (typeof closeFabMenu === 'function') closeFabMenu();
    return;
  }
```
This ensures that the scroll-unfreezing logic inside `closeM()` is only executed when `closeM()` is actually responsible for closing the active modal, and properly delegates closing to the other functions when their respective modals are active.

## Verification Method
1. Start the app.
2. Scroll down slightly.
3. Open a secondary modal like the Alert Form or Note Form.
4. Press `Escape`.
5. Observe that the modal correctly closes and the scroll unfreezes smoothly, matching expected behavior.
6. Scroll down again with no modals open, press `Escape`, and verify the screen does not unexpectedly jump to the top or a previous scroll position (verifying the secondary bug is fixed).
