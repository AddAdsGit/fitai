-- Add fiber columns to meals and recipes tables
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS fiber integer DEFAULT 0 NOT NULL;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS fiber integer DEFAULT 0 NOT NULL;
