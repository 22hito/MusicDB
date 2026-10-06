# Звірка каталогу з офіційними платформами на продакшн-базі v2 (запускає власник).
#   cd E:\MusicDB\MusicDB-v2 ; powershell -ExecutionPolicy Bypass -File tools\catalog-verify\run-prod.ps1
# Довго (години), можна переривати й запускати знову — звірені пісні пропускаються, відповіді платформ у кеші.
$target = Read-Host "Вставте DATABASE_URL_UNPOOLED нової бази (Neon, v2)"
if (-not ($target -match '^postgres(ql)?://')) { throw "Це не схоже на адресу postgres://" }
$env:DATABASE_URL = $target
pnpm --filter @musicdb/catalog-verify verify
Remove-Item Env:DATABASE_URL
