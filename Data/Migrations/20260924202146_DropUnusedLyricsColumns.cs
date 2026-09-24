using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MusicDB.Api.Data.Migrations
{
    /// <summary>
    /// Прибирає music.lyrics_license і music.lyrics_source — колонки, що існували лише на
    /// продакшні (поза моделлю й кодом), усі значення NULL. IF EXISTS — бо локальних баз
    /// і нових баз після Baseline їх може не бути.
    /// </summary>
    public partial class DropUnusedLyricsColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE lab.music DROP COLUMN IF EXISTS lyrics_license;
                ALTER TABLE lab.music DROP COLUMN IF EXISTS lyrics_source;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE lab.music ADD COLUMN IF NOT EXISTS lyrics_license text;
                ALTER TABLE lab.music ADD COLUMN IF NOT EXISTS lyrics_source text;
                """);
        }
    }
}
