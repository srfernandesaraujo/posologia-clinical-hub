// Painel do professor para conduzir uma sessão ao vivo de "Caso em Equipe" (item 04 do roadmap).
// Estado do caso é o log de eventos (live_session_events), lido via Postgres Changes — mesmo
// padrão de realtime já usado em Analytics.tsx (CDC), sem introduzir Broadcast. Presence indica
// só quem está conectado agora; a fonte de verdade de "quem tem qual papel" é a tabela.

import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Play, Square, Zap } from "lucide-react";
import { getLiveTeamCase, LiveTeamRole } from "@/data/liveTeamCases/sepseGrave";

export default function SalaAoVivo() {
  const { roomId, activityId } = useParams<{ roomId: string; activityId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const { data: activity } = useQuery({
    queryKey: ["live-activity", activityId],
    enabled: !!activityId,
    queryFn: async () => {
      const { data, error } = await supabase.from("room_activities").select("*").eq("id", activityId!).single();
      if (error) throw error;
      return data as any;
    },
  });

  const caseKey = activity?.custom_challenges?.liveTeamCaseKey;
  const teamCase = caseKey ? getLiveTeamCase(caseKey) : undefined;

  const { data: session } = useQuery({
    queryKey: ["live-session", roomId, activityId],
    enabled: !!roomId && !!activityId && !!user,
    queryFn: async () => {
      const { data: existing } = await (supabase as any)
        .from("live_sessions")
        .select("*")
        .eq("room_id", roomId)
        .eq("activity_id", activityId)
        .neq("status", "ended")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return existing;
      const { data: created, error } = await (supabase as any)
        .from("live_sessions")
        .insert({ room_id: roomId, activity_id: activityId, case_key: caseKey || "sepse-grave-uti", created_by: user!.id })
        .select("*")
        .single();
      if (error) throw error;
      return created;
    },
  });

  const sessionId = session?.id;

  const { data: sessionParticipants = [] } = useQuery({
    queryKey: ["live-session-participants", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("live_session_participants").select("*").eq("session_id", sessionId);
      if (error) throw error;
      return data;
    },
  });

  const participantIds = useMemo(() => sessionParticipants.map((p: any) => p.participant_id), [sessionParticipants]);
  const { data: roomParticipants = [] } = useQuery({
    queryKey: ["live-room-participants", participantIds],
    enabled: participantIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("room_participants").select("id, participant_name").in("id", participantIds);
      if (error) throw error;
      return data;
    },
  });
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    (roomParticipants as any[]).forEach((p) => m.set(p.id, p.participant_name));
    return m;
  }, [roomParticipants]);

  const { data: events = [] } = useQuery({
    queryKey: ["live-session-events", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("live_session_events").select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Realtime: Presence (quem está conectado) + Postgres Changes (papéis e timeline)
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(`live-session:${sessionId}`, { config: { presence: { key: `professor-${user?.id}` } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, any[]>;
        const ids = new Set<string>();
        Object.values(state).forEach((entries) => entries.forEach((e: any) => { if (e.participantId) ids.add(e.participantId); }));
        setOnlineIds(ids);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_session_events", filter: `session_id=eq.${sessionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["live-session-events", sessionId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_session_participants", filter: `session_id=eq.${sessionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["live-session-participants", sessionId] });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ isProfessor: true });
      });
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, queryClient, user?.id]);

  const startSession = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("live_sessions").update({ status: "active", started_at: new Date().toISOString() }).eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["live-session", roomId, activityId] }); toast.success("Sessão iniciada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const injectedIds = useMemo(() => new Set((events as any[]).filter((e) => e.event_type === "intercorrencia").map((e) => e.payload?.id)), [events]);

  const injectEvent = useMutation({
    mutationFn: async (intercorrenciaId: string) => {
      const inter = teamCase?.intercorrencias.find((i) => i.id === intercorrenciaId);
      if (!inter) throw new Error("Intercorrência não encontrada");
      const { error } = await (supabase as any).from("live_session_events").insert({
        session_id: sessionId, actor_participant_id: null, role: null, event_type: "intercorrencia",
        payload: { id: inter.id, label: inter.label, description: inter.description },
      });
      if (error) throw error;
    },
    onError: (e: any) => toast.error(e.message),
  });

  const endSession = useMutation({
    mutationFn: async () => {
      if (!teamCase) throw new Error("Caso não carregado");
      const startedAt = session?.started_at ? new Date(session.started_at).getTime() : Date.now();
      const timeSpent = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

      for (const sp of sessionParticipants as any[]) {
        const role = sp.role as LiveTeamRole;
        const roleActions = teamCase.actionsByRole[role] || [];
        const chosen = new Set(
          (events as any[])
            .filter((e) => e.event_type === "action" && e.actor_participant_id === sp.participant_id)
            .map((e) => e.payload?.actionId)
        );
        const decisions = roleActions.map((a) => ({
          label: a.label,
          category: a.category,
          userChoice: chosen.has(a.id) ? "Escolhido" : "Não escolhido",
          idealChoice: a.ideal ? "Escolhido" : "Não escolhido",
          correct: chosen.has(a.id) === a.ideal,
          explanation: a.explanation,
        }));
        const correctDecisions = decisions.filter((d) => d.correct).length;
        const score = decisions.length ? Math.round((correctDecisions / decisions.length) * 100) : 0;

        const { error } = await supabase.from("room_submissions").insert({
          room_id: roomId!,
          participant_id: sp.participant_id,
          step_index: 0,
          score,
          time_spent_seconds: timeSpent,
          activity_id: activityId!,
          actions: {
            type: "simulator_decisions",
            decisions,
            summary: { correctDecisions, totalDecisions: decisions.length, score },
          } as any,
        });
        if (error) throw error;
      }

      const { error: endErr } = await (supabase as any).from("live_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", sessionId);
      if (endErr) throw endErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-session", roomId, activityId] });
      toast.success("Sessão encerrada — relatório disponível em Analytics");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!teamCase) {
    return <div className="container mx-auto py-8 text-sm text-muted-foreground">Carregando caso...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/salas-virtuais"><ArrowLeft className="h-4 w-4 mr-1" /> Salas Virtuais</Link>
      </Button>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{teamCase.title}</h1>
          <p className="text-sm text-muted-foreground">{teamCase.patient.name}, {teamCase.patient.age} anos, {teamCase.patient.sex} — {teamCase.patient.context}</p>
        </div>
        <Badge variant={session?.status === "active" ? "default" : session?.status === "ended" ? "secondary" : "outline"}>
          {session?.status === "active" ? "Ao vivo" : session?.status === "ended" ? "Encerrada" : "Lobby"}
        </Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Cenário</CardTitle></CardHeader>
        <CardContent><p className="text-sm">{teamCase.scenario}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Papéis</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {teamCase.roles.map((r) => {
            const sp = (sessionParticipants as any[]).find((p) => p.role === r.role);
            const online = sp && onlineIds.has(sp.participant_id);
            return (
              <div key={r.role} className="flex items-center justify-between text-sm p-2 rounded-md border border-border">
                <span>{r.icon} {r.label}</span>
                {sp ? (
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                    {nameById.get(sp.participant_id) || "Participante"}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Aguardando alguém escolher este papel</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        {session?.status === "lobby" && (
          <Button onClick={() => startSession.mutate()} disabled={startSession.isPending}>
            <Play className="h-4 w-4 mr-1" /> Iniciar sessão
          </Button>
        )}
        {session?.status === "active" && (
          <Button variant="destructive" onClick={() => { if (confirm("Encerrar a sessão? Isso gera o relatório de cada participante.")) endSession.mutate(); }} disabled={endSession.isPending}>
            <Square className="h-4 w-4 mr-1" /> Encerrar sessão
          </Button>
        )}
        {session?.status === "active" && teamCase.intercorrencias.map((inter) => (
          <Button
            key={inter.id}
            variant="outline"
            size="sm"
            disabled={injectedIds.has(inter.id) || injectEvent.isPending}
            onClick={() => injectEvent.mutate(inter.id)}
          >
            <Zap className="h-3.5 w-3.5 mr-1" /> {injectedIds.has(inter.id) ? `${inter.label} ✓` : inter.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Linha do tempo</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento ainda.</p>
          ) : (
            (events as any[]).map((e) => (
              <div key={e.id} className="text-sm border-l-2 border-border pl-3 py-1">
                {e.event_type === "intercorrencia" ? (
                  <p><Badge variant="destructive" className="mr-2 text-[10px]">Intercorrência</Badge>{e.payload?.label} — <span className="text-muted-foreground">{e.payload?.description}</span></p>
                ) : (
                  <p>
                    <Badge variant="outline" className="mr-2 text-[10px]">{nameById.get(e.actor_participant_id) || e.role}</Badge>
                    {teamCase.actionsByRole[e.role as LiveTeamRole]?.find((a) => a.id === e.payload?.actionId)?.label || "Ação registrada"}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
