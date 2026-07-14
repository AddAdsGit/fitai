-- =============================================================
-- MIGRATION: Add Tags System
-- Adds meal tags and user-configurable tracking tag definitions
-- =============================================================

-- 1. Add tags column to meals (recipes already have it)
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Add tracking_tags to profiles — 12 default tag definitions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tracking_tags jsonb DEFAULT '[
  {"id":"high_protein","name":"High Protein","emoji":"🥩","color":"#F97316","description":"Apply when protein is 25g or more per meal","enabled":true,"isDefault":true},
  {"id":"high_fiber","name":"High Fiber","emoji":"🌿","color":"#10B981","description":"Apply when fiber is 8g or more per meal","enabled":true,"isDefault":true},
  {"id":"low_carb","name":"Low Carb","emoji":"📉","color":"#8B5CF6","description":"Apply when carbs are 20g or less per meal","enabled":true,"isDefault":true},
  {"id":"low_calorie","name":"Low Calorie","emoji":"🪶","color":"#06B6D4","description":"Apply when calories are 300 or less per meal","enabled":true,"isDefault":true},
  {"id":"keto","name":"Keto","emoji":"🥑","color":"#84CC16","description":"Apply when meal is high fat and carbs are 10g or less","enabled":true,"isDefault":true},
  {"id":"vegan","name":"Vegan","emoji":"🌱","color":"#22C55E","description":"Apply when meal contains no animal products (no meat, fish, eggs, dairy, honey)","enabled":true,"isDefault":true},
  {"id":"vegetarian","name":"Vegetarian","emoji":"🥬","color":"#4ADE80","description":"Apply when meal contains no meat or fish (eggs and dairy are okay)","enabled":true,"isDefault":true},
  {"id":"gluten_free","name":"Gluten Free","emoji":"🌾","color":"#EAB308","description":"Apply when meal contains no wheat, barley, rye, or oats","enabled":true,"isDefault":true},
  {"id":"dairy_free","name":"Dairy Free","emoji":"🥛","color":"#F472B6","description":"Apply when meal contains no milk, cheese, cream, butter, or yogurt","enabled":true,"isDefault":true},
  {"id":"rich_in_iron","name":"Rich in Iron","emoji":"🩸","color":"#EF4444","description":"Apply when meal contains iron-rich foods like spinach, red meat, lentils, beans, or fortified cereals","enabled":true,"isDefault":true},
  {"id":"rich_in_b12","name":"Rich in B12","emoji":"💊","color":"#A855F7","description":"Apply when meal contains B12-rich foods like meat, eggs, dairy, or fortified foods","enabled":true,"isDefault":true},
  {"id":"rich_in_omega3","name":"Rich in Omega-3","emoji":"🐟","color":"#3B82F6","description":"Apply when meal contains omega-3 rich foods like salmon, sardines, mackerel, walnuts, chia seeds, or flaxseeds","enabled":true,"isDefault":true}
]'::jsonb;

-- 3. Create GIN index on meals.tags for fast tag-based filtering
CREATE INDEX IF NOT EXISTS meals_tags_idx ON public.meals USING GIN (tags);
