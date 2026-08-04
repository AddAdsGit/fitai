// Product-level constants. Define once here — never inline these in components.

// The published FitAI Custom GPT (users can override via the fitai_custom_gpt_url
// localStorage key, set in Settings).
export const DEFAULT_CUSTOM_GPT_URL =
  "https://chatgpt.com/g/g-6a4f69a8803c8191b29bc51494b65b1c-fitai";

export const TELEGRAM_BOT_URL = "https://t.me/FitAILoggerBot";

// Daily water goal in ml. If this ever becomes user-configurable it moves to
// profiles (DB) and this constant becomes the fallback only.
export const DAILY_WATER_GOAL_ML = 3000;

// Registered localStorage keys (all app storage must use the fitai_ prefix so
// handleLogout can wipe it wholesale).
export const LS_KEYS = {
  activeProfileId: "fitai_active_profile_id",
  customGptUrl: "fitai_custom_gpt_url",
  meals: "fitai_meals",
} as const;
