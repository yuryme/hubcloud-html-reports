# Codex Handoff: HtmlForms / Report Builder

## Project Goal

`HtmlForms` is used to build HTML reports that are later copied into HubCloud (HC). Historically, reports were assembled manually from a description: the user described the form, datasource, and behavior, then the export files for HC were created.

The current goal is to build a local report builder called `report-builder`. It describes a future report as JSON and generates a draft HC package:

- `index.html`
- `hc-report.css`
- `script.js`
- `report.schema.json`

Datasource query text is now considered part of the builder JSON schema. A separate `DS.txt` is no longer a required runtime artifact for the builder, although old report packages and reference reports may still use `DS.txt`.

The builder must run locally in the browser, outside HubCloud. It is a developer workspace for building the visual report structure, connecting mock or real HC sample data, checking filters/tables/cards, and then producing files to transfer into HC.

Current transfer workflow: HubCloud does not accept a ZIP/file upload for this use case. The user copies the generated file contents from the builder and pastes them directly into HubCloud pages/fields.

## Workspace

Current local workspace:

```text
C:\My_files\PYTHON\Environtments\HUBCLOUDPYTHON\HtmlForms
```

Main local builder page:

```text
http://127.0.0.1:8010/report-builder/index.html
```

Reference report for behavior and UI decisions:

```text
reports/rabochee-mesto-2
```

## Project Structure

Important root files and folders:

- `dev-server.js` - local dev server for the project.
- `start-report-builder.bat` - quick server startup on port `8010`.
- `report-builder/` - local report builder.
- `reports/rabochee-mesto-2/` - reference "Рабочее место руководителя" report, variant 2.
- `COLLABORATION_PROTOCOL.md` - collaboration rules.
- `LOCAL_DEV.md`, `START_HERE.md`, `REPORT_WORKFLOW.md`, `REPORT_FACTORY_WORKFLOW.md` - local development and report workflow docs.

Important files inside `report-builder/`:

- `index.html` - builder UI.
- `styles.css` - builder styles.
- `app.js` - current main editor/generator/preview/API logic.
- `README.md` - local builder concept.
- `schema/report.schema.example.json` - current example report schema.
- `schema/`, `editor/`, `generators/`, `preview/`, `validators/`, `export/` - future structure; most logic is still in `app.js`.

Important files inside `reports/rabochee-mesto-2/`:

- `index.html`
- `hc-report.css`
- `script.js`
- `DS.txt`
- `mock-data.json`
- `sandbox.html`
- `script.core.local.js`

This report is the behavior reference for HC/sandbox behavior.

## How To Run

Option 1, via batch file:

```bat
start-report-builder.bat
```

Builder URL:

```text
http://127.0.0.1:8010/report-builder/index.html
```

Option 2, manually from repo root:

```powershell
$env:PORT="8010"
node .\dev-server.js
```

If the port is busy:

```powershell
$env:PORT="8020"
node .\dev-server.js
```

Then open:

```text
http://127.0.0.1:8020/report-builder/index.html
```

## Checks

Minimal JavaScript and JSON check:

```powershell
node -e "const fs=require('fs'); new Function(fs.readFileSync('report-builder/app.js','utf8')); JSON.parse(fs.readFileSync('report-builder/schema/report.schema.example.json','utf8')); console.log('ok')"
```

Check Node:

```powershell
node -v
```

Current Node was upgraded through `winget install OpenJS.NodeJS.LTS` and the shell reports:

```text
v24.15.0
```

This restored the `browser-use` / `node_repl` workflow for in-app browser verification.

If the browser shows an old version, check the cache-bust in `report-builder/index.html`:

```html
<script src="./app.js?v=..."></script>
```

When changing `app.js`, update the `v=...` parameter so the browser does not reuse stale code.

## Current Builder Capabilities

The local builder MVP currently supports:

