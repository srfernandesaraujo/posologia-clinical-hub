
# Jogo Clinico: "Insulina Birds" -- Angry Birds do Diabetes

## Conceito

Um jogo estilo Angry Birds onde o jogador lanca diferentes tipos de insulina (e antidiabeticos orais) contra "alvos glicemicos" -- representados como estruturas empilhadas de blocos de glicose/acucar. O objetivo e atingir a glicemia alvo do paciente sem causar hipoglicemia.

---

## Mecanica do Jogo

### O Estilingue (Slingshot)
- Posicionado a esquerda da tela
- O jogador clica e arrasta para mirar (angulo + forca)
- Ao soltar, o "projetil" (insulina) e lancado em arco (simulando gravidade com `requestAnimationFrame`)

### Os Projeteis (Tipos de Insulina)
Cada "passaro" e um tipo de farmaco com comportamento diferente:

| Farmaco | Comportamento | Cor |
|---------|--------------|-----|
| Insulina Regular | Trajetoria padrao, impacto medio | Azul |
| Insulina NPH | Mais pesada, cai rapido, mas explode em area maior | Verde |
| Insulina Glargina | Lenta, atravessa obstaculos (efeito basal prolongado) | Roxo |
| Metformina | Pequena, mas remove blocos de "resistencia" especiais | Laranja |

O jogador recebe 3-4 projeteis por fase.

### Os Alvos (Estruturas de Glicose)
- Blocos empilhados representando niveis de glicose (visuais como cubos com numeros: 180, 250, 300 mg/dL)
- Blocos vermelhos: Glicemia muito alta (precisam de impacto forte)
- Blocos amarelos: Glicemia moderada
- Blocos verdes: Glicemia alvo (NAO devem ser destruidos -- penalidade por hipoglicemia!)
- Blocos especiais cinzas: "Resistencia insulinica" (so removidos com Metformina)

### Sistema de Pontuacao
- Destruir bloco vermelho: +100 pontos
- Destruir bloco amarelo: +50 pontos
- Destruir bloco verde (hipoglicemia!): -200 pontos (penalidade)
- Bonus: Usar menos projeteis = mais pontos
- Estrelas: 1 a 3 por fase baseado na pontuacao

---

## Fases (5 niveis)

1. **Diabetes Tipo 2 Leve** -- Apenas blocos amarelos, sem resistencia. Introduz a mecanica.
2. **Pos-Prandial Descontrolado** -- Blocos vermelhos altos (glicemia pos-refeicao). Precisa de Insulina Regular.
3. **Resistencia Insulinica** -- Blocos cinzas bloqueiam o caminho. Metformina necessaria primeiro.
4. **Controle Basal Noturno** -- Estrutura larga e baixa. Glargina atravessa para atingir blocos escondidos.
5. **Crise Hiperglicemica** -- Todos os tipos de blocos. O jogador escolhe a sequencia certa de farmacos.

---

## Layout Visual

- **Canvas**: Area de jogo (`relative`, ~800x500px) com fundo em gradiente azul claro (ceu)
- **Chao**: Faixa inferior verde
- **Estilingue**: Esquerda, com icone do farmaco atual
- **Estrutura de blocos**: Centro-direita
- **HUD superior**: Fase atual, pontuacao, projeteis restantes, estrelas
- **Painel lateral**: Info do paciente virtual (nome, HbA1c, perfil glicemico)

---

## Implementacao Tecnica

### Arquivo novo
- `src/components/games/InsulinaBirdsGame.tsx`

### Logica de fisica
- Simulacao de projetil com gravidade usando `requestAnimationFrame`
- Detecao de colisao simples (retangulo vs circulo) entre projetil e blocos
- Blocos com "vida" (HP) -- impactos reduzem HP, bloco some quando HP = 0

### Integracao
- Registar no array `games` em `JogosClinicos.tsx` com icone `Target` do Lucide
- Incluir `GameHeader` com instrucoes e prompt de IA
- Incluir `GameRanking` para ranking persistente
- Pontuar automaticamente ao completar fases (salvar no `student_points`)
- Versao inicial: `v1.0`

### Componentes Shadcn utilizados
- `Card` para HUD e info do paciente
- `Badge` para tipo de farmaco e estrelas
- `Progress` para barra de HbA1c do paciente
- `Dialog` para tela de vitoria/derrota entre fases
- `Button` para controles (reiniciar fase, proxima fase)

### Interacao do jogador
1. Clica e arrasta no estilingue (mousedown/mousemove/mouseup)
2. Linha tracejada mostra trajetoria estimada
3. Solta para lancar
4. Projetil voa, colide com blocos, blocos caem/somem
5. Apos todos os projeteis: calcula pontuacao da fase
6. Dialog com resultado (estrelas ganhas) e opcao de avancar

### Condicoes de fim
- **Vitoria por fase**: Todos os blocos vermelhos e amarelos destruidos
- **Derrota por fase**: Projeteis acabaram e ainda ha blocos vermelhos
- **Vitoria geral**: Completar as 5 fases
- **Penalidade**: Destruir blocos verdes (hipoglicemia) reduz pontuacao severamente

---

## Valor Educativo

Ao final de cada fase, um card explicativo aparece com a justificativa clinica:
- Fase 1: "A Metformina e primeira linha no DM2 leve"
- Fase 2: "Insulina Regular age rapido para controle pos-prandial"
- Fase 3: "A resistencia insulinica exige sensibilizadores antes de aumentar dose"
- Fase 4: "Insulina basal (Glargina) cobre 24h sem picos"
- Fase 5: "O manejo do diabetes requer combinacao racional de farmacos"
