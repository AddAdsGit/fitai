-- Add log_count column to public.recipes table
ALTER TABLE IF EXISTS public.recipes 
ADD COLUMN IF NOT EXISTS log_count INTEGER DEFAULT 0;

-- Update schema.sql replica (standard best practice)
COMMENT ON COLUMN public.recipes.log_count IS 'Popularity tracker showing number of times this recipe has been logged to a plate.';
