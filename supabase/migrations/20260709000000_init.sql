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
  image text,
  tags text[] default '{}',
  ingredients text[] default '{}',
  instructions text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
