-- Backfill : recrée une carte « Gagné » dans le Kanban des opportunités pour chaque
-- projet forfait ACTIF qui n'a pas déjà une opportunité liée. But : faire apparaître
-- les affaires déjà gagnées (ex. Ircam Amplify, APG extension lot 1) dans le pipeline.
-- Périmètre : projets forfait uniquement (la régie / MCO n'est pas concernée).
-- Dédoublonnage : on saute les projets déjà reliés à une opportunité (NOT EXISTS).
-- Montant : budget du projet (montant fixe forfait). La carte est reliée au projet
-- (projet_id) → elle s'affiche « Converti en projet », non reconvertible.

-- Filet de sécurité : trace des opportunités créées par ce backfill (rejouable).
DROP TABLE IF EXISTS "_backup_0007_opportunites_creees";--> statement-breakpoint
CREATE TABLE "_backup_0007_opportunites_creees" (projet_id integer);--> statement-breakpoint
INSERT INTO "_backup_0007_opportunites_creees" ("projet_id")
SELECT "p"."id"
FROM "projets" "p"
WHERE "p"."actif" = true
  AND NOT EXISTS (SELECT 1 FROM "opportunites" "o" WHERE "o"."projet_id" = "p"."id");--> statement-breakpoint

INSERT INTO "opportunites" ("client_id", "nom", "type", "statut", "montant_estime", "ordre", "projet_id", "actif")
SELECT "p"."client_id", "p"."nom", 'forfait', 'gagne', "p"."budget", "p"."id", "p"."id", true
FROM "projets" "p"
WHERE "p"."actif" = true
  AND NOT EXISTS (SELECT 1 FROM "opportunites" "o" WHERE "o"."projet_id" = "p"."id");
