---
name: hubcloud-workflow
description: Keep the local-sandbox-to-HubCloud delivery process stable and repeatable for this repository. Use when creating, updating, validating, packaging, or transferring HubCloud reports that work through index.html, hc-report.css, script.js, sandbox checks, preflight checks, and HubCloud tab mapping.
---

# HubCloud Workflow

## Overview

Use this skill to preserve the repository's required delivery flow from local sandbox work to HubCloud transfer.

Keep these file roles strict:
- `index.html` -> HubCloud `HTML`
- `hc-report.css` -> HubCloud `Styles`
- `script.js` -> HubCloud `Scripts`

Reflect every HubCloud fix in the local sandbox flow too.

## Quick Start

1. Implement changes locally.
2. Run the required checks.
3. Open the sandbox with the target date and validate the target flow.
4. Prepare the three-file transfer package.
5. Commit only after explicit user approval in the current turn.

## Workflow

### 1. Apply mandatory team rules

- Do not commit unless the user explicitly asked to commit in the current turn.
- Run encoding gate before starting work on a new or imported report.
- Run local preflight checks before any HubCloud transfer.
- Keep the HubCloud tab split strict.
- Mirror HubCloud fixes in sandbox setup too.

### 2. Run the standard checks

Run:
- `node tools/hc-encoding-gate.js`
- `node --check script.js`
- `node tools/hc-factory-lint.js <report-folder>` when working inside the report factory
- `node tools/hubcloud-preflight.js`
- `node tools/hc-transfer-check.js`

If a check fails, stop feature work, fix the failure, then rerun the checks.

### 3. Validate the sandbox flow

- Open the sandbox URL with the target date.
- Confirm the local sandbox behavior matches the intended HubCloud behavior.
- Keep the three transfer files aligned with what the sandbox is using.

### 4. Apply factory-specific rules

- If `index.html` adds new Vue bindings, update `script.js` in the same round.
- If filters are added:
  - load option lists first
  - show `title`
  - send `id`
- If datasource integration is new:
  - implement mock mode first
  - then fixed ids
  - then real HubCloud parameters

### 5. Prepare transfer and packaging

- Prepare the transfer package for the three HubCloud tabs.
- Build the reusable project template package with:
  - `node tools/hc-build-template.js`
- Use output folder:
  - `template-pack/hubcloud-report-template`

### 6. Follow commit protocol

- Treat `commit`, `закомить`, `коммит`, or equivalent explicit instructions as commit approval.
- Do not treat `looks good`, `continue`, or `publish` as commit approval.
- If no explicit commit request exists, leave changes uncommitted and report status.

## Quick Failure Triage

- If encoding gate fails:
  - stop feature work
  - fix encoding first
  - continue only after that
- If Vue warns about template side-effects:
  - remove `<style>` from `index.html`
  - move CSS to `hc-report.css`
- If raw `{{ ... }}` appears:
  - replace it with `v-text` or `v-html`
- If HubCloud renders differently:
  - patch `hc-report.css` first
  - then refresh with `Ctrl+F5`

## Done Criteria

- Encoding gate returns `PASS`.
- Preflight returns `PASS`.
- Sandbox and HubCloud render equivalently.
- Transfer instructions include exact tab mapping.
