## 1. Observation
The recent fix implemented in `index.html` (lines 3838-3839) introduces a global timeout variable `let _itemClickTimeout=null;` and handles clicks on `.item-body`:
```javascript
if(e.detail===1){
  _itemClickTimeout=setTimeout(()=>{
    if(window.getSelection().toString().length===0)edit(id)
  },250)
}else if(e.detail===2){
  clearTimeout(_itemClickTimeout)
}
```
However, the code does not call `clearTimeout(_itemClickTimeout)` before assigning a new timeout on `e.detail === 1`. Additionally, early returns in the delegated click listener (e.g., `const acts=e.target.closest('.item-acts');if(acts)return;`) do not clear the timeout.

## 2. Logic Chain
1. **Scenario A (Rapid task switching):** If a user clicks Task A, `e.detail` is 1, and `_itemClickTimeout` receives a timeout ID (`T1`). If the user clicks Task B within 250ms, `e.detail` is 1 again (since it's a different screen location). `_itemClickTimeout` is overwritten with `T2`. Because `T1` was never cleared, BOTH timeouts execute, opening Task A's modal and then Task B's modal.
2. **Scenario B (Conflicting actions):** If a user clicks Task A's body (starting `T1`), and quickly clicks Task A's Delete button (`.item-acts`), the click listener hits `if(acts)return;`. It bypasses the double-click logic and fails to clear `T1`. The Delete confirmation dialog opens, and shortly after, `T1` executes, opening the Edit modal on top of it.
3. **Double-click selection:** The double-click text selection works correctly as designed, because the second click on the same element triggers `e.detail === 2`, which properly clears the timeout.

## 3. Caveats
- I was not able to run automated puppeteer UI scripts because execution required user approval which timed out. However, static analysis of the DOM event logic confidently predicts these state leaks.
- 250ms is relatively short. Some users with slower double-click speeds might experience the modal opening before their second click lands. 

## 4. Conclusion
**FAIL.** While the fix successfully restores double-click text selection, it introduces a critical timeout leak that breaks the UI when users interact rapidly with different elements. The global timeout must be cleared unconditionally before setting a new one, and should ideally be cleared when clicking actionable items (like checkboxes or delete buttons).

## 5. Verification Method
To manually verify these failure modes:
1. **Rapid Switch**: Click the text of Task A, then immediately click the text of Task B. You will see Task A's modal flash before Task B's modal overrides it.
2. **Action Conflict**: Click the text of a task, then quickly click its Trash (delete) icon. The delete confirmation dialog will appear, but the Edit modal will inappropriately open over it a fraction of a second later.
