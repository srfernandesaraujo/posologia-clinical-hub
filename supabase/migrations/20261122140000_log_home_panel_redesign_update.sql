-- Registra o novo Painel de Início como atualização concluída (aparece no
-- Pipeline de Atualizações, no bloco "Novidades" do próprio Painel e no
-- contexto de "ATUALIZAÇÕES RECENTES" do Oráculo).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Novo Painel de Início: continuar de onde parou, salas abertas e novidades',
  'O Painel (/dashboard) agora abre com o último simulador ou calculadora usado (com a última nota) para retomar em um clique; professores veem as salas virtuais abertas com o PIN; há blocos de Usados recentemente, Recomendado para você, Mapa de competências com barra por área, Novidades na plataforma e atalhos Explorar para cada área de prática.',
  'UI/UX',
  'medium',
  now()
);
