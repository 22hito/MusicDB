# Перенесення даних v1 → v2 (запускає власник; доступи не виводяться і нікуди не зберігаються).
#   cd E:\MusicDB\MusicDB-v2 ; powershell -ExecutionPolicy Bypass -File tools\legacy-migrate\run-from-v1.ps1
# 1) рядок підключення v1 береться з appsettings.Local.json (формат Npgsql) і перетворюється на postgres://…
# 2) адресу нової бази (DATABASE_URL_UNPOOLED з Vercel → Storage → Neon → .env.local) вводите вручну
param(
  [string]$SettingsPath = "E:\MusicDB\MusicDB-repo\appsettings.Local.json"
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
  $db = $parts['database']; $user = $parts['username']; if (-not $user) { $user = $parts['userid'] }
  $pass = $parts['password']; $port = $parts['port']; if (-not $port) { $port = '5432' }
  $legacy = "postgres://$([uri]::EscapeDataString($user)):$([uri]::EscapeDataString($pass))@${host_}:$port/${db}?sslmode=require"
}

$target = Read-Host "Вставте DATABASE_URL_UNPOOLED нової бази (Neon, v2)"
if (-not ($target -match '^postgres(ql)?://')) { throw "Це не схоже на адресу postgres://" }

$env:LEGACY_DATABASE_URL = $legacy
$env:DATABASE_URL = $target
Write-Host "Переношу дані з v1 (стара база лише читається)..."
pnpm --filter @musicdb/legacy-migrate migrate
Remove-Item Env:LEGACY_DATABASE_URL, Env:DATABASE_URL
Write-Host "Готово. Далі — звірка каталогу: tools\catalog-verify\run-prod.ps1"
