-- 1. Modify public.profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS carbs_goal;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS fats_goal;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS fiber_goal;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tracked_nutrients jsonb DEFAULT '[
  {"id": "protein", "name": "Protein", "target": 150, "unit": "g", "color": "#F97316", "enabled": true, "isDefault": true},
  {"id": "carbs", "name": "Carbs", "target": 150, "unit": "g", "color": "#0891B2", "enabled": true, "isDefault": true},
  {"id": "fats", "name": "Fats", "target": 60, "unit": "g", "color": "#EAB308", "enabled": true, "isDefault": true},
  {"id": "fiber", "name": "Fiber", "target": 30, "unit": "g", "color": "#10B981", "enabled": true, "isDefault": true}
]'::jsonb;

-- Update existing profiles to have default tracked_nutrients if null or empty
UPDATE public.profiles
SET tracked_nutrients = '[
  {"id": "protein", "name": "Protein", "target": 150, "unit": "g", "color": "#F97316", "enabled": true, "isDefault": true},
  {"id": "carbs", "name": "Carbs", "target": 150, "unit": "g", "color": "#0891B2", "enabled": true, "isDefault": true},
  {"id": "fats", "name": "Fats", "target": 60, "unit": "g", "color": "#EAB308", "enabled": true, "isDefault": true},
  {"id": "fiber", "name": "Fiber", "target": 30, "unit": "g", "color": "#10B981", "enabled": true, "isDefault": true}
]'::jsonb
WHERE tracked_nutrients IS NULL OR jsonb_array_length(tracked_nutrients) = 0;

-- 2. Modify public.meals table
ALTER TABLE public.meals DROP COLUMN IF EXISTS carbs;
ALTER TABLE public.meals DROP COLUMN IF EXISTS fats;
ALTER TABLE public.meals DROP COLUMN IF EXISTS fiber;

ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS nutrients jsonb DEFAULT '{}'::jsonb;

-- Initialize empty nutrients jsonb for existing meals
UPDATE public.meals
SET nutrients = '{}'::jsonb
WHERE nutrients IS NULL;
