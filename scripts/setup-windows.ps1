param(
  [switch]$UseDockerPostgres = $true,
  [string]$DbUser = "postgres",
  [string]$DbPassword = "postgres",
  [string]$DbName = "mediadb",
  [int]$DbPort = 5432,
  [string]$DbImage = "pgvector/pgvector:pg15",
  [switch]$RecreateDbContainer = $false
)

$ErrorActionPreference = "Stop"


function Wait-PostgresReady([string]$ContainerName, [string]$User, [string]$Database, [int]$TimeoutSeconds = 60) {
  Write-Host "Waiting for PostgreSQL to accept connections..." -ForegroundColor Yellow

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $null = docker exec $ContainerName pg_isready -U $User -d $Database 2>$null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "PostgreSQL is ready." -ForegroundColor Green
      return
    }

    Start-Sleep -Seconds 2
  }

  throw "PostgreSQL did not become ready within $TimeoutSeconds seconds."
}

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not installed or not on PATH."
  }
}

Write-Host "== MediaDB Windows bootstrap ==" -ForegroundColor Cyan

Require-Command git
Require-Command node
Require-Command npm

if ($UseDockerPostgres) {
  Require-Command docker

  $containerName = "mediadb-postgres"
  $exists = docker ps -a --format "{{.Names}}" | Select-String -SimpleMatch $containerName

  if ($exists -and $RecreateDbContainer) {
    Write-Host "Removing existing PostgreSQL container '$containerName'..." -ForegroundColor Yellow
    docker rm -f $containerName | Out-Null
    $exists = $null
  }

  if ($exists) {
    $currentImage = docker inspect --format "{{.Config.Image}}" $containerName
    if ($currentImage -notlike "pgvector/pgvector*") {
      Write-Host "Container '$containerName' uses image '$currentImage'." -ForegroundColor Yellow
      Write-Host "For vector support, recreate it with -RecreateDbContainer to use '$DbImage'." -ForegroundColor Yellow
    }
  }

  if (-not $exists) {
    Write-Host "Creating PostgreSQL Docker container '$containerName' using image '$DbImage'..." -ForegroundColor Yellow
    docker run --name $containerName `
      -e POSTGRES_USER=$DbUser `
      -e POSTGRES_PASSWORD=$DbPassword `
      -e POSTGRES_DB=$DbName `
      -p ${DbPort}:5432 `
      -d $DbImage | Out-Null
  }

  Write-Host "Starting PostgreSQL Docker container..." -ForegroundColor Yellow
  docker start $containerName | Out-Null

  Wait-PostgresReady -ContainerName $containerName -User $DbUser -Database $DbName

  Write-Host "Ensuring pgvector extension is enabled..." -ForegroundColor Yellow
  docker exec $containerName psql -U $DbUser -d $DbName -c "CREATE EXTENSION IF NOT EXISTS vector;" | Out-Null
}

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example" -ForegroundColor Green
}

if (Test-Path ".env") {
  $dbUrl = 'DATABASE_URL="postgresql://{0}:{1}@localhost:{2}/{3}?schema=public"' -f $DbUser, $DbPassword, $DbPort, $DbName
  $content = Get-Content ".env" -Raw

  if ($content -match "DATABASE_URL=") {
    $content = [regex]::Replace($content, "DATABASE_URL=.*", $dbUrl)
  }
  else {
    $content = $content.TrimEnd() + "`r`n" + $dbUrl + "`r`n"
  }

  Set-Content ".env" $content
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
