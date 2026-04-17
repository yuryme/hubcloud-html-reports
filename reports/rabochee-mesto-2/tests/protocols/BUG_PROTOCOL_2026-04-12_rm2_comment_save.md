# QA Protocol - RM2 Comment Save in Mock Mode

Date: 2026-04-12
Report: `rabochee-mesto-2`
Scope: Enter-save flow for director comments (expenses + KPI) in `mode=mock`

## ITEM-001: Clarification Required for Save Behavior in Mock
- Type: Behavioral gap / environment contract mismatch
- Severity: Medium (for local QA process)
- Priority: High
- Status: Resolved

### Environment
- URL: `http://127.0.0.1:8000/reports/rabochee-mesto-2/sandbox.html?mode=mock`
- Browser: Edge (headless via Playwright)
- Test: `tests/e2e/rm2-comment-save.spec.mjs`

### Preconditions
- Report opened in sandbox with `mode=mock`.
- Rows visible in expenses and KPI tabs.

### Reproduction Steps
1. Open expenses tab (`По документам`).
2. Edit `коммент_директор` in first row and press `Enter`.
3. Switch to KPI tab (`По КП`).
4. Edit first KPI comment and press `Enter`.

### Observed Result
- Runtime error appears:
  - `ReferenceError: $ is not defined`
  - stack points to `sendRequest` -> `$.ajax` in `script.js`.
- No request is sent in sandbox for both save paths.

### Important Context
- Sandbox runs in `mode=mock` and is not connected to real data/process backend.
- Therefore, strict expectation “request must be sent” may be invalid for this mode.

### Expected Result (Needs Product/Dev Decision)
Choose one explicit contract for `mode=mock`:
1. Save is disabled in mock UI (recommended for clarity).
2. Save is allowed but handled safely as mock no-op (no backend call, no runtime error).
3. Save still sends request to mocked endpoint, but without dependency failures.

### Decision
- Selected contract: **Option 2**.
- In `mode=mock`, save actions remain available in UI and execute as deterministic mock no-op.
- No backend call is required in mock mode.

### Root Cause
- Save path currently relies on jQuery (`$.ajax`), but sandbox runtime does not provide `$`.

### Impact
- Local QA cannot reliably verify Enter-save scenario semantics in mock.
- Test outcomes are ambiguous (bug vs expected behavior) until contract is defined.

### Proposed Developer Actions
Option A (recommended): disable save controls in `mode=mock` with clear UX hint.
- Prevent Enter/click save actions from triggering network code.
- Show info toast like “Сохранение недоступно в mock-режиме”.

Option B: keep save actions enabled in mock, but avoid jQuery hard dependency.
- Implement transport via `fetch` or guarded adapter.
- In mock mode, route to stub/no-op response without runtime errors.

### Implemented Fix
- Save transport was guarded for mock runtime in `script.js` (`sendRequest`).
- If URL contains `mode=mock`, function returns a resolved mock response (`{ isOK: true }`) and does not call `$.ajax`.
- This removes dependency on missing jQuery in sandbox and prevents runtime crash.

### Files Changed
- `reports/rabochee-mesto-2/script.js`

### Retest Guide (for QA)
1. Open `http://127.0.0.1:8000/reports/rabochee-mesto-2/sandbox.html?mode=mock`.
2. In tab `По документам`, edit first `коммент_директор`, press `Enter` or click `✓`.
3. In tab `По КП`, edit first `Комментарий директора`, press `Enter` or click `✓`.
4. Confirm:
- No browser runtime error (`$ is not defined`) appears.
- UI remains responsive after save.
- Success toast appears for save actions.

### Result
- Item resolved under selected mock contract (Option 2).

### QA Validation Criteria After Decision
- Re-run: `node .\tests\e2e\rm2-comment-save.spec.mjs`
- If Option A:
  - No runtime errors,
  - save UI disabled or guarded,
  - deterministic info feedback.
- If Option B:
  - No runtime errors,
  - deterministic behavior per chosen mock contract,
  - payload/flow checks aligned with decided mode.

## Notes
- Per process, no changes were made to `index.html`, `script.js`, `hc-report.css`, `mock-data.json` while documenting this item.
