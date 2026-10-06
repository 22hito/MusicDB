# Перенесення даних v1 → v2 (запускає власник; доступи не виводяться і нікуди не зберігаються).
#   cd E:\MusicDB\MusicDB-v2 ; powershell -ExecutionPolicy Bypass -File tools\legacy-migrate\run-from-v1.ps1
# 1) рядок підключення v1 береться з appsettings.Local.json (формат Npgsql) і перетворюється на postgres://…
# 2) адресу нової бази (DATABASE_URL_UNPOOLED з Vercel → Storage → Neon → .env.local) вводите вручну
param(
  [string]$SettingsPath = "E:\MusicDB\MusicDB-repo\appsettings.Local.json",
  # -Check: лише перевірити підключення до v1, без перенесення
  [switch]$Check
)
$ErrorActionPreference = "Stop"

$settings = Get-Content $SettingsPath -Raw | ConvertFrom-Json
$cs = $settings.ConnectionStrings.Postgres
if (-not $cs) { throw "У $SettingsPath немає ConnectionStrings.Postgres" }

if ($cs -match '^postgres(ql)?://') {
  $legacy = $cs
} else {
  $parts = @{}
  foreach ($kv in $cs -split ';') {
    if ($kv -match '^\s*([^=]+?)\s*=\s*(.*)$') { $parts[$Matches[1].ToLower().Replace(' ', '')] = $Matches[2] }
  }
  $host_ = $parts['host']; if (-not $host_) { $host_ = $parts['server'] }
  if ($host_ -match '^(.+):(\d+)$') { $host_ = $Matches[1]; if (-not $parts['port']) { $parts['port'] = $Matches[2] } }
  $db = $parts['database']; $user = $parts['username']; if (-not $user) { $user = $parts['userid'] }
  $pass = $parts['password']; $port = $parts['port']; if (-not $port) { $port = '5432' }
  $legacy = "postgres://$([uri]::EscapeDataString($user)):$([uri]::EscapeDataString($pass))@${host_}:$port/$([uri]::EscapeDataString($db))?sslmode=require"
}

if ($Check) {
  $env:LEGACY_DATABASE_URL = $legacy
  pnpm --filter @musicdb/legacy-migrate check
  Remove-Item Env:LEGACY_DATABASE_URL
  exit
}

$target = Read-Host "Вставте DATABASE_URL_UNPOOLED нової бази (Neon, v2)"
if (-not ($target -match '^postgres(ql)?://')) { throw "Це не схоже на адресу postgres://" }

$env:LEGACY_DATABASE_URL = $legacy
$env:DATABASE_URL = $target
Write-Host "Переношу дані з v1 (стара база лише читається)..."
pnpm --filter @musicdb/legacy-migrate migrate
$ok = $LASTEXITCODE -eq 0
Remove-Item Env:LEGACY_DATABASE_URL, Env:DATABASE_URL
if ($ok) { Write-Host "Готово." } else { Write-Host "Перенесення не вдалося: надішліть текст помилки вище (без паролів)." -ForegroundColor Red }
