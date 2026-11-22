-- Logs the app shell redesign (grouped sidebar, universal search, breadcrumb, mobile bottom bar,
-- visual identity aligned to the landing page) as a shipped update, so it shows up in the admin
-- "Pipeline de Atualizações" changelog and, automatically, in the Oráculo assistant's live
-- "ATUALIZAÇÕES RECENTES" context.
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Novo menu lateral em grupos, busca universal (Ctrl+K) e visual renovado',
  'Menu reorganizado em Início, Praticar, Ensinar, Meu progresso (Conquistas) e Administração (só admin), com conta, plano, documentação, suporte e idioma no menu do avatar; nova busca universal por Ctrl+K/Cmd+K (ou botão Buscar) para simuladores, calculadoras, bancadas e páginas; trilha de navegação no topo, barra inferior do celular com Buscar no centro, formulário Fale conosco agora no fim da página Suporte e identidade visual alinhada à landing page.',
  'UI/UX',
  'medium',
  now()
);
