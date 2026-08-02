import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Loader2, Mic, Square, User2, Stethoscope, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { buildSimulatorDecisions } from "@/lib/buildSimulatorDecisions";
import { useVoiceRecorder, blobToBase64 } from "@/hooks/useVoiceRecorder";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

const SLUG = "paciente-ia-voz";
const DAILY_VOICE_TURN_CAP = 15;

interface PatientPersona {
  name: string;
  age: number;
  sex: string;
  occupation: string;
  diagnosis: string;
  chiefComplaint: string;
  spontaneousInfo: string[];
  hiddenInfo: { fact: string; revealTrigger: string }[];
  personality: { traits: string; speechStyle: string; mood: string };
  redFlags: string[];
  rubricFocus: string[];
}

interface VoiceCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: PatientPersona;
}

const BUILT_IN_CASES: VoiceCase[] = [
  {
    title: "Dor de Garganta Simples",
    difficulty: "Fácil",
    patient: {
      name: "Marcos Aurélio", age: 24, sex: "Masculino", occupation: "estudante universitário",
      diagnosis: "Dor de garganta e febre baixa há 2 dias",
      chiefComplaint: "Dor de garganta e febre baixa há 2 dias",
      spontaneousInfo: [
        "Estou com a garganta doendo muito desde anteontem.",
        "Também senti um pouco de febre, mas não medi direito.",
        "Tá difícil até engolir a comida.",
      ],
      hiddenInfo: [
        { fact: "Não tomou nenhum remédio ainda, só chá com mel.", revealTrigger: "perguntado sobre o que já tentou fazer para melhorar" },
        { fact: "Um colega de quarto teve algo parecido semana passada.", revealTrigger: "perguntado sobre contato com outras pessoas doentes" },
        { fact: "Não tem alergia a nenhum medicamento que conheça.", revealTrigger: "perguntado especificamente sobre alergias" },
      ],
      personality: { traits: "Colaborativo, um pouco cansado, responde de forma direta", speechStyle: "Informal, frases curtas", mood: "Levemente incomodado mas tranquilo" },
      redFlags: ["Nenhum red flag grave neste caso — sintomas típicos de faringite viral"],
      rubricFocus: ["Abrir com pergunta aberta", "Investigar tempo de evolução dos sintomas", "Perguntar sobre automedicação", "Perguntar sobre contato com outras pessoas doentes", "Perguntar sobre alergias"],
    },
  },
  {
    title: "Dor Abdominal com Histórico Minimizado",
    difficulty: "Médio",
    patient: {
      name: "Fernanda Rocha", age: 41, sex: "Feminino", occupation: "gerente de loja",
      diagnosis: "Dor abdominal recorrente há cerca de 1 mês",
      chiefComplaint: "Dor abdominal recorrente há cerca de 1 mês",
      spontaneousInfo: [
        "Tenho sentido umas dores na barriga de vez em quando, principalmente à noite.",
        "Achei que era só coisa do estresse do trabalho mesmo.",
      ],
      hiddenInfo: [
        { fact: "Bebe álcool quase todos os dias depois do trabalho, 'só pra relaxar' — mas evita admitir isso de primeira, minimiza ('bebo uma cervejinha às vezes').", revealTrigger: "perguntado de forma não-julgadora e específica sobre frequência de consumo de álcool, não apenas 'bebe?'" },
        { fact: "A dor piora bastante depois de beber.", revealTrigger: "perguntado sobre o que piora ou melhora a dor, especialmente em relação ao álcool" },
        { fact: "Já teve um episódio de vômito com um pouco de sangue há duas semanas, mas não contou a ninguém por vergonha.", revealTrigger: "perguntado diretamente sobre vômitos ou sangramento" },
      ],
      personality: { traits: "Reservada, um pouco na defensiva quando o assunto é álcool, mais aberta em outros temas", speechStyle: "Frases educadas, evita detalhes se não for pressionada gentilmente", mood: "Ansiosa, tentando parecer que está tudo bem" },
      redFlags: ["Hematêmese (vômito com sangue) não relatada espontaneamente", "Consumo de álcool minimizado"],
      rubricFocus: ["Investigar caracterização da dor (início, duração, o que piora/melhora)", "Perguntar sobre uso de álcool de forma não-julgadora", "Perguntar sobre sintomas associados (náusea, vômito, sangramento)", "Demonstrar escuta ativa/empatia diante de tema delicado"],
    },
  },
  {
    title: "Queixas Vagas Escondendo Dor Torácica",
    difficulty: "Difícil",
    patient: {
      name: "Osvaldo Pereira", age: 58, sex: "Masculino", occupation: "motorista de caminhão aposentado",
      diagnosis: "Sensação de cansaço e mal-estar geral há alguns dias",
      chiefComplaint: "Sensação de cansaço e mal-estar geral há alguns dias",
      spontaneousInfo: [
        "Ah, doutor(a), não é nada demais não, só uma canseira, um mal-estar.",
        "Acho que é a idade mesmo, já não sou mais novo.",
        "Ando meio ansioso ultimamente também, sabe como é.",
      ],
      hiddenInfo: [
        { fact: "Sente um aperto no peito quando sobe escada ou anda rápido, que alivia parando — mas chama isso de 'falta de ar' e evita a palavra 'dor'.", revealTrigger: "perguntado especificamente sobre dor, aperto ou desconforto no peito, e sobre relação com esforço físico" },
        { fact: "Tem histórico de hipertensão e é fumante há 30 anos, mas só menciona se perguntado diretamente sobre histórico de doenças e hábitos.", revealTrigger: "perguntado sobre histórico de pressão alta, diabetes e tabagismo" },
        { fact: "O pai dele morreu de infarto aos 60 anos.", revealTrigger: "perguntado sobre histórico familiar de doenças cardíacas" },
      ],
      personality: { traits: "Prolixo, muda de assunto, minimiza sintomas por orgulho/medo de descobrir algo grave", speechStyle: "Fala bastante, dá voltas antes de responder o que foi perguntado", mood: "Nervoso por baixo de uma fachada despreocupada" },
      redFlags: ["Dor torácica aos esforços aliviada pelo repouso (angina)", "Fatores de risco cardiovascular não relatados espontaneamente", "História familiar de infarto precoce"],
      rubricFocus: ["Não aceitar 'não é nada' sem investigar mais", "Perguntar especificamente sobre dor/aperto no peito", "Relacionar sintomas ao esforço físico", "Investigar fatores de risco cardiovascular (tabagismo, HAS, histórico familiar)", "Manter a entrevista focada apesar de respostas evasivas"],
    },
  },
];

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface EvaluationResult {
  score: number;
  rubricItems: { competency: string; category: string; covered: boolean; note: string }[];
  narrativeFeedback: string;
}

