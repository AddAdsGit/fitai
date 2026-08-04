-- Add water_intake and stool_type columns to daily_wellness
alter table public.daily_wellness add column if not exists water_intake integer default 0 not null;
alter table public.daily_wellness add column if not exists stool_type integer;
