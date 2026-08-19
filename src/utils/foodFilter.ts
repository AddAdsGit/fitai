import type { Meal, Recipe, TrackedNutrient } from "../types";

export type SortDirection = "desc" | "asc";

export interface FoodFilterState {
  search: string;
  selectedTags: string[]; // Dietary tags (multi-select)
  sortField: string; // "date" | "log-count" | "calories" | "name" | `${nutrientId}`
  sortDirection: SortDirection; // "desc" | "asc"
  showRecipes?: boolean;
  showLogs?: boolean;
}

export const INITIAL_FOOD_FILTER_STATE: FoodFilterState = {
  search: "",
  selectedTags: [],
  sortField: "date",
  sortDirection: "desc",
  showRecipes: true,
  showLogs: true,
};

const STORAGE_KEY = "fitai_food_filter_state";

export function loadSavedFoodFilters(): FoodFilterState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...INITIAL_FOOD_FILTER_STATE,
        ...parsed,
        search: "", // Never lock search across reloads
      };
    }
  } catch (_) {}
  return INITIAL_FOOD_FILTER_STATE;
}

export function saveFoodFilters(filters: FoodFilterState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedTags: filters.selectedTags || [],
        sortField: filters.sortField || "date",
        sortDirection: filters.sortDirection || "desc",
        showRecipes: filters.showRecipes ?? true,
        showLogs: filters.showLogs ?? true,
      })
    );
  } catch (_) {}
}

// Count active filters (only dietary tags and custom sort parameters)
export function getActiveFilterCount(state?: FoodFilterState): number {
  if (!state) return 0;
  let count = 0;
  if (state.sortField && (state.sortField !== "date" || state.sortDirection !== "desc")) count += 1;
  if (state.selectedTags && Array.isArray(state.selectedTags) && state.selectedTags.length > 0) {
    count += state.selectedTags.length;
  }
  return count;
}

// Safely extract nutrient value from meal or recipe
export function getFoodNutrientValue(item?: Recipe | Meal | null, nutrientId?: string): number {
  if (!item || !nutrientId) return 0;

  // 1. Check jsonb nutrients map
  if ("nutrients" in item && item.nutrients && item.nutrients[nutrientId] !== undefined) {
    return Number(item.nutrients[nutrientId]) || 0;
  }

  // 2. Check top-level properties (protein, calories, carbs, fats, fiber)
  if (nutrientId in item) {
    return Number((item as any)[nutrientId]) || 0;
  }

  return 0;
}

// Safely extract calories
export function getFoodCalories(item?: Recipe | Meal | null): number {
  if (!item) return 0;
  return Number(item.calories) || 0;
}

