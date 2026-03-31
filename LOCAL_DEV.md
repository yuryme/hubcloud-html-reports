# Local Report Sandbox (HubCloud Parity)

## Goal
Develop and debug report UI/logic locally in a way that is compatible with HubCloud runtime.

## Runtime parity rules
- Do NOT load external `bootstrap-vue` in HubCloud.
- Use Vue template-safe patterns for HubCloud:
  - no `{{ ... }}` in `index.html` (use `v-text`),
  - avoid `b-table` + scoped slots,
  - prefer plain `<table>` rendering.
- Keep `index.html` free of `<style>` tags (styles belong to `hc-report.css` / HubCloud `Styles` tab).
- Keep files UTF-8 and avoid mojibake.

## Start local
```powershell
node dev-server.js
```

Open:
```text
http://127.0.0.1:8000/sandbox.html?mode=mock&date=2026-03-30
```

## Pre-transfer checks (mandatory)
```powershell
node tools/hubcloud-preflight.js
node tools/hc-transfer-check.js
```

Only transfer when preflight returns `PASS`.

## Files to transfer to HubCloud
- `index.html` -> HubCloud `HTML`
- `hc-report.css` -> HubCloud `Styles`
- `script.js` -> HubCloud `Scripts`

## Commit policy
- Commit only when user explicitly разрешил commit in current dialogue turn.
- By default after edits, stay uncommitted and report status.

## Notes
- `sandbox.html`, `dev-server.js`, `mock-data.json` are local tooling only.
- In HubCloud always refresh with cache bypass (`Ctrl+F5`) after update.
