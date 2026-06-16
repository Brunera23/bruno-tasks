## 2026-06-05T22:34:25-03:00
Your working directory is c:\Users\Bruno\Desktop\activities tracker\.agents\auditor_m2_tier1_f1_gen2.
Your task: Perform integrity verification on the work product in `tests/e2e/tier1-feature/f1-task-management.spec.ts`.
The worker implemented E2E tests for Feature 1 (Task Management).
1. Check for integrity violations: hardcoded results, mocked functions that shouldn't be mocked (though mocking Firebase auth API is ACCEPTABLE and RECOMMENDED to avoid third-party popup flakiness), bypassing logic (e.g. bypassing login screen with display:none), bypassing UI constraints (e.g. evaluating clicks `evaluate(b => b.click())` instead of Playwright's native `click()`).
2. Run your forensic checks to ensure the tests are genuine and evaluate the actual application behavior.
3. Write your verdict. If you find cheating or integrity violations, report INTEGRITY VIOLATION or CHEATING DETECTED. Otherwise, CLEAN.
4. Write your full evidence report to `handoff.md` and send a message to me with the verdict and a summary.
