-- FitAI Database Reset Script
-- Run this script in your Supabase SQL Editor to wipe all existing accounts, meals, recipes, and shares for a completely fresh launch.
-- WARNING: This action is irreversible.

-- 1. Delete all shares (which do not cascade)
DELETE FROM public.shares;

-- 2. Delete all auth users
-- This will automatically cascade and delete all records in profiles, meals, recipes, daily_wellness, and oauth_codes!
DELETE FROM auth.users;
