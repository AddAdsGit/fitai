-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table public.profiles (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  display_name text not null,
  image_url text,
  description text,
  height integer default 170, -- in cm
  weight numeric(5,2) default 70.00, -- in kg
  dob date,
  gender text,
  memories text[] default '{}',
  preferences text[] default '{}',
  
  -- Goals
  daily_calories_goal integer default 2000,
  weight_goal numeric(5,2) default 70.00,
  protein_goal integer default 150,
  carbs_goal integer default 150,
  fats_goal integer default 60,
  fiber_goal integer default 30,
  
  -- System
  track_micros boolean default true,
  micros jsonb default '[]'::jsonb,
  api_key text unique not null, -- Authentication token for Custom GPT Action
  
  -- Integrations
  notion_api_key text,
  notion_database_id text,
  google_sheets_webhook_url text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MEALS TABLE
create table public.meals (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  time text not null, -- E.g., "8:30 AM"
  type text not null, -- E.g., "Breakfast"
  calories integer not null,
  protein integer not null,
  carbs integer not null,
  fats integer not null,
  image text,
  date date not null, -- E.g., "2026-07-08"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RECIPES TABLE
create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  time text not null, -- E.g., "15 mins"
  calories integer not null,
  protein integer not null,
  carbs integer not null,
  fats integer not null,
  tags text[] default '{}',
  image text,
  ingredients text[] default '{}',
  instructions text,
  micros jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index meals_profile_id_date_idx on public.meals(profile_id, date);
create index recipes_profile_id_idx on public.recipes(profile_id);
create index profiles_api_key_idx on public.profiles(api_key);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.recipes enable row level security;

-- Create simple relaxed policies for anon read/write access (perfect for shared user/friend tracker)
create policy "Allow all anon access on profiles" on public.profiles for all using (true) with check (true);
create policy "Allow all anon access on meals" on public.meals for all using (true) with check (true);
create policy "Allow all anon access on recipes" on public.recipes for all using (true) with check (true);
