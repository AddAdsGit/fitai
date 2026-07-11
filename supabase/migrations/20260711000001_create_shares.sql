-- CREATE SHARES TABLE FOR PREMIUM SHORT LINKS
create table public.shares (
  id uuid default gen_random_uuid() primary key,
  type text not null, -- 'meal', 'recipe', or 'day'
  data jsonb not null, -- the payload representing the shared item
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.shares enable row level security;

-- Policies for public.shares
create policy "Anyone can view shared items" on public.shares
  for select using (true);

create policy "Authenticated users can create shares" on public.shares
  for insert with check (auth.role() = 'authenticated');
