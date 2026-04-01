# HubCloud Filter Pattern

## Purpose
Use this skill when a report needs HubCloud-backed dropdown filters such as `catalog.склад` or `catalog.группа`.

## Core Pattern
1. Load filter options from catalog datasource.
2. Render dropdown with `title`.
3. Store selected `id` in `v-model`.
4. Pass selected `id` into main datasource expression.

## UI Rules
- Keep filters separate from the main report table.
- Prefer a dedicated filter section or right-side panel.
- Show a blank option like `Все ...` only if datasource supports an omitted filter.

## Data Rules
- Option datasource should return:
  - `id`
  - `title`
- Normalize options to:
  - `value`
  - `title`

## Sync Rules
- If a value is restored from HubCloud parameters:
  - sync visible title from loaded options
- If options fail to load:
  - report should still render without crashing

## Anti-Pattern
- Do not send `title` into the main datasource filter unless the datasource explicitly expects text values.

## Done Criteria
- Dropdown displays titles
- Main datasource receives ids
- Selection changes reload the report predictably
