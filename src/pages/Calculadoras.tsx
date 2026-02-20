import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Calculator, Search, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Calculadoras() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["tools", "calculadora"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name, slug)")
        .eq("type", "calculadora")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = tools.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("calculators.title")}</h1>
        <p className="text-muted-foreground">{t("calculators.subtitle")}</p>
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("calculators.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Fixed: Risco Cardiovascular */}
          {(!search || "calculadora de risco cardiovascular".includes(search.toLowerCase())) && (
            <Link
              to="/calculadoras/risco-cardiovascular"
              className="rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20"
            >
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Calculadora de Risco Cardiovascular</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                Estima o risco CV em 10 anos via Framingham, ASCVD e SCORE2.
              </p>
              <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                Cardiologia
              </span>
            </Link>
          )}

          {/* Dynamic tools */}
          {filtered.map((tool: any) => (
            <Link
              key={tool.id}
              to={`/calculadoras/${tool.slug}`}
              className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5"
            >
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{tool.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {tool.short_description || tool.description}
              </p>
              {tool.categories && (
                <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                  {tool.categories.name}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
