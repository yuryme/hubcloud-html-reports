# Report Workflow

Reference document. Read when the task is about lifecycle, process, or architecture. This file is not mandatory start reading for every task.

## Purpose
This document defines how HTML reports are created, reconstructed from samples, modernized, standardized, and prepared for HubCloud delivery in this project.

It describes the working model of the report factory:
- how a new report is built from an image or sample,
- how an existing report is imported and modernized,
- where core, templates, and report-specific files are used,
- what result is expected at each stage.

## Two Entry Modes

### 1. Skeleton Build Mode
Use this mode when the report does not yet exist as working source files.

Typical inputs:
- screenshot or image of a sample report,
- datasource description (`DS.txt`),
- filter requirements,
- expected columns and behavior.

Goal:
- reconstruct a working report skeleton,
- connect filters and datasource,
- produce a functional local report in sandbox,
- prepare it for later standardization.

Important:
- the image/sample is used to reconstruct the initial working model,
- template usage is optional at this stage,
- visual fidelity may be approximate while behavior is being established.

### 2. Modernization Mode
Use this mode when a working HTML report already exists.

Typical inputs:
- `index.html`,
- `hc-report.css`,
- `script.js`,
- optionally `DS.txt`, `DS_FILTERS.txt`, `mock-data.json`,
- a change request or modernization goal.

Goal:
- import the existing report into the project,
- preserve working behavior,
- improve structure, styling, logic, or compatibility,
- gradually align the report to project standards.

## Shared Lifecycle Stages

### Stage 1. Working Skeleton
This stage focuses on obtaining a working report.

For Skeleton Build Mode:
- reconstruct layout from image/sample,
- define filters,
- connect datasource,
- render a working table,
- make the report run in sandbox.

For Modernization Mode:
- import the existing report,
- verify that it works,
- identify report-specific and generic parts,
- establish a stable baseline before changes.

Output:
- working `index.html`,
- working `hc-report.css`,
- working `script.js`,
- datasource connected,
- sandbox available.

### Stage 2. Template / Style Alignment
This stage applies design and structural normalization.

Purpose:
- align the report to HubCloud-style conventions,
- normalize layout, toolbar, filter panel, table shell, spacing, and actions,
- improve readability and consistency,
- reuse template ideas where useful.

Important:
- template is not mandatory as a starting point,
- template is a standardization layer applied after or during skeleton stabilization,
- image/sample may define the initial structure,
- template may later reshape the report into a cleaner project-standard form.

### Stage 3. Production Cleanup
This stage prepares the report for reliable long-term use.

Purpose:
- remove dead code and temporary diagnostics,
- separate core logic from report-specific logic,
- verify datasource parameterization,
- ensure HubCloud compatibility,
- make the code reviewable and reusable.

Output:
- clean `script.js`,
- consistent `index.html`,
- maintainable `hc-report.css`,
- report ready for transfer to HubCloud.

## Role of Templates
Templates are used as standardization aids, not as the only source of report creation.

Templates may provide:
- layout patterns,
- filter panel patterns,
- table shell patterns,
- style presets,
- HubCloud-safe structure.

Templates should help normalize and accelerate work, but they must not prevent:
- building a report from a sample image,
- importing an existing report for modernization,
- assembling a report from project blocks and rules.

## Role of Images / Samples
A screenshot or sample image is a valid project input.

It is used to:
- reconstruct the initial screen structure,
- identify visible controls,
- infer table layout,
- rebuild the functional skeleton of a report.

The image is not the final standard.
It is a source for reconstruction.
After reconstruction, the report may be improved, restyled, and aligned to project standards.

## Role of Existing Reports
Existing reports are also valid project inputs.

A working report may be imported into the project and treated as a modernization candidate.

This means:
- we do not always rebuild from scratch,
- we may start from existing `index.html`, `hc-report.css`, and `script.js`,
- we may enter directly into Stage 2 or Stage 3,
- modernization may be incremental.

## Core vs Report-Specific Parts

### Core
Core is the reusable, stable part of the system.

Typical core responsibilities:
- runtime initialization,
- query parameter reading,
- datasource transport,
- mock/live switching,
- filter state pipeline,
- row normalization pipeline,
- loading/error handling,
- export/print helpers.

Core should be improved carefully and reused across reports.

### Report-Specific
Report-specific parts are expected to change from report to report.

Typical report-specific responsibilities:
- report title,
- filter definitions,
- visible columns,
- datasource expression,
- datasource-to-row field mapping,
- report-specific layout decisions,
- report-specific style overrides.

## Source of Truth by Stage

### In Skeleton Build Mode
At early stage, source of truth is:
- image/sample,
- datasource requirements,
- filter requirements,
- working sandbox result.

Later, source of truth becomes:
- project files,
- datasource files,
- project standards.

### In Modernization Mode
At early stage, source of truth is:
- imported working files,
- current behavior of the existing report.

Later, source of truth becomes:
- cleaned project files,
- synchronized datasource logic,
- project standards and compatibility rules.

## Mandatory Start Question
At the start of a new report task, agent must clarify which entry mode is being used:
- `Skeleton Build Mode`
- `Modernization Mode`

The agent must not assume the mode when the answer affects the workflow.

## Related Documents
- `START_HERE.md`
- `COLLABORATION_PROTOCOL.md`
- `PROJECT_TEMPLATE.md`
- `LOCAL_DEV.md`
- `HUBCLOUD_COMPAT.md`

