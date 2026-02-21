<#
.SYNOPSIS
Creates timestamped backups for repository state, Cloudflare Pages config, and Supabase database.

.DESCRIPTION
The script creates a new folder under the output directory and attempts:
1) Git backup: bundle + HEAD zip archive + basic metadata.
2) Cloudflare Pages backup: project JSON (+ deployments JSON if available).
3) Supabase backup: pg_dump custom dump + schema-only SQL.

Each section can be skipped independently. Missing credentials/tools skip that section with a warning.

.EXAMPLE
pwsh ./scripts/backup-all.ps1

.EXAMPLE
pwsh ./scripts/backup-all.ps1 -OutputDir backups -SkipCloudflare

.NOTES
Cloudflare env vars:
  CLOUDFLARE_API_TOKEN
  CF_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID)
  CF_PROJECT_NAME (or CLOUDFLARE_PAGES_PROJECT)

Supabase env vars:
  SUPABASE_DB_URL
#>

[CmdletBinding()]
param(
  [string]$OutputDir = "backups",
  [switch]$SkipGit,
  [switch]$SkipCloudflare,
  [switch]$SkipSupabase,
  [string]$SupabaseDbUrl = $env:SUPABASE_DB_URL,
  [string]$CloudflareApiToken = $env:CLOUDFLARE_API_TOKEN,
  [string]$CloudflareAccountId = $(if ($env:CF_ACCOUNT_ID) { $env:CF_ACCOUNT_ID } else { $env:CLOUDFLARE_ACCOUNT_ID }),
  [string]$CloudflareProjectName = $(if ($env:CF_PROJECT_NAME) { $env:CF_PROJECT_NAME } else { $env:CLOUDFLARE_PAGES_PROJECT })
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Warn {
  param([string]$Message)
  Write-Host "Warning: $Message" -ForegroundColor Yellow
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Command $($Arguments -join ' ')"
  }
}

function Has-Command {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path -Path $OutputDir -ChildPath "backup-$timestamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

Write-Host "Backup directory: $backupRoot" -ForegroundColor Green

if (-not $SkipGit) {
  Write-Step "Backing up Git repository"
  if (-not (Has-Command "git")) {
    Write-Warn "git not found. Skipping Git backup."
  }
  else {
    try {
      $isRepo = (& git rev-parse --is-inside-work-tree 2>$null)
      if ($LASTEXITCODE -ne 0 -or $isRepo.Trim() -ne "true") {
        throw "Current directory is not a Git repository."
      }

      # Optional refresh; if it fails, continue with local refs.
      & git fetch --all --tags 2>$null | Out-Null

      $bundlePath = Join-Path $backupRoot "repo.bundle"
      $headZipPath = Join-Path $backupRoot "source-head.zip"
      $headPath = Join-Path $backupRoot "head.txt"
      $statusPath = Join-Path $backupRoot "working-tree-status.txt"

      Invoke-External -Command "git" -Arguments @("bundle", "create", $bundlePath, "--all")
      Invoke-External -Command "git" -Arguments @("archive", "--format=zip", "--output=$headZipPath", "HEAD")

      (& git rev-parse HEAD) | Out-File -FilePath $headPath -Encoding utf8
      (& git status --short --branch) | Out-File -FilePath $statusPath -Encoding utf8

      Write-Host "Git backup complete." -ForegroundColor Green
    }
    catch {
      Write-Warn "Git backup failed: $($_.Exception.Message)"
    }
  }
}

if (-not $SkipCloudflare) {
  Write-Step "Backing up Cloudflare Pages project config"
  if ([string]::IsNullOrWhiteSpace($CloudflareApiToken) -or [string]::IsNullOrWhiteSpace($CloudflareAccountId) -or [string]::IsNullOrWhiteSpace($CloudflareProjectName)) {
    Write-Warn "Cloudflare env vars are incomplete. Skipping Cloudflare backup."
    Write-Warn "Required: CLOUDFLARE_API_TOKEN + CF_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID) + CF_PROJECT_NAME (or CLOUDFLARE_PAGES_PROJECT)."
  }
  else {
    try {
      $headers = @{ Authorization = "Bearer $CloudflareApiToken" }
      $projectUrl = "https://api.cloudflare.com/client/v4/accounts/$CloudflareAccountId/pages/projects/$CloudflareProjectName"
      $deploymentsUrl = "https://api.cloudflare.com/client/v4/accounts/$CloudflareAccountId/pages/projects/$CloudflareProjectName/deployments"

      $projectJsonPath = Join-Path $backupRoot "cloudflare-pages-project.json"
      $deploymentsJsonPath = Join-Path $backupRoot "cloudflare-pages-deployments.json"

      $projectResponse = Invoke-RestMethod -Headers $headers -Uri $projectUrl -Method Get
      $projectResponse | ConvertTo-Json -Depth 100 | Out-File -FilePath $projectJsonPath -Encoding utf8

      try {
        $deploymentsResponse = Invoke-RestMethod -Headers $headers -Uri $deploymentsUrl -Method Get
        $deploymentsResponse | ConvertTo-Json -Depth 100 | Out-File -FilePath $deploymentsJsonPath -Encoding utf8
      }
      catch {
        Write-Warn "Could not fetch deployments list: $($_.Exception.Message)"
      }

      Write-Host "Cloudflare backup complete." -ForegroundColor Green
    }
    catch {
      Write-Warn "Cloudflare backup failed: $($_.Exception.Message)"
    }
  }
}

if (-not $SkipSupabase) {
  Write-Step "Backing up Supabase database"
  if ([string]::IsNullOrWhiteSpace($SupabaseDbUrl)) {
    Write-Warn "SUPABASE_DB_URL is not set and -SupabaseDbUrl was not provided. Skipping Supabase backup."
  }
  elseif (-not (Has-Command "pg_dump")) {
    Write-Warn "pg_dump not found in PATH. Skipping Supabase backup."
  }
  else {
    try {
      $dumpPath = Join-Path $backupRoot "supabase.dump"
      $schemaPath = Join-Path $backupRoot "supabase-schema.sql"

      Invoke-External -Command "pg_dump" -Arguments @("--format=custom", "--no-owner", "--no-privileges", "--file=$dumpPath", $SupabaseDbUrl)
      Invoke-External -Command "pg_dump" -Arguments @("--schema-only", "--no-owner", "--no-privileges", "--file=$schemaPath", $SupabaseDbUrl)

      Write-Host "Supabase backup complete." -ForegroundColor Green
    }
    catch {
      Write-Warn "Supabase backup failed: $($_.Exception.Message)"
    }
  }
}

Write-Step "Backup summary"
Get-ChildItem -Path $backupRoot -File | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

Write-Host ""
Write-Host "Done. Backup folder: $backupRoot" -ForegroundColor Green
