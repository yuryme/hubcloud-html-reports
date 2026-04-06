---
name: hubcloud-report-style
description: Enforce the repository's canonical HubCloud report visual style and layout pattern. Use when editing index.html, hc-report.css, script.js, sandbox.html, or related mock flow for reports that must follow the project's standard design direction, structural flow, KPI behavior, modal behavior, print behavior, and HubCloud-safe HTML/Styles/Scripts split.
---

# HubCloud Report Style

## Overview

Use this skill for UI, UX, and layout updates that must follow the repository's canonical report design.

Treat this style as the project standard even when a current report temporarily deviates from it.

Apply it when editing `index.html`, `hc-report.css`, `script.js`, `sandbox.html`, and related mock flow.

## Quick Start

1. Iterate locally in sandbox.
2. Preserve the canonical report style while keeping HubCloud compatibility.
3. Transfer final `index.html`, `hc-report.css`, and `script.js` into HubCloud tabs.

Local test URL:
`http://127.0.0.1:8000/sandbox.html?mode=mock&date=2026-03-30`

Mock source:
`mock-data.json`

## Workflow

### 1. Preserve the canonical visual language

- Preserve the HubCloud-like direction: calm blue with soft neutral background.
- Keep the page centered with restrained content width such as `.report-page-2` around 1120px.
- Keep rounded cards and thin borders.
- Keep radius generally in the 18-24px range.
- Keep subtle border color in the `#cfd9e4` range.
- Keep light shadow without heavy contrast.
- Avoid aggressive dark tones.
- Avoid generic default redesigns.
- Keep gradients soft and clean.

### 2. Keep HubCloud tab boundaries strict

For `HTML`:
- keep only report markup in `index.html`
- do not place `<style>` tags inside the template
- avoid moustache output in the template

For `Styles`:
- keep all report styles in `hc-report.css`
- include variables in `:root`
- keep overrides scoped to report classes

For `Scripts`:
- keep only report logic in `script.js`
- do not add CSS injection blocks to the production version

### 3. Preserve the canonical layout contract

Keep the structural flow:
- `hero-band` -> `hero-sheet`
- `toolbar-card`
- `kpi-row`
- `report-frame`
- section cards and table area

- Do not replace the report with a generic dashboard template.
- Keep table readability through clear row separators, gentle hover, and stronger styling for important summary rows such as `table-info`.

### 4. Preserve the canonical interaction contract

- Keep period filters and report generation flow intact.
- KPI cards must stay informative and stable.
- The ingredients KPI card remains interactive.
- Preserve hover, click, and keyboard support such as `Enter` and `Space`.
- Ingredient right-side modal must:
  - open from the KPI card in right-panel style
  - close predictably through backdrop and close button
  - contain printable ingredient summary
  - print only the ingredient summary when that print action is used
- Main print must print the main report body only.

### 5. Protect runtime and data behavior

- Do not break runtime mode detection such as `mock` vs `hubcloud`.
- Keep URL date parameter support intact.
- Normalize date from query when the report uses date-driven flow.
- Keep defensive checks for empty arrays, null values, and missing fields.
- Do not rename datasource or mock fields unless explicitly requested.

### 6. Preserve accessibility and responsiveness

- Preserve desktop and mobile readability.
- Keep interactive controls keyboard-accessible.
- Maintain visible focus for interactive cards and buttons.
- Keep cards and report blocks compact and aligned on small screens.

### 7. Protect text and encoding

- Keep all edited files UTF-8.
- Do not introduce mojibake into UI strings or data keys.
- Before finishing, verify that Cyrillic text renders correctly in templates and JavaScript strings.

### 8. Prefer safe edit strategy

- Prefer point fixes over broad rewrites.
- Respect existing class names and component structure.
- Keep UX improvements backward-compatible for HubCloud transfer.
- Preserve stable selectors and classes used in `hc-report.css`.
- Mirror HC-only visual fixes in sandbox too.

## Done Criteria

1. Sandbox opens and the report renders without template breakage.
2. KPI cards display correct values.
3. Ingredient modal opens and closes correctly and prints the correct list.
4. No new console or runtime errors appear.
5. Final files remain transferable:
   - `index.html` -> HubCloud `HTML`
   - `hc-report.css` -> HubCloud `Styles`
   - `script.js` -> HubCloud `Scripts`
