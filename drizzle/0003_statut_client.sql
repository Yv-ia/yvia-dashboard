ALTER TABLE "clients" ADD COLUMN "statut" text DEFAULT 'lead' NOT NULL;
--> statement-breakpoint
-- Les clients déjà en base sont des comptes signés (la colonne n'existait pas
-- avant). On les bascule en 'signe' ; le défaut 'lead' ne vaut que pour les
-- nouveaux clients créés après cette migration.
UPDATE "clients" SET "statut" = 'signe';
