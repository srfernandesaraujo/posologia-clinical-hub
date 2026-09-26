/**
 * Motor da etapa PROGRAMAÇÃO do simulador "Gestão da Cadeia de Suprimentos Farmacêuticos".
 *
 * Revisão periódica com mês como unidade de tempo (padrão da programação de medicamentos na CAF):
 *   CMM      = consumo médio mensal (bruto de 12 ou 6 meses, ou corrigido pelos dias de desabastecimento)
 *   ES       = CMM × meses de segurança
 *   S (nível máximo) = CMM × (intervalo entre pedidos + tempo de reposição) + ES
 *   pedido   = S − (estoque atual + saldo em trânsito), feito a cada `intervalo` meses
 * A simulação roda os 12 meses seguintes contra a demanda real (que o aluno não conhece de antemão), consumindo
 * primeiro o lote que vence antes (PVPS/FEFO), descartando lotes vencidos e contando os dias de ruptura.
 */

export type MetodoCMM = "media12" | "media6" | "corrigida12";

export const METODOS_CMM: { id: MetodoCMM; label: string; formula: string }[] = [
  { id: "media12", label: "Média bruta dos últimos 12 meses", formula: "Σ consumo registrado ÷ 12" },
  { id: "media6", label: "Média bruta dos últimos 6 meses", formula: "Σ consumo dos 6 últimos meses ÷ 6" },
  { id: "corrigida12", label: "Média de 12 meses corrigida pelos dias sem estoque", formula: "média de [consumo × 30 ÷ (30 − dias sem estoque)]" },
];

export interface ProgItem {
  id: string;
  nome: string;
  apresentacao: string;
  unidade: string;
  precoUnit: number;
  /** Tempo de reposição (pedido → recebimento), em meses inteiros. */
  trMeses: number;
  /** Validade que os lotes têm ao chegar (em meses). */
  validadeMeses: number;
  estoqueInicial: number;
  /** Meses até vencer o estoque que já existe na CAF. */
  validadeEstoqueInicial: number;
  /** Consumo registrado nos 12 meses anteriores (jan → dez). */
  consumoHist: number[];
  /** Dias sem estoque em cada um desses meses. */
  diasFalta: number[];
  /** Demanda real dos 12 meses seguintes (desconhecida do aluno no momento da programação). */
  demanda: number[];
  /** Capacidade de armazenamento da CAF para o item, em unidades. */
  capacidade?: number;
  nota?: string;
}

export interface ProgParams {
  metodo: MetodoCMM;
  mesesSeguranca: number;
  intervalo: number;
}

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const media = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);

export function calcCMM(item: ProgItem, metodo: MetodoCMM): number {
  if (metodo === "media6") return media(item.consumoHist.slice(-6));
  if (metodo === "corrigida12") {
    return media(item.consumoHist.map((c, i) => {
      const dias = Math.min(item.diasFalta[i] ?? 0, 27);
      return (c * 30) / (30 - dias);
    }));
  }
  return media(item.consumoHist);
}

export interface ProgMes {
  mes: string;
  demanda: number;
  recebido: number;
  pedido: number;
  consumo: number;
  falta: number;
  diasRuptura: number;
  perdas: number;
  estoqueFinal: number;
}

export interface ProgResult {
  cmm: number;
  es: number;
  nivelMax: number;
  meses: ProgMes[];
  rupturaDias: number;
  mesesComRuptura: number;
  perdasUnid: number;
  perdasValor: number;
  estoqueMedioUnid: number;
  estoqueMedioValor: number;
  /** Estoque médio ÷ demanda média real, em meses de cobertura. */
  coberturaMeses: number;
  nPedidos: number;
  nivelServico: number;
  picoEstoque: number;
  excedeCapacidade: boolean;
}

