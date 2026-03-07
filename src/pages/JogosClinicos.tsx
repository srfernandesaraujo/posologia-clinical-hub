import { useTranslation } from "react-i18next";
import { Brain, Home, FlaskConical, Search, Crosshair, Award, Link, Building, Lock, Activity, Syringe, Droplet, TrendingUp, Target, Gamepad2, Plus, Sparkles, Shield, Pill, Heart, Filter, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type MouseEvent, useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import RpgTccGame from "@/components/games/RpgTccGame";
import VilaSaudeGame from "@/components/games/VilaSaudeGame";
import LaboratorioInteracoesGame from "@/components/games/LaboratorioInteracoesGame";
import DetetiveHistoricoGame from "@/components/games/DetetiveHistoricoGame";
import ResseccaoOncologicaGame from "@/components/games/ResseccaoOncologicaGame";
import MilionarioFarmaGame from "@/components/games/MilionarioFarmaGame";
import DominoClinicoGame from "@/components/games/DominoClinicoGame";
import CarreiraClinicaGame from "@/components/games/CarreiraClinicaGame";
import PlantaoNoturnoGame from "@/components/games/PlantaoNoturnoGame";
import GestorClearanceGame from "@/components/games/GestorClearanceGame";
import AlertaVermelhoGame from "@/components/games/AlertaVermelhoGame";
import JanelaTerapeuticaGame from "@/components/games/JanelaTerapeuticaGame";
import LabirintoHemogramaGame from "@/components/games/LabirintoHemogramaGame";
import BolsaMetabolicaGame from "@/components/games/BolsaMetabolicaGame";
import InsulinaBirdsGame from "@/components/games/InsulinaBirdsGame";
import AlexKiddHipertensaoGame from "@/components/games/AlexKiddHipertensaoGame";
import PandemicFarmaGame from "@/components/games/PandemicFarmaGame";
import FarmaciaPlantaoGame from "@/components/games/FarmaciaPlantaoGame";
import CodigoAzulGame from "@/components/games/CodigoAzulGame";
import DetetiveToxicologicoGame from "@/components/games/DetetiveToxicologicoGame";
import BatalhaNavalClinicaGame from "@/components/games/BatalhaNavalClinicaGame";
import DynamicAIGame from "@/components/games/DynamicAIGame";
import type { AIGameConfig } from "@/components/games/DynamicAIGame";
import GameHeader, { type GameUpdateType } from "@/components/games/GameHeader";
import GameRanking from "@/components/games/GameRanking";
import CreateGameDialog, { type GeneratedGame } from "@/components/CreateGameDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UpgradeModal } from "@/components/UpgradeModal";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";

/** Maps game page IDs to nativeSystemPrompts slugs */
const gamePromptSlugMap: Record<string, string> = {
  "rpg-tcc": "rpg-tcc",
  "vila-saude": "vila-saude",
  "laboratorio": "laboratorio-interacoes",
  "detetive": "detetive-historico",
  "resseccao": "resseccao-oncologica",
  "milionario": "milionario-farma",
  "domino": "domino-clinico",
  "carreira": "carreira-clinica",
  "plantao": "plantao-noturno",
  "clearance": "gestor-clearance",
  "alerta-vermelho": "alerta-vermelho",
  "janela": "janela-terapeutica",
  "labirinto": "labirinto-hemograma",
  "bolsa": "bolsa-metabolica",
  "insulina-birds": "insulina-birds",
  "alex-kidd-has": "alex-kidd-hipertensao",
  "pandemic-farma": "pandemic-farma",
  "farmacia-plantao": "farmacia-plantao",
  "codigo-azul": "codigo-azul",
  "detetive-toxico": "detetive-toxicologico",
  "batalha-naval": "batalha-naval-clinica",
};

type GameCategory = "all" | "farmacologia" | "investigacao" | "simulacao" | "acao" | "emergencia";

const categoryLabels: { id: GameCategory; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "farmacologia", label: "Farmacologia" },
  { id: "investigacao", label: "Investigação" },
  { id: "simulacao", label: "Simulação" },
  { id: "acao", label: "Ação & Estratégia" },
  { id: "emergencia", label: "Emergência" },
];

