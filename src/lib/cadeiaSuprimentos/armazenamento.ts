/**
 * Motor da etapa ARMAZENAMENTO: excursão de temperatura na câmara fria da CAF.
 * O registro do data logger sobe a `taxaSubida` °C/h a partir da falha de energia (h = 0), limitado à temperatura
 * ambiente; o aluno escolhe a hora em que os produtos foram transferidos para o refrigerador reserva e define a
 * conduta para cada item. A conduta esperada vem do dado de estabilidade disponível (tolerância declarada pelo
 * fabricante, regra do PNI para imunobiológicos, ou ausência de dado → quarentena e consulta).
 */

export interface ExcursaoCaso {
  tempInicialC: number;
  taxaSubidaCporH: number;
  ambienteC: number;
  /** Hora (desde a falha) em que a energia volta e o resfriamento recomeça. */
  retornoEnergiaH: number;
  taxaResfriamentoCporH: number;
  /** Hora do alarme: cruza o limite superior (8 °C), calculada. */
  limiteSuperiorC: number;
  limiteInferiorC: number;
  /** Primeira hora em que a equipe consegue chegar e transferir. */
  chegadaEquipeH: number;
  itens: ItemTermolabil[];
}

export type DadoEstabilidade =
  | { tipo: "limite"; tempMaxC: number; descricao: string }
  | { tipo: "pni"; descricao: string }
  | { tipo: "semDado"; descricao: string };

export interface ItemTermolabil {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  valorUnit: number;
  dado: DadoEstabilidade;
}

export type Conduta = "liberar" | "quarentena" | "descartar";
export const CONDUTAS: { id: Conduta; label: string }[] = [
  { id: "liberar", label: "Liberar para uso, registrando a ocorrência" },
  { id: "quarentena", label: "Quarentena identificada e consulta ao fabricante/instância responsável" },
  { id: "descartar", label: "Descartar o lote" },
];

export function tempNoTempo(c: ExcursaoCaso, h: number): number {
  if (h <= 0) return c.tempInicialC;
  const pico = Math.min(c.ambienteC, c.tempInicialC + c.taxaSubidaCporH * c.retornoEnergiaH);
  if (h <= c.retornoEnergiaH) return Math.min(c.ambienteC, c.tempInicialC + c.taxaSubidaCporH * h);
  return Math.max(c.tempInicialC, pico - c.taxaResfriamentoCporH * (h - c.retornoEnergiaH));
}

export function serieLogger(c: ExcursaoCaso, ate = 48) {
  const s: { h: number; camara: number }[] = [];
  for (let h = 0; h <= ate; h++) s.push({ h, camara: +tempNoTempo(c, h).toFixed(1) });
  return s;
}

/** Hora em que a temperatura da câmara cruza um limite (durante a subida). */
export const horaCruza = (c: ExcursaoCaso, limiteC: number) => (limiteC - c.tempInicialC) / c.taxaSubidaCporH;

export interface Exposicao {
  transferenciaH: number;
  picoC: number;
  horasAcima8: number;
  horasAcima25: number;
  h8: number;
  h25: number;
}

export function exposicao(c: ExcursaoCaso, transferenciaH: number): Exposicao {
  const fim = Math.min(transferenciaH, c.retornoEnergiaH);
  const h8 = horaCruza(c, c.limiteSuperiorC);
  const h25 = horaCruza(c, 25);
  return {
    transferenciaH,
    picoC: +tempNoTempo(c, fim).toFixed(1),
    horasAcima8: +Math.max(0, fim - h8).toFixed(1),
    horasAcima25: +Math.max(0, fim - h25).toFixed(1),
    h8: +h8.toFixed(2),
    h25: +h25.toFixed(2),
  };
}

export function condutaEsperada(item: ItemTermolabil, e: Exposicao, c: ExcursaoCaso): Conduta {
  if (e.picoC <= c.limiteSuperiorC) return "liberar";
  if (item.dado.tipo === "limite" && e.picoC <= item.dado.tempMaxC) return "liberar";
  return "quarentena";
}

export interface AvaliacaoConduta {
  esperada: Conduta;
  correta: boolean;
  valorItem: number;
  /**
   * "perda-evitavel": descartou sem consultar quem tem o dado de estabilidade; "excesso-de-cautela": reteve o que estava
   * dentro da tolerância declarada; "risco-paciente": liberou o que não tem garantia de estabilidade.
   */
  erro?: "perda-evitavel" | "excesso-de-cautela" | "risco-paciente";
}

export function avaliarConduta(item: ItemTermolabil, e: Exposicao, c: ExcursaoCaso, escolhida: Conduta | undefined): AvaliacaoConduta {
  const esperada = condutaEsperada(item, e, c);
  const valorItem = item.quantidade * item.valorUnit;
  if (!escolhida) return { esperada, correta: false, valorItem };
  const correta = escolhida === esperada;
  let erro: AvaliacaoConduta["erro"];
  if (!correta) erro = escolhida === "descartar" ? "perda-evitavel" : escolhida === "quarentena" ? "excesso-de-cautela" : "risco-paciente";
  return { esperada, correta, valorItem, erro };
}
