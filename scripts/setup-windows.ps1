param(
  [switch]$UseDockerPostgres = $true,
  [string]$DbUser = "postgres",
  [string]$DbPassword = "postgres",
  [string]$DbName = "mediadb",
  [int]$DbPort = 5432
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not installed or not on PATH."
  }
}

function Wait-ForDockerPostgres([string]$ContainerName, [string]$User, [string]$Database) {
  Write-Host "Waiting for PostgreSQL readiness..." -ForegroundColor Yellow

  $maxAttempts = 30
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    docker exec $ContainerName pg_isready -U $User -d $Database | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "PostgreSQL is ready." -ForegroundColor Green
      return
    }

    Start-Sleep -Seconds 2
  }

  throw "PostgreSQL did not become ready in time. Check container logs with: docker logs $ContainerName"
}

Write-Host "== MediaDB Windows bootstrap ==" -ForegroundColor Cyan

Require-Command git
Require-Command node
Require-Command npm

if ($UseDockerPostgres) {
  Require-Command docker

  $containerName = "mediadb-postgres"
  $exists = docker ps -a --format "{{.Names}}" | Select-String -SimpleMatch $containerName

  if (-not $exists) {
    Write-Host "Creating PostgreSQL Docker container '$containerName'..." -ForegroundColor Yellow
    docker run --name $containerName `
      -e POSTGRES_USER=$DbUser `
      -e POSTGRES_PASSWORD=$DbPassword `
      -e POSTGRES_DB=$DbName `
      -p ${DbPort}:5432 `
      -d postgres:15 | Out-Null
  }

  Write-Host "Starting PostgreSQL Docker container..." -ForegroundColor Yellow
  docker start $containerName | Out-Null

  Wait-ForDockerPostgres -ContainerName $containerName -User $DbUser -Database $DbName
}
else {
  Write-Host "Using external PostgreSQL. Ensure DB is running at localhost:$DbPort before continuing." -ForegroundColor Yellow
}

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example" -ForegroundColor Green
}

if (Test-Path ".env") {
  $dbUrlValue = "postgresql://$($DbUser):$($DbPassword)@localhost:$($DbPort)/$($DbName)?schema=public"
  $dbUrl = 'DATABASE_URL="{0}"' -f $dbUrlValue
  $content = Get-Content ".env" -Raw

  if ($content -match "DATABASE_URL=") {
    $content = [regex]::Replace($content, "DATABASE_URL=.*", $dbUrl)
  }
  else {
    $content = $content.TrimEnd() + "`r`n" + $dbUrl + "`r`n"
  }

  Set-Content ".env" $content -Encoding UTF8
  Write-Host "Updated DATABASE_URL in .env" -ForegroundColor Green
}

Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npm run db:generate

Write-Host "Running Prisma migration..." -ForegroundColor Yellow
npm run db:migrate -- --name init

Write-Host "Seeding demo data..." -ForegroundColor Yellow
npm run db:seed

Write-Host "Bootstrap complete. Start app with: npm run dev" -ForegroundColor Green
