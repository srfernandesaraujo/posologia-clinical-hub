// Teoria Clássica dos Testes aplicada aos desafios de SimulatorChallengeMode,
// recalculada por sala+atividade a partir das próprias respostas dos alunos —
// não é um banco de itens global, é só "para esta turma, nesta prova".
//
// Referência de estilo: src/lib/osceCertificate.ts e src/hooks/useMastery.ts
// (também fazem estatística simples em cima de room_submissions/simulator_attempts).

const MIN_SAMPLE_FOR_DISCRIMINATION = 5;

interface QuestionResultLike {
  index: number;
  correct: boolean;
  responseTimeMs?: number;
}

export interface RoomSubmissionRow {
  participant_id: string;
  activity_id: string | null;
  actions: any;
}

export interface ItemStat {
  index: number;
  n: number;
  pValue: number; // 0..1 — fração que acertou
  discrimination: number; // -1..1 — índice D (grupo superior - grupo inferior)
  reliable: boolean; // false quando n < MIN_SAMPLE_FOR_DISCRIMINATION
  weight: number; // 0.5..2.0
}

export interface WeightedGradeResult {
  grade10: number;
  rawPercent: number;
  perQuestion: { index: number; correct: boolean; weight: number; weightedPoints: number }[];
}

export type SpeedLabel = "dominio" | "reflexivo" | "chute" | "dificuldade" | null;

export interface SpeedProfileEntry {
  index: number;
  label: SpeedLabel;
  responseTimeMs?: number;
  groupMedianMs?: number;
}

export interface SpeedProfile {
  entries: SpeedProfileEntry[];
  summary: string | null;
}

