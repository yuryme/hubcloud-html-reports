# Report Spec

## Report Identity
- Name: Warehouse Stock Report
- Business purpose: Show stock opening, incoming, outgoing, and closing balances by item.
- Owner: HubCloud Report Factory sample

## Data Source
- Source type: HubCloud datasource DSL + local mock JSON
- Source name: Warehouse stock balances
- Query / endpoint: see `DS.txt`
- Parameters: warehouse, dateStart, dateFinish, product group

## Data Contract
- Required fields: item_name, opening_balance, incoming, outgoing, closing_balance
- Optional fields: warehouse, group
- Null/empty handling: render empty strings or 0 in KPIs
- Aggregations: total opening, total incoming, total closing, item count

## UI Contract
- Sections: hero, toolbar, KPI row, stock balance table, source notes
- KPI cards: item count, opening total, incoming total, closing total
- Table layout: one compact stock table with 5 columns
- Modal behavior: none for this sample
- Print behavior: use default browser print if later added

## HubCloud Notes
- HTML specifics: plain markup only, no style tag, no moustache output
- Styles specifics: all visual rules live in `hc-report.css`
- Scripts specifics: mock mode works now, HC datasource wiring is next step based on `DS.txt`

## Acceptance
- Sandbox renders correctly
- HubCloud renders correctly
- Print works
- No runtime/template errors
