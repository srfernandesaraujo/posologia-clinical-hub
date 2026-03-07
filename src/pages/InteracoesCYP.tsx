import { useState, useMemo } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, Dna, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

type Modo = "clinico" | "educativo";

interface Drug {
  nome: string;
  cyp: Record<string, { role: "substrato" | "inibidor" | "indutor"; intensidade: number }>;
}

const DRUG_DB: Drug[] = [
  { nome: "Fluoxetina", cyp: { "2D6": { role: "inibidor", intensidade: 90 }, "2C19": { role: "inibidor", intensidade: 40 }, "3A4": { role: "inibidor", intensidade: 20 } } },
  { nome: "Paroxetina", cyp: { "2D6": { role: "inibidor", intensidade: 95 }, "2B6": { role: "inibidor", intensidade: 30 } } },
  { nome: "Carbamazepina", cyp: { "3A4": { role: "indutor", intensidade: 85 }, "2C9": { role: "indutor", intensidade: 50 }, "1A2": { role: "indutor", intensidade: 40 } } },
  { nome: "Rifampicina", cyp: { "3A4": { role: "indutor", intensidade: 95 }, "2C9": { role: "indutor", intensidade: 80 }, "2C19": { role: "indutor", intensidade: 70 }, "1A2": { role: "indutor", intensidade: 60 }, "2B6": { role: "indutor", intensidade: 50 } } },
  { nome: "Cetoconazol", cyp: { "3A4": { role: "inibidor", intensidade: 95 } } },
  { nome: "Omeprazol", cyp: { "2C19": { role: "substrato", intensidade: 80 }, "3A4": { role: "substrato", intensidade: 30 }, "2C19i": { role: "inibidor", intensidade: 40 } } },
  { nome: "Varfarina", cyp: { "2C9": { role: "substrato", intensidade: 85 }, "3A4": { role: "substrato", intensidade: 30 }, "1A2": { role: "substrato", intensidade: 20 } } },
  { nome: "Clopidogrel", cyp: { "2C19": { role: "substrato", intensidade: 80 }, "3A4": { role: "substrato", intensidade: 40 }, "2B6": { role: "substrato", intensidade: 30 } } },
  { nome: "Metoprolol", cyp: { "2D6": { role: "substrato", intensidade: 85 } } },
  { nome: "Amiodarona", cyp: { "2D6": { role: "inibidor", intensidade: 50 }, "2C9": { role: "inibidor", intensidade: 60 }, "3A4": { role: "inibidor", intensidade: 40 } } },
  { nome: "Sinvastatina", cyp: { "3A4": { role: "substrato", intensidade: 90 } } },
  { nome: "Claritromicina", cyp: { "3A4": { role: "inibidor", intensidade: 80 } } },
  { nome: "Ciprofloxacino", cyp: { "1A2": { role: "inibidor", intensidade: 70 } } },
  { nome: "Fenitoina", cyp: { "2C9": { role: "substrato", intensidade: 70 }, "2C19": { role: "substrato", intensidade: 50 }, "3A4": { role: "indutor", intensidade: 60 } } },
  { nome: "Venlafaxina", cyp: { "2D6": { role: "substrato", intensidade: 70 }, "3A4": { role: "substrato", intensidade: 40 } } },
];

const CYP_ENZYMES = ["1A2", "2B6", "2C9", "2C19", "2D6", "3A4"];

