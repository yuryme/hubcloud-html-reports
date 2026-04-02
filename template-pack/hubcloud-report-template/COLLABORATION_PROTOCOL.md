# Collaboration Protocol

## Scope
This protocol defines how we work on HubCloud report updates in this repository.

## Work Format
1. Run encoding gate first.
2. Implement and test in sandbox.
3. Run preflight checks.
4. Prepare HubCloud tab payloads (`HTML`, `Styles`, `Scripts`).
5. Transfer to HubCloud and validate.

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
- Upload order (mandatory): `Scripts` -> `HTML` -> `Styles` -> `Ctrl+F5`.

## Mandatory Local Checks
- `node tools/hc-encoding-gate.js`
- `node --check script.js`
- `node tools/hubcloud-preflight.js`
- `node tools/hc-transfer-check.js`

## Safe Editing Rule
- Do not create or rewrite Russian-text files through shell-dependent encoding paths.
- Prefer `apply_patch` or UTF-8 writes in Node tools.
- HubCloud DS rule (mandatory): the final executable query block must NOT end with `;`.
- `;` is allowed only for intermediate temp-table definitions (`... as ИмяТаблицы;`).

## Delivery Note
Every handoff should explicitly mention:
- what files were changed,
- whether commit was made or not made,
- exact files to copy into HubCloud tabs.
