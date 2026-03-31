# HubCloud Report Style

## When To Use
Use this skill for any UI/UX or layout updates in the HubCloud external report and local sandbox.
Apply it when editing `index.html`, `hc-report.css`, `script.js`, `sandbox.html`, and related mock flow.

## Core Context
- Project is a HubCloud external report template + local sandbox for rapid iteration.
- Main workflow:
  1. iterate locally in sandbox,
  2. keep behavior compatible,
  3. transfer final `index.html`, `hc-report.css`, and `script.js` into HubCloud tabs.
- Local test URL:
  `http://127.0.0.1:8010/sandbox.html?mode=mock&date=2026-03-30`
- Mock source:
  `mock-data.json`

## Visual Language
- Preserve current HubCloud-like direction: calm blue + soft neutral background.
- Keep page centered with a restrained content width (`.report-page-2`, max about 1120px).
- Keep rounded cards and thin borders:
  - radius generally 18-24px,
  - subtle border color in `#cfd9e4` range,
  - light shadow without heavy contrast.
- Avoid aggressive dark tones and avoid generic default redesigns.
- Keep gradients soft and clean, not flashy.

## HubCloud Tabs Contract
- `HTML` tab:
  - only report markup (`index.html`),
  - no `<style>` tags inside template,
  - avoid moustache output in template (`{{ ... }}`).
- `Styles` tab:
  - all report styles from `hc-report.css`,
  - include variables in `:root`,
  - keep overrides scoped to report classes.
- `Scripts` tab:
  - only logic from `script.js`,
  - no CSS injection blocks in production version.

## Layout Contract
- Keep the structural flow:
  - `hero-band` -> `hero-sheet`
  - `toolbar-card`
  - `kpi-row`
  - `report-frame`
  - section cards and table area
- Do not replace the report with a generic dashboard template.
- Keep table readability:
  - clear row separators,
  - gentle hover,
  - stronger styling for important summary rows (`table-info`).

## Interaction Contract
- Keep period filters and report generation flow intact.
- KPI cards must stay informative and stable.
- The "ingredients" KPI card is interactive:
  - hover support,
  - click support,
  - keyboard support (`Enter`/`Space`).
- Ingredient right-side modal requirements:
  - opens from KPI card in right panel style,
  - closes predictably (backdrop, close button),
  - contains printable ingredient summary,
  - print action prints only ingredient summary.
- Printing behavior:
  - main print: report body only,
  - ingredient print: modal summary only.

## Data And Logic Safety
- Do not break runtime mode detection (`mock` vs `hubcloud`).
- Keep URL date parameter support:
  - normalize date from query,
  - set `period_from` and `period_to`,
  - use day boundaries for request period.
- Keep defensive checks for empty/null arrays and missing fields.
- Do not change field names from datasource/mock unless explicitly requested.

## Accessibility And Responsiveness
- Preserve desktop and mobile readability.
- Interactive controls must remain keyboard-accessible.
- Maintain visible focus for interactive cards/buttons.
- On small screens, keep cards and report blocks compact and aligned.

## Charset And Text Rules
- All edited files must be UTF-8.
- Never introduce mojibake (`Р...`, `С...`) into UI strings or data keys.
- Before finishing, quickly validate that Cyrillic text renders correctly in templates and JS strings.

## Edit Strategy
- Prefer point fixes over broad rewrites.
- Respect existing class names and component structure.
- If a UX improvement is added, keep behavior backward-compatible for HubCloud transfer.
- Preserve stable selectors/classes used in `hc-report.css`.
- Any HC-only visual fix should first be mirrored in sandbox by adjusting `hc-report.css`.

## Definition Of Done
1. Sandbox opens and report renders with no template breakage.
2. KPI cards display correct values.
3. Ingredient modal opens/closes correctly and prints correct list.
4. No new console/runtime errors.
5. Final files remain transferable:
   - `index.html` -> HubCloud `HTML`
   - `hc-report.css` -> HubCloud `Styles`
   - `script.js` -> HubCloud `Scripts`
