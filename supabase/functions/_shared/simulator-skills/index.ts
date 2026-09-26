import type { SimulatorSkill } from "./types.ts";
import { TODAS_AS_SKILLS } from "./skills.ts";
import { CATALOGO_PAINEIS, CATEGORIAS_SIMULADOR, LIMITE_ETAPAS, PADRAO_PEDAGOGICO, REGRAS_GERAIS } from "./base.ts";

export { TODAS_AS_SKILLS, CATEGORIAS_SIMULADOR, LIMITE_ETAPAS };
export type { SimulatorSkill };

export const MAX_SKILLS_POR_PEDIDO = 3;

export const skillPorId = (id: string) => TODAS_AS_SKILLS.find((s) => s.id === id);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Fallback sem IA: pontua as skills pelas palavras-chave que aparecem no pedido. */
export function escolherSkillsPorPalavras(pedido: string): SimulatorSkill[] {
  const texto = norm(pedido);
  const pontos = TODAS_AS_SKILLS.map((s) => ({
    s,
    p: s.palavrasChave.reduce((acc, k) => acc + (texto.includes(norm(k)) ? (k.includes(" ") ? 2 : 1) : 0), 0),
  }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p);
  return pontos.slice(0, MAX_SKILLS_POR_PEDIDO).map((x) => x.s);
}

/** Catálogo que o roteador (IA) lê para escolher as skills. */
export function catalogoParaRoteador(): string {
  return TODAS_AS_SKILLS.map((s) => `- ${s.id}: ${s.quandoUsar}`).join("\n");
}

export const PROMPT_ROTEADOR = `Você é o roteador do criador de simuladores da Posologia. Leia o pedido do usuário e escolha de 1 a ${MAX_SKILLS_POR_PEDIDO} skills (tipos de simulador) que o criador deve carregar, na ordem de importância. Escolha só o que o pedido realmente pede; se o pedido mistura tipos (ex.: um ciclo de gestão que termina em dispensação), escolha as duas. Se nenhuma se encaixa bem, escolha a mais próxima e explique.
Devolva também: o número de etapas ideal (${LIMITE_ETAPAS.min} a ${LIMITE_ETAPAS.max}), a categoria e as 3 a 5 DECISÕES centrais que o aluno vai treinar (frases curtas). O público é estudante de graduação ou profissional recém-formado.

SKILLS DISPONÍVEIS:
${catalogoParaRoteador()}`;

export const FERRAMENTA_ROTEADOR = {
  type: "function" as const,
  function: {
    name: "escolher_skills",
    description: "Escolhe as skills do criador de simuladores para o pedido do usuário",
    parameters: {
      type: "object" as const,
      properties: {
        skills: { type: "array" as const, items: { type: "string" as const, enum: TODAS_AS_SKILLS.map((s) => s.id) }, description: "1 a 3 ids de skills, da mais importante para a menos importante" },
        num_etapas: { type: "number" as const },
        categoria: { type: "string" as const, enum: CATEGORIAS_SIMULADOR },
        decisoes_centrais: { type: "array" as const, items: { type: "string" as const } },
        justificativa: { type: "string" as const },
      },
      required: ["skills", "num_etapas", "categoria", "decisoes_centrais"] as const,
      additionalProperties: false as const,
    },
  },
};

export interface EscolhaDeSkills {
  skills: SimulatorSkill[];
  numEtapas: number;
  categoria: string;
  decisoes: string[];
  justificativa?: string;
  origem: "ia" | "palavras-chave" | "padrao";
}

/** Valida/normaliza o retorno do roteador e completa com o fallback quando algo vier vazio ou inválido. */
export function normalizarEscolha(bruto: any, pedido: string): EscolhaDeSkills {
  const ids: string[] = Array.isArray(bruto?.skills) ? bruto.skills.filter((x: any) => typeof x === "string") : [];
  let skills = [...new Set(ids)].map(skillPorId).filter((s): s is SimulatorSkill => !!s).slice(0, MAX_SKILLS_POR_PEDIDO);
  let origem: EscolhaDeSkills["origem"] = "ia";
  if (skills.length === 0) {
    skills = escolherSkillsPorPalavras(pedido);
    origem = skills.length ? "palavras-chave" : "padrao";
  }
  if (skills.length === 0) skills = [skillPorId("prm-revisao-prescricao")!];
  const [min, max] = skills[0].etapas;
  const n = Number(bruto?.num_etapas);
  const numEtapas = Number.isFinite(n) ? Math.min(LIMITE_ETAPAS.max, Math.max(LIMITE_ETAPAS.min, Math.round(n))) : Math.round((min + max) / 2);
  const categoria = CATEGORIAS_SIMULADOR.includes(bruto?.categoria) ? bruto.categoria : skills[0].categoriaSugerida;
  const decisoes = Array.isArray(bruto?.decisoes_centrais) ? bruto.decisoes_centrais.filter((d: any) => typeof d === "string" && d.trim()).slice(0, 6) : [];
  return { skills, numEtapas, categoria, decisoes, justificativa: typeof bruto?.justificativa === "string" ? bruto.justificativa : undefined, origem };
}

export const INTRODUCAO_CRIAR = "Você é um especialista em farmácia clínica, assistência farmacêutica e criação de simuladores interativos de alta fidelidade para o ensino em saúde.";

/** Prompt de sistema do gerador: base pedagógica + catálogo de painéis + os playbooks escolhidos. */
export function montarPromptDoGerador(escolha: EscolhaDeSkills, contextoEdicao?: string): string {
  const skills = escolha.skills.map((s) => s.playbook).join("\n\n");
  const decisoes = escolha.decisoes.length ? `DECISÕES CENTRAIS QUE O ALUNO DEVE TREINAR (cada uma vira ao menos uma etapa ou uma pergunta):\n${escolha.decisoes.map((d) => `- ${d}`).join("\n")}\n` : "";
  return [
    INTRODUCAO_CRIAR,
    contextoEdicao ?? "O usuário quer criar um simulador interativo.",
    `PLANO DESTE PEDIDO: use as skills abaixo (${escolha.skills.map((s) => s.nome).join("; ")}). Número de etapas sugerido: ${escolha.numEtapas}. Categoria sugerida: ${escolha.categoria}.\n${decisoes}`,
    skills,
    CATALOGO_PAINEIS,
    PADRAO_PEDAGOGICO,
    REGRAS_GERAIS(CATEGORIAS_SIMULADOR),
  ].join("\n\n");
}

/** Exigências de painéis das skills escolhidas que o simulador gerado NÃO cumpre. */
export function exigenciasNaoCumpridas(escolha: EscolhaDeSkills, steps: any[]): string[] {
  const tipos = new Set((steps ?? []).flatMap((st: any) => (st?.panels ?? []).map((p: any) => p?.type)));
  const faltas: string[] = [];
  for (const s of escolha.skills) {
    for (const e of s.exige ?? []) if (!e.tipos.some((t) => tipos.has(t))) faltas.push(`${s.nome}: ${e.mensagem}`);
  }
  return faltas;
}

/** Prompt do passo de revisão: o gerador recebe o próprio resultado e a lista de problemas e devolve a versão corrigida. */
export function montarPedidoDeRevisao(problemas: string[]): string {
  return `Revise o simulador que você acabou de criar e corrija TODOS os problemas abaixo, mantendo o tema, o caso e o restante do conteúdo. Se um painel foi removido por ser inválido, recrie-o corretamente. Retorne o simulador COMPLETO corrigido.\n\nPROBLEMAS ENCONTRADOS:\n${problemas.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
}
