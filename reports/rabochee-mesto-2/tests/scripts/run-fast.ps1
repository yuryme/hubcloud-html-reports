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

Write-Host 'RM2 fast checks'

Invoke-Step 'Transfer check' { node ..\..\tools\hc-transfer-check.js }
Invoke-Step 'HubCloud compatibility' { node ..\..\tools\hubcloud-compat-check.js }
Invoke-Step 'DS check' { node ..\..\tools\hc-ds-check.js }
Invoke-Step 'JS syntax check' { node --check .\script.js }

Write-Host 'FAST PASS'
