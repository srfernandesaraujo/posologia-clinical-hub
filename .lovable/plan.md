

# Simuladores de Odontologia — Plano Estratégico

## Visão Geral

Criar uma nova categoria **"Odontologia"** no catálogo de simuladores, com módulos que exploram recursos visuais SVG interativos (seguindo o padrão da Placa de Petri da Microbiologia). Cada simulador terá visualizações anatômicas renderizadas em SVG inline — arcadas dentárias, dentes em corte, tecidos periodontais, radiografias esquemáticas — onde o aluno interage visualmente e observa consequências das suas escolhas.

---

## Simuladores Propostos (8 módulos)

### 1. Odontograma Interativo e Diagnóstico
- **O que treina**: Registro clínico odontológico padronizado e diagnóstico visual
- **Visual SVG**: Arcada dentária superior e inferior completa (32 dentes). Cada dente é clicável e dividido em 5 faces (vestibular, lingual, mesial, distal, oclusal). O aluno clica para marcar condições: cárie, restauração, ausência, fratura, implante
- **Fluxo modular**:
  - M1: Seleção do paciente (perfil com queixa principal, idade, histórico)
  - M2: Exame clínico visual — arcada SVG interativa onde o aluno marca achados face a face
  - M3: Classificação diagnóstica — sistema cruza os achados e o aluno confirma diagnósticos (ICDAS para cáries, classificação periodontal)
  - M4: Plano de tratamento — priorização de procedimentos baseada nos achados de M2+M3
  - M5: Mini-Relatório

### 2. Anatomia Dental em Corte (Endodontia)
- **O que treina**: Conhecimento da anatomia interna do dente e tomada de decisão endodôntica
- **Visual SVG**: Dente em corte longitudinal mostrando esmalte, dentina, polpa, cemento, ligamento periodontal e osso alveolar. Camadas colorizadas e interativas
- **Fluxo modular**:
  - M1: Seleção do dente e tipo de lesão (cárie profunda, trauma, necrose pulpar)
  - M2: Teste de vitalidade — o aluno escolhe testes (frio, calor, elétrico, percussão) e recebe resultados baseados na lesão de M1. SVG mostra zona afetada
  - M3: Decisão terapêutica — capeamento direto/indireto, pulpotomia ou endodontia. O SVG atualiza mostrando o procedimento escolhido (remoção de polpa, obturação do canal)
  - M4: Obturação e restauração — escolha de material (guta-percha, MTA, resina) com impacto no prognóstico. Visualização SVG do dente restaurado
  - M5: Mini-Relatório

### 3. Periodontograma e Classificação Periodontal
- **O que treina**: Sondagem periodontal, classificação de doença e plano terapêutico
- **Visual SVG**: Dente com tecido gengival, sulco/bolsa, nível ósseo e ligamento. Régua de sondagem animada
- **Fluxo modular**:
  - M1: Seleção do caso clínico (gengivite, periodontite leve/moderada/severa)
  - M2: Sondagem — o aluno clica em 6 sítios por dente na arcada SVG. Uma régua milimetrada desce e mostra a profundidade. Registra sangramento à sondagem (BOP)
  - M3: Classificação — baseada nas profundidades de M2, o sistema pede ao aluno classificar (Estágio I-IV, Grau A-C conforme AAP/EFP 2018). O aluno escolhe e recebe feedback
  - M4: Plano terapêutico — raspagem, cirurgia, antibioticoterapia adjuvante. O SVG mostra o tecido antes/depois do tratamento proposto
  - M5: Mini-Relatório

### 4. Anestesiologia Odontológica
- **O que treina**: Técnicas de bloqueio anestésico e cálculo de dose máxima
- **Visual SVG**: Mandíbula/maxila em vista lateral com nervos (alveolar inferior, mentoniano, infraorbitário, palatino maior). Trajeto da agulha animado
- **Fluxo modular**:
  - M1: Seleção do procedimento e região (exodontia de 38, restauração de 16, etc.)
  - M2: Escolha da técnica — bloqueio do nervo alveolar inferior, infiltrativa, intraligamentar. O SVG destaca o nervo-alvo e mostra o ponto de inserção da agulha com animação
  - M3: Cálculo de dose — peso do paciente, tipo de anestésico (lidocaína 2%, articaína 4%, mepivacaína 3%), com/sem vasoconstritor. Cálculo de dose máxima (mg/kg) e número de tubetes
  - M4: Complicações — cenários de falha anestésica, injeção intravascular, parestesia. O aluno decide a conduta
  - M5: Mini-Relatório

