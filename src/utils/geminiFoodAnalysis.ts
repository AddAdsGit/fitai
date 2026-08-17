import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import type { Profile } from "../types";

export const resolveGeminiApiKey = (profileData?: Profile): string => {
  const geminiKeyTag = (profileData?.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
  const prefKey = geminiKeyTag.split(":")[1] || "";
  if (prefKey.trim()) return prefKey.trim();

  const envKey = (import.meta.env as any)?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim()) return envKey.trim();

  if (typeof window !== "undefined") {
    const localKey = localStorage.getItem("gemini_api_key") || localStorage.getItem("fitai_gemini_api_key");
    if (localKey && localKey.trim()) return localKey.trim();
  }

  return "";
};

let cachedBestModel: string | null = null;

export const getBestGeminiModel = async (apiKey?: string): Promise<string> => {
  if (cachedBestModel) return cachedBestModel;
  if (!apiKey) return "gemini-2.0-flash";

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const modelsList: Array<{ name: string; supportedGenerationMethods?: string[] }> = data.models || [];
      const supportedNames = modelsList
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""));

      // Prefer Flash models for interactive food-photo logging. Do not select
      // Pro/preview models first: free-tier projects commonly have no quota
      // for those models even when Flash is available.
      const priorityPatterns = [
        /^gemini-2\.5-flash-lite/i,
        /^gemini-2\.5-flash$/i,
        /^gemini-2\.0-flash$/i,
        /^gemini-2\.0-flash-lite/i,
        /^gemini-2\.0/i,
        /^gemini-1\.5-flash/i,
        /^gemini-3\..*flash/i,
      ];

      for (const pattern of priorityPatterns) {
        const found = supportedNames.find((n) => pattern.test(n));
        if (found) {
          cachedBestModel = found;
          return found;
        }
      }
    }
  } catch (e) {
    console.warn("[Gemini API] Dynamic model fetch fallback to gemini-2.0-flash:", e);
  }

  cachedBestModel = "gemini-2.0-flash";
  return "gemini-2.0-flash";
};

export const listAvailableGeminiModels = async (apiKey: string) => {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      return (data.models || []).map((m: any) => ({
        name: m.name.replace(/^models\//, ""),
        displayName: m.displayName || m.name,
        description: m.description,
        supportedMethods: m.supportedGenerationMethods || [],
      }));
    }
  } catch (err) {
    console.error("Error listing Gemini models:", err);
  }
  return [];
};

export interface AnalyzeFoodPhotoOptions {
  imageBase64: string;
  notes?: string;
  trackedNutrients?: Array<{ id: string; name: string; unit: string }>;
  profileData?: Profile;
}

export interface FoodAnalysisResult {
  isFood: boolean;
  name: string;
  confidenceScore: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  nutrients: Record<string, number>;
  tags: string[];
  meal_description: string;
}

