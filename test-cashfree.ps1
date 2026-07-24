$ClientId     = $env:CASHFREE_CLIENT_ID
$ClientSecret = $env:CASHFREE_CLIENT_SECRET

try {
    $response = Invoke-RestMethod -Uri "https://sandbox.cashfree.com/payout/beneficiary?beneficiary_id=SC_TEST_BENE_002" -Method GET -Headers @{
        "x-client-id"     = $ClientId
        "x-client-secret" = $ClientSecret
        "x-api-version"   = "2024-01-01"
        "Content-Type"    = "application/json"
    }
    Write-Host "Success:"
    $response | ConvertTo-Json
}
catch {
    Write-Host "Status code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host $_.ErrorDetails.Message
}
