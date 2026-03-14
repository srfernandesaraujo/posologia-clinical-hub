import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, Loader2, Pill, ChevronRight, User, FileText, Scale, CheckCircle2, MessageSquare, Store } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import SimulatorHowToUse from "@/components/simulators/SimulatorHowToUse";
import SimulatorFeedback, { FeedbackDecision } from "@/components/simulators/SimulatorFeedback";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import PrescricaoAmarelaA from "@/components/simulators/prescricoes/PrescricaoAmarelaA";
import PrescricaoAzulB from "@/components/simulators/prescricoes/PrescricaoAzulB";
import ReceitaControleEspecial from "@/components/simulators/prescricoes/ReceitaControleEspecial";

const SLUG = "dispensacao-344";

/* ─── Types ─── */
interface FieldError { campo: string; correto: boolean; detalhe: string; artigo?: string }
interface LegalQuestion { pergunta: string; opcoes: string[]; correta: number; explicacao: string; artigo?: string }
interface OrientacaoItem { texto: string; correta: boolean }

interface CaseData {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient?: { diagnosis: string };
  tipo: "A" | "B" | "C";
  paciente: { nome: string; idade: number; queixa: string; comportamento: string };
  prescricao: any;
  errosCampos: FieldError[];
  perguntasLegais: LegalQuestion[];
  decisaoCorreta: "dispensar" | "recusar" | "parcial";
  justificativaCorreta: string;
  orientacoes: OrientacaoItem[];
  narrativa: string;
}

