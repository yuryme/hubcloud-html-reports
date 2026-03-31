# HubCloud Workflow Guardrails

## Purpose
Use this skill to keep the sandbox-to-HubCloud delivery process stable, repeatable, and low-risk.

## Mandatory Team Rules
1. Do not commit unless user explicitly asked to commit in the current turn.
2. Before any transfer to HubCloud, run local preflight checks.
3. Keep HubCloud tab split strict:
   - `index.html` -> `HTML`
   - `hc-report.css` -> `Styles`
   - `script.js` -> `Scripts`
4. Any fix done for HubCloud must be reflected in sandbox setup too.

## Standard Flow
1. Implement changes locally.
2. Run:
   - `node --check script.js`
   - `node tools/hubcloud-preflight.js`
3. Validate sandbox URL with target date.
4. Prepare transfer package for three HubCloud tabs.
5. Ask user for explicit commit approval before `git commit`.

## Commit Protocol
- Allowed:
  - user says `commit`, `закомить`, `коммит`, or equivalent explicit instruction.
- Not allowed:
  - implicit assumptions like "looks good", "continue", "publish".
- If no explicit commit request:
  - keep changes uncommitted and report status.

## Quick Failure Triage
- If Vue warns about template side-effects:
  - remove `<style>` from `index.html`,
  - move CSS to `hc-report.css`.
- If raw `{{ ... }}` appears:
  - replace with `v-text`/`v-html`.
- If HubCloud has different look:
  - first patch `hc-report.css`,
  - then refresh with cache bypass (`Ctrl+F5`).

## Done Criteria
- Preflight `PASS`.
- Sandbox and HubCloud render equivalently.
- Transfer instructions include exact tab mapping.
