CREATE TABLE "recurrents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"nom" text NOT NULL,
	"categorie" text DEFAULT 'regie' NOT NULL,
	"montant_recurrent" numeric(12, 2) NOT NULL,
	"cout_recurrent" numeric(12, 2),
	"frequence" text DEFAULT 'mensuel' NOT NULL,
	"date_debut" date NOT NULL,
	"date_fin" date,
	"actif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "recurrent_id" integer;--> statement-breakpoint
ALTER TABLE "opportunites" ADD COLUMN "recurrent_id" integer;--> statement-breakpoint
ALTER TABLE "recurrents" ADD CONSTRAINT "recurrents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_recurrent_id_recurrents_id_fk" FOREIGN KEY ("recurrent_id") REFERENCES "public"."recurrents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunites" ADD CONSTRAINT "opportunites_recurrent_id_recurrents_id_fk" FOREIGN KEY ("recurrent_id") REFERENCES "public"."recurrents"("id") ON DELETE no action ON UPDATE no action;