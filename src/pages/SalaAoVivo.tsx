// Painel do professor para conduzir uma sessão ao vivo de "Caso em Equipe" (item 04 do roadmap).
// Estado do caso é o log de eventos (live_session_events), lido via Postgres Changes — mesmo
// padrão de realtime já usado em Analytics.tsx (CDC), sem introduzir Broadcast. Presence indica
// só quem está conectado agora; a fonte de verdade de "quem tem qual papel" é a tabela.

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layouts/PageHeader";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, Radio, Square, Users, Zap } from "lucide-react";
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
    return <div className="mx-auto max-w-5xl py-8 text-sm text-muted-foreground">Carregando caso...</div>;
  }

  const status = session?.status as string | undefined;
  const isLive = status === "active";
  const onlineCount = (sessionParticipants as any[]).filter((p) => onlineIds.has(p.participant_id)).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        backTo="/salas-virtuais"
        backLabel="Salas Virtuais"
        icon={<Radio />}
        title={teamCase.title}
        badges={
          <>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                isLive ? "border-status-crit/40 bg-status-crit/10 text-status-crit" : status === "ended" ? "border-border text-muted-foreground" : "border-status-warn/40 bg-status-warn/10 text-status-warn"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full bg-current ${isLive ? "animate-pulse" : ""}`} />
              {isLive ? "Ao vivo" : status === "ended" ? "Encerrada" : "Lobby"}
            </span>
            <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{onlineCount}/{teamCase.roles.length} conectados</Badge>
          </>
        }
        description={`${teamCase.patient.name}, ${teamCase.patient.age} anos, ${teamCase.patient.sex} — ${teamCase.patient.context}`}
        className="mb-0"
      />

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cenário</h2>
        <p className="text-sm leading-relaxed">{teamCase.scenario}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Papéis</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {teamCase.roles.map((r) => {
            const sp = (sessionParticipants as any[]).find((p) => p.role === r.role);
            const online = sp && onlineIds.has(sp.participant_id);
            return (
              <div key={r.role} className={`rounded-xl border p-3 ${sp ? "border-border bg-card" : "border-dashed border-border bg-card/40"}`}>
                <div className="flex items-center gap-2 text-sm font-medium"><span aria-hidden>{r.icon}</span>{r.label}</div>
                {sp ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm">
                    <span className={`h-2 w-2 rounded-full ${online ? "bg-status-ok" : "bg-muted-foreground/40"}`} aria-hidden />
                    <span className="truncate">{nameById.get(sp.participant_id) || "Participante"}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{online ? "online" : "offline"}</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">Aguardando alguém escolher este papel</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
        {status === "lobby" && (
          <Button onClick={() => startSession.mutate()} disabled={startSession.isPending}>
            <Play className="mr-1 h-4 w-4" /> Iniciar sessão
          </Button>
        )}
        {isLive && (
          <Button variant="destructive" onClick={() => { if (confirm("Encerrar a sessão? Isso gera o relatório de cada participante.")) endSession.mutate(); }} disabled={endSession.isPending}>
            <Square className="mr-1 h-4 w-4" /> Encerrar sessão
          </Button>
        )}
        {isLive && <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />}
        {isLive && teamCase.intercorrencias.map((inter) => (
          <Button
            key={inter.id}
            variant="outline"
            size="sm"
            disabled={injectedIds.has(inter.id) || injectEvent.isPending}
            onClick={() => injectEvent.mutate(inter.id)}
            className="gap-1"
          >
            <Zap className="h-3.5 w-3.5 text-status-warn" /> {injectedIds.has(inter.id) ? `${inter.label} ✓` : inter.label}
          </Button>
        ))}
        {status === "ended" && <span className="text-sm text-muted-foreground">Sessão encerrada. O relatório está em Analytics.</span>}
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Linha do tempo <span className="tabular-nums">{events.length}</span></h2>
        <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-2xl border border-border bg-card p-4" aria-live="polite">
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum evento ainda.</p>
          ) : (
            (events as any[]).map((e) => (
              <div key={e.id} className={`border-l-2 py-1 pl-3 text-sm ${e.event_type === "intercorrencia" ? "border-status-crit" : "border-border"}`}>
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
        </div>
      </section>
    </div>
  );
}
