# Workflow

## Standard Flow
1. Create report workspace from template.
2. Fill `REPORT_SPEC.md`.
3. Build mock-data version first.
4. Validate sandbox rendering.
5. Adapt or implement datasource logic.
6. If needed, start with fixed ids.
7. Add catalog-backed filters (`title -> id`).
8. Run validation.
9. Transfer to HubCloud tabs.
10. Validate in HubCloud.
11. Commit only with explicit approval.

## Report Contract
Each report should keep:
- `index.html` for HubCloud `HTML`
- `hc-report.css` for HubCloud `Styles`
- `script.js` for HubCloud `Scripts`
- `REPORT_SPEC.md` for business/data contract

## Template Choice
- `base-report`
  - use for completely new report types
- `stock-and-turnover-report`
  - use for stock balance / turnover / warehouse reports
  - includes:
    - KPI row
    - stock table
    - right-side filter panel
    - catalog-backed `title -> id` filters
    - HubCloud datasource pattern

## Non-Negotiable Rules
- no `<style>` tags in `index.html`
- avoid `{{ ... }}`
- prefer plain tables over risky Vue table abstractions
- keep files UTF-8
- keep sandbox and HubCloud behavior aligned
- keep `index.html` and `script.js` in sync
- do not send filter titles into datasource when ids are expected

## Validation Stack
- `node ..\tools\hc-encoding-gate.js`
- `node --check script.js`
- `node ..\tools\hc-factory-lint.js reports/<report-name>`
- `node ..\tools\hc-transfer-check.js`
