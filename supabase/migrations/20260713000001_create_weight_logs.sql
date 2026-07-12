-- Create weight_logs table
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT null,
  weight numeric(5,2) NOT null,
  date date NOT null,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT null,
  UNIQUE(profile_id, date)
);

-- Enable RLS
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- Policies for weight_logs
CREATE POLICY "Users can perform all actions on their own weight logs" ON public.weight_logs
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS weight_logs_profile_id_date_idx ON public.weight_logs(profile_id, date);