export const analyzeFoodPhotoWithAI = async ({
  imageBase64,
  notes = "",
  trackedNutrients = [],
  profileData,
}: AnalyzeFoodPhotoOptions): Promise<FoodAnalysisResult> => {
  if (!imageBase64) {
    throw new Error("No photo provided for AI recognition.");
  }

  const key = resolveGeminiApiKey(profileData);
  const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  const mimeType = imageBase64.includes(";") ? imageBase64.split(";")[0].split(":")[1] || "image/jpeg" : "image/jpeg";

  const nutrientListStr = trackedNutrients.length > 0
    ? trackedNutrients.map((n) => `"${n.id}": (${n.name} in ${n.unit})`).join(", ")
    : `"protein": (Protein in g), "carbs": (Carbohydrates in g), "fats": (Fats in g), "fiber": (Dietary Fiber in g)`;

  const promptText = `You are a world-class AI nutritionist. Analyze this food/beverage photo carefully.
User notes: "${notes.trim()}".

Task:
1. Determine if the main subject is edible food or a beverage. If NOT food (e.g. pen, keys, phone, desk, shoes, furniture), return JSON: {"isFood": false, "name": "Non-food item", "confidenceScore": 15}.
2. If it IS food:
   - Identify the exact dish name (e.g., "Grilled Chicken Salad with Avocado").
   - Estimate total calories (kcal).
   - Estimate confidence score (0-100).
   - Provide clean dietary tags (e.g. ["High Protein", "Gluten Free"]).
   - Estimate all tracked nutrients: ${nutrientListStr}. Ensure "fiber" is always included.

Return ONLY a valid JSON object in this format:
{"isFood": true, "name": "...", "confidenceScore": 92, "calories": 450, "tags": ["High Protein"], "nutrients": {"protein": 32, "carbs": 40, "fats": 14, "fiber": 6}}`;

  let responseData: any = null;

  // 1. Direct Gemini API call if key exists
  if (key) {
    const modelName = await getBestGeminiModel(key);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                { inline_data: { mime_type: mimeType, data: cleanBase64 } },
              ],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Gemini API call failed with status ${res.status}`);
    }

    responseData = await res.json();
  } else if (isSupabaseConfigured) {
    // 2. Supabase Edge Function fallback
    const { data, error } = await supabase.functions.invoke("gemini", {
      body: {
        prompt: promptText,
        image: cleanBase64,
        mimeType,
      },
    });

    if (error || !data) {
      throw new Error("No Gemini API key found. Please add your API key in Settings -> Gemini AI.");
    }
    responseData = data;
  } else {
    throw new Error("Gemini API key missing. Please configure your Gemini API Key in Settings to scan food photos.");
  }

  const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || responseData?.text || "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Could not parse AI nutritional recognition from photo. Please try again.");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const parsedNutrients = parsed.nutrients || {};

  const p = parseInt(parsedNutrients.protein || parsed.protein) || 0;
  const c = parseInt(parsedNutrients.carbs || parsed.carbs) || 0;
  const f = parseInt(parsedNutrients.fats || parsed.fats) || 0;
  const fib = parseInt(parsedNutrients.fiber || parsed.fiber) || 0;

  const dynamicNutrientMap: Record<string, number> = {
    protein: p,
    carbs: c,
    fats: f,
    fiber: fib,
    ...parsedNutrients,
  };

  const rawTags = Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : ["Photo Log"];
  const cleanTags = rawTags.map((t: string) =>
    t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim()
  ).filter(Boolean);

  return {
    isFood: parsed.isFood !== false,
    name: parsed.name || "Analyzed Meal",
    confidenceScore: parsed.confidenceScore || 85,
    calories: parseInt(parsed.calories) || Math.round(p * 4 + c * 4 + f * 9),
    protein: p,
    carbs: c,
    fats: f,
    fiber: fib,
    nutrients: dynamicNutrientMap,
    tags: cleanTags,
    meal_description: notes.trim() || "AI Photo Recognition Log",
  };
};

export interface RefineMealOptions {
  currentMeal: {
    name: string;
    calories: number;
    meal_description?: string;
    nutrients?: Record<string, number>;
    tags?: string[];
  };
  refinePrompt: string;
  trackedNutrients?: Array<{ id: string; name: string; unit: string }>;
  profileData?: Profile;
}

export const refineMealWithAI = async ({
  currentMeal,
  refinePrompt,
  trackedNutrients = [],
  profileData,
}: RefineMealOptions): Promise<Partial<FoodAnalysisResult>> => {
  const key = resolveGeminiApiKey(profileData);
  if (!key && !isSupabaseConfigured) {
    throw new Error("Gemini API key missing. Please configure your Gemini API Key in Settings.");
  }

  const nutrientListStr = trackedNutrients.length > 0
    ? trackedNutrients.map((n) => `"${n.id}": (${n.name} in ${n.unit})`).join(", ")
    : `"protein": (g), "carbs": (g), "fats": (g), "fiber": (g)`;

  const promptText = `Current meal: "${currentMeal.name}" (${currentMeal.calories} kcal).
Description: "${currentMeal.meal_description || ""}".
Nutrients: ${JSON.stringify(currentMeal.nutrients || {})}.
Tags: ${JSON.stringify(currentMeal.tags || [])}.

User refinement instruction: "${refinePrompt.trim()}".

Recalculate updated meal name, new total calories (kcal), updated meal description, updated tags, and updated nutrients: ${nutrientListStr}. Include "fiber".
Return ONLY valid JSON:
{"name": "...", "calories": 0, "meal_description": "...", "tags": ["High Protein"], "nutrients": {"protein": 0, "carbs": 0, "fats": 0, "fiber": 0}}`;

  let responseData: any = null;

  if (key) {
    const modelName = await getBestGeminiModel(key);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      }
    );
    if (!res.ok) throw new Error("Gemini refinement API call failed.");
    responseData = await res.json();
  } else if (isSupabaseConfigured) {
    const { data, error } = await supabase.functions.invoke("gemini", {
      body: { prompt: promptText },
    });
    if (error || !data) throw new Error("Gemini refinement failed via backend.");
    responseData = data;
  }

  const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || responseData?.text || "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse refined meal object.");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    name: parsed.name,
    calories: parseInt(parsed.calories),
    meal_description: parsed.meal_description,
    tags: parsed.tags,
    nutrients: parsed.nutrients,
  };
};
