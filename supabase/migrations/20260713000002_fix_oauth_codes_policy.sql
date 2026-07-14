-- Fix security leak: Drop public policy on oauth_codes and restrict to service_role only
DROP POLICY IF EXISTS "Allow service_role to manage oauth codes" ON public.oauth_codes;

CREATE POLICY "Allow service_role to manage oauth codes" ON public.oauth_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
