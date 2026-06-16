# Handoff Report

## Observation
1. The `#form` submit handler at line 3830 contains `if(isSubmittingTask)return; isSubmittingTask=true;` but the `#alertForm` (line 3457) and `#noteForm` (line 3499) submit handlers lack similar state variables to prevent multiple parallel submissions.
2. The `openNoteForm` method originally attempted to reset duration using `pickVal($('#nDur'), '3')`. However, the underlying UI has transitioned to chip-based selection (`#nDurChips`). Although this seems to have been concurrent modified/partially fixed in the filesystem during analysis, the appropriate fix handles the chips toggle rather than looking for a select element.

## Logic Chain
- For Bug 1: Rapidly clicking the submit button on `#alertForm` or `#noteForm` will lead to multiple task creations because there is no boolean flag to block the submission while the event loop finishes saving data or resetting the modal. To resolve this, `isSubmittingAlert` and `isSubmittingNote` variables should be introduced, mimicking the logic applied to `#form`.
- For Bug 2: To prevent `openNoteForm()` from crashing, `pickVal($('#nDur'),'3');` must be removed and replaced with correct query selectors that manage the active states of `#nDurChips .time-chip` and `#nDurCustom` visibility.

## Caveats
- `index.html` was observed to have been modified concurrently during this analysis (lines changed and `openNoteForm` was partially updated), so the exact line numbers might differ slightly.
- The double submit locks must be reset when the respective modal is opened or if validation fails (e.g. empty messages).

## Conclusion
**Bug 1 Strategy:**
1. Declare `let isSubmittingAlert = false;` and `let isSubmittingNote = false;` near line 3174 (alongside `isSubmittingTask`).
2. Add `isSubmittingAlert = false;` in `openAlertForm()`.
3. Add `if(isSubmittingAlert) return; isSubmittingAlert = true;` inside `$('#alertForm').addEventListener('submit', ...)` right after `e.preventDefault()`. If `!msg`, reset `isSubmittingAlert = false`.
4. Add `isSubmittingNote = false;` in `openNoteForm()`.
5. Add `if(isSubmittingNote) return; isSubmittingNote = true;` inside `$('#noteForm').addEventListener('submit', ...)` right after `e.preventDefault()`. If `!msg`, reset `isSubmittingNote = false`.

**Bug 2 Strategy:**
Inside `openNoteForm()`, remove `pickVal($('#nDur'),'3');` and replace it with:
```javascript
$$('#nDurChips .time-chip').forEach(x=>x.classList.toggle('active',x.dataset.days==='3'));
$('#nDurCustom').style.display='none';
```
*(Note: If a peer agent has already implemented this change, verify and retain it).*

## Verification Method
Run the E2E tests via `npx playwright test tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts`. Specifically, test that rapid submissions on alert/note forms do not duplicate entries.
