// Sinal de risco por aluno, derivado 100% dos dados já coletados em room_submissions/
// room_participants/room_activities — sem tabela nova, sem ML. Três heurísticas honestas
// com os limites reais dos dados (ver CLAUDE.md / roadmap item 05): tendência de nota,
// abandono de atividades e anomalia de tempo por etapa (só quando há amostra de colegas
// suficiente, já que time_spent_seconds é 0 para a maioria dos simuladores clínicos).

export type RiskTier = "none" | "observar" | "atencao";

export interface RiskResult {
  flags: string[];
  tier: RiskTier;
}

interface RiskSubmission {
  participant_id: string;
  room_id: string;
  activity_id: string | null;
  score: number;
  time_spent_seconds: number;
  submitted_at: string;
}

interface RiskActivity {
  id: string;
  room_id: string;
}

interface RiskInput {
  /** IDs de room_participants que representam a mesma pessoa (1 numa sala só, N se agrupado por e-mail entre salas) */
  participantIds: string[];
  /** Salas às quais essa pessoa pertence */
  roomIds: string[];
  /** Todas as submissões das salas relevantes (não só as dessa pessoa — usadas para calcular a mediana dos colegas) */
  allSubmissions: RiskSubmission[];
  /** Todas as atividades das salas relevantes */
  allActivities: RiskActivity[];
}

const SCORE_DROP_THRESHOLD = 15;
const TIME_RATIO_HIGH = 2;
const TIME_RATIO_LOW = 0.2;
const MIN_PEERS_FOR_TIME_SIGNAL = 3;
const MIN_SUBMISSIONS_FOR_TREND = 4;

export function computeStudentRisk({ participantIds, roomIds, allSubmissions, allActivities }: RiskInput): RiskResult {
  const idSet = new Set(participantIds);
  const mySubs = allSubmissions
    .filter((s) => idSet.has(s.participant_id))
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

  const flags: string[] = [];

  // 1. Tendência de nota: metade recente vs. metade inicial das submissões da própria pessoa
  if (mySubs.length >= MIN_SUBMISSIONS_FOR_TREND) {
    const mid = Math.floor(mySubs.length / 2);
    const avg = (arr: RiskSubmission[]) => arr.reduce((a, s) => a + (s.score || 0), 0) / arr.length;
    const firstAvg = avg(mySubs.slice(0, mid));
    const recentAvg = avg(mySubs.slice(mid));
    if (firstAvg - recentAvg >= SCORE_DROP_THRESHOLD) {
      flags.push("Queda de desempenho nas submissões mais recentes");
    }
  }

  // 2. Abandono: entrou e nunca submeteu, ou parou no meio de uma sequência de atividades
  const myRoomIds = new Set(roomIds);
  let partialAbandon = false;
  for (const roomId of myRoomIds) {
    const roomActs = allActivities.filter((a) => a.room_id === roomId);
    if (roomActs.length <= 1) continue;
    const submittedActIds = new Set(
      mySubs.filter((s) => s.room_id === roomId && s.activity_id).map((s) => s.activity_id)
    );
    if (submittedActIds.size > 0 && submittedActIds.size < roomActs.length) {
      partialAbandon = true;
    }
  }
  if (mySubs.length === 0 && myRoomIds.size > 0) {
    flags.push("Entrou na sala mas nunca enviou uma submissão");
  } else if (partialAbandon) {
    flags.push("Não concluiu todas as etapas de uma sequência de atividades");
  }

  // 3. Anomalia de tempo por etapa — só quando há colegas com tempo real (>0) o suficiente
  let timeAnomaly = false;
  for (const sub of mySubs) {
    if (!sub.time_spent_seconds || !sub.activity_id) continue;
    const peerTimes = allSubmissions
      .filter((s) => s.activity_id === sub.activity_id && !idSet.has(s.participant_id) && s.time_spent_seconds > 0)
      .map((s) => s.time_spent_seconds)
      .sort((a, b) => a - b);
    if (peerTimes.length < MIN_PEERS_FOR_TIME_SIGNAL) continue;
    const median = peerTimes[Math.floor(peerTimes.length / 2)];
    if (median <= 0) continue;
    const ratio = sub.time_spent_seconds / median;
    if (ratio > TIME_RATIO_HIGH || ratio < TIME_RATIO_LOW) {
      timeAnomaly = true;
      break;
    }
  }
  if (timeAnomaly) {
    flags.push("Tempo de resposta muito diferente da turma em pelo menos uma atividade");
  }

  const tier: RiskTier = flags.length === 0 ? "none" : flags.length === 1 ? "observar" : "atencao";
  return { flags, tier };
}

export function riskBadgeProps(tier: RiskTier): { label: string; className: string } | null {
  if (tier === "none") return null;
  if (tier === "observar") {
    return { label: "Observar", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
  }
  return { label: "Atenção", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
}
