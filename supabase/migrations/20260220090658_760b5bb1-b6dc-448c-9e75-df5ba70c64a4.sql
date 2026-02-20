
-- Add status column to profiles
ALTER TABLE public.profiles ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Update existing profiles to 'approved' so current users aren't locked out
UPDATE public.profiles SET status = 'approved';

-- Create contact_messages table
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated) can insert contact messages
CREATE POLICY "Anyone can send contact messages"
ON public.contact_messages
FOR INSERT
WITH CHECK (true);

-- Only admins can view/manage contact messages
CREATE POLICY "Admins can view contact messages"
ON public.contact_messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contact messages"
ON public.contact_messages
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contact messages"
ON public.contact_messages
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update profiles (for approval)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
