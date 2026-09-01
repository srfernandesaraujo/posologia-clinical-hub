import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DoorOpen, Users, UserPlus, X, ArrowLeft, CheckCircle, Loader2, ClipboardList, ArrowRight } from "lucide-react";
import { GAME_LABELS, isGameSlug } from "@/data/virtualRoomGames";

const LAB_PREFIX = "lab-";

const LAB_SLUGS = new Set([
  "lab-farmacos", "lab-microbiologia", "lab-toxicologia", "lab-farmacogenomica", "lab-estabilidade",
  "lab-controle-qualidade", "lab-epidemiologia", "lab-biotecnologia", "lab-simulacao-realistica",
  "lab-pericia-forense", "lab-modelagem-molecular",
]);

const LAB_ONLY_SLUGS = new Set([
  "farmacos",
  "microbiologia",
  "toxicologia",
  "controle-qualidade",
  "epidemiologia",
  "biotecnologia",
  "simulacao-realistica",
  "pericia-forense",
  "modelagem-molecular",
]);

const TOOL_LABELS: Record<string, string> = {
  prm: "PRM – Problemas Relacionados a Medicamentos",
  antimicrobianos: "Antimicrobianos / Stewardship",
  tdm: "TDM – Monitoramento Terapêutico",
  acompanhamento: "Acompanhamento Farmacoterapêutico",
  insulina: "Dose de Insulina",
  "lab-farmacos": "Lab: Desenvolvimento de Fármacos",
  "lab-microbiologia": "Lab: Microbiologia",
  "lab-toxicologia": "Lab: Toxicologia",
  "lab-farmacogenomica": "Lab: Farmacogenômica",
  "lab-estabilidade": "Lab: Estabilidade",
  "lab-controle-qualidade": "Lab: Controle de Qualidade",
  "lab-epidemiologia": "Lab: Epidemiologia",
  "lab-biotecnologia": "Lab: Biotecnologia",
  "lab-simulacao-realistica": "Lab: Simulação Realística",
  "lab-pericia-forense": "Lab: Perícia Forense",
  "lab-modelagem-molecular": "Lab: Modelagem Molecular",
  "live-team-case": "🧑‍⚕️ Caso em Equipe (ao vivo)",
  ...GAME_LABELS,
};

function getRouteForActivity(slug: string, caseId?: string | null, activityId?: string | null): string {
  if (slug === "live-team-case") {
    return `/sala/equipe/${activityId}`;
  }

  if (isGameSlug(slug)) {
    return `/sala/jogo/${slug}`;
  }

  if (LAB_SLUGS.has(slug)) {
    return `/sala/laboratorio/${slug.replace(LAB_PREFIX, "")}`;
  }

  if (LAB_ONLY_SLUGS.has(slug) && !caseId) {
    return `/sala/laboratorio/${slug}`;
  }

  return `/sala/simulador/${slug}`;
}

