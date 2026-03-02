import { useEffect, useState } from "react";
import { Trophy, Medal, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RankingEntry {
  user_id: string;
  full_name: string | null;
  total_points: number;
}

interface GameRankingProps {
  gameId: string;
  currentScore?: number;
}

export default function GameRanking({ gameId, currentScore = 0 }: GameRankingProps) {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRanking, setShowRanking] = useState(false);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("game-ranking", {
        body: { gameId, limit: 20 },
      });

      if (error) throw error;
      setRanking(data?.ranking || []);
    } catch (e) {
      console.error("Ranking fetch error:", e);
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showRanking) fetchRanking();
  }, [showRanking, gameId]);

  useEffect(() => {
    if (showRanking && currentScore > 0) fetchRanking();
  }, [currentScore, showRanking]);

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

        <Badge variant="secondary" className="text-xs">
          Pontos da sessão: {currentScore}
        </Badge>
      </div>

      {!user && (
        <p className="text-xs text-muted-foreground">
          Faça login para acumular pontos no ranking.
        </p>
      )}

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
                Nenhuma pontuação registada ainda.
              </p>
            ) : (
              <div className="space-y-1.5">
                {ranking.map((entry, i) => (
                  <div
                    key={`${entry.user_id}-${i}`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                      user && entry.user_id === user.id
                        ? "bg-primary/10 border border-primary/20 font-semibold"
                        : "bg-muted/30"
                    }`}
                  >
                    {getMedalIcon(i)}
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{entry.full_name || "Jogador"}</span>
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

