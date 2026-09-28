using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MusicDB.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ArtistBioEn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "bio_en",
                schema: "lab",
                table: "artists",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "bio_en",
                schema: "lab",
                table: "artists");
        }
    }
}