export default function SalaVirtualAluno() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pinFromUrl = searchParams.get("pin") || "";

  const [pin, setPin] = useState(pinFromUrl);
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"pin" | "identify" | "waiting-group" | "ready">("pin");
  const [activities, setActivities] = useState<any[]>([]);
  const [hasGroupAssignments, setHasGroupAssignments] = useState(false);
  const pendingJoinRef = useRef<{ name: string; email: string | null; isGroup: boolean; members: any[] } | null>(null);

  // Identification
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupMembers, setGroupMembers] = useState<string[]>([""]);
  const [groupEmails, setGroupEmails] = useState<string[]>([""]);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [resumeFromIndex, setResumeFromIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (pinFromUrl) {
      joinRoom(pinFromUrl);
    }
  }, []);

  const joinRoom = async (pinValue?: string) => {
    const p = (pinValue || pin).trim();
    if (p.length !== 6) {
      toast.error("O PIN deve ter 6 dígitos");
      return;
    }
    setLoading(true);
    const { data: resp, error } = await supabase.functions.invoke("room-access", {
      body: { action: "lookup", pin: p },
    });
    if (error || !resp) {
      setLoading(false);
      toast.error("Sala não encontrada ou inativa. Verifique o PIN.");
      return;
    }
    if (resp.expired) {
      setLoading(false);
      toast.error("Esta sala já expirou.");
      return;
    }
    if (!resp.room) {
      setLoading(false);
      toast.error("Sala não encontrada ou inativa. Verifique o PIN.");
      return;
    }
    setRoom(resp.room);
    setActivities(resp.activities || []);
    setHasGroupAssignments(!!resp.hasGroupAssignments);
    setLoading(false);
    setStep("identify");
  };

  const addGroupMember = () => {
    setGroupMembers([...groupMembers, ""]);
    setGroupEmails([...groupEmails, ""]);
  };
  const removeGroupMember = (i: number) => {
    setGroupMembers(groupMembers.filter((_, idx) => idx !== i));
    setGroupEmails(groupEmails.filter((_, idx) => idx !== i));
  };
  const updateGroupMember = (i: number, val: string) => {
    const copy = [...groupMembers]; copy[i] = val; setGroupMembers(copy);
  };
  const updateGroupEmail = (i: number, val: string) => {
    const copy = [...groupEmails]; copy[i] = val; setGroupEmails(copy);
  };

  const submitIdentification = async () => {
    const name = participantName.trim();
    if (!name) { toast.error("Informe o nome"); return; }

    const isRestricted = !!room?.restricted_access;
    const emailRegex = /\S+@\S+\.\S+/;

    // Collect emails to validate (when restricted)
    let emailsToCheck: string[] = [];
    let primaryEmail = participantEmail.trim().toLowerCase();

    if (isRestricted) {
      if (!primaryEmail || !emailRegex.test(primaryEmail)) {
        toast.error("Informe um e-mail válido");
        return;
      }
      emailsToCheck.push(primaryEmail);
      if (isGroup) {
        const memberEmails = groupEmails.map(e => e.trim().toLowerCase()).filter(Boolean);
        const memberNames = groupMembers.map(m => m.trim()).filter(Boolean);
        if (memberNames.length === 0) {
          toast.error("Adicione ao menos um componente do grupo");
          return;
        }
        if (memberEmails.length !== memberNames.length) {
          toast.error("Informe o e-mail de TODOS os componentes do grupo");
          return;
        }
        for (const em of memberEmails) {
          if (!emailRegex.test(em)) { toast.error(`E-mail inválido: ${em}`); return; }
          if (!emailsToCheck.includes(em)) emailsToCheck.push(em);
        }
      }

      // Validate against authorized list (via edge function)
      setLoading(true);
      const { data: vresp, error: authErr } = await supabase.functions.invoke("room-access", {
        body: { action: "validate-emails", room_id: room.id, emails: emailsToCheck },
      });
      if (authErr || !vresp) {
        setLoading(false);
        toast.error("Erro ao validar acesso");
        return;
      }
      const notAllowed: string[] = vresp.unauthorized || [];
      if (notAllowed.length > 0) {
        setLoading(false);
        toast.error(`Acesso negado. E-mail(s) não autorizado(s) nesta sala: ${notAllowed.join(", ")}`);
        return;
      }
    }

    // Build members array; when restricted, store {name, email} for each member
    const memberNames = isGroup ? groupMembers.map(m => m.trim()).filter(Boolean) : [];
    const members: any[] = isGroup
      ? (isRestricted
          ? memberNames.map((n, i) => ({ name: n, email: (groupEmails[i] || "").trim().toLowerCase() }))
          : memberNames)
      : [];

    // View-only detection (via edge function) — not applicable to professor-assigned groups
    let viewOnly = false;
    if (!hasGroupAssignments && !isGroup && isRestricted && primaryEmail) {
      const { data: gresp } = await supabase.functions.invoke("room-access", {
        body: { action: "check-group-membership", room_id: room.id, email: primaryEmail },
      });
      viewOnly = !!gresp?.inAnyGroup;
    }

    if (!loading) setLoading(true);

    // Find or create participant + compute resume index (server-side)
    const { data: presp, error: pErr } = await supabase.functions.invoke("room-access", {
      body: {
        action: "find-or-create-participant",
        room_id: room.id,
        name,
        email: isRestricted ? primaryEmail : null,
        is_group: isGroup,
        group_members: members,
      },
    });
    if (pErr || !presp?.participantId) {
      setLoading(false);
      toast.error("Erro ao entrar na sala");
      return;
    }

    if (hasGroupAssignments && !presp.assignedActivityId) {
      setLoading(false);
      pendingJoinRef.current = { name, email: isRestricted ? primaryEmail : null, isGroup, members };
      setStep("waiting-group");
      return;
    }

    setLoading(false);
    finalizeJoin(presp, viewOnly);
  };

  const finalizeJoin = (presp: any, viewOnly: boolean) => {
    let effectiveActivities = activities;
    if (presp.assignedActivityId) {
      effectiveActivities = activities.filter((a) => a.id === presp.assignedActivityId);
      setActivities(effectiveActivities);
    }

    const pid: string = presp.participantId;
    const submittedActivityIds = new Set<string>(presp.submittedActivityIds || []);
    let resumeIdx = 0;
    let completed = submittedActivityIds.size;
    if (effectiveActivities.length > 0) {
      const firstUnsubmitted = effectiveActivities.findIndex((a) => !submittedActivityIds.has(a.id));
      resumeIdx = firstUnsubmitted === -1 ? effectiveActivities.length : firstUnsubmitted;
    }

    setParticipantId(pid);
    setResumeFromIndex(resumeIdx);
    setCompletedCount(completed);
    sessionStorage.setItem("vrViewOnly", viewOnly ? "true" : "false");
    if (presp.resumed && completed > 0) {
      toast.success(`Retomando atividade — ${completed} de ${effectiveActivities.length} já enviada(s).`);
    }
    if (viewOnly) {
      toast.info("Seu e-mail já está em um grupo nesta sala. Você entrará em modo somente-leitura: poderá explorar o simulador, mas não poderá responder os desafios.");
    }
    setStep("ready");
  };

  const checkGroupAssignment = async () => {
    const params = pendingJoinRef.current;
    if (!params || !room) return;
    const { data: presp, error: pErr } = await supabase.functions.invoke("room-access", {
      body: {
        action: "find-or-create-participant",
        room_id: room.id,
        name: params.name,
        email: params.email,
        is_group: params.isGroup,
        group_members: params.members,
      },
    });
    if (pErr || !presp?.participantId) return;
    if (presp.assignedActivityId) {
      finalizeJoin(presp, false);
    }
  };

  useEffect(() => {
    if (step !== "waiting-group") return;
    const interval = setInterval(checkGroupAssignment, 7000);
    return () => clearInterval(interval);
  }, [step, room]);

  const isExam = activities.length > 1;
  const isLegacy = !isExam && room?.simulator_slug;

  const viewOnlyFlag = sessionStorage.getItem("vrViewOnly") === "true";

  const goToSimulator = () => {
    if (isLegacy) {
      const legacyAct = activities[0]; // single activity
      const nativeCaseIndex = legacyAct?.custom_challenges?.nativeCaseIndex ?? null;
      sessionStorage.setItem("virtualRoom", JSON.stringify({
        roomId: room.id,
        participantId,
        caseId: room.case_id,
        simulatorSlug: room.simulator_slug,
        participantName,
        customChallenges: legacyAct?.custom_challenges || null,
        nativeCaseIndex,
        viewOnly: viewOnlyFlag,
      }));
      navigate(getRouteForActivity(room.simulator_slug, room.case_id, legacyAct?.id));
    } else {
      if (resumeFromIndex >= activities.length) {
        toast.success("Você já completou todas as atividades desta sala.");
        navigate("/");
        return;
      }
      startActivity(resumeFromIndex);
    }
  };

  const startActivity = (index: number) => {
    const act = activities[index];
    if (!act) return;

    const nativeCaseIndex = act.custom_challenges?.nativeCaseIndex ?? null;
    sessionStorage.setItem("virtualRoom", JSON.stringify({
      roomId: room.id,
      participantId,
      caseId: act.case_id,
      simulatorSlug: act.simulator_slug,
      participantName,
      activityId: act.id,
      activityIndex: index,
      totalActivities: activities.length,
      customChallenges: act.custom_challenges || null,
      nativeCaseIndex,
      allActivities: activities.map((a: any) => ({
        id: a.id,
        simulatorSlug: a.simulator_slug,
        caseId: a.case_id,
        position: a.position,
        customChallenges: a.custom_challenges || null,
        nativeCaseIndex: a.custom_challenges?.nativeCaseIndex ?? null,
      })),
      viewOnly: viewOnlyFlag,
    }));
    navigate(getRouteForActivity(act.simulator_slug, act.case_id, act.id));
  };

  if (step === "pin") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
              <DoorOpen className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Entrar na Sala Virtual</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Insira o PIN de 6 dígitos fornecido pelo professor</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>PIN da Sala</Label>
              <Input
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-3xl font-mono tracking-[0.5em] h-16"
                maxLength={6}
                onKeyDown={e => e.key === "Enter" && joinRoom()}
              />
            </div>
            <Button onClick={() => joinRoom()} disabled={pin.length !== 6 || loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "identify") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={() => { setStep("pin"); setRoom(null); setActivities([]); }} className="w-fit mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" />Voltar
            </Button>
            <CardTitle className="text-xl">{room?.title}</CardTitle>
            <p className="text-sm text-muted-foreground">Identifique-se para começar a atividade</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {room?.restricted_access && (
              <div className="rounded-md bg-primary/10 border border-primary/20 p-3 text-xs text-primary">
                {hasGroupAssignments
                  ? "🔒 O professor já dividiu a turma em grupos, cada um com seu caso. Identifique-se com seu e-mail e você entrará automaticamente no grupo/caso designado."
                  : "🔒 Esta sala tem acesso restrito. Apenas alunos previamente cadastrados pelo professor podem entrar."}
              </div>
            )}

            {!hasGroupAssignments && (
              <div className="flex items-center justify-between">
                <Label>Modo Grupo</Label>
                <Switch checked={isGroup} onCheckedChange={setIsGroup} />
              </div>
            )}

            <div>
              <Label>{isGroup ? "Nome do Grupo" : "Seu Nome Completo"}</Label>
              <Input value={participantName} onChange={e => setParticipantName(e.target.value)} placeholder={isGroup ? "Ex: Grupo A" : "Ex: Maria Silva"} />
            </div>

            {room?.restricted_access && (
              <div>
                <Label>{isGroup ? "Seu E-mail (líder do grupo)" : "Seu E-mail"}</Label>
                <Input
                  type="email"
                  value={participantEmail}
                  onChange={e => setParticipantEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
            )}

            {!hasGroupAssignments && isGroup && (
              <div className="space-y-2">
                <Label>Componentes do Grupo {room?.restricted_access && "(nome + e-mail)"}</Label>
                {groupMembers.map((m, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input value={m} onChange={e => updateGroupMember(i, e.target.value)} placeholder={`Componente ${i + 1} — nome`} />
                      {groupMembers.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeGroupMember(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {room?.restricted_access && (
                      <Input
                        type="email"
                        value={groupEmails[i] || ""}
                        onChange={e => updateGroupEmail(i, e.target.value)}
                        placeholder={`E-mail do componente ${i + 1}`}
                      />
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addGroupMember}>
                  <UserPlus className="h-4 w-4 mr-1" />Adicionar Componente
                </Button>
              </div>
            )}

            <Button onClick={submitIdentification} disabled={!participantName.trim() || loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
              Confirmar e Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "waiting-group") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={() => { setStep("pin"); setRoom(null); setActivities([]); pendingJoinRef.current = null; }} className="w-fit mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" />Voltar
            </Button>
            <CardTitle className="text-xl">{room?.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="mx-auto inline-flex rounded-2xl bg-amber-500/10 p-4">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            </div>
            <p className="text-sm">
              Seu e-mail ainda não foi atribuído a nenhum grupo nesta sala. Assim que o
              professor formar seu grupo, você entrará automaticamente.
            </p>
            <p className="text-xs text-muted-foreground">Verificando periodicamente…</p>
            <Button variant="outline" size="sm" onClick={checkGroupAssignment} disabled={loading}>
              Verificar agora
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 space-y-4 text-center">
          <div className="mx-auto inline-flex rounded-full bg-green-100 p-4 dark:bg-green-900/30">
            {isExam ? (
              <ClipboardList className="h-10 w-10 text-green-600 dark:text-green-400" />
            ) : (
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            )}
          </div>
          <h2 className="text-2xl font-bold">
            {isExam ? "Prova de Simulação" : "Tudo pronto!"}
          </h2>
          <p className="text-muted-foreground">
            Olá, <strong>{participantName}</strong>! Você está na sala <strong>{room?.title}</strong>.
          </p>

          {isExam && (
            <div className="text-left space-y-2 bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-semibold">Atividades ({activities.length}):</p>
              {activities.map((act: any, i: number) => {
                const done = i < resumeFromIndex;
                return (
                  <div key={act.id} className="flex items-center gap-2 text-sm">
                    <Badge variant={done ? "default" : "outline"} className="text-xs min-w-[24px] justify-center">
                      {done ? "✓" : i + 1}
                    </Badge>
                    <span className={done ? "line-through text-muted-foreground" : ""}>
                      {TOOL_LABELS[act.simulator_slug] || act.simulator_slug}
                    </span>
                  </div>
                );
              })}
              {completedCount > 0 && resumeFromIndex < activities.length && (
                <p className="text-xs text-primary font-medium mt-2">
                  Você já enviou {completedCount} atividade(s). Vamos retomar a partir da atividade {resumeFromIndex + 1}.
                </p>
              )}
              {resumeFromIndex >= activities.length && (
                <p className="text-xs text-green-600 font-medium mt-2">
                  Todas as atividades já foram enviadas. Obrigado!
                </p>
              )}
              {completedCount === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Complete cada atividade em sequência. Ao finalizar uma, você será direcionado à próxima.
                </p>
              )}
            </div>
          )}

          <Button onClick={goToSimulator} size="lg" className="w-full" disabled={isExam && resumeFromIndex >= activities.length}>
            {isExam ? (
              completedCount > 0 && resumeFromIndex < activities.length ? (
                <>Retomar Prova <ArrowRight className="h-4 w-4 ml-2" /></>
              ) : (
                <>Iniciar Prova <ArrowRight className="h-4 w-4 ml-2" /></>
              )
            ) : (
              "Iniciar Simulador"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
