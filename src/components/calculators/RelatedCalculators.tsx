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
  "vancomicina-auc": "/calculadoras/vancomicina-auc",
  "insulina-basal-bolus": "/calculadoras/insulina-basal-bolus",
  "holliday-segar": "/calculadoras/holliday-segar",
  "meld-score": "/calculadoras/meld-score",
  "qtc-corrigido": "/calculadoras/qtc-corrigido",
  "dose-pediatrica": "/calculadoras/dose-pediatrica",
  "rass-sedacao": "/calculadoras/rass-sedacao",
  "nutricao-parenteral": "/calculadoras/nutricao-parenteral",
  "interacoes-cyp": "/calculadoras/interacoes-cyp",
  "adesao-oncologia": "/calculadoras/adesao-oncologia",
  "toxicidade-antineoplasicos": "/calculadoras/toxicidade-antineoplasicos",
};

const RELATED_MAP: Record<string, string[]> = {
  "risco-cardiovascular": ["homa-ir", "findrisc", "wells-score"],
  "homa-ir": ["findrisc", "insulina-basal-bolus"],
  "findrisc": ["homa-ir", "risco-cardiovascular"],
  "desmame-corticoide": ["homa-ir", "correcao-calcio", "insulina-basal-bolus"],
  "equivalencia-opioides": ["ajuste-dose-renal", "qsofa"],
  "ajuste-dose-renal": ["ckd-epi", "vancomicina-auc", "correcao-sodio"],
  "equivalencia-antidepressivos": ["interacoes-cyp", "qtc-corrigido"],
  "ckd-epi": ["ajuste-dose-renal", "correcao-sodio", "vancomicina-auc"],
  "correcao-sodio": ["ckd-epi", "correcao-calcio", "holliday-segar"],
  "correcao-calcio": ["correcao-sodio", "ckd-epi", "nutricao-parenteral"],
  "wells-score": ["qsofa", "risco-cardiovascular"],
  "qsofa": ["wells-score", "rass-sedacao"],
  "vancomicina-auc": ["ajuste-dose-renal", "ckd-epi", "interacoes-cyp"],
  "insulina-basal-bolus": ["homa-ir", "findrisc", "correcao-sodio"],
  "holliday-segar": ["dose-pediatrica", "correcao-sodio"],
  "meld-score": ["ckd-epi", "correcao-sodio", "nutricao-parenteral"],
  "qtc-corrigido": ["interacoes-cyp", "equivalencia-antidepressivos"],
  "dose-pediatrica": ["holliday-segar"],
  "rass-sedacao": ["qsofa", "nutricao-parenteral"],
  "nutricao-parenteral": ["holliday-segar", "meld-score"],
  "interacoes-cyp": ["vancomicina-auc", "qtc-corrigido", "equivalencia-antidepressivos"],
};

const CALC_NAMES: Record<string, string> = {
  "risco-cardiovascular": "Risco Cardiovascular",
  "desmame-corticoide": "Desmame de Corticoides",
  "equivalencia-opioides": "Equivalencia de Opioides",
  "ajuste-dose-renal": "Ajuste de Dose Renal",
  "equivalencia-antidepressivos": "Equivalencia de Antidepressivos",
  "homa-ir": "HOMA-IR",
  "findrisc": "FINDRISC",
  "ckd-epi": "CKD-EPI 2021",
  "correcao-sodio": "Correcao de Sodio",
  "correcao-calcio": "Correcao de Calcio",
  "wells-score": "Wells Score (TEP/TVP)",
  "qsofa": "qSOFA",
  "vancomicina-auc": "Vancomicina AUC/MIC",
  "insulina-basal-bolus": "Insulina Basal-Bolus",
  "holliday-segar": "Holliday-Segar",
  "meld-score": "MELD/Child-Pugh",
  "qtc-corrigido": "QTc Corrigido",
  "dose-pediatrica": "Dose Pediatrica",
  "rass-sedacao": "RASS (Sedacao)",
  "nutricao-parenteral": "NPT",
  "interacoes-cyp": "Interacoes CYP450",
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
