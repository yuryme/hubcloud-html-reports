# RM2 Test Plan

This folder contains the baseline testing scaffold for report `rabochee-mesto-2`.

## Scope
- Data loading and mapping (`mock`/`datasource`)
- Period/filter behavior
- Aggregates and tab consistency
- Inline director comment edit/save behavior
- Excel export smoke
- HubCloud compatibility and transfer safety gates

## Fast Run
From `reports/rabochee-mesto-2`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\scripts\run-fast.ps1
```

## Full Run
From `reports/rabochee-mesto-2`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\scripts\run-full.ps1
```

## Priority Cases
- TC-01 mock load success
- TC-02 tabs switching consistency
- TC-03 order filter behavior
- TC-04 registrator filter behavior
- TC-05 budget item multiselect behavior
- TC-06 period mode with/without forced period
- TC-07 totals and summary consistency
- TC-08 expenses comment edit/save
- TC-09 kpi comment edit/save
- TC-10 Excel export smoke
