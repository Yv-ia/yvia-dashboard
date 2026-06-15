ALTER TABLE "projets" ALTER COLUMN "statut_commercial" SET DEFAULT 'gagne';--> statement-breakpoint
-- Le pipeline commercial vit désormais dans `opportunites`. Les projets NON gagnés
-- (prospection / perdu) sont des sujets de pipeline, pas du delivery : on les déplace
-- vers `opportunites` (type forfait, montant estimé = budget, ordre = id, actif pour
-- qu'ils apparaissent dans le Kanban), puis on les retire de `projets` (la cascade
-- nettoie les encaissements / décaissements / jalons éventuels). Les projets déjà
-- gagnés restent inchangés.
INSERT INTO "opportunites" ("client_id", "nom", "type", "statut", "montant_estime", "ordre", "actif")
SELECT "client_id", "nom", 'forfait', "statut_commercial", "budget", "id", true
FROM "projets"
WHERE "statut_commercial" <> 'gagne';--> statement-breakpoint
DELETE FROM "projets" WHERE "statut_commercial" <> 'gagne';
