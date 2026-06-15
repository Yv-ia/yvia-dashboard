CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"description" text,
	"statut" text DEFAULT 'a_faire' NOT NULL,
	"epic" boolean DEFAULT false NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL
);
