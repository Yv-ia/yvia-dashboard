ALTER TABLE "opportunites" ADD COLUMN "date_gagne" date;--> statement-breakpoint
-- Historique : les opportunités déjà gagnées (sans date de signature connue) sont
-- datées au 1er mai 2026 par défaut ; l'utilisateur les ajustera à la main ensuite.
UPDATE "opportunites" SET "date_gagne" = '2026-05-01' WHERE "statut" = 'gagne' AND "date_gagne" IS NULL;