-- Registra o redesenho das páginas de catálogo como atualização concluída
-- (Pipeline de Atualizações, bloco Novidades do Painel e contexto do Oráculo).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Catálogos redesenhados: simuladores em 5 áreas, filtros e favoritos',
  'As páginas de Simuladores, Calculadoras, Jogos Clínicos e Laboratório Virtual ganharam cartões com prévia visual, busca que ignora acentos e favoritos com estrela. Os 111 simuladores agora ficam em 5 áreas (Terapêutica e farmácia clínica, Ciências básicas, Produção e gestão, Outras profissões, Formação docente), com filtros para os que têm Modo Desafio e os que funcionam em Sala Virtual.',
  'UI/UX',
  'medium',
  now()
);
