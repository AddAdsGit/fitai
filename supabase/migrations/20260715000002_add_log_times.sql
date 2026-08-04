-- Add log_time to weight_logs table
ALTER TABLE public.weight_logs ADD COLUMN IF NOT EXISTS log_time TEXT;

-- Add log times to daily_wellness table
ALTER TABLE public.daily_wellness ADD COLUMN IF NOT EXISTS weight_log_time TEXT;
ALTER TABLE public.daily_wellness ADD COLUMN IF NOT EXISTS water_log_time TEXT;
ALTER TABLE public.daily_wellness ADD COLUMN IF NOT EXISTS stool_log_time TEXT;
