import { useState, useEffect } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import {
  type ProntuarioFHIRCase,
  type MedicationInUse,
  applyPrescribingAction,
  mapPatientToFHIR,
  mapProblemsToFHIR,
  mapMedicationsToFHIR,
  mapObservationsToFHIR,
  mapOrdersToFHIR,
} from "@/lib/fhirMappers";
import { FhirSectionViewer } from "@/components/FhirSectionViewer";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Sparkles, Loader2, User, ClipboardList, CheckCircle, XCircle, ChevronDown, ChevronUp,
  FileText, Lock, Stethoscope, TestTube, Pill,
} from "lucide-react";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";

const SLUG = "prontuario-fhir";

const BUILT_IN_CASES: ProntuarioFHIRCase[] = [
  {
    title: "Caso 1: HAS recém-diagnosticada com hiperpotassemia por IECA",
    difficulty: "Médio",
    patient: { name: "Sr. Antônio Ferreira", birthDateDescription: "12/05/1958 (67 anos)", gender: "male", diagnosis: "HAS recém-diagnosticada" },
    problems: [
      { id: "prob-1", display: "Hipertensão arterial sistêmica", icd10Code: "I10", onsetDescription: "Diagnosticada nesta consulta", status: "active" },
    ],
    medications: [],
    baselineObservations: [],
    encounters: [
      {
        id: "enc-1", index: 0, label: "Consulta inicial", dateDescription: "Dia 0",
        narrative: "Paciente assintomático, PA 168/100 mmHg em duas medidas na consulta. Sem histórico renal conhecido, sem uso prévio de anti-hipertensivos.",
        vitals: { "PA": "168/100 mmHg", "FC": "82 bpm" },
        resultsRevealed: [],
        availableOrders: [
          { id: "ord-creat", name: "Creatinina sérica", loincCode: "2160-0", category: "Função renal", rationale: "Basal antes de iniciar IECA — risco de piora da função renal" },
          { id: "ord-k", name: "Potássio sérico", loincCode: "2823-3", category: "Função renal", rationale: "Basal antes de iniciar IECA — risco de hiperpotassemia" },
          { id: "ord-glic", name: "Glicemia de jejum", loincCode: "1558-6", category: "Metabólico", rationale: "Rastreio metabólico de rotina em HAS recém-diagnosticada" },
          { id: "ord-hemo", name: "Hemograma completo", loincCode: "58410-2", category: "Hematológico" },
          { id: "ord-tsh", name: "TSH", loincCode: "3016-3", category: "Endócrino" },
        ],
        idealOrderIds: ["ord-creat", "ord-k", "ord-glic"],
        availablePrescribingOptions: [
          { id: "presc-enalapril", label: "Iniciar Enalapril 10mg VO 12/12h", drug: "Enalapril", atcCode: "C09AA02", dose: "10mg", frequency: "12/12h", action: "iniciar", rationale: "1ª linha para HAS estágio 2 sem comorbidades que contraindiquem IECA" },
          { id: "presc-anlo", label: "Iniciar Anlodipino 5mg VO 1x/dia", drug: "Anlodipino", atcCode: "C08CA01", dose: "5mg", frequency: "1x/dia", action: "iniciar", rationale: "Alternativa razoável, mas não é a 1ª linha preferencial neste perfil" },
          { id: "presc-hctz", label: "Iniciar Hidroclorotiazida 25mg VO 1x/dia", drug: "Hidroclorotiazida", atcCode: "C03AA03", dose: "25mg", frequency: "1x/dia", action: "iniciar", rationale: "Não ideal como monoterapia inicial sem função renal ainda conhecida" },
          { id: "presc-nofarm", label: "Apenas orientação não farmacológica, sem medicação", drug: "—", dose: "—", frequency: "—", action: "manter", rationale: "PA muito elevada (168/100) já indica tratamento farmacológico imediato" },
        ],
        idealPrescribingOptionId: "presc-enalapril",
        educationalNote: "PA ≥160/100 mmHg (estágio 2) indica início imediato de farmacoterapia; IECA é 1ª linha na ausência de contraindicações, mas exige avaliação basal de função renal e potássio.",
      },
      {
        id: "enc-2", index: 1, label: "Retorno em 14 dias", dateDescription: "Dia 14",
        narrative: "Paciente refere leve fraqueza muscular. PA 138/88 mmHg (controlada). Em uso de Enalapril 10mg 12/12h desde a última consulta.",
        vitals: { "PA": "138/88 mmHg", "FC": "76 bpm" },
        resultsRevealed: [
          { id: "obs-creat-2", name: "Creatinina sérica", loincCode: "2160-0", value: 1.8, unit: "mg/dL", referenceRange: "0.6–1.2 mg/dL", interpretation: "high" },
          { id: "obs-k-2", name: "Potássio sérico", loincCode: "2823-3", value: 5.6, unit: "mEq/L", referenceRange: "3.5–5.0 mEq/L", interpretation: "high" },
          { id: "obs-glic-2", name: "Glicemia de jejum", loincCode: "1558-6", value: 98, unit: "mg/dL", referenceRange: "70–99 mg/dL", interpretation: "normal" },
        ],
        availableOrders: [
          { id: "ord-creat-2", name: "Repetir Creatinina sérica", loincCode: "2160-0", category: "Função renal", rationale: "Confirmar a alteração antes de decidir a conduta" },
          { id: "ord-k-2", name: "Repetir Potássio sérico", loincCode: "2823-3", category: "Função renal", rationale: "Confirmar hiperpotassemia antes de decidir a conduta" },
          { id: "ord-usg", name: "Ultrassom renal", loincCode: "24558-3", category: "Imagem" },
          { id: "ord-ecg", name: "Eletrocardiograma", loincCode: "11524-6", category: "Cardiovascular" },
        ],
        idealOrderIds: ["ord-creat-2", "ord-k-2"],
        availablePrescribingOptions: [
          { id: "presc-troca-anlo", label: "Suspender Enalapril e iniciar Anlodipino 5mg VO 1x/dia", drug: "Anlodipino", atcCode: "C08CA01", dose: "5mg", frequency: "1x/dia", action: "trocar", replacesDrug: "Enalapril", rationale: "Piora da função renal e hiperpotassemia por IECA — trocar de classe é a conduta segura" },
          { id: "presc-manter-enal", label: "Manter Enalapril 10mg 12/12h sem alteração", drug: "Enalapril", dose: "10mg", frequency: "12/12h", action: "manter", rationale: "Manter IECA diante de hiperpotassemia e piora renal expõe o paciente a risco (arritmia, IRA)" },
          { id: "presc-aumenta-enal", label: "Aumentar Enalapril para 20mg 12/12h", drug: "Enalapril", atcCode: "C09AA02", dose: "20mg", frequency: "12/12h", action: "aumentar", rationale: "Aumentar a dose do IECA pioraria a hiperpotassemia e a função renal" },
          { id: "presc-espiro", label: "Adicionar Espironolactona 25mg 1x/dia", drug: "Espironolactona", atcCode: "C03DA01", dose: "25mg", frequency: "1x/dia", action: "iniciar", rationale: "Contraindicado — poupador de potássio associado a IECA em hiperpotassemia" },
        ],
        idealPrescribingOptionId: "presc-troca-anlo",
        educationalNote: "IECA pode causar hiperpotassemia e queda da TFG, especialmente em idosos ou com função renal limítrofe basal — a conduta é suspender e trocar de classe, não apenas monitorar.",
      },
      {
        id: "enc-3", index: 2, label: "Retorno em 30 dias", dateDescription: "Dia 30",
        narrative: "Paciente assintomático, PA 130/85 mmHg, em uso de Anlodipino 5mg 1x/dia desde a troca.",
        vitals: { "PA": "130/85 mmHg", "FC": "74 bpm" },
        resultsRevealed: [
          { id: "obs-creat-3", name: "Creatinina sérica", loincCode: "2160-0", value: 1.1, unit: "mg/dL", referenceRange: "0.6–1.2 mg/dL", interpretation: "normal" },
          { id: "obs-k-3", name: "Potássio sérico", loincCode: "2823-3", value: 4.3, unit: "mEq/L", referenceRange: "3.5–5.0 mEq/L", interpretation: "normal" },
        ],
        availableOrders: [
          { id: "ord-creat-3", name: "Repetir Creatinina sérica", loincCode: "2160-0", category: "Função renal", rationale: "Não necessário — função renal já normalizada" },
          { id: "ord-k-3", name: "Repetir Potássio sérico", loincCode: "2823-3", category: "Função renal", rationale: "Não necessário — potássio já normalizado" },
        ],
        idealOrderIds: [],
        availablePrescribingOptions: [
          { id: "presc-manter-anlo", label: "Manter Anlodipino 5mg 1x/dia", drug: "Anlodipino", dose: "5mg", frequency: "1x/dia", action: "manter", rationale: "PA controlada, função renal e potássio normalizados — manter o esquema atual" },
          { id: "presc-aumenta-anlo", label: "Aumentar Anlodipino para 10mg 1x/dia", drug: "Anlodipino", atcCode: "C08CA01", dose: "10mg", frequency: "1x/dia", action: "aumentar", rationale: "PA já está controlada (130/85) — aumentar a dose não é necessário" },
          { id: "presc-reintro-enal", label: "Reintroduzir Enalapril 10mg 12/12h", drug: "Enalapril", atcCode: "C09AA02", dose: "10mg", frequency: "12/12h", action: "trocar", replacesDrug: "Anlodipino", rationale: "Reintroduzir a classe que causou hiperpotassemia expõe o paciente ao mesmo risco novamente" },
          { id: "presc-add-hctz", label: "Adicionar Hidroclorotiazida 25mg 1x/dia", drug: "Hidroclorotiazida", atcCode: "C03AA03", dose: "25mg", frequency: "1x/dia", action: "iniciar", rationale: "PA já controlada em monoterapia — associação não é necessária agora" },
        ],
        idealPrescribingOptionId: "presc-manter-anlo",
        educationalNote: "Com PA controlada e exames normalizados em monoterapia, a conduta correta é manter — mudanças adicionais sem indicação clínica aumentam risco sem benefício.",
      },
    ],
  },
  {
    title: "Caso 2: Cistite não complicada com ajuste guiado por urocultura",
    difficulty: "Fácil",
    patient: { name: "Marta Oliveira", birthDateDescription: "03/09/1990 (35 anos)", gender: "female", diagnosis: "Cistite aguda não complicada" },
    problems: [
      { id: "prob-1", display: "Cistite aguda", icd10Code: "N30.9", onsetDescription: "Início há 2 dias", status: "active" },
    ],
    medications: [],
    baselineObservations: [],
    encounters: [
      {
        id: "enc-1", index: 0, label: "Consulta inicial", dateDescription: "Dia 0",
        narrative: "Paciente relata disúria, polaciúria e urgência miccional há 2 dias. Afebril, sem dor lombar ou náuseas.",
        vitals: { "PA": "110/70 mmHg", "FC": "80 bpm", "Temp": "36.6°C" },
        resultsRevealed: [],
        availableOrders: [
          { id: "ord-eas", name: "EAS (elementos anormais e sedimento)", loincCode: "5811-5", category: "Urinálise", rationale: "Confirma piúria/bacteriúria compatível com ITU baixa" },
          { id: "ord-uroc", name: "Urocultura com antibiograma", loincCode: "630-4", category: "Urinálise", rationale: "Orienta ajuste terapêutico caso não haja resposta ao tratamento empírico" },
          { id: "ord-creat", name: "Creatinina sérica", loincCode: "2160-0", category: "Função renal", rationale: "Não necessário em ITU baixa não complicada, sem sinais de pielonefrite" },
          { id: "ord-hemo", name: "Hemograma completo", loincCode: "58410-2", category: "Hematológico", rationale: "Não necessário sem sinais sistêmicos/febre" },
        ],
        idealOrderIds: ["ord-eas", "ord-uroc"],
        availablePrescribingOptions: [
          { id: "presc-nitro", label: "Iniciar Nitrofurantoína 100mg VO 6/6h por 5 dias", drug: "Nitrofurantoína", atcCode: "J01XE01", dose: "100mg", frequency: "6/6h (5 dias)", action: "iniciar", rationale: "1ª linha para cistite não complicada em mulher, boa cobertura para E. coli comunitária" },
          { id: "presc-cipro", label: "Iniciar Ciprofloxacino 500mg VO 12/12h por 3 dias", drug: "Ciprofloxacino", atcCode: "J01MA02", dose: "500mg", frequency: "12/12h (3 dias)", action: "iniciar", rationale: "Fluoroquinolona deve ser reservada, não é 1ª linha para cistite simples" },
          { id: "presc-aguardar", label: "Aguardar resultado da urocultura sem tratar", drug: "—", dose: "—", frequency: "—", action: "manter", rationale: "Paciente sintomática — tratamento empírico não deve esperar o resultado da cultura" },
          { id: "presc-cefal-emp", label: "Iniciar Cefalexina 500mg VO 6/6h por 7 dias (empírica)", drug: "Cefalexina", atcCode: "J01DB01", dose: "500mg", frequency: "6/6h (7 dias)", action: "iniciar", rationale: "Opção aceitável, mas não é a 1ª linha preferencial para cistite não complicada" },
        ],
        idealPrescribingOptionId: "presc-nitro",
        educationalNote: "Cistite não complicada em mulher: tratamento empírico não deve aguardar cultura; Nitrofurantoína é 1ª linha, poupando fluoroquinolonas.",
      },
      {
        id: "enc-2", index: 1, label: "Retorno em 5 dias", dateDescription: "Dia 5",
        narrative: "Paciente ainda refere disúria leve, sem piora. Em uso de Nitrofurantoína desde a última consulta.",
        vitals: { "PA": "112/72 mmHg", "FC": "78 bpm", "Temp": "36.5°C" },
        resultsRevealed: [
          { id: "obs-uroc-2", name: "Urocultura — E. coli, resistente a Nitrofurantoína, sensível a Cefalosporinas", loincCode: "630-4", value: 0, unit: "UFC/mL (qualitativo)", referenceRange: "Sensibilidade por antibiograma", interpretation: "critical" },
        ],
        availableOrders: [
          { id: "ord-uroc-rep", name: "Repetir urocultura", loincCode: "630-4", category: "Urinálise", rationale: "Não necessário — resultado já orienta a conduta" },
          { id: "ord-usg-rim", name: "Ultrassom de rins e vias urinárias", loincCode: "24558-3", category: "Imagem", rationale: "Não indicado em ITU baixa não complicada sem recorrência" },
        ],
        idealOrderIds: [],
        availablePrescribingOptions: [
          { id: "presc-troca-cefal", label: "Suspender Nitrofurantoína e iniciar Cefalexina 500mg VO 6/6h por 7 dias", drug: "Cefalexina", atcCode: "J01DB01", dose: "500mg", frequency: "6/6h (7 dias)", action: "trocar", replacesDrug: "Nitrofurantoína", rationale: "Antibiograma mostra resistência à Nitrofurantoína e sensibilidade à Cefalosporina — trocar conforme cultura" },
          { id: "presc-manter-nitro", label: "Manter Nitrofurantoína sem alteração", drug: "Nitrofurantoína", dose: "100mg", frequency: "6/6h", action: "manter", rationale: "Cultura confirma resistência — manter o mesmo antibiótico tende a falhar" },
          { id: "presc-troca-cipro", label: "Trocar para Ciprofloxacino 500mg 12/12h", drug: "Ciprofloxacino", atcCode: "J01MA02", dose: "500mg", frequency: "12/12h", action: "trocar", replacesDrug: "Nitrofurantoína", rationale: "Fluoroquinolona deve ser reservada quando há alternativa sensível mais estreita (Cefalosporina)" },
          { id: "presc-suspender", label: "Suspender tratamento antibiótico", drug: "—", dose: "—", frequency: "—", action: "suspender", rationale: "Paciente ainda sintomática — suspender sem substituir deixaria a infecção sem tratamento eficaz" },
        ],
        idealPrescribingOptionId: "presc-troca-cefal",
        educationalNote: "Ajuste guiado por cultura: quando o antibiograma mostra resistência ao empírico, trocar para a opção sensível de menor espectro disponível, evitando escalar para fluoroquinolona sem necessidade.",
      },
    ],
  },
];

