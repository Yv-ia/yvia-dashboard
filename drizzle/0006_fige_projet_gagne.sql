ALTER TABLE "projets" ALTER COLUMN "statut_commercial" SET DEFAULT 'gagne';--> statement-breakpoint
-- Le pipeline commercial vit désormais dans `opportunites`. Les projets existants
-- sont du delivery : on les fige tous en "gagne" (cf. schema.ts).
UPDATE "projets" SET "statut_commercial" = 'gagne';