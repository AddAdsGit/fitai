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
