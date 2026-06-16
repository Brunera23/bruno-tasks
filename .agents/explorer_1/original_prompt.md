## 2026-06-05T22:26:29-03:00
We are in Iteration 2 for Feature 6 (Widget Panel Rendering) Tier 1 Playwright tests. The previous iteration failed with the following feedback:
- The tests did NOT authentically interact with the DOM. Bypassing the login process by injecting CSS and manually calling window.render() is unacceptable. You must find an authentic way to handle login in Playwright tests (e.g. using authentic login flow or standard test state).
- Tests used brittle hardcoded timeouts (waitForTimeout) instead of reactive web-first waiting.
- The Drag and Drop test was too flaky and failed. Do NOT use a Drag and Drop test.

Task:
1. Investigate the codebase (e.g. index.html, JS files) to design a robust test setup strategy that handles the login screen authentically without CSS injection.
2. Design exactly 5 Tier 1 test cases covering "Feature 6: Widget Panel Rendering" (e.g. Toggle Panel, Expand/Collapse, Filtering, etc.). Exclude Drag and Drop.
3. Your final output must be a handoff.md detailing the 5 test case strategies and the proper setup strategy.

Workspace: c:\Users\Bruno\Desktop\activities tracker
Do NOT implement the tests yourself. Deliver the plan in handoff.md in your working directory.
