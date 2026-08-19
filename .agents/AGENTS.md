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

## 3. Mandatory 100% Uniform Bottom-Aligned Mobile Sheet Popups & Portal Rule
* **Mandatory Bottom-Aligned Sheets**: ALL modal dialogs, popups, alert confirmations, delete prompts, settings dialogs, date/time pickers, food library, vitals, and actions MUST use FitAI's iconic **Bottom-Aligned Sheet Popup** (`items-end justify-center font-sans`, portaled to `document.body` with `z-[99999]`, rounded top corners `rounded-t-[36px]`, top drag pill indicator `w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-1 shrink-0 select-none`, Warm Cream `#FAF7F2` background, smooth spring slide-up animation `initial={{ y: "100%" }} animate={{ y: 0 }}`, backdrop blur `bg-stone-950/60`, and safe area bottom padding `pb-[max(20px,env(safe-area-inset-bottom,20px))]`).
* **Strict Prohibition of Centered Desktop Dialogs**: NEVER render centered floating alert boxes (e.g. `items-center justify-center rounded-3xl m-4` or generic floating alert boxes) in mobile views. Every single popup MUST slide up smoothly from the bottom as a thumb-friendly bottom sheet.
* **React Portals (`createPortal`):** ALL popup modals and sheets MUST be rendered using React's `createPortal(..., document.body)` with `z-[99999]` so they float 100% above `BottomNav` (`z-50`) and lower container layers.
* **Background Body Scroll Lock**: ALL modals must lock `document.body.style.overflow = "hidden"` and `touchAction = "none"` when open so background pages never scroll or cause viewport rubber-banding.

## 4. Mobile Header Congestion & Stat Grid Rule
* **Header Title + Filter Row:** NEVER squeeze multi-pill filter bars on the same horizontal flex row as a large page heading (e.g., `Your Progress`) on mobile. ALWAYS use a single compact dropdown trigger badge (`[ 7 Days ▾ ]`) or stack them cleanly.
* **Multi-Stat Headers:** Header columns displaying 3 or more stat metrics (e.g. `KCAL GOAL`, `WEIGHT`, `TARGET`) MUST use a locked CSS grid (`grid grid-cols-3 gap-1 min-w-0 truncate`) so text never clips off-screen on 360px phones.

## 5. Unbreakable Minimalist UI/UX & Micro-copy Rules
* **Reference Skill**: Read `.agents/skills/fitai-design-system/SKILL.md` before making UI design edits.
* **The Dashboard is the Truth-Teller**: All new screens, settings pages, and modals MUST match the exact Warm Cream (`#FAF7F2`) background, soft pure-white cards (`rounded-[32px] shadow-xl shadow-orange-100/20`), uppercase micro-typography (`text-[10px] font-black tracking-widest text-orange-950`), and zero-clutter layout demonstrated in the main Dashboard screen.
* **No Verbose / Complicated Copy**: Keep titles & labels direct, ultra-short, and functional (e.g. `Your Name`, `Today's Progress`). Never add conversational explanatory subtext under basic labels.
* **No Unnecessary Section Headers**: Do not add section headers above inputs when the UI context/placeholder is already clear.
* **No Emoji Soup or Rainbow Icons**: Never use multi-colored emoji soup in section titles. Use clean typography or single-tint monochrome Lucide SVG icons matching the espresso or orange brand palette.
* **No Shaking / Jittering Animations**: NEVER use continuous keyframe bounce or pulse animations (`animate-bounce`, `animate-pulse`) on empty state icons or empty charts. Keep empty states calm, still, and steady.
* **AI Tag Card 1-Line Structure**: Use clean 1-line cards with Tag Name, AI Description, dedicated Pencil icon (`<Pencil />`), and explicit Toggle Switches (`ON / OFF`). Never use tactile pill tags with invisible touch toggles or double-indicator green dots.
* **Numeric Input Backspacing**: ALWAYS support empty string (`""`) state (`value={val === 0 ? "" : val}`) so users can backspace completely without forced fallback digits.
* **Clean Section Headers**: Keep section titles bold, clean, and un-cluttered. Never add redundant `<Info />` icon buttons to self-explanatory section headers.
* **No Unnecessary Screen Titles or Viewfinder Badges**: NEVER add redundant title banners, explanatory subtext, or badges (e.g. "FitAI Camera", "Camera Viewfinder", "Photo Recognition") to clean full-screen views or camera viewfinders. Keep screens 100% minimal, direct, and clutter-free — imagery & pure function only.
* **Simple Generic Titles & Ultra-Minimal Subtitles Rule**: ALWAYS use simple, clean, generic names as titles (e.g. `FitAI`, `Today`, `Meals`, `Calories`, `Protein`, `Daily Timeline`). NEVER invent convoluted, poetic, or verbose titles. Use subtitles ONLY when strictly necessary, keeping them ultra-minimal (1-3 words maximum, e.g. `Daily Timeline`).
* **Share Cards Protein Goal Rule**: NEVER display goal percentages (e.g. `94% goal` or `% of Goal`) inside the Protein summary box on share cards. Display ONLY the raw protein value (e.g. `102g` / `165g`) and label (`Protein`).
* **No Visible Scrollbars (Clean Native App Standard)**: NEVER render visible browser scrollbar tracks or thumbs on popups, sheets, or pages. All scrollable areas must scroll smoothly while hiding scrollbar tracks (`scrollbar-width: none`, `-ms-overflow-style: none`, `::-webkit-scrollbar { display: none }`).

## 6. Today's Notes / Wellness Journal Dashboard Rule (v2 Unhide Directive)
* **Status:** "Today's Notes" (`WellnessJournal`) section is currently commented out in `src/App.tsx` for v2.
* **Directive:** If the user asks to enable, restore, or unhide "Today's Notes" or "Wellness Journal", simply remove the comment wrapper `{/* ... */}` around the `<WellnessJournal />` JSX block in `src/App.tsx`.

## 7. Git Push Directive (User Permission Rule)
* **Rule:** NEVER run `git push` or push changes to GitHub automatically. ONLY execute `git push` when the user explicitly asks or mentions to push to GitHub in their prompt.

## 10. Modern Google Gemini Vision & Flash API Rule (2026 Models)
* **Valid 2026 Model Names**: ONLY use official Google Gemini Flash model names: `gemini-3.7-flash` and `gemini-3.6-flash`.
* **Prohibited Obsolete / Hallucinated Model Names**: NEVER use deprecated `gemini-2.0-flash`, `gemini-1.5-flash`, or `gemini-1.5-flash-latest` on `v1beta` (Google officially replaced `gemini-2.0-flash` with `gemini-3.7-flash` / `gemini-3.6-flash` on `v1beta` which throws 404 errors).
* **Server Proxy Execution**: ALL AI food photo, recipe, and text nutrition calls MUST route through the Supabase Edge Function (`supabase/functions/gemini/index.ts`) using backend key rotation (`GEMINI_API_KEYS`).
* **Generation Parameters**: Use `temperature: 0.1` with `responseMimeType: "application/json"` and omit artificial token ceilings so Gemini has full breathing room for reasoning and complete JSON output.



