/**
 * Motor da etapa SELEÇÃO (Comissão de Farmácia e Terapêutica): o aluno monta o elenco (REMUME) marcando/desmarcando
 * itens e lê o impacto orçamentário, a cobertura das necessidades da linha de cuidado, as duplicidades terapêuticas
 * e os itens fora da RENAME. Os preços são ilustrativos (não são preços de mercado).
 */

export interface SelecaoItem {
  id: string;
  nome: string;
  classe: string;
  /** Necessidade da linha de cuidado que o item atende (ver SelecaoNecessidade.id). */
  necessidade: string;
  rename: boolean;
  /** Já está no elenco atual (vem marcado). */
  emUso: boolean;
  precoUnit: number;
  /** Unidades consumidas por paciente por mês. */
  unidMes: number;
  /** Usuários estimados se o item estiver no elenco. */
  usuarios: number;
  /** Se definido, esses usuários hoje usam o item indicado (o impacto é a diferença de custo, não o custo cheio). */
  migraDe?: string;
  evidencia: string;
  alerta?: string;
}

export interface SelecaoNecessidade {
  id: string;
  label: string;
  pacientes: number;
}

export interface SelecaoCaso {
  orcamentoAnual: number;
  necessidades: SelecaoNecessidade[];
  itens: SelecaoItem[];
}

export interface SelecaoLinha {
  id: string;
  custoMensalPaciente: number;
  usuariosEfetivos: number;
  custoAnual: number;
  /** Para itens solicitados que migram usuários de outro: custo anual da troca (novo − substituído). */
  impactoLiquidoAnual?: number;
}

export interface SelecaoResultado {
  linhas: SelecaoLinha[];
  custoAnualTotal: number;
  usoOrcamentoPct: number;
  saldoOrcamento: number;
  itensForaRename: string[];
  duplicidades: { classe: string; itens: string[] }[];
  cobertura: { id: string; label: string; pacientes: number; coberta: boolean }[];
  pacientesDescobertos: number;
}

export const custoMensalPaciente = (i: SelecaoItem) => i.precoUnit * i.unidMes;

export function computeSelecao(caso: SelecaoCaso, incluidos: string[]): SelecaoResultado {
  const set = new Set(incluidos);
  const itens = caso.itens.filter((i) => set.has(i.id));
  const linhas: SelecaoLinha[] = caso.itens.map((i) => {
    const cm = custoMensalPaciente(i);
    const migrando = caso.itens.filter((o) => set.has(o.id) && o.migraDe === i.id).reduce((s, o) => s + o.usuarios, 0);
    const usuariosEfetivos = set.has(i.id) ? Math.max(0, i.usuarios - migrando) : 0;
    const linha: SelecaoLinha = { id: i.id, custoMensalPaciente: cm, usuariosEfetivos, custoAnual: usuariosEfetivos * cm * 12 };
    if (i.migraDe) {
      const antigo = caso.itens.find((o) => o.id === i.migraDe);
      if (antigo) linha.impactoLiquidoAnual = i.usuarios * 12 * (cm - custoMensalPaciente(antigo));
    }
    return linha;
  });
  const custoAnualTotal = linhas.reduce((s, l) => s + l.custoAnual, 0);

  const porClasse = new Map<string, string[]>();
  for (const i of itens) porClasse.set(i.classe, [...(porClasse.get(i.classe) ?? []), i.nome]);
  const duplicidades = [...porClasse.entries()].filter(([, v]) => v.length > 1).map(([classe, v]) => ({ classe, itens: v }));

  const cobertura = caso.necessidades.map((n) => ({ id: n.id, label: n.label, pacientes: n.pacientes, coberta: itens.some((i) => i.necessidade === n.id) }));
  return {
    linhas,
    custoAnualTotal,
    usoOrcamentoPct: (custoAnualTotal / caso.orcamentoAnual) * 100,
    saldoOrcamento: caso.orcamentoAnual - custoAnualTotal,
    itensForaRename: itens.filter((i) => !i.rename).map((i) => i.nome),
    duplicidades,
    cobertura,
    pacientesDescobertos: cobertura.filter((c) => !c.coberta).reduce((s, c) => s + c.pacientes, 0),
  };
}

/** Critérios objetivos de um elenco aceitável: cabe no orçamento, cobre todas as necessidades, sem duplicidade nem item fora da RENAME. */
export function selecaoAtendeCriterios(caso: SelecaoCaso, incluidos: string[]): { ok: boolean; problemas: string[] } {
  const r = computeSelecao(caso, incluidos);
  const problemas: string[] = [];
  if (r.custoAnualTotal > caso.orcamentoAnual) problemas.push("o custo anual ultrapassa o orçamento");
  if (r.pacientesDescobertos > 0) problemas.push("há necessidade da linha de cuidado sem nenhum medicamento no elenco");
  if (r.duplicidades.length) problemas.push("há duplicidade terapêutica (mais de um item da mesma classe)");
  if (r.itensForaRename.length) problemas.push("há item fora da RENAME no elenco");
  return { ok: problemas.length === 0, problemas };
}
