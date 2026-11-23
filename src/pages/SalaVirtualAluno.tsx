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
import { DoorOpen, Users, UserPlus, X, ArrowLeft, CheckCircle, Loader2, ClipboardList, ArrowRight, Lock, User } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { GAME_LABELS, isGameSlug } from "@/data/virtualRoomGames";

const LAB_PREFIX = "lab-";

// Identidade do dispositivo dentro do grupo (usada quando a sala não pede e-mail).
function getMemberKey(): string {
  try {
    let k = localStorage.getItem("vrMemberKey");
    if (!k) {
      k = crypto.randomUUID();
      localStorage.setItem("vrMemberKey", k);
    }
    return k;
  } catch {
    return crypto.randomUUID();
  }
}

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
  // Papel do aluno no grupo atribuído pelo professor (líder / observador / todos respondem).
  const [groupInfo, setGroupInfo] = useState<any>(null);

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
        member_key: getMemberKey(),
        member_name: name,
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
    setGroupInfo(presp.group || null);
    if (presp.group?.role === "observer") {
      toast.info(`Você entrou como observador. ${presp.group.leaderName ?? "O líder"} é quem marca as respostas; você acompanha em tempo real.`);
    } else if (presp.group?.role === "leader") {
      toast.success("Você é o líder do grupo: só você marca as respostas e avança as questões.");
    }
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
        member_key: getMemberKey(),
        member_name: params.name,
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
        group: groupInfo,
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
      group: groupInfo,
    }));
    navigate(getRouteForActivity(act.simulator_slug, act.case_id, act.id));
  };

  if (step === "pin") {
    return (
      <StudentShell step={1}>
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><DoorOpen className="h-7 w-7" /></div>
        <h1 className="text-center text-2xl font-semibold">Entrar na sala virtual</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Digite o PIN de 6 dígitos que o professor passou.</p>
        <div className="mt-6 flex justify-center">
          <InputOTP
            maxLength={6}
            value={pin}
            onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))}
            onComplete={(v) => joinRoom(v)}
            inputMode="numeric"
            autoFocus
            aria-label="PIN da sala"
            containerClassName="gap-2"
          >
            <InputOTPGroup className="gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="h-14 w-11 rounded-lg border border-border bg-background/60 font-mono text-2xl font-semibold first:rounded-l-lg first:border last:rounded-r-lg sm:w-12" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button onClick={() => joinRoom()} disabled={pin.length !== 6 || loading} size="lg" className="mt-6 w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Entrar
        </Button>
      </StudentShell>
    );
  }

  if (step === "identify") {
    return (
      <StudentShell step={2} onBack={() => { setStep("pin"); setRoom(null); setActivities([]); }}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Sala</p>
        <h1 className="mt-1 text-xl font-semibold leading-snug">{room?.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Identifique-se para começar a atividade.</p>

        <div className="mt-5 space-y-4">
          {room?.restricted_access && (
            <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {hasGroupAssignments
                  ? "O professor já dividiu a turma em grupos, cada um com seu caso. Identifique-se com seu e-mail e você entra automaticamente no grupo e no caso designados."
                  : "Esta sala tem acesso restrito. Só entram alunos cadastrados pelo professor."}
              </span>
            </div>
          )}

          {!hasGroupAssignments && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1" role="radiogroup" aria-label="Como você vai participar">
              {([[false, "Sozinho", <User key="u" className="h-4 w-4" />], [true, "Em grupo", <Users key="g" className="h-4 w-4" />]] as const).map(([val, label, icon]) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={isGroup === val}
                  onClick={() => setIsGroup(val)}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isGroup === val ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{isGroup ? "Nome do grupo" : "Seu nome completo"}</Label>
            <Input value={participantName} onChange={e => setParticipantName(e.target.value)} placeholder={isGroup ? "Ex: Grupo A" : "Ex: Maria Silva"} />
          </div>

          {room?.restricted_access && (
            <div className="space-y-1.5">
              <Label>{isGroup ? "Seu e-mail (líder do grupo)" : "Seu e-mail"}</Label>
              <Input type="email" value={participantEmail} onChange={e => setParticipantEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          )}

          {!hasGroupAssignments && isGroup && (
            <div className="space-y-2">
              <Label>Componentes do grupo {room?.restricted_access && "(nome + e-mail)"}</Label>
              {groupMembers.map((m, i) => (
                <div key={i} className="space-y-1.5 rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-2">
                    <Input value={m} onChange={e => updateGroupMember(i, e.target.value)} placeholder={`Componente ${i + 1} — nome`} />
                    {groupMembers.length > 1 && (
                      <Button variant="ghost" size="icon" aria-label={`Remover componente ${i + 1}`} onClick={() => removeGroupMember(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {room?.restricted_access && (
                    <Input type="email" value={groupEmails[i] || ""} onChange={e => updateGroupEmail(i, e.target.value)} placeholder={`E-mail do componente ${i + 1}`} />
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addGroupMember}>
                <UserPlus className="mr-1 h-4 w-4" />Adicionar componente
              </Button>
            </div>
          )}

          <Button onClick={submitIdentification} disabled={!participantName.trim() || loading} size="lg" className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar e entrar
          </Button>
        </div>
      </StudentShell>
    );
  }

  if (step === "waiting-group") {
    return (
      <StudentShell step={2} onBack={() => { setStep("pin"); setRoom(null); setActivities([]); pendingJoinRef.current = null; }}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Sala</p>
        <h1 className="mt-1 text-xl font-semibold leading-snug">{room?.title}</h1>
        <div className="mt-6 flex flex-col items-center gap-4 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-status-warn/10"><Loader2 className="h-7 w-7 animate-spin text-status-warn" /></div>
          <p className="text-sm">
            Seu e-mail ainda não foi atribuído a nenhum grupo nesta sala. Assim que o professor formar seu grupo, você entra automaticamente.
          </p>
          <p className="text-xs text-muted-foreground">Verificando a cada poucos segundos…</p>
          <Button variant="outline" size="sm" onClick={checkGroupAssignment} disabled={loading}>Verificar agora</Button>
        </div>
      </StudentShell>
    );
  }

  // Pronto
  const allDone = isExam && resumeFromIndex >= activities.length;
  return (
    <StudentShell step={3}>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-status-ok/10 text-status-ok">
          {isExam ? <ClipboardList className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-status-ok">{isExam ? "Prova de simulação" : "Tudo pronto"}</p>
          <h1 className="truncate text-xl font-semibold">{room?.title}</h1>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Olá, <strong className="text-foreground">{participantName}</strong>! Você está dentro da sala.</p>

      {isExam && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Atividades · {activities.length}</p>
          <ol className="space-y-1.5">
            {activities.map((act: any, i: number) => {
              const done = i < resumeFromIndex;
              const current = i === resumeFromIndex && !allDone;
              return (
                <li key={act.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${current ? "border-primary bg-primary/10" : "border-border"}`}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${done ? "border-status-ok/50 bg-status-ok/10 text-status-ok" : current ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={done ? "text-muted-foreground line-through" : ""}>{TOOL_LABELS[act.simulator_slug] || act.simulator_slug}</span>
                  {current && <span className="ml-auto text-[11px] font-medium text-primary">próxima</span>}
                </li>
              );
            })}
          </ol>
          {completedCount > 0 && resumeFromIndex < activities.length && (
            <p className="mt-3 text-xs font-medium text-primary">Você já enviou {completedCount} atividade(s). Vamos retomar na atividade {resumeFromIndex + 1}.</p>
          )}
          {allDone && <p className="mt-3 text-xs font-medium text-status-ok">Todas as atividades já foram enviadas. Obrigado!</p>}
          {completedCount === 0 && <p className="mt-3 text-xs text-muted-foreground">Faça cada atividade em sequência. Ao terminar uma, você segue para a próxima.</p>}
        </div>
      )}

      <Button onClick={goToSimulator} size="lg" className="mt-6 w-full" disabled={allDone}>
        {isExam ? (
          completedCount > 0 && resumeFromIndex < activities.length ? <>Retomar prova <ArrowRight className="ml-2 h-4 w-4" /></> : <>Iniciar prova <ArrowRight className="ml-2 h-4 w-4" /></>
        ) : (
          <>Iniciar simulador <ArrowRight className="ml-2 h-4 w-4" /></>
        )}
      </Button>
    </StudentShell>
  );
}

const STUDENT_STEPS = ["PIN", "Identificação", "Pronto"];

/** Moldura das telas do aluno: passos no topo e um painel central com brilho suave. */
function StudentShell({ step, onBack, children }: { step: 1 | 2 | 3; onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[78vh] items-center justify-center overflow-hidden px-4 py-8">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <ol className="mb-5 flex items-center justify-center gap-2 text-xs" aria-label="Etapas">
          {STUDENT_STEPS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <li key={label} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
                <span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] font-bold ${done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{done ? "✓" : n}</span>
                <span className={active ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
                {n < STUDENT_STEPS.length && <span className="h-px w-6 bg-border" />}
              </li>
            );
          })}
        </ol>
        <div className="rounded-2xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur sm:p-8">
          {onBack && (
            <button type="button" onClick={onBack} className="mb-4 -ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />Voltar
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
