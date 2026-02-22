import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calculator, FlaskConical, Lock, Store, Star } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPremium, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();
  const [search, setSearch] = useState("");

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["marketplace-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name)")
        .eq("is_marketplace", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch author profiles for all tools with created_by
  const creatorIds = useMemo(() => [...new Set(tools.filter((t: any) => t.created_by).map((t: any) => t.created_by))], [tools]);
  
  const { data: profiles = [] } = useQuery({
    queryKey: ["marketplace-profiles", creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", creatorIds);
      return data || [];
    },
    enabled: creatorIds.length > 0,
  });

  // Fetch average ratings for all marketplace tools
  const toolIds = useMemo(() => tools.map((t: any) => t.id), [tools]);
  
  const { data: reviews = [] } = useQuery({
    queryKey: ["marketplace-reviews", toolIds],
    queryFn: async () => {
      if (toolIds.length === 0) return [];
      const { data } = await supabase.from("tool_reviews" as any).select("tool_id, rating").in("tool_id", toolIds);
      return (data || []) as unknown as { tool_id: string; rating: number }[];
    },
    enabled: toolIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p: any) => { map[p.user_id] = p.full_name || "Usuário"; });
    return map;
  }, [profiles]);

  const reviewStats = useMemo(() => {
    const map: Record<string, { avg: number; count: number }> = {};
    const grouped: Record<string, number[]> = {};
    reviews.forEach((r: any) => {
      if (!grouped[r.tool_id]) grouped[r.tool_id] = [];
      grouped[r.tool_id].push(r.rating);
    });
    Object.entries(grouped).forEach(([tid, ratings]) => {
      map[tid] = { avg: ratings.reduce((s, v) => s + v, 0) / ratings.length, count: ratings.length };
    });
    return map;
  }, [reviews]);

  const calculadoras = tools.filter((t: any) => t.type === "calculadora" && t.name.toLowerCase().includes(search.toLowerCase()));
  const simuladores = tools.filter((t: any) => t.type === "simulador" && t.name.toLowerCase().includes(search.toLowerCase()));

  const handleToolClick = (tool: any) => {
    if (!isPremium) {
      showUpgrade("O Marketplace é exclusivo para usuários Premium");
      return;
    }
    const basePath = tool.type === "calculadora" ? "/calculadoras" : "/simuladores";
    navigate(`${basePath}/${tool.slug}`);
  };

  const ToolCard = ({ tool, icon: Icon }: { tool: any; icon: any }) => {
    const authorName = tool.created_by ? (profileMap[tool.created_by] || "Usuário") : "Sérgio Araújo";
    const stats = reviewStats[tool.id];
    return (
      <div
        onClick={() => handleToolClick(tool)}
        className={`cursor-pointer rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 ${
          isPremium ? "border-border hover:shadow-lg hover:shadow-primary/5" : "border-border opacity-75"
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="inline-flex rounded-lg bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          {!isPremium && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>
        <h3 className="font-semibold mb-1">{tool.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{tool.short_description || tool.description}</p>
        
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground truncate max-w-[60%]">por {authorName}</span>
          <div className="flex items-center gap-1">
            {stats ? (
              <>
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-medium">{stats.avg.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({stats.count})</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Sem avaliações</span>
            )}
          </div>
        </div>
        
        {tool.categories && (
          <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
            {tool.categories.name}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />

      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Marketplace</h1>
              <p className="text-muted-foreground">Calculadoras e simuladores compartilhados pela comunidade</p>
            </div>
          </div>
          {!isPremium && (
            <Badge variant="outline" className="gap-1 text-sm">
              <Lock className="h-3.5 w-3.5" />
              Requer Premium
            </Badge>
          )}
        </div>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar no marketplace..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="calculadoras">
        <TabsList>
          <TabsTrigger value="calculadoras" className="gap-1.5">
            <Calculator className="h-3.5 w-3.5" /> Calculadoras ({calculadoras.length})
          </TabsTrigger>
          <TabsTrigger value="simuladores" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" /> Simuladores ({simuladores.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculadoras" className="mt-6">
          {calculadoras.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma calculadora publicada no marketplace ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {calculadoras.map((tool: any) => <ToolCard key={tool.id} tool={tool} icon={Calculator} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="simuladores" className="mt-6">
          {simuladores.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum simulador publicado no marketplace ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {simuladores.map((tool: any) => <ToolCard key={tool.id} tool={tool} icon={FlaskConical} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
