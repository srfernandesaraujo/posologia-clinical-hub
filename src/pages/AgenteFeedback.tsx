import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReasoningTrail, type ReasoningTrailItem } from "@/components/ReasoningTrail";
import {
  Send, Bot, User, Loader2, RotateCcw, MessageSquare, Copy, Check,
  DoorOpen, Users, ArrowLeft, Clock, Target, ClipboardCheck, History,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReasoningTrace {
  id: string;
  room_id: string;
  instrument: string | null;
  criteria: { criterion: string; observation: string; reference: string | null; verdict: string }[];
  summary: string;
  created_at: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RoomData {
  id: string;
  title: string;
  description: string | null;
  simulator_slug: string | null;
  pin: string;
  is_active: boolean;
  created_at: string;
  participants: ParticipantData[];
  activities: ActivityData[];
}

interface ParticipantData {
  id: string;
  participant_name: string;
  is_group: boolean;
  group_members: any;
  joined_at: string;
  submissions: SubmissionData[];
}

interface ActivityData {
  id: string;
  simulator_slug: string;
  position: number;
  case_id: string | null;
}

interface SubmissionData {
  id: string;
  step_index: number;
  actions: any;
  score: number;
  time_spent_seconds: number;
  submitted_at: string;
  activity_id: string | null;
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-base font-bold text-foreground mt-3 mb-1">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="text-sm font-semibold text-foreground mt-2 mb-1">{line.slice(4)}</h4>;
        if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-bold text-foreground mt-3 mb-1">{line.slice(2)}</h2>;
        if (line.match(/^\d+\.\s/)) return <p key={i} className="ml-4 text-foreground">{renderInline(line)}</p>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <p key={i} className="ml-4 text-foreground">• {renderInline(line.slice(2))}</p>;
        if (line.trim() === "") return <br key={i} />;
        return <p key={i} className="text-foreground">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

export default function AgenteFeedback() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [traces, setTraces] = useState<ReasoningTrace[]>([]);
  const [activeTrace, setActiveTrace] = useState<ReasoningTrace | null>(null);
  const [showSavedList, setShowSavedList] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user's virtual rooms
  useEffect(() => {
    if (!user) return;
    fetchRooms();
  }, [user]);

  async function fetchRooms() {
    setLoadingRooms(true);
    try {
      const { data: roomsData, error: roomsErr } = await supabase
        .from("virtual_rooms")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });

      if (roomsErr) throw roomsErr;
      if (!roomsData || roomsData.length === 0) {
        setRooms([]);
        setLoadingRooms(false);
        return;
      }

      const roomIds = roomsData.map((r) => r.id);

      const [participantsRes, activitiesRes, submissionsRes] = await Promise.all([
        supabase.from("room_participants").select("*").in("room_id", roomIds),
        supabase.from("room_activities").select("*").in("room_id", roomIds).order("position"),
        supabase.from("room_submissions").select("*").in("room_id", roomIds),
      ]);

      const participants = participantsRes.data || [];
      const activities = activitiesRes.data || [];
      const submissions = submissionsRes.data || [];

      const enrichedRooms: RoomData[] = roomsData.map((room) => {
        const roomParticipants = participants.filter((p) => p.room_id === room.id);
        const roomActivities = activities.filter((a) => a.room_id === room.id);
        const roomSubmissions = submissions.filter((s) => s.room_id === room.id);

        const enrichedParticipants: ParticipantData[] = roomParticipants.map((p) => ({
          id: p.id,
          participant_name: p.participant_name,
          is_group: p.is_group,
          group_members: p.group_members,
          joined_at: p.joined_at,
          submissions: roomSubmissions.filter((s) => s.participant_id === p.id),
        }));

        return {
          id: room.id,
          title: room.title,
          description: room.description,
          simulator_slug: room.simulator_slug,
          pin: room.pin,
          is_active: room.is_active,
          created_at: room.created_at,
          participants: enrichedParticipants,
          activities: roomActivities,
        };
      });

      setRooms(enrichedRooms);
    } catch (e: any) {
      toast.error("Erro ao carregar salas: " + (e.message || ""));
    } finally {
      setLoadingRooms(false);
    }
  }

  function selectRoom(room: RoomData) {
    setSelectedRoom(room);
    setMessages([]);
    setActiveTrace(null);
    setShowSavedList(false);
    fetchTraces(room.id);
    setTimeout(() => startConversation(room), 100);
  }

  function goBack() {
    setSelectedRoom(null);
    setMessages([]);
    setInput("");
    setTraces([]);
    setActiveTrace(null);
  }

  async function fetchTraces(roomId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from("ai_reasoning_traces")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTraces((data as ReasoningTrace[]) || []);
    } catch {
      // silencioso: a lista de avaliações salvas é um complemento, não deve travar o chat
    }
  }

  async function handleFinalize() {
    if (!selectedRoom || isFinalizing || messages.length === 0) return;
    setIsFinalizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("feedback-agent", {
        body: {
          messages,
          roomContext: buildRoomContext(selectedRoom),
          finalize: true,
          room_id: selectedRoom.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const trace = data.trace as ReasoningTrace;
      setActiveTrace(trace);
      setTraces((prev) => [trace, ...prev]);
      toast.success("Avaliação salva com a cadeia de critérios aplicada.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao finalizar avaliação");
    } finally {
      setIsFinalizing(false);
    }
  }

  function traceToItems(trace: ReasoningTrace): ReasoningTrailItem[] {
    return trace.criteria.map((c) => ({
      label: c.criterion,
      observation: c.observation,
      reference: c.reference,
      verdict: c.verdict,
    }));
  }

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // "actions" varia por simulador e pode carregar transcrições/logs extensos — sem
  // limite, uma sala com muitos alunos/estações facilmente estoura o teto de tokens
  // por requisição dos provedores de IA (ex.: Groq TPD). Trunca preservando o início
  // (onde normalmente estão as respostas/decisões mais relevantes do aluno).
  function summarizeActions(actions: unknown, maxChars = 1500): unknown {
    let str: string;
    try {
      str = JSON.stringify(actions) ?? "";
    } catch {
      return actions;
    }
    if (str.length <= maxChars) return actions;
    return `${str.slice(0, maxChars)}… [truncado: ${str.length} caracteres no total]`;
  }

  function buildRoomContext(room: RoomData) {
    return {
      roomTitle: room.title,
      roomDescription: room.description,
      simulatorSlug: room.simulator_slug,
      isActive: room.is_active,
      activitiesCount: room.activities.length,
      activities: room.activities.map((a) => ({
        simulatorSlug: a.simulator_slug,
        position: a.position,
      })),
      participants: room.participants.map((p) => ({
        name: p.participant_name,
        isGroup: p.is_group,
        groupMembers: p.group_members,
        submissionsCount: p.submissions.length,
        submissions: p.submissions.map((s) => ({
          stepIndex: s.step_index,
          score: s.score,
          timeSpentSeconds: s.time_spent_seconds,
          actions: summarizeActions(s.actions),
          activityId: s.activity_id,
          submittedAt: s.submitted_at,
        })),
        averageScore: p.submissions.length > 0
          ? Math.round(p.submissions.reduce((sum, s) => sum + s.score, 0) / p.submissions.length)
          : null,
        totalTimeSeconds: p.submissions.reduce((sum, s) => sum + s.time_spent_seconds, 0),
      })),
    };
  }

  async function startConversation(room?: RoomData) {
    setIsLoading(true);
    try {
      const body: any = { messages: [] };
      if (room) body.roomContext = buildRoomContext(room);

      const { data, error } = await supabase.functions.invoke("feedback-agent", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([{ role: "assistant", content: data.reply }]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar conversa");
    } finally {
      setIsLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);

    try {
      const body: any = { messages: updated };
      if (selectedRoom) body.roomContext = buildRoomContext(selectedRoom);

      const { data, error } = await supabase.functions.invoke("feedback-agent", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...updated, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar mensagem");
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleReset() {
    setMessages([]);
    setInput("");
    if (selectedRoom) setTimeout(() => startConversation(selectedRoom), 100);
  }

  function handleCopy(content: string, idx: number) {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    toast.success("Copiado!");
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  // ---- Room Selection View ----
  if (!selectedRoom) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Feedback de Simulação</h1>
            <p className="text-xs text-muted-foreground">Selecione uma sala virtual para analisar o desempenho dos alunos</p>
          </div>
        </div>

        {loadingRooms ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando salas...</span>
          </div>
        ) : rooms.length === 0 ? (
          <Card className="p-8 text-center">
            <DoorOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Nenhuma sala virtual encontrada</h3>
            <p className="text-sm text-muted-foreground">Crie uma sala virtual primeiro para poder gerar feedbacks sobre o desempenho dos alunos.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map((room) => {
              const totalParticipants = room.participants.length;
              const totalSubmissions = room.participants.reduce((s, p) => s + p.submissions.length, 0);
              const avgScore = totalSubmissions > 0
                ? Math.round(room.participants.flatMap(p => p.submissions).reduce((s, sub) => s + sub.score, 0) / totalSubmissions)
                : null;

              return (
                <Card
                  key={room.id}
                  className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  onClick={() => selectRoom(room)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{room.title}</h3>
                    <Badge variant={room.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {room.is_active ? "Ativa" : "Encerrada"}
                    </Badge>
                  </div>
                  {room.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{room.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {totalParticipants} aluno{totalParticipants !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" /> {totalSubmissions} submiss{totalSubmissions !== 1 ? "ões" : "ão"}
                    </span>
                    {avgScore !== null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Média: {avgScore}%
                      </span>
                    )}
                  </div>
                  {room.activities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {room.activities.map((a, i) => (
                        <Badge key={a.id} variant="outline" className="text-[10px]">
                          Ativ. {i + 1}: {a.simulator_slug}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---- Chat View ----
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Feedback de Simulação</h1>
            <p className="text-xs text-muted-foreground">Sala: {selectedRoom.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFinalize}
            disabled={isLoading || isFinalizing || messages.filter((m) => m.role === "assistant").length === 0}
          >
            {isFinalizing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <ClipboardCheck className="h-4 w-4 mr-1" />
            )}
            Finalizar e salvar avaliação
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isLoading}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reiniciar
          </Button>
        </div>
      </div>

      <Card className="border border-border overflow-hidden">
        <div ref={scrollRef} className="h-[60vh] overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[85%] rounded-xl px-4 py-3 relative group",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60 border border-border"
              )}>
                {msg.role === "assistant" ? (
                  <>
                    <MarkdownContent content={msg.content} />
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                    >
                      {copiedIdx === idx ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted/60 border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando dados...
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 bg-card">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua resposta..."
              className="min-h-[44px] max-h-[150px] resize-none"
              disabled={isLoading}
              rows={1}
            />
            <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" className="shrink-0 h-[44px] w-[44px]">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Shift+Enter para nova linha • Enter para enviar
          </p>
        </div>
      </Card>

      {activeTrace && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Como cheguei a essa avaliação
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Cadeia de critérios auditável, salva em {new Date(activeTrace.created_at).toLocaleString("pt-BR")}.
          </p>
          <ReasoningTrail
            items={traceToItems(activeTrace)}
            instrument={activeTrace.instrument ?? undefined}
            summary={activeTrace.summary}
          />
        </Card>
      )}

      {traces.length > 0 && (
        <Card className="p-4">
          <button
            type="button"
            onClick={() => setShowSavedList((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Avaliações salvas nesta sala ({traces.length})
            </span>
          </button>
          {showSavedList && (
            <div className="mt-3 space-y-2">
              {traces.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTrace(t)}
                  className={cn(
                    "block w-full rounded-md border px-3 py-2 text-left text-xs hover:bg-muted/60",
                    activeTrace?.id === t.id && "border-primary bg-muted/40"
                  )}
                >
                  <span className="font-medium text-foreground">{t.instrument || "Avaliação"}</span>
                  <span className="text-muted-foreground"> — {new Date(t.created_at).toLocaleString("pt-BR")}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
