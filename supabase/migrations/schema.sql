-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  image_url text,
  description text,
  height integer default 170, -- in cm
  weight numeric(5,2) default 70.00, -- in kg
  dob date,
  gender text,
  preferences text[] default '{}',
  
  -- Knowledge buckets (V3.2)
  knowledge_preferences text[] default '{}',
  knowledge_health text[] default '{}',
  knowledge_notes text[] default '{}',
  knowledge_patterns text[] default '{}',
  
  -- Agent Brain (V3.2)
  agent_memory text[] default '{}',
  agent_config jsonb default '{"showGptWidget": true, "generateImages": true, "refinePhotos": false, "artStyle": "gourmet", "customInstructions": "Be a hyper-efficient fitness assistant. Minimize chit-chat. Keep replies extremely concise. Prefix macro estimations with ≈. Focus on accurate protein tracking and calorie targets."}'::jsonb,
  
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
  telegram_bot_token text,
  telegram_chat_id text,
  telegram_reminders_enabled boolean default false,
  telegram_reports_enabled boolean default false,
  telegram_reminder_times text[] default '{"09:00", "13:00", "20:00"}',
  last_telegram_report_at date,
  last_telegram_reminder_at timestamp with time zone,
  timezone text default 'UTC',
  
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
  fiber integer default 0 not null,
  image text,
  meal_description text,
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
  fiber integer default 0 not null,
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

-- Create policies for authenticated user access
create policy "Users can perform all actions on their own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can perform all actions on their own meals" on public.meals
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "Users can perform all actions on their own recipes" on public.recipes
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- OAUTH CODES TABLE FOR CUSTOM GPT INTEGRATION
create table public.oauth_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  client_id text not null,
  redirect_uri text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.oauth_codes enable row level security;

-- Policies for oauth_codes
create policy "Allow service_role to manage oauth codes" on public.oauth_codes
  for all using (true) with check (true);

-- DAILY WELLNESS NOTES TABLE
create table public.daily_wellness (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  notes text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(profile_id, date)
);

-- Enable RLS
alter table public.daily_wellness enable row level security;

-- Policies for daily_wellness
create policy "Users can perform all actions on their own daily wellness notes" on public.daily_wellness
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Create index for performance
create index daily_wellness_profile_id_date_idx on public.daily_wellness(profile_id, date);

-- SHARES TABLE FOR PUBLIC SHARABLES
create table public.shares (
  id uuid default gen_random_uuid() primary key,
  type text not null, -- 'meal' or 'recipe'
  data jsonb not null, -- payload data
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.shares enable row level security;

-- Policies for public.shares
create policy "Anyone can view shared items" on public.shares
  for select using (true);

create policy "Authenticated users can create shares" on public.shares
  for insert with check (auth.role() = 'authenticated');