export default function SimuladorPacienteVoz() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<VoiceCase | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [turnStatus, setTurnStatus] = useState<"idle" | "transcribing" | "responding">("idle");
  const [voiceUsage, setVoiceUsage] = useState<number | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recorder = useVoiceRecorder();
  const { speak, isSupported: ttsSupported } = useSpeechSynthesis();

  const refreshVoiceUsage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("voice_usage_daily" as any)
      .select("turns_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();
    setVoiceUsage((data as any)?.turns_count ?? 0);
  };

  useEffect(() => {
    if (activeCase) refreshVoiceUsage();
  }, [activeCase]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, turnStatus]);

  const loadAICase = (c: any) => {
    setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient });
  };

  const startCase = (c: VoiceCase) => {
    setActiveCase(c);
    setTurns([]);
    setEvaluation(null);
  };

  const handleRecordToggle = async () => {
    if (!activeCase || turnStatus !== "idle") return;
    if (!recorder.isRecording) {
      await recorder.start();
      return;
    }
    const result = await recorder.stop();
    if (!result) return;

    setTurnStatus("transcribing");
    try {
      const audioBase64 = await blobToBase64(result.blob);
      const { data, error } = await supabase.functions.invoke("voice-transcribe", {
        body: { audioBase64, mimeType: result.mimeType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = (data.text || "").trim();
      if (!text) {
        toast.warning("Não entendi o áudio, tente novamente falando mais próximo do microfone.");
        setTurnStatus("idle");
        return;
      }

      const nextTurns: ChatTurn[] = [...turns, { role: "user", content: text }];
      setTurns(nextTurns);
      setTurnStatus("responding");

      const { data: turnData, error: turnError } = await supabase.functions.invoke("voice-patient-turn", {
        body: { messages: nextTurns, persona: activeCase.patient },
      });
      if (turnError) throw turnError;
      if (turnData?.error) throw new Error(turnData.error);

      const reply = turnData.reply as string;
      setTurns((prev) => [...prev, { role: "assistant", content: reply }]);
      speak(reply);
      refreshVoiceUsage();
    } catch (e: any) {
      const msg = e?.message || "Erro ao processar áudio.";
      if (/429/.test(msg)) toast.error("Limite diário de turnos de voz atingido. Volte amanhã.");
      else if (/Premium/.test(msg)) toast.error("Este simulador é exclusivo do plano Premium.");
      else toast.error(msg);
    } finally {
      setTurnStatus("idle");
    }
  };

  const handleFinishInterview = async () => {
    if (!activeCase || turns.length === 0) return;
    setIsEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-patient-eval", {
        body: { transcript: turns, persona: activeCase.patient },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result: EvaluationResult = { score: data.score, rubricItems: data.rubricItems, narrativeFeedback: data.narrativeFeedback };
      setEvaluation(result);

      const decisions = result.rubricItems.map((r) => ({
        label: r.competency,
        userChoice: r.covered ? "Perguntado" : "Não perguntado",
        idealChoice: "Perguntado",
        correct: r.covered,
        category: r.category,
        explanation: r.note,
      }));
      const payload = {
        ...buildSimulatorDecisions(SLUG, decisions, result.narrativeFeedback),
        transcript: turns,
      };
      if (!submitted) submitResults({ score: result.score, actions: payload });
      refreshVoiceUsage();
    } catch (e: any) {
      const msg = e?.message || "Erro ao avaliar a entrevista.";
      if (/429/.test(msg)) toast.error("Limite diário de turnos de voz atingido. Volte amanhã.");
      else toast.error(msg);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!recorder.isSupported) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold">Paciente-IA por Voz</h1>
        </div>
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Este simulador requer microfone e um navegador atualizado (Chrome, Edge ou Firefox recentes). Não foi possível detectar suporte a gravação de áudio neste navegador.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Paciente-IA por Voz</h1>
            <p className="text-muted-foreground">Treine anamnese e comunicação: converse por voz com um paciente simulado por IA. Limite de {DAILY_VOICE_TURN_CAP} turnos por dia.</p>
            <AdminPromptViewer toolSlug="sim-paciente-ia-voz" toolName="Paciente-IA por Voz" toolType="simulator" prompt={getNativePrompt("sim-paciente-ia-voz") || ""} />
          </div>
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => startCase(c)} />
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard
                key={c.id}
                caseItem={c}
                onClick={() => loadAICase(c)}
                onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase}
                availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace}
              />
            ))}
            <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Gerar Caso com IA
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (evaluation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-xl font-bold">Resultado — {activeCase.title}</h2>
        </div>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Pontuação da Anamnese</p>
            <p className="text-4xl font-bold text-primary">{evaluation.score}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Feedback</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-line">{evaluation.narrativeFeedback}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Competências Avaliadas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {evaluation.rubricItems.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-2 rounded border">
                <div>
                  <p className="text-sm font-medium">{r.competency}</p>
                  <p className="text-xs text-muted-foreground">{r.note}</p>
                </div>
                <Badge variant={r.covered ? "default" : "outline"}>{r.covered ? "Coberto" : "Não coberto"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Button className="w-full" onClick={() => setActiveCase(null)}>Voltar aos Casos</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        {voiceUsage !== null && (
          <Badge variant="secondary" className="ml-auto">{voiceUsage} de {DAILY_VOICE_TURN_CAP} turnos hoje</Badge>
        )}
      </div>

      {!ttsSupported && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-4"><p className="text-xs text-muted-foreground">Este navegador não suporta leitura de voz — as respostas do paciente aparecem só como texto.</p></CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4 space-y-3 max-h-[420px] overflow-y-auto" ref={scrollRef}>
          {turns.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Grave uma pergunta para iniciar a anamnese — ex: "Bom dia, o que trouxe você aqui hoje?"</p>
          )}
          {turns.map((t, i) => (
            <div key={i} className={`flex gap-2 ${t.role === "user" ? "justify-end" : "justify-start"}`}>
              {t.role === "assistant" && <User2 className="h-6 w-6 shrink-0 text-primary mt-1" />}
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${t.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {t.content}
              </div>
            </div>
          ))}
          {turnStatus !== "idle" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {turnStatus === "transcribing" ? "Transcrevendo sua pergunta..." : "Paciente respondendo..."}
            </div>
          )}
        </CardContent>
      </Card>

      {recorder.error && <p className="text-xs text-destructive">{recorder.error}</p>}

      <div className="flex gap-2">
        <Button
          onClick={handleRecordToggle}
          disabled={turnStatus !== "idle"}
          variant={recorder.isRecording ? "destructive" : "default"}
          className="flex-1 gap-2"
        >
          {recorder.isRecording ? <><Square className="h-4 w-4" /> Parar Gravação</> : <><Mic className="h-4 w-4" /> Gravar Pergunta</>}
        </Button>
        <Button variant="outline" onClick={handleFinishInterview} disabled={turns.length === 0 || isEvaluating}>
          {isEvaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Encerrar Anamnese"}
        </Button>
      </div>
      {ttsSupported && turns.some((t) => t.role === "assistant") && (
        <p className="text-xs text-muted-foreground flex items-center gap-1"><Volume2 className="h-3 w-3" /> As respostas do paciente são lidas em voz alta automaticamente.</p>
      )}
    </div>
  );
}
