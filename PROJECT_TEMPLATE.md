# HubCloud Report Project Template

## Purpose
This repository now acts as a reusable template for:
- report visual style,
- safe HubCloud-compatible implementation patterns,
- standardized change workflow.

## Canonical File Roles
- `index.html`: markup for HubCloud `HTML` tab.
- `hc-report.css`: styles for HubCloud `Styles` tab.
- `script.js`: logic for HubCloud `Scripts` tab.
- `sandbox.html`: local harness for parity testing.
- `mock-data.json`: local data source for fast iteration.

## Technology Of Changes (Standard Process)
1. Implement changes locally in the canonical files.
2. Run checks:
   - `node --check script.js`
   - `node tools/hubcloud-preflight.js`
   - `node tools/hc-transfer-check.js`
3. Validate in sandbox.
4. Transfer to HubCloud tabs (`HTML`/`Styles`/`Scripts`).
5. Commit only with explicit user approval.

## Template Build Tool
Use:
```powershell
node tools/hc-build-template.js
```

This creates a ready-to-copy template package in:
- `template-pack/hubcloud-report-template/`

Package includes:
- canonical HC files,
- workflow docs,
- compatibility docs,
- transfer manifest.

## Transfer Mapping (Always)
- `index.html` -> `HTML`
- `hc-report.css` -> `Styles`
- `script.js` -> `Scripts`
