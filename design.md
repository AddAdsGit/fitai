# FitAI Design Architecture & Preferences Index

For complete and authoritative UI/UX design specifications, minimalism rules, and user preferences, please refer to the primary memory files:

1. [AGENTS.md](file:///Users/puttamanikanta/projects/FIT/.agents/AGENTS.md) — Custom workspace rules & core design system constraints.
2. [USER_PREFERENCES.md](file:///Users/puttamanikanta/projects/FIT/.agents/USER_PREFERENCES.md) — Explicit user preferences (radical minimalism, zero emojis, restrained colors, stacked buttons, dynamic space reuse UI, performance/model settings).
3. [fitai-design-system SKILL.md](file:///Users/puttamanikanta/projects/FIT/.agents/skills/fitai-design-system/SKILL.md) — Detailed design system tokens and truth-teller benchmark.

---

# FitAI — Share Card Design Guidelines

For UI/UX design specifications, minimalism rules, and user preferences, refer to:
1. [AGENTS.md](file:///Users/puttamanikanta/projects/FIT/.agents/AGENTS.md) — Custom workspace rules & core design system constraints.
2. [USER_PREFERENCES.md](file:///Users/puttamanikanta/projects/FIT/.agents/USER_PREFERENCES.md) — Radical minimalism, clean typography, zero clutter.
3. [src/constants/brand.ts](file:///Users/puttamanikanta/projects/FIT/src/constants/brand.ts) — Single Source of Truth for the Brand Logo and core palette.

---

## 🎨 Core Share Card Philosophy
1. **True to the App:** Share cards reflect FitAI's authentic dashboard and editorial design rather than artificial over-designed templates.
2. **Single Brand Logo Source of Truth:** All cards and screens import the canonical flame logo and brand tokens from `src/constants/brand.ts`.
3. **Clean Canvas Margins:** Strict 80px outer padding so text and graphics never touch screen edges on export (`1080x1080` Square or `1080x1920` Story).
4. **Dynamic Anti-Overlap Spacing:** Text positions are calculated dynamically to prevent overlapping.
5. **Native Mobile Modal:** Bottom-aligned warm cream sheet with 1-tap native file sharing (`navigator.share`), download PNG, and copy link.

