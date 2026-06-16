## 1. Observation
In `index.html` (line 3839), the click handler for `#list` has the following logic for task rows (`.item-body`):
```javascript
  const b=e.target.closest('.item-body');
  if(b){
    if(window.getSelection().toString().length>0)return;
    const item=b.closest('.item');
    if(item){
      const id=item.querySelector('.ck')?.dataset.id;
      if(id){
        e.stopPropagation();
        if(e.detail===1){
          _itemClickTimeout=setTimeout(()=>{
            if(window.getSelection().toString().length===0)edit(id)
          },250)
        }else if(e.detail===2){
          clearTimeout(_itemClickTimeout)
        }
        return
      }
    }
  }
```
Global variable `let _itemClickTimeout=null;` is defined on line 3838.

## 2. Logic Chain
The implementation of the 250ms delay correctly prevents the edit modal from opening immediately on the first click of a double-click, which resolves the original regression (allowing text selection). However, it introduces three new issues:
1. **Unresponsiveness on double-clicking empty space**: If a user double-clicks an empty area within `.item-body` (e.g., margins/padding where no text is selectable), the second click triggers `e.detail === 2`. The timeout is cleared, but `edit(id)` is never called. This breaks expected behavior, as double-clicking a task now completely swallows the action rather than opening the modal.
2. **Timeout Leaks on Rapid Clicks**: The `_itemClickTimeout` is overwritten without being cleared when `e.detail === 1`. If a user rapidly clicks on different tasks within 250ms (or moves the mouse slightly so `e.detail` resets to 1 on the same task), multiple timeouts are queued up. This causes multiple edit modals to open sequentially, overwriting each other in a glitchy manner.
3. **Pending Timeout on Text Selection**: When the user double-clicks to select text, `window.getSelection().toString().length > 0` returns `true` on the second click, causing the function to return early. Consequently, `clearTimeout(_itemClickTimeout)` is *not* called. Although the timeout callback has a safeguard (`if(window.getSelection().toString().length===0)`), if the user clears the text selection (e.g., pressing Escape) before the 250ms timeout expires, the modal will unexpectedly open.

## 3. Caveats
- A 250ms delay on all single clicks makes the UI feel slightly sluggish compared to an instant click response. This is an inherent tradeoff of this specific approach.
- The third issue (clearing selection before 250ms) is an edge case, but proper timeout management is best practice.

## 4. Conclusion
**Verdict: REQUEST_CHANGES**
The fix successfully allows text selection but introduces significant robustness and UX issues. The logic must be updated to:
- Clear `_itemClickTimeout` at the start of `e.detail === 1`.
- Clear `_itemClickTimeout` and return if text is already selected before checking `e.detail`.
- Call `edit(id)` inside the `e.detail === 2` block so that double-clicking non-text areas still opens the task.

## 5. Verification Method
- Double click the empty space of a task row: the modal should open immediately.
- Quickly click Task A then Task B: only Task B's modal should open.
- Select text by double-clicking: text should select, and no modal should open.
