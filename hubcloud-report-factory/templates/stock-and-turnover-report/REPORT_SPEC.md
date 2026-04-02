# Report Spec

## Report Identity
- Name: Stock and Turnover Report
- Business purpose: Show opening balance, incoming, outgoing, and closing balance by item.
- Owner: HubCloud Report Factory template

## Data Source
- Source type: HubCloud datasource DSL + local mock JSON
- Source name: Stock / turnover datasource
- Query / endpoint: see `DS.txt`
- Parameters:
  - warehouse id
  - group id
  - dateStart
  - dateFinish

## Data Contract
- Required fields:
  - item_name
  - opening_balance
  - incoming
  - outgoing
  - closing_balance
- Optional fields:
  - warehouse
  - group
- Null/empty handling: render empty strings or 0 in KPIs
- Aggregations:
  - item count
  - total opening
  - total incoming
  - total outgoing
  - total closing

## UI Contract
- Sections:
  - hero
  - date toolbar
  - right-side filters
  - KPI row
  - stock table
  - service info
- Filter behavior:
  - show `title`
  - submit `id`
- Table layout:
  - one compact stock table with internal scroll

## HubCloud Notes
- HTML specifics: plain markup only, no style tag, no moustache output
- Styles specifics: all visual rules live in `hc-report.css`
- Scripts specifics: includes mock mode, datasource mode, lookup filters, and `title -> id` sync

## Acceptance
- Sandbox renders correctly
- HubCloud renders correctly
- Dropdown filters show titles
- Datasource receives ids
- No runtime/template errors
