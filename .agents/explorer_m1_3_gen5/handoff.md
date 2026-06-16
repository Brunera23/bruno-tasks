# Observation
The `#list` event listener in `index.html` intercepts clicks to `.item-body`.
In Iteration 4, a fix was added to stop the edit modal from opening when text is selected:
`if(window.getSelection().toString().length > 0) return;`
This breaks native double-click text selection. Why? Because when a user double-clicks, the browser fires two separate `click` events (with `e.detail = 1` and `e.detail = 2`). The first click fires BEFORE the text is actually selected by the browser. Because `getSelection()` is still empty during the first click, the modal opens immediately, hijacking the DOM/focus and interrupting the double-click text selection sequence.

# Logic Chain
1. A single click has `e.detail === 1`. A double click triggers a first click with `e.detail === 1` followed by a second click with `e.detail === 2`.
2. Native text selection on double-click happens precisely *after* the first click, during the second `mousedown`/`mouseup`.
3. If we intercept the first click and instantly open a modal, the second click lands on the modal, preventing the text selection.
4. To fix this, we must delay the opening of the modal on the first click by a short duration (e.g., 250ms).
5. If the user was double-clicking, the second click will occur within this delay. The browser will select the text natively.
6. When our delayed timeout finishes, it checks `window.getSelection().toString().length > 0`. If text was selected (because of the double click), it aborts opening the modal.
7. If the user just clicked once, the 250ms finishes, no text is selected, and `edit(id)` is successfully called.

# Caveats
- A 250ms delay introduces a slight, but standard, latency for single-click edit actions.
- Note: It appears another agent or process has recently modified `index.html` and temporarily stripped the `.item-body` click logic completely. The provided patch re-adds the missing `.item-body` logic with the new robust fix.

# Conclusion
We should update the `index.html` `#list` click listener to ignore clicks with `e.detail > 1` and wrap the `edit(id)` call in a 250ms `setTimeout` that re-checks the selection length. We also need to add Hypothesis 5 to `bug_fix_verification.spec.ts`.

# Verification Method
1. Double-click a word in a task title. The word should be selected and the modal MUST NOT open.
2. Single-click a task title (without selecting text). The modal should open after ~250ms.
3. Click and drag to select text. The modal MUST NOT open.
4. Run Playwright tests using `npx playwright test tests/e2e/bug_fix_verification.spec.ts`. Hypothesis 5 should pass.

---

### Proposed Fix for `index.html`

Append this inside the `$('#list').addEventListener('click', e => { ... })` block (around line 3833):

```javascript
    const acts = e.target.closest('.item-acts');
    if(acts) return;
    const b = e.target.closest('.item-body');
    if(b) {
      if(window.getSelection().toString().length > 0) return;
      if(e.detail > 1) return; // Ignore second click of a double click
      const item = b.closest('.item');
      if(item) {
        const id = item.querySelector('.ck')?.dataset.id;
        if(id) {
          e.stopPropagation();
          // Delay to allow native double-click text selection to occur
          setTimeout(() => {
            if(window.getSelection().toString().length > 0) return;
            edit(id);
          }, 250);
          return;
        }
      }
    }
```

### Proposed Fix for `tests/e2e/bug_fix_verification.spec.ts`

Add this test at the end of the file:

```typescript
  test('Hypothesis 5: Double-click text selection works without opening the modal', async ({ page }) => {
    // Setup a specific task
    await page.evaluate(() => {
        (window as any).tasks = [{
            id: 'dbl-task',
            title: 'DoubleClickTestWord',
            status: 'todo'
        }];
        (window as any).render();
        const titles = document.querySelectorAll('.item-title');
        if (titles.length > 0) {
            titles[0].id = 'dbl-title';
        }
    });

    let editCalled = false;
    await page.exposeFunction('markEditCalledDbl', (id: string) => {
        editCalled = true;
    });

    await page.evaluate(() => {
        const originalEdit = (window as any).edit;
        (window as any).edit = (id: any) => {
            (window as any).markEditCalledDbl(id);
            // Don't actually open to avoid side effects in test
        };
    });

    // Perform a double click on the item-title
    await page.locator('#dbl-title').dblclick();

    // Wait 350ms to allow any timeouts to resolve (our fix uses 250ms)
    await page.waitForTimeout(350);

    // Get the selected text to ensure it was natively selected
    const selectedText = await page.evaluate(() => window.getSelection()?.toString() || '');
    
    // Playwright's dblclick should select the word natively
    expect(selectedText).toContain('DoubleClickTestWord');
    expect(editCalled).toBe(false);
  });
```
