
-- Add soft delete column to virtual_rooms
ALTER TABLE public.virtual_rooms ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add custom_challenges column to room_activities for professor customization
ALTER TABLE public.room_activities ADD COLUMN IF NOT EXISTS custom_challenges jsonb DEFAULT NULL;
