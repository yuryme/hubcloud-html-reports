# Local Report Sandbox (HubCloud Parity)

## Goal
Develop and debug report UI/logic locally in a way that is compatible with HubCloud runtime.

## Runtime parity rules
- Do NOT load external `bootstrap-vue` in sandbox or HubCloud.
- Use Vue template-safe patterns for HubCloud:
  - no `{{ ... }}` in `index.html` (use `v-text`),
  - avoid `b-table` + scoped slots,
  - prefer plain `<table>` rendering.
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
```

Only transfer when preflight returns `PASS`.

## Files to transfer to HubCloud
- `index.html`
- `script.js`

## Notes
- `sandbox.html`, `dev-server.js`, `mock-data.json` are local tooling only.
- In HubCloud always refresh with cache bypass (`Ctrl+F5`) after update.
