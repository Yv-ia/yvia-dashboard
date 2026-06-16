ALTER TABLE "encaissements" ALTER COLUMN "projet_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "encaissements" ADD COLUMN "client_id" integer;--> statement-breakpoint
ALTER TABLE "encaissements" ADD COLUMN "mission_id" integer;--> statement-breakpoint
ALTER TABLE "encaissements" ADD CONSTRAINT "encaissements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encaissements" ADD CONSTRAINT "encaissements_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;