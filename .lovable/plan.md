

# Plano: Simuladores de Farmacologia Básica

## Análise de Mercado e Seleção

Após analisar a plataforma e o mercado de simuladores educacionais em farmacologia, selecionei **8 simuladores** que preenchem lacunas significativas — nenhuma plataforma concorrente oferece simulações interativas com gráficos em tempo real para estes tópicos fundamentais.

---

## Simuladores Propostos

### 1. Curva Dose-Resposta e Potência vs Eficácia
- Manipular concentração de agonistas/antagonistas e observar curvas log-dose-resposta em tempo real
- Comparar potência (EC50) e eficácia máxima (Emax) entre fármacos
- Simular agonistas parciais, antagonistas competitivos e não-competitivos (deslocamento da curva)
- **Diferencial**: nenhum concorrente oferece isso interativamente com sliders

### 2. Receptores e Mecanismos de Transdução de Sinal
- Selecionar tipo de receptor (GPCR Gs/Gi/Gq, tirosina quinase, nuclear, ionotrópico)
- Visualizar cascata intracelular (AMPc, IP3/DAG, Ca²⁺, JAK-STAT)
- Aplicar fármacos que bloqueiam etapas específicas e ver o efeito downstream
- **Diferencial**: mapeamento visual de vias de sinalização com interação farmacológica

### 3. Janela Terapêutica e Índice Terapêutico
- Simular doses crescentes e observar curva de efeito terapêutico vs tóxico
- Calcular DL50/DE50 e índice terapêutico
- Comparar fármacos de estreita vs ampla janela (digoxina vs amoxicilina)
- **Diferencial**: visualização prática de conceito crítico para segurança do paciente

### 4. Farmacocinética Comparada (Vias de Administração)
- Comparar perfis Cp×t para IV bolus, IV infusão, IM, SC, oral e sublingual
- Manipular biodisponibilidade, Tmax, Cmax e AUC
- Calcular dose de ataque e dose de manutenção para estado estacionário
- **Diferencial**: comparação lado a lado de vias com animação do perfil plasmático

### 5. Bloqueio Neuromuscular (Placa Motora)
- Simular a junção neuromuscular: liberação de ACh, ligação a receptores nicotínicos
- Aplicar bloqueadores despolarizantes (succinilcolina) vs não-despolarizantes (rocurônio)
- Observar fasciculações, bloqueio fase I/II e reversão com neostigmina/sugammadex
- **Diferencial**: tema de anestesiologia sem equivalente interativo no mercado

### 6. Farmacologia Autonômica Aplicada (Agonistas e Antagonistas)
- Expandir além do SNA existente: aplicar fármacos específicos (atropina, fenilefrina, propranolol, pilocarpina)
- Observar efeitos em órgãos-alvo (coração, vasos, olho, bronquíolos, TGI)
- Cenários clínicos: bradicardia sinusal → atropina, crise hipertensiva → fentolamina
- **Diferencial**: ponte entre fisiologia (SNA existente) e farmacoterapia aplicada

### 7. Tolerância, Dependência e Abstinência
- Simular uso crônico de opioides/benzodiazepínicos/álcool
- Observar downregulation de receptores, tolerância farmacodinâmica
- Timeline de síndrome de abstinência com sinais/sintomas por sistema
- **Diferencial**: tema de alta relevância clínica sem simulador interativo no mercado

### 8. Farmacogenômica e Polimorfismos CYP
- Selecionar genótipo do paciente (metabolizador ultrarrápido, extensivo, intermediário, lento)
- Observar impacto na curva Cp×t de pró-fármacos (codeína→morfina) e fármacos ativos
- Ajustar dose com base no fenótipo metabólico
- **Diferencial**: tema emergente na medicina personalizada, altíssimo valor educacional

---

## Padrão Técnico (idêntico aos existentes)

Cada simulador seguirá a arquitetura consolidada:
- Sliders interativos para variáveis + gráficos Recharts em tempo real
- Casos built-in (3 por simulador) + geração de casos com IA (`useSimulatorCases`)
- Integração com salas virtuais (`useVirtualRoomCase`) e modo exame (`ExamBanner`/`ExamFeedbackOverlay`)
- Desafios clínicos (`SimulatorChallengeMode`)
- Prompt viewer para admin (`AdminPromptViewer`)
- Categoria: **"Farmacologia Básica"** no catálogo de simuladores

---

## Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/simuladores/farmacologia/SimuladorDoseResposta.tsx` |
| Criar | `src/pages/simuladores/farmacologia/SimuladorTransducaoSinal.tsx` |
| Criar | `src/pages/simuladores/farmacologia/SimuladorJanelaTerapeutica.tsx` |
| Criar | `src/pages/simuladores/farmacologia/SimuladorViasAdministracao.tsx` |
| Criar | `src/pages/simuladores/farmacologia/SimuladorBloqueioNeuromuscular.tsx` |
| Criar | `src/pages/simuladores/farmacologia/SimuladorFarmacoAutonomica.tsx` |
| Criar | `src/pages/simuladores/farmacologia/SimuladorToleranciaDependencia.tsx` |
| Criar | `src/pages/simuladores/farmacologia/SimuladorFarmacogenomica.tsx` |
| Editar | `src/pages/Simuladores.tsx` — adicionar 8 entradas na categoria "Farmacologia Básica" |
| Editar | `src/App.tsx` — registrar 8 novas rotas |
| Editar | `src/data/simulatorChallenges.ts` — adicionar desafios para cada simulador |
| Editar | `src/data/nativeSystemPrompts.ts` — adicionar prompts de geração IA para cada simulador |

