
-- Add created_by and is_marketplace columns to tools table
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS is_marketplace boolean NOT NULL DEFAULT false;

-- Allow premium users to insert their own tools
CREATE POLICY "Users can insert their own tools"
ON public.tools
FOR INSERT
WITH CHECK (auth.uid() = created_by AND auth.uid() IS NOT NULL);

-- Allow users to update their own tools
CREATE POLICY "Users can update their own tools"
ON public.tools
FOR UPDATE
USING (auth.uid() = created_by);

-- Allow users to delete their own tools
CREATE POLICY "Users can delete their own tools"
ON public.tools
FOR DELETE
USING (auth.uid() = created_by);

-- Update select policy: users can see their own tools OR marketplace tools
DROP POLICY IF EXISTS "Anyone authenticated can view active tools" ON public.tools;
CREATE POLICY "Users can view own tools and marketplace tools"
ON public.tools
FOR SELECT
USING (
  is_active = true AND (
    created_by IS NULL  -- system tools (no owner)
    OR created_by = auth.uid()  -- own tools
    OR is_marketplace = true  -- marketplace tools
    OR has_role(auth.uid(), 'admin'::app_role)  -- admin sees all
  )
);
