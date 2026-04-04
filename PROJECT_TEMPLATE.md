# HubCloud Report Project Template

## Purpose
This repository now acts as a reusable technical template for:
- report visual style,
- safe HubCloud-compatible implementation patterns,
- standardized local validation and transfer workflow.

## Mandatory Governance
- Before changing report datasource logic, parameter mapping, or template structure, read `COLLABORATION_PROTOCOL.md`.
- `COLLABORATION_PROTOCOL.md` contains the mandatory working rules for synchronization, parameterization, validation, and transfer.

## Canonical File Roles
- `index.html`: markup for HubCloud `HTML` tab.
- `hc-report.css`: styles for HubCloud `Styles` tab.
- `script.js`: logic for HubCloud `Scripts` tab.
- `sandbox.html`: local harness for parity testing.
- `mock-data.json`: local data source for fast iteration.

## Standard Period Control
The default skeleton for new reports should include the standard period picker.

The standard picker UI contains:
- period navigation arrows,
- a dropdown with modes:
  - `День`
  - `Месяц`
  - `Квартал`
  - `Год`
  - `Произвольный`
  - `Без ограничения`
- custom range inputs with `OK` for `Произвольный`.

The base starter files should assume this control by default:
- `templates/base/index.html`
- `templates/base/hc-report.css`
- `core/script.core.js`

When a new report is created in `Skeleton Build Mode`, the agent should start from this standard period control unless the user explicitly asks for another date-selection model.

Expected runtime contract for the standard period picker:
- state:
  - `periodMode`
  - `periodAnchor`
  - `customDateStart`
  - `customDateFinish`
  - `showPeriodMenu`
- computed/display:
  - `periodDisplayLabel`
  - `canShiftPeriod`
- methods:
  - `togglePeriodMenu()`
  - `selectPeriodMode()`
  - `applyCustomPeriod()`
  - `shiftPeriod()`
  - `getPeriodRange()`
  - `formatPeriodLabel()`
  - `buildDatasourceTokenMap()`

Reusable helper functions for this control should live in:
- `core/script.core.js`

Expected shared helper API:
- `getStandardPeriodModes()`
- `buildStandardPeriodState()`
- `getPeriodRange()`
- `formatPeriodLabel()`
- `canShiftPeriod()`
- `shiftPeriodState()`
- `formatDateLabel()`

Behavior contract:
- arrows shift the active period;
- `Произвольный` uses explicit start/end dates;
- `Без ограничения` must disable period narrowing in datasource logic;
- the same period behavior should be preserved in sandbox and in HubCloud.

## Wide Table Layout Rule
- For wide matrix or pivot reports, do not reduce visual width through `scale`, `zoom`, or similar transform tricks as the primary solution.
- First build page layout through normal containers and columns:
  - page container with controlled max width,
  - left content column for the table area,
  - right column for filters/settings.
- The table must live inside the left content column, and page width must be controlled by layout before aggressive table compression is attempted.
- For reliable scrolling, use a dedicated table viewport container:
  - outer scroll container with `overflow: auto`,
  - inner width-holder with `min-width: max-content`,
  - table with `width: max-content` and `min-width: 100%`.
- This pattern should be preferred over mixing multiple competing scroll containers.
- Only after container/column layout is correct may the agent tune:
  - sticky first column width,
  - data column widths,
  - font size,
  - cell padding,
  - header wrapping.
- Prefer real layout control over visual scaling.

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
- compatibility docs,
- transfer manifest.

## Transfer Mapping (Always)
- `index.html` -> `HTML`
- `hc-report.css` -> `Styles`
- `script.js` -> `Scripts`
