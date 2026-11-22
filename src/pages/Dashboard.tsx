import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator, FlaskConical, ArrowRight, Trophy, Flame, Star, Sparkles, Brain,
  DoorOpen, Plus, Clock, Megaphone, Compass, ArrowUpRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGamification } from "@/hooks/useGamification";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useMastery } from "@/hooks/useMastery";
import { useSystemUpdates } from "@/hooks/useSystemUpdates";
import { NATIVE_SIMULATORS } from "@/data/simulatorCatalog";
import { NATIVE_CALCULATORS } from "@/data/calculatorCatalog";
import { NAV_GROUPS } from "@/components/layouts/appNavigation";
import { cn } from "@/lib/utils";

// Painel de Início: o que a pessoa estava fazendo, o que vale retomar e,
// para professor, as salas abertas. Todos os blocos vêm de dados que já
// existem (simulator_attempts, calculation_history, virtual_rooms,
// system_updates, recomendações e mapa de competências).

interface RecentItem {
  key: string;
  type: "simulador" | "calculadora";
  name: string;
  subtitle: string;
  link: string;
  at: string;
  score?: number;
}

function simulatorName(slug: string) {
  return NATIVE_SIMULATORS.find((s) => s.slug === slug)?.name;
}

function useRecentActivity(userId?: string) {
  return useQuery({
    queryKey: ["dashboard-recent-activity", userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<RecentItem[]> => {
      const [{ data: attempts }, { data: calcs }] = await Promise.all([
        supabase
          .from("simulator_attempts")
          .select("simulator_slug, score, created_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("calculation_history")
          .select("calculator_slug, calculator_name, created_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(40),
      ]);

      const items: RecentItem[] = [];
      for (const a of attempts || []) {
        const sim = NATIVE_SIMULATORS.find((s) => s.slug === a.simulator_slug);
        items.push({
          key: `sim:${a.simulator_slug}`,
          type: "simulador",
          name: sim?.name || a.simulator_slug,
          subtitle: sim?.category || "Simulador",
          link: `/simuladores/${a.simulator_slug}`,
          at: a.created_at,
          score: a.score,
        });
      }
      for (const c of calcs || []) {
        const native = NATIVE_CALCULATORS.find((n) => n.path === `/calculadoras/${c.calculator_slug}`);
        items.push({
          key: `calc:${c.calculator_slug}`,
          type: "calculadora",
          name: native?.name || c.calculator_name,
          subtitle: native?.category || "Calculadora",
          link: native?.path || `/calculadoras/${c.calculator_slug}`,
          at: c.created_at,
        });
      }

      const seen = new Set<string>();
      return items
        .sort((a, b) => (a.at < b.at ? 1 : -1))
        .filter((item) => (seen.has(item.key) ? false : (seen.add(item.key), true)))
        .slice(0, 5);
    },
  });
}

function useActiveRooms(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard-active-rooms", userId],
    enabled: !!userId && enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("virtual_rooms")
        .select("id, title, pin, simulator_slug, expires_at, created_at")
        .eq("created_by", userId!)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10);
      const now = Date.now();
      return (data || []).filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > now).slice(0, 3);
    },
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
}

const SECTION_LABEL = "text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

