-- Add Telegram Integration columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_bot_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_reminders_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_reports_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_reminder_times text[] DEFAULT '{"09:00", "13:00", "20:00"}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_telegram_report_at date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_telegram_reminder_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';
