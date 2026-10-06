CREATE TABLE "battle_wins" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"user_id" text NOT NULL,
	"battle_key" text NOT NULL,
	"pool_size" integer NOT NULL,
	"pool_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battle_wins" ADD CONSTRAINT "battle_wins_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_wins" ADD CONSTRAINT "battle_wins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "battle_wins_user_battle_key" ON "battle_wins" USING btree ("user_id","battle_key");--> statement-breakpoint
CREATE INDEX "battle_wins_track_idx" ON "battle_wins" USING btree ("track_id");