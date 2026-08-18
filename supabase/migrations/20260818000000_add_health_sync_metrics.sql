-- Add health sync metrics to daily_wellness table
ALTER TABLE public.daily_wellness ADD COLUMN IF NOT EXISTS active_calories_burned integer DEFAULT 0 NOT NULL;
ALTER TABLE public.daily_wellness ADD COLUMN IF NOT EXISTS steps integer DEFAULT 0 NOT NULL;
ALTER TABLE public.daily_wellness ADD COLUMN IF NOT EXISTS health_sync_last_synced_at timestamp with time zone;

-- Add health sync logs array to profiles table for persistent error/status tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS health_sync_logs jsonb DEFAULT '[]'::jsonb;
