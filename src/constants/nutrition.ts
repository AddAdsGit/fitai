import type { TrackedNutrient } from "../types";

// Single source of truth for the default tracked nutrients.
// Must stay in sync with the DB default on profiles.tracked_nutrients
// (supabase/migrations/20260715000000_dynamic_nutrients.sql).
export const CORE_NUTRIENT_IDS = ["protein", "carbs", "fats", "fiber"] as const;

export const DEFAULT_TRACKED_NUTRIENTS: TrackedNutrient[] = [
  { id: "protein", name: "Protein", target: 150, unit: "g", color: "#F97316", enabled: true, isDefault: true },
  { id: "carbs", name: "Carbs", target: 150, unit: "g", color: "#0891B2", enabled: true, isDefault: true },
  { id: "fats", name: "Fats", target: 60, unit: "g", color: "#EAB308", enabled: true, isDefault: true },
  { id: "fiber", name: "Fiber", target: 30, unit: "g", color: "#10B981", enabled: true, isDefault: true },
];

// Normalizes a profiles.tracked_nutrients value from the DB: falls back to
// defaults, marks core nutrients, drops disabled custom ones, and keeps the
// protein target in sync with the first-class protein_goal column.
export function normalizeTrackedNutrients(
  raw: unknown,
  proteinGoal?: number | null
): TrackedNutrient[] {
  let list = Array.isArray(raw) && raw.length > 0
    ? (raw as TrackedNutrient[])
    : DEFAULT_TRACKED_NUTRIENTS;

  list = list
    .map((item) => ({
      ...item,
      isDefault: (CORE_NUTRIENT_IDS as readonly string[]).includes(item.id),
      target: item.id === "protein" && proteinGoal ? proteinGoal : item.target
    }))
    .filter((item) => item.enabled !== false);

  return list;
}

// Derives the legacy {protein, carbs, fats, fiber} macro-target shape still
// used by parts of the UI from a tracked-nutrients list.
export function macroTargetsFromTracked(list: TrackedNutrient[]) {
  const target = (id: string, fallback: number) =>
    list.find((n) => n.id === id)?.target ?? fallback;
  return {
    protein: target("protein", 150),
    carbs: target("carbs", 150),
    fats: target("fats", 60),
    fiber: target("fiber", 30),
  };
}

export const STARTER_RECIPE_TEMPLATES = [
  {
    id: "starter_oats",
    name: "High-Protein Berry Oatmeal",
    time: "5 min",
    calories: 380,
    protein: 28,
    carbs: 48,
    fats: 8,
    fiber: 10,
    description: "Creamy warm oats with protein powder, chia seeds, and fresh berries.",
    tags: ["High Protein", "Quick Prep", "Homemade"],
    image: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&auto=format&fit=crop&q=80",
    ingredients: [
      { name: "Rolled Oats", amount: "50g" },
      { name: "Whey Protein Powder", amount: "30g" },
      { name: "Mixed Berries", amount: "80g" },
      { name: "Chia Seeds", amount: "10g" }
    ],
    instructions: ["Cook oats with water or milk.", "Stir in protein powder and chia seeds.", "Top with fresh berries."]
  },
  {
    id: "starter_chicken_bowl",
    name: "Grilled Chicken & Quinoa Bowl",
    time: "15 min",
    calories: 520,
    protein: 42,
    carbs: 45,
    fats: 14,
    fiber: 8,
    description: "Lean grilled chicken breast over fluffy quinoa and steamed broccoli.",
    tags: ["High Protein", "Homemade", "Best Meal for Me"],
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
    ingredients: [
      { name: "Chicken Breast", amount: "150g" },
      { name: "Cooked Quinoa", amount: "120g" },
      { name: "Steamed Broccoli", amount: "100g" },
      { name: "Olive Oil Dressing", amount: "1 tbsp" }
    ],
    instructions: ["Grill chicken breast until cooked through.", "Assemble over warm quinoa and steamed broccoli.", "Drizzle with olive oil."]
  },
  {
    id: "starter_egg_toast",
    name: "Avocado & Poached Egg Toast",
    time: "8 min",
    calories: 340,
    protein: 18,
    carbs: 26,
    fats: 18,
    fiber: 7,
    description: "Golden toasted whole grain bread with mashed avocado and 2 eggs.",
    tags: ["Quick Prep", "Homemade", "Vegetarian"],
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80",
    ingredients: [
      { name: "Whole Grain Bread", amount: "2 slices" },
      { name: "Fresh Avocado", amount: "1/2 avocado" },
      { name: "Eggs", amount: "2 large" },
      { name: "Sea Salt & Chili Flakes", amount: "1 pinch" }
    ],
    instructions: ["Toast bread slices to golden brown.", "Mash avocado onto toast with salt.", "Top with 2 poached or sunny-side-up eggs."]
  }
];
