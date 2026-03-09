

# Plano: Privacidade de Casos Clínicos, Descrição e Controle de Autoria

## Problemas Identificados

1. **Sem descrição nos cards**: O card exibe `c.scenario` mas o campo `scenario` não existe nos dados gerados pela IA. Cada simulador usa campos diferentes (`history.mainComplaint`, `infection`, `day1.clinicalDescription`, etc.)
2. **Todos veem todos os casos**: O INSERT em `useSimulatorCases.ts` (linha 47-55) não define `created_by`, então fica `NULL` e a política RLS `created_by IS NULL` trata como caso nativo, visível para todos
3. **AdminCaseActions só aparece para admin**: Linha 35 do componente faz `if (!isAdmin || !caseItem.isAI) return null`, impedindo que o autor (não-admin) edite/exclua seus próprios casos
4. **Compras no Marketplace não protegem cópia**: Se o autor deletar o caso, o comprador perde acesso

## Mudanças

### 1. `src/hooks/useSimulatorCases.ts`
- Adicionar `created_by: (await supabase.auth.getUser()).data.user?.id` no INSERT do `generateCase`
- Gerar um campo `description` a partir dos dados do caso (extrair de `case_data` os campos relevantes) e armazená-lo junto

### 2. `supabase/functions/generate-case/index.ts`
- Adicionar campo `scenario` (breve descrição do caso) em TODOS os prompts dos simuladores, para que o JSON gerado sempre inclua esse campo

### 3. `src/components/AdminCaseActions.tsx`
- Renomear para `CaseActions` (ou manter nome mas alterar lógica)
- Remover restrição `!isAdmin`: mostrar ações para o autor (`caseItem.created_by === user?.id`) OU admin
- Passar `currentUserId` como prop para controlar visibilidade

### 4. Cards dos simuladores (todos os ~52 arquivos que usam `AdminCaseActions`)
- Exibir descrição: usar `c.scenario || c.history?.mainComplaint || c.infection || c.day1?.clinicalDescription || ""` como fallback
- Exibir nome do autor nos cards de casos IA (buscar via profiles)

### 5. Migração SQL — proteger compras
- Criar trigger ou lógica no `purchase-tool` edge function: ao comprar um `caso_clinico`, duplicar o registro em `simulator_cases` com `created_by = buyer_id` e `is_ai_generated = true`, `is_marketplace = false`. Isso garante que o comprador tem sua própria cópia independente
- Atualizar RLS se necessário

### 6. `src/pages/Marketplace.tsx`
- Na seção de casos clínicos, exibir autor via `profileMap`

## Arquivos a editar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useSimulatorCases.ts` | Adicionar `created_by` no insert, buscar perfis de autores |
| `src/components/AdminCaseActions.tsx` | Permitir ações para autor (não apenas admin) |
| `supabase/functions/generate-case/index.ts` | Adicionar `scenario` a todos os prompts |
| `supabase/functions/purchase-tool/index.ts` | Duplicar caso para comprador ao comprar `caso_clinico` |
| ~10 simuladores com dashboard cards | Exibir descrição e autor nos cards |
| Migração SQL | Garantir `created_by` NOT NULL para novos casos |

## Fluxo resultante

1. Usuário gera caso IA → `created_by` = seu ID → só ele vê
2. Publica no Marketplace → `is_marketplace = true` → aparece no Marketplace
3. Outro usuário compra → cópia independente criada com `created_by` do comprador
4. Autor deleta original → cópia do comprador permanece intacta
5. Apenas autor ou admin podem editar/copiar/excluir

