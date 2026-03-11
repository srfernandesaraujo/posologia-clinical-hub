

# Plano: Aba "Docking" no Módulo 3 + Interdependência com Módulo 2

## Resumo

Adicionar uma segunda aba "Docking" no Módulo 3 (a versão atual vira aba "Rápido"). A aba Docking terá animação de carregamento com mensagens dinâmicas, métricas expandidas (ΔG, Kd, Score circular), radar ADME-Tox e veredito textual. Quando o usuário selecionar a aba "SMILES" no Módulo 2, a aba "Docking" no Módulo 3 será automaticamente selecionada (e vice-versa: aba "Sliders" → aba "Rápido").

## Arquivos a editar

### 1. `src/pages/LaboratorioVirtual.tsx`
- Adicionar state `designMode: "sliders" | "smiles"` compartilhado entre Módulo 2 e Módulo 3.
- Passar `designMode` / `onDesignModeChange` ao `DrugDesignPanel` e `DockingADMEPanel`.

### 2. `src/components/lab-virtual/DrugDesignPanel.tsx`
- Aceitar `activeTab` / `onTabChange` props para controle externo da aba ativa.
- Propagar mudança de aba para o parent.

### 3. `src/components/lab-virtual/DockingADMEPanel.tsx`
- Refatorar para conter `Tabs` com duas abas:
  - **"Rápido"**: Conteúdo atual (simulação simples com 1.2s delay).
  - **"Docking"**: Nova versão com:
    - Botão largo "Simular Interação Fármaco-Receptor (Docking)"
    - Overlay de carregamento 3s com mensagens rotativas: "Otimizando conformação 3D...", "Calculando energia livre de Gibbs...", "Avaliando interações hidrofóbicas..."
    - Cards de métricas: ΔG (verde se < -8, laranja se ≥ -8), Kd (nM/µM), Score de Afinidade (barra circular 0-100% via SVG)
    - Radar ADME-Tox com eixo "Baixa Toxicidade" (invertido do atual "Toxicidade") — valores conectados aos sliders/Lipinski
    - Caixa de "Veredito do Protótipo" com texto dinâmico baseado em ΔG + violações Lipinski
- Aceitar `activeTab` prop controlada pelo parent (sincronizada com designMode).

## Lógica de interdependência

- Módulo 2 muda para "smiles" → parent seta `designMode = "smiles"` → Módulo 3 muda para aba "docking"
- Módulo 2 muda para "sliders" → parent seta `designMode = "sliders"` → Módulo 3 muda para aba "rapido"
- Usuário pode mudar aba do Módulo 3 manualmente (sem forçar mudança no Módulo 2)

## Detalhes da aba Docking

- **Score circular**: SVG com `stroke-dasharray` / `stroke-dashoffset` para criar progress ring
- **Mensagens de loading**: Array de 3 strings, rotação a cada 1s durante os 3s de simulação
- **Veredito**: Lógica condicional:
  - ΔG < -8 + sem violações Lipinski → "Candidato promissor com boa afinidade e perfil farmacocinético favorável"
  - ΔG < -8 + violações Lipinski → "Excelente afinidade teórica, mas problemas de biodisponibilidade oral. Considere otimizar..."
  - ΔG ≥ -8 + sem violações → "Afinidade moderada. Considere modificações estruturais para melhorar a interação..."
  - ΔG ≥ -8 + violações → "Candidato desfavorável. Baixa afinidade e problemas farmacocinéticos significativos."

