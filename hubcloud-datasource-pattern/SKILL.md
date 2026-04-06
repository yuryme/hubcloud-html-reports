---
name: hubcloud-datasource-pattern
description: Add or migrate HubCloud report data loading from mock mode to real datasource mode in this repository. Use when a report needs staged datasource rollout, executeDatasourceRequest wiring, request posting to /api/v1/datasource/execute/, response normalization, or safe transition from mock-data.json to HubCloud-backed data.
---

# HubCloud Datasource Pattern

## Overview

Use this skill when a HubCloud report needs real data loading, staged datasource rollout, or migration from mock mode to HubCloud mode.

Keep datasource wiring in `script.js`, not in `index.html`.

## Quick Start

1. Start with `mock-data.json`.
2. Make the sandbox render the full report shape before wiring the real datasource.
3. Add `sendRequest` and `executeDatasourceRequest`.
4. Post datasource config to `/api/v1/datasource/execute/`.
5. Set `applyDimensionRights: true`.
6. Normalize rows before rendering them.

## Workflow

### 1. Follow staged rollout

Apply datasource integration in this order:
1. `mock`
2. real datasource with fixed ids
3. real datasource with HubCloud parameters
4. lookup catalogs for filters
5. final UX polish

### 2. Keep datasource rules

- Build the datasource expression in `script.js`, not in `index.html`.
- Keep all request code in one place.
- Allow a service or debug section during integration only if it shows truthful status.

### 3. Normalize response data

Always normalize:
- empty data
- missing arrays
- null numeric fields

Do not let datasource edge cases break rendering.

### 4. Apply parameter rules

For dates:
- normalize incoming date values
- build explicit day boundaries

For filters:
- allow the UI to show titles
- send ids into the datasource

## Done Criteria

- Sandbox mock mode works.
- HubCloud datasource mode works.
- Empty response is handled without runtime errors.
- Request logic is readable and isolated.
