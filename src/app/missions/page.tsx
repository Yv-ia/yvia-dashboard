import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PageMissions() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Missions</h1>
      <Card>
        <CardHeader>
          <CardTitle>Bientôt disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cet écran permettra de gérer les missions (freelance, client, TJM, dates).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
