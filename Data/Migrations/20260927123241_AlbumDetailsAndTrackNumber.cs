using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MusicDB.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AlbumDetailsAndTrackNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<short>(
                name: "track_number",
                schema: "lab",
                table: "music",
                type: "smallint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cover_url",
                schema: "lab",
                table: "album",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "release",
                schema: "lab",
                table: "album",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "track_number",
                schema: "lab",
                table: "music");

            migrationBuilder.DropColumn(
                name: "cover_url",
                schema: "lab",
                table: "album");

            migrationBuilder.DropColumn(
                name: "release",
                schema: "lab",
                table: "album");
        }
    }
}