function scorePercent(correct: number, total: number) {
  return total > 0 ? Math.round((correct / total) * 100) : 100;
}

export default function SimuladorProntuarioFHIR() {
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, BUILT_IN_CASES);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVRCase, goBack, submitResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [screen, setScreen] = useState<"dashboard" | "sim" | "report">("dashboard");
  const [caseIdx, setCaseIdx] = useState(0);
  const [encounterIdx, setEncounterIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("demografia");
  const [currentMedications, setCurrentMedications] = useState<MedicationInUse[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Record<number, Set<string>>>({});
  const [orderConfirmed, setOrderConfirmed] = useState<Record<number, boolean>>({});
  const [selectedPrescribingId, setSelectedPrescribingId] = useState<Record<number, string>>({});
  const [prescribingConfirmed, setPrescribingConfirmed] = useState<Record<number, boolean>>({});
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  const [expandedReport, setExpandedReport] = useState<Set<string>>(new Set());
  const [finalDecisions, setFinalDecisions] = useState<SimDecision[]>([]);

  useEffect(() => {
    if (isVirtualRoom && screen === "report") {
      const t = setTimeout(() => goBack(), 15000);
      return () => clearTimeout(t);
    }
  }, [isVirtualRoom, screen, goBack]);

  if (isVirtualRoom && virtualRoomCase && !vrAutoStarted && screen === "dashboard") {
    setVrAutoStarted(true);
    startCase(0, virtualRoomCase as ProntuarioFHIRCase);
  }

  const currentCase = isVirtualRoom && virtualRoomCase ? (virtualRoomCase as ProntuarioFHIRCase) : (allCases[caseIdx] as ProntuarioFHIRCase | undefined);
  const currentEncounter = currentCase?.encounters[encounterIdx];
  const patientRef = currentCase?.id || "caso-nativo";

  function startCase(i: number, caseOverride?: ProntuarioFHIRCase) {
    const c = caseOverride || (allCases[i] as ProntuarioFHIRCase);
    setCaseIdx(i);
    setEncounterIdx(0);
    setActiveTab("demografia");
    setCurrentMedications(c?.medications ? [...c.medications] : []);
    setSelectedOrders({});
    setOrderConfirmed({});
    setSelectedPrescribingId({});
    setPrescribingConfirmed({});
    setExpandedReport(new Set());
    setFinalDecisions([]);
    setScreen("sim");
  }

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const set = new Set(prev[encounterIdx] || []);
      set.has(orderId) ? set.delete(orderId) : set.add(orderId);
      return { ...prev, [encounterIdx]: set };
    });
  };

  const confirmOrders = () => setOrderConfirmed(prev => ({ ...prev, [encounterIdx]: true }));

  const confirmPrescribing = () => {
    const optionId = selectedPrescribingId[encounterIdx];
    const option = currentEncounter?.availablePrescribingOptions.find(o => o.id === optionId);
    if (option) setCurrentMedications(prev => applyPrescribingAction(prev, option));
    setPrescribingConfirmed(prev => ({ ...prev, [encounterIdx]: true }));
  };

  const buildEncounterDecisions = (encIdx: number): SimDecision[] => {
    const enc = currentCase!.encounters[encIdx];
    const chosenOrders = selectedOrders[encIdx] || new Set<string>();
    const orderDecisions: SimDecision[] = enc.availableOrders.map(o => {
      const wasOrdered = chosenOrders.has(o.id);
      const shouldOrder = enc.idealOrderIds.includes(o.id);
      return {
        label: `Exame: ${o.name}`,
        userChoice: wasOrdered ? "Solicitado" : "Não solicitado",
        idealChoice: shouldOrder ? "Solicitado" : "Não solicitado",
        correct: wasOrdered === shouldOrder,
        category: `${enc.label} — Exames`,
        explanation: o.rationale,
      };
    });
    const chosenPrescId = selectedPrescribingId[encIdx];
    const chosenPresc = enc.availablePrescribingOptions.find(o => o.id === chosenPrescId);
    const idealPresc = enc.availablePrescribingOptions.find(o => o.id === enc.idealPrescribingOptionId);
    const prescDecision: SimDecision = {
      label: `Conduta — ${enc.label}`,
      userChoice: chosenPresc?.label || "(nenhuma selecionada)",
      idealChoice: idealPresc?.label || "",
      correct: chosenPrescId === enc.idealPrescribingOptionId,
      category: `${enc.label} — Conduta`,
      explanation: idealPresc?.rationale,
    };
    return [...orderDecisions, prescDecision];
  };

  const goToNextEncounter = () => {
    if (!currentCase) return;
    const isLast = encounterIdx >= currentCase.encounters.length - 1;
    if (!isLast) {
      setEncounterIdx(i => i + 1);
      return;
    }
    const allDecisions = currentCase.encounters.flatMap((_, i) => buildEncounterDecisions(i));
    const payload = buildSimulatorDecisions(SLUG, allDecisions);
    setFinalDecisions(allDecisions);
    submitResults({ score: payload.summary.score, actions: payload });
    setScreen("report");
  };

  if (loadingVRCase) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isVirtualRoom && screen === "dashboard") return null;

  // Dashboard
  if (screen === "dashboard") {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Simulador de Prontuário Eletrônico (FHIR)</h1>
            <p className="text-muted-foreground">Navegue um prontuário clínico longitudinal — solicite exames, revise histórico e prescreva ao longo de várias consultas, vendo em cada seção como os dados trafegam como recursos FHIR.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Simulador de Prontuário Eletrônico (FHIR)" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any, i: number) => (
            c.isAI ? (
              <AICaseCard key={c.id || i} caseItem={c} onClick={() => startCase(i)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ) : (
              <NativeCaseCard key={c.id || i} caseItem={c} onClick={() => startCase(i)} />
            )
          ))}
          <Card className="border-dashed hover:shadow-lg transition-shadow cursor-pointer flex items-center justify-center min-h-[140px]" onClick={generateCase}>
            <div className="text-center p-6">
              {isGenerating ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /> : <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}
              <p className="font-medium">{isGenerating ? "Gerando caso..." : "Gerar com IA"}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentCase || !currentEncounter) return null;

  // Report
  if (screen === "report") {
    const categories = [...new Set(finalDecisions.map(d => d.category))];
    const totalScore = scorePercent(finalDecisions.filter(d => d.correct).length, finalDecisions.length);
    return (
      <div className="max-w-4xl mx-auto">
        {isVirtualRoom ? (
          <Button variant="ghost" onClick={goBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar à Home</Button>
        ) : (
          <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar aos Casos</Button>
        )}
        <Card className="mb-6">
          <CardHeader><CardTitle>Relatório do Prontuário</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-5xl font-bold mb-2">{totalScore}%</div>
              <p className="text-muted-foreground">Pontuação geral pelas decisões de solicitação de exames e conduta</p>
              <div className="w-full bg-muted rounded-full h-3 mt-4 max-w-xs mx-auto">
                <div className="bg-primary rounded-full h-3 transition-all" style={{ width: `${totalScore}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {categories.map(cat => {
            const decisions = finalDecisions.filter(d => d.category === cat);
            const catScore = scorePercent(decisions.filter(d => d.correct).length, decisions.length);
            const expanded = expandedReport.has(cat);
            return (
              <Card key={cat} className={`border-l-4 ${catScore >= 70 ? "border-l-green-500" : catScore >= 40 ? "border-l-yellow-500" : "border-l-red-500"}`}>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedReport(p => { const n = new Set(p); n.has(cat) ? n.delete(cat) : n.add(cat); return n; })}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{cat}</span>
                      <Badge variant={catScore >= 70 ? "default" : catScore >= 40 ? "secondary" : "destructive"}>{catScore}%</Badge>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {expanded && (
                  <CardContent className="text-sm space-y-3">
                    {decisions.map((d, i) => (
                      <div key={i} className="border-b pb-2 last:border-b-0">
                        <div className="flex items-center gap-2 mb-1">
                          {d.correct ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                          <span className="font-medium">{d.label}</span>
                        </div>
                        <p className="text-muted-foreground">Sua escolha: {d.userChoice}</p>
                        {!d.correct && <p className="text-muted-foreground">Ideal: {d.idealChoice}</p>}
                        {d.explanation && <p className="text-xs text-muted-foreground mt-1">💡 {d.explanation}</p>}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => startCase(caseIdx)}>Tentar Novamente</Button>
          {isVirtualRoom ? (
            <Button variant="outline" onClick={goBack}>Voltar à Home</Button>
          ) : (
            <Button variant="outline" onClick={() => setScreen("dashboard")}>Voltar aos Casos</Button>
          )}
        </div>
      </div>
    );
  }

  // Simulation
  const cumulativeObservations = [
    ...currentCase.baselineObservations,
    ...currentCase.encounters.slice(0, encounterIdx + 1).flatMap(e => e.resultsRevealed),
  ];
  const ordersOrdered = currentCase.encounters
    .slice(0, encounterIdx + 1)
    .flatMap((e, i) => e.availableOrders.filter(o => (selectedOrders[i] || new Set()).has(o.id)));

  const isOrdersConfirmed = !!orderConfirmed[encounterIdx];
  const isPrescribingConfirmed = !!prescribingConfirmed[encounterIdx];
  const isLastEncounter = encounterIdx >= currentCase.encounters.length - 1;

  return (
    <div className="max-w-7xl mx-auto">
      {examFeedback && examProgress && (
        <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={examFeedback.simulatorSlug} caseTitle={examFeedback.caseTitle} examProgress={examProgress} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />
      )}
      {isVirtualRoom ? (
        <Button variant="ghost" onClick={goBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar à Home</Button>
      ) : (
        <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
      )}
      <ExamBanner simulatorSlug={SLUG} caseTitle={currentCase.title} examProgress={examProgress} />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{currentCase.title}</h2>
        <Badge variant="outline">{currentEncounter.label} ({encounterIdx + 1}/{currentCase.encounters.length})</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient snapshot */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />{currentEncounter.dateDescription}</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>{currentCase.patient.name}</strong></p>
            <p>{currentCase.patient.birthDateDescription}</p>
            <Separator />
            <p className="font-medium">Narrativa:</p>
            <p className="text-muted-foreground">{currentEncounter.narrative}</p>
            <Separator />
            <p className="font-medium">Sinais Vitais:</p>
            {Object.entries(currentEncounter.vitals).map(([k, v]) => <p key={k} className="text-xs">{k}: {v}</p>)}
          </CardContent>
        </Card>

        {/* Chart tabs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" />Prontuário</CardTitle></CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-5 w-full text-xs">
                  <TabsTrigger value="demografia">Demografia</TabsTrigger>
                  <TabsTrigger value="problemas">Problemas</TabsTrigger>
                  <TabsTrigger value="medicacoes">Medicações</TabsTrigger>
                  <TabsTrigger value="exames">Exames</TabsTrigger>
                  <TabsTrigger value="timeline">Linha do tempo</TabsTrigger>
                </TabsList>

                <TabsContent value="demografia" className="mt-4 text-sm space-y-1">
                  <p><strong>Nome:</strong> {currentCase.patient.name}</p>
                  <p><strong>Nascimento:</strong> {currentCase.patient.birthDateDescription}</p>
                  <p><strong>Sexo:</strong> {currentCase.patient.gender === "male" ? "Masculino" : "Feminino"}</p>
                  <p><strong>Diagnóstico principal:</strong> {currentCase.patient.diagnosis}</p>
                  <FhirSectionViewer label="Paciente" bundleView={mapPatientToFHIR(currentCase.patient, patientRef)} />
                </TabsContent>

                <TabsContent value="problemas" className="mt-4 text-sm space-y-2">
                  {currentCase.problems.map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <Stethoscope className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{p.display} <span className="text-muted-foreground">(CID-10 {p.icd10Code})</span> — {p.onsetDescription}</span>
                      <Badge variant={p.status === "active" ? "default" : "secondary"} className="ml-auto">{p.status}</Badge>
                    </div>
                  ))}
                  <FhirSectionViewer label="Problemas" bundleView={mapProblemsToFHIR(currentCase.problems, patientRef)} />
                </TabsContent>

                <TabsContent value="medicacoes" className="mt-4 text-sm space-y-2">
                  {currentMedications.length === 0 && <p className="text-muted-foreground italic">Nenhuma medicação em uso ainda.</p>}
                  {currentMedications.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <Pill className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{m.drug} {m.dose} — {m.route} {m.frequency}</span>
                      <Badge variant={m.status === "active" ? "default" : "secondary"} className="ml-auto">{m.status}</Badge>
                    </div>
                  ))}
                  <FhirSectionViewer label="Medicações" bundleView={mapMedicationsToFHIR(currentMedications, patientRef)} />
                </TabsContent>

                <TabsContent value="exames" className="mt-4 text-sm space-y-2">
                  {cumulativeObservations.length === 0 && <p className="text-muted-foreground italic">Nenhum resultado disponível ainda.</p>}
                  {cumulativeObservations.map(o => (
                    <div key={o.id} className="flex items-center gap-2">
                      <TestTube className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{o.name}: {o.value} {o.unit} <span className="text-muted-foreground">(ref: {o.referenceRange})</span></span>
                      <Badge variant={o.interpretation === "normal" ? "secondary" : "destructive"} className="ml-auto">{o.interpretation}</Badge>
                    </div>
                  ))}
                  <FhirSectionViewer label="Exames" bundleView={mapObservationsToFHIR(cumulativeObservations, patientRef)} />
                </TabsContent>

                <TabsContent value="timeline" className="mt-4 text-sm space-y-3">
                  {currentCase.encounters.map((e, i) => (
                    <div key={e.id} className={`p-2 rounded border ${i > encounterIdx ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-2">
                        {i > encounterIdx && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="font-medium">{e.label}</span>
                        <span className="text-muted-foreground text-xs">{e.dateDescription}</span>
                      </div>
                      {i <= encounterIdx && <p className="text-muted-foreground text-xs mt-1">{e.narrative}</p>}
                    </div>
                  ))}
                  <FhirSectionViewer label="Pedidos de Exame" bundleView={mapOrdersToFHIR(ordersOrdered, patientRef, "completed")} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action cards for current encounter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Solicitar Exames</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {currentEncounter.availableOrders.map(o => {
              const checked = (selectedOrders[encounterIdx] || new Set()).has(o.id);
              const shouldOrder = currentEncounter.idealOrderIds.includes(o.id);
              return (
                <div key={o.id} className="flex items-start gap-2">
                  <Checkbox id={`order-${o.id}`} checked={checked} disabled={isOrdersConfirmed} onCheckedChange={() => toggleOrder(o.id)} />
                  <Label htmlFor={`order-${o.id}`} className="text-sm font-normal cursor-pointer flex-1">
                    {o.name} <span className="text-xs text-muted-foreground">({o.category})</span>
                    {isOrdersConfirmed && (checked === shouldOrder ? <CheckCircle className="inline h-3.5 w-3.5 text-green-500 ml-1" /> : <XCircle className="inline h-3.5 w-3.5 text-red-500 ml-1" />)}
                    {isOrdersConfirmed && o.rationale && <p className="text-xs text-muted-foreground mt-0.5">💡 {o.rationale}</p>}
                  </Label>
                </div>
              );
            })}
            {!isOrdersConfirmed && <Button size="sm" className="mt-2" onClick={confirmOrders}>Confirmar Pedidos</Button>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Conduta / Ajuste</CardTitle></CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedPrescribingId[encounterIdx] || ""}
              onValueChange={v => setSelectedPrescribingId(prev => ({ ...prev, [encounterIdx]: v }))}
            >
              {currentEncounter.availablePrescribingOptions.map(o => {
                const isIdeal = o.id === currentEncounter.idealPrescribingOptionId;
                const isChosen = selectedPrescribingId[encounterIdx] === o.id;
                return (
                  <div key={o.id} className="flex items-start gap-2 mb-2">
                    <RadioGroupItem value={o.id} id={`presc-${o.id}`} disabled={isPrescribingConfirmed} />
                    <Label htmlFor={`presc-${o.id}`} className="text-sm font-normal cursor-pointer flex-1">
                      {o.label}
                      {isPrescribingConfirmed && isChosen && (isIdeal ? <CheckCircle className="inline h-3.5 w-3.5 text-green-500 ml-1" /> : <XCircle className="inline h-3.5 w-3.5 text-red-500 ml-1" />)}
                      {isPrescribingConfirmed && isIdeal && <p className="text-xs text-muted-foreground mt-0.5">💡 {o.rationale}</p>}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
            {!isPrescribingConfirmed && (
              <Button size="sm" className="mt-2" disabled={!selectedPrescribingId[encounterIdx]} onClick={confirmPrescribing}>
                Confirmar Conduta
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {currentEncounter.educationalNote && isOrdersConfirmed && isPrescribingConfirmed && (
        <Card className="mt-4 border-primary/20 bg-primary/5">
          <CardContent className="text-sm p-4">📚 {currentEncounter.educationalNote}</CardContent>
        </Card>
      )}

      <div className="mt-6 flex justify-end">
        <Button size="lg" disabled={!isOrdersConfirmed || !isPrescribingConfirmed} onClick={goToNextEncounter}>
          <ClipboardList className="h-4 w-4 mr-2" />
          {isLastEncounter ? "Finalizar e Ver Relatório" : "Avançar para próxima consulta"}
        </Button>
      </div>
    </div>
  );
}
