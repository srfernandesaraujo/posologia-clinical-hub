

# Simuladores de Fisioterapia — Plano Estratégico

## Visão Geral

Nova categoria **"Fisioterapia"** no catálogo de simuladores, com 8 módulos focados em visualizações SVG interativas do corpo humano — articulações, músculos, dermátomos, posturas e padrões respiratórios. Cada simulador segue o fluxo modular M1→M5 com `completedModules: Set<number>`, módulos bloqueados, e `LabReportPanel` como M5.

---

## Simuladores Propostos

### 1. Goniometria Articular Interativa
- **Treina**: Medição de amplitude de movimento (ADM) — competência fundamental em fisioterapia
- **SVG**: Articulação (ombro/joelho/quadril/cotovelo) com dois segmentos ósseos e um goniômetro virtual. O aluno arrasta os braços do goniômetro para medir o ângulo
- **Fluxo**:
  - M1: Seleção do paciente (lesão, idade, limitação funcional) e articulação
  - M2: Medição goniométrica — SVG da articulação com goniômetro interativo. O aluno posiciona o eixo, braço fixo e braço móvel, registra ADM ativa e passiva
  - M3: Comparação com valores normais — tabela ADM medida vs referência (AAOS). Classificação do déficit (leve/moderado/grave)
  - M4: Plano terapêutico — seleção de técnicas (alongamento, mobilização, fortalecimento) baseadas no déficit de M3
  - M5: Mini-Relatório

### 2. Avaliação Postural (Simetrógrafo Virtual)
- **Treina**: Análise postural estática nas vistas anterior, posterior e lateral
- **SVG**: Silhueta humana em três vistas com fio de prumo (linha vertical de referência). Pontos anatômicos arrastáveis (tragus, acrômio, EIAS, EIPS, maléolo). Linhas de simetria e desvios desenhados dinamicamente
- **Fluxo**:
  - M1: Seleção do caso (escoliose, hiperlordose, hipercifose, protrusão de cabeça, joelho valgo/varo)
  - M2: Marcação de pontos — o aluno clica nos pontos anatômicos na silhueta SVG. O sistema calcula alinhamentos e desvios automaticamente
  - M3: Diagnóstico postural — classificação dos desvios encontrados, ângulo de Cobb estimado para escoliose, comparação bilateral
  - M4: Programa de correção — seleção de exercícios corretivos (RPG, Pilates, fortalecimento) com justificativa biomecânica
  - M5: Mini-Relatório

### 3. Teste de Força Muscular (Escala de Oxford/MRC)
- **Treina**: Avaliação manual de força muscular — graduação 0 a 5
- **SVG**: Membro (superior/inferior) com grupos musculares destacados. O aluno seleciona o músculo e aplica resistência virtual. Animação mostra contração/ausência de contração
- **Fluxo**:
  - M1: Seleção do caso neurológico (AVC, lesão medular, neuropatia periférica) com nível da lesão
  - M2: Teste muscular — SVG do membro com músculos clicáveis. O aluno testa e gradua cada grupo (0-5). Animação visual da contração esperada vs obtida
  - M3: Mapa de força — diagrama corporal com mapa de calor (verde→vermelho) da força por região. Identificação do padrão (hemiparesia, paraparesia, padrão radicular)
  - M4: Programa de fortalecimento — seleção de exercícios com progressão baseada nos graus de M2
  - M5: Mini-Relatório

### 4. Dermátomos e Avaliação Sensitiva
- **Treina**: Mapeamento de sensibilidade e correlação com nível de lesão neurológica
- **SVG**: Corpo humano completo (anterior e posterior) com dermátomos coloridos (C2-S5). O aluno clica nas regiões para testar sensibilidade (tato, dor, temperatura). Áreas afetadas mudam de cor
- **Fluxo**:
  - M1: Seleção do caso (lesão medular C5, hérnia discal L4-L5, neuropatia diabética, síndrome do túnel do carpo)
  - M2: Exame sensitivo — o aluno clica em regiões do corpo SVG e registra se a sensibilidade está normal, diminuída ou ausente. Codificação por cores
  - M3: Correlação neurológica — o sistema cruza o padrão sensitivo com dermátomos e identifica o nível lesional. O aluno confirma ou corrige
  - M4: Classificação ASIA (para lesões medulares) ou diagnóstico diferencial — nível motor, sensitivo e completude da lesão
  - M5: Mini-Relatório

### 5. Fisioterapia Respiratória — Mecânica Ventilatória
- **Treina**: Técnicas de higiene brônquica e reexpansão pulmonar
- **SVG**: Tórax em corte frontal mostrando pulmões, diafragma, costelas e vias aéreas. Animação de inspiração/expiração com mudança de volume. Áreas de atelectasia/secreção destacadas
- **Fluxo**:
  - M1: Seleção do caso (pós-operatório abdominal, DPOC exacerbada, bronquiectasia, paciente intubado em UTI)
  - M2: Ausculta virtual — o aluno clica em pontos do tórax SVG e ouve/lê descrições dos sons (MV normal, roncos, crepitações, sibilos). Marcação no mapa pulmonar
  - M3: Seleção de técnicas — baseado nos achados de M2, escolher manobras: ELTGOL, huffing, bag squeezing, RPPI, VNI. O SVG anima a técnica escolhida mostrando o efeito mecânico
  - M4: Reavaliação — após as manobras, nova ausculta mostra melhora/piora. Ajuste do plano e parâmetros de ventilação
  - M5: Mini-Relatório

