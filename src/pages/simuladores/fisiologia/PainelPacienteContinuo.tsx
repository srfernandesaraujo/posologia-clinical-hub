import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, Sparkles } from "lucide-react";
import { usePatientState } from "@/contexts/PatientContext";
import { UPSTREAM_EDGES, friendlyModuleName } from "@/data/patientCascadeEdges";
import type { PatientVitalKey } from "@/lib/patientEngine";

interface VitalGroup {
  slug: string;
  title: string;
  vitals: { key: PatientVitalKey; label: string; unit?: string }[];
}

const VITAL_GROUPS: VitalGroup[] = [
  {
    slug: "sna",
    title: "Sistema Nervoso Autônomo",
    vitals: [
      { key: "sympatheticTone", label: "Tônus simpático", unit: "%" },
      { key: "parasympatheticTone", label: "Tônus parassimpático", unit: "%" },
      { key: "fc", label: "FC", unit: "bpm" },
      { key: "pas", label: "PAS", unit: "mmHg" },
      { key: "pad", label: "PAD", unit: "mmHg" },
      { key: "giMotility", label: "Motilidade GI", unit: "%" },
    ],
  },
  {
    slug: "depuracao-renal",
    title: "Depuração Renal",
    vitals: [
      { key: "tfg", label: "TFG", unit: "mL/min" },
      { key: "urineVolume", label: "Vol. Urina", unit: "L/dia" },
      { key: "naSodiumUrinary", label: "Na⁺ urinário", unit: "mEq/L" },
      { key: "glucoseUrinary", label: "Glicosúria", unit: "mg/dL" },
      { key: "serumPotassium", label: "K⁺ sérico", unit: "mEq/L" },
    ],
  },
  {
    slug: "equilibrio-acido-base",
    title: "Equilíbrio Ácido-Base",
    vitals: [
      { key: "ph", label: "pH" },
      { key: "pCO2", label: "pCO₂", unit: "mmHg" },
      { key: "hco3", label: "HCO₃⁻", unit: "mEq/L" },
      { key: "be", label: "BE" },
      { key: "acidBaseClassification", label: "Classificação" },
    ],
  },
  {
    slug: "regulacao-glicemica",
    title: "Regulação Glicêmica",
    vitals: [
      { key: "glycemia", label: "Glicemia", unit: "mg/dL" },
      { key: "insulinemia", label: "Insulinemia", unit: "µU/mL" },
      { key: "muscleUptake", label: "Captação Muscular", unit: "%" },
      { key: "hepaticOutput", label: "Produção Hepática", unit: "%" },
    ],
  },
  {
    slug: "eletrofisiologia-cardiaca",
    title: "Eletrofisiologia Cardíaca",
    vitals: [
      { key: "naConductance", label: "Condutância Na⁺", unit: "%" },
      { key: "kConductance", label: "Condutância K⁺", unit: "%" },
      { key: "caConductance", label: "Condutância Ca²⁺", unit: "%" },
      { key: "cellType", label: "Tipo celular" },
    ],
  },
];

const SIMULATOR_ROUTES: Record<string, string> = {
  sna: "/simuladores/sna",
  "depuracao-renal": "/simuladores/depuracao-renal",
  "equilibrio-acido-base": "/simuladores/equilibrio-acido-base",
  "regulacao-glicemica": "/simuladores/regulacao-glicemica",
  "eletrofisiologia-cardiaca": "/simuladores/eletrofisiologia-cardiaca",
};

export default function PainelPacienteContinuo() {
  const navigate = useNavigate();
  const { patient, resetPatient } = usePatientState();

  const activeCascades = Object.entries(UPSTREAM_EDGES).flatMap(([targetSlug, edges]) =>
    edges
      .filter((edge) => {
        const prov = patient?.provenance[edge.vitalKey];
        return prov && prov.sourceSlug !== targetSlug;
      })
      .map((edge) => ({ targetSlug, edge }))
  );

  const handleReset = () => {
    if (window.confirm("Isso apaga o estado do paciente contínuo compartilhado entre os 5 simuladores de fisiologia. Continuar?")) {
      resetPatient();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Painel do Paciente Contínuo</h1>
          <p className="text-muted-foreground">
            O mesmo paciente atravessa SNA, Depuração Renal, Ácido-Base, Regulação Glicêmica e Eletrofisiologia Cardíaca —
            cada simulador herda e influencia os vitais dos outros nesta sessão.
          </p>
        </div>
      </div>

      {!patient || patient.touchedModules.length === 0 ? (
        <Card>
          <CardContent className="pt-6 space-y-4 text-center">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Nenhum paciente contínuo ativo ainda. Abra qualquer um dos 5 simuladores de fisiologia e escolha um caso
              clínico para começar — os vitais aparecerão aqui automaticamente.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(SIMULATOR_ROUTES).map(([slug, route]) => (
                <Button key={slug} variant="outline" size="sm" onClick={() => navigate(route)}>
                  {friendlyModuleName(slug)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleReset}>Novo Paciente</Button>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Cascatas ativas nesta sessão</CardTitle></CardHeader>
            <CardContent>
              {activeCascades.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                  {activeCascades.map(({ targetSlug, edge }) => (
                    <li key={`${targetSlug}-${edge.vitalKey}`}>
                      {edge.label} está influenciando o baseline de <strong>{friendlyModuleName(targetSlug)}</strong>.
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma cascata cruzou módulos ainda — visite outro simulador de fisiologia para ver o efeito.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VITAL_GROUPS.map((group) => {
              const knownVitals = group.vitals.filter((v) => patient.vitals[v.key] !== undefined);
              return (
                <Card key={group.slug}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{group.title}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate(SIMULATOR_ROUTES[group.slug])}>Abrir</Button>
                  </CardHeader>
                  <CardContent>
                    {knownVitals.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Ainda não visitado nesta sessão.</p>
                    ) : (
                      <div className="space-y-2">
                        {knownVitals.map((v) => {
                          const prov = patient.provenance[v.key];
                          const inherited = prov && prov.sourceSlug !== group.slug;
                          return (
                            <div key={v.key} className="flex items-center justify-between gap-2 text-sm">
                              <span className="text-muted-foreground">{v.label}</span>
                              <span className="flex items-center gap-2">
                                <span className="font-semibold">{String(patient.vitals[v.key])}{v.unit ? ` ${v.unit}` : ""}</span>
                                {inherited && (
                                  <Badge variant="secondary" className="text-[10px] font-normal">
                                    {friendlyModuleName(prov!.sourceSlug)}
                                  </Badge>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
