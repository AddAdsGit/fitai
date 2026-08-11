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