/* ─── Built-in Cases ─── */
const BUILT_IN_CASES: CaseData[] = [
  {
    title: "Caso 1: Notificação A — Morfina (Lista A1)",
    difficulty: "Médio",
    tipo: "A",
    patient: { diagnosis: "Dispensação de Morfina (Lista A1) — Notificação amarela com erros" },
    paciente: {
      nome: "Maria da Silva", idade: 62,
      queixa: "Vim buscar a morfina do meu marido. Ele tem câncer e está com muita dor.",
      comportamento: "Paciente acompanhante, visivelmente preocupada, apresenta RG ao balcão."
    },
    prescricao: {
      uf: "MG", numero: "042857",
      emitente: { nome: "Dr. José Roberto Almeida", crm: "CRM-MG 24.581", endereco: "Av. Afonso Pena, 1500 - Belo Horizonte/MG", telefone: "(31) 3222-4500" },
      paciente: { nome: "Antônio Carlos da Silva", endereco: "Rua das Flores, 230 - Belo Horizonte/MG" },
      medicamento: "Sulfato de Morfina 10mg comprimidos",
      quantidade: "120", formaFarmaceutica: "Comprimidos", doseUnidade: "10mg",
      posologia: "1 comprimido de 6/6h", data: "15/01/2026", assinaturaEmitente: true,
      comprador: { nome: "Maria da Silva", endereco: "", telefone: "", identidade: "MG-12.345.678", orgaoEmissor: "SSP/MG" },
      fornecedor: { nome: "", data: "" },
    },
    errosCampos: [
      { campo: "Data da prescrição", correto: false, detalhe: "Data de 15/01/2026 — mais de 30 dias. Notificação A tem validade de 30 dias (Art. 55).", artigo: "Art. 55" },
      { campo: "Endereço do comprador", correto: false, detalhe: "Campo do endereço do comprador está em branco. É obrigatório (Art. 35, §1º).", artigo: "Art. 35, §1º" },
      { campo: "Quantidade", correto: false, detalhe: "120 comprimidos para 6/6h = 40 dias de tratamento. Lista A permite no máximo 30 dias (Art. 44, I).", artigo: "Art. 44, I" },
      { campo: "Identificação do emitente", correto: true, detalhe: "Nome, CRM, endereço e telefone presentes e corretos." },
      { campo: "Assinatura do emitente", correto: true, detalhe: "Assinatura presente." },
      { campo: "Nome do paciente", correto: true, detalhe: "Nome completo presente." },
      { campo: "Medicamento", correto: true, detalhe: "Nome do medicamento, forma farmacêutica e dose descritos corretamente." },
    ],
    perguntasLegais: [
      { pergunta: "Qual a validade desta Notificação de Receita A?", opcoes: ["15 dias", "30 dias", "60 dias", "90 dias"], correta: 1, explicacao: "A Notificação de Receita A tem validade de 30 dias a partir da data de emissão (Art. 55).", artigo: "Art. 55" },
      { pergunta: "Qual a quantidade máxima para lista A em tratamento ambulatorial?", opcoes: ["15 dias", "30 dias", "60 dias", "5 ampolas"], correta: 1, explicacao: "Para lista A, a quantidade corresponde a no máximo 30 dias de tratamento ou 5 ampolas (Art. 44, I).", artigo: "Art. 44, I" },
      { pergunta: "A Notificação A deve ser retida pela farmácia?", opcoes: ["Sim, sempre", "Não, devolver ao paciente", "Apenas se for injetável", "Apenas se for lista A2"], correta: 0, explicacao: "A Notificação de Receita A é sempre retida pela farmácia (Art. 39).", artigo: "Art. 39" },
    ],
    decisaoCorreta: "recusar",
    justificativaCorreta: "Recusar dispensação: (1) Notificação vencida (>30 dias); (2) Endereço do comprador incompleto; (3) Quantidade excede 30 dias de tratamento. Orientar o paciente a retornar ao médico para nova prescrição.",
    orientacoes: [
      { texto: "Explicar gentilmente que a receita está vencida e precisa ser renovada", correta: true },
      { texto: "Orientar sobre armazenamento da morfina (local seguro, fora do alcance de crianças)", correta: true },
      { texto: "Informar que o comprador precisa apresentar documento com foto", correta: true },
      { texto: "Sugerir que o paciente troque por um analgésico comum por conta própria", correta: false },
      { texto: "Orientar sobre efeitos adversos (constipação, sonolência, depressão respiratória)", correta: true },
      { texto: "Dispensar parcialmente sem corrigir a receita", correta: false },
    ],
    narrativa: "Ao tentar dispensar com essa notificação, o farmacêutico estaria infringindo a Portaria 344/98 em três pontos: prescrição fora do prazo de validade (risco de uso inadequado sem reavaliação médica), dados incompletos do comprador (impossibilitando rastreabilidade) e quantidade excessiva (40 dias de opioide sem monitoramento). A atitude correta é acolher a acompanhante, explicar os motivos da recusa com empatia e orientar a buscar nova prescrição médica."
  },
  {
    title: "Caso 2: Notificação B — Clonazepam (Lista B1)",
    difficulty: "Difícil",
    tipo: "B",
    patient: { diagnosis: "Dispensação de Clonazepam (Lista B1) — Prescritor fora do escopo" },
    paciente: {
      nome: "João Pedro Martins", idade: 35,
      queixa: "Preciso do meu Rivotril. O dentista me passou porque estou muito ansioso com o tratamento de canal.",
      comportamento: "Paciente apresenta-se sozinho, um pouco agitado. Mostra a receita rapidamente."
    },
    prescricao: {
      uf: "SP", numero: "B23001",
      emitente: { nome: "Dr. Lucas Ferreira", crm: "CRO-SP 85.230", endereco: "Rua Augusta, 900 - São Paulo/SP", telefone: "(11) 3045-7890" },
      paciente: { nome: "João Pedro Martins", endereco: "Rua Vergueiro, 1200 - São Paulo/SP" },
      medicamento: "Clonazepam 2mg gotas (frasco 20mL)",
      quantidade: "2", formaFarmaceutica: "Frascos gotas 20mL",
      posologia: "10 gotas à noite ao deitar", data: "10/03/2026", assinaturaEmitente: true,
      comprador: { nome: "João Pedro Martins", endereco: "Rua Vergueiro, 1200", telefone: "(11) 98765-4321", identidade: "44.555.666-7", orgaoEmissor: "SSP/SP" },
      fornecedor: "Farmácia Central - CNPJ 12.345.678/0001-99",
    },
    errosCampos: [
      { campo: "Habilitação do prescritor", correto: false, detalhe: "CRO (dentista) prescrevendo Clonazepam para ansiedade — fora do escopo odontológico. Dentista só pode prescrever medicamentos de uso odontológico (Art. 38).", artigo: "Art. 38" },
      { campo: "UF da notificação", correto: false, detalhe: "Notificação emitida em SP. Se a farmácia estiver em outro estado, a dispensação não é válida (Art. 55, §2º).", artigo: "Art. 55, §2º" },
      { campo: "Data", correto: true, detalhe: "Dentro do prazo de validade (30 dias)." },
      { campo: "Identificação do paciente", correto: true, detalhe: "Nome e endereço presentes." },
      { campo: "Quantidade", correto: true, detalhe: "2 frascos de 20mL para 10 gotas/noite — quantidade adequada para 60 dias (B1 permite até 60 dias, Art. 44, II)." },
      { campo: "Dados do comprador", correto: true, detalhe: "Todos os dados preenchidos corretamente." },
    ],
    perguntasLegais: [
      { pergunta: "Qual a validade da Notificação de Receita B?", opcoes: ["15 dias", "30 dias", "60 dias", "90 dias"], correta: 1, explicacao: "A Notificação B tem validade de 30 dias (Art. 55).", artigo: "Art. 55" },
      { pergunta: "Dentista pode prescrever Clonazepam para ansiedade generalizada?", opcoes: ["Sim, sem restrições", "Sim, com justificativa", "Não, fora do escopo", "Sim, apenas em hospitais"], correta: 2, explicacao: "Dentista (CRO) só pode prescrever medicamentos para fins odontológicos (Art. 38).", artigo: "Art. 38" },
      { pergunta: "A Notificação B pode ser dispensada em UF diferente da emissão?", opcoes: ["Sim, sem restrições", "Não, salvo exceções", "Sim, apenas em capitais", "Sim, com carimbo extra"], correta: 1, explicacao: "A Notificação B tem validade restrita à UF de emissão (Art. 55, §2º).", artigo: "Art. 55, §2º" },
    ],
    decisaoCorreta: "recusar",
    justificativaCorreta: "Recusar: prescrição por profissional fora do escopo de atuação (dentista prescrevendo benzodiazepínico para ansiedade generalizada).",
    orientacoes: [
      { texto: "Explicar que o dentista pode prescrever medicamentos, mas apenas para uso odontológico", correta: true },
      { texto: "Orientar a procurar um médico (clínico ou psiquiatra) para ansiedade", correta: true },
      { texto: "Alertar sobre riscos de uso prolongado de benzodiazepínicos (dependência, tolerância)", correta: true },
      { texto: "Dispensar o medicamento pois a receita está formalmente correta", correta: false },
      { texto: "Manter sigilo sobre a condição do paciente", correta: true },
      { texto: "Sugerir outro benzodiazepínico de venda livre", correta: false },
    ],
    narrativa: "Embora a notificação esteja formalmente preenchida, a prescrição por dentista para ansiedade generalizada extrapola o escopo de habilitação do prescritor. Dispensar nessa situação colocaria o farmacêutico como corresponsável pelo uso inadequado. O acolhimento empático e o encaminhamento correto protegem o paciente e a responsabilidade profissional do farmacêutico."
  },
  {
    title: "Caso 3: Receita C — Polifarmácia (Lista C1)",
    difficulty: "Difícil",
    tipo: "C",
    patient: { diagnosis: "Polifarmácia C1 — 4 substâncias + ausência da 2ª via" },
    paciente: {
      nome: "Dona Aparecida", idade: 55,
      queixa: "O médico passou esses remédios para minha dor e ansiedade. Preciso de todos.",
      comportamento: "Paciente apresenta apenas a 1ª via da receita, diz que perdeu a 2ª via."
    },
    prescricao: {
      emitente: { nome: "Dr. Fernando Costa", crm: "CRM-RJ 45.678", uf: "RJ", endereco: "Rua Visconde de Pirajá, 330 - Rio de Janeiro/RJ", telefone: "(21) 2523-4000", cidade: "Rio de Janeiro" },
      paciente: { nome: "Aparecida Gonçalves de Souza", endereco: "Rua Barão de Mesquita, 456 - Tijuca - Rio de Janeiro/RJ" },
      prescricao: [
        "Pregabalina 75mg — 1 cápsula 12/12h — 60 cápsulas",
        "Cloridrato de Clonidina 0,15mg — 1 comp 12/12h — 60 comprimidos",
        "Cloridrato de Tramadol 50mg — 1 cápsula 8/8h — 90 cápsulas",
        "Carbamazepina 200mg — 1 comp 12/12h — 60 comprimidos",
      ],
      data: "12/03/2026", assinaturaEmitente: true,
      comprador: { nome: "Aparecida Gonçalves de Souza", identidade: "08.765.432-1", orgaoEmissor: "DETRAN/RJ", endereco: "Rua Barão de Mesquita, 456", cidade: "Rio de Janeiro", uf: "RJ", telefone: "(21) 99876-5432" },
      fornecedor: { assinaturaFarmaceutico: false, data: "" },
      segundaVia: false,
    },
    errosCampos: [
      { campo: "Número de substâncias", correto: false, detalhe: "4 substâncias C1 na mesma receita. O máximo é 3 (Art. 47).", artigo: "Art. 47" },
      { campo: "2ª via da receita", correto: false, detalhe: "Paciente apresenta apenas a 1ª via. A Receita de Controle Especial deve ter 2 vias (Art. 35, §3º).", artigo: "Art. 35, §3º" },
      { campo: "Data", correto: true, detalhe: "Dentro do prazo de validade (30 dias)." },
      { campo: "Identificação do emitente", correto: true, detalhe: "Nome, CRM, UF, endereço e telefone corretos." },
      { campo: "Assinatura do emitente", correto: true, detalhe: "Presente." },
      { campo: "Dados do comprador", correto: true, detalhe: "Todos os campos preenchidos." },
    ],
    perguntasLegais: [
      { pergunta: "Quantas substâncias C1 podem constar numa mesma receita?", opcoes: ["1", "2", "3", "Sem limite"], correta: 2, explicacao: "A receita pode conter no máximo 3 substâncias da lista C1 (Art. 47).", artigo: "Art. 47" },
      { pergunta: "Quantas vias deve ter a Receita de Controle Especial?", opcoes: ["1 via", "2 vias", "3 vias", "4 vias"], correta: 1, explicacao: "A Receita de Controle Especial é emitida em 2 vias (Art. 35, §3º).", artigo: "Art. 35, §3º" },
      { pergunta: "Qual a validade da Receita de Controle Especial?", opcoes: ["15 dias", "30 dias", "60 dias", "90 dias"], correta: 1, explicacao: "Validade de 30 dias (Art. 55).", artigo: "Art. 55" },
    ],
    decisaoCorreta: "parcial",
    justificativaCorreta: "Dispensar parcialmente até 3 substâncias (Art. 47), desde que o paciente traga a 2ª via. Orientar a solicitar nova receita para a 4ª substância.",
    orientacoes: [
      { texto: "Explicar que a receita pode conter no máximo 3 substâncias controladas", correta: true },
      { texto: "Orientar a voltar ao médico para separar os medicamentos em receitas distintas", correta: true },
      { texto: "Solicitar que traga a 2ª via antes da dispensação", correta: true },
      { texto: "Orientar sobre possíveis interações entre Pregabalina e Tramadol (risco de depressão do SNC)", correta: true },
      { texto: "Dispensar todos os 4 medicamentos de uma vez para evitar transtorno ao paciente", correta: false },
      { texto: "Orientar sobre armazenamento adequado dos medicamentos controlados", correta: true },
    ],
    narrativa: "Dispensar 4 substâncias C1 numa mesma receita viola o Art. 47 da Portaria 344/98. Além disso, a ausência da 2ª via impossibilita a retenção documental adequada. O farmacêutico deve acolher a paciente, explicar a limitação legal e propor a dispensação parcial (até 3 substâncias) após apresentação da 2ª via, orientando-a a solicitar receita separada para a 4ª substância."
  },
];