export default function InteracoesCYP() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [search, setSearch] = useState("");
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const { saveCalculation } = useCalculationHistory();

  const filteredDrugs = DRUG_DB.filter(d => d.nome.toLowerCase().includes(search.toLowerCase()));

  const toggleDrug = (nome: string) => {
    setSelectedDrugs(prev => prev.includes(nome) ? prev.filter(d => d !== nome) : [...prev, nome]);
  };

  const radarData = useMemo(() => {
    return CYP_ENZYMES.map(enzyme => {
      let inibicao = 0, inducao = 0, substrato = 0;
      selectedDrugs.forEach(drugName => {
        const drug = DRUG_DB.find(d => d.nome === drugName);
        if (!drug) return;
        const entry = drug.cyp[enzyme];
        if (entry) {
          if (entry.role === "inibidor") inibicao += entry.intensidade;
          else if (entry.role === "indutor") inducao += entry.intensidade;
          else substrato += entry.intensidade;
        }
      });
      return { enzyme: `CYP${enzyme}`, Inibicao: Math.min(inibicao, 100), Inducao: Math.min(inducao, 100), Substrato: Math.min(substrato, 100) };
    });
  }, [selectedDrugs]);

  const interactions = useMemo(() => {
    const results: string[] = [];
    const drugs = selectedDrugs.map(n => DRUG_DB.find(d => d.nome === n)!).filter(Boolean);
    for (let i = 0; i < drugs.length; i++) {
      for (let j = i + 1; j < drugs.length; j++) {
        const a = drugs[i], b = drugs[j];
        CYP_ENZYMES.forEach(enzyme => {
          const ae = a.cyp[enzyme], be = b.cyp[enzyme];
          if (ae && be) {
            if (ae.role === "inibidor" && be.role === "substrato") {
              results.push(`${a.nome} INIBE CYP${enzyme} → aumento dos niveis de ${b.nome} (risco de toxicidade).`);
            }
            if (be.role === "inibidor" && ae.role === "substrato") {
              results.push(`${b.nome} INIBE CYP${enzyme} → aumento dos niveis de ${a.nome} (risco de toxicidade).`);
            }
            if (ae.role === "indutor" && be.role === "substrato") {
              results.push(`${a.nome} INDUZ CYP${enzyme} → reducao dos niveis de ${b.nome} (risco de falha terapeutica).`);
            }
            if (be.role === "indutor" && ae.role === "substrato") {
              results.push(`${b.nome} INDUZ CYP${enzyme} → reducao dos niveis de ${a.nome} (risco de falha terapeutica).`);
            }
          }
        });
      }
    }
    return results;
  }, [selectedDrugs]);

  const salvar = () => {
    if (selectedDrugs.length > 0) {
      saveCalculation({
        calculatorName: "Interacoes CYP",
        calculatorSlug: "interacoes-cyp",
        date: new Date().toISOString().slice(0, 10),
        summary: `${selectedDrugs.join(", ")} – ${interactions.length} interacao(oes)`,
        details: { Farmacos: selectedDrugs.join(", "), Interacoes: String(interactions.length) },
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {!isEmbed && (
        <button onClick={() => navigate("/calculadoras")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar as Calculadoras
        </button>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><Dna className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Radar de Interacoes CYP450</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Visualizacao das interacoes farmacocineticas via citocromo P450.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="interacoes-cyp" toolName="Interacoes CYP" />
            <CalculationHistory calculatorSlug="interacoes-cyp" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Selecione os farmacos</h2>
            <Input placeholder="Buscar farmaco..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3" />
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedDrugs.map(name => (
                <Badge key={name} variant="default" className="cursor-pointer gap-1" onClick={() => toggleDrug(name)}>
                  {name} ×
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {filteredDrugs.map(drug => (
                <button
                  key={drug.nome}
                  onClick={() => toggleDrug(drug.nome)}
                  className={`text-left text-sm p-2 rounded-lg transition-colors ${selectedDrugs.includes(drug.nome) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}`}
                >
                  {drug.nome}
                </button>
              ))}
            </div>
          </div>

          {interactions.length > 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-destructive">Interacoes Detectadas ({interactions.length})</h2>
              <ul className="space-y-2">
                {interactions.map((int, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-destructive shrink-0">⚠</span>
                    {int}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre o CYP450</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>O <strong>citocromo P450</strong> e uma familia de enzimas hepaticas responsaveis pelo metabolismo de ~75% dos farmacos.</p>
                <p><strong>Substratos:</strong> farmacos metabolizados pela enzima. <strong>Inibidores:</strong> reduzem a atividade (aumento de niveis). <strong>Indutores:</strong> aumentam a atividade (reducao de niveis).</p>
                <p><strong>CYP3A4:</strong> metaboliza ~50% dos farmacos. <strong>CYP2D6:</strong> importante para psicofarmacos e betabloqueadores (polimorfismo genetico).</p>
              </div>
            </div>
          )}

          {selectedDrugs.length > 0 && <Button onClick={salvar} className="w-full">Registrar Analise</Button>}
        </div>

        <div className="space-y-6">
          {selectedDrugs.length > 0 ? (
            <>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Radar CYP450</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="enzyme" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} />
                    <Radar name="Inibicao" dataKey="Inibicao" stroke="hsl(0 72% 51%)" fill="hsl(0 72% 51%)" fillOpacity={0.2} />
                    <Radar name="Inducao" dataKey="Inducao" stroke="hsl(38 92% 50%)" fill="hsl(38 92% 50%)" fillOpacity={0.2} />
                    <Radar name="Substrato" dataKey="Substrato" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45%)" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0 72% 51%)" }} /> Inibicao</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(38 92% 50%)" }} /> Inducao</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142 71% 45%)" }} /> Substrato</span>
                </div>
              </div>

              <ClinicalReferences references={CALCULATOR_REFERENCES["interacoes-cyp"]} />
              <RelatedCalculators currentSlug="interacoes-cyp" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Dna className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecione 2+ farmacos para ver o radar de interacoes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