export default function Dashboard() {
  const { user, isProfessor, isAdmin } = useAuth();
  const [profileName, setProfileName] = useState("");
  const { totalPoints, streak, earnedBadges } = useGamification();
  const { data: recommendations } = useRecommendations();
  const { data: mastery } = useMastery();
  const { changelog } = useSystemUpdates();
  const { data: recent, isLoading: recentLoading } = useRecentActivity(user?.id);
  const isTeacher = isProfessor || isAdmin;
  const { data: rooms } = useActiveRooms(user?.id, isTeacher);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setProfileName(data.full_name);
      });
  }, [user]);

  const firstName = profileName?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || "";
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const reliableMastery = useMemo(() => (mastery || []).filter((m) => m.reliable), [mastery]);
  const [lastActivity, ...moreRecent] = recent || [];
  const news = changelog.slice(0, 3);
  const practiceItems = NAV_GROUPS.find((g) => g.id === "praticar")?.items || [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-sm capitalize text-muted-foreground">{today}</p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}.{" "}
            <span className="text-gradient">
              {isTeacher && rooms?.length ? `${rooms.length} ${rooms.length === 1 ? "sala aberta" : "salas abertas"}` : "Vamos praticar?"}
            </span>
          </h1>
        </div>
        <Link
          to="/gamificacao"
          className="flex items-center divide-x divide-border rounded-xl border border-border bg-card text-sm transition-colors hover:border-primary/40"
          aria-label="Ver conquistas"
        >
          <span className="flex items-center gap-1.5 px-3.5 py-2">
            <Star className="h-4 w-4 text-primary" />
            <span className="font-semibold tabular-nums">{totalPoints.toLocaleString("pt-BR")}</span>
            <span className="text-muted-foreground">pts</span>
          </span>
          <span className="flex items-center gap-1.5 px-3.5 py-2">
            <Flame className={cn("h-4 w-4", streak > 0 ? "text-status-warn" : "text-muted-foreground")} />
            <span className="font-semibold tabular-nums">{streak}</span>
            <span className="text-muted-foreground">{streak === 1 ? "dia" : "dias"}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3.5 py-2">
            <Trophy className="h-4 w-4 text-accent" />
            <span className="font-semibold tabular-nums">{earnedBadges.length}</span>
            <span className="hidden text-muted-foreground sm:inline">conquistas</span>
          </span>
        </Link>
      </header>

      {/* Continuar + salas */}
      <div className={cn("grid gap-4", isTeacher ? "lg:grid-cols-[1.45fr_1fr]" : "lg:grid-cols-[1.45fr_1fr]")}>
        {lastActivity ? (
          <Link
            to={lastActivity.link}
            className="group relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-hero p-6 transition-colors hover:border-primary/50 md:p-7"
          >
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_left,black,transparent_70%)]" aria-hidden />
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <div className="relative space-y-4">
              <p className={cn(SECTION_LABEL, "text-primary")}>Continuar de onde parou</p>
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10">
                  {lastActivity.type === "simulador" ? <FlaskConical className="h-5 w-5 text-primary" /> : <Calculator className="h-5 w-5 text-primary" />}
                </span>
                <div className="min-w-0 space-y-1">
                  <h2 className="text-xl font-semibold md:text-2xl">{lastActivity.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {lastActivity.subtitle} · {timeAgo(lastActivity.at)}
                    {lastActivity.score !== undefined && <> · última nota <span className="font-semibold text-foreground tabular-nums">{lastActivity.score}%</span></>}
                  </p>
                </div>
              </div>
              {lastActivity.score !== undefined && (
                <div className="h-1.5 max-w-md overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, Math.min(100, lastActivity.score))}%` }} />
                </div>
              )}
              <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform group-hover:translate-x-0.5">
                {lastActivity.type === "simulador" ? "Retomar simulador" : "Abrir calculadora"}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-hero p-6 md:p-7">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_left,black,transparent_70%)]" aria-hidden />
            <div className="relative space-y-4">
              <p className={cn(SECTION_LABEL, "text-primary")}>{recentLoading ? "Carregando sua atividade" : "Comece por aqui"}</p>
              <h2 className="text-xl font-semibold md:text-2xl">Escolha uma ferramenta e veja o caso reagir às suas decisões.</h2>
              <p className="max-w-lg text-sm text-muted-foreground">
                Os simuladores têm casos clínicos com Modo Desafio. As calculadoras mostram o cálculo e a interpretação lado a lado.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link to="/simuladores" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Explorar simuladores <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/calculadoras" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-primary/40">
                  Ver calculadoras
                </Link>
              </div>
            </div>
          </div>
        )}

        {isTeacher ? (
          <section className="flex flex-col rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={SECTION_LABEL}>Suas salas abertas</p>
              <Link to="/salas-virtuais" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Nova sala
              </Link>
            </div>
            {rooms && rooms.length > 0 ? (
              <ul className="flex-1 divide-y divide-border">
                {rooms.map((room) => (
                  <li key={room.id}>
                    <Link to={`/salas/${room.id}`} className="group flex items-center gap-3 py-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary">
                        <DoorOpen className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium group-hover:text-primary">{room.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {(room.simulator_slug && simulatorName(room.simulator_slug)) || "Sala com várias atividades"}
                        </span>
                      </span>
                      <span className="rounded-md border border-border px-2 py-1 font-mono text-xs tracking-[0.18em] text-primary">{room.pin}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-1 flex-col items-start justify-center gap-3 py-4">
                <p className="text-sm text-muted-foreground">Nenhuma sala aberta agora. Crie uma sala com um simulador e compartilhe o PIN com a turma.</p>
                <Link to="/salas-virtuais" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary/40">
                  <DoorOpen className="h-4 w-4" /> Ir para Salas Virtuais
                </Link>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className={cn(SECTION_LABEL, "mb-3")}>Usados recentemente</p>
            {moreRecent.length > 0 ? (
              <ul className="divide-y divide-border">
                {moreRecent.map((item) => (
                  <li key={item.key}>
                    <Link to={item.link} className="group flex items-center gap-3 py-2.5">
                      {item.type === "simulador" ? <FlaskConical className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Calculator className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span className="min-w-0 flex-1 truncate text-sm group-hover:text-primary">{item.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(item.at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                O que você abrir aparece aqui. Para achar qualquer ferramenta rápido, use <kbd className="rounded border border-border px-1 font-mono text-[11px]">Ctrl K</kbd>.
              </p>
            )}
          </section>
        )}
      </div>

      {/* Professor também vê o que usou por último */}
      {isTeacher && moreRecent.length > 0 && (
        <section>
          <p className={cn(SECTION_LABEL, "mb-3")}>Usados recentemente</p>
          <div className="flex flex-wrap gap-2">
            {moreRecent.map((item) => (
              <Link
                key={item.key}
                to={item.link}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:text-primary"
              >
                {item.type === "simulador" ? <FlaskConical className="h-3.5 w-3.5 shrink-0" /> : <Calculator className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{item.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recomendado · Competências · Novidades */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <p className={SECTION_LABEL}>Recomendado para você</p>
          </div>
          {recommendations?.length ? (
            <ul className="space-y-1">
              {recommendations.map((rec) => (
                <li key={`${rec.type}-${rec.slug}`}>
                  <Link to={rec.link} className="group -mx-2 flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-secondary/60">
                    {rec.type === "calculadora" ? <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium group-hover:text-primary">{rec.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {rec.reason === "parado" ? `Há ${rec.daysSince} dias sem praticar` : "Da área que você mais usa"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">As recomendações aparecem depois que você usar algumas ferramentas.</p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <Link to="/gamificacao" className="group mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" />
            <p className={cn(SECTION_LABEL, "flex-1")}>Mapa de competências</p>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
          </Link>
          {reliableMastery.length > 0 ? (
            <ul className="space-y-3">
              {reliableMastery.slice(0, 4).map((m) => (
                <li key={m.category} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{m.category}</span>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        m.masteryPct >= 70 ? "text-status-ok" : m.masteryPct >= 40 ? "text-status-warn" : "text-status-crit",
                      )}
                    >
                      {m.masteryPct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        m.masteryPct >= 70 ? "bg-status-ok" : m.masteryPct >= 40 ? "bg-status-warn" : "bg-status-crit",
                      )}
                      style={{ width: `${Math.max(3, m.masteryPct)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Faça pelo menos duas tentativas em simuladores de uma mesma área para ver o seu domínio por área.</p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 md:col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-highlight" />
            <p className={SECTION_LABEL}>Novidades na plataforma</p>
          </div>
          {news.length > 0 ? (
            <ul className="space-y-3">
              {news.map((n) => (
                <li key={n.id} className="space-y-0.5">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {timeAgo(n.implemented_at || n.updated_at || n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma novidade registrada ainda.</p>
          )}
        </section>
      </div>

      {/* Explorar */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className={SECTION_LABEL}>Explorar</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {practiceItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">
                  <item.icon className="h-4 w-4 text-primary" />
                </span>
                {item.count !== undefined && <span className="font-display text-lg font-semibold tabular-nums text-muted-foreground">{item.count}</span>}
              </span>
              <span className="text-sm font-medium group-hover:text-primary">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
