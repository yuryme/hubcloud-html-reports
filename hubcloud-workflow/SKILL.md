# HubCloud Workflow Guardrails

## Purpose
Use this skill to keep the sandbox-to-HubCloud delivery process stable, repeatable, and low-risk.

## Mandatory Team Rules
1. Do not commit unless the user explicitly asked to commit in the current turn.
2. Before starting work on a new or imported report, run encoding gate.
3. Before any transfer to HubCloud, run local preflight checks.
4. Keep HubCloud tab split strict:
   - `index.html` -> `HTML`
   - `hc-report.css` -> `Styles`
   - `script.js` -> `Scripts`
5. Any fix done for HubCloud must be reflected in sandbox setup too.

## Standard Flow
1. Implement changes locally.
2. Run:
   - `node tools/hc-encoding-gate.js`
   - `node --check script.js`
   - `node tools/hc-factory-lint.js <report-folder>` when working inside the factory
   - `node tools/hubcloud-preflight.js`
   - `node tools/hc-transfer-check.js`
3. Validate sandbox URL with target date.
4. Prepare transfer package for three HubCloud tabs.
5. Ask user for explicit commit approval before `git commit`.

## Factory-Specific Rules
- If `index.html` adds new Vue bindings, `script.js` must be updated in the same round.
- If filters are added:
  - load option lists first,
  - show `title`,
  - send `id`.
- If datasource integration is new:
  - implement mock mode first,
  - then fixed ids,
  - then real HubCloud parameters.

## Template Packaging
- Build reusable project template package with:
  - `node tools/hc-build-template.js`
- Output folder:
  - `template-pack/hubcloud-report-template`

## Commit Protocol
- Allowed:
  - user says `commit`, `закомить`, `коммит`, or equivalent explicit instruction.
- Not allowed:
  - implicit assumptions like `looks good`, `continue`, `publish`.
- If no explicit commit request:
  - keep changes uncommitted and report status.

## Quick Failure Triage
- If encoding gate fails:
  - stop feature work,
  - fix encoding first,
  - only then continue implementation.
- If Vue warns about template side-effects:
  - remove `<style>` from `index.html`,
  - move CSS to `hc-report.css`.
- If raw `{{ ... }}` appears:
  - replace with `v-text` or `v-html`.
- If HubCloud has different look:
  - first patch `hc-report.css`,
  - then refresh with cache bypass (`Ctrl+F5`).

## Done Criteria
- Encoding gate `PASS`.
- Preflight `PASS`.
- Sandbox and HubCloud render equivalently.
- Transfer instructions include exact tab mapping.
