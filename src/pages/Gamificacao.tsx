import { Trophy, Flame, Target, Medal, Star, Award, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGamification, BADGE_DEFINITIONS, POINTS } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function StreakDisplay({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "flex items-center justify-center w-16 h-16 rounded-2xl",
        streak >= 7 ? "bg-destructive/20 text-destructive" : streak >= 3 ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
      )}>
        <Flame className="h-8 w-8" />
      </div>
      <div>
        <p className="text-3xl font-bold">{streak}</p>
        <p className="text-sm text-muted-foreground">{streak === 1 ? "dia consecutivo" : "dias consecutivos"}</p>
      </div>
    </div>
  );
}

function BadgeCard({ badge, earned }: { badge: typeof BADGE_DEFINITIONS[number]; earned: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center",
          earned
            ? "border-primary/30 bg-primary/5 shadow-sm"
            : "border-border bg-muted/30 opacity-50 grayscale"
        )}>
          <span className="text-3xl">{badge.icon}</span>
          <p className="text-sm font-semibold leading-tight">{badge.name}</p>
          {earned && (
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              Conquistado
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p>{badge.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function LeaderboardRow({ rank, name, points, isCurrentUser }: { rank: number; name: string; points: number; isCurrentUser: boolean }) {
  const medalColors: Record<number, string> = { 1: "text-accent", 2: "text-muted-foreground", 3: "text-primary" };
  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors",
      isCurrentUser ? "border-primary/30 bg-primary/5" : "border-border bg-card"
    )}>
      <div className="w-8 text-center">
        {rank <= 3 ? (
          <Medal className={cn("h-5 w-5 mx-auto", medalColors[rank])} />
        ) : (
          <span className="text-sm font-bold text-muted-foreground">{rank}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", isCurrentUser && "text-primary")}>
          {name} {isCurrentUser && <span className="text-xs text-muted-foreground">(você)</span>}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Star className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-bold">{points.toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}

export default function Gamificacao() {
  const { user } = useAuth();
  const {
    totalPoints,
    totalCases,
    streak,
    activeDays,
    earnedBadges,
    leaderboard,
  } = useGamification();

  const earnedSet = new Set(earnedBadges.map((b) => b.badge_id));
  const earnedList = BADGE_DEFINITIONS.filter((b) => earnedSet.has(b.id));
  const lockedList = BADGE_DEFINITIONS.filter((b) => !earnedSet.has(b.id));

  // Next badge progress
  const nextCaseMilestone = [1, 10, 50, 100].find((n) => totalCases < n) || 100;
  const caseProgress = Math.min(100, Math.round((totalCases / nextCaseMilestone) * 100));

  // User rank
  const userRank = leaderboard.findIndex((l) => l.userId === user?.id) + 1;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Gamificação</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <Star className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-primary">{totalPoints.toLocaleString("pt-BR")}</p>
            <p className="text-sm text-muted-foreground">Pontos Totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-primary">{totalCases}</p>
            <p className="text-sm text-muted-foreground">Casos Resolvidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Award className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-primary">{earnedList.length}</p>
            <p className="text-sm text-muted-foreground">Badges Conquistados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-primary">{userRank > 0 ? `#${userRank}` : "–"}</p>
            <p className="text-sm text-muted-foreground">Seu Ranking</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="badges" className="space-y-6">
        <TabsList>
          <TabsTrigger value="badges"><Award className="h-4 w-4 mr-1" />Badges</TabsTrigger>
          <TabsTrigger value="ranking"><Trophy className="h-4 w-4 mr-1" />Ranking</TabsTrigger>
          <TabsTrigger value="streak"><Flame className="h-4 w-4 mr-1" />Streak</TabsTrigger>
        </TabsList>

        {/* ── Badges Tab ── */}
        <TabsContent value="badges" className="space-y-6">
          {/* Progress to next milestone */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Próxima Conquista</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">{totalCases} / {nextCaseMilestone} casos</span>
                <span className="font-medium text-primary">{caseProgress}%</span>
              </div>
              <Progress value={caseProgress} className="h-2" />
            </CardContent>
          </Card>

          {/* Earned */}
          {earnedList.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-primary">✨</span> Conquistados ({earnedList.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {earnedList.map((b) => <BadgeCard key={b.id} badge={b} earned />)}
              </div>
            </div>
          )}

          {/* Locked */}
          {lockedList.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-muted-foreground">🔒 Bloqueados ({lockedList.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {lockedList.map((b) => <BadgeCard key={b.id} badge={b} earned={false} />)}
              </div>
            </div>
          )}

          {/* Points guide */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Como ganhar pontos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                  <span>Caso clínico resolvido</span>
                  <span className="font-bold text-primary">+{POINTS.SIMULATOR_CASE} pts</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                  <span>Uso de calculadora</span>
                  <span className="font-bold text-primary">+{POINTS.CALCULATOR_USE} pts</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                  <span>Login diário</span>
                  <span className="font-bold text-primary">+{POINTS.DAILY_LOGIN} pts</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                  <span>Streak de 7 dias</span>
                  <span className="font-bold text-primary">+{POINTS.STREAK_BONUS_7} pts</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Ranking Tab ── */}
        <TabsContent value="ranking" className="space-y-3">
          {leaderboard.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum dado de ranking ainda. Comece a resolver casos nos simuladores!
              </CardContent>
            </Card>
          ) : (
            leaderboard.map((entry, i) => (
              <LeaderboardRow
                key={entry.userId}
                rank={i + 1}
                name={entry.name}
                points={entry.totalPoints}
                isCurrentUser={entry.userId === user?.id}
              />
            ))
          )}
        </TabsContent>

        {/* ── Streak Tab ── */}
        <TabsContent value="streak" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <StreakDisplay streak={streak} />
                <div className="text-center sm:text-right">
                  <p className="text-sm text-muted-foreground">{activeDays} dias ativos no total</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pratique todos os dias para manter seu streak!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Streak milestones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { days: 3, label: "Consistente", bonus: POINTS.STREAK_BONUS_3, icon: "🔥" },
              { days: 7, label: "Dedicado", bonus: POINTS.STREAK_BONUS_7, icon: "⚡" },
              { days: 30, label: "Imparável", bonus: POINTS.STREAK_BONUS_30, icon: "🌟" },
            ].map((m) => (
              <Card key={m.days} className={cn(streak >= m.days && "border-primary/30 bg-primary/5")}>
                <CardContent className="pt-6 text-center">
                  <span className="text-2xl">{m.icon}</span>
                  <p className="font-semibold mt-2">{m.label}</p>
                  <p className="text-sm text-muted-foreground">{m.days} dias seguidos</p>
                  <p className="text-xs text-primary font-bold mt-1">+{m.bonus} pts bônus</p>
                  {streak >= m.days && (
                    <Badge className="mt-2 bg-primary/10 text-primary border-primary/20" variant="outline">
                      ✓ Atingido
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
