# Observation
In `index.html` around line 3887, there is a global `keydown` event listener.
On line 3893, it handles the `Escape` key:
`if(e.key==='Escape'){closeM();closeCatMgr();$('#cfWrap').classList.remove('open');$('#wdgPanel').classList.remove('open');$('#wkToggle').classList.remove('open');$('.main').classList.remove('wdg-open');return}`

When inspecting `closeM()` (line 3225), it removes the `open` class from `#ov` and `#modal`. Crucially, it unconditionally removes the `modal-open` class from `document.body` and restores the background scroll position:
```javascript
function closeM(){
  $('#ov').classList.remove('open');$('#modal').classList.remove('open');
  // Restore body scroll
  document.body.classList.remove('modal-open');document.body.style.top='';
  document.documentElement.style.scrollBehavior='auto';
  window.scrollTo(0,parseInt(document.body.dataset.scrollY||'0'));
  setTimeout(()=>document.documentElement.style.scrollBehavior='',10);
}
```

Similarly, secondary modals like the Alert Form (`#alertSheet`), Note Form (`#noteSheet`), and Mobile Sheet (`#mobSheet`) have their own open/close functions (`openAlertForm`/`closeAlertForm`, etc.) that also lock/unlock the background scroll by adding/removing the `modal-open` class.

# Logic Chain
1. When the user opens a secondary modal (e.g., Alert Form), the `modal-open` class is added to `document.body`, freezing the background scroll.
2. If the user presses the `Escape` key while this secondary modal is open, the `keydown` event listener unconditionally executes `closeM()`.
3. `closeM()` removes the `open` class from the primary `#modal` (which isn't open) and then unconditionally removes the `modal-open` class from `document.body`, unfreezing the background scroll.
4. The Escape listener never calls `closeAlertForm()`, `closeNoteForm()`, or `closeMobSheet()`. Thus, the secondary modal's visual elements (`#alertSheet`, etc.) keep their `open` class and remain visible on the screen.
5. The result is a state desynchronization: the secondary modal is visibly open, but the background is scrollable. Additionally, pressing Escape when no modals are open unconditionally triggers the scroll restoration logic, potentially causing unnecessary jumps to a stale `dataset.scrollY` value.

# Caveats
This analysis focuses on the specific modals that modify the `modal-open` class (`#modal`, `#alertSheet`, `#noteSheet`, `#mobSheet`). Other floating panels or wrappers (like `#addProjWrap`, `#invWrap`, `#fabMenu`, `#notesBoardWrap`, `#pActionSheet`) do not freeze the background scroll, but the orchestrator may still want to ensure they are also closed when Escape is pressed for a consistent user experience.

# Conclusion
The bug is caused by the global Escape key handler unconditionally calling `closeM()` without calling the close functions for secondary modals. Because `closeM()` explicitly unfreezes the background scroll, it causes the desync when secondary modals are still visually open.

**Recommended Fix Strategy:**
1. **Conditional Modal Closure:** Update the Escape key listener (line 3893) to check which specific modal is open and call only its respective close function, rather than unconditionally calling `closeM()`.
   ```javascript
   if(e.key === 'Escape'){
     if ($('#modal') && $('#modal').classList.contains('open')) closeM();
     if ($('#alertSheet') && $('#alertSheet').classList.contains('open')) closeAlertForm();
     if ($('#noteSheet') && $('#noteSheet').classList.contains('open')) closeNoteForm();
     if ($('#mobSheet') && $('#mobSheet').classList.contains('open')) closeMobSheet();
     
     // Continue with other unconditionally safe UI closings
     closeCatMgr();
     $('#cfWrap').classList.remove('open');
     $('#wdgPanel').classList.remove('open');
     $('#wkToggle').classList.remove('open');
     $('.main').classList.remove('wdg-open');
     return;
   }
   ```
2. **Safe Scroll Restoration (Optional but recommended):** Update `closeM()`, `closeAlertForm()`, `closeNoteForm()`, and `closeMobSheet()` so their scroll restoration logic is wrapped in `if(document.body.classList.contains('modal-open')) { ... }`. This guarantees they are idempotent and won't cause layout jumps if called when the scroll is already unfrozen.

# Verification Method
1. Open `index.html` in a browser.
2. Open the Alert Form (e.g., via the FAB menu `openAlertForm()`).
3. Press the `Escape` key.
4. Without the fix, the Alert Form will stay open but the background will become scrollable.
5. With the fix, the Alert Form will correctly close and the background scroll state will remain properly synchronized.