- loading `schema/report.schema.example.json`;
- editing basic report fields;
- JSON preview of the current schema;
- generating draft `index.html`, `hc-report.css`, `script.js`, `report.schema.json`;
- replacing the old `DS.txt` artifact tab with `report.schema.json`;
- copying the currently selected generated artifact to the clipboard for direct paste into HubCloud;
- live preview inside an iframe;
- opening the preview in a separate tab;
- embedded generated runtime preview iframe built from generated `index.html` + `hc-report.css` + `script.js` in mock mode;
- editing datasource query/runtime settings;
- editing datasource parameters (`name`, `placeholder`, `type`, `source`, `required`);
- supported data types include `string`, `integer`, `number`, `date`, `datetime`, and `boolean` where applicable. `integer` should be treated as numeric for aggregations/sums, but formatted and coerced without fractional digits;
- automatic test request body preview built from datasource parameters and token; `Body template` is no longer manually edited for each report;
- test POST request to HC API for sample data;
- manual API response paste area;
- saving API response as mock rows;
- generating `resultSchema` from real rows;
- auto-adding filters from data;
- auto-adding columns for the main table;
- filters editor;
- tabs editor;
- tables editor;
- columns editor with add/remove/move controls;
- `sortable` column property;
- sorting in preview;
- summary cards (`row-count`, `sum`);
- multiple tables and tab-to-table binding;
- preview filtering over mock data;
- enabling/disabling the period block through `schema.period.enabled`;
- generated period UI can visually switch day/month/quarter/year/custom range.
- generated `script.js` now loads datasources, renders table rows, updates datasource-driven filter options, handles client filters, handles datasource-parameter filters with reload, supports period UI, global sorting, table transforms, summary cards, CSV export for the active table, and active table title templates.
- For `group-by` table transforms, table columns must be synchronized to transform output fields: `transform.groupBy[*]` and each aggregation's `as || field`. If columns keep old/mismatched keys, preview can show the correct row count with blank cells. In the builder, columns for `group-by` tables are derived from the transform and should not be manually edited/deleted in the Columns editor; change the transform fields instead. Transform UI supports separate display titles through `transform.groupTitle` and `transform.aggregations[*].title`.
- Builder UI was simplified: app title is `Конструктор отчетов`; `Скачать схему` is now `Сохранить как`; `Перезагрузить пример`, visible `JSON preview`, and visible `Generated preview` were removed. Keep generator internals available, but do not reintroduce those UI blocks unless requested.
- Builder editor subsections are collapsible. The editor header has `Скрыть все` and `Показать все`; each subsection gets a `+`/`-` toggle. This is meant to reduce vertical scrolling during configuration.
- production `index.html` and `script.js` artifacts no longer embed mock/sample rows; only builder preview/generated preview can use mock rows.

The user copied the generated files into HubCloud and confirmed that the report worked without additional fixes on the first attempt. The next phase is cleanup of smaller UI/runtime issues.

## Architecture Decisions

### 1. JSON Schema As Generator Input

The future report is described by a JSON schema. The developer controls the schema, and the builder provides UI support for editing it and generating files.

Critical separation: the JSON schema is an input to the generator, not a runtime dependency of the generated report. Generated `script.js` must not know about `report.schema.json` and must not contain `var reportSchema = ...`. The generator must compile JSON into concrete code: datasource resolver functions, table maps, data loading, and rendering.

Important schema sections:

- `layout`
- `period`
- `actions`
- `tabs`
- `filters`
- `datasources`
- `tables`
- `summaryCards`
- `behavior`
- `mock`
- `lookups`

### 1.1. Datasource Model

Current builder datasource model:

- `schema.datasources` contains a set of datasources;
- each datasource may have `branches`;
- a branch with `when.else: true` is the fallback/default branch;
- a datasource may have one branch or multiple branches;
- a table selects its datasource through `table.source`;
- different tables can use different datasources and different queries;
- mock rows are scoped by datasource through `schema.mock.datasources.<id>.rows`;
- old `schema.mock.rows` remains a fallback.
- datasource parameters are the source of truth for test request body generation and runtime placeholder binding. Each parameter has `name`, `placeholder`, `source`, `type`, and `required`.
- supported parameter sources include `manual`, `period.start`, `period.finish`, and `filters.<filterKey>`.

