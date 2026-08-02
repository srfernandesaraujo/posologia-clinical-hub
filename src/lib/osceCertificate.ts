import { getSimulatorCategory } from "@/data/simulatorCategories";

export interface CompetencyBreakdown {
  category: string;
  score: number;
  activityCount: number;
}

interface RoomActivity {
  id: string;
  simulator_slug: string;
}

interface RoomSubmission {
  activity_id: string | null;
  score: number;
}

/**
 * Agrega as notas de uma prova "Simulada" por categoria de simulador (mesmo mapa
 * usado pelo Mapa de Competências em useMastery.ts), para o relatório do
 * certificado OSCE. Diferente de useMastery, é uma média simples desta única
 * sessão — não há histórico a ponderar por recência.
 */
export function computeCompetencyBreakdown(
  activities: RoomActivity[],
  submissions: RoomSubmission[],
): CompetencyBreakdown[] {
  const byCategory = new Map<string, { sum: number; count: number }>();

  for (const activity of activities) {
    const submission = submissions.find((s) => s.activity_id === activity.id);
    if (!submission) continue;
    const category = getSimulatorCategory(activity.simulator_slug) || "Geral";
    const bucket = byCategory.get(category) || { sum: 0, count: 0 };
    bucket.sum += submission.score;
    bucket.count += 1;
    byCategory.set(category, bucket);
  }

  return [...byCategory.entries()]
    .map(([category, { sum, count }]) => ({
      category,
      score: Math.round(sum / count),
      activityCount: count,
    }))
    .sort((a, b) => b.score - a.score);
}

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sem 0/O/1/I (ambíguos)

/** Código curto para o certificado ser verificado publicamente (mesmo espírito do PIN de sala). */
export function generateCertificateCode(): string {
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
