import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PageFreelances() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Freelances</h1>
      <Card>
        <CardHeader>
          <CardTitle>Bientôt disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cet écran permettra de gérer les freelances et leurs absences.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