const games: Array<{
  id: string;
  title: string;
  description: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  badge: string;
  category: GameCategory;
}> = [
  { id: "rpg-tcc", title: "RPG Clínico — TCC", description: "Combata monstros de distorções cognitivas usando lógica e pensamento racional.", icon: Brain, iconBg: "bg-purple-100", iconColor: "text-purple-600", badge: "7 batalhas", category: "acao" },
  { id: "vila-saude", title: "Vila da Saúde", description: "Construa e melhore uma cidade ao registar que tomou os seus remédios.", icon: Home, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", badge: "6 construções", category: "simulacao" },
  { id: "laboratorio", title: "Laboratório de Interações", description: "Combine medicamentos, alimentos e fitoterápicos para descobrir interações.", icon: FlaskConical, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", badge: "6 substâncias", category: "farmacologia" },
  { id: "detetive", title: "Detetive do Histórico", description: "Organize a sua anamnese farmacoterapêutica passo a passo antes da consulta.", icon: Search, iconBg: "bg-stone-100", iconColor: "text-stone-600", badge: "4 pistas", category: "investigacao" },
  { id: "resseccao", title: "Ressecção Oncológica", description: "Elimine células tumorais aplicando terapia alvo neste puzzle Resta 1.", icon: Crosshair, iconBg: "bg-rose-100", iconColor: "text-rose-600", badge: "Puzzle", category: "acao" },
  { id: "milionario", title: "Milionário da Farmacologia", description: "Responda perguntas de farmacologia clínica e suba na carreira hospitalar.", icon: Award, iconBg: "bg-yellow-100", iconColor: "text-yellow-600", badge: "5 níveis", category: "farmacologia" },
  { id: "domino", title: "Dominó Clínico", description: "Conecte peças de doenças, fármacos e efeitos adversos numa cascata prescritiva.", icon: Link, iconBg: "bg-stone-100", iconColor: "text-stone-600", badge: "7 peças", category: "farmacologia" },
  { id: "carreira", title: "Carreira Clínica", description: "Gerencie um consultório num tabuleiro estilo Banco Imobiliário.", icon: Building, iconBg: "bg-amber-100", iconColor: "text-amber-600", badge: "16 casas", category: "simulacao" },
  { id: "plantao", title: "O Plantão Noturno", description: "Escape Room clínico: encontre pistas e salve o paciente antes do tempo acabar.", icon: Lock, iconBg: "bg-zinc-200", iconColor: "text-zinc-700", badge: "Escape Room", category: "emergencia" },
  { id: "clearance", title: "Gestor de Clearance", description: "Ajuste doses de Vancomicina monitorizando a função renal do paciente.", icon: Activity, iconBg: "bg-teal-100", iconColor: "text-teal-600", badge: "7 dias", category: "farmacologia" },
  { id: "alerta-vermelho", title: "Alerta Vermelho", description: "Investigue qual medicamento causa os sintomas do paciente.", icon: Syringe, iconBg: "bg-red-100", iconColor: "text-red-600", badge: "Investigação", category: "investigacao" },
  { id: "janela", title: "A Janela Terapêutica", description: "Ajuste a dose de Varfarina para manter o INR na zona segura.", icon: Activity, iconBg: "bg-blue-100", iconColor: "text-blue-600", badge: "10 dias", category: "farmacologia" },
  { id: "labirinto", title: "Labirinto do Hemograma", description: "Navegue pela árvore de decisão para diagnosticar o tipo de anemia.", icon: Droplet, iconBg: "bg-red-100", iconColor: "text-red-600", badge: "3 passos", category: "investigacao" },
  { id: "bolsa", title: "Bolsa de Valores Metabólica", description: "Transforme exames laboratoriais em ações de saúde estilo trading.", icon: TrendingUp, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", badge: "Portfólio", category: "simulacao" },
  { id: "insulina-birds", title: "Insulina Birds", description: "Lance insulinas contra alvos glicêmicos estilo Angry Birds e controle o diabetes!", icon: Target, iconBg: "bg-sky-100", iconColor: "text-sky-600", badge: "5 fases", category: "acao" },
  { id: "alex-kidd-has", title: "Alex Kidd Anti-Hipertensivo", description: "Plataformer retro: colete anti-hipertensivos corretos e desvie de efeitos adversos!", icon: Gamepad2, iconBg: "bg-cyan-100", iconColor: "text-cyan-600", badge: "5 fases", category: "acao" },
  { id: "pandemic-farma", title: "Pandemic Farma", description: "Tower Defense: posicione antibióticos para deter ondas de bactérias resistentes.", icon: Shield, iconBg: "bg-red-100", iconColor: "text-red-600", badge: "Tower Defense", category: "acao" },
  { id: "farmacia-plantao", title: "Farmácia de Plantão", description: "Triagem de prescrições sob pressão: verifique doses, interações e oriente pacientes.", icon: Pill, iconBg: "bg-orange-100", iconColor: "text-orange-600", badge: "Gestão/Tempo", category: "simulacao" },
  { id: "codigo-azul", title: "Código Azul", description: "Simulador ACLS: lidere uma parada cardiorrespiratória com timer real.", icon: Heart, iconBg: "bg-red-100", iconColor: "text-red-600", badge: "ACLS", category: "emergencia" },
  { id: "detetive-toxico", title: "Detetive Toxicológico", description: "Investigue intoxicações: identifique toxidromes e administre o antídoto correto.", icon: Search, iconBg: "bg-amber-100", iconColor: "text-amber-600", badge: "Investigação", category: "investigacao" },
  { id: "batalha-naval", title: "Batalha Naval Clínica", description: "Localize órgãos ocultos no tabuleiro e responda perguntas de fisiopatologia para confirmar o acerto.", icon: Crosshair, iconBg: "bg-sky-100", iconColor: "text-sky-600", badge: "8×8 / 30 tiros", category: "investigacao" },
];

const GAME_VERSION_STORAGE_KEY = "clinical-games-version-map-v1";

const readInitialVersions = () => {
  try {
    const raw = localStorage.getItem(GAME_VERSION_STORAGE_KEY);
    if (!raw) return {} as Record<string, number>;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {} as Record<string, number>;
    return Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) acc[key] = Number(numeric.toFixed(1));
      return acc;
    }, {});
  } catch {
    return {} as Record<string, number>;
  }
};