const STEP_LABELS = [
  { icon: User, label: "Acolhimento" },
  { icon: FileText, label: "Análise" },
  { icon: Scale, label: "Verificação Legal" },
  { icon: CheckCircle2, label: "Decisão" },
  { icon: MessageSquare, label: "Orientação" },
];

const HOW_TO_USE_STEPS = [
  "Selecione um caso clínico ou gere um novo com IA.",
  "No Acolhimento, escolha a melhor abordagem ao paciente no balcão da farmácia.",
  "Na Análise da Prescrição, examine o documento visual e marque os campos corretos e incorretos.",
  "Na Verificação Legal, responda às perguntas sobre validade, quantidade e legislação.",
  "Na Decisão, escolha se deve dispensar, recusar ou dispensar parcialmente, com justificativa.",
  "Na Orientação, selecione os itens corretos de aconselhamento ao paciente.",
  "Ao final, receba o feedback formativo com referências à Portaria 344/98.",
];

const ACOLHIMENTO_OPTIONS = [
  { label: "Bom dia! Como posso ajudar? Pode me mostrar a receita, por favor?", score: 10 },
  { label: "Receita, por favor.", score: 3 },
  { label: "Olá! Vejo que trouxe uma prescrição. Posso verificar todos os dados com cuidado para garantir que tudo esteja correto?", score: 10 },
  { label: "Deixa a receita aí que eu vejo depois.", score: 0 },
];

