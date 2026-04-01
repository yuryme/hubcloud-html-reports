# Collaboration Protocol

## Scope
This protocol defines how we work on HubCloud report updates in this repository.

## Work Format
1. Implement and test in sandbox first.
2. Run preflight checks.
3. Prepare HubCloud tab payloads (`HTML`, `Styles`, `Scripts`).
4. Transfer to HubCloud and validate.

## Commit Policy (Mandatory)
- Commits are allowed only after explicit user permission in the current dialogue turn.
- If explicit permission is absent, changes stay uncommitted.
- Explicit examples:
  - `закомить`
  - `commit`
  - `сделай коммит`
- Non-explicit feedback (for example, `ок`, `продолжаем`, `норм`) is not commit permission.

## HubCloud Tab Mapping
- `index.html` -> `HTML`
- `hc-report.css` -> `Styles`
- `script.js` -> `Scripts`

## Mandatory Local Checks
- `node --check script.js`
- `node tools/hubcloud-preflight.js`
- `node tools/hc-transfer-check.js`

## Delivery Note
Every handoff should explicitly mention:
- what files were changed,
- whether commit was made or not made,
- exact files to copy into HubCloud tabs.
