/**
 * Skills do criador de simuladores (generate-tool).
 *
 * Uma "skill" é um playbook por TIPO de simulador (revisão de prescrição, TDM, stewardship, gestão da cadeia de suprimentos,
 * bomba de infusão, dispensação...). O criador escolhe 1 a 3 skills para o pedido do usuário (roteador por IA, com
 * fallback por palavras-chave) e injeta só os playbooks escolhidos no prompt, em vez de um prompt único genérico que
 * tenta servir a todos os tipos. Cada playbook diz como estruturar as etapas, quais painéis usar, quais regras do domínio
 * são inegociáveis, o que calcular antes de escrever e quais distratores são plausíveis.
 */

export interface ExigenciaPaineis {
  /** Pelo menos UM destes tipos de painel precisa existir em algum lugar do simulador. */
  tipos: string[];
  mensagem: string;
}

export interface SimulatorSkill {
  id: string;
  nome: string;
  /** Uma frase: quando escolher esta skill. É o que o roteador lê. */
  quandoUsar: string;
  palavrasChave: string[];
  /** Deve ser uma das categorias aceitas por generate-tool. */
  categoriaSugerida: string;
  dificuldadePadrao?: "Fácil" | "Médio" | "Difícil";
  /** Faixa recomendada de etapas (respeitando o limite global). */
  etapas: [number, number];
  exige?: ExigenciaPaineis[];
  /** Texto injetado no prompt quando a skill é escolhida. */
  playbook: string;
}
