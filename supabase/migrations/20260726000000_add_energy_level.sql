-- Migration to add energy_level and energy_log_time to daily_wellness
ALTER TABLE public.daily_wellness ADD COLUMN IF NOT EXISTS energy_level INTEGER;
ALTER TABLE public.daily_wellness ADD COLUMN IF NOT EXISTS energy_log_time TEXT;
