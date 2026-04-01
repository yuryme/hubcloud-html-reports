# HubCloud Datasource Pattern

## Purpose
Use this skill when a HubCloud report needs real data loading, staged datasource rollout, or migration from mock mode to HubCloud mode.

## Core Pattern
1. Start with `mock-data.json`.
2. Make sandbox render the full report shape before touching HubCloud datasource wiring.
3. Add `sendRequest` and `executeDatasourceRequest`.
4. Post datasource config to `/api/v1/datasource/execute/`.
5. Set `applyDimensionRights: true`.
6. Normalize response rows before rendering.

## Staged Rollout
1. `mock`
2. real datasource with fixed ids
3. real datasource with HubCloud parameters
4. lookup catalogs for filters
5. final UX polish

## Datasource Rules
- Build datasource expression in `script.js`, not in `index.html`.
- Keep all request code in one place.
- Always normalize:
  - empty data
  - missing arrays
  - null numeric fields
- Service/debug section is allowed while integrating, but should show truthful status.

## Parameter Rules
- Dates:
  - normalize incoming date values
  - build explicit day boundaries
- Filters:
  - UI may show titles
  - datasource must receive ids

## Done Criteria
- Sandbox mock mode works
- HubCloud datasource mode works
- Empty response is handled without runtime errors
- Request logic is readable and isolated
