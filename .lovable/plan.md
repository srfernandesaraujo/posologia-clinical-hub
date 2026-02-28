
# Marketplace App Store Style + Sistema de Compras

## Resumo

Redesenhar o Marketplace com estetica inspirada na App Store e implementar um sistema de compra/venda de ferramentas entre usuarios, com cobranca via Stripe InvoiceItems na proxima fatura.

---

## Regras de Negocio

| | Calculadora | Simulador |
|---|---|---|
| Preco para comprador | R$ 5,00 (unico) | R$ 10,00 (unico) |
| Desconto para autor | R$ 3,00 (unico) | R$ 6,00 (unico) |
| Limite de desconto autor | 50% da assinatura mensal (R$ 14,95 max) |

- Compradores precisam ter assinatura Premium ativa
- A cobranca e adicionada como InvoiceItem na proxima fatura do Stripe
- O desconto do autor e aplicado como InvoiceItem negativo (credito) na proxima fatura
- Se o total de creditos do autor exceder 50% da assinatura, o excedente nao e aplicado

---

## 1. Banco de Dados

### Nova tabela: `marketplace_purchases`

```text
id              uuid PK default gen_random_uuid()
tool_id         uuid NOT NULL (FK tools.id)
buyer_id        uuid NOT NULL (referencia auth.users)
seller_id       uuid NOT NULL (referencia auth.users)
tool_type       text NOT NULL ('calculadora' | 'simulador')
price_brl       numeric NOT NULL (5.00 ou 10.00)
seller_credit   numeric NOT NULL (3.00 ou 6.00)
buyer_charged   boolean default false
seller_credited boolean default false
created_at      timestamptz default now()
```

**RLS:**
- SELECT: usuarios veem suas proprias compras (buyer_id = auth.uid()) ou vendas (seller_id = auth.uid())
- INSERT: via edge function (service role)
- Admins: ALL

---

## 2. Edge Function: `purchase-tool`

Nova edge function que:
1. Autentica o usuario comprador
2. Verifica se ja comprou esta ferramenta (evita duplicata)
3. Verifica se o comprador tem assinatura ativa no Stripe
4. Busca o Stripe customer do comprador e adiciona um InvoiceItem de R$ 5 ou R$ 10 (conforme tipo)
5. Busca o Stripe customer do autor/vendedor e calcula creditos acumulados no periodo
6. Se creditos totais do autor < 50% da assinatura, adiciona InvoiceItem negativo (credito) de R$ 3 ou R$ 6
7. Registra a compra na tabela `marketplace_purchases`
8. Retorna sucesso

---

## 3. Redesign do Marketplace (App Store Style)

### Layout inspirado na App Store:
- **Banner hero** no topo com ferramenta em destaque (a mais bem avaliada ou mais recente)
- **Secoes horizontais** com scroll: "Destaques", "Calculadoras Populares", "Simuladores Novos"
- **Cards maiores** com icone arredondado, nome, autor, avaliacao com estrelas
- **Botao "Obter"** (R$ 5,00 ou R$ 10,00) ou "Abrir" se ja comprado
- **Sidebar de categorias** (se tela grande)
- **Barra de busca** estilizada no topo

### Card do Marketplace (novo design):
```text
+------------------------------------------+
|  [Icone]  Nome da Ferramenta             |
|           por Autor                      |
|           ★★★★☆ (12)                     |
|                          [R$ 5,00]       |
+------------------------------------------+
```

- O botao mostra "R$ 5,00" para calculadoras e "R$ 10,00" para simuladores
- Se ja comprado, mostra "Abrir" em azul
- Se o usuario e o autor, mostra "Sua ferramenta"

### Pagina de detalhe da ferramenta:
- Adicionar secao de compra antes de permitir uso
- Mostrar preco, botao de comprar, e avaliacoes

---

## 4. Integracao no Frontend

### Hook: `useMarketplacePurchases`
- Busca as compras do usuario logado da tabela `marketplace_purchases`
- Retorna set de `tool_id` comprados para verificacao rapida
- Funcao `purchaseTool(toolId)` que invoca a edge function

### Fluxo de compra:
1. Usuario clica "R$ 5,00" no card
2. Dialog de confirmacao: "Deseja adquirir [nome]? O valor de R$ 5,00 sera adicionado a sua proxima fatura."
3. Chama edge function `purchase-tool`
4. Sucesso: toast + botao muda para "Abrir"

### Gating atualizado:
- Marketplace visivel para todos Premium
- Ferramentas so utilizaveis apos compra (ou se for o autor)
- Ferramentas nativas (sem `created_by`) continuam gratuitas para Premium

---

## 5. Arquivos a Criar/Modificar

### Criar:
- `supabase/migrations/xxx_marketplace_purchases.sql` -- tabela e RLS
- `supabase/functions/purchase-tool/index.ts` -- edge function de compra
- `src/hooks/useMarketplacePurchases.ts` -- hook de compras

### Modificar:
- `src/pages/Marketplace.tsx` -- redesign completo App Store style
- `src/pages/ToolDetail.tsx` -- adicionar gate de compra antes do uso
- `supabase/config.toml` -- registrar nova edge function
- `src/integrations/supabase/types.ts` -- tipos da nova tabela

---

## Detalhes Tecnicos

### Stripe InvoiceItem (cobranca na proxima fatura):
```typescript
// Cobrar comprador
await stripe.invoiceItems.create({
  customer: buyerCustomerId,
  amount: 500, // R$ 5,00 em centavos
  currency: "brl",
  description: `Marketplace: ${toolName}`,
});

// Creditar autor (invoice item negativo)
await stripe.invoiceItems.create({
  customer: sellerCustomerId,
  amount: -300, // -R$ 3,00
  currency: "brl",
  description: `Venda Marketplace: ${toolName}`,
});
```

### Calculo do limite de 50%:
```typescript
// Buscar creditos pendentes do autor no periodo atual
const pendingCredits = await supabase
  .from("marketplace_purchases")
  .select("seller_credit")
  .eq("seller_id", sellerId)
  .eq("seller_credited", false);

const totalCredits = pendingCredits.reduce((s, p) => s + p.seller_credit, 0);
const maxDiscount = 29.90 * 0.5; // R$ 14,95
if (totalCredits + newCredit <= maxDiscount) {
  // aplicar credito
}
```
