ALTER TABLE "projets" ALTER COLUMN "statut_commercial" SET DEFAULT 'gagne';--> statement-breakpoint
-- Filet de sécurité : avant toute suppression, on archive les lignes qui vont
-- disparaître — les projets non gagnés ET leurs échéances/jalons emportés par la
-- cascade — dans des tables `_backup_0006_*`. Ces tables sont inconnues de l'ORM
-- (aucun impact applicatif) et restent récupérables en SQL ; À DROPPER MANUELLEMENT
-- une fois la migration validée en production. Les DROP IF EXISTS rendent l'étape
-- rejouable (relance manuelle après un échec partiel sans repartir d'une base vierge).
DROP TABLE IF EXISTS "_backup_0006_jalons";--> statement-breakpoint
DROP TABLE IF EXISTS "_backup_0006_decaissements";--> statement-breakpoint
DROP TABLE IF EXISTS "_backup_0006_encaissements";--> statement-breakpoint
DROP TABLE IF EXISTS "_backup_0006_projets";--> statement-breakpoint
CREATE TABLE "_backup_0006_projets" AS SELECT * FROM "projets" WHERE "statut_commercial" <> 'gagne';--> statement-breakpoint
CREATE TABLE "_backup_0006_encaissements" AS SELECT "e".* FROM "encaissements" "e" JOIN "_backup_0006_projets" "p" ON "e"."projet_id" = "p"."id";--> statement-breakpoint
CREATE TABLE "_backup_0006_decaissements" AS SELECT "d".* FROM "decaissements" "d" JOIN "_backup_0006_projets" "p" ON "d"."projet_id" = "p"."id";--> statement-breakpoint
CREATE TABLE "_backup_0006_jalons" AS SELECT "j".* FROM "jalons" "j" JOIN "_backup_0006_projets" "p" ON "j"."projet_id" = "p"."id";--> statement-breakpoint
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
