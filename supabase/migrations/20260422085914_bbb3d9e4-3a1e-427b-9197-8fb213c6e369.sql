ALTER TABLE public.virtual_rooms
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.virtual_rooms.reactivated_at IS 'Data da última reativação manual da sala. Usada para reiniciar a janela de inatividade de 7 dias.';