For the order example, datasource `main` has two branches:

- `byOrder`: if `orderId > 0`, build the query by order number;
- `byPeriod`: otherwise build the query by period.

If a second datasource has only one branch, that is normal. It can be represented as a single `else` branch.

### 1.2. Current Generated `script.js`

The generator already emits concrete runtime code in `script.js` without embedding the JSON schema:

- `reportMeta`;
- datasource resolver functions, for example `resolve_main(parameters)`;
- `datasourceResolvers`;
- `tableDatasourceMap`;
- `tableTitleMap`;
- `tableTitleTemplateMap`;
- `tableColumnsMap`;
- `tableTransformMap`;
- `filterConfigs`;
- `runtimeParameterConfigs`;
- `resolveDatasourceQuery(datasourceId, parameters)`;
- `getRequiredDatasourceIds()`;
- `createDatasourcePlan(parameters)`;
- `loadDatasource(datasourceId, parameters)`;
- `loadAllDatasources(parameters)`;
- `getRowsForTable(tableId, rowsByDatasource)`;
- parameter collection from period UI, filters, and `schema.datasources[*].parameters`;
- real DOM table rendering from loaded datasource rows;
- period toolbar behavior and period label calculation;
- active table title rendering from `table.titleTemplate`, including `{periodLabel}`;
- global sort state shared across tables;
- summary recalculation over visible rows;
- CSV export for the active table through action `excel`;
- reload-on-change for filters bound to datasource parameters.

Important behavior decision: sorting is global report state. If the user sorts by a key such as `номер_заказа`, switching tabs should keep that sort key and apply it to other tables when that sortable column exists. Do not reset sort on tab switch.

Datasource-parameter filters are different from local UI filters. A filter with `filter.bind.placeholder` gets `reloadOnChange: true` in generated `filterConfigs`; changing it must call `refreshReport()` because it can change the datasource branch/query. Datasource-bound filters must not also be applied by client-side row hiding, because transformed or secondary tables may not contain the bound field. Plain filters continue to use client-side `applyFilters()`.

Generated datasource query placeholder rules:

- `{{name}}` remains supported;
- raw HC-style placeholders declared in datasource parameters or filter binds are supported, e.g. `&dateFinish`, `&группа`;
- `filters.<key>` datasource parameters read the selected filter value and can be used to build query placeholders, e.g. `group` from `filters.группа_товаров` replacing `&группа`.
- optional datasource placeholders (`required: false`) with an empty value must remove the DSL pipeline segment that contains that placeholder. This keeps an `All` select value from sending empty filters such as `| группа_товаров ()` to HC.

Production artifacts must not embed sample rows. `report.schema.json` may keep mock/sample rows for builder work, but generated production `index.html` should render a loading row and generated production `script.js` should load real HC data via `/api/v1/datasource/execute/`.

### 2. Builder Is Local, Not Inside HC

The builder must remain a local app/page. Reports are designed and verified locally, then files are copied into HC.

### 3. Behavior Reference

Use `reports/rabochee-mesto-2` as the reference for ambiguous UI and behavior decisions.

Especially check:

- table behavior and scroll;
- settings panel;
- filters;
- period;
- sandbox and HC parity.

### 4. Lookup Model

HC references often separate ID and title:

```json
{
  "номер_заказа": 1533,
  "номер_заказа_title": "1287-В"
}
```

This is not a fallback workaround. It is the normal HC model: data contains the ID, while UI should display the title.

Builder lookup model:

```json
"lookups": {
  "номер_заказа": {
    "titleField": "номер_заказа_title",
    "items": {
      "1533": "1287-В"
    }
  }
}
```

When importing an API response, `schema.lookups` is generated from `field` + `field_title` pairs.

The order column should bind to the ID field:

```json
{
  "key": "номер_заказа",
  "title": "Номер заказа",
  "lookup": {
    "field": "номер_заказа",
    "titleField": "номер_заказа_title"
  }
}
```

