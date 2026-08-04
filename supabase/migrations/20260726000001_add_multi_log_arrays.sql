-- Migration: Add jsonb arrays for multi-logging water, stool, and energy events
ALTER TABLE daily_wellness 
ADD COLUMN IF NOT EXISTS water_logs jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stool_logs jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS energy_logs jsonb DEFAULT '[]'::jsonb;
