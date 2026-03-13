import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Dna, Search } from "lucide-react";
import { toast } from "sonner";

interface BioactivityEntry {
  targetName: string;
  targetType: string;
  activityType: string;
  value: number;
  units: string;
}

interface DiseaseAssociation {
  diseaseId: string;
  diseaseName: string;
  score: number;
}

interface BioactivityPanelProps {
  compoundName: string;
  smiles: string;
  disabled?: boolean;
}

const CHEMBL_BASE = "https://www.ebi.ac.uk/chembl/api/data";

export function BioactivityPanel({ compoundName, smiles, disabled }: BioactivityPanelProps) {
  const [bioactivities, setBioactivities] = useState<BioactivityEntry[]>([]);
  const [diseases, setDiseases] = useState<DiseaseAssociation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchBioactivity = useCallback(async () => {
    if (!compoundName) return;
    setLoading(true);
    setSearched(true);
    setBioactivities([]);
    setDiseases([]);

    try {
      // ChEMBL molecule search
      const chemblUrl = `${CHEMBL_BASE}/molecule/search.json?q=${encodeURIComponent(compoundName)}&limit=1`;
      const chemblRes = await fetch(chemblUrl);

      if (chemblRes.ok) {
        const chemblData = await chemblRes.json();
        const mol = chemblData.molecules?.[0];

        if (mol?.molecule_chembl_id) {
          // Fetch activities for this molecule
          const actUrl = `${CHEMBL_BASE}/activity.json?molecule_chembl_id=${mol.molecule_chembl_id}&limit=20`;
          const actRes = await fetch(actUrl);

          if (actRes.ok) {
            const actData = await actRes.json();
            const entries: BioactivityEntry[] = (actData.activities || [])
              .filter((a: any) => a.standard_value && a.target_pref_name)
              .slice(0, 10)
              .map((a: any) => ({
                targetName: a.target_pref_name || "Unknown",
                targetType: a.target_type || "Unknown",
                activityType: a.standard_type || "Unknown",
                value: parseFloat(a.standard_value) || 0,
                units: a.standard_units || "nM",
              }));
            setBioactivities(entries);
          }
        }
      }

      // Open Targets search (by compound name → target associations)
      try {
        const otQuery = `
          query {
            search(queryString: "${compoundName}", entityNames: ["drug"]) {
              hits {
                id
                name
                entity
                object {
                  ... on Drug {
                    linkedTargets {
                      rows {
                        id
                        approvedSymbol
                      }
                    }
                    linkedDiseases {
                      rows {
                        disease {
                          id
                          name
                        }
                        score
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const otRes = await fetch("https://api.platform.opentargets.org/api/v4/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: otQuery }),
        });

        if (otRes.ok) {
          const otData = await otRes.json();
          const drug = otData.data?.search?.hits?.[0]?.object;
          if (drug?.linkedDiseases?.rows) {
            const diseaseList: DiseaseAssociation[] = drug.linkedDiseases.rows
              .slice(0, 8)
              .map((r: any) => ({
                diseaseId: r.disease?.id || "",
                diseaseName: r.disease?.name || "Unknown",
                score: r.score || 0,
              }));
            setDiseases(diseaseList);
          }
        }
      } catch {
        // Open Targets is optional
      }
    } catch (err) {
      toast.error("Erro ao buscar dados bioativos");
    } finally {
      setLoading(false);
    }
  }, [compoundName]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          M4 — Bioatividade e Alvos
          <Badge variant="outline" className="text-[10px] ml-auto">ChEMBL + Open Targets</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          className="w-full"
          variant="outline"
          onClick={searchBioactivity}
          disabled={!compoundName || loading || disabled}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Buscar Dados Bioativos para "{compoundName || "..."}"
        </Button>

        {/* Bioactivities from ChEMBL */}
        {searched && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Dna className="h-3.5 w-3.5" />
              Atividades Biológicas (ChEMBL)
            </h4>
            {bioactivities.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Alvo</th>
                      <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Tipo</th>
                      <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Valor</th>
                      <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Unidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bioactivities.map((b, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 px-2 max-w-[180px] truncate">{b.targetName}</td>
                        <td className="py-1.5 px-2">
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">{b.activityType}</Badge>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">{b.value.toFixed(1)}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{b.units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !loading ? (
              <p className="text-xs text-muted-foreground">Nenhuma atividade encontrada no ChEMBL</p>
            ) : null}
          </div>
        )}

        {/* Disease associations from Open Targets */}
        {diseases.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Associações Doença-Alvo (Open Targets)
            </h4>
            <div className="space-y-1">
              {diseases.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded p-2">
                  <span className="flex-1 truncate">{d.diseaseName}</span>
                  <Badge
                    variant={d.score > 0.5 ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    Score: {d.score.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
