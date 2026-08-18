# FitAI User Preferences & App Design Principles

This document records the user's specific design, UI/UX, behavioral, and performance preferences. All agents and subagents working on this codebase MUST read and strictly adhere to these rules.

---

## 🎨 1. Aesthetic & UI Preferences (Radical Minimalism)
* **Pure Simplicity & Minimalism**: "Less is more." Avoid unnecessary card wrappers, complex nested containers, or crowded organization. Keep interfaces direct, clean, and spacious.
* **Zero Emojis / Emotes**: NEVER use emojis or emotes anywhere in the UI. Use clean monochrome SVG icons (`lucide-react`) in espresso or energetic orange.
* **Restrained Color Palette**: NEVER mix too many colors in one view. Stick 100% to:
  * Warm Cream Background: `#FAF7F2` (`bg-[#FAF7F2]`)
  * Pure White Glass Cards: `bg-white/60 backdrop-blur-md border border-white/80 shadow-xl shadow-orange-100/20 rounded-[32px]`
  * Energetic Orange Accent: `#F97316` (`bg-orange-500`)
  * Espresso Text: `#431407` (`text-orange-950`)
  * Standard 4 Macro Colors: Orange (Protein), Light Blue (Carbs), Yellow (Fats), Green (Fiber).
* **Visual Color Perception Rule ("I can see colors, can't read em")**: The user relies on distinct, high-contrast visual colors rather than reading fine text. Macro colors (Protein = Orange, Carbs = Cyan, Fats = Yellow, Fiber = Green) must be distinct and scannable at a glance, while keeping text labels ultra-short and clutter-free.
* **Adaptive Button Architecture**: Use vertically stacked full-width buttons (`w-full`) for forms and settings, and single transformational CTAs for AI prompt flows based on the situation.
* **Simple Generic Naming Wins**: NEVER use wordy, fancy, or odd titles (e.g. avoid *"Track macros and micro nutrients by AI"* or *"Track your health measurements"*). ALWAYS use simple, 100% direct generic names that make instant sense without user confusion (e.g. *"Nutrients"*, *"Daily Vitals"*, *"Your Weight"*).
* **Editor & Popup Layout Rule (Natural Image Header + Sticky CTA Footer)**:
  * **Image Header (Non-Sticky)**: Image previews must sit at the top of the scroll container so they scroll up naturally. They should NEVER stay pinned at top consuming vertical viewport space.
  * **CTA Action Footer (Sticky)**: Primary save/log buttons stay docked at `sticky bottom-0` in a thin frosted bar for instant 1-tap submission from anywhere in the form.
* **Mobile Real-Estate & Anti-Containerization Rule**:
  * Mobile screen width is precious. NEVER waste horizontal real estate by nesting heavy side paddings (e.g. `px-6` + `p-5` + `p-4`).
  * Use lightweight edge padding (`px-2.5 sm:px-4`) and responsive card padding (`p-3.5 sm:p-5`) so input controls and text have maximum room to breathe.
* **No Redundant Category Badges in List Rows**:
  * Do NOT add cluttering category tags or extra pill badges (e.g. `[Macro]`) inside list rows when the section context is already clear. Keep list items clean and 1-line.
* **Smart Nutrient Decimal Formatting Rule**:
  * **Calories**: Display as whole integers (e.g. `450 kcal`).
  * **Macros & Micro-Nutrients**: Use `formatNutrientValue`. Whole numbers render clean as integers (`30g`), while decimal amounts render to 1 decimal place (`0.8g`, `2.4mcg`, `32.5g`) so micro-nutrients never round down to zero.
* **Health Sync AI-Only Rule**:
  * Do NOT add health sync widgets or extra burn metrics onto the main UI dashboard.
  * Keep Health Sync data strictly for background ChatGPT AI context and simple settings toggles, keeping the main UI 100% minimal and focused purely on AI meal logging.
* **Database & Payload Optimization Rules**:
  * **Client-Side Image Compression**: Always compress food photos with `compressImageBase64` (max 800px width, 0.75 quality) before saving to Supabase to prevent transferring multi-megabyte base64 strings.
  * **Query Row Limits**: Always append `.limit(150)` on `meals` startup and subscription queries so database sync executes sub-second (< 0.2s).

---

## ⚡️ 2. Dynamic UI & Contextual Space Reuse Mechanics
* **Transformational Inputs / Dynamic Space Overwriting**:
  * Action buttons (like AI Entry triggers) should morph directly into input text fields with an integrated primary CTA.
  * When an input mode is active (e.g., entering an AI prompt), temporarily replace/overwrite non-essential buttons below (e.g., close, next, continue, save) to reuse screen space and keep user focus entirely on the active task.

---

## 🚀 3. Performance & Model Execution
* **API Calls & Models**: Default to lightweight, fast models (e.g., Flash 3.5 / Gemini Flash models) for rapid API responses and snappy real-time UI interactions.
* **Performance & Polish**: Smooth numeric backspacing (`""` empty string state), modal portals (`z-[9999]`), locked mobile stat grids (`grid-cols-3`), and zero continuous bouncing/jittering animations.

---

## 🤖 4. Agent Orchestration & Context Strategy
* **Subagent Reuse**: Reuse existing subagents when building on top of gained context to save tokens and maintain deep context awareness.
* **Fresh Subagents**: Launch isolated, clean subagents when switching to non-overlapping feature domains or clean-room research.
* **Perfectionism & Verification**: Every change must be verified against these minimalist guidelines to ensure 100% visual and structural consistency across the entire app.
