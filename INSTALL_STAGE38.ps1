param(
    [string]$ProjectRoot = 'D:\Kastriva\Synergy-Indo-Corpora'
)
$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
if (-not (Test-Path (Join-Path $ProjectRoot 'package.json'))) { throw 'Folder proyek tidak ditemukan / package.json tidak ada.' }
Push-Location $ProjectRoot
try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git tidak ditemukan.' }
    $branch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $branch) { throw 'Folder proyek belum berada di Git repository yang benar.' }
    if ($branch -eq 'main') { throw 'TIDAK BOLEH install dari main. Buat branch feature/media-security-stage38 dahulu.' }
    $dirty = @(& git status --porcelain)
    if ($dirty.Count -gt 0 -and ($dirty | Where-Object { $_.Trim() })) {
        throw 'Perubahan Git belum di-commit. Simpan commit di branch Anda dahulu supaya patch aman.'
    }
    $paths = @(
        'components/PremiumHome.tsx', 'components/admin/AdminDashboard.tsx',
        'components/media/SafeMediaImage.tsx', 'lib/content.ts', 'lib/media-url.ts',
        'public/media-unavailable.svg', 'app/admin/admin.css',
        'app/api/admin/content/route.ts', 'app/api/admin/upload/route.ts',
        'gas/AdminCode.gs'
    )
    $backup = Join-Path $env:TEMP ('synergy-stage38-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -Path $backup -ItemType Directory -Force | Out-Null
    foreach ($p in $paths) {
        $from = Join-Path $src $p
        $to = Join-Path $ProjectRoot $p
        if (-not (Test-Path $from)) { throw "Patch tidak lengkap: $p" }
        if (Test-Path $to) {
            $existingBackup = Join-Path $backup $p
            New-Item -ItemType Directory -Path (Split-Path $existingBackup) -Force | Out-Null
            Copy-Item -LiteralPath $to -Destination $existingBackup
        }
    }
    foreach ($p in $paths) {
        $from = Join-Path $src $p
        $to = Join-Path $ProjectRoot $p
        New-Item -ItemType Directory -Path (Split-Path $to) -Force | Out-Null
        Copy-Item -LiteralPath $from -Destination $to -Force
        Write-Host "PATCHED: $p" -ForegroundColor Green
    }
    Write-Host "`nBackup file lama: $backup" -ForegroundColor Cyan
    Write-Host 'Pemeriksaan selanjutnya: npm.cmd run typecheck && npm.cmd run build' -ForegroundColor Yellow
    Write-Host 'GAS online TIDAK berubah oleh installer ini. Jangan push main.' -ForegroundColor Yellow
} finally { Pop-Location }
