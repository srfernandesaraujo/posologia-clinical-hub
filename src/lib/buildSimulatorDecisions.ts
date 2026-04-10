/**
 * Utility to build structured simulator_decisions actions payload
 * for robust Analytics rendering.
 */

export interface SimDecision {
  label: string;
  userChoice: string;
  idealChoice: string;
  correct: boolean;
  category: string;
  explanation?: string;
}

export interface SimDecisionsSummary {
  score: number;
  totalDecisions: number;
  correctDecisions: number;
  categories: Record<string, { correct: number; total: number }>;
  strengths: string[];
  weaknesses: string[];
  pedagogicalNote: string;
}

export interface SimulatorDecisionsPayload {
  type: "simulator_decisions";
  simulatorSlug: string;
  decisions: SimDecision[];
  summary: SimDecisionsSummary;
}

export function buildSimulatorDecisions(
  simulatorSlug: string,
  decisions: SimDecision[],
  pedagogicalNote?: string
): SimulatorDecisionsPayload {
  const categories: Record<string, { correct: number; total: number }> = {};
  let correctCount = 0;

  decisions.forEach(d => {
    const cat = d.category || "Geral";
    if (!categories[cat]) categories[cat] = { correct: 0, total: 0 };
    categories[cat].total += 1;
    if (d.correct) {
      categories[cat].correct += 1;
      correctCount++;
    }
  });

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  Object.entries(categories).forEach(([cat, stats]) => {
    const pct = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    if (pct >= 80) strengths.push(cat);
    else if (pct < 50) weaknesses.push(cat);
  });

  const score = decisions.length > 0
    ? Math.round((correctCount / decisions.length) * 100)
    : 0;

  return {
    type: "simulator_decisions",
    simulatorSlug,
    decisions,
    summary: {
      score,
      totalDecisions: decisions.length,
      correctDecisions: correctCount,
      categories,
      strengths,
      weaknesses,
      pedagogicalNote: pedagogicalNote || (
        weaknesses.length > 0
          ? `Revise os conceitos de: ${weaknesses.join(", ")}.`
          : strengths.length > 0
            ? `Bom domínio em: ${strengths.join(", ")}.`
            : ""
      ),
    },
  };
}
