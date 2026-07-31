# deploy-package.ps1
# Builds the Spring Boot JAR, then packages it with Procfile and
# .ebextensions into a zip ready for Elastic Beanstalk upload.
#
# Usage:  .\deploy-package.ps1
# Output: deploy-bundle.zip (in the Backend folder)

$ErrorActionPreference = "Stop"
$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n=== Step 1: Building JAR ===" -ForegroundColor Cyan
Push-Location $backendDir
& .\mvnw.cmd clean package -DskipTests
if ($LASTEXITCODE -ne 0) { throw "Maven build failed" }
Pop-Location

$jar = "$backendDir\target\ideaspark-backend-1.0.0.jar"
if (-not (Test-Path $jar)) { throw "JAR not found at $jar" }
Write-Host "JAR built: $jar" -ForegroundColor Green

Write-Host "`n=== Step 2: Creating deployment zip ===" -ForegroundColor Cyan
$zipPath = "$backendDir\deploy-bundle.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

# Create a temp staging folder
$staging = "$backendDir\deploy-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

# Copy JAR, Procfile, and .ebextensions into staging
Copy-Item $jar "$staging\ideaspark-backend-1.0.0.jar"
Copy-Item "$backendDir\Procfile" "$staging\Procfile"
Copy-Item -Recurse "$backendDir\.ebextensions" "$staging\.ebextensions"

# Zip the contents (not the folder itself)
Compress-Archive -Path "$staging\*" -DestinationPath $zipPath
Remove-Item $staging -Recurse -Force

$size = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Host "`n=== Done! ===" -ForegroundColor Green
Write-Host "Upload this to EB Console:" -ForegroundColor Yellow
Write-Host "  $zipPath  ($size MB)" -ForegroundColor Yellow
Write-Host "`nEB Console -> Environments -> your env -> Upload and Deploy -> Choose File -> select deploy-bundle.zip`n"