// Safely extract timestamp
export function getFoodTimestamp(item?: Recipe | Meal | null): number {
  if (!item) return 0;
  if ("date" in item && item.date) {
    try {
      const d = new Date(String(item.date).includes("T") ? item.date : `${item.date}T00:00:00`);
      if (!isNaN(d.getTime())) return d.getTime();
    } catch {
      // fallback
    }
  }
  if (item.id) {
    const match = String(item.id).match(/\d{10,}/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }
  return 0;
}

// Super Simplified Food Filter & Sort Engine (Defensive Safeguards)
export function filterAndSortFoods<T extends Recipe | Meal>(
  items?: T[] | null,
  filters?: FoodFilterState | null,
  frequencyMap?: Record<string, number>,
  _trackedNutrients: TrackedNutrient[] = []
): T[] {
  if (!Array.isArray(items)) return [];
  if (!filters) return items.slice();

  const search = filters.search || "";
  const sortField = filters.sortField || "date";
  const sortDirection = filters.sortDirection || "desc";
  const selectedTags = Array.isArray(filters.selectedTags) ? filters.selectedTags : [];
  const q = search.trim().toLowerCase();

  // 1. FILTER PASS (Search Query & Selected Tags)
  const filtered = items.filter((item) => {
    if (!item) return false;

    // Search query matching (Name, Description, Ingredients, Type, Tags)
    if (q) {
      const nameMatch = (item.name || "").toLowerCase().includes(q);
      const descMatch = (
        ("description" in item ? item.description : "") ||
        ("meal_description" in item ? item.meal_description : "") ||
        ""
      )
        .toLowerCase()
        .includes(q);

      const typeMatch = (("type" in item ? item.type : "") || "").toLowerCase().includes(q);

      const tagMatch = Array.isArray(item.tags)
        ? item.tags.some((t) => t && String(t).toLowerCase().includes(q))
        : false;

      const ingMatch =
        "ingredients" in item && Array.isArray(item.ingredients)
          ? item.ingredients.some((ing) => ing && String(ing).toLowerCase().includes(q))
          : false;

      if (!nameMatch && !descMatch && !typeMatch && !tagMatch && !ingMatch) {
        return false;
      }
    }

    // Tag Matching (All selected tags must be present)
    if (selectedTags.length > 0) {
      const itemTags = Array.isArray(item.tags) ? item.tags.map((t) => String(t).toLowerCase()) : [];
      const hasAllTags = selectedTags.every((st) => itemTags.includes(String(st).toLowerCase()));
      if (!hasAllTags) return false;
    }

    return true;
  });

  // 2. SORT PASS (Single Attribute + Direction)
  return filtered.sort((a, b) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    const isAsc = sortDirection === "asc";
    const multiplier = isAsc ? 1 : -1;

    const nameA = (a.name || "").trim().toLowerCase();
    const nameB = (b.name || "").trim().toLowerCase();

    // Log count extraction
    const countA = frequencyMap
      ? frequencyMap[nameA] || ("log_count" in a ? a.log_count || 1 : 1)
      : "log_count" in a
      ? a.log_count || 1
      : 1;

    const countB = frequencyMap
      ? frequencyMap[nameB] || ("log_count" in b ? b.log_count || 1 : 1)
      : "log_count" in b
      ? b.log_count || 1
      : 1;

    if (sortField === "date") {
      const timeDiff = getFoodTimestamp(a) - getFoodTimestamp(b);
      if (timeDiff !== 0) return timeDiff * multiplier;
      return (countA - countB) * multiplier;
    }

    if (sortField === "log-count") {
      const diff = countA - countB;
      if (diff !== 0) return diff * multiplier;
      return nameA.localeCompare(nameB);
    }

    if (sortField === "calories") {
      const diff = getFoodCalories(a) - getFoodCalories(b);
      if (diff !== 0) return diff * multiplier;
      return nameA.localeCompare(nameB);
    }

    if (sortField === "name") {
      return nameA.localeCompare(nameB) * multiplier;
    }

    // Dynamic nutrient sort (e.g. protein, fiber, carbs, fats, sugar, sodium, etc.)
    const valA = getFoodNutrientValue(a, sortField);
    const valB = getFoodNutrientValue(b, sortField);
    const diff = valA - valB;
    if (diff !== 0) return diff * multiplier;
    return nameA.localeCompare(nameB);
  });
}

const EXCLUDED_MACRO_TAGS = new Set([
  "high protein",
  "low carb",
  "high fiber",
  "low calorie",
  "protein",
  "carbs",
  "fats",
  "fiber",
  "calories",
  "caffeine",
  "sugar",
  "sodium",
]);

// Extract active AI tracking tags enabled by the user in Edit Profile / Onboarding
export function getUserActiveAiTags(
  trackingTags?: (string | { id?: string; name?: string; enabled?: boolean })[]
): string[] {
  const DEFAULT_ACTIVE = [
    "Best Meal for Me",
    "Homemade",
    "Outside Food",
    "Vegan",
  ];

  if (!Array.isArray(trackingTags) || trackingTags.length === 0) {
    return DEFAULT_ACTIVE;
  }

  const tags: string[] = [];
  trackingTags.forEach((t) => {
    let tagName = "";
    if (typeof t === "string") {
      if (t.trim() && !t.includes("/") && t !== "onboarded") {
        tagName = t.trim();
      }
    } else if (t && typeof t === "object") {
      if (t.enabled !== false && t.name && t.name.trim()) {
        tagName = t.name.trim();
      }
    }
    if (tagName && !EXCLUDED_MACRO_TAGS.has(tagName.toLowerCase())) {
      tags.push(tagName);
    }
  });

  return tags.length > 0 ? Array.from(new Set(tags)) : DEFAULT_ACTIVE;
}