function getChallengeQuestions(submission: RoomSubmissionRow): QuestionResultLike[] {
  if (submission.actions?.type !== "challenge_results") return [];
  return Array.isArray(submission.actions.questions) ? submission.actions.questions : [];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Recalcula dificuldade (p-value) e discriminação (índice D, grupo superior vs
 * inferior por acertos nas OUTRAS questões) para cada questão de uma atividade,
 * a partir de todas as submissões daquela sala. Amostras abaixo de
 * MIN_SAMPLE_FOR_DISCRIMINATION recebem peso neutro (não confiável).
 */
export function computeItemStats(
  roomSubmissions: RoomSubmissionRow[],
  activityId: string | null,
  minSample: number = MIN_SAMPLE_FOR_DISCRIMINATION,
): Map<number, ItemStat> {
  const relevant = roomSubmissions
    .filter((s) => s.activity_id === activityId)
    .map((s) => getChallengeQuestions(s))
    .filter((qs) => qs.length > 0);

  const allIndices = new Set<number>();
  relevant.forEach((qs) => qs.forEach((q) => allIndices.add(q.index)));

  const stats = new Map<number, ItemStat>();

  for (const index of allIndices) {
    const rows = relevant
      .map((qs) => {
        const item = qs.find((q) => q.index === index);
        if (!item) return null;
        const totalOthers = qs.reduce((sum, q) => sum + (q.index !== index && q.correct ? 1 : 0), 0);
        return { correct: item.correct, totalOthers };
      })
      .filter((r): r is { correct: boolean; totalOthers: number } => r !== null);

    const n = rows.length;
    if (n === 0) continue;
    const pValue = rows.filter((r) => r.correct).length / n;

    let discrimination = 0;
    let reliable = false;
    if (n >= minSample) {
      const sorted = [...rows].sort((a, b) => b.totalOthers - a.totalOthers);
      const groupSize = Math.max(1, Math.round(n * 0.27));
      const upper = sorted.slice(0, groupSize);
      const lower = sorted.slice(-groupSize);
      const pUpper = upper.filter((r) => r.correct).length / upper.length;
      const pLower = lower.filter((r) => r.correct).length / lower.length;
      discrimination = pUpper - pLower;
      reliable = true;
    }

    const weight = clamp(1 + Math.max(0, discrimination) * (1 - pValue), 0.5, 2.0);
    stats.set(index, { index, n, pValue, discrimination, reliable, weight });
  }

  return stats;
}

/** Nota ponderada pelos pesos de item calculados em computeItemStats, em escala de 0 a 10. */
export function computeWeightedGrade(
  questions: QuestionResultLike[],
  itemStats: Map<number, ItemStat>,
): WeightedGradeResult {
  let weightedSum = 0;
  let weightTotal = 0;
  let correctCount = 0;

  const perQuestion = questions.map((q) => {
    const weight = itemStats.get(q.index)?.weight ?? 1;
    const points = weight * (q.correct ? 1 : 0);
    weightedSum += points;
    weightTotal += weight;
    if (q.correct) correctCount += 1;
    return { index: q.index, correct: q.correct, weight, weightedPoints: points };
  });

  const grade10 = weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 10 : 0;
  const rawPercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  return { grade10, rawPercent, perQuestion };
}

/** Mediana do tempo de resposta do grupo por questão — só considera submissões que já têm o dado. */
export function computeGroupMedianResponseTimes(
  roomSubmissions: RoomSubmissionRow[],
  activityId: string | null,
): Map<number, number> {
  const byIndex = new Map<number, number[]>();
  roomSubmissions
    .filter((s) => s.activity_id === activityId)
    .forEach((s) => {
      getChallengeQuestions(s).forEach((q) => {
        if (typeof q.responseTimeMs !== "number") return;
        const arr = byIndex.get(q.index) || [];
        arr.push(q.responseTimeMs);
        byIndex.set(q.index, arr);
      });
    });

  const medians = new Map<number, number>();
  byIndex.forEach((values, index) => {
    const m = median(values);
    if (m !== null) medians.set(index, m);
  });
  return medians;
}

const SPEED_LABEL_TEXT: Record<Exclude<SpeedLabel, null>, string> = {
  dominio: "raciocínio ágil e consistente (respostas rápidas e corretas)",
  reflexivo: "raciocínio cuidadoso (respostas mais lentas, porém corretas)",
  chute: "possíveis chutes (respostas rápidas, porém erradas)",
  dificuldade: "dificuldade real (respostas lentas e erradas)",
};

/** Classifica cada questão em um quadrante velocidade×acerto, relativo à mediana do grupo. Não altera a nota. */
export function computeSpeedProfile(
  questions: QuestionResultLike[],
  groupMedians: Map<number, number>,
): SpeedProfile {
  const entries: SpeedProfileEntry[] = questions.map((q) => {
    const groupMedianMs = groupMedians.get(q.index);
    const responseTimeMs = q.responseTimeMs;
    let label: SpeedLabel = null;
    if (groupMedianMs && groupMedianMs > 0 && typeof responseTimeMs === "number") {
      const fast = responseTimeMs < groupMedianMs * 0.7;
      const slow = responseTimeMs > groupMedianMs * 1.3;
      if (fast && q.correct) label = "dominio";
      else if (slow && q.correct) label = "reflexivo";
      else if (fast && !q.correct) label = "chute";
      else if (slow && !q.correct) label = "dificuldade";
    }
    return { index: q.index, label, responseTimeMs, groupMedianMs };
  });

  const counts: Record<Exclude<SpeedLabel, null>, number> = { dominio: 0, reflexivo: 0, chute: 0, dificuldade: 0 };
  let labeled = 0;
  entries.forEach((e) => {
    if (e.label) {
      counts[e.label] += 1;
      labeled += 1;
    }
  });

  let summary: string | null = null;
  if (labeled > 0) {
    const dominant = (Object.keys(counts) as Array<Exclude<SpeedLabel, null>>).reduce((a, b) =>
      counts[b] > counts[a] ? b : a,
    );
    if (counts[dominant] > 0) {
      summary = `${counts[dominant]} de ${labeled} questões com dado de tempo mostram ${SPEED_LABEL_TEXT[dominant]}.`;
    }
  }

  return { entries, summary };
}
