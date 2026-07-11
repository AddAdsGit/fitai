-- Create daily_wellness table
create table if not exists public.daily_wellness (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  notes text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(profile_id, date)
);

-- Add meal_description column to public.meals table
alter table public.meals add column if not exists meal_description text;

-- Enable RLS on daily_wellness
alter table public.daily_wellness enable row level security;

-- RLS Policy for daily_wellness
create policy "Users can perform all actions on their own daily wellness notes" on public.daily_wellness
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Create index for performance
create index if not exists daily_wellness_profile_id_date_idx on public.daily_wellness(profile_id, date);
