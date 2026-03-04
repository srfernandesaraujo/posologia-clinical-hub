

## Plano de Melhoria dos 16 Jogos Clínicos

### Diagnóstico Geral

Após analisar todos os 16 jogos, identifico padrões comuns de simplicidade:

- **Conteúdo limitado**: poucos dados hardcoded, pouca variabilidade entre partidas
- **Ausência de narrativa**: jogos pulam direto para a mecânica sem contextualização
- **Feedback formativo fraco**: respostas certas/erradas sem explicação clínica aprofundada
- **Sem progressão persistente**: nada salva entre sessões, sem desbloqueio de conteúdo
- **Visual básico**: cards e botões padrão, sem animações, sons ou efeitos visuais marcantes
- **Sem multijogador ou competição**: sem desafios entre alunos

### Melhorias Transversais (aplicáveis a todos)

1. **Sistema de Dificuldade Adaptativa** -- cada jogo terá 3 modos (Acadêmico, Clínico, Especialista) que alteram a complexidade dos dados e o tempo/recursos disponíveis.
2. **Narrativa Introdutória** -- tela de briefing com cenário clínico imersivo antes de começar (nome do paciente, história, hospital).
3. **Feedback Formativo Rico** -- ao errar ou acertar, exibir overlay com explicação clínica detalhada, referência bibliográfica e dica para estudo.
4. **Animações e Efeitos Visuais** -- transições suaves, shake em erros, pulse em acertos, confetti em vitória, ícones animados, progress bars com gradiente.
5. **Sistema de Estrelas (1-3)** -- ao final de cada partida, avaliação por estrelas baseada em score, tempo e erros. Salva no localStorage e no ranking global.
6. **Persistência de Progresso** -- salvar melhor score, estrelas e contextos desbloqueados no perfil do aluno via `student_points`.

---

### Melhorias por Jogo

#### 1. RPG Clínico -- TCC (133 linhas)
- **Atual**: 7 batalhas lineares com 3 opções, feedback genérico.
- **Melhorias**: Adicionar **árvore de habilidades** (Empatia, Lógica, Resiliência) que desbloqueiam conforme XP. Cada batalha terá **animação de combate** (barra de HP com transição suave, efeito de dano/cura). Adicionar **itens consumíveis** (Diário de Pensamentos, Escudo da Respiração). Múltiplos **cenários/arcos** (Ansiedade, Depressão, TOC) com 7 batalhas cada.

#### 2. Vila da Saúde (121 linhas)
- **Atual**: 2 medicamentos, 6 construções estáticas, sem persistência.
- **Melhorias**: Expandir para **10+ medicamentos** com horários variados. Adicionar **eventos aleatórios** (epidemia, falta de estoque, campanha de vacinação). **Ciclo dia/noite** visual. **Habitantes** que aparecem conforme a vila evolui. **Missões diárias** com recompensas especiais. Sistema de **conquistas** (7 dias consecutivos, todas construções max).

#### 3. Laboratório de Interações (111 linhas)
- **Atual**: 6 substâncias, 3 interações conhecidas, mix simples.
- **Melhorias**: Expandir para **20+ substâncias** organizadas em prateleiras (Medicamentos, Alimentos, Fitoterápicos, Suplementos). Adicionar **mecanismo de interação** visual (CYP450, proteínas plasmáticas). **Modo Desafio**: receber um paciente polimedicado e identificar TODAS as interações perigosas em tempo limitado. **Enciclopédia** desbloqueável com todas as interações descobertas.

#### 4. Detetive do Histórico (102 linhas)
- **Atual**: 4 perguntas de anamnese, formulário simples.
- **Melhorias**: Transformar em **investigação narrativa**: o jogador recebe um caso clínico complexo e precisa interrogar o paciente (com diálogos ramificados), examinar documentos (prescrições anteriores, exames), e montar o dossiê completo. Adicionar **pistas ocultas** que só aparecem se fizer as perguntas certas. **Timer** pressionando antes da consulta. **Múltiplos pacientes** com perfis diferentes.

#### 5. Ressecção Oncológica (88 linhas)
- **Atual**: Puzzle Resta 1 padrão, sem conteúdo clínico durante o jogo.
- **Melhorias**: Cada **célula tumoral** exibe o nome de um quimioterápico ou mecanismo de ação. Ao eliminar, mostrar flashcard com informação clínica. Adicionar **múltiplos tabuleiros** (Mama, Pulmão, Cólon) com layouts diferentes. **Modo cronometrado** e **modo zen**. Animação de "eliminação celular" ao saltar peças.

#### 6. Milionário da Farmacologia (272 linhas)
- **Já melhorado**: 5 contextos com 15 perguntas cada.
- **Melhorias adicionais**: Adicionar **animações de transição** entre perguntas (spotlight, suspense). **Efeito sonoro** simulado via CSS animations. **Lifeline visual** mais elaborado (plateia com votos animados, telefone com timer). **Modo Duelo**: dois jogadores respondem simultaneamente.

#### 7. Dominó Clínico (96 linhas)
- **Atual**: 7 peças com cascata prescritiva linear.
- **Melhorias**: Expandir para **múltiplas cascatas** (Cardiovascular, Endócrina, Psiquiátrica). Adicionar **peças curinga** e **peças armadilha** (interações medicamentosas graves). **Modo competitivo** contra IA. Ao conectar peça, exibir **tooltip com explicação clínica**. Animação de **encaixe** com efeito satisfatório.

