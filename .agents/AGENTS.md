# Custom Workspace Rules for FitAI

This file defines critical rules that all AI developers and code-generation subagents must follow without exception.

## 1. Nutritional Macros Rule (The Fiber Rule) — updated 2026-07-16 for dynamic nutrients
* **Data model:** nutrients are dynamic. `meals.nutrients` (jsonb map) and `profiles.tracked_nutrients` (jsonb array) replace the old fixed carbs/fats/fiber columns; **protein and calories stay first-class columns**. The canonical default list lives in `src/constants/nutrition.ts` (`DEFAULT_TRACKED_NUTRIENTS`) and must stay in sync with the DB default in `supabase/migrations/20260715000000_dynamic_nutrients.sql`.
* **Rule:** **Fiber** remains a default-enabled tracked nutrient. It must never be dropped from the default nutrient list, sharecards, data payloads, or API examples. Handlers that accept nutrient data must accept and persist fiber (via the `nutrients` map).
* **Standard Macro Structure:** With the default nutrient set enabled, displays show four metrics — Protein, Carbs, Fats, Fiber — in a 4-column or 4-row layout (not 3). Users who customize their tracked nutrients may see more or fewer; layouts must handle that gracefully.
* **Aesthetic Standard (default nutrient colors):**
  * **Protein:** Orange (`#F97316`)
  * **Carbs:** Light Blue / Cyan (`#38BDF8` / `#0891B2`)
  * **Fats:** Yellow / Amber (`#FBBF24` / `#EAB308`)
  * **Fiber:** Green / Emerald (`#34D399` / `#10B981`)

## 2. FitAI Brand Design System & Minimalist Insights Rules
* **Strict Aesthetic Standard:** NEVER use dark mode cards or odd glowing dark theme presets. ALWAYS stick 100% to FitAI's signature Warm Cream background (`#FAF7F2` / `bg-orange-50/30`), frosted glassmorphic cards (`bg-white/60 backdrop-blur-md rounded-[32px] border border-white/80 shadow-xl shadow-orange-100/20`), vibrant energetic orange (`#F97316` / `bg-orange-500`), and deep warm espresso typography (`text-orange-950` / `text-orange-900/60`).
* **Share Buttons:** ALL share buttons must be minimalist **icon-only** (`<Share2 />` circular icon buttons). NEVER add text labels like "Share Report" or "Share Progress".
* **Averages & Logged Days:** Averages MUST be calculated based ONLY on active logged days (`avg from X logged days`), never dividing by unlogged days.
* **Weight Tracker:** In weight analytics, do NOT display redundant Start/Current/Goal stats. Display ONLY `Average Weight (kg)` with `avg from X logged days`.
* **Chart Zero Drops:** Do NOT plot dots or drop lines to 0 for unlogged days on charts.

