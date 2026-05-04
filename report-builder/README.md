# Report Builder

## Purpose

`report-builder` is a local report-constructor application for building HubCloud-compatible HTML reports.

The builder should let a developer describe a report through a JSON schema and generate a ready-to-check report package.

The main generated artifacts are:

- `index.html`
- `hc-report.css`
- `script.js`

Optional generated artifacts:

- `report.manifest.json`
- `report.default.json`
- `mock-data.json`
- `DS.txt`
- `DS2.txt`
- `DS_FILTERS.txt`

## Why This Exists

Today reports are assembled through iterative manual development:

- the report goal is described,
- the expected screen shape is clarified,
- the datasource is provided,
- the final HC-ready files are refined step by step.

This repository already shows that reports are built from recurring blocks:

- page layout,
- settings panel,
- filters,
- period block,
- summary cards,
- data table,
- KPI blocks,
- sandbox assets,
- datasource bindings.

`report-builder` exists to turn that repeated manual process into a local engineering tool.

## Core Idea

The source of truth for a report should be a JSON schema, not manually edited generated HC files.

That means:

- the developer edits `report.schema.json`,
- the builder generates `index.html`, `hc-report.css`, `script.js`,
- the generated package is validated in sandbox,
- the final three HC files are transferred into HubCloud.

## Scope Of V1

Version 1 should stay intentionally small.

Included in V1:

- local web application,
- browser-based UI,
- schema-first workflow,
- simple form-based editing,
- JSON preview,
- generation of a basic HC-compatible report package,
- support for one or more standard templates,
- local preview through sandbox-compatible output.

Not included in V1:

- server-side storage,
- multi-user collaboration,
- drag-and-drop block editing,
- free-form layout design,
- arbitrary custom code editing inside the builder,
- direct publishing into HubCloud.

## Working Model

The builder is not intended to run inside HubCloud.

It should run locally on a developer machine and act as an external engineering environment that prepares report packages for HubCloud.

Expected workflow:

1. Open the builder locally in a browser.
2. Create a new report or open an existing schema.
3. Configure layout, blocks, filters, tables, and datasource bindings.
4. Save the report schema.
5. Generate report artifacts.
6. Validate the generated package in sandbox.
7. Transfer the final three HC files into HubCloud.

## Source Of Truth

The intended source of truth is:

- `report.schema.json`

Generated artifacts are derived from the schema:

- `index.html`
- `hc-report.css`
- `script.js`

The builder flow should treat manual edits to generated files as non-canonical unless a later import/reconciliation mechanism is introduced.

## Main Schema Concepts

The report schema is expected to describe:

- report metadata,
- template choice,
- layout type,
- toolbar actions,
- period block,
- filters,
- datasource definitions,
- datasource parameter contracts,
- datasource result schema,
- tabs,
- tables,
- summary cards,
- KPI blocks,
- behavior rules,
- mock data strategy.

## Datasource As A First-Class Part

Datasource definition is a central part of the builder, not an afterthought.

The builder must let a developer define:

- datasource identity,
- datasource DSL text,
- file mapping such as `DS.txt` or `DS2.txt`,
- placeholders like `&dateStart`, `&dateFinish`, `&orderId`,
- parameter sources,
- parameter types,
- result fields returned by the datasource,
- which UI blocks consume those result fields.

This is necessary because the builder is for real HC reports, not only for visual layout assembly.

## What We Reuse From This Repository

The builder should reuse existing repository knowledge and assets whenever possible:

- `core/script.core.js`
- `templates/`
- `reports/` as working reference reports
- `tools/` validation scripts
- HubCloud compatibility rules already documented in this repository

The current repository is the knowledge base for the first builder implementation.

## Proposed Module Structure

Initial internal structure for `report-builder`:

- `README.md` - module overview and architecture notes
- `schema/` - schema examples and schema definitions
- `editor/` - builder UI
- `generators/` - HTML/CSS/JS generation logic
- `preview/` - local preview helpers
- `validators/` - schema and generated-output validation
- `export/` - package export helpers

This structure does not have to be fully implemented at once, but it defines the intended separation of concerns.

## MVP Architecture

The local builder should be split into four logical layers:

1. Schema layer
   The report description model.

2. Generator layer
   Converts schema into `index.html`, `hc-report.css`, and `script.js`.

3. Preview layer
   Lets the generated package run in a sandbox-compatible local flow.

4. UI layer
   Lets the developer edit the schema through a simple local browser interface.

## MVP Success Criteria

The first version is successful when:

- a developer can create a basic report schema,
- the builder can generate a report package from that schema,
- the generated package can be opened in sandbox,
- at least one real report pattern from this repository can be represented through the schema,
- the builder output stays structurally compatible with HubCloud expectations.

## Initial MVP Target

The first practical target should be a simple report with:

- title,
- right-side settings panel,
- standard period block,
- one data table,
- optional summary cards,
- one main datasource,
- basic mock data,
- export of the HC triplet:
  - `index.html`
  - `hc-report.css`
  - `script.js`

## Next Step

The next implementation step after this document is:

1. create the initial folder structure,
2. define a first `report.schema.json` example,
3. build the smallest possible local UI,
4. add a basic generator for one template.