const gameComponents: Record<string, {
  component: React.FC<{ customData?: any }>;
  title: string;
  subtitle: string;
  howToPlay: string;
  aiPrompt: string;
}> = {
  "rpg-tcc": {
    component: RpgTccGame,
    title: "RPG de Texto Clínico — TCC",
    subtitle: "Combata distorções cognitivas usando pensamento racional.",
    howToPlay: `🎮 RPG Clínico — Terapia Cognitivo-Comportamental

📋 Objetivo: Derrote 7 monstros que representam distorções cognitivas usando pensamento racional.

🕹️ Como jogar:
1. Cada monstro apresenta uma situação distorcida
2. Escolha a resposta mais racional entre as opções
3. Resposta correta: derrota o monstro e ganha 50 XP
4. Resposta errada: perde 20 HP de vida
5. Se o HP chegar a 0, é Game Over

💡 Dica: Identifique qual distorção cognitiva está em jogo (leitura mental, catastrofização, generalização, etc.) e escolha o pensamento mais equilibrado.`,
    aiPrompt: `Gere um array JSON "battles" com 7 novas batalhas de RPG de TCC (Terapia Cognitivo-Comportamental).
Cada batalha deve ter: id (number), monsterName (string criativo), monsterDescription (string - cenário cotidiano com distorção cognitiva entre aspas), options (array de 3 strings - respostas possíveis), correctOptionIndex (0-2).
Distorções a cobrir: leitura mental, catastrofização, generalização excessiva, pensamento "tem que", tudo-ou-nada, personalização, filtro negativo.
Use cenários do dia-a-dia (trabalho, relacionamentos, saúde, estudos). Apenas UMA opção deve ser racional.
Retorne: { "battles": [...] }`,
  },
  "vila-saude": {
    component: VilaSaudeGame,
    title: "Vila da Saúde",
    subtitle: "Tome os seus remédios e construa a sua vila!",
    howToPlay: `🏘️ Vila da Saúde — Adesão Medicamentosa

📋 Objetivo: Tome os seus medicamentos diários e use as moedas ganhas para construir e melhorar a sua vila.

🕹️ Como jogar:
1. Marque cada medicamento como tomado para ganhar moedas
2. Use as moedas para melhorar as construções da vila
3. Cada construção tem 3-4 níveis de evolução
4. Ao atingir o nível máximo, ganha confetes!

💡 Dica: Priorize melhorar as construções mais baratas primeiro para ver progresso rápido.`,
    aiPrompt: `Gere novos dados para o jogo Vila da Saúde com tema de adesão medicamentosa.
Crie: 
- "medications": array de 3 medicamentos com { id (number), name (string - nome real de medicamento), time (string HH:MM), taken (false), reward (number 15-30) }
- "buildings": array de 6 construções com { id (number), name (string), type (string - um de: HeartPulse, TreePine, Home, Dumbbell, Apple, Flame), level (1), maxLevel (3 ou 4), upgradeCost (number 30-100), description (string curta), levelNames (array de strings - nomes criativos para cada nível) }
Use medicamentos diferentes dos originais (ex: Atenolol, Sinvastatina, Levotiroxina, AAS).
Use construções com tema de saúde comunitária diferente.
Retorne: { "medications": [...], "buildings": [...] }`,
  },
  "laboratorio": {
    component: LaboratorioInteracoesGame,
    title: "Laboratório de Interações",
    subtitle: "Descubra interações entre medicamentos, alimentos e fitoterápicos.",
    howToPlay: `🧪 Laboratório de Interações

📋 Objetivo: Descubra todas as interações perigosas combinando substâncias no misturador.

🕹️ Como jogar:
1. Selecione 2 substâncias do inventário
2. Clique em "MISTURAR" para ver o resultado
3. Interações perigosas valem mais pontos
4. Combinações seguras valem 10 pontos
5. Descubra todas as 3 interações perigosas!

💡 Dica: Pense em interações farmacocinéticas (enzimas CYP) e farmacodinâmicas (efeitos aditivos/antagônicos).`,
    aiPrompt: `Gere novos dados para o Laboratório de Interações Medicamentosas.
Crie:
- "items": array de 6 substâncias com { id (string M1-M4, A1, F1), name (string), type ("Pill" ou "Leaf"), category (string), color (string classe Tailwind como "bg-blue-100 text-blue-700") }
- "interactions": objeto onde chaves são "ID1-ID2" (IDs ordenados) e valores são { type ("danger" ou "safe"), title (string), description (string com mecanismo farmacológico), points (number 50-75 para danger, 10 para safe) }
Inclua exatamente 3 interações perigosas reais e documentadas. Use medicamentos e substâncias diferentes dos originais.
Retorne: { "items": [...], "interactions": {...} }`,
  },
  "detetive": {
    component: DetetiveHistoricoGame,
    title: "Detetive do Histórico Clínico",
    subtitle: "Construa o seu dossiê farmacoterapêutico passo a passo.",
    howToPlay: `🔍 Detetive do Histórico Clínico

📋 Objetivo: Complete uma anamnese farmacoterapêutica completa, passo a passo.

🕹️ Como jogar:
1. Responda a cada pergunta sobre o histórico do paciente
2. Para perguntas Sim/Não, detalhe se responder Sim
3. Avance pelas 4 etapas da investigação
4. No final, revise o dossiê completo

💡 Dica: Seja detalhado nas respostas. Um bom histórico farmacoterapêutico é a base de qualquer cuidado farmacêutico.`,
    aiPrompt: `Gere novas perguntas para o Detetive do Histórico Clínico farmacoterapêutico.
Crie "questions": array de 5 perguntas com { id (number), title (string criativo), description (string - pergunta detalhada), type ("text" ou "boolean-text"), icon (string - um de: Search, Pill, Leaf, AlertTriangle, FileText), booleanLabel (string, apenas se type="boolean-text"), textPlaceholder (string exemplo) }
Retorne: { "questions": [...] }`,
  },
  "resseccao": {
    component: ResseccaoOncologicaGame,
    title: "Ressecção Oncológica: Terapia Alvo",
    subtitle: "Elimine todas as células tumorais até restar apenas uma.",
    howToPlay: `🎯 Ressecção Oncológica — Terapia Alvo (Resta 1)

📋 Objetivo: Elimine células tumorais até restar apenas UMA célula saudável no tabuleiro.

🕹️ Como jogar:
1. Clique numa célula tumoral (vermelha) para selecioná-la
2. Clique numa posição vazia (escura) para saltar
3. O salto deve ser sobre outra célula tumoral (ela será eliminada)
4. Apenas saltos horizontais e verticais são permitidos
5. Vence quando restar apenas 1 célula

💡 Dica: Planeje várias jogadas à frente. Comece pelas bordas e trabalhe em direção ao centro.`,
    aiPrompt: `Gere uma nova configuração de tabuleiro para o jogo Resta 1 Oncológico.
Crie "board": array 7x7 onde cada célula é null (fora do tabuleiro), 0 (vazio) ou 1 (célula tumoral).
Retorne: { "board": [[...], ...] }`,
  },
  "milionario": {
    component: MilionarioFarmaGame,
    title: "Milionário da Farmacologia",
    subtitle: "Escolha um contexto clínico e responda 15 perguntas de dificuldade crescente!",
    howToPlay: `💰 Milionário da Farmacologia

📋 Objetivo: Escolha um contexto clínico e responda 15 perguntas de dificuldade crescente.

🕹️ Como jogar:
1. Selecione um contexto clínico na tela inicial
2. Leia a pergunta e selecione uma opção
3. Clique em "Confirmar Decisão Clínica"
4. Ajudas disponíveis (uma vez cada):
   📚 Revisão de Literatura: elimina 2 opções erradas
   📞 Ligar para o Preceptor: dica sobre a resposta
   👥 Reunião Clínica: mostra % de votos

💡 Dica: Use as ajudas nas perguntas mais difíceis.`,
    aiPrompt: `Gere contextos clínicos para o jogo Milionário da Farmacologia.
Crie "contexts": array de contextos clínicos.
Cada contexto: { id (string slug), label (string), icon (string emoji), questions (array de 15 perguntas) }
Cada pergunta: { id (number 1-15), levelName (string), question (string), options (array de 4 strings), correctIndex (0-3), hint (string), audienceVotes (array de 4 numbers que somam ~100) }
Retorne: { "contexts": [...] }`,
  },
  "domino": {
    component: DominoClinicoGame,
    title: "Dominó Clínico",
    subtitle: "Desvende a cascata prescritiva conectando peças clínicas.",
    howToPlay: `🁡 Dominó Clínico — Cascata Prescritiva

📋 Objetivo: Conecte todas as peças do dominó criando uma cascata prescritiva completa.

🕹️ Como jogar:
1. O tabuleiro começa com uma peça (doença → fármaco)
2. Clique numa peça da sua mão para jogá-la
3. A peça deve conectar: lado esquerdo com lado direito

💡 Dica: Observe as pontas abertas do tabuleiro.`,
    aiPrompt: `Gere uma nova cascata prescritiva para o Dominó Clínico.
Crie "tiles": array de 7 peças de dominó com { id (number 1-7), left (string), right (string) }.
Retorne: { "tiles": [...], "diseases": [...], "drugs": [...] }`,
  },
  "carreira": {
    component: CarreiraClinicaGame,
    title: "Carreira Clínica",
    subtitle: "Gerencie as finanças do seu consultório neste tabuleiro clínico.",
    howToPlay: `🏥 Carreira Clínica — Tabuleiro Clínico

📋 Objetivo: Gerencie o seu consultório sem ir à falência.

🕹️ Como jogar:
1. Lance os dados para mover o peão pelo tabuleiro
2. Ao passar pela PARTIDA, recebe $200
3. Compre propriedades e acumule riqueza

💡 Dica: Compre propriedades estrategicamente. Guarde reserva para impostos.`,
    aiPrompt: `Gere um novo tabuleiro para o jogo Carreira Clínica.
Crie "board" e "chestCards".
Retorne: { "board": [...], "chestCards": [...] }`,
  },
  "plantao": {
    component: PlantaoNoturnoGame,
    title: "O Plantão Noturno",
    subtitle: "Encontre pistas, resolva puzzles e salve o paciente a tempo.",
    howToPlay: `🔒 O Plantão Noturno — Escape Room Clínico

📋 Objetivo: Encontre o antídoto antes que o tempo acabe (10 minutos).

🕹️ Como jogar:
1. 📋 Leia o Prontuário
2. 📖 Consulte o Livro
3. 💻 Desbloqueie o Computador
4. 🔐 Abra o Cofre

💡 Dica: O código combina dados do livro de bioquímica.`,
    aiPrompt: `Gere um novo cenário para o Escape Room "O Plantão Noturno".
Retorne: { "prontuario": {...}, "book": {...}, "computerPassword": "...", "computerHint": "...", "safeCode": "...", "safeCodeExplanation": "..." }`,
  },
  "clearance": {
    component: GestorClearanceGame,
    title: "Gestor de Clearance",
    subtitle: "Monitore a função renal e ajuste a dose de Vancomicina em 7 dias.",
    howToPlay: `💉 Gestor de Clearance

📋 Objetivo: Mantenha o paciente vivo por 7 dias ajustando a dose conforme a função renal.

💡 Dica: Quando a TFG cair abaixo de 50, reduza a dose.`,
    aiPrompt: `Gere novos dados para o Gestor de Clearance.
Retorne: { "patientInfo": {...}, "labResults": [...], "doses": [...] }`,
  },
  "alerta-vermelho": {
    component: AlertaVermelhoGame,
    title: "Alerta Vermelho: Investigação Toxicológica",
    subtitle: "Descubra qual medicamento está a causar os sintomas do paciente.",
    howToPlay: `🚨 Alerta Vermelho

📋 Objetivo: Identifique qual medicamento causa os sintomas e prove com exames.

💡 Dica: Procure exames com marcador "ALERTA".`,
    aiPrompt: `Gere um novo caso para o Alerta Vermelho.
Retorne: { "patientInfo": {...}, "currentMeds": [...], "availableTests": [...], "correctMedId": ... }`,
  },
  "janela": {
    component: JanelaTerapeuticaGame,
    title: "A Janela Terapêutica",
    subtitle: "Ajuste a dose diária de Varfarina para manter o INR na zona segura.",
    howToPlay: `📊 A Janela Terapêutica

📋 Objetivo: Mantenha o INR do paciente entre 2.0 e 3.0 durante 10 dias.

💡 Dica: Mantenha ajustes pequenos. A zona verde (2.0-3.0) é o seu alvo.`,
    aiPrompt: `Gere novos parâmetros para A Janela Terapêutica com um fármaco diferente.
Retorne: { "drugName": "...", "parameterName": "...", ... }`,
  },
  "labirinto": {
    component: LabirintoHemogramaGame,
    title: "O Labirinto do Hemograma",
    subtitle: "Navegue pela árvore de decisão e diagnostique a anemia.",
    howToPlay: `🩸 O Labirinto do Hemograma

📋 Objetivo: Navegue pela árvore de decisão diagnóstica e identifique o tipo correto de anemia.

💡 Dica: Siga o algoritmo: Hb baixa → VCM → Exames confirmatórios → Diagnóstico.`,
    aiPrompt: `Gere uma nova árvore de decisão para o Labirinto do Hemograma.
Retorne: { "storyNodes": { "root": {...}, ... } }`,
  },
  "bolsa": {
    component: BolsaMetabolicaGame,
    title: "Bolsa de Valores Metabólica",
    subtitle: "Os seus exames são ações. Melhore os resultados e ganhe dividendos!",
    howToPlay: `📈 Bolsa de Valores Metabólica

📋 Objetivo: Acompanhe os seus biomarcadores como ações na bolsa e ganhe moedas.

💡 Dica: HbA1c e LDL devem BAIXAR. HDL deve SUBIR.`,
    aiPrompt: `Gere novos biomarcadores para a Bolsa de Valores Metabólica.
Retorne: { "biomarkers": [...], "historyData": [...], "targetLines": {...}, "updatedValues": {...} }`,
  },
  "insulina-birds": {
    component: InsulinaBirdsGame,
    title: "Insulina Birds — Angry Birds do Diabetes",
    subtitle: "Lance insulinas e antidiabéticos contra alvos glicêmicos!",
    howToPlay: `💉 Insulina Birds

📋 Objetivo: Destrua os blocos de glicemia alta sem atingir os blocos verdes.

💡 Dica: Use menos projéteis = bônus de pontos!`,
    aiPrompt: `Gere novos níveis para o jogo Insulina Birds.
Retorne: { "levels": [...] }`,
  },
  "alex-kidd-has": {
    component: AlexKiddHipertensaoGame,
    title: "Alex Kidd Anti-Hipertensivo",
    subtitle: "Colete anti-hipertensivos e desvie de efeitos adversos neste plataformer retro!",
    howToPlay: `🎮 Alex Kidd Anti-Hipertensivo

📋 Objetivo: Colete fármacos corretos e desvie de obstáculos.

💡 Dica: Evite AINEs — eles reduzem o efeito dos anti-hipertensivos!`,
    aiPrompt: `Gere novos níveis para Alex Kidd Anti-Hipertensivo.
Retorne: { "levels": [...] }`,
  },
  "pandemic-farma": {
    component: PandemicFarmaGame,
    title: "Pandemic Farma — Tower Defense de Antimicrobianos",
    subtitle: "Posicione antibióticos para deter ondas de bactérias resistentes no hospital.",
    howToPlay: `🛡️ Pandemic Farma — Tower Defense

📋 Objetivo: Proteja os pacientes posicionando antibióticos para eliminar bactérias.

💡 Dica: MRSA exige Vancomicina. KPC exige Polimixina B.`,
    aiPrompt: `Gere novas ondas para o Tower Defense Pandemic Farma.
Retorne: { "waves": [...] }`,
  },
  "farmacia-plantao": {
    component: FarmaciaPlantaoGame,
    title: "Farmácia de Plantão — Triagem em Tempo Real",
    subtitle: "Verifique prescrições, identifique erros e oriente pacientes sob pressão temporal.",
    howToPlay: `💊 Farmácia de Plantão

📋 Objetivo: Analise prescrições sob pressão temporal.

💡 Dica: Preste atenção a interações medicamentosas e doses pediátricas.`,
    aiPrompt: `Gere novos turnos para Farmácia de Plantão.
Retorne: { "shifts": [...] }`,
  },
  "codigo-azul": {
    component: CodigoAzulGame,
    title: "Código Azul — Simulador ACLS",
    subtitle: "Lidere uma parada cardiorrespiratória seguindo o protocolo ACLS.",
    howToPlay: `❤️ Código Azul — Simulador ACLS

📋 Objetivo: Siga o protocolo ACLS e obtenha ROSC.

💡 Dica: Sempre comece com compressões. Sem RCP, nenhuma droga funciona.`,
    aiPrompt: `Gere novos cenários ACLS para o Código Azul.
Retorne: { "scenarios": [...] }`,
  },
  "detetive-toxico": {
    component: DetetiveToxicologicoGame,
    title: "Detetive Toxicológico — Investigação de Intoxicações",
    subtitle: "Investigue intoxicações, identifique toxidromes e administre o antídoto correto.",
    howToPlay: `🔍 Detetive Toxicológico

📋 Objetivo: Investigue pacientes intoxicados e administre o antídoto correto.

💡 Dica: Pupilas são a chave: miose = opioides. Midríase = anticolinérgicos.`,
    aiPrompt: `Gere novos casos para o Detetive Toxicológico.
Retorne: { "cases": [...] }`,
  },
  "batalha-naval": {
    component: BatalhaNavalClinicaGame,
    title: "Batalha Naval Clínica",
    subtitle: "Localize órgãos ocultos e responda perguntas clínicas.",
    howToPlay: `⚓ Batalha Naval Clínica

📋 Objetivo: Encontre os 6 órgãos ocultos no tabuleiro 8×8 e responda perguntas de fisiopatologia/farmacologia para confirmar cada acerto.

🕹️ Como jogar:
1. Clique em uma coordenada para "atirar"
2. Se acertar água → célula azul, sem pergunta
3. Se acertar um órgão → responda a pergunta clínica
4. Resposta correta → acerto confirmado (verde) + 10 pontos
5. Resposta errada → acerto perdido (vermelho)
6. Afunde todos os 6 órgãos antes de gastar os 30 tiros!

💡 Dica: Observe os acertos para deduzir a orientação dos órgãos (horizontal ou vertical) e economize tiros.`,
    aiPrompt: `Gere novas perguntas para a Batalha Naval Clínica, organizadas por órgão.
Órgãos: Coração, Fígado, Rins, Pulmões, Cérebro, Pâncreas.
Para cada órgão, gere 5 perguntas com: question, options (4 alternativas), correctIndex (0-3), explanation, reference.
Retorne: { "questions": { "coracao": [...], "figado": [...], "rins": [...], "pulmoes": [...], "cerebro": [...], "pancreas": [...] } }`,
  },
};

