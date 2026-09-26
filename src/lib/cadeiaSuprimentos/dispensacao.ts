/**
 * Motor da etapa DISPENSAÇÃO (balcão da farmácia da UBS): valida a receita, escolhe o lote (PVPS/FEFO com a
 * validade cobrindo o tratamento) e calcula a quantidade. Datas em ISO (AAAA-MM-DD).
 */

export type AcaoDispensacao = "dispensar" | "nova-receita" | "contatar-prescritor" | "substituir";
export const ACOES: { id: AcaoDispensacao; label: string }[] = [
  { id: "dispensar", label: "Dispensar" },
  { id: "nova-receita", label: "Não dispensar: orientar retorno ao prescritor para nova receita" },
  { id: "contatar-prescritor", label: "Não dispensar agora: registrar a falta e contatar o prescritor" },
  { id: "substituir", label: "Substituir por outro medicamento disponível na farmácia" },
];

export interface LoteDisp {
  id: string;
  lote: string;
  validade: string;
  saldo: number;
}

export interface ItemReceita {
  id: string;
  nome: string;
  posologia: string;
  dosePorTomada: number;
  vezesDia: number;
  dias: number;
  antimicrobiano?: boolean;
  usoContinuo?: boolean;
  lotes: LoteDisp[];
  /** Situação do estoque que não está nos lotes (ex.: previsão de chegada). */
  observacaoEstoque?: string;
}

export interface DispensacaoCaso {
  hoje: string;
  paciente: string;
  receitaEmitidaEm: string;
  prescritor: string;
  /** Regra local do caso (protocolo municipal). */
  regraLocal: string;
  itens: ItemReceita[];
}

const DIA = 86_400_000;
export const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DIA);
export const addDias = (iso: string, d: number) => new Date(Date.parse(iso) + d * DIA).toISOString().slice(0, 10);
export const fmtData = (iso: string) => iso.split("-").reverse().join("/");

export const quantidadeNecessaria = (i: ItemReceita) => i.dosePorTomada * i.vezesDia * i.dias;
export const diasReceita = (c: DispensacaoCaso) => diasEntre(c.receitaEmitidaEm, c.hoje);
/** Antimicrobianos: receita válida por 10 dias a partir da emissão (RDC 471/2021). */
export const receitaValida = (c: DispensacaoCaso, i: ItemReceita) => !i.antimicrobiano || diasReceita(c) <= 10;
export const loteCobreTratamento = (c: DispensacaoCaso, i: ItemReceita, l: LoteDisp) => l.validade >= addDias(c.hoje, i.dias);
export const estoqueTotal = (i: ItemReceita) => i.lotes.reduce((s, l) => s + l.saldo, 0);

/** Lote correto: o que vence primeiro entre os que têm saldo e cobrem o período de tratamento (FEFO). */
export function loteEsperado(c: DispensacaoCaso, i: ItemReceita): LoteDisp | undefined {
  return [...i.lotes]
    .filter((l) => l.saldo >= quantidadeNecessaria(i) && loteCobreTratamento(c, i, l))
    .sort((a, b) => a.validade.localeCompare(b.validade))[0];
}

export function acaoEsperada(c: DispensacaoCaso, i: ItemReceita): AcaoDispensacao {
  if (!receitaValida(c, i)) return "nova-receita";
  if (estoqueTotal(i) < quantidadeNecessaria(i)) return "contatar-prescritor";
  return "dispensar";
}

export interface DecisaoItem {
  acao?: AcaoDispensacao;
  loteId?: string;
  quantidade?: number;
}

export function avaliarItem(c: DispensacaoCaso, i: ItemReceita, d: DecisaoItem): { correto: boolean; problemas: string[] } {
  const problemas: string[] = [];
  const esperada = acaoEsperada(c, i);
  if (!d.acao) return { correto: false, problemas: ["nenhuma ação escolhida"] };
  if (d.acao !== esperada) problemas.push(`ação incorreta (esperado: ${ACOES.find((a) => a.id === esperada)!.label.toLowerCase()})`);
  if (esperada === "dispensar" && d.acao === "dispensar") {
    const l = loteEsperado(c, i);
    if (d.loteId !== l?.id) problemas.push("lote incorreto (PVPS: o que vence primeiro e ainda cobre o tratamento)");
    if (d.quantidade !== quantidadeNecessaria(i)) problemas.push(`quantidade incorreta (necessário: ${quantidadeNecessaria(i)})`);
  }
  return { correto: problemas.length === 0, problemas };
}
