using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MusicDB.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class CorrectionRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "correction_requests",
                schema: "lab",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: true),
                    music_id = table.Column<int>(type: "integer", nullable: true),
                    artist_id = table.Column<int>(type: "integer", nullable: true),
                    field = table.Column<string>(type: "text", nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    source_url = table.Column<string>(type: "text", nullable: true),
                    target_label = table.Column<string>(type: "text", nullable: false),
                    audio_file = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    admin_note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    resolved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    resolved_by = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_correction_requests", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "correction_requests",
                schema: "lab");
        }
    }
}
