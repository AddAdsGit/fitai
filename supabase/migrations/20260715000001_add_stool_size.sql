-- Add stool_size column to daily_wellness table
alter table public.daily_wellness add column if not exists stool_size text;
