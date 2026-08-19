---
name: fitai-design-system
description: Strict UI/UX design system and minimalist aesthetics rules for FitAI application development.
---

# FitAI Minimalist Design System & UI/UX Guidelines

This skill enforces 100% visual consistency, minimal copy, elegant typography, and consistent component styling across every page, modal, and drawer in the FitAI codebase.

---

## 🎨 1. Core Color Palette Tokens

FitAI relies strictly on a warm, energetic, and clean color system. Never introduce random blue gradients, dark mode cards, or rainbow palettes.

| Color Role | Tailwind Class | Hex Value | Usage |
| :--- | :--- | :--- | :--- |
| **Page Background** | `bg-[#FAF7F2]` | `#FAF7F2` | Warm Cream background for all pages, screens, and modals |
| **Frosted Glass Cards** | `bg-white/60 backdrop-blur-md border border-white/80 shadow-xl shadow-orange-100/20 rounded-[32px]` | `#FFFFFF` (60%) | Primary content cards, panels, and modal containers |
| **Sub-Cards / Insets** | `bg-orange-50/30 border border-orange-100/50 rounded-2xl` | `#FFF7ED` | Inner nested controls, steppers, and input containers |
| **Primary Accent** | `bg-orange-500` / `text-orange-500` | `#F97316` | Main CTA buttons, active tab indicators, high-priority highlights |
| **Primary Espresso Text** | `text-orange-950` | `#431407` | Headings, bold numerical stats, card titles |
| **Secondary Text** | `text-orange-900/60` | `rgba(124, 45, 18, 0.6)` | Secondary labels, units (`g`, `kcal`, `kg`), subtitles |
| **Muted Metadata Text** | `text-orange-950/40` | `rgba(67, 20, 7, 0.4)` | Timestamps, step counts, subtle captions |

### Standard Macro Colors (Strictly Enforced)
* 🟠 **Protein**: Orange (`#F97316` / `text-orange-500`)
* 🔵 **Carbs**: Light Blue / Cyan (`#38BDF8` / `text-sky-500`)
* 🟡 **Fats**: Amber / Yellow (`#FBBF24` / `text-amber-500`)
* 🟢 **Fiber**: Emerald / Green (`#34D399` / `text-emerald-500`)

---

## ✍️ 2. Micro-Copy & Title Rules (Ultra-Minimalist)

1. **No Over-Complicated Titles or Subtitles**:
   * ❌ **Bad**: *"What should we call you so that the app and ChatGPT remember who you are and what you like?"*
   * ✅ **Good**: *"Your Name"*
   * ❌ **Bad**: *"Your daily progress dashboard based on what you ate and logged today"*
   * ✅ **Good**: *"Today's Progress"*

2. **Omit Redundant Section Labels**:
   * Do not put a label like `"AI Manual Meal Logger"` above an AI prompt textfield when the textfield placeholder already reads `"Describe what you ate or paste a recipe..."`.
   * Avoid double headers (e.g. Header Title + Card Title + Section Header saying the same thing).

3. **No Emoji / Icon Soup**:
   * ❌ **Never** use multi-colored emoji soup in section titles (e.g., `⚡️🔥 Log Your Meals Now 🥑🥗`).
   * Use clean **monochrome or single-tint SVG icons** (`Lucide-react`) that match the primary espresso or accent color palette.

---

## 🖼️ 3. Card & Layout Anatomy Rules

1. **Card Border Radius**:
   * Main Outer Container Cards: `rounded-[32px]`
   * Secondary Sub-Panels / Controls: `rounded-2xl`
   * Buttons & Input Pills: `rounded-2xl` or `rounded-full`

2. **Visual Hierarchy & Spacing**:
   * Page Padding: `p-4 sm:p-6 max-w-md mx-auto`
   * Section Gap: `space-y-4` or `space-y-6`
   * Card Internal Padding: `p-5` or `p-6`

3. **Buttons & Controls**:
   * Primary Button: `bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-200 active:scale-[0.98] transition-all`
   * Secondary Glass Button: `bg-white/80 hover:bg-white text-orange-950 font-bold text-xs py-3 px-4 rounded-2xl border border-orange-100 shadow-2xs active:scale-95 transition-all`
   * Icon Button: Circular `w-9 h-9 rounded-full bg-white/80 hover:bg-white text-orange-950 flex items-center justify-center border border-orange-100 shadow-2xs`

---

## 📱 4. Signature Dashboard Page Aesthetic Match

When designing or refining ANY new page (Settings, Insights, Recipes, Profile, Onboarding):
- Match the exact Warm Cream background (`#FAF7F2`) and frosted glassmorphic card depth of the Dashboard home page.
- Ensure the header, date picker, ring charts, and nutrient bars feel like a single cohesive product family.

---

## 🏆 5. The Truth-Teller Benchmark (Direct Dashboard Architecture)

This is the exact gold standard established by the main Dashboard screen:

1. **Date Selector Strip**:
   * Unselected Pill: Pure white soft card (`bg-white rounded-[22px] shadow-sm`), uppercase day label (`tue`), bold day number (`4`), lowercase month (`aug`).
   * Selected Active Pill: Vibrant Orange card (`bg-orange-500 rounded-[22px] text-white shadow-lg shadow-orange-200/60`).