export default function SimuladorDispensacao344() {
  const navigate = useNavigate();
  const location = useLocation();
  const isVirtualRoom = location.pathname.startsWith("/sala");
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, BUILT_IN_CASES);
  const { virtualRoomCase, isVirtualRoom: isRoom, examProgress, examFeedback, submitResults, proceedToNext } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<CaseData | null>(null);
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [acolhimento, setAcolhimento] = useState<number | null>(null);
  const [fieldChecks, setFieldChecks] = useState<Record<string, boolean>>({});
  const [legalAnswers, setLegalAnswers] = useState<Record<number, number>>({});
  const [decisao, setDecisao] = useState<string | null>(null);
  const [orientChecks, setOrientChecks] = useState<Record<number, boolean>>({});
  const [showFeedback, setShowFeedback] = useState(false);

  const startCase = useCallback((c: CaseData) => {
    setActiveCase(c);
    setStep(0);
    setCompletedSteps(new Set());
    setAcolhimento(null);
    setFieldChecks({});
    setLegalAnswers({});
    setDecisao(null);
    setOrientChecks({});
    setShowFeedback(false);
  }, []);

  const loadAICase = useCallback((rawCase: any) => {
    const caseData = rawCase.case_data || rawCase;
    startCase({ ...caseData, id: rawCase.id, isAI: true } as CaseData);
  }, [startCase]);

  const calculateScore = useCallback(() => {
    if (!activeCase) return { score: 0, decisions: [] as FeedbackDecision[] };
    const decisions: FeedbackDecision[] = [];

    const acolhScore = acolhimento !== null ? ACOLHIMENTO_OPTIONS[acolhimento].score : 0;
    decisions.push({ label: "Acolhimento ao paciente", userChoice: acolhimento !== null ? ACOLHIMENTO_OPTIONS[acolhimento].label : "Não respondido", idealChoice: ACOLHIMENTO_OPTIONS[0].label, correct: acolhScore >= 10, explanation: "O acolhimento deve ser empático, profissional e solicitando a receita com educação." });

    let fieldScore = 0;
    const totalFields = activeCase.errosCampos.length;
    activeCase.errosCampos.forEach(f => {
      const userSaysCorrect = fieldChecks[f.campo] === true;
      if (userSaysCorrect === f.correto) fieldScore++;
    });
    const fieldPct = totalFields > 0 ? fieldScore / totalFields : 0;
    decisions.push({ label: "Análise dos campos da prescrição", userChoice: `${fieldScore}/${totalFields} campos corretos`, idealChoice: `${totalFields}/${totalFields}`, correct: fieldPct >= 0.8, explanation: activeCase.errosCampos.filter(f => !f.correto).map(f => `${f.campo}: ${f.detalhe}`).join("; ") });

    let legalScore = 0;
    activeCase.perguntasLegais.forEach((q, i) => {
      if (legalAnswers[i] === q.correta) legalScore++;
    });
    const legalPct = activeCase.perguntasLegais.length > 0 ? legalScore / activeCase.perguntasLegais.length : 0;
    decisions.push({ label: "Verificação legal (Portaria 344)", userChoice: `${legalScore}/${activeCase.perguntasLegais.length} corretas`, idealChoice: `${activeCase.perguntasLegais.length}/${activeCase.perguntasLegais.length}`, correct: legalPct >= 0.8 });

    const decCorrect = decisao === activeCase.decisaoCorreta;
    decisions.push({ label: "Decisão de dispensação", userChoice: decisao || "Não respondido", idealChoice: activeCase.decisaoCorreta, correct: decCorrect, explanation: activeCase.justificativaCorreta });

    let orientScore = 0;
    activeCase.orientacoes.forEach((o, i) => {
      const checked = orientChecks[i] === true;
      if (checked === o.correta) orientScore++;
    });
    const orientPct = activeCase.orientacoes.length > 0 ? orientScore / activeCase.orientacoes.length : 0;
    decisions.push({ label: "Orientação ao paciente", userChoice: `${orientScore}/${activeCase.orientacoes.length} corretas`, idealChoice: `${activeCase.orientacoes.length}/${activeCase.orientacoes.length}`, correct: orientPct >= 0.8 });

    const totalScore = Math.round(
      (acolhScore >= 10 ? 15 : acolhScore >= 3 ? 5 : 0) +
      fieldPct * 25 + legalPct * 25 + (decCorrect ? 20 : 0) + orientPct * 15
    );

    return { score: Math.min(100, totalScore), decisions };
  }, [activeCase, acolhimento, fieldChecks, legalAnswers, decisao, orientChecks]);

  const finishSimulation = useCallback(() => {
    const { score } = calculateScore();
    setShowFeedback(true);
    if (isRoom) submitResults({ score, actions: { acolhimento, fieldChecks, legalAnswers, decisao, orientChecks } });
  }, [calculateScore, isRoom, submitResults, acolhimento, fieldChecks, legalAnswers, decisao, orientChecks]);

  const advanceStep = useCallback(() => {
    setCompletedSteps(prev => new Set([...prev, step]));
    if (step < 4) setStep(step + 1);
    else finishSimulation();
  }, [step, finishSimulation]);

  // Room case handling
  if (virtualRoomCase && !activeCase) {
    const cd = virtualRoomCase.case_data as any;
    startCase({ ...cd, id: virtualRoomCase.id, title: virtualRoomCase.title } as CaseData);
  }

  // AI cases from DB
  const aiCases = allCases.filter((c: any) => c.isAI);

  /* ─── Dashboard ─── */
  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(isVirtualRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2"><Store className="h-5 w-5 text-primary" /> Dispensação — Portaria 344/98</h1>
              <p className="text-sm text-muted-foreground">Treine a dispensação de medicamentos controlados no balcão da farmácia</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SimulatorHowToUse title="Dispensação 344" steps={HOW_TO_USE_STEPS} />
            <AdminPromptViewer toolSlug={SLUG} toolName="Dispensação 344" toolType="simulator" prompt={getNativePrompt(SLUG)} />
          </div>
        </div>

        {examProgress && <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUILT_IN_CASES.map((c, i) => (
            <NativeCaseCard key={i} caseItem={c} onClick={() => startCase(c)} />
          ))}
          {aiCases.map((c: any) => (
            <AICaseCard
              key={c.id}
              caseItem={c}
              onClick={() => loadAICase(c)}
              onDelete={deleteCase}
              onUpdate={updateCase}
              onCopy={copyCase}
              availableTargets={availableTargets}
              onToggleMarketplace={toggleCaseMarketplace}
            />
          ))}
        </div>

        <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Gerar caso com IA
        </Button>
      </div>
    );
  }

  /* ─── Simulation ─── */
  const PrescriptionComponent = activeCase.tipo === "A" ? PrescricaoAmarelaA : activeCase.tipo === "B" ? PrescricaoAzulB : ReceitaControleEspecial;

  return (
    <div className="space-y-6">
      {examProgress && <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-lg font-bold">{activeCase.title}</h1>
          <Badge variant="secondary">{activeCase.difficulty}</Badge>
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEP_LABELS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === i;
          const isDone = completedSteps.has(i);
          return (
            <div key={i} className="flex items-center gap-1">
              <button
                onClick={() => isDone && setStep(i)}
                disabled={!isDone && !isActive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/10 text-primary cursor-pointer" : "bg-muted text-muted-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < 4 && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Step 0: Acolhimento */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Acolhimento no Balcão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">🏪 Cenário:</p>
              <p className="text-sm text-muted-foreground">{activeCase.paciente.comportamento}</p>
              <p className="text-sm italic text-muted-foreground mt-2">Paciente: "{activeCase.paciente.queixa}"</p>
            </div>
            <p className="text-sm font-medium">Como você aborda este paciente?</p>
            <RadioGroup value={acolhimento?.toString()} onValueChange={v => setAcolhimento(parseInt(v))}>
              {ACOLHIMENTO_OPTIONS.map((opt, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={i.toString()} id={`acolh-${i}`} />
                  <Label htmlFor={`acolh-${i}`} className="text-sm cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <Button onClick={advanceStep} disabled={acolhimento === null} className="gap-2">Avançar <ChevronRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Análise da Prescrição */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Prescrição Apresentada</CardTitle></CardHeader>
            <CardContent>
              <PrescriptionComponent data={activeCase.prescricao} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Marque os campos que estão CORRETOS:</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {activeCase.errosCampos.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox id={`field-${i}`} checked={fieldChecks[f.campo] === true} onCheckedChange={v => setFieldChecks(prev => ({ ...prev, [f.campo]: !!v }))} />
                  <Label htmlFor={`field-${i}`} className="text-sm cursor-pointer">{f.campo}</Label>
                </div>
              ))}
              <Button onClick={advanceStep} className="gap-2 mt-3">Avançar <ChevronRight className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Verificação Legal */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> Verificação Legal — Portaria 344/98</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {activeCase.perguntasLegais.map((q, qi) => (
              <div key={qi} className="space-y-2">
                <p className="text-sm font-medium">{qi + 1}. {q.pergunta}</p>
                <RadioGroup value={legalAnswers[qi]?.toString()} onValueChange={v => setLegalAnswers(prev => ({ ...prev, [qi]: parseInt(v) }))}>
                  {q.opcoes.map((op, oi) => (
                    <div key={oi} className="flex items-center gap-2 pl-2">
                      <RadioGroupItem value={oi.toString()} id={`legal-${qi}-${oi}`} />
                      <Label htmlFor={`legal-${qi}-${oi}`} className="text-sm cursor-pointer">{op}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
            <Button onClick={advanceStep} disabled={Object.keys(legalAnswers).length < activeCase.perguntasLegais.length} className="gap-2">Avançar <ChevronRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Decisão */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Decisão de Dispensação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Com base na análise da prescrição e na legislação, qual a sua decisão?</p>
            <RadioGroup value={decisao || ""} onValueChange={setDecisao}>
              {[
                { value: "dispensar", label: "✅ Dispensar — a prescrição está correta" },
                { value: "recusar", label: "❌ Recusar — há irregularidades que impedem a dispensação" },
                { value: "parcial", label: "⚠️ Dispensar parcialmente — dispensar o que for regular e orientar sobre o restante" },
              ].map(opt => (
                <div key={opt.value} className="flex items-start gap-2 p-3 rounded-lg border border-border hover:bg-muted/50">
                  <RadioGroupItem value={opt.value} id={`dec-${opt.value}`} />
                  <Label htmlFor={`dec-${opt.value}`} className="text-sm cursor-pointer font-medium">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <Button onClick={advanceStep} disabled={!decisao} className="gap-2">Avançar <ChevronRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Orientação */}
      {step === 4 && !showFeedback && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> Orientação ao Paciente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione as orientações que você daria ao paciente neste momento:</p>
            {activeCase.orientacoes.map((o, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                <Checkbox id={`orient-${i}`} checked={orientChecks[i] === true} onCheckedChange={v => setOrientChecks(prev => ({ ...prev, [i]: !!v }))} />
                <Label htmlFor={`orient-${i}`} className="text-sm cursor-pointer">{o.texto}</Label>
              </div>
            ))}
            <Button onClick={advanceStep} className="gap-2">Finalizar Simulação <CheckCircle2 className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      {showFeedback && (() => {
        const result = calculateScore();
        return (
          <>
            <SimulatorFeedback score={result.score} decisions={result.decisions} narrative={activeCase.narrativa} visible={true} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveCase(null)}>Voltar ao painel</Button>
              <Button onClick={() => startCase(activeCase)}>Refazer caso</Button>
            </div>
            {examFeedback && (
              <ExamFeedbackOverlay
                score={examFeedback.score}
                simulatorSlug={examFeedback.simulatorSlug}
                caseTitle={examFeedback.caseTitle}
                examProgress={examProgress!}
                onProceed={proceedToNext}
                isFinalActivity={examFeedback.isFinalActivity}
              />
            )}
          </>
        );
      })()}
    </div>
  );
}
