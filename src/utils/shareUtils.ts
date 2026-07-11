// FitAI Sharing Utilities — URL-safe JSON Compression & Base64 Coding

export interface SharedItemPayload {
  n: string;       // Name (e.g., "Protein Pancakes")
  c: number;       // Calories
  p: number;       // Protein
  cb: number;      // Carbs
  f: number;       // Fats
  fb?: number;     // Fiber
  img?: string;    // Image URL
  t?: string;      // Log Time / Prep Time
  ing?: string[];  // Ingredients (recipe only)
  ins?: string;    // Instructions (recipe only)
  tags?: string[]; // Tags (recipe only)
  mls?: { n: string; c: number }[]; // Meals list for day summary
  lc?: number;     // Log count (recipe only)
  d?: string;      // Description (recipe description or meal description)
}

/**
 * Compresses standard Meal or Recipe object into a lightweight payload
 */
export function compressMeal(meal: any): SharedItemPayload {
  return {
    n: meal.name,
    c: Number(meal.calories || 0),
    p: Number(meal.protein || 0),
    cb: Number(meal.carbs || 0),
    f: Number(meal.fats || 0),
    fb: Number(meal.fiber || 0),
    img: meal.image || undefined,
    t: meal.time || undefined,
    d: meal.meal_description || undefined,
  };
}

export function compressRecipe(recipe: any): SharedItemPayload {
  return {
    n: recipe.name,
    c: Number(recipe.calories || 0),
    p: Number(recipe.protein || 0),
    cb: Number(recipe.carbs || 0),
    f: Number(recipe.fats || 0),
    fb: Number(recipe.fiber || 0),
    img: recipe.image || undefined,
    t: recipe.time || undefined,
    ing: recipe.ingredients || undefined,
    ins: recipe.instructions || undefined,
    tags: recipe.tags || undefined,
    lc: recipe.log_count || undefined,
    d: recipe.description || undefined,
  };
}

/**
 * Decompresses raw payload back to standard types
 */
export function decompressToMeal(payload: SharedItemPayload, id?: string): any {
  return {
    id: id || "meal_" + Date.now(),
    name: payload.n,
    calories: payload.c,
    protein: payload.p,
    carbs: payload.cb,
    fats: payload.f,
    fiber: payload.fb || 0,
    image: payload.img || "",
    time: payload.t || "12:00 PM",
    type: "Imported",
    date: new Date().toISOString().split("T")[0],
    meal_description: payload.d || "",
  };
}

export function decompressToRecipe(payload: SharedItemPayload, id?: string): any {
  return {
    id: id || "recipe_" + Date.now(),
    name: payload.n,
    calories: payload.c,
    protein: payload.p,
    carbs: payload.cb,
    fats: payload.f,
    fiber: payload.fb || 0,
    image: payload.img || "",
    time: payload.t || "15 mins",
    ingredients: payload.ing || [],
    instructions: payload.ins || "",
    tags: payload.tags || ["Imported"],
    micros: [],
    log_count: payload.lc || 0,
    description: payload.d || "",
  };
}

/**
 * Base64 helper safe for Unicode characters (supports emojis / special characters in names)
 */
export function encodePayloadToBase64(payload: SharedItemPayload): string {
  try {
    const jsonStr = JSON.stringify(payload);
    return btoa(
      encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
  } catch (e) {
    console.error("Error encoding share payload:", e);
    return "";
  }
}

export function decodeBase64ToPayload(base64: string): SharedItemPayload | null {
  try {
    const decoded = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(decoded);
  } catch (e) {
    console.error("Error decoding share payload:", e);
    return null;
  }
}

/**
 * Helper to build the share URL on fitpush.vercel.app
 */
export function generateShareUrl(
  type: "meal" | "recipe" | "day",
  payload: SharedItemPayload,
  dbShareId?: string
): string {
  const baseUrl = window.location.origin;
  if (dbShareId) {
    return `${baseUrl}/?shareId=${dbShareId}`;
  }
  const code = encodePayloadToBase64(payload);
  return `${baseUrl}/?share=${type}&data=${code}`;
}
