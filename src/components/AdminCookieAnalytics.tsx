import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Globe, MousePointerClick, Clock, TrendingUp } from "lucide-react";

const COLORS = ["hsl(168 80% 42%)", "hsl(262 83% 65%)", "hsl(38 92% 50%)", "hsl(0 62% 50%)", "hsl(200 80% 50%)"];

export default function AdminCookieAnalytics() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-analytics-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando analytics...</p>;
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Globe className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Nenhum evento registrado ainda</p>
        <p className="text-sm mt-1">Os dados aparecerão aqui conforme os visitantes aceitam cookies de analytics.</p>
      </div>
    );
  }

  // Compute metrics
  const uniqueSessions = new Set(events.map((e: any) => e.session_id)).size;
  const pageViews = events.filter((e: any) => e.event_type === "page_view");
  const toolUses = events.filter((e: any) => e.event_type === "tool_use");
  const ctaClicks = events.filter((e: any) => e.event_type === "cta_click");

  // Top pages
  const pageCounts: Record<string, number> = {};
  pageViews.forEach((e: any) => {
    pageCounts[e.page_path] = (pageCounts[e.page_path] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  // Top tools
  const toolCounts: Record<string, number> = {};
  toolUses.forEach((e: any) => {
    if (e.tool_slug) toolCounts[e.tool_slug] = (toolCounts[e.tool_slug] || 0) + 1;
  });
  const topTools = Object.entries(toolCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([slug, count]) => ({ slug, count }));

  // Events by type for pie chart
  const eventTypeCounts = [
    { name: "Page Views", value: pageViews.length },
    { name: "Tool Use", value: toolUses.length },
    { name: "CTA Clicks", value: ctaClicks.length },
  ].filter((e) => e.value > 0);

  // Daily page views (last 7 days)
  const now = new Date();
  const dailyData: { day: string; views: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const count = pageViews.filter((e: any) => e.created_at?.startsWith(dayStr)).length;
    dailyData.push({ day: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }), views: count });
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Globe} label="Sessões únicas" value={uniqueSessions} />
        <StatCard icon={TrendingUp} label="Page views" value={pageViews.length} />
        <StatCard icon={MousePointerClick} label="Uso de ferramentas" value={toolUses.length} />
        <StatCard icon={Clock} label="Cliques em CTAs" value={ctaClicks.length} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily views */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Page views (últimos 7 dias)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(220 10% 55%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220 10% 55%)" />
              <Tooltip contentStyle={{ background: "hsl(222 40% 9%)", border: "1px solid hsl(220 20% 16%)", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="views" fill="hsl(168 80% 42%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Event type distribution */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Distribuição de eventos</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={eventTypeCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {eventTypeCounts.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(222 40% 9%)", border: "1px solid hsl(220 20% 16%)", borderRadius: 8, color: "#fff" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top pages & tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Páginas mais visitadas</h3>
          <div className="space-y-2">
            {topPages.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm rounded-lg bg-secondary/50 px-3 py-2">
                <span className="truncate text-foreground/80">{p.path}</span>
                <span className="text-muted-foreground font-medium">{p.count}</span>
              </div>
            ))}
            {topPages.length === 0 && <p className="text-xs text-muted-foreground">Sem dados</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Ferramentas mais usadas</h3>
          <div className="space-y-2">
            {topTools.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm rounded-lg bg-secondary/50 px-3 py-2">
                <span className="truncate text-foreground/80">{t.slug}</span>
                <span className="text-muted-foreground font-medium">{t.count}</span>
              </div>
            ))}
            {topTools.length === 0 && <p className="text-xs text-muted-foreground">Sem dados</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}
