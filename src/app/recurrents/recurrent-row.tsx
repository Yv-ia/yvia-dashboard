"use client";
// Ligne d'un revenu récurrent. Le nom ouvre l'édition ; la cellule client ouvre
// le drawer du client. Réservé au delivery : la marge est affichée.

import { TableCell, TableRow } from "@/components/ui/table";
import { formatEuro, formatDate } from "@/lib/format";
import { EntityLink } from "@/app/_drawer/drawer-stack";
import { labelCategorieRecurrent, coutDerivePlanning } from "@/lib/recurrents/categorie";
import { RecurrentFormDialog } from "./recurrent-form-dialog";
import { modifierRecurrent } from "./actions";

export type LigneRecurrent = {
  id: number;
  clientId: number;
  clientNom: string;
  nom: string;
  categorie: string;
  montantRecurrent: string;
  coutRecurrent: string | null;
  dateDebut: string;
  dateFin: string | null;
};

export function RecurrentRow({
  recurrent,
  clientsListe,
}: {
  recurrent: LigneRecurrent;
  clientsListe: { id: number; nom: string }[];
}) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const mrr = Number(recurrent.montantRecurrent);
  const cout = recurrent.coutRecurrent != null ? Number(recurrent.coutRecurrent) : null;
  const regie = coutDerivePlanning(recurrent.categorie);

  return (
    <TableRow>
      <TableCell className="font-medium" onClick={stop}>
        <RecurrentFormDialog
          action={modifierRecurrent}
          recurrent={recurrent}
          clientsListe={clientsListe}
          titre="Modifier le récurrent"
          trigger={
            <button className="text-left font-medium hover:text-primary hover:underline">
              {recurrent.nom}
            </button>
          }
        />
      </TableCell>
      <TableCell onClick={stop}>
        <EntityLink type="client" id={recurrent.clientId} className="hover:text-primary hover:underline">
          {recurrent.clientNom}
        </EntityLink>
      </TableCell>
      <TableCell>{labelCategorieRecurrent(recurrent.categorie)}</TableCell>
      <TableCell className="text-right">{formatEuro(mrr)}</TableCell>
      <TableCell className="text-right">
        {regie ? (
          <span className="text-muted-foreground">selon planning</span>
        ) : cout != null ? (
          formatEuro(cout)
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right">
        {!regie && cout != null ? formatEuro(mrr - cout) : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatDate(recurrent.dateDebut)}
        {" → "}
        {recurrent.dateFin ? formatDate(recurrent.dateFin) : "en cours"}
      </TableCell>
    </TableRow>
  );
}
