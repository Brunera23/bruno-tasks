Investigate how to implement 5 Playwright test cases covering Feature 2 (Modal & UI State Resilience) for Tier 1.
Context:
Working Directory: c:\Users\Bruno\Desktop\activities tracker
Scope Document: c:\Users\Bruno\Desktop\activities tracker\.agents\sub_orch_m2_tier1\SCOPE.md
File to create: tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts

Test requirements for Modal & UI State Resilience (5 cases):
1. Open a task modal, click the close button, verify modal closes.
2. Open a task modal, click outside the modal (backdrop), verify modal closes.
3. Open a task modal, press Escape key, verify modal closes.
4. Open a task modal, close it, and open the same task modal again (regression test for R1).
5. Open a task modal, close it, and open a different task modal.

Your task:
1. Analyze the frontend code (e.g., `index.html`, `script.js` in the project root) to identify the correct Playwright locators for these actions (e.g., task items, modal container, close button, backdrop).
2. Deliver a structured handoff report with your recommended locators and strategy for implementing the 5 tests. Do NOT implement the tests yourself.
