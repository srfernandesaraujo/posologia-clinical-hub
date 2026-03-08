

# Plano: Sistema de Consentimento e Coleta de Cookies

## Visão Geral

Implementar um sistema completo de consentimento de cookies (LGPD-compliant) com: banner de consentimento, gerenciamento granular por categoria, persistência das preferências, e coleta de dados de uso que o admin pode consultar para decisões de negócio.

---

## Categorias de Cookies

| Categoria | Sempre ativo? | O que coleta | Como usar a seu favor |
|-----------|--------------|-------------|----------------------|
| **Essenciais** | Sim | Auth token, sessão, CSRF | Necessário para funcionar |
| **Preferências** | Opcional | Idioma, tema, banners dispensados | Personalizar experiência do usuário |
| **Desempenho/Analytics** | Opcional | Páginas visitadas, tempo de uso, calculadoras/jogos/simuladores mais usados, cliques em CTAs | **Dados valiosos**: saber quais ferramentas são mais populares, otimizar conversão, priorizar desenvolvimento |
| **Marketing** | Opcional | Origem do visitante, páginas vistas antes de cadastro | **Funil de vendas**: entender jornada do visitante até virar assinante |

---

## O que será implementado

### 1. Cookie Consent Context (`src/contexts/CookieConsentContext.tsx`)
- Context global com estado das preferências (essenciais, preferências, analytics, marketing)
- Persiste no `localStorage` com chave `cookie-consent`
- Expõe: `consent`, `updateConsent()`, `hasConsented`, `isAllowed(category)`

### 2. Cookie Consent Banner (`src/components/CookieConsentBanner.tsx`)
- Banner fixo no rodapé da tela, aparece na primeira visita
- Dois botões principais: **"Aceitar Todos"** e **"Gerenciar Preferências"**
- Modal de preferências com toggles por categoria (essenciais sempre ativo e desabilitado)
- Link para a página `/politica-cookies`
- Design consistente com o tema escuro do sistema

### 3. Hook de Analytics (`src/hooks/useCookieAnalytics.ts`)
- Só coleta dados se o usuário aceitou a categoria "analytics"
- Rastreia: página atual, tempo na página, ferramenta utilizada (slug), timestamp
- Salva eventos no Supabase (tabela `analytics_events`)

### 4. Tabela Supabase: `analytics_events`
```sql
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  event_type text not null,        -- 'page_view', 'tool_use', 'cta_click'
  page_path text,
  tool_slug text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
```
- RLS: insert para todos (anônimos inclusos), select apenas admin

### 5. Integração no App
- Envolver `App.tsx` com `CookieConsentProvider`
- Renderizar `CookieConsentBanner` dentro do provider (aparece em todas as rotas)
- Hook `useCookieAnalytics` chamado no `AppLayout` e `PublicLayout` para rastrear page views

### 6. Painel Admin: aba Analytics
- Na página `/admin`, adicionar aba "Analytics de Uso"
- Métricas: ferramentas mais acessadas, páginas mais visitadas, taxa de aceitação de cookies, visitantes únicos por dia
- Gráficos com Recharts (já instalado)

### 7. Atualizar página de Política de Cookies
- Adicionar botão "Gerenciar minhas preferências" que reabre o modal de consentimento

---

## Como usar os dados a seu favor

1. **Priorização de produto**: saber quais calculadoras/jogos/simuladores são mais usados para investir neles
2. **Conversão**: ver quais páginas os visitantes acessam antes de criar conta — otimizar CTAs nessas páginas
3. **Retenção**: identificar ferramentas subutilizadas para melhorar ou promover
4. **Precificação**: dados de uso justificam valor dos planos premium
5. **Marketing**: saber de onde vêm os visitantes (referrer) para direcionar esforços

---

## Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/contexts/CookieConsentContext.tsx` |
| Criar | `src/components/CookieConsentBanner.tsx` |
| Criar | `src/hooks/useCookieAnalytics.ts` |
| Editar | `src/App.tsx` — adicionar provider e banner |
| Editar | `src/components/layouts/AppLayout.tsx` — hook analytics |
| Editar | `src/components/layouts/PublicLayout.tsx` — hook analytics |
| Editar | `src/pages/PoliticaCookies.tsx` — botão de gerenciar |
| Editar | `src/pages/Admin.tsx` — aba analytics |
| Migration | Tabela `analytics_events` + RLS |

