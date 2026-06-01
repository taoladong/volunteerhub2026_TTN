param(
    [string]$Server = '(localdb)\MSSQLLocalDB',
    [string]$Database = 'VolunteerHub',
    [switch]$ConfirmReset
)

$ErrorActionPreference = 'Stop'

if (-not $ConfirmReset) {
    Write-Error 'This resets local VolunteerHub demo data. Re-run with -ConfirmReset when intentional.'
}

$root = Split-Path -Parent $PSScriptRoot
$resetSql = Join-Path $PSScriptRoot 'reset-demo-data.sql'
$seedSql = Join-Path $root 'seed_data.sql'

if (-not (Test-Path -LiteralPath $resetSql)) {
    throw "Missing reset script: $resetSql"
}

if (-not (Test-Path -LiteralPath $seedSql)) {
    throw "Missing seed script: $seedSql"
}

Write-Host "Resetting demo data on $Server / $Database"
sqlcmd -b -I -f 65001 -S $Server -d $Database -E -i $resetSql

Write-Host 'Applying extended seed_data.sql'
sqlcmd -b -I -f 65001 -S $Server -d $Database -E -i $seedSql

$verifyQuery = @"
SET NOCOUNT ON;
SELECT 'Users' AS [Table], COUNT(*) AS [Count] FROM dbo.Users
UNION ALL SELECT 'EventCategories', COUNT(*) FROM dbo.EventCategories
UNION ALL SELECT 'Skills', COUNT(*) FROM dbo.Skills
UNION ALL SELECT 'Events', COUNT(*) FROM dbo.Events
UNION ALL SELECT 'Registrations', COUNT(*) FROM dbo.Registrations
UNION ALL SELECT 'Certificates', COUNT(*) FROM dbo.Certificates
UNION ALL SELECT 'Notifications', COUNT(*) FROM dbo.Notifications;
"@

Write-Host 'Demo data counts after reset:'
sqlcmd -b -S $Server -d $Database -E -Q $verifyQuery
