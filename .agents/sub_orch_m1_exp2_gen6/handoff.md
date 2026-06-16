# Investigation Report: `_itemClickTimeout` State Leaks

## 1. Observation
In `index.html`, inside the `#list` click listener (line 3839), the interaction logic for `.item-body` is as follows:
```javascript
const b=e.target.closest('.item-body');
if(b){
  if(window.getSelection().toString().length>0)return; // Early return bypass
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
        clearTimeout(_itemClickTimeout) // Fails to open modal and bypassed by selection
      }
      return
    }
  }
}
```

## 2. Logic Chain
1. **Timeout Leak**: When `e.detail === 1`, `_itemClickTimeout` is set. If the user quickly clicks a different task, the code runs again for the new task, overwriting the global `_itemClickTimeout` variable *without clearing the previous timeout*. This causes both tasks' `edit(id)` calls to trigger.
2. **Empty Space Double-Click Swallowed**: When a user double-clicks empty space, no text is selected. The `e.detail === 2` block executes, successfully clearing the timeout, but it doesn't call `edit(id)`. This swallows the action, giving the user no response.
3. **Early Return Bypass**: When a user double-clicks text, the browser selects the text *before* the click event with `detail === 2` fires. The code hits `if(window.getSelection().toString().length>0)return;` and stops execution. Thus, `clearTimeout(_itemClickTimeout)` is completely bypassed, and the 250ms timeout for the first click will still fire (although it might not trigger `edit(id)` if the text remains selected).

## 3. Caveats
- This fix assumes all interactions are isolated to the `.item-body` click block. If a user clicks an item body and then within 250ms clicks an entirely different interactive element (e.g., `.tag-time`), the timeout for the item body will not be cleared. However, this is the pre-existing behavior and fixing it globally in `#list` could introduce unintended side effects. The localized fix below perfectly resolves the three reported leaks.

## 4. Conclusion
The most robust strategy is a localized refactoring within the `.item-body` block:
1. Move `clearTimeout(_itemClickTimeout)` to the top of the block, so *any* valid click on an item body clears the pending timeout from a previous click.
2. Keep the early return `if(window.getSelection().toString().length>0)return;` but place it *after* the timeout clearing logic.
3. Change the `else if(e.detail===2)` block to simply call `edit(id)`, since the early return has already verified no text was selected.

Proposed change to the `.item-body` block:
```javascript
const b=e.target.closest('.item-body');
if(b){
  if(_itemClickTimeout){
    clearTimeout(_itemClickTimeout);
    _itemClickTimeout=null;
  }
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
        edit(id)
      }
      return
    }
  }
}
```

## 5. Verification Method
- **Timeout Leak**: Click Task A, then immediately click Task B. Only Task B's modal should open.
- **Empty Space Double-Click**: Double-click empty space in a task row. The modal should open instantly (without waiting 250ms).
- **Text Double-Click**: Double-click text in a task row. The text should be selected, the modal should *not* open, and the timeout should be cleanly cancelled.
