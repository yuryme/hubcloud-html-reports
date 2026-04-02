# HubCloud Report Factory

Factory project for building, adapting, validating, and transferring HubCloud-compatible HTML reports.

## Purpose
- standardize report development,
- reuse a safe HubCloud-compatible architecture,
- reduce trial-and-error on each new report,
- evolve from simple workflow to more advanced agent orchestration.

## Current Strategy
We build the system iteratively:
1. simple template and process,
2. validation tools,
3. evaluator loop,
4. specialized agents,
5. orchestrator.

## First Iteration Scope
- reusable base report template,
- report spec file,
- datasource text file (`DS.txt`),
- scaffold tool for new reports,
- explicit workflow and commit rules,
- encoding gate before implementation starts.
- datasource integration pattern,
- title-to-id filter pattern,
- factory lint for report structure consistency.

## Commit Rule
Commit only after explicit user approval.

## Key Folders
- `docs/` - process and architecture notes
- `templates/base-report/` - minimal safe starting point
- `templates/stock-and-turnover-report/` - reusable template for reports like `Остатки и обороты`
- `tools/` - scaffolding and validation helpers

## Next Commands
Create a new report workspace with:

```powershell
node tools/create-report.js bakery-shift-report
```

Create a new report from the `Остатки и обороты` template:

```powershell
node tools/create-report.js warehouse-turnover stock-and-turnover-report
```

Run the encoding gate before editing:

```powershell
node ..\tools\hc-encoding-gate.js
```

Run the factory lint before transfer:

```powershell
node ..\tools\hc-factory-lint.js reports/sample-report
```
