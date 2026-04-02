# DS Catalog

Use this file as a single catalog of datasource query blocks.

## Rules
- Store each query as a `Block`.
- Set `Target` to define usage.
- Use `Status` values: `active`, `draft`, `deprecated`.
- Keep DSL in a `dsl` fenced block.
- The final executable query line must not end with `;`.

## Targets
- `report.main` — main report query (exactly one active).
- `filter.<name>.options` — filter option lists.
- `report.debug` — diagnostics.

## Block: main_query_v1
- Target: report.main
- Status: draft
- Applies-To: script.getDatasourceExpression
- Owner: user+agent
- Notes: Active main datasource expression

```dsl
@include DS.txt
```

## Block: filter.example.options
- Target: filter.example.options
- Status: draft
- Applies-To: script.loadHubCloudFilters
- Owner: user
- Notes: Example filter option query

```dsl
catalog.example | Select (id, title) | OrderBy (title)
```
