# Challenge Summary

**Overall risk assessment**: MEDIUM

## Challenges

### [Medium] Challenge 1: Unverified Exclusive Tab Activation

- **Assumption challenged**: The test correctly ensures that only one tab is active at a time.
- **Attack scenario**: A bug is introduced where clicking a tab adds the `.active` class but fails to remove it from previously active tabs.
- **Blast radius**: The `Desktop View Navigation` and `Mobile View Switching` tests will PASS despite multiple tabs being visually active simultaneously, leading to confusing UI states in production.
- **Mitigation**: Add checks to explicitly assert that non-selected tabs do not have the `.active` class. For example: `await expect(dashNav).not.toHaveClass(/active/);` when `medNav` is clicked.

### [Medium] Challenge 2: Incomplete Responsive State Validation

- **Assumption challenged**: The `Responsive Adaptability` test verifies the full UI state is preserved across viewport resizes.
- **Attack scenario**: The active state of the mobile tab could be lost when resizing from desktop back to mobile.
- **Blast radius**: The test switches to mobile (tasks tab selected), resizes to desktop (verifies tasks desktop nav is active), then resizes back to mobile, but *never verifies* if the mobile tasks tab `.mob-tab[data-view="tasks"]` remains active. It only verifies the view visibility.
- **Mitigation**: Add `await expect(page.locator('.mob-tab[data-view="tasks"]')).toHaveClass(/active/);` at the end of the `Responsive Adaptability` test.

## Stress Test Results

- **Scenario 1**: Injected a bug where all tabs receive `.active` on click.
  - Expected: Test fails.
  - Actual: `Desktop View Navigation` and `Mobile View Switching` PASSED.
  - Result: FAIL (Test suite is flawed).
- **Scenario 2**: Injected a bug where `#dashView` remains visible when switching to `#medView`.
  - Expected: Test fails.
  - Actual: Test correctly FAILED because it explicitly asserts `await expect(dashView).not.toBeVisible();`.
  - Result: PASS (View visibility assertions are robust).
