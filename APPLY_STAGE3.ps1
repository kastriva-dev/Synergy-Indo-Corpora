# Run from extracted patch folder. No secrets are stored in this script.
$ErrorActionPreference = 'Stop'
$target = 'D:\Kastriva\Synergy-Indo-Corpora'
if (!(Test-Path (Join-Path $target 'package.json'))) { throw "Folder project tidak ditemukan: $target" }
$old = Get-Location
try {
  Set-Location $target
  git rev-parse --is-inside-work-tree | Out-Null
  $status = git status --porcelain
  if ($status) { throw 'Ada perubahan Git yang belum disimpan. Commit atau stash dahulu sebelum menerapkan patch.' }
  $branch = (git branch --show-current).Trim()
  if ($branch -eq 'main') { git switch -c 'feature/admin-stage3-secure' }
  elseif ($branch -ne 'feature/admin-stage3-secure') { throw "Aktif di branch '$branch', bukan main/feature/admin-stage3-secure." }
  $items = @('.env.example','app/admin','app/api/admin','components/admin','lib/admin','gas/AdminCode.gs','docs/STAGE3_ADMIN.md')
  foreach ($item in $items) {
    $source = Join-Path $PSScriptRoot $item
    $dest = Join-Path $target $item
    if (!(Test-Path $source)) { throw "Patch tidak lengkap: $source" }
    if ($item -eq '.env.example' -and (Test-Path $dest)) {
      $current = Get-Content -Raw $dest
      $incoming = Get-Content -Raw $source
      foreach ($line in ($incoming -split "`r?`n")) {
        if ($line -match '^([A-Z_]+)=' -and $current -notmatch "(?m)^$($Matches[1])=") {
          Add-Content -Path $dest -Value $line
        }
      }
      continue
    }
    if (Test-Path $dest) { throw "Sudah ada file/folder '$dest'. Patch dihentikan agar tidak menimpa perubahan." }
    $parent = Split-Path $dest -Parent
    if (!(Test-Path $parent)) { New-Item -Type Directory -Force -Path $parent | Out-Null }
    Copy-Item -Path $source -Destination $dest -Recurse -Force
  }
  Write-Host 'PATCH STAGE 3 berhasil disalin ke branch feature/admin-stage3-secure.' -ForegroundColor Green
  Write-Host 'Lanjutkan: npm.cmd run typecheck ; npm.cmd run build' -ForegroundColor Cyan
} finally { Set-Location $old }
