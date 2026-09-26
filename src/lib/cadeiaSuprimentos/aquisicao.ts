/**
 * Motor da etapa AQUISIÇÃO. Três bancadas:
 *  1) Pesquisa de preços: o aluno escolhe quais cotações entram e a estatística (média, mediana, menor) → preço de referência.
 *  2) Julgamento de propostas: classificar/desclassificar; o vencedor é o menor preço entre as classificadas e habilitadas.
 *  3) Parcelamento das entregas: custo total do ano em função do número de entregas (frete × manutenção de estoque × vencimento).
 */

// ── 1) Pesquisa de preços ───────────────────────────────────────────────────────────────────────────────────────────

export interface Cotacao {
  id: string;
  fonte: string;
  valor: number;
  /** Descrição da situação da cotação (ajuda a identificar quem é o valor discrepante). */
  detalhe: string;
}

export type Estatistica = "media" | "mediana" | "menor";

export function estatistica(valores: number[], tipo: Estatistica): number {
  if (valores.length === 0) return 0;
  if (tipo === "menor") return Math.min(...valores);
  if (tipo === "media") return valores.reduce((s, v) => s + v, 0) / valores.length;
  const s = [...valores].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function precoReferencia(cotacoes: Cotacao[], incluidas: string[], tipo: Estatistica) {
  const usadas = cotacoes.filter((c) => incluidas.includes(c.id));
  return { n: usadas.length, valor: estatistica(usadas.map((c) => c.valor), tipo) };
}

// ── 2) Julgamento de propostas ──────────────────────────────────────────────────────────────────────────────────────

export interface Proposta {
  id: string;
  fornecedor: string;
  precoUnit: number;
  /** Validade que o lote terá na entrega, em meses. */
  validadeMeses: number;
  prazoEntregaDias: number;
  /** AFE/licença sanitária, registro do produto e certificado de boas práticas em dia. */
  documentacaoOk: boolean;
  /** O que há de errado na documentação, quando há. */
  pendencia?: string;
}

export interface EditalRequisitos {
  validadeMinimaMeses: number;
  prazoMaximoEntregaDias: number;
}

/** Motivos objetivos para desclassificar/inabilitar uma proposta (o que o pregoeiro deve apontar). */
export function motivosDesclassificacao(p: Proposta, ed: EditalRequisitos): string[] {
  const m: string[] = [];
  if (!p.documentacaoOk) m.push(p.pendencia ?? "documentação sanitária irregular");
  if (p.validadeMeses < ed.validadeMinimaMeses) m.push(`validade de ${p.validadeMeses} meses (mínimo do edital: ${ed.validadeMinimaMeses})`);
  if (p.prazoEntregaDias > ed.prazoMaximoEntregaDias) m.push(`prazo de ${p.prazoEntregaDias} dias (máximo do edital: ${ed.prazoMaximoEntregaDias})`);
  return m;
}

/** Vencedor pelo menor preço entre as propostas que o aluno manteve classificadas. */
export function vencedor(propostas: Proposta[], classificadas: string[]): Proposta | null {
  const c = propostas.filter((p) => classificadas.includes(p.id));
  if (!c.length) return null;
  return c.reduce((a, b) => (b.precoUnit < a.precoUnit ? b : a));
}

// ── 3) Parcelamento das entregas ────────────────────────────────────────────────────────────────────────────────────

export interface ParcelamentoCaso {
  /** Quantidade anual registrada/contratada. */
  quantidadeAnual: number;
  precoUnit: number;
  freteEntrega: number;
  /** Custo mensal de manter estoque (fração do valor imobilizado ao mês). */
  taxaManutencaoMes: number;
  validadeMeses: number;
  /** Estoque de segurança mantido em cada entrega, em meses de consumo. */
  mesesSeguranca: number;
  /** Capacidade da câmara/área de armazenamento, em unidades. */
  capacidade: number;
}

export interface ParcelamentoResultado {
  n: number;
  intervaloMeses: number;
  compra: number;
  frete: number;
  manutencao: number;
  vencimento: number;
  total: number;
  estoqueMedioUnid: number;
  picoUnid: number;
  perdaUnid: number;
  excedeCapacidade: boolean;
}

export function custoParcelamento(c: ParcelamentoCaso, n: number): ParcelamentoResultado {
  const intervalo = 12 / n;
  const cmm = c.quantidadeAnual / 12;
  const parcela = c.quantidadeAnual / n;
  const es = cmm * c.mesesSeguranca;
  const estoqueMedio = parcela / 2 + es;
  // Cada parcela dura `intervalo` meses; o que ficar além da validade do lote vence antes de ser usado.
  const perdaFrac = intervalo > c.validadeMeses ? (intervalo - c.validadeMeses) / intervalo : 0;
  const perdaUnid = parcela * perdaFrac * n;
  const compra = c.quantidadeAnual * c.precoUnit;
  const frete = c.freteEntrega * n;
  const manutencao = estoqueMedio * c.precoUnit * c.taxaManutencaoMes * 12;
  const vencimento = perdaUnid * c.precoUnit;
  return { n, intervaloMeses: intervalo, compra, frete, manutencao, vencimento, total: compra + frete + manutencao + vencimento, estoqueMedioUnid: estoqueMedio, picoUnid: parcela + es, perdaUnid, excedeCapacidade: parcela + es > c.capacidade };
}

export const OPCOES_ENTREGAS = [1, 2, 3, 4, 6, 12];

/** Menor custo total entre as opções que cabem na capacidade de armazenamento. */
export function melhorParcelamento(c: ParcelamentoCaso): ParcelamentoResultado {
  const viaveis = OPCOES_ENTREGAS.map((n) => custoParcelamento(c, n)).filter((r) => !r.excedeCapacidade);
  const base = viaveis.length ? viaveis : OPCOES_ENTREGAS.map((n) => custoParcelamento(c, n));
  return base.reduce((a, b) => (b.total < a.total ? b : a));
}
