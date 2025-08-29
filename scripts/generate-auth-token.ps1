[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TenantId,

    [Parameter(Mandatory = $true)]
    [string]$ClientId,

    [Parameter(Mandatory = $true)]
    [string]$ClientSecret,

    [Parameter(Mandatory = $true)]
    [string]$TargetAppIdUri
)

$ErrorActionPreference = "Stop"

try {
    $tokenEndpoint = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
    $scope = "$TargetAppIdUri/.default"

    $body = @{
        client_id     = $ClientId
        client_secret = $ClientSecret
        scope         = $scope
        grant_type    = "client_credentials"
    }

    $response = Invoke-RestMethod -Uri $tokenEndpoint -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"

    Write-Output "Bearer $($response.access_token)"
}
catch {
    Write-Error "Failed to get token: $($_.Exception.Message)"
    exit 1
}
