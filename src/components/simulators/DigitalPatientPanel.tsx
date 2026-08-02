import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, Sparkles } from "lucide-react";
import { usePatientState } from "@/contexts/PatientContext";
import { UPSTREAM_EDGES, friendlyModuleName } from "@/data/patientCascadeEdges";

/**
 * Painel compacto exibido nos 5 simuladores de fisiologia, tornando visível
 * o que o "Paciente Digital Contínuo" herdou de outros módulos nesta sessão.
 * Some dentro da Sala Virtual (modo de avaliação, fora do escopo do recurso).
 */
export function DigitalPatientPanel({ simulatorSlug }: { simulatorSlug: string }) {
  const { patient, resetPatient } = usePatientState();

  const edges = UPSTREAM_EDGES[simulatorSlug] ?? [];
  const inherited = edges.filter((e) => patient?.provenance[e.vitalKey] && patient.provenance[e.vitalKey]!.sourceSlug !== simulatorSlug);

  const handleReset = () => {
    if (window.confirm("Isso apaga o estado do paciente contínuo compartilhado entre os 5 simuladores de fisiologia. Continuar?")) {
      resetPatient();
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Paciente Digital Contínuo
          </p>
          <div className="flex items-center gap-2">
            <Link to="/simuladores/paciente-continuo" className="text-xs text-primary hover:underline flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Ver painel completo
            </Link>
            <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={handleReset}>
              Novo Paciente
            </Button>
          </div>
        </div>
        {inherited.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {inherited.map((edge) => {
              const prov = patient!.provenance[edge.vitalKey]!;
              return (
                <Badge key={edge.vitalKey} variant="secondary" className="text-xs font-normal">
                  Herdado de {friendlyModuleName(prov.sourceSlug)}: {edge.label} = {String(patient!.vitals[edge.vitalKey])}
                </Badge>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Paciente sem histórico de outros módulos ainda — os valores abaixo são o baseline padrão do caso.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