The table displays the title, while filtering/API logic works with the ID.

### 5. HC API And `orderId`

Earlier HC API body used this shape:

```json
{
  "token": "...",
  "parameters": {
    "dateStart": "2026-04-25",
    "dateFinish": "2026-04-27",
    "orderId": true
  }
}
```

Problem: HC workflow can type `orderId` as a number. Then `true` in the HC log becomes:

```json
"orderId": 0.0
```

This caused the datasource to receive an order filter for `0`; with `Having(номер_заказа>0)`, the result became empty.

Current user-approved solution: keep `orderId` numeric. If no order is selected, the builder sends `orderId: 0`. Branching between "order selected" and "no order selected" happens in the HC workflow: if `orderId > 0`, use the order branch; otherwise do not apply the order filter.

Without order filter:

```json
{
  "token": "...",
  "parameters": {
    "dateStart": "2026-04-15",
    "dateFinish": "2026-04-27",
    "orderId": 0
  }
}
```

With order filter:

```json
{
  "token": "...",
  "parameters": {
    "dateStart": "2026-04-15",
    "dateFinish": "2026-04-27",
    "orderId": 1533
  }
}
```

HC workflow logic is roughly:

```text
if orderId > 0:
  деньги | номер_заказа({{parameters.orderId}}) | Select(...) | Gettitle() | Having(номер_заказа>0)
else:
  деньги | period({{parameters.dateStart}}, {{parameters.dateFinish}}) | Select(...) | Gettitle()
```

The old mixed-type `orderId` issue is considered resolved. The `orderId + useOrderFilter` contract is not the chosen direction.

### 5.1. Runtime Datasource Endpoint For Generated `script.js`

Do not confuse two different paths:

- the builder may call an external workflow/API to get sample rows for the developer and save mock data;
- generated `script.js` in HC should execute datasource queries through the internal HC endpoint:

```text
/api/v1/datasource/execute/
```

Request body:

```json
{
  "expression": "...",
  "applyDimensionRights": true
}
```

This endpoint executes the DSL expression generated from `schema.datasources[*].branches[*].query`.

## Current `orderId` Status

Last diagnosed situation:

- the user saw rows with `номер_заказа > 0` in the HC datasource console;
- the API workflow called from the builder returned `data.data: []`;
- the HC log showed:

```json
trigger: {
  "dateStart": "2026-04-15",
  "dateFinish": "2026-04-27",
  "orderId": 0.0
}
```

Conclusion: the issue was not the builder table or lookup logic. It was the API/workflow parameter contract: `orderId` was typed/coerced as a number.

Accepted decision: do not introduce `useOrderFilter`; keep `orderId` numeric and branch datasource logic on `orderId > 0`.

## Current TODO

### Near Term

- Verify the latest SOULWOOD report flow: load `C:\My_files\HUBCLOUD\SOULWOOD\Html_reports\report.schema.json`, confirm body preview contains `dateStart`, `dateFinish`, `group`, then copy fresh `script.js` to HC and test the group filter.
- Verify generated package with `main` datasource using two branches: `byOrder` and `byPeriod`.
- Verify the single-branch datasource scenario.
- Test generated runtime behavior against real HC rows: period changes, `orderId` branch switching, multiple tables, global sorting, summary cards, active title template, and CSV export.
- After receiving non-empty real data, save it as mock for the correct datasource.
- Continue cleanup of smaller issues found while using the builder and the generated HC report.
- Later remove or rethink `buildDsArtifact` if separate `DS.txt` is no longer used by the builder.

### Medium Term

- Remove temporary order diagnostics after stabilization.
- Clarify lookup model for all HC references, not only `номер_заказа`.
- Add UI to view/edit `schema.lookups`.
- Split large `report-builder/app.js` into `editor/`, `generators/`, `preview/`, `validators/`, `export/`.
- Add schema validation and readable developer errors.
- Consider local persistence for user-edited schemas.

## Risks And Guardrails

