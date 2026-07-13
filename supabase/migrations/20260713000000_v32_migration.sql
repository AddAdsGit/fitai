-- ALTER Profiles to add V3.2 columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS knowledge_preferences text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS knowledge_health text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS knowledge_notes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS knowledge_patterns text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agent_memory text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agent_config jsonb DEFAULT '{"showGptWidget": true, "generateImages": true, "refinePhotos": false, "artStyle": "gourmet", "customInstructions": "Be a hyper-efficient fitness assistant. Minimize chit-chat. Keep replies extremely concise. Prefix macro estimations with ≈. Focus on accurate protein tracking and calorie targets."}'::jsonb,
  ADD COLUMN IF NOT EXISTS email text;

-- Drop obsolete memories column since we don't need to preserve old data
ALTER TABLE public.profiles DROP COLUMN IF EXISTS memories;
