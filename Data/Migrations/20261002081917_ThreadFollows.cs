using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MusicDB.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ThreadFollows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "reply_to_post_id",
                schema: "lab",
                table: "discussion_posts",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "thread_follows",
                schema: "lab",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    thread_id = table.Column<int>(type: "integer", nullable: false),
                    followed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_thread_follows", x => new { x.user_id, x.thread_id });
                    table.ForeignKey(
                        name: "FK_thread_follows_discussion_threads_thread_id",
                        column: x => x.thread_id,
                        principalSchema: "lab",
                        principalTable: "discussion_threads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_thread_follows_thread_id",
                schema: "lab",
                table: "thread_follows",
                column: "thread_id");

            // Учасники наявних гілок (автори й ті, хто відповідав) — одразу підписані з моменту першого свого допису;
            // усе старе вважаємо прочитаним.
            migrationBuilder.Sql("""
                INSERT INTO lab.thread_follows (user_id, thread_id, followed_at, last_read_at)
                SELECT user_id, thread_id, MIN(at), now() FROM (
                    SELECT author_id AS user_id, id AS thread_id, created_at AS at FROM lab.discussion_threads WHERE author_id IS NOT NULL
                    UNION ALL
                    SELECT author_id, thread_id, created_at FROM lab.discussion_posts WHERE author_id IS NOT NULL
                ) p
                GROUP BY user_id, thread_id
                ON CONFLICT DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "thread_follows",
                schema: "lab");

            migrationBuilder.DropColumn(
                name: "reply_to_post_id",
                schema: "lab",
                table: "discussion_posts");
        }
    }
}
