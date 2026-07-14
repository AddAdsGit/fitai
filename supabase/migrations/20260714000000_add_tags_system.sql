-- =============================================================
-- MIGRATION: Add Tags System
-- Adds meal tags and user-configurable tracking tag definitions
-- =============================================================

-- 1. Add tags column to meals (recipes already have it)
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Add tracking_tags to profiles — 10 simplified default tag definitions (no emojis, colors, or numeric macro targets)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tracking_tags jsonb DEFAULT '[
  {"id":"gluten_free","name":"Gluten Free","description":"Apply when meal contains no wheat, barley, rye, or oats","enabled":true},
  {"id":"dairy_free","name":"Dairy Free","description":"Apply when meal contains no milk, cheese, cream, butter, or yogurt","enabled":true},
  {"id":"nut_free","name":"Nut Free","description":"Apply when meal contains no peanuts, tree nuts, or seeds","enabled":true},
  {"id":"vegan","name":"Vegan","description":"Apply when meal contains no animal products","enabled":true},
  {"id":"vegetarian","name":"Vegetarian","description":"Apply when meal contains no meat or fish","enabled":true},
  {"id":"keto","name":"Keto","description":"Apply when meal is high fat and carbs are 10g or less","enabled":true},
  {"id":"rich_in_iron","name":"Rich in Iron","description":"Apply when meal contains iron-rich foods (e.g. spinach, red meat)","enabled":true},
  {"id":"rich_in_b12","name":"Rich in B12","description":"Apply when meal contains B12-rich foods (e.g. fish, eggs, meat)","enabled":true},
  {"id":"rich_in_omega3","name":"Rich in Omega-3","description":"Apply when meal contains omega-3 rich foods (e.g. salmon, walnuts, chia)","enabled":true},
  {"id":"rich_in_magnesium","name":"Rich in Magnesium","description":"Apply when meal contains magnesium-rich foods (e.g. dark chocolate, avocado, pumpkin seeds)","enabled":true}
]'::jsonb;

-- 3. Create GIN index on meals.tags for fast tag-based filtering
CREATE INDEX IF NOT EXISTS meals_tags_idx ON public.meals USING GIN (tags);
