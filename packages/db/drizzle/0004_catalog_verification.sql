CREATE TABLE "catalog_checks" (
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" text NOT NULL,
	"sources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"applied" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"conflicts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_checks_entity_type_entity_id_pk" PRIMARY KEY("entity_type","entity_id")
);
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "bio_source" jsonb;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "external_ids" jsonb;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "links" jsonb;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "begin_year" smallint;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "external_ids" jsonb;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "external_ids" jsonb;--> statement-breakpoint
CREATE INDEX "catalog_checks_status_idx" ON "catalog_checks" USING btree ("status");