<#
.SYNOPSIS
  StartPoint CN Launcher — one-shot update + release build.

.DESCRIPTION
  Reproduces the full pipeline:
    1. (optional) pull upstream startpoint-cn into the local server's `launcher-patches`
       branch — our patches live on that branch and merge cleanly with upstream.
    2. rebuild the server (tsc + tailwind).
    3. re-vendor the server runtime into resources/server (preserving the node20
       better-sqlite3 native module — never run `npm rebuild` here, it uses system node).
    4. sanity-check the bundled runtime (node / jdk / ffdec / build-tools / sqlite).
    5. tauri build  ->  StartPointCNLauncher_0.1.0_x64-setup.exe

  The 11GB CDN is NEVER bundled; it ships via GitHub Releases and lives in the
  per-user data dir at runtime. See PLAN.md / memory project-cn-launcher.

.EXAMPLE
  pwsh scripts/build-release.ps1                 # full build (no upstream pull)
  pwsh scripts/build-release.ps1 -PullUpstream   # also merge latest startpoint-cn
  pwsh scripts/build-release.ps1 -SkipServer     # launcher-only rebuild (server unchanged)
#>
[CmdletBinding()]
param(
  # Local checkout of the startpoint_cn server (on branch launcher-patches).
  [string]$ServerSrc = "D:\世界弹射物语国服\3. 服务端主体\startpoint_cn",
  # Pull + merge upstream/main into launcher-patches before building.
  [switch]$PullUpstream,
  # Skip the server rebuild + re-vendor (launcher front/back-end change only).
  [switch]$SkipServer
)

$ErrorActionPreference = "Stop"
$Launcher = Split-Path -Parent $PSScriptRoot          # repo root (scripts/ is under it)
$VendorDst = Join-Path $Launcher "resources\server"

# Ensure the Rust toolchain is reachable (non-interactive shells often lack it on PATH).
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  $cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
  if (Test-Path (Join-Path $cargoBin "cargo.exe")) { $env:Path = "$cargoBin;$env:Path" }
  else { throw "cargo not found — install Rust (https://rustup.rs) or add ~/.cargo/bin to PATH." }
}

function Step($n, $msg) { Write-Host "`n=== [$n] $msg ===" -ForegroundColor Cyan }

if (-not $SkipServer) {
  if (-not (Test-Path $ServerSrc)) { throw "Server source not found: $ServerSrc" }

  if ($PullUpstream) {
    Step 1 "Merge upstream startpoint-cn into launcher-patches"
    Push-Location $ServerSrc
    git checkout launcher-patches
    git fetch origin
    git merge origin/main --no-edit
    Pop-Location
  }

  Step 2 "Rebuild server (tsc + tailwind)"
  Push-Location $ServerSrc
  npm run build
  Pop-Location

  Step 3 "Re-vendor server runtime (preserve node20 node_modules)"
  # docs\generated holds character_table.json etc. that compiled routes require at runtime.
  foreach ($d in @("out","assets","data","web","docs\generated")) {
    robocopy "$ServerSrc\$d" "$VendorDst\$d" /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy $d failed ($LASTEXITCODE)" }
  }
  Copy-Item "$ServerSrc\package.json"      "$VendorDst\package.json"      -Force
  Copy-Item "$ServerSrc\package-lock.json" "$VendorDst\package-lock.json" -Force

  # Strip anything large/local that must never be bundled.
  foreach ($junk in @(".cdn",".database",".env")) {
    $p = Join-Path $VendorDst $junk
    if (Test-Path $p) { Remove-Item $p -Recurse -Force }
  }
}

Step 4 "Sanity-check bundled runtime"
$checks = @{
  "node.exe"                = "$Launcher\resources\node\node.exe"
  "vendored cn-server.js"   = "$VendorDst\out\cn-server.js"
  "better_sqlite3.node"     = "$VendorDst\node_modules\better-sqlite3\build\Release\better_sqlite3.node"
  "DC template"             = "$VendorDst\assets\default_player_template.json"
  "jdk\bin\jar.exe"         = "$Launcher\resources\jdk\bin\jar.exe"
  "ffdec.jar"               = "$Launcher\resources\tools\ffdec\ffdec.jar"
  "apksigner.jar"           = "$Launcher\resources\build-tools\lib\apksigner.jar"
  "patch-apk.mjs"           = "$Launcher\tools\patch-apk.mjs"
}
$missing = $false
foreach ($k in $checks.Keys) {
  $ok = Test-Path $checks[$k]
  Write-Host ("  [{0}] {1}" -f ($(if($ok){"OK"}else{"!!"})), $k)
  if (-not $ok) { $missing = $true }
}
if ($missing) { throw "Bundled runtime incomplete — assemble resources/ before building (see PLAN.md)." }

Step 5 "tauri build (NSIS installer)"
Push-Location $Launcher
npx tauri build
Pop-Location

$out = Get-ChildItem (Join-Path $Launcher "src-tauri\target\release\bundle\nsis") -Filter "StartPointCNLauncher_*_x64-setup.exe" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime | Select-Object -Last 1 -ExpandProperty FullName
if ($out -and (Test-Path $out)) {
  $mb = [math]::Round((Get-Item $out).Length / 1MB, 1)
  Write-Host "`nDONE -> $out ($mb MB)" -ForegroundColor Green
} else {
  Write-Host "`nBuild finished but installer not found at expected path; check bundle/nsis/." -ForegroundColor Yellow
}
