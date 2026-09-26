/**
 * Motor da etapa DISTRIBUIÇÃO: rateio de um estoque insuficiente na CAF entre as unidades de saúde (UBS).
 * Cobertura (dias) = (saldo + quantidade recebida) ÷ CMM da unidade × 30. O aluno pode partir de um critério
 * (igualitário, proporcional ao consumo, proporcional ao déficit) e ajustar unidade por unidade.
 */

export interface UnidadeSaude {
  id: string;
  nome: string;
  /** Consumo médio mensal do item na unidade. */
  cmm: number;
  saldo: number;
  /** Capacidade de armazenamento do item na unidade. */
  capacidade: number;
  /** Observação de contexto (distância, horário de recebimento, etc.). */
  nota?: string;
}

export interface DistribuicaoCaso {
  itemNome: string;
  unidade: string;
  disponivelCAF: number;
  coberturaAlvoMeses: number;
  /** Cobertura mínima aceitável, em dias: abaixo dela a unidade não chega ao próximo ressuprimento. */
  limiteRiscoDias: number;
  passo: number;
  ubs: UnidadeSaude[];
}

export type CriterioRateio = "igualitario" | "proporcional-consumo" | "proporcional-deficit";
export const CRITERIOS: { id: CriterioRateio; label: string }[] = [
  { id: "igualitario", label: "Igualitário (a mesma quantidade para cada unidade)" },
  { id: "proporcional-consumo", label: "Proporcional ao consumo médio mensal (CMM)" },
  { id: "proporcional-deficit", label: "Proporcional ao déficit (CMM × cobertura alvo − saldo)" },
];

export const deficit = (c: DistribuicaoCaso, u: UnidadeSaude) => Math.max(0, u.cmm * c.coberturaAlvoMeses - u.saldo);

export interface OpcoesRateio {
  /** Unidades cuja quantidade o aluno fixou à mão: ficam como estão e o critério só reparte o que sobrar. */
  fixos?: Record<string, number>;
  /** Reserva técnica que fica na CAF (não é distribuída). */
  reserva?: number;
}

export function sugerirRateio(c: DistribuicaoCaso, criterio: CriterioRateio, opts: OpcoesRateio = {}): Record<string, number> {
  const fixos = opts.fixos ?? {};
  const reserva = opts.reserva ?? 0;
  const somaFixos = Object.values(fixos).reduce((s, v) => s + v, 0);
  const disponivel = Math.max(0, c.disponivelCAF - reserva - somaFixos);
  const livres = c.ubs.filter((u) => !(u.id in fixos));
  const pesos = livres.map((u) => (criterio === "igualitario" ? 1 : criterio === "proporcional-consumo" ? u.cmm : deficit(c, u)));
  const soma = pesos.reduce((s, p) => s + p, 0) || 1;
  const out: Record<string, number> = { ...fixos };
  livres.forEach((u, i) => {
    out[u.id] = Math.floor(((disponivel * pesos[i]) / soma) / c.passo) * c.passo;
  });
  return out;
}

export interface LinhaDistribuicao {
  id: string;
  nome: string;
  cmm: number;
  saldo: number;
  alocado: number;
  saldoFinal: number;
  coberturaDias: number;
  excedeCapacidade: boolean;
  emRisco: boolean;
}

export interface ResultadoDistribuicao {
  linhas: LinhaDistribuicao[];
  totalAlocado: number;
  sobraCAF: number;
  excedeDisponivel: boolean;
  ubsEmRisco: string[];
  ubsAcimaCapacidade: string[];
  minDias: number;
  maxDias: number;
  /** Maior cobertura ÷ menor cobertura: quanto mais perto de 1, mais equitativo o rateio. */
  razaoMaxMin: number;
}

export function computeDistribuicao(c: DistribuicaoCaso, aloc: Record<string, number>): ResultadoDistribuicao {
  const linhas: LinhaDistribuicao[] = c.ubs.map((u) => {
    const alocado = aloc[u.id] ?? 0;
    const saldoFinal = u.saldo + alocado;
    const coberturaDias = (saldoFinal / u.cmm) * 30;
    return { id: u.id, nome: u.nome, cmm: u.cmm, saldo: u.saldo, alocado, saldoFinal, coberturaDias, excedeCapacidade: saldoFinal > u.capacidade, emRisco: coberturaDias < c.limiteRiscoDias };
  });
  const totalAlocado = linhas.reduce((s, l) => s + l.alocado, 0);
  const dias = linhas.map((l) => l.coberturaDias);
  const minDias = Math.min(...dias);
  const maxDias = Math.max(...dias);
  return {
    linhas,
    totalAlocado,
    sobraCAF: c.disponivelCAF - totalAlocado,
    excedeDisponivel: totalAlocado > c.disponivelCAF,
    ubsEmRisco: linhas.filter((l) => l.emRisco).map((l) => l.nome),
    ubsAcimaCapacidade: linhas.filter((l) => l.excedeCapacidade).map((l) => l.nome),
    minDias,
    maxDias,
    razaoMaxMin: minDias > 0 ? maxDias / minDias : Infinity,
  };
}

/** Rateio aceitável: cabe no disponível, ninguém abaixo do limite de risco nem acima da capacidade, e cobertura equitativa (razão ≤ 1,25). */
export function distribuicaoAtendeCriterios(c: DistribuicaoCaso, aloc: Record<string, number>): { ok: boolean; problemas: string[] } {
  const r = computeDistribuicao(c, aloc);
  const problemas: string[] = [];
  if (r.excedeDisponivel) problemas.push("a soma distribuída passa do que a CAF tem");
  if (r.ubsEmRisco.length) problemas.push(`unidade(s) abaixo de ${c.limiteRiscoDias} dias de cobertura: ${r.ubsEmRisco.join(", ")}`);
  if (r.ubsAcimaCapacidade.length) problemas.push(`unidade(s) acima da capacidade de armazenamento: ${r.ubsAcimaCapacidade.join(", ")}`);
  if (r.razaoMaxMin > 1.25) problemas.push("cobertura muito desigual entre as unidades (maior ÷ menor acima de 1,25)");
  return { ok: problemas.length === 0, problemas };
}
