

## Plano: Batalha Naval Clínica

### Conceito
Tabuleiro 8x8 representando o corpo humano com "navios" sendo órgãos ocultos (Coração, Fígado, Rins, Pulmões, Cérebro, Pâncreas). Ao atirar em uma coordenada, se acertar um órgão, o jogador deve responder uma pergunta de fisiopatologia/farmacologia daquela região para confirmar o ponto. Errar a pergunta = tiro perdido mesmo tendo acertado o órgão.

### Mecânica
- **Tabuleiro 8x8** com grid visual estilo batalha naval (A1-H8)
- **6 órgãos ocultos** posicionados aleatoriamente (tamanhos 2-4 células cada)
- **Ao acertar um órgão**: abre pergunta clínica contextual (fisiopatologia, tratamento, efeito adverso)
- **Resposta correta**: marca o acerto (célula verde), ganha pontos
- **Resposta errada**: perde o acerto (célula vermelha), feedback formativo com explicação
- **Tiro na água**: célula azul, sem pergunta
- **3 dificuldades**: Acadêmico (conceitos básicos), Clínico (cenários reais), Especialista (casos complexos)
- **Condição de vitória**: afundar todos os 6 órgãos (acertar todas as células + responder corretamente)
- **Limite**: 30 tiros disponíveis (exige estratégia)

### Banco de Perguntas (8-10 por órgão, por dificuldade)
- **Coração**: ICC, arritmias, antiarrítmicos, betabloqueadores, digitálicos
- **Fígado**: metabolismo CYP450, hepatotoxicidade, cirrose, ajuste hepato
- **Rins**: clearance de creatinina, nefrotoxicidade, ajuste renal, diuréticos
- **Pulmões**: asma, DPOC, corticoides inalatórios, broncodilatadores
- **Cérebro**: epilepsia, depressão, BHE, neurotransmissores, antipsicóticos
- **Pâncreas**: diabetes, insulinas, antidiabéticos orais, pancreatite

### Componentes Compartilhados
GameNarrative, GameDifficultySelector, GameFeedbackOverlay, GameStarsResult — padrão da plataforma.

### Entregas
1. Criar `src/components/games/BatalhaNavalClinicaGame.tsx` (~500 linhas)
2. Registrar em `JogosClinicos.tsx` (games array + gameComponents + import)

### Estrutura Técnica

```text
Estado do jogo:
  board[8][8] = { hasOrgan?, organId?, hit?, status: "hidden"|"water"|"hit"|"miss" }
  organs[] = { id, name, icon, cells[], sunk }
  questions[organId][difficulty][] = { question, options[4], correctIndex, explanation, reference }
  
Fluxo por tiro:
  1. Jogador clica célula → revela
  2. Se água → marca azul, próximo tiro
  3. Se órgão → abre GameFeedbackOverlay-style modal com pergunta
  4. Resposta correta → célula verde, pontos, check se órgão afundou
  5. Resposta errada → célula vermelha, explicação formativa, tiro perdido
```