### 6. Eletroterapia e Parâmetros de Corrente
- **Treina**: Programação de equipamentos de eletroestimulação (TENS, FES, corrente russa, interferencial)
- **SVG**: Segmento corporal com posicionamento de eletrodos (ânodo/cátodo). Onda de corrente animada (pulso retangular, senoidal, bifásico). O aluno arrasta os eletrodos para posicionar
- **Fluxo**:
  - M1: Seleção do caso e objetivo (analgesia, fortalecimento muscular, controle de edema, cicatrização)
  - M2: Escolha da corrente — TENS (convencional, acupuntura, burst), FES, corrente russa, interferencial. O SVG mostra a forma de onda
  - M3: Parametrização — sliders para frequência (Hz), largura de pulso (μs), intensidade (mA), tempo ON/OFF, rampa. Gráfico Recharts da onda resultante em tempo real
  - M4: Posicionamento — SVG do segmento com ponto motor/dermátomo. O aluno posiciona eletrodos. O sistema avalia adequação e alerta sobre contraindicações
  - M5: Mini-Relatório

### 7. Testes Ortopédicos Especiais
- **Treina**: Execução e interpretação de testes provocativos para diagnóstico de lesões
- **SVG**: Articulação (ombro/joelho/quadril/tornozelo) com estruturas ligamentares e meniscais. Animação da manobra do teste (ex: gaveta anterior — tíbia desliza sobre fêmur)
- **Fluxo**:
  - M1: Seleção da articulação e queixa principal (instabilidade, dor, bloqueio, estalido)
  - M2: Bateria de testes — lista de testes disponíveis para a articulação. O aluno seleciona, o SVG anima a manobra e mostra o resultado (positivo/negativo) baseado no caso
  - M3: Diagnóstico diferencial — baseado nos testes positivos/negativos, o aluno propõe diagnósticos. O sistema pontua acurácia (ex: Lachman + gaveta anterior + pivot shift = LCA)
  - M4: Conduta fisioterapêutica — programa de reabilitação baseado no diagnóstico de M3 (fases: aguda, subaguda, retorno ao esporte)
  - M5: Mini-Relatório

### 8. Escala de Equilíbrio de Berg e Risco de Queda
- **Treina**: Avaliação funcional de equilíbrio em idosos e pacientes neurológicos
- **SVG**: Figura humana em posições de teste (bipedestação, apoio unipodal, alcance funcional, transferências). Indicador de centro de gravidade (CoG) sobre base de sustentação animado
- **Fluxo**:
  - M1: Seleção do caso (idoso com quedas recorrentes, pós-AVC, Parkinson, vestibular)
  - M2: Aplicação da escala — 14 itens de Berg apresentados sequencialmente. SVG mostra a posição do teste. O aluno pontua 0-4 por item baseado na descrição do desempenho do paciente virtual
  - M3: Resultado e risco — score total, classificação de risco de queda (< 45 = risco elevado), gráfico radar das dimensões avaliadas
  - M4: Programa de treino — seleção de exercícios de equilíbrio com progressão baseada nos itens deficitários de M2
  - M5: Mini-Relatório

---

## Padrão Visual SVG

Seguindo o padrão da Odontologia e Microbiologia:
- SVGs inline com `viewBox` dentro dos cards
- Cores anatômicas: tons de pele/bege para corpo, vermelho para músculos, branco para ossos, amarelo para nervos, azul para veias
- Elementos interativos com `cursor-pointer`, hover com `opacity` e tooltips
- Animações CSS para manobras (rotações, translações de segmentos)
- Marcadores coloridos (verde/amarelo/vermelho) para classificações de força, sensibilidade e risco

---

## Arquitetura Técnica

- **8 novos arquivos** em `src/pages/simuladores/fisioterapia/`
- **Nova categoria** "Fisioterapia" no array `NATIVE_SIMULATORS` em `Simuladores.tsx` com ícone `Accessibility` (lucide-react)
- **8 novas rotas** em `App.tsx` (+ 8 para sala virtual)
- **Padrão modular**: `completedModules: Set<number>`, overlay de bloqueio, botão de execução por módulo
- **LabReportPanel** reutilizado como M5
- **Recharts** para gráficos de onda (eletroterapia), radar (Berg), barras (força muscular)
- **Dados estáticos** — casos, valores de referência AAOS, dermátomos, testes ortopédicos

---

## Arquivos Afetados

- **Novos** (8):
  - `src/pages/simuladores/fisioterapia/SimuladorGoniometria.tsx`
  - `src/pages/simuladores/fisioterapia/SimuladorAvaliacaoPostural.tsx`
  - `src/pages/simuladores/fisioterapia/SimuladorForcaMuscular.tsx`
  - `src/pages/simuladores/fisioterapia/SimuladorDermatomos.tsx`
  - `src/pages/simuladores/fisioterapia/SimuladorRespiratorio.tsx`
  - `src/pages/simuladores/fisioterapia/SimuladorEletroterapia.tsx`
  - `src/pages/simuladores/fisioterapia/SimuladorTestesOrtopedicos.tsx`
  - `src/pages/simuladores/fisioterapia/SimuladorBerg.tsx`
- **Editados** (2):
  - `src/pages/Simuladores.tsx` — nova categoria + 8 entradas
  - `src/App.tsx` — 16 novas rotas

---

## Diferencial de Mercado

Plataformas de fisioterapia existentes (Physiopedia, Kenhub, Complete Anatomy) são enciclopédias ou modelos 3D estáticos. Nenhuma oferece simuladores interativos modulares com SVGs manipuláveis onde o aluno faz a avaliação, recebe dados dependentes das suas escolhas e monta um plano terapêutico. A goniometria interativa, o simetrógrafo virtual e o mapa de dermátomos clicável são funcionalidades inexistentes em qualquer edtech de saúde no mercado.