#### 8. Carreira Clínica (274 linhas)
- **Atual**: Banco Imobiliário solo básico com 16 casas.
- **Melhorias**: Adicionar **eventos clínicos** ao cair em casas (quiz rápido para ganhar bônus ou evitar multa). **Oponente IA** com estratégia. **Cartas de especialização** que multiplicam renda em propriedades temáticas. **Gráfico de patrimônio** ao longo do jogo. **10 rodadas** com objetivo final (abrir hospital).

#### 9. O Plantão Noturno -- Escape Room (269 linhas)
- **Atual**: 1 cenário fixo (overdose opioide), 4 objetos interativos.
- **Melhorias**: Criar **3-5 cenários diferentes** (Choque Anafilático, Cetoacidose Diabética, Intoxicação Digitálica). Cada cenário com **10+ objetos** e múltiplos puzzles encadeados. **Mapa visual** do hospital (enfermaria, farmácia, laboratório) com áreas clicáveis. **Sistema de dicas** progressivo (custo em tempo). **Cronômetro visual** com urgência crescente (tela fica vermelha).

#### 10. Gestor de Clearance (143 linhas)
- **Atual**: 7 dias fixos de monitoramento renal, 4 opções de dose.
- **Melhorias**: Adicionar **múltiplos pacientes** com perfis diferentes (idoso, obeso, pediátrico). **Gráfico de farmacocinética** em tempo real mostrando Cmin/Cmax. **Variáveis aleatórias** (febre, desidratação) que alteram o clearance. **Notificações de laboratório** que chegam durante o jogo. **14 dias** de monitoramento.

#### 11. Alerta Vermelho (200 linhas)
- **Atual**: 1 caso fixo (rabdomiólise por estatina), 4 exames.
- **Melhorias**: Criar **banco de 10+ casos** diferentes de RAM (Reação Adversa a Medicamento). Adicionar **algoritmo de Naranjo** interativo para classificar a causalidade. **Árvore de decisão** para conduta (suspender, reduzir, trocar, notificar). **Painel do paciente** com sinais vitais em tempo real.

#### 12. A Janela Terapêutica (105 linhas)
- **Atual**: 10 dias de ajuste de varfarina, gráfico INR.
- **Melhorias**: Adicionar **eventos intercorrentes** (paciente comeu brócolis, tomou antibiótico, esqueceu dose). **Múltiplos fármacos de janela estreita** (Lítio, Digoxina, Fenitoína) como cenários. **Gráfico mais detalhado** com zona terapêutica, subterapêutica e tóxica coloridas. **Exames complementares** opcionais (custos vs informação).

#### 13. Labirinto do Hemograma (136 linhas)
- **Atual**: 3 nós de decisão, único caminho (anemia ferropénica).
- **Melhorias**: Expandir para **árvore completa** com 15+ nós cobrindo anemias microcíticas, normocíticas e macrocíticas. **Visualização de árvore** interativa (não linear). **Múltiplos pacientes** com hemogramas diferentes. **Mini-atlas** de lâminas de sangue periférico como pistas visuais. **Score por eficiência** do caminho diagnóstico.

#### 14. Bolsa de Valores Metabólica (138 linhas)
- **Atual**: 3 biomarcadores fixos, 1 atualização de exame.
- **Melhorias**: Expandir para **8+ biomarcadores** (TFG, TSH, Vitamina D, PCR). Adicionar **decisões de investimento** reais (comprar metformina, vender estatina, investir em exercício físico). **Gráfico de portfólio** com histórico de decisões. **Eventos de mercado** (novo estudo clínico, efeito adverso descoberto). **Múltiplos trimestres** de jogo.

#### 15. Insulina Birds (642 linhas)
- **Já elaborado** com canvas, física e 5 fases.
- **Melhorias**: Adicionar **power-ups** (Bomba de Infusão = dano em área, Monitor CGM = mostrar blocos fracos). **Efeitos de partícula** ao destruir blocos. **Boss fight** no final (Hiperglicemia Refratária). **Classificação por estrelas** em cada fase.

#### 16. Alex Kidd Anti-Hipertensivo (688 linhas)
- **Já elaborado** com canvas e plataformas.
- **Melhorias**: Adicionar **power-ups** (Escudo de Nefroproteção, Velocidade Vasodilatadora). **Inimigos móveis** (Efeitos Adversos que perseguem o jogador). **Chefão** por fase (Crise Hipertensiva). **Cutscenes** entre fases com informação clínica. **Vidas extras** por acertar quiz.

---

### Implementação

Dado o volume (16 jogos), a implementação seria feita em **4 lotes** de 4 jogos cada, priorizando os mais simples (com menor número de linhas) primeiro:

| Lote | Jogos | Prioridade |
|------|-------|-----------|
| 1 | Ressecção Oncológica, Dominó Clínico, Detetive do Histórico, Labirinto do Hemograma | Jogos <140 linhas, mais simples |
| 2 | Janela Terapêutica, Laboratório de Interações, Vila da Saúde, RPG TCC | Jogos 100-140 linhas |
| 3 | Bolsa Metabólica, Gestor de Clearance, Alerta Vermelho, Milionário | Jogos 140-275 linhas |
| 4 | Plantão Noturno, Carreira Clínica, Insulina Birds, Alex Kidd | Jogos >270 linhas, mais complexos |

Cada lote aplicaria as melhorias transversais (dificuldade, narrativa, feedback, estrelas) e as específicas descritas acima.

