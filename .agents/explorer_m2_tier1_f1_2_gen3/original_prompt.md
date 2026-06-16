# Original Prompt
Explore the application structure to recommend a testing strategy for Feature 1 (Task Management) that fixes previous failures.

In the previous iteration (Iteration 2), the Forensic Auditor passed (no cheating), but the implementation FAILED the Reviewer/Challenger gate due to flakiness.
Feedback:
1. "Parallel test execution across workers sharing the exact same `uid: 'mock123'` causes tests to overwrite each other's live Firestore data... Tests must use isolated UIDs (e.g. dynamically generated) or avoid parallel collisions."
2. "The Service Worker auto-reloading mechanism (`location.reload()`) destroys Playwright execution contexts and wipes out `beforeEach` mocks. Tests should block SW reloads or stub `location.reload`."
3. "Weak logic in Test 4 (`expect(taskHasCompleted || ckHasOn).toBeTruthy()`) allows false positives."
4. "Hardcoded task name in creation test. Loose matching using `hasText` without `exact: true` in the update test."

Your task:
1. Address the feedback. Figure out how to cleanly stub `location.reload` or unregister service workers during tests.
2. Recommend how to inject unique Firebase auth UIDs per test.
3. Tighten the assertions (e.g. check for BOTH `.completed` and `.on` instead of OR, use `exact: true`, generate dynamic names).
4. Provide the 5 proposed Playwright test cases and steps.
5. Write your findings to handoff.md in your working directory and send me a message when done.
