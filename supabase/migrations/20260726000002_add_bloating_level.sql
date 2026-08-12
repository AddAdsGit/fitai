-- Migration: Add bloating tracking columns to daily_wellness table
ALTER TABLE daily_wellness 
ADD COLUMN IF NOT EXISTS bloating_level integer,
ADD COLUMN IF NOT EXISTS bloating_log_time text,
ADD COLUMN IF NOT EXISTS bloating_logs jsonb DEFAULT '[]'::jsonb;