2. **Calorie Ring Hero Gauge**:
   * Pure white inner circular disc (`bg-white rounded-full shadow-2xl shadow-orange-100/40`).
   * Thick energetic orange stroke (`#F97316` / `bg-orange-500`).
   * Centered bold espresso calorie number (`text-[38px] font-black text-orange-950 tracking-tight`).
   * Orange divider line + Target string (`/ 2,071 KCAL` in `text-xs font-black uppercase text-orange-900/60 tracking-wider`).

3. **Nutrient Tracking Card Layout**:
   * Card Container: `bg-white rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white`.
   * Grid Structure: 2-column or 2-row layout with uppercase label (`PROTEIN`, `CARBS`, `FATS`, `FIBER`) in dark espresso (`text-xs font-black tracking-widest text-orange-950`).
   * Values: Current numeric value highlighted in nutrient color (`78` orange, `125` cyan, `90` yellow, `6` green) + Target in muted taupe (`/ 140G`).
   * Progress Bar: Sleek 6px progress track with rounded pill indicator in exact nutrient color (`bg-orange-500`, `bg-sky-500`, `bg-amber-500`, `bg-emerald-500`).
   * Pure minimalism: No superfluous icons beside nutrient names. The bold typography and clean color bars create instant visual hierarchy without clutter.

---

## 🧘 6. Calm Empty States & Anti-Jitter Rule

* **No Bouncing / Shaking Icons**: Never apply continuous keyframe animations like `animate-bounce` or `animate-pulse` to empty state icons or empty charts (e.g. empty weight chart, empty meal list).
* **Calm Aesthetics**: Empty states must be still, steady, and calm (`text-orange-950/20` monochrome icon with `text-xs font-bold text-orange-900/40` caption). Never draw attention with distracting looped motion.

---

## 🎛️ 7. Unified Stepper Pill Anatomy Rule

* **Consistent Label Placement**: The parameter label MUST ALWAYS sit ABOVE the control pill container (`text-[9px] font-black tracking-widest text-stone-400 uppercase block px-1`).
* **Clean Pill Interior**: The inside of the pill container (`bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm`) is dedicated strictly to the control inputs (`[-]`, numeric typable input, unit string, `[+]`).
* **No Duplicate Inner Titles**: NEVER repeat the parameter title inside the pill container! (e.g. Do NOT put `[ Target Weight | [-] 70 kg [+] ]`). Keep every stepper pill across all steps 100% identical in structure.

---

## 🏷️ 8. AI Meal Tag Cards & Explicit Toggle Rule

* **No Ambiguous Pill Tags or Nested Touch Conflict Buttons**:
  * NEVER use tactile pill tags with invisible touch toggles or nested buttons inside buttons.
  * NEVER use redundant double-indicator glowing green dots alongside toggle switches.
* **Unified 1-Line Card Structure**:
  * ALWAYS use clean 1-line cards (`p-3.5 rounded-[22px] border bg-white shadow-2xs`).
  * Left Side: Bold Tag Name (`AI Meal Tags`) + AI Prompt Rule Description.
  * Right Side: Dedicated Pencil Icon (`<Pencil />`) to edit AI guidelines + Explicit Toggle Switch (`ON / OFF`) + `[ ✕ ]` Delete button.

---

## 🔢 9. Numeric Input Backspacing & Header Cleanliness Rules

* **Smooth Numeric Input Backspacing**:
  * ALWAYS render numeric inputs supporting empty string (`""`) state (`value={val === 0 ? "" : val}`).
  * NEVER use inline fallback defaults like `parseFloat(val) || 70` inside `onChange` that prevent complete backspacing and lock single digits.
* **Header Cleanliness**:
  * Section titles (*"Nutrient Tracking"*, *"Daily Vitals"*, *"AI Meal Tags"*) must remain 100% bold, clean, and un-cluttered.
  * NEVER add redundant `<Info />` icon buttons to self-explanatory section headers.

---

## 📱 10. Mandatory Bottom-Aligned Mobile Sheet Popups Standard

* **100% Bottom Sheet Mandate**: Every popup modal, confirmation dialog, settings alert, delete prompt, date/time picker, vitals drawer, and tool panel in FitAI MUST slide up as an iconic **Bottom-Aligned Mobile Sheet**.
* **Prohibition of Centered Dialogs**: Centered floating alert boxes (desktop modal pattern) are strictly prohibited.
* **Sheet Anatomy Guidelines**:
  * **Outer Wrapper**: `fixed inset-0 z-[99999] flex items-end justify-center font-sans` portaled to `document.body`.
  * **Backdrop Overlay**: `absolute inset-0 bg-stone-950/60 backdrop-blur-sm cursor-pointer touch-none` with click-outside to close.
  * **Top Corners**: `rounded-t-[36px]`.
  * **Top Drag Indicator Pill**: `<div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-1 shrink-0 select-none" />`.
  * **Background & Elevation**: Signature Warm Cream `#FAF7F2` (`bg-[#FAF7F2] border-t border-x border-stone-200/80 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]`).
  * **Animation**: Framer Motion spring slide-up `initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}` with `transition={{ type: "spring", damping: 28, stiffness: 280 }}`.
  * **Body Scroll Lock**: Automatically lock `document.body.style.overflow = "hidden"` and `touchAction = "none"` when mounted.
  * **Safe Area Bottom Padding**: `pb-[max(20px,env(safe-area-inset-bottom,20px))]` for all iPhone bottom home indicators.
  * **Invisible Native Scrollbars**: All scrollable sheets and inner cards must hide visible scrollbars (`scrollbar-width: none`, `-ms-overflow-style: none`, `::-webkit-scrollbar { display: none }`) to preserve native mobile app aesthetics.

