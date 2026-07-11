# FitAI — Project Goal & Architecture

This document serves as the project memory for future AI coding assistants. It outlines the core purpose, technical stack, database layout, and integration workflows of the FitAI application.

---

## 🎯 Core Project Goal
FitAI is a minimalist, premium, low-friction daily calorie and macronutrient tracker designed to keep logging time to an absolute minimum. It operates as a web-based dashboard and integrates deeply with a **ChatGPT Custom GPT** to enable natural-language voice and text logging.

### 🌟 Product Vision & Mascot Avatar
*   **Non-Social by Design**: FitAI is a private personal tracker rather than a social app. There are no feeds, friends lists, or comment sections.
*   **Organic Reach via Infographics**: To drive acquisition, FitAI provides users with gorgeous, shareable infographic templates (Midnight, Sunset, Sand) for their meals, recipes, and daily logs. Shared URLs open a public landing page with interactive import options.
*   **Mascot-Driven Engagement (Duolingo-style)**: The core engagement loops and coaching are powered by an interactive **mascot avatar** (similar to the Duolingo bird). This mascot resides on the dashboard, visually reacting to the user's calorie tracking, streak, and daily wellness logs to encourage, push, and keep them accountable.

---

## 🏗️ Architecture & Stack
FitAI is built using a modern decoupled architecture:

1.  **Frontend (React Web App)**:
    *   **Core**: React 19, TypeScript, Vite.
    *   **Styling**: Tailwind CSS (Vite plugin), Framer Motion (for premium micro-animations).
    *   **Charts**: Recharts (dynamic daily macros and calorie progress).
    *   **Authentication**: Supabase Auth (Sign in with Google & Email/Password).
    *   **Database Sync**: Client-side reactive sync to Supabase with debounced database saves.
    *   **Local NLP Parsing**: A built-in rule-based utility (`calculateNutritionFromIngredients`) that extracts calorie/macro counts from natural language text locally on the client with zero latency and zero API cost.
    *   **Local AI Refinement**: Client-side segmented editor using the Gemini 1.5 Flash API (`generativelanguage.googleapis.com`) to allow users to refine logged meals via text instructions (e.g. "add 50g chicken"), displaying a side-by-side macro preview before approval.

2.  **Backend (Supabase Serverless)**:
    *   **Database**: PostgreSQL hosted on Supabase, secured with Row Level Security (RLS) policies isolating user data.
    *   **Serverless Edge Functions**: A Deno Edge Function (`gpt-action`) routing requests from the Custom GPT.
        *   Supports `GET /profile` and `POST /profile` (with memory appending).
        *   Supports `GET /meals`, `POST /meals` (logging), `PATCH /meals` (updates), and `DELETE /meals` (removals).
        *   Supports `GET /recipes` and `POST /recipes`.
        *   Parses local time zones via the `x-timezone-offset` header.
    *   **Third-party Webhooks**: Real-time sync to Notion Databases and Google Sheets streams on meal creation, configured in user settings.

3.  **Custom GPT Action (OpenAI Chat/Voice Interface)**:
    *   Interfaces with the Supabase Edge Function via a secure OpenAPI schema.
    *   Acts as the heavy-lifting LLM, executing complex multi-step instructions (e.g., matching meals, portions, and ingredients, and calculating combined values) before making simple updates to the database, saving token costs.

---

## 💾 Database Schema

### 1. `public.profiles`
Stores user profile information, targets, settings, and tokens:
*   `id` (uuid, primary key, references `auth.users`)
*   `username` (text, unique)
*   `display_name` (text)
*   `height` / `weight` / `dob` / `gender`
*   `memories` (text[]) — Custom dietary preferences/habits.
*   `preferences` (text[]) — Tag preferences (e.g., `"onboarded"`, `"refine_food_pics"`).
*   `daily_calories_goal` / `weight_goal` / `protein_goal` / `carbs_goal` / `fats_goal` / `fiber_goal`
*   `api_key` (text, unique) — Bearer token for Custom GPT authentications.
*   `notion_api_key` / `notion_database_id` / `google_sheets_webhook_url`

### 2. `public.meals`
Stores daily logged meals:
*   `id` (uuid, primary key)
*   `profile_id` (uuid, references `profiles`)
*   `name` (text) — E.g. "Grilled Salmon Salad"
*   `time` (text) — E.g. "12:30 PM"
*   `type` (text) — E.g. "Lunch"
*   `calories` / `protein` / `carbs` / `fats` (integers)
*   `date` (date) — E.g. "2026-07-09"
*   `image` (text) — Public photo URL

### 3. `public.recipes`
Stores custom user recipes used for quick logging:
*   `id` (uuid, primary key)
*   `profile_id` (uuid, references `profiles`)
*   `name` (text)
*   `time` (text) — Prep duration
*   `calories` / `protein` / `carbs` / `fats`
*   `ingredients` (text[])
*   `instructions` (text)
