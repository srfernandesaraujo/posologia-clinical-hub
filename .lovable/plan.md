

# Plano: 3 Novos Simuladores Clínicos (SOAP, MAI, Cascata de Prescrição)

## Resumo

Criar 3 simuladores clínicos seguindo exatamente o padrão existente: dashboard com casos nativos + geração IA, tela de simulação interativa, tela de relatório com pontuação, integração com salas virtuais, modo exame e desafios educativos.

---

## 1. Simulador do Método SOAP

**Slug:** `metodo-soap` | **Categoria:** Farmácia Clínica

**Mecânica:** O aluno recebe um caso clínico completo (paciente, história, exames, prescrição) e deve preencher as 4 seções do prontuário SOAP:
- **S (Subjetivo):** Queixas do paciente, história colhida
- **O (Objetivo):** Dados clínicos, exames laboratoriais, sinais vitais
- **A (Avaliação):** Análise farmacoterapêutica, PRMs identificados, diagnóstico
- **P (Plano):** Intervenções propostas, monitoramento, orientações

Cada seção tem um gabarito com palavras-chave/conceitos esperados. Pontuação por seção (0-100%) baseada em checklist de itens obrigatórios. 3 casos nativos com dificuldades Fácil, Médio, Difícil.

**Interface:** 4 `Textarea` em abas (Tabs), com dicas visuais do que é esperado. Relatório compara resposta do aluno com gabarito.

---

## 2. Simulador MAI (Medication Appropriateness Index)

**Slug:** `mai` | **Categoria:** Farmácia Clínica

**Mecânica:** O aluno avalia cada medicamento de uma prescrição usando os 10 critérios do MAI:
1. Indicação, 2. Efetividade, 3. Dose, 4. Direções corretas, 5. Praticidade, 6. Interações medicamentosas, 7. Interações droga-doença, 8. Duplicidade, 9. Duração, 10. Custo-benefício

Cada critério recebe nota: **A** (Apropriado), **B** (Marginalmente apropriado), **C** (Inapropriado). Score total ponderado por medicamento. Gabarito com justificativas. 3 casos nativos.

**Interface:** Card por medicamento, RadioGroup para cada critério (A/B/C), relatório com score MAI total e por fármaco.

---

## 3. Simulador de Cascata de Prescrição

**Slug:** `cascata-prescricao` | **Categoria:** Farmácia Clínica

**Mecânica:** O aluno recebe um paciente com lista de medicamentos em ordem cronológica. Deve identificar quais medicamentos foram prescritos para tratar efeitos adversos de outros (a cascata). Para cada medicamento, o aluno indica: "Início de tratamento" ou "Cascata de prescrição" e, se cascata, identifica o medicamento causador.

Exemplo: AINE → edema → furosemida → hipocalemia → KCl → náusea → metoclopramida...

3 casos nativos com cadeias de 4-8 medicamentos. Pontuação pela identificação correta das cascatas.

**Interface:** Lista cronológica de medicamentos, para cada um: RadioGroup (Original/Cascata) + Select do medicamento causador. Relatório mostra a cadeia correta com setas visuais.

---

## Arquivos a criar (por simulador, padrão idêntico aos existentes)

Para **cada** simulador:

1. **Página do simulador** — `src/pages/simuladores/SimuladorSOAP.tsx`, `SimuladorMAI.tsx`, `SimuladorCascataPrescricao.tsx`
   - Casos nativos (BUILT_IN), interfaces TypeScript, dashboard com cards (NativeCaseCard/AICaseCard), tela de simulação, relatório
   - Hooks: `useSimulatorCases(slug)`, `useVirtualRoomCase(slug)`, `AdminCaseActions`, `ExamBanner`, `ExamFeedbackOverlay`, `AdminPromptViewer`

2. **System prompt para IA** — Adicionar em `src/data/nativeSystemPrompts.ts` as entradas `sim-metodo-soap`, `sim-mai`, `sim-cascata-prescricao`

3. **Desafios educativos** — Adicionar em `src/data/simulatorChallenges.ts` funções `getSOAPChallenges()`, `getMAIChallenges()`, `getCascataPrescricaoChallenges()`

4. **Registro no catálogo** — Adicionar 3 entradas no array `NATIVE_SIMULATORS` em `src/pages/Simuladores.tsx`

5. **Rotas** — Adicionar em `src/App.tsx` as rotas `/simuladores/metodo-soap`, `/simuladores/mai`, `/simuladores/cascata-prescricao` (+ rotas `/sala/simulador/...`)

---

## Estimativa

~6 arquivos novos + edições em 4 arquivos existentes. Implementação em lote seguindo o padrão consolidado do projeto.

