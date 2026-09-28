using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MusicDB.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class DmAttachments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "attachment_file",
                schema: "lab",
                table: "direct_messages",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "attachment_name",
                schema: "lab",
                table: "direct_messages",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "attachment_size",
                schema: "lab",
                table: "direct_messages",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "music_id",
                schema: "lab",
                table: "direct_messages",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "attachment_file",
                schema: "lab",
                table: "direct_messages");

            migrationBuilder.DropColumn(
                name: "attachment_name",
                schema: "lab",
                table: "direct_messages");

            migrationBuilder.DropColumn(
                name: "attachment_size",
                schema: "lab",
                table: "direct_messages");

            migrationBuilder.DropColumn(
                name: "music_id",
                schema: "lab",
                table: "direct_messages");
        }
    }
}
