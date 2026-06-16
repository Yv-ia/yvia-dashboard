"use client";
// Échéancier des ENCAISSEMENTS DIRECTS (hors deals forfait) : « j'ai reçu un
// paiement de tel client, tel montant, telle mission ». Vue par événement, façon
// échéancier de décaissements : réalisé / prévu / en retard, avec saisie d'un
// nouvel encaissement, « Marquer encaissé » en ligne et suppression.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatDate } from "@/lib/format";
import { EntityLink } from "@/app/_drawer/drawer-stack";
import {
  ajouterEncaissementDirect,
  supprimerEncaissementDirect,
  marquerEncaissementDirectRealise,
} from "./actions";

export type EncaissementDirect = {
  id: number;
  date: string;
  montant: string;
  libelle: string | null;
  statut: string;
  clientId: number;
  clientNom: string;
  missionId: number | null;
  missionNom: string | null;
};

type OptionClient = { id: number; nom: string };
type OptionMission = { id: number; nom: string; clientId: number };

export function EncaissementsDirects({
  encaissements,
  clientsActifs,
  missionsActives,
  aujourdhui,
}: {
  encaissements: EncaissementDirect[];
  clientsActifs: OptionClient[];
  missionsActives: OptionMission[];
  aujourdhui: string; // 'YYYY-MM-DD' (calculé côté serveur pour rester stable)
}) {
  const router = useRouter();

  const estPrevu = (e: EncaissementDirect) => e.statut === "prevu";
  const enRetard = (e: EncaissementDirect) => estPrevu(e) && e.date < aujourdhui;

  const realise = encaissements
    .filter((e) => !estPrevu(e))
    .reduce((s, e) => s + Number(e.montant), 0);
  const prevu = encaissements.filter(estPrevu).reduce((s, e) => s + Number(e.montant), 0);
  const retard = encaissements.filter(enRetard).reduce((s, e) => s + Number(e.montant), 0);

  const lignes = useMemo(
    () => [...encaissements].sort((a, b) => b.date.localeCompare(a.date)),
    [encaissements]
  );

  async function realiser(id: number) {
    const fd = new FormData();
    fd.set("id", String(id));
    const res = await marquerEncaissementDirectRealise(fd);
    if (res.ok) {
      toast.success("Encaissement confirmé.");
      router.refresh();
    } else {
      toast.error(res.message ?? "Action impossible.");
    }
  }

  async function supprimer(id: number) {
    const fd = new FormData();
    fd.set("id", String(id));
    const res = await supprimerEncaissementDirect(fd);
    if (res.ok) {
      toast.success("Encaissement supprimé.");
      router.refresh();
    } else {
      toast.error(res.message ?? "Suppression impossible.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Encaissements directs</CardTitle>
          <p className="text-sm text-muted-foreground">
            Paiements reçus d&apos;un client (hors deal forfait), par mission.
          </p>
        </div>
        <AjoutEncaissementDialog
          clientsActifs={clientsActifs}
          missionsActives={missionsActives}
          aujourdhui={aujourdhui}
          onAjout={() => router.refresh()}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Synthese titre="Encaissé" valeur={formatEuro(realise)} />
          <Synthese titre="Prévu (reste)" valeur={formatEuro(prevu)} />
          <Synthese titre="En retard" valeur={formatEuro(retard)} accent={retard > 0} />
        </div>

        {lignes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun encaissement direct. Cliquez sur « Ajouter un encaissement » pour en saisir un.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Mission</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((e) => (
                <TableRow key={e.id} className={enRetard(e) ? "bg-rose-50/50" : undefined}>
                  <TableCell>
                    <span className="font-medium">{formatDate(e.date)}</span>
                    {e.libelle ? (
                      <span className="block text-xs text-muted-foreground">{e.libelle}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <EntityLink
                      type="client"
                      id={e.clientId}
                      className="hover:text-primary hover:underline"
                    >
                      {e.clientNom}
                    </EntityLink>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.missionNom ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEuro(Number(e.montant))}
                  </TableCell>
                  <TableCell>
                    {estPrevu(e) ? (
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                          enRetard(e)
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {enRetard(e) ? "En retard" : "Prévu"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Encaissé
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {estPrevu(e) ? (
                        <Button variant="outline" size="sm" onClick={() => realiser(e.id)}>
                          Marquer encaissé
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-rose-600"
                        onClick={() => supprimer(e.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatEuro(realise + prevu)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AjoutEncaissementDialog({
  clientsActifs,
  missionsActives,
  aujourdhui,
  onAjout,
}: {
  clientsActifs: OptionClient[];
  missionsActives: OptionMission[];
  aujourdhui: string;
  onAjout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [missionId, setMissionId] = useState("");
  const [statut, setStatut] = useState("encaisse");

  // Les missions proposées sont filtrées par le client choisi.
  const missionsClient = useMemo(
    () => missionsActives.filter((m) => String(m.clientId) === clientId),
    [missionsActives, clientId]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="sm">
            Ajouter un encaissement
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un encaissement</DialogTitle>
        </DialogHeader>

        <form
          action={async (formData) => {
            const res = await ajouterEncaissementDirect(formData);
            if (res.ok) {
              toast.success("Encaissement ajouté.");
              setOpen(false);
              setClientId("");
              setMissionId("");
              setStatut("encaisse");
              onAjout();
            } else {
              toast.error(res.message ?? "Une erreur est survenue.");
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="enc-client">Client *</Label>
            <Select
              id="enc-client"
              name="clientId"
              required
              value={clientId}
              onValueChange={(v) => {
                setClientId(v);
                setMissionId(""); // le client change → on réinitialise la mission
              }}
              placeholder="Choisir un client"
              options={clientsActifs.map((c) => ({ value: c.id, label: c.nom }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="enc-mission">Mission</Label>
            <Select
              id="enc-mission"
              name="missionId"
              value={missionId}
              onValueChange={setMissionId}
              disabled={!clientId}
              placeholder={
                !clientId
                  ? "Choisir d'abord un client"
                  : missionsClient.length === 0
                    ? "Aucune mission pour ce client"
                    : "Mission (optionnel)"
              }
              options={missionsClient.map((m) => ({ value: m.id, label: m.nom }))}
            />
            <p className="text-xs text-muted-foreground">
              Optionnel : la mission concernée par ce paiement.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="enc-date">Date *</Label>
            <Input id="enc-date" name="date" type="date" defaultValue={aujourdhui} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="enc-montant">Montant (€) *</Label>
            <Input id="enc-montant" name="montant" type="number" min="0" step="1" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="enc-libelle">Libellé</Label>
            <Input id="enc-libelle" name="libelle" placeholder="Optionnel (ex : facture #142)" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="enc-statut">Statut</Label>
            <Select
              id="enc-statut"
              name="statut"
              value={statut}
              onValueChange={setStatut}
              options={[
                { value: "encaisse", label: "Encaissé (déjà reçu)" },
                { value: "prevu", label: "Prévu (à venir)" },
              ]}
            />
          </div>

          {statut === "prevu" ? (
            <div className="space-y-2">
              <Label htmlFor="enc-fiabilite">Fiabilité (%)</Label>
              <Input
                id="enc-fiabilite"
                name="fiabilite"
                type="number"
                min="0"
                max="100"
                step="1"
                defaultValue="100"
              />
              <p className="text-xs text-muted-foreground">
                Probabilité d&apos;encaisser ce paiement.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit">Ajouter</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Synthese({ titre, valeur, accent = false }: { titre: string; valeur: string; accent?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`font-display text-2xl ${accent ? "text-rose-600" : ""}`}>{valeur}</p>
      </CardContent>
    </Card>
  );
}
