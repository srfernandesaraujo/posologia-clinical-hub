-- A migration 20260614180926 removeu a última política de SELECT em virtual_rooms
-- para anon/authenticated (fechando exposição pública de PINs/salas ativas), mas não
-- considerou que as políticas de INSERT em room_participants e room_submissions
-- dependem de um EXISTS(SELECT ... FROM virtual_rooms ...) — e esse subselect também
-- é regido pelo RLS de virtual_rooms. Sem nenhuma política de SELECT lá, o EXISTS
-- nunca enxerga a sala (mesmo ativa) para quem não é o dono, e o INSERT é rejeitado
-- com "new row violates row-level security policy for table room_submissions".
--
-- Isso quebrou silenciosamente o envio de resultados de Salas Virtuais (room_submissions)
-- para qualquer aluno anônimo desde 14/06/2026 — reproduzido ao vivo pelo fluxo real de
-- aluno (join por PIN + Modo Desafio) antes desta correção. room_participants (join) não
-- foi afetado na prática porque passa pela edge function room-access com service role,
-- que ignora RLS — mas a política em si tinha o mesmo defeito, corrigida aqui por
-- consistência e para não depender exclusivamente do caminho via edge function.
--
-- Fix: função SECURITY DEFINER que verifica apenas is_active, sem reabrir SELECT geral
-- em virtual_rooms (preserva a correção de exposição de dados de 2026-06-14).

CREATE OR REPLACE FUNCTION public.is_room_active(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.virtual_rooms WHERE id = _room_id AND is_active = true
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_room_active(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can submit results to active rooms" ON public.room_submissions;
CREATE POLICY "Anyone can submit results to active rooms"
  ON public.room_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (public.is_room_active(room_id));

DROP POLICY IF EXISTS "Anyone can join a room" ON public.room_participants;
CREATE POLICY "Anyone can join a room"
  ON public.room_participants FOR INSERT
  TO anon, authenticated
  WITH CHECK (public.is_room_active(room_id));
