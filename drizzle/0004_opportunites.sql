CREATE TABLE "opportunites" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"nom" text NOT NULL,
	"type" text DEFAULT 'forfait' NOT NULL,
	"statut" text DEFAULT 'a_qualifier' NOT NULL,
	"montant_estime" numeric(12, 2),
	"ordre" integer DEFAULT 0 NOT NULL,
	"projet_id" integer,
	"actif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opportunites" ADD CONSTRAINT "opportunites_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunites" ADD CONSTRAINT "opportunites_projet_id_projets_id_fk" FOREIGN KEY ("projet_id") REFERENCES "public"."projets"("id") ON DELETE no action ON UPDATE no action;