---
name: hubcloud-filter-pattern
description: Build or update HubCloud-backed report filters in this repository. Use when a report needs dropdown filters loaded from catalog datasources, synchronized id/title handling, restored filter values from HubCloud parameters, or safe filter-to-datasource wiring where the UI shows titles and the main datasource receives ids.
---

# HubCloud Filter Pattern

## Overview

Use this skill when a report needs HubCloud-backed dropdown filters such as warehouse or group selectors backed by catalog data.

Keep the filter UI separate from the main report table.

## Quick Start

1. Load filter options from a catalog datasource.
2. Render the dropdown with `title`.
3. Store the selected `id` in `v-model`.
4. Pass the selected `id` into the main datasource expression.

## Workflow

### 1. Keep UI structure clear

- Keep filters separate from the main report table.
- Prefer a dedicated filter section or right-side panel.
- Show a blank option like `Все ...` only if the datasource supports an omitted filter.

### 2. Keep option data normalized

Option datasource should return:
- `id`
- `title`

Normalize options to:
- `value`
- `title`

### 3. Keep restored values synchronized

- If a value is restored from HubCloud parameters, sync the visible title from loaded options.
- If options fail to load, keep the report renderable without crashing.

### 4. Avoid the main anti-pattern

- Do not send `title` into the main datasource filter unless the datasource explicitly expects text values.
- Send ids into the main datasource by default.

## Done Criteria

- Dropdown displays titles.
- Main datasource receives ids.
- Selection changes reload the report predictably.
