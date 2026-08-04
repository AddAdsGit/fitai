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
    }))
    .filter((item) => item.isDefault || item.enabled);

  return list.map((item) =>
    item.id === "protein" && proteinGoal
      ? { ...item, target: proteinGoal }
      : item
  );
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