export function simularProgramacao(item: ProgItem, p: ProgParams): ProgResult {
  const cmm = calcCMM(item, p.metodo);
  const es = cmm * p.mesesSeguranca;
  const nivelMax = cmm * (p.intervalo + item.trMeses) + es;

  let lotes: { qty: number; exp: number }[] = item.estoqueInicial > 0 ? [{ qty: item.estoqueInicial, exp: item.validadeEstoqueInicial }] : [];
  const chegadas: { mes: number; qty: number }[] = [];
  const meses: ProgMes[] = [];
  let perdasUnid = 0;
  let nPedidos = 0;
  let somaEstoqueMedio = 0;
  let pico = 0;
  const total = (l: { qty: number }[]) => l.reduce((s, x) => s + x.qty, 0);

  for (let t = 0; t < 12; t++) {
    let recebido = 0;
    for (const c of chegadas.filter((x) => x.mes === t)) {
      lotes.push({ qty: c.qty, exp: t + item.validadeMeses });
      recebido += c.qty;
    }
    let perdas = 0;
    lotes = lotes.filter((l) => {
      if (l.exp <= t) { perdas += l.qty; return false; }
      return true;
    });
    perdasUnid += perdas;

    let pedido = 0;
    if (t % p.intervalo === 0) {
      const posicao = total(lotes) + chegadas.filter((x) => x.mes > t).reduce((s, x) => s + x.qty, 0);
      pedido = Math.max(0, Math.ceil(nivelMax - posicao));
      if (pedido > 0) { chegadas.push({ mes: t + item.trMeses, qty: pedido }); nPedidos++; }
    }

    const inicio = total(lotes);
    pico = Math.max(pico, inicio);
    lotes.sort((a, b) => a.exp - b.exp);
    let restante = item.demanda[t];
    for (const l of lotes) {
      const usa = Math.min(l.qty, restante);
      l.qty -= usa;
      restante -= usa;
    }
    lotes = lotes.filter((l) => l.qty > 0);
    const falta = Math.max(0, restante);
    const fim = total(lotes);
    somaEstoqueMedio += (inicio + fim) / 2;
    meses.push({
      mes: MESES[t],
      demanda: item.demanda[t],
      recebido,
      pedido,
      consumo: item.demanda[t] - falta,
      falta,
      diasRuptura: falta > 0 ? Math.round((30 * falta) / item.demanda[t]) : 0,
      perdas,
      estoqueFinal: fim,
    });
  }

  const demandaTotal = item.demanda.reduce((s, v) => s + v, 0);
  const estoqueMedioUnid = somaEstoqueMedio / 12;
  return {
    cmm,
    es,
    nivelMax,
    meses,
    rupturaDias: meses.reduce((s, m) => s + m.diasRuptura, 0),
    mesesComRuptura: meses.filter((m) => m.diasRuptura > 0).length,
    perdasUnid,
    perdasValor: perdasUnid * item.precoUnit,
    estoqueMedioUnid,
    estoqueMedioValor: estoqueMedioUnid * item.precoUnit,
    coberturaMeses: estoqueMedioUnid / media(item.demanda),
    nPedidos,
    nivelServico: (demandaTotal - meses.reduce((s, m) => s + m.falta, 0)) / demandaTotal,
    picoEstoque: pico,
    excedeCapacidade: item.capacidade !== undefined && pico > item.capacidade,
  };
}

/** Critério objetivo de uma boa programação neste motor (usado nos casos gerados por IA e nos resumos). */
export function programacaoAtendeCriterios(item: ProgItem, r: ProgResult): { ok: boolean; problemas: string[] } {
  const problemas: string[] = [];
  if (r.rupturaDias > 0) problemas.push(`${r.rupturaDias} dias de ruptura em ${r.mesesComRuptura} mês(es)`);
  if (r.perdasUnid > 0) problemas.push(`${Math.round(r.perdasUnid).toLocaleString("pt-BR")} unidades vencidas`);
  if (r.excedeCapacidade) problemas.push("pico de estoque acima da capacidade de armazenamento");
  return { ok: problemas.length === 0, problemas };
}
