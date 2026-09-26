/**
 * Avaliação por critérios objetivos do motor. Serve a duas coisas:
 *  - resumir a decisão do aluno (lista de verificações) no envio do resultado à Sala Virtual/Análises;
 *  - validar os casos gerados por IA, que não têm desafios escritos à mão: o "desafio automático" passa quando todas as
 *    verificações da etapa estão satisfeitas.
 */
import type { CasoCadeia } from "./casos";
import { ETAPAS } from "./casos";
import { selecaoAtendeCriterios } from "./selecao";
import { programacaoAtendeCriterios } from "./programacao";
import { melhorParcelamento, motivosDesclassificacao, vencedor } from "./aquisicao";
import { distribuicaoAtendeCriterios } from "./distribuicao";
import type { Challenge } from "@/components/simulators/SimulatorChallengeMode";

export interface Verificacao {
  label: string;
  ok: boolean;
  detalhe?: string;
}

export const MAX_PEDIDOS_ANO = 4;

export function avaliarEtapa(caso: CasoCadeia, s: Record<string, any>): Verificacao[] {
  switch (caso.etapa) {
    case "selecao": {
      const sel = caso.selecao!;
      const incluidos: string[] = s.incluidos ?? [];
      const crit = selecaoAtendeCriterios(sel, incluidos);
      const tem = (t: string) => crit.problemas.some((p) => p.includes(t));
      return [
        { label: "Custo dentro do orçamento", ok: !tem("orçamento") },
        { label: "Todas as necessidades da linha de cuidado cobertas", ok: !tem("necessidade") },
        { label: "Sem duplicidade terapêutica", ok: !tem("duplicidade") },
        { label: "Sem item fora da RENAME", ok: !tem("RENAME") },
      ];
    }
    case "programacao":
      return caso.programacao!.itens.flatMap((i) => {
        const e = s.itens?.[i.id];
        if (!e?.resultado) return [{ label: `Programação de ${i.nome}`, ok: false, detalhe: "não configurada" }];
        const crit = programacaoAtendeCriterios(i, e.resultado);
        return [
          { label: `${i.nome}: sem ruptura`, ok: e.resultado.rupturaDias === 0, detalhe: `${e.resultado.rupturaDias} dias` },
          { label: `${i.nome}: sem vencimento nem excesso de capacidade`, ok: e.resultado.perdasUnid === 0 && !e.resultado.excedeCapacidade, detalhe: crit.problemas.join("; ") },
          { label: `${i.nome}: até ${MAX_PEDIDOS_ANO} pedidos no ano`, ok: e.resultado.nPedidos <= MAX_PEDIDOS_ANO, detalhe: `${e.resultado.nPedidos} pedidos` },
        ];
      });
    case "aquisicao": {
      const a = caso.aquisicao!;
      const aptas = a.propostas.filter((p) => motivosDesclassificacao(p, a.edital).length === 0).map((p) => p.id);
      const certo = vencedor(a.propostas, aptas);
      const classificadas: string[] = s.classificadas ?? [];
      const melhor = melhorParcelamento(a.parcelamento);
      return [
        { label: "Propostas fora do edital desclassificadas", ok: classificadas.length === aptas.length && aptas.every((id) => classificadas.includes(id)) },
        { label: "Vencedor: menor preço entre as propostas aptas", ok: !!certo && s.vencedorId === certo.id },
        { label: "Entregas: menor custo entre as opções que cabem na câmara", ok: s.entregas === melhor.n, detalhe: `esperado ${melhor.n} entregas` },
      ];
    }
    case "armazenamento": {
      const av = s.avaliacoes ?? {};
      return caso.armazenamento!.itens.map((i) => ({ label: `Conduta para ${i.nome}`, ok: !!av[i.id]?.correta, detalhe: av[i.id]?.erro }));
    }
    case "distribuicao": {
      const crit = distribuicaoAtendeCriterios(caso.distribuicao!, s.aloc ?? {});
      const tem = (t: string) => crit.problemas.some((p) => p.includes(t));
      return [
        { label: "Distribui no máximo o que a CAF tem", ok: !tem("passa do que") },
        { label: "Nenhuma unidade abaixo do limite de cobertura", ok: !tem("abaixo de") },
        { label: "Nenhuma unidade acima da capacidade", ok: !tem("capacidade") },
        { label: "Cobertura equitativa entre as unidades", ok: !tem("desigual") },
      ];
    }
    case "dispensacao": {
      const av = s.avaliacoes ?? {};
      return caso.dispensacao!.itens.map((i) => ({ label: `Dispensação de ${i.nome}`, ok: !!av[i.id]?.correto, detalhe: (av[i.id]?.problemas ?? []).join("; ") }));
    }
  }
}

/** Desafio automático (casos gerados por IA): passa quando todas as verificações da etapa estão satisfeitas. */
export function desafiosAutomaticos(caso: CasoCadeia): { title: string; description: string; challenges: Challenge[] } {
  const etapa = ETAPAS.find((e) => e.id === caso.etapa)!;
  return {
    title: `Desafio: ${caso.title}`,
    description: `Etapa de ${etapa.label}: configure o simulador até atender a todos os critérios do caso.`,
    challenges: [
      {
        type: "adjust",
        context: "Onde fica cada coisa: use os cartões da bancada abaixo do cenário; os indicadores são recalculados a cada mudança. Este desafio é gerado automaticamente a partir dos critérios do simulador.",
        question: `${caso.scenario}\n\nMexa na bancada de ${etapa.label} até que todos os critérios do caso sejam atendidos. Discutam em grupo antes de fechar a resposta.`,
        targetParams: {},
        validator: (s) => {
          const falhas = avaliarEtapa(caso, s).filter((v) => !v.ok);
          return falhas.length === 0
            ? { correct: true, feedback: "Todos os critérios da etapa foram atendidos." }
            : { correct: false, feedback: `Ainda não atende: ${falhas.map((f) => f.label + (f.detalhe ? ` (${f.detalhe})` : "")).join("; ")}.` };
        },
        explanation: `Os critérios desta etapa (${etapa.label}) são verificados pelo próprio motor do simulador. ${caso.clinicalTip}`,
        reference: caso.references[0],
      },
    ],
  };
}
