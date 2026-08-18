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
* **Stacked Buttons over Shared-Width**: Prefer vertically stacked full-width buttons (`w-full`) over squeezed side-by-side buttons to guarantee readability, easy touch targets, and visual balance.
* **Simple Generic Naming Wins**: NEVER use wordy, fancy, or odd titles (e.g. avoid *"Track macros and micro nutrients by AI"* or *"Track your health measurements"*). ALWAYS use simple, 100% direct generic names that make instant sense without user confusion (e.g. *"Nutrients"*, *"Daily Vitals"*, *"Your Weight"*).
* **Editor & Popup Layout Rule (Natural Image Header + Sticky CTA Footer)**:
  * **Image Header (Non-Sticky)**: Image previews must sit at the top of the scroll container so they scroll up naturally. They should NEVER stay pinned at top consuming vertical viewport space.
  * **CTA Action Footer (Sticky)**: Primary save/log buttons stay docked at `sticky bottom-0` in a thin frosted bar for instant 1-tap submission from anywhere in the form.

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