### 5. Classificação de Angle e Cefalometria Simplificada (Ortodontia)
- **O que treina**: Diagnóstico ortodôntico e análise cefalométrica básica
- **Visual SVG**: Crânio em perfil (cefalometria lateral) com pontos cefalométricos (S, N, A, B, Gn, Go) e planos (SN, FH, mandibular). Linhas e ângulos desenhados dinamicamente
- **Fluxo modular**:
  - M1: Seleção do caso — Classe I, II (div 1, div 2) ou III de Angle, com perfil facial
  - M2: Marcação cefalométrica — o aluno clica para posicionar pontos no SVG do crânio. O sistema calcula SNA, SNB, ANB automaticamente
  - M3: Análise — classificação esquelética (I, II ou III), discrepância de modelo, necessidade de extrações. Gráficos de Steiner/Ricketts
  - M4: Plano de tratamento — aparelho fixo, alinhadores, cirurgia ortognática. O SVG mostra projeção do perfil pós-tratamento
  - M5: Mini-Relatório

### 6. Radiografia e Interpretação de Imagens
- **O que treina**: Leitura e interpretação de radiografias odontológicas
- **Visual SVG**: Radiografia panorâmica e periapical esquemáticas em tons de cinza/azul, com estruturas anatômicas (dentes, osso, seio maxilar, canal mandibular) renderizadas como shapes SVG com opacidades variadas
- **Fluxo modular**:
  - M1: Seleção do tipo de exame (periapical, panorâmica, interproximal) e caso clínico
  - M2: Identificação de estruturas — o aluno clica nas estruturas anatômicas no SVG e as nomeia (canal mandibular, forame mentual, seio maxilar, processo estilóide)
  - M3: Identificação de patologias — o aluno marca lesões (radiolúcidas, radiopacas, mistas) e classifica (cisto, granuloma, tumor, cárie, reabsorção)
  - M4: Laudo radiográfico — redação guiada do laudo com campos estruturados. O sistema pontua completude e acurácia
  - M5: Mini-Relatório

### 7. Farmacologia Odontológica e Prescrição
- **O que treina**: Prescrição segura em odontologia (analgésicos, anti-inflamatórios, antibióticos)
- **Visual**: Tabelas comparativas e gauges de risco (sem SVG anatômico — usa Recharts como os simuladores clínicos existentes)
- **Fluxo modular**:
  - M1: Caso clínico — perfil do paciente (gestante, cardiopata, nefropata, criança, idoso) + procedimento realizado
  - M2: Prescrição — o aluno seleciona analgésico, AINE, antibiótico e posologia. O sistema verifica interações e contraindicações baseadas no perfil de M1
  - M3: Análise de risco — gauges de risco renal, hepático, cardiovascular e gástrico. Alertas de dose máxima pediátrica
  - M4: Receituário final — geração do receituário com validação (legislação, DCB, via de administração)
  - M5: Mini-Relatório

### 8. Cirurgia e Exodontia — Classificação de Pell & Gregory
- **O que treina**: Classificação de terceiros molares e planejamento cirúrgico
- **Visual SVG**: Mandíbula com terceiro molar em diferentes posições (mesioangular, vertical, horizontal, distoangular). Relação com ramo mandibular e plano oclusal desenhada dinamicamente
- **Fluxo modular**:
  - M1: Caso clínico — radiografia SVG mostrando o terceiro molar. O aluno identifica a posição (Winter) e classificação (Pell & Gregory: Classe I/II/III, Posição A/B/C)
  - M2: Planejamento — escolha de retalho, osteotomia (sim/não), odontossecção (sim/não). O SVG anima o passo escolhido
  - M3: Complicações — cenários pós-operatórios (alveolite, parestesia, fratura). O aluno decide conduta
  - M4: Protocolo medicamentoso — prescrição pré e pós-operatória vinculada ao perfil do paciente
  - M5: Mini-Relatório

---

## Padrão Visual SVG

Seguindo o exemplo da Placa de Petri (imagem de referência), todos os SVGs serão:
- Renderizados inline como `<svg viewBox="...">` dentro dos cards
- Fundo escuro consistente com o tema da plataforma (background do card)
- Cores sólidas suaves para estruturas anatômicas (tons de bege/creme para dentes, rosa para gengiva, cinza para osso)
- Elementos interativos com `cursor-pointer` e hover states
- Marcadores coloridos (verde/amarelo/vermelho) para classificações como no padrão S/I/R

---

## Arquitetura Técnica

- **8 novos arquivos** em `src/pages/simuladores/odontologia/`
- **Nova categoria** "Odontologia" adicionada ao array `NATIVE_SIMULATORS` em `Simuladores.tsx` com ícone dedicado (pode usar `Stethoscope` ou criar com SVG)
- **8 novas rotas** em `App.tsx`
- **Padrão modular** idêntico às bancadas do laboratório virtual: `completedModules: Set<number>`, `LockedOverlay`, botão de execução por módulo
- **LabReportPanel** reutilizado como M5 em cada simulador
- **Dados estáticos** — todos os casos, classificações e parâmetros são arrays no frontend

---

## Diferencial de Mercado

Nenhuma plataforma edtech oferece simuladores de odontologia com SVGs interativos para odontograma, periodontograma, cefalometria e anatomia endodôntica. Ferramentas existentes (DentalSim, Simodont) são hardwares caros ou softwares de desktop. Ter isso em browser com fluxo modular educativo é um diferencial enorme para cursos de graduação e pós-graduação em odontologia.

