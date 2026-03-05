import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RelatedCalculatorsProps {
  currentSlug: string;
  categoryId?: string | null;
  relatedSlugs?: string[];
}

const NATIVE_PATHS: Record<string, string> = {
  "risco-cardiovascular": "/calculadoras/risco-cardiovascular",
  "desmame-corticoide": "/calculadoras/desmame-corticoide",
  "equivalencia-opioides": "/calculadoras/equivalencia-opioides",
  "ajuste-dose-renal": "/calculadoras/ajuste-dose-renal",
  "equivalencia-antidepressivos": "/calculadoras/equivalencia-antidepressivos",
  "homa-ir": "/calculadoras/homa-ir",
  "findrisc": "/calculadoras/findrisc",
  "ckd-epi": "/calculadoras/ckd-epi",
  "correcao-sodio": "/calculadoras/correcao-sodio",
  "correcao-calcio": "/calculadoras/correcao-calcio",
  "wells-score": "/calculadoras/wells-score",
  "qsofa": "/calculadoras/qsofa",
};

// Clinical relationships between calculators
const RELATED_MAP: Record<string, string[]> = {
  "risco-cardiovascular": ["homa-ir", "findrisc", "wells-score"],
  "homa-ir": ["findrisc", "risco-cardiovascular"],
  "findrisc": ["homa-ir", "risco-cardiovascular"],
  "desmame-corticoide": ["homa-ir", "ajuste-dose-renal", "correcao-calcio"],
  "equivalencia-opioides": ["ajuste-dose-renal", "qsofa"],
  "ajuste-dose-renal": ["ckd-epi", "equivalencia-opioides", "correcao-sodio"],
  "equivalencia-antidepressivos": ["risco-cardiovascular", "correcao-sodio"],
  "ckd-epi": ["ajuste-dose-renal", "correcao-sodio", "correcao-calcio"],
  "correcao-sodio": ["ckd-epi", "correcao-calcio", "ajuste-dose-renal"],
  "correcao-calcio": ["correcao-sodio", "ckd-epi"],
  "wells-score": ["qsofa", "risco-cardiovascular"],
  "qsofa": ["wells-score", "correcao-sodio"],
};

const CALC_NAMES: Record<string, string> = {
  "risco-cardiovascular": "Risco Cardiovascular",
  "desmame-corticoide": "Desmame de Corticoides",
  "equivalencia-opioides": "Equivalência de Opioides",
  "ajuste-dose-renal": "Ajuste de Dose Renal",
  "equivalencia-antidepressivos": "Equivalência de Antidepressivos",
  "homa-ir": "HOMA-IR",
  "findrisc": "FINDRISC",
  "ckd-epi": "CKD-EPI 2021",
  "correcao-sodio": "Correção de Sódio",
  "correcao-calcio": "Correção de Cálcio",
  "wells-score": "Wells Score (TEP/TVP)",
  "qsofa": "qSOFA",
};

export function RelatedCalculators({ currentSlug, categoryId, relatedSlugs }: RelatedCalculatorsProps) {
  const navigate = useNavigate();

  // Fetch dynamic tools from same category
  const { data: categoryTools = [] } = useQuery({
    queryKey: ["related-tools", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data } = await supabase
        .from("tools")
        .select("slug, name, short_description")
        .eq("type", "calculadora")
        .eq("is_active", true)
        .eq("category_id", categoryId)
        .neq("slug", currentSlug)
        .limit(3);
      return data || [];
    },
    enabled: !!categoryId,
  });

  // Combine hardcoded relations with category-based
  const staticRelated = (relatedSlugs || RELATED_MAP[currentSlug] || [])
    .filter((s) => s !== currentSlug)
    .slice(0, 3);

  const allRelated = [
    ...staticRelated.map((slug) => ({
      slug,
      name: CALC_NAMES[slug] || slug,
      path: NATIVE_PATHS[slug] || `/calculadoras/${slug}`,
    })),
    ...categoryTools
      .filter((t: any) => !staticRelated.includes(t.slug))
      .map((t: any) => ({
        slug: t.slug,
        name: t.name,
        path: NATIVE_PATHS[t.slug] || `/calculadoras/${t.slug}`,
      })),
  ].slice(0, 3);

  if (allRelated.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Calculadoras Relacionadas
      </h3>
      <div className="space-y-2">
        {allRelated.map((calc) => (
          <button
            key={calc.slug}
            onClick={() => navigate(calc.path)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
          >
            <div className="rounded-lg bg-primary/10 p-1.5 shrink-0">
              <Calculator className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium flex-1 truncate">{calc.name}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
