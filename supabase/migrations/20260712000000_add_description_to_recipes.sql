-- Add description column to public.recipes table
ALTER TABLE IF EXISTS public.recipes 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update replica comment
COMMENT ON COLUMN public.recipes.description IS 'Detailed description of the recipe, context, or cooking notes.';
