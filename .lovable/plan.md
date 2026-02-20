

# Hub de Calculadoras e Simuladores Clínicos — Planejamento Estrutural

## Visão Geral
Aplicativo web para profissionais e estudantes de saúde com biblioteca de calculadoras clínicas e simuladores, organizado em estilo Netflix, com área pública e área autenticada.

---

## Abordagem 1: Monolítica Simples (Flat Routes)

**Estrutura:** Todas as páginas no mesmo nível, sem agrupamento lógico de rotas. Controle de acesso feito por um wrapper `<ProtectedRoute>` em cada rota individualmente.

**Rotas:**
- Públicas: `/`, `/login`, `/cadastro`
- Protegidas: `/dashboard`, `/calculadoras`, `/simuladores`, `/calculadoras/:slug`, `/simuladores/:slug`, `/minha-conta`, `/analytics`, `/admin`

**Prós:**
- Simples de começar
- Fácil de entender

**Contras:**
- Controle de acesso repetitivo (cada rota precisa do wrapper)
- Difícil escalar — adicionar 50+ calculadoras e simuladores torna a manutenção confusa
- Sem separação clara entre perfis (usuário comum vs admin)
- Layout compartilhado (sidebar, navbar) precisa ser repetido manualmente

---

## Abordagem 2: Layout Routes com Agrupamento por Área

**Estrutura:** Rotas agrupadas por "área" usando layout routes do React Router. Cada área (pública, autenticada, admin) tem seu próprio layout e proteção centralizada.

**Rotas:**
- **Layout Público** (sem navbar logada): `/`, `/login`, `/cadastro`
- **Layout Autenticado** (com sidebar/navbar): `/dashboard`, `/calculadoras`, `/simuladores`, `/calculadoras/:slug`, `/simuladores/:slug`, `/minha-conta`
- **Layout Admin** (verificação de role): `/admin`, `/analytics`

**Prós:**
- Controle de acesso centralizado por grupo (não por rota individual)
- Layouts diferentes por área sem repetição
- Boa escalabilidade — novas ferramentas são apenas dados, não novas rotas

**Contras:**
- Um pouco mais de setup inicial
- Precisa de um AuthContext bem estruturado desde o início

---

## Abordagem 3: Micro-frontends / Feature Modules Isolados

**Estrutura:** Cada domínio (calculadoras, simuladores, admin) é um módulo independente com suas próprias rotas, componentes e lógica, carregados via lazy loading.

**Prós:**
- Máxima separação de responsabilidades
- Ideal para times grandes

**Contras:**
- Overengineering para o estágio atual do projeto
- Complexidade desnecessária para um time pequeno ou solo
- Mais difícil de manter consistência visual entre módulos

---

## ✅ Recomendação: Abordagem 2 — Layout Routes com Agrupamento

É o equilíbrio ideal entre simplicidade e escalabilidade. Veja por quê:

### Arquitetura de Páginas

| Área | Páginas | Layout |
|------|---------|--------|
| **Pública** | Home, Login, Cadastro | Landing layout (sem sidebar) |
| **Autenticada** | Dashboard, Calculadoras, Simuladores, páginas individuais, Minha Conta | App layout (com navbar/sidebar) |
| **Admin** | Painel admin, Analytics | Admin layout (com verificação de role) |

### Escalabilidade das Ferramentas
- Calculadoras e simuladores serão **dados no Supabase**, não código hardcoded
- Cada ferramenta terá: nome, slug, categoria, descrição, campos de input, lógica de cálculo
- A rota `/calculadoras/:slug` carrega dinamicamente a ferramenta pelo slug
- Adicionar uma nova calculadora = inserir um registro no banco, sem alterar código

### Controle de Acesso
- **AuthProvider** centralizado com Supabase Auth
- **Layout autenticado** redireciona para `/login` se não logado
- **Layout admin** verifica role do usuário (campo na tabela de perfis)

### Fluxo do Usuário
1. Acessa `/` → Landing page persuasiva com CTA para cadastro
2. Cadastra-se em `/cadastro` ou faz login em `/login`
3. Redirecionado para `/dashboard` → vê 2 cards grandes (Calculadoras e Simuladores)
4. Clica em "Calculadoras" → `/calculadoras` → grid estilo Netflix com cards
5. Clica em uma calculadora → `/calculadoras/clearance-creatinina` → página da ferramenta com formulário + explicação
6. Acessa `/minha-conta` para gerenciar perfil

### Banco de Dados (Supabase)
- **profiles** — dados do usuário, role (user/admin)
- **tools** — todas as ferramentas (tipo: calculadora ou simulador, slug, nome, descrição, categoria, campos, status ativo/inativo)
- **categories** — categorias das ferramentas (cardiologia, nefrologia, etc.)
- **usage_logs** — registro de uso para analytics

