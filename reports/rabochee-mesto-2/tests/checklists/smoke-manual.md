# RM2 Smoke Manual Checklist

## Preconditions
- Dev server is running.
- Open sandbox URL in mock mode.
- No browser console errors on initial load.

## Cases
1. Open report and click `Обновить`: rows appear, no error toast.
2. Switch tabs: `По документам` -> `По статьям` -> `По КП`; counts and table body update.
3. Apply order filter: only matching rows remain.
4. Apply registrator filter: rows are restricted by `template|registrator` pair.
5. Toggle budget items: all/none/partial selection behaves correctly.
6. Verify period behavior:
   - with active filters and disabled force toggle, period should not affect query;
   - when force toggle is enabled, period should apply.
7. Edit director comment in expenses tab:
   - Enter confirms and sends request;
   - Esc cancels draft.
8. Edit director comment in KPI tab:
   - Enter confirms and sends KPI request payload;
   - Esc cancels draft.
9. Click export with data: `.xlsx` download starts.
10. Force empty result and click export: error toast shown.

## Exit Criteria
- All 10 cases pass.
- No critical visual regressions in table, toolbar, and tabs.
- No blocking errors in console/network.
