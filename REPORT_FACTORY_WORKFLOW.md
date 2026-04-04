# Report Factory Workflow

## Purpose
This document defines the production workflow for creating a new HubCloud HTML report in this repository.

It is specifically for `Skeleton Build Mode`.
It describes how a new report is produced from:
- an image or screenshot,
- a textual description,
- or both together.

This is not a general collaboration document.
It is an operational workflow for report выпуск.

## Accepted Inputs
The user may start a new report from any of these inputs:
- image or screenshot of the desired report,
- textual description of the desired report,
- image plus textual description,
- filter requirements,
- current datasource placed in root `DS.txt`.

The user is not required to manually prepare files in `reports/<report-id>/`.

## User Input Contract
For a new report build, the user works from project root.

Expected user-side inputs:
- root `DS.txt` contains the current datasource for the new report,
- optional root `DS_FILTERS.txt` contains filter datasource expressions,
- screenshot and/or textual description define the target screen,
- user names required filters and columns when needed.

The user does **not** need to manually edit:
- `reports/<report-id>/DS.txt`,
- `reports/<report-id>/report.manifest.json`,
- `reports/<report-id>/report.default.json`,
- `reports/<report-id>/script.js`.

These are generated or assembled by the agent during report production.

## Mandatory Start Sequence For A New Report
When the user asks to create a new report:
1. Read `START_HERE.md`, `COLLABORATION_PROTOCOL.md`, and `PROJECT_TEMPLATE.md`.
2. Confirm that the task is `Skeleton Build Mode`.
3. Read `REPORT_FACTORY_WORKFLOW.md`.
4. Briefly restate:
   - the detected input type (`image`, `description`, or `image + description`),
   - which root files are the current source of truth,
   - which files will be created in `reports/<report-id>/`.
5. Wait for explicit user approval before creating files.

## Source Of Truth For New Report Production
For a newly created report, the source of truth is:
- visual structure -> image and/or textual description,
- datasource logic -> root `DS.txt`,
- optional filter datasource logic -> root `DS_FILTERS.txt`,
- project runtime rules -> root `script.js`, `core/script.core.js`,
- base layout starter -> `templates/base/index.html`,
- base style starter -> `templates/base/hc-report.css`.

## Output Location
A new report must be created as a separate report package in:
- `reports/<report-id>/`

The folder must contain its own independent working files.

## Required Files In reports/<report-id>/
For a new report, create:
- `index.html`
- `hc-report.css`
- `report.manifest.json`
- `report.default.json`
- `DS.txt`
- `mock-data.json`
- `sandbox.html`
- `script.js`

## How The Files Are Produced

### 1. index.html
Create from:
- `templates/base/index.html`
- adjusted to the requested screen structure from image and/or description

Allowed changes:
- title block,
- toolbar structure,
- date controls,
- filter panel structure,
- table section,
- action buttons.

Default rule for new reports:
- use the standard period picker from the base template unless the user explicitly requests another date control;
- the standard picker includes:
  - `День`
  - `Месяц`
  - `Квартал`
  - `Год`
  - `Произвольный`
  - `Без ограничения`
- left and right arrows must shift the current period;
- `Произвольный` must provide two dates and an explicit `OK` action.
- shared period helper logic should be taken from `core/script.core.js`, not re-invented from scratch for each report.

### 2. hc-report.css
Create from:
- `templates/base/hc-report.css`
- adjusted to the requested report look

Allowed changes:
- spacing,
- layout density,
- table widths,
- filter panel layout,
- visual alignment to image or description.

Special rule for wide matrix/pivot reports:
- do not start by shrinking the table with `scale`, `zoom`, or similar visual transforms;
- first define page layout with a controlled container and explicit columns:
  - left table/content area,
  - right filter/settings area;
- use the standard scroll pattern for wide tables:
  - one table viewport container with `overflow: auto`,
  - one inner width-holder with `min-width: max-content`,
  - one table with `width: max-content` and `min-width: 100%`;
- only after the page grid is correct may the agent compress the table itself through widths, typography, and wrapping.

### 3. report.manifest.json
Create as the report-specific configuration.

It must define:
- `reportId`
- `reportTitle`
- `dsFile`
- `mockDataFile`
- `templateHint`
- `filters`
- `columns`
- `rowMap`

### 4. report.default.json
Create as the local/default fallback configuration for the report.

It must include:
- title,
- filters,
- columns,
- rowMap,
- embedded fallback datasource expression copied from the current root `DS.txt`.

If the report uses the standard period picker, the report configuration must be compatible with these runtime fields:
- `periodMode`
- `periodAnchor`
- `customDateStart`
- `customDateFinish`
- `showPeriodMenu`

And these runtime methods:
- `formatPeriodLabel()`
- `getPeriodRange()`
- `shiftPeriod()`
- `selectPeriodMode()`
- `applyCustomPeriod()`
- `buildDatasourceTokenMap()`

### 5. DS.txt
Create by copying the current root `DS.txt`.

This file is a frozen report-local copy of the datasource used for that report release.

Rule:
- root `DS.txt` is the user input source,
- `reports/<report-id>/DS.txt` is the report release copy.

### 6. mock-data.json
Create mock data for sandbox verification.

It must reflect:
- current filters,
- visible columns,
- enough rows to test rendering and filter behavior.

### 7. sandbox.html
Create a local harness for the report package.

It must load:
- local `index.html`,
- local `hc-report.css`,
- local `report.default.json`,
- local `report.manifest.json`,
- local `DS.txt`,
- shared `core/script.core.js`,
- local `script.js`.

### 8. script.js
Create as the HC-ready script artifact for that report.

It may be produced from current root `script.js`, but after assembly it must be independent for that report package.

It must contain:
- report-local embedded fallback config,
- report-local fallback datasource expression,
- compatibility with the report-local `manifest/default` files.

For reports with the standard period picker, `script.js` must also:
- support all standard period modes,
- convert the selected mode into datasource period boundaries,
- remove or neutralize period filtering for `Без ограничения`,
- keep the same period behavior in sandbox and in HubCloud runtime.

## Sandbox Verification
Before declaring the new report ready:
1. Open `reports/<report-id>/sandbox.html?mode=mock`
2. Verify:
   - title is correct,
   - filters render,
   - rows render,
   - `Отчет` works,
   - filter changes affect rows in mock mode,
   - layout roughly matches the requested image or description.

## HC-Ready Definition
A new report is HC-ready only when all three report-local files exist:
- `reports/<report-id>/index.html`
- `reports/<report-id>/hc-report.css`
- `reports/<report-id>/script.js`

Only after that may the user transfer three files into HubCloud tabs.

## Handoff Format
For every newly produced report, the handoff must explicitly state:
- report folder path,
- sandbox URL,
- exact three files to copy to HubCloud,
- whether commit was made,
- whether push was made,
- whether root `DS.txt` was left untouched or intentionally updated by the user.

## What Not To Do
- Do not ask the user to manually populate `reports/<report-id>/DS.txt`.
- Do not require the user to manually create `manifest/default` files.
- Do not build a new report by modifying the previous report in place.
- Do not treat root `DS.txt` as the release artifact.
- Do not claim HC readiness until the report-local `script.js` exists.

## Minimal Success Condition
The workflow is considered successful when:
- a new report package appears in `reports/<report-id>/`,
- its own sandbox works,
- its own `script.js` exists,
- the user can copy exactly three report-local files into HubCloud and launch the report successfully.
