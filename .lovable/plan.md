

# Jogo Clinico: "Alex Kidd Anti-Hipertensivo" -- Plataformer do Tratamento da Hipertensao

## Conceito

Um jogo de plataforma side-scroller 2D inspirado em Alex Kidd, onde o jogador controla um farmaceutico clinico que percorre fases coletando anti-hipertensivos corretos e desviando de obstaculos (efeitos adversos, farmacos contraindicados). O tema e o tratamento da hipertensao arterial.

---

## Mecanica do Jogo

### O Personagem
- Um farmaceutico (representado como sprite retangular com emoji/icone) que corre para a direita
- Controles: **Setas do teclado** (esquerda/direita para mover, cima para pular) + **botoes touch** na tela para mobile
- Gravidade e fisica de pulo simples via `requestAnimationFrame`

### As Plataformas
- Plataformas fixas em diferentes alturas (blocos marrons/verdes inspirados no visual retro da imagem)
- Fundo azul liso simulando o estilo visual classico do Alex Kidd
- Chao verde na base

### Os Coletaveis (Farmacos Corretos)
Itens que o jogador deve coletar para ganhar pontos:
| Item | Pontos | Cor |
|------|--------|-----|
| Losartana (BRA) | +100 | Azul |
| Enalapril (IECA) | +100 | Verde |
| Anlodipino (BCC) | +80 | Roxo |
| Hidroclorotiazida (Diuretico) | +80 | Amarelo |

### Os Obstaculos (Efeitos Adversos / Erros)
Itens que o jogador deve EVITAR:
| Obstaculo | Penalidade | Representacao |
|-----------|-----------|---------------|
| AINE (Ibuprofeno) | -150 pontos + dano | Bloco vermelho (interage com anti-hipertensivos) |
| Sal em excesso | -100 pontos | Bloco branco piscante |
| Hipotensao | -200 pontos | Bloco laranja (dose excessiva) |

### Blocos de Pergunta (Estilo "?" do Alex Kidd)
- Blocos especiais amarelos com "?" que, ao serem atingidos por baixo (pulo), revelam uma pergunta de farmacologia
- Resposta correta: +200 pontos e um "escudo" temporario (imunidade 5 segundos)
- Resposta errada: perde 1 vida

### Sistema de Vidas e Pontuacao
- 3 vidas (coracoes)
- Pontuacao acumulada ao longo das 5 fases
- Barra de pressao arterial (Progress): comeca em 180mmHg, deve baixar para < 140mmHg ate o final

---

## Fases (5 niveis)

1. **Monoterapia Inicial** -- Plataformas simples. Coletar Losartana. Desviar de AINE.
2. **Efeito Adverso: Tosse do IECA** -- Blocos de Enalapril estao marcados como "tosse". Deve trocar por BRA.
3. **Crise Hipertensiva** -- Velocidade aumenta. Muitos coletaveis, mas tambem muitos obstaculos.
4. **Combinacao Terapeutica** -- Precisa coletar 2 farmacos diferentes na mesma fase (IECA + Diuretico).
5. **Paciente Complexo** -- Diabetes + HAS. Deve evitar Betabloqueador (mascara hipoglicemia) e coletar IECA.

Ao final de cada fase, um card educativo aparece com a justificativa clinica.

---

## Layout Visual

- **Canvas de jogo**: Area de ~760x420px com fundo azul (estilo retro), plataformas marrons/verdes
- **HUD superior**: Vidas (coracoes), pontuacao, fase atual, pressao arterial (Progress bar)
- **Controles touch**: 3 botoes na parte inferior (esquerda, direita, pular) para mobile
- **Dialog de pergunta**: Quando bate num bloco "?", abre um modal com pergunta e 3 opcoes

---

## Implementacao Tecnica

### Arquivo novo
- `src/components/games/AlexKiddHipertensaoGame.tsx`

### Logica de fisica
- Game loop com `requestAnimationFrame`
- Gravidade constante, velocidade horizontal, detecao de colisao retangulo-retangulo
- Plataformas como array de retangulos com posicao fixa
- Coletaveis e obstaculos posicionados sobre/entre plataformas
- Scroll lateral: o "mundo" move-se para a esquerda conforme o jogador avanca

### Renderizacao
- Uso de `<div>` posicionados absolutamente dentro de um container `relative` (mesmo padrao do InsulinaBirdsGame)
- Blocos com cores solidas e bordas para efeito retro/pixel
- Personagem como div colorida com emoji ou icone Lucide

### Integracao com o ecossistema existente
- Registar no array `games` em `JogosClinicos.tsx` com icone `Gamepad2` do Lucide
- Adicionar entrada em `gameComponents` com `howToPlay`, `aiPrompt`, titulo e subtitulo
- Aceitar prop `customData` para atualizacoes de IA
- Pontuacao automatica via `awardGamePoints` + `GameRanking`
- Versao inicial: v1.0

### Componentes Shadcn utilizados
- `Card` para HUD e info do paciente
- `Badge` para tipo de farmaco e fase
- `Progress` para barra de pressao arterial
- `Dialog` para perguntas dos blocos "?" e telas de vitoria/derrota
- `Button` para controles touch e reiniciar

### Perguntas dos blocos "?"
5 perguntas pre-definidas (1 por fase), exemplo:
- "Qual e a primeira linha no tratamento da HAS segundo as diretrizes?"
- "Por que os IECAs sao preferidos em pacientes diabeticos com HAS?"
- "Qual anti-hipertensivo pode causar tosse seca como efeito adverso?"

### Condicoes de fim
- **Vitoria**: Completar as 5 fases com vidas > 0 e PA < 140mmHg
- **Derrota**: Perder todas as 3 vidas OU PA subir acima de 200mmHg
- **Pontuacao final**: Soma de pontos + bonus por vidas restantes + bonus por PA baixa

### Valor educativo (cards pos-fase)
- Fase 1: "BRAs como Losartana sao primeira linha na HAS, especialmente em pacientes com risco de tosse por IECA"
- Fase 2: "A tosse seca ocorre em 5-20% dos pacientes com IECA. A troca por BRA resolve o problema"
- Fase 3: "Na crise hipertensiva, a reducao deve ser gradual. Quedas abruptas causam hipoperfusao"
- Fase 4: "A combinacao IECA + Diuretico tiaziico e sinergica e recomendada em HAS estagio 2"
- Fase 5: "Em diabeticos hipertensos, IECAs/BRAs protegem os rins (nefroprotetores)"

