$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Command
  )
  Write-Host "== $Name =="
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Name (exit $LASTEXITCODE)"
  }
}

Write-Host 'RM2 full checks'

Invoke-Step 'Fast suite' { powershell -ExecutionPolicy Bypass -File .\tests\scripts\run-fast.ps1 }
Invoke-Step 'Unit: period and format' { node .\tests\unit\period-and-format.spec.mjs }
Invoke-Step 'Unit: filters and aggregates' { node .\tests\unit\filters-and-aggregates.spec.mjs }
Invoke-Step 'E2E browser smoke' { node .\tests\e2e\rm2-smoke.spec.mjs }

Write-Host 'FULL PASS'
