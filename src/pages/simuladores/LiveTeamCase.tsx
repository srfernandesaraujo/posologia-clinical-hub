// Experiência do aluno no "Caso em Equipe" ao vivo (item 04 do roadmap). Chega aqui via
// SalaVirtualAluno.tsx quando a atividade da sala tem simulator_slug === "live-team-case".
// Participante é anônimo (sem auth.users) — toda escrita passa pela edge function
// live-session-access com service role, igual ao padrão de room-access.

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getLiveTeamCase, LiveTeamRole } from "@/data/liveTeamCases/sepseGrave";

interface RoomCtx {
  roomId: string;
  participantId: string;
  participantName: string;
  activityId: string;
}

export default function LiveTeamCase() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ctx, setCtx] = useState<RoomCtx | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [joiningRole, setJoiningRole] = useState<LiveTeamRole | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("virtualRoom");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.activityId !== activityId) return;
      setCtx({ roomId: parsed.roomId, participantId: parsed.participantId, participantName: parsed.participantName, activityId: parsed.activityId });
    } catch { /* ignora contexto inválido */ }
  }, [activityId]);

  const { data: activity, error: activityError } = useQuery({
    queryKey: ["live-activity-student", activityId],
    enabled: !!activityId,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.from("room_activities").select("*").eq("id", activityId!).single();
      if (error) throw error;
      return data as any;
    },
  });

  const caseKey = activity?.custom_challenges?.liveTeamCaseKey;
  const teamCase = caseKey ? getLiveTeamCase(caseKey) : undefined;

  const { data: session, error: sessionError } = useQuery({
    queryKey: ["live-session-student", ctx?.roomId, activityId],
    enabled: !!ctx && !!activityId && !!caseKey,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("live-session-access", {
        body: { action: "get-or-create-session", room_id: ctx!.roomId, activity_id: activityId, case_key: caseKey },
      });
      if (error || !data?.session) throw error || new Error("Não foi possível abrir a sessão");
      return data.session;
    },
    refetchInterval: (query) => (query.state.data?.status === "lobby" ? 4000 : false),
  });

  const sessionId = session?.id;

  const { data: sessionParticipants = [] } = useQuery({
    queryKey: ["live-session-participants-student", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("live_session_participants").select("*").eq("session_id", sessionId);
      if (error) throw error;
      return data;
    },
  });

  const myParticipation = useMemo(
    () => (sessionParticipants as any[]).find((p) => p.participant_id === ctx?.participantId),
    [sessionParticipants, ctx]
  );
  const myRole: LiveTeamRole | null = myParticipation?.role ?? null;

  const { data: events = [] } = useQuery({
    queryKey: ["live-session-events-student", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("live_session_events").select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!sessionId || !ctx) return;
    const channel = supabase.channel(`live-session:${sessionId}`, { config: { presence: { key: ctx.participantId } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, any[]>;
        const ids = new Set<string>();
        Object.values(state).forEach((entries) => entries.forEach((e: any) => { if (e.participantId) ids.add(e.participantId); }));
        setOnlineIds(ids);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_session_events", filter: `session_id=eq.${sessionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["live-session-events-student", sessionId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_session_participants", filter: `session_id=eq.${sessionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["live-session-participants-student", sessionId] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${sessionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["live-session-student", ctx.roomId, activityId] });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ participantId: ctx.participantId, role: myRole, name: ctx.participantName });
      });
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, ctx?.participantId, myRole]);

  const claimRole = async (role: LiveTeamRole) => {
    if (!ctx || !sessionId) return;
    setJoiningRole(role);
    const { data, error } = await supabase.functions.invoke("live-session-access", {
      body: { action: "join-role", session_id: sessionId, participant_id: ctx.participantId, role },
    });
    setJoiningRole(null);
    if (error || !data?.participant) {
      toast.error("Esse papel já foi escolhido por outra pessoa — tente outro.");
      queryClient.invalidateQueries({ queryKey: ["live-session-participants-student", sessionId] });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["live-session-participants-student", sessionId] });
  };

  const submitAction = async (actionId: string) => {
    if (!ctx || !sessionId || !myRole) return;
    setSubmittingId(actionId);
    const { error } = await supabase.functions.invoke("live-session-access", {
      body: { action: "submit-action", session_id: sessionId, participant_id: ctx.participantId, role: myRole, payload: { actionId } },
    });
    setSubmittingId(null);
    if (error) toast.error("Não foi possível registrar a ação — tente novamente.");
    queryClient.invalidateQueries({ queryKey: ["live-session-events-student", sessionId] });
  };

  const myChosenIds = useMemo(
    () => new Set((events as any[]).filter((e) => e.event_type === "action" && e.actor_participant_id === ctx?.participantId).map((e) => e.payload?.actionId)),
    [events, ctx]
  );

  if (!ctx) {
    return (
      <div className="container mx-auto py-12 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Esta página só pode ser acessada a partir de uma Sala Virtual.</p>
        <Button variant="outline" onClick={() => navigate("/sala")}><ArrowLeft className="h-4 w-4 mr-1" /> Entrar em uma sala</Button>
      </div>
    );
  }

  if (activityError || sessionError) {
    return (
      <div className="container mx-auto py-12 text-center space-y-3 max-w-md">
        <h2 className="text-xl font-bold">Não foi possível carregar o caso em equipe</h2>
        <p className="text-sm text-muted-foreground">
          {(activityError as any)?.message || (sessionError as any)?.message || "Erro desconhecido"}
        </p>
        <Button variant="outline" onClick={() => navigate("/sala")}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
      </div>
    );
  }

  if (!teamCase || !session) {
    return <div className="container mx-auto py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando caso em equipe...</div>;
  }

  if (session.status === "ended") {
    return (
      <div className="container mx-auto py-12 text-center space-y-3 max-w-md">
        <h2 className="text-xl font-bold">Sessão encerrada</h2>
        <p className="text-sm text-muted-foreground">O professor encerrou a sessão. Seu desempenho já foi registrado.</p>
        <Button onClick={() => navigate("/")}>Voltar ao início</Button>
      </div>
    );
  }

  if (!myRole) {
    const takenRoles = new Set((sessionParticipants as any[]).map((p) => p.role));
    return (
      <div className="container mx-auto py-10 space-y-4 max-w-lg">
        <h1 className="text-xl font-bold">{teamCase.title}</h1>
        <p className="text-sm text-muted-foreground">Escolha seu papel na equipe, {ctx.participantName}.</p>
        <div className="space-y-2">
          {teamCase.roles.map((r) => {
            const taken = takenRoles.has(r.role);
            return (
              <Button key={r.role} variant="outline" className="w-full justify-start h-auto py-3" disabled={taken || joiningRole === r.role} onClick={() => claimRole(r.role)}>
                <span className="text-lg mr-2">{r.icon}</span>
                <span className="flex-1 text-left">{r.label}</span>
                {taken && <Badge variant="secondary" className="ml-2">Ocupado</Badge>}
                {joiningRole === r.role && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  const roleInfo = teamCase.roles.find((r) => r.role === myRole)!;
  const myActions = teamCase.actionsByRole[myRole] || [];
  const isActive = session.status === "active";

  return (
    <div className="container mx-auto py-8 space-y-5 max-w-2xl">
      <div>
        <Badge>{roleInfo.icon} {roleInfo.label}</Badge>
        <h1 className="text-xl font-bold mt-2">{teamCase.title}</h1>
        <p className="text-sm text-muted-foreground">{teamCase.patient.name}, {teamCase.patient.age} anos — {teamCase.patient.context}</p>
      </div>

      {!isActive && (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Aguardando o professor iniciar a sessão...</CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Cenário</CardTitle></CardHeader>
        <CardContent><p className="text-sm">{teamCase.scenario}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Suas ações — {roleInfo.label}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {myActions.map((a) => {
            const done = myChosenIds.has(a.id);
            return (
              <Button
                key={a.id}
                variant={done ? "secondary" : "outline"}
                className="w-full justify-start h-auto py-2.5 text-left whitespace-normal"
                disabled={!isActive || done || submittingId === a.id}
                onClick={() => submitAction(a.id)}
              >
                {submittingId === a.id ? <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" /> : done ? "✓ " : ""}
                {a.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Linha do tempo da equipe</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-72 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nenhum evento ainda.</p>
          ) : (
            (events as any[]).map((e) => (
              <div key={e.id} className="text-sm border-l-2 border-border pl-3 py-1">
                {e.event_type === "intercorrencia" ? (
                  <p><Badge variant="destructive" className="mr-2 text-[10px]">Intercorrência</Badge>{e.payload?.label} — <span className="text-muted-foreground">{e.payload?.description}</span></p>
                ) : (
                  <p>
                    <Badge variant="outline" className="mr-2 text-[10px]">{teamCase.roles.find((r) => r.role === e.role)?.label || e.role}</Badge>
                    {teamCase.actionsByRole[e.role as LiveTeamRole]?.find((a) => a.id === e.payload?.actionId)?.label || "Ação registrada"}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        {(sessionParticipants as any[]).filter((p) => onlineIds.has(p.participant_id)).length} de {teamCase.roles.length} papéis online agora
      </p>
    </div>
  );
}