const AI_GAMES_STORAGE_KEY = "clinical-ai-games-v2";

function loadAiGames(): GeneratedGame[] {
  try {
    const raw = localStorage.getItem(AI_GAMES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Filter out old format games (with componentCode instead of gameConfig)
    return parsed.filter((g: any) => g.gameConfig && g.gameConfig.rounds);
  } catch { return []; }
}

export default function JogosClinicos() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isPremium, showUpgrade, upgradeOpen, setUpgradeOpen, upgradeFeature } = useFeatureGating();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [aiData, setAiData] = useState<Record<string, any>>({});
  const [gameVersions, setGameVersions] = useState<Record<string, number>>(readInitialVersions);
  const [sessionScore, setSessionScore] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiGames, setAiGames] = useState<GeneratedGame[]>(loadAiGames);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>("all");

  const lastInteractionRef = useRef(0);
  const active = activeGame ? gameComponents[activeGame] : null;

  const handleOpenGame = useCallback((gameId: string) => {
    if (!isPremium) {
      showUpgrade("Jogos Clínicos são exclusivos do plano Premium");
      return;
    }
    setActiveGame(gameId);
  }, [isPremium, showUpgrade]);

  const getVersion = useCallback((gameId: string) => Number((gameVersions[gameId] ?? 1).toFixed(1)), [gameVersions]);
  const formatVersion = useCallback((value: number) => value.toFixed(1), []);

  useEffect(() => {
    localStorage.setItem(GAME_VERSION_STORAGE_KEY, JSON.stringify(gameVersions));
  }, [gameVersions]);

  const awardGamePoints = useCallback(async (gameId: string, points: number, reason: string) => {
    if (!user) return;
    setSessionScore((prev) => prev + points);
    const { error } = await supabase.from("student_points").insert({
      user_id: user.id,
      source: `game:${gameId}`,
      points,
      simulator_slug: gameId,
      source_id: reason,
    });
    if (error) console.error("Pontuação não registrada:", error.message);
  }, [user]);

  useEffect(() => {
    if (!activeGame) return;
    setSessionScore(0);
    lastInteractionRef.current = 0;
    void awardGamePoints(activeGame, 10, `start-${Date.now()}`);
  }, [activeGame, awardGamePoints]);

  const handleGameInteraction = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!activeGame) return;
    const target = event.target as HTMLElement;
    if (!target.closest("button")) return;
    const now = Date.now();
    if (now - lastInteractionRef.current < 2500) return;
    lastInteractionRef.current = now;
    void awardGamePoints(activeGame, 3, `interaction-${now}`);
  }, [activeGame, awardGamePoints]);

  const handleAiUpdate = useCallback((data: any, updateType: GameUpdateType) => {
    if (!activeGame) return;
    setAiData((prev) => ({ ...prev, [activeGame]: data }));
    setGameVersions((prev) => {
      const current = prev[activeGame] ?? 1;
      const next = updateType === "major"
        ? Math.floor(current) + 1
        : Number((current + 0.1).toFixed(1));
      return { ...prev, [activeGame]: next };
    });
    void awardGamePoints(activeGame, updateType === "major" ? 30 : 10, `ai-update-${Date.now()}`);
  }, [activeGame, awardGamePoints]);

  const handleGameCreated = useCallback((game: GeneratedGame) => {
    setAiGames((prev) => {
      const next = [...prev, game];
      localStorage.setItem(AI_GAMES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    toast.success(`Jogo "${game.title}" adicionado à coleção!`);
  }, []);

  const handleDeleteAiGame = useCallback((gameId: string) => {
    setAiGames((prev) => {
      const next = prev.filter((g) => g.id !== gameId);
      localStorage.setItem(AI_GAMES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    toast.success("Jogo removido da coleção.");
  }, []);

  // Check if activeGame is an AI-generated game
  const activeAiGame = aiGames.find((g) => g.id === activeGame);

  // ── AI GAME VIEW (now playable!) ──
  if (activeAiGame && activeGame) {
    return (
      <div className="max-w-3xl">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => setActiveGame(null)}>
          ← Voltar aos jogos
        </Button>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{activeAiGame.title}</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">Criado com IA</Badge>
          </div>
          <p className="text-muted-foreground">{activeAiGame.description}</p>
        </div>

        <div onClickCapture={handleGameInteraction}>
          <DynamicAIGame config={activeAiGame.gameConfig} />
        </div>

        <GameRanking gameId={activeGame} currentScore={sessionScore} />
      </div>
    );
  }

  // ── BUILT-IN GAME VIEW ──
  if (active && activeGame) {
    const GameComponent = active.component;
    const customData = aiData[activeGame] || undefined;
    const versionLabel = formatVersion(getVersion(activeGame));

    return (
      <div className="max-w-3xl">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => setActiveGame(null)}>
          ← Voltar aos jogos
        </Button>

        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{active.title}</h1>
            <Badge variant="secondary">v{versionLabel}</Badge>
          </div>
          <p className="text-muted-foreground">{active.subtitle}</p>
          <AdminPromptViewer
            toolSlug={gamePromptSlugMap[activeGame] || activeGame}
            toolName={active.title}
            toolType="game"
            prompt={getNativePrompt(gamePromptSlugMap[activeGame] || activeGame) || ""}
          />
        </div>

        <GameHeader
          howToPlay={active.howToPlay}
          aiPrompt={active.aiPrompt}
          gameId={activeGame}
          versionLabel={versionLabel}
          currentData={customData}
          onAiUpdate={handleAiUpdate}
          showAiFeatures={isAdmin}
        />

        <div onClickCapture={handleGameInteraction}>
          <GameComponent key={JSON.stringify(customData)} customData={customData} />
        </div>

        <GameRanking gameId={activeGame} currentScore={sessionScore} />
      </div>
    );
  }

  // ── GAMES LISTING ──
  const filteredGames = selectedCategory === "all"
    ? games
    : games.filter((g) => g.category === selectedCategory);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("games.title")}</h1>
          <p className="text-muted-foreground text-lg">{t("games.subtitle")}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Criar com IA
          </Button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categoryLabels.map((cat) => {
          const count = cat.id === "all" ? games.length : games.filter(g => g.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* AI games section */}
      {aiGames.length > 0 && (selectedCategory === "all") && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Jogos Criados com IA</h2>
            <Badge variant="secondary" className="text-xs">{aiGames.length}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {aiGames.map((game) => (
              <Card
                key={game.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/40 relative group"
                onClick={() => handleOpenGame(game.id)}
              >
                <CardHeader className="pb-3">
                  <div className="inline-flex rounded-xl bg-primary/10 p-3 mb-2 w-fit">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{game.title}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {game.badge}
                  </span>
                  <Badge variant="secondary" className="text-xs">{game.gameConfig.rounds.length} rodadas</Badge>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAiGame(game.id); }}
                    className="ml-auto text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Remover
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Built-in games by category */}
      {selectedCategory !== "all" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game) => {
            const versionLabel = formatVersion(getVersion(game.id));
            return (
              <Card
                key={game.id}
                className={`cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/40 relative ${!isPremium ? "opacity-75" : ""}`}
                onClick={() => handleOpenGame(game.id)}
              >
                {!isPremium && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge variant="outline" className="gap-1 text-xs bg-background"><Lock className="h-3 w-3" /> Premium</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className={`inline-flex rounded-xl ${game.iconBg} p-3 mb-2 w-fit`}>
                    <game.icon className={`h-6 w-6 ${game.iconColor}`} />
                  </div>
                  <CardTitle className="text-lg">{game.title}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {game.badge}
                  </span>
                  <Badge variant="secondary" className="text-xs">v{versionLabel}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <>
          {/* Group by category when "all" is selected */}
          {categoryLabels.filter(c => c.id !== "all").map((cat) => {
            const catGames = games.filter(g => g.category === cat.id);
            if (catGames.length === 0) return null;
            return (
              <div key={cat.id} className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-3">{cat.label}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {catGames.map((game) => {
                    const versionLabel = formatVersion(getVersion(game.id));
                    return (
                      <Card
                        key={game.id}
                        className={`cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/40 relative ${!isPremium ? "opacity-75" : ""}`}
                        onClick={() => handleOpenGame(game.id)}
                      >
                        {!isPremium && (
                          <div className="absolute top-2 right-2 z-10">
                            <Badge variant="outline" className="gap-1 text-xs bg-background"><Lock className="h-3 w-3" /> Premium</Badge>
                          </div>
                        )}
                        <CardHeader className="pb-3">
                          <div className={`inline-flex rounded-xl ${game.iconBg} p-3 mb-2 w-fit`}>
                            <game.icon className={`h-6 w-6 ${game.iconColor}`} />
                          </div>
                          <CardTitle className="text-lg">{game.title}</CardTitle>
                          <CardDescription>{game.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {game.badge}
                          </span>
                          <Badge variant="secondary" className="text-xs">v{versionLabel}</Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Premium lock banner for free users */}
      {!isPremium && (
        <div className="mt-8 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 flex items-center gap-4">
          <Crown className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-lg">Jogos Clínicos — Exclusivo Premium</h3>
            <p className="text-sm text-muted-foreground">Assine o plano Premium para acessar todos os jogos clínicos interativos com feedback formativo e ranking global.</p>
          </div>
          <Button onClick={() => showUpgrade("Jogos Clínicos")} className="shrink-0 gap-2">
            <Crown className="h-4 w-4" />
            Fazer Upgrade
          </Button>
        </div>
      )}

      <CreateGameDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onGameCreated={handleGameCreated}
      />

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        feature={upgradeFeature}
      />
    </div>
  );
}
