import { useEffect, useState } from "react";
import { Trophy, Medal, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RankingEntry {
  user_id: string;
  full_name: string | null;
  total_points: number;
}

interface GameRankingProps {
  gameId: string;
  currentScore?: number;
  onScoreSaved?: () => void;
}

export default function GameRanking({ gameId, currentScore, onScoreSaved }: GameRankingProps) {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRanking, setShowRanking] = useState(false);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("student_points")
        .select("user_id, points")
        .eq("source", `game:${gameId}`)
        .order("points", { ascending: false });

      if (error) throw error;

      // Aggregate by user
      const userMap = new Map<string, number>();
      (data || []).forEach((row) => {
        userMap.set(row.user_id, (userMap.get(row.user_id) || 0) + row.points);
      });

      // Get profile names
      const userIds = Array.from(userMap.keys());
      let profiles: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        (profileData || []).forEach((p) => {
          profiles[p.user_id] = p.full_name || "Jogador Anónimo";
        });
      }

      const sorted = Array.from(userMap.entries())
        .map(([user_id, total_points]) => ({
          user_id,
          total_points,
          full_name: profiles[user_id] || "Jogador Anónimo",
        }))
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 20);

      setRanking(sorted);
    } catch (e) {
      console.error("Ranking fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showRanking) fetchRanking();
  }, [showRanking, gameId]);

  const saveScore = async () => {
    if (!user || currentScore === undefined || currentScore <= 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("student_points").insert({
        user_id: user.id,
        source: `game:${gameId}`,
        points: currentScore,
        simulator_slug: gameId,
      });
      if (error) throw error;
      toast.success(`Pontuação de ${currentScore} salva no ranking!`);
      onScoreSaved?.();
      fetchRanking();
    } catch (e: any) {
      console.error("Save score error:", e);
      toast.error("Erro ao salvar pontuação. Faça login primeiro.");
    } finally {
      setSaving(false);
    }
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Medal className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{index + 1}</span>;
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowRanking(!showRanking)}
        >
          <Trophy className="h-3.5 w-3.5" />
          {showRanking ? "Esconder Ranking" : "Ver Ranking"}
        </Button>

        {user && currentScore !== undefined && currentScore > 0 && (
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={saveScore}
            disabled={saving}
          >
            <Trophy className="h-3.5 w-3.5" />
            {saving ? "Salvando..." : `Salvar Pontuação (${currentScore} pts)`}
          </Button>
        )}
      </div>

      {showRanking && (
        <Card className="animate-in fade-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Ranking — {gameId}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Carregando ranking...</p>
            ) : ranking.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhuma pontuação registada. Seja o primeiro!
              </p>
            ) : (
              <div className="space-y-1.5">
                {ranking.map((entry, i) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                      user && entry.user_id === user.id
                        ? "bg-primary/10 border border-primary/20 font-semibold"
                        : "bg-muted/30"
                    }`}
                  >
                    {getMedalIcon(i)}
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{entry.full_name}</span>
                    <span className="font-bold text-primary">{entry.total_points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