- `report-builder/app.js` is already large; regression risk is growing, so decomposition should happen soon.
- Browser may cache old `app.js`; update cache-bust in `report-builder/index.html` after `app.js` changes.
- The user asked to continue in an economical mode because Browser Use / MCP browser checks consume many tokens. Prefer shell checks (`node -e`, `Invoke-WebRequest`, targeted `Select-String`) and use Browser Use only when explicitly requested or when visual verification is truly necessary.
- Browser Use session/tabs were closed after the user opened the builder in an external browser.
- If Browser Use is explicitly used again after generator changes, keep checks narrow: switch to the `script.js` artifact tab, read `#artifactPreview`, run `new Function(generatedScript)`, and check that generated code does not contain `reportSchema`. Avoid full `domSnapshot()`/full screenshots unless needed.
- HC workflow can type/coerce parameters (`true` -> `0.0`), so avoid mixed-type parameter contracts.
- Runtime test body is now generated from `schema.datasources[*].parameters`; do not reintroduce fixed test fields such as hard-coded `dateStart/dateFinish/orderId`.
- For datasource filters that should reload HC data, use `filter.bind.placeholder` and a datasource parameter with `source: filters.<filterKey>` when the query needs a differently named parameter, e.g. `group` -> `&группа`.
- For optional datasource filters, either provide explicit conditional branches (`group > 0` / fallback) or rely on the generator's optional placeholder cleanup. Never let production `script.js` send empty HC filters like `field ()`.
- Do not confuse the external workflow/API used for sample data in the builder with internal `/api/v1/datasource/execute/`, which generated `script.js` should use in HC.
- Keep production artifacts free of embedded mock rows. Large samples belong only in `report.schema.json` / builder state.
- While debugging API behavior, always inspect HC logs: `trigger` and `Template prepared`.
- Keep UTF-8 intact. There were earlier mojibake issues; be careful when editing files containing Russian text.
- Do not change the three exported files of the reference report unless the task explicitly requires it.

## Collaboration Rules

The user explicitly reminded the project workflow:

1. Say what will be changed.
2. Wait for confirmation.
3. Only then make file changes.

Follow this especially before editing files.

Commits are allowed only after an explicit current-turn request such as `commit`, `закомить`, or `сделай коммит`.

## Files Changed In This Work Branch

- `report-builder/app.js`
- `report-builder/index.html`
- `report-builder/styles.css`
- `report-builder/schema/report.schema.blank.json`
- `report-builder/schema/report.schema.example.json`
- `CODEX_CONTEXT.md`

Also changed outside the repo workspace:

- `C:\My_files\HUBCLOUD\SOULWOOD\Html_reports\report.schema.json`

No commit has been made unless the user explicitly asks for one.

## Quick Restart Plan

1. Start the server:

```powershell
$env:PORT="8010"
node .\dev-server.js
```

2. Open:

```text
http://127.0.0.1:8010/report-builder/index.html
```

3. Continue from the latest generated runtime state. Current generated `script.js` already has datasource loading, table rendering, period runtime, datasource reload filters, runtime datasource parameters, table transforms, global sorting, CSV export, and active table title templates.

4. Verify generated `script.js` uses internal endpoint:

```text
/api/v1/datasource/execute/
```

5. Use browser-use after code changes:

```js
const generatedScript = await tab.playwright.locator('#artifactPreview').textContent();
new Function(generatedScript);
```

Expected generated script checks:

- contains `/api/v1/datasource/execute/`;
- contains `renderTable`;
- contains `updatePeriodToolbar`;
- contains `applySort`;
- contains `reloadOnChange`;
- contains `runtimeParameterConfigs`;
- contains `applyDeclaredPlaceholders`;
- contains `exportActiveTableToCsv`;
- contains `tableTitleTemplateMap`;
- does not contain `reportSchema`.

6. Verify that an empty order sends `orderId: 0` and the datasource chooses the period branch.

7. Get real data, save it as mock for the correct datasource, then verify `lookups` and table display.
