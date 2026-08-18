import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import type { Profile } from "../types";
import { DEFAULT_TRACKED_NUTRIENTS } from "../constants/nutrition";

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
  if (!apiKey) return "gemini-2.5-flash";

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const modelsList: Array<{ name: string; supportedGenerationMethods?: string[] }> = data.models || [];
      const supportedNames = modelsList
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""));

      const priorityPatterns = [
        /^gemini-2\.5-flash$/i,
        /^gemini-3\.5-flash$/i,
        /^gemini-3\.6-flash$/i,
        /^gemini-2\.5-flash-lite/i,
        /^gemini-flash-latest$/i,
        /^gemini-1\.5-flash/i,
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
    console.warn("[Gemini API] Dynamic model fetch fallback to gemini-2.5-flash:", e);
  }

  cachedBestModel = "gemini-2.5-flash";
  return "gemini-2.5-flash";
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

// Safe Decimal Number Parsing Utility
const parseNum = (val: any): number => {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return isNaN(parsed) ? 0 : Math.round(parsed * 10) / 10;
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

  // Build dynamic list of active nutrients from parameters or profileData or default
  const activeNutrients = trackedNutrients.length > 0
    ? trackedNutrients
    : (profileData?.tracked_nutrients && profileData.tracked_nutrients.length > 0)
    ? profileData.tracked_nutrients.filter((n: any) => n.enabled ?? true)
    : DEFAULT_TRACKED_NUTRIENTS;

  const nutrientListStr = activeNutrients
    .map((n) => `"${n.id}": (${n.name} in ${n.unit})`)
    .join(", ");

  const sampleNutrientObj: Record<string, number> = {};
  activeNutrients.forEach((n) => {
    if (n.id === "protein") sampleNutrientObj.protein = 32;
    else if (n.id === "carbs") sampleNutrientObj.carbs = 40;
    else if (n.id === "fats") sampleNutrientObj.fats = 14;
    else if (n.id === "fiber") sampleNutrientObj.fiber = 6;
    else sampleNutrientObj[n.id] = 10;
  });

  const promptText = `You are a world-class AI nutritionist. Analyze this food/beverage photo carefully.
User notes: "${notes.trim()}".

Task:
1. Determine if the main subject is edible food or a beverage. If NOT food (e.g. pen, keys, phone, desk, shoes, furniture), return JSON: {"isFood": false, "name": "Non-food item", "confidenceScore": 15}.
2. If it IS food:
   - Identify the exact dish name (e.g., "Grilled Chicken Salad with Avocado").
   - Write a concise 1-sentence description of ingredients and preparation (e.g., "Fresh grilled chicken breast over mixed greens, cherry tomatoes, and avocado.").
   - Estimate total calories (kcal).
   - Estimate confidence score (0-100).
   - Provide clean dietary tags (e.g. ["High Protein", "Gluten Free"]).
   - Estimate numerical values for ALL user-tracked nutrients: ${nutrientListStr}. Always include protein, carbs, fats, and fiber.

Return ONLY a valid JSON object in this format:
{"isFood": true, "name": "...", "meal_description": "...", "confidenceScore": 92, "calories": 450, "tags": ["High Protein"], "nutrients": ${JSON.stringify(sampleNutrientObj)}}`;

  let responseData: any = null;

  // 1. Try Supabase Edge Function first if configured (1.5s timeout)
  if (isSupabaseConfigured) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const { data, error } = await supabase.functions.invoke("gemini", {
        body: {
          prompt: promptText,
          image: cleanBase64,
          mimeType,
        },
        headers: {
          "Signal": controller.signal as any
        }
      });

      clearTimeout(timeoutId);

      if (!error && data) {
        responseData = data;
      }
    } catch (err) {
      console.warn("[AI Photo] Edge function skipped, moving to direct API call:", err);
    }
  }

  let lastApiErrorMessage = "";

  // 2. Direct Call to Google Gemini Flash models with robust fallback & clear error messages
  if (!responseData && key) {
    const candidateModels = ["gemini-2.5-flash", "gemini-1.5-flash"];
    for (const modelName of candidateModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: promptText },
                  { inline_data: { mime_type: mimeType, data: cleanBase64 } },
                ],
              }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 300,
                responseMimeType: "application/json"
              }
            }),
          }
        );

        if (res.ok) {
          responseData = await res.json();
          break;
        } else {
          const errData = await res.json().catch(() => null);
          lastApiErrorMessage = errData?.error?.message || `HTTP ${res.status}`;
          console.warn(`[AI Photo] ${modelName} returned ${res.status}: ${lastApiErrorMessage}`);
          if (res.status === 400 || res.status === 403) {
            break;
          }
        }
      } catch (err: any) {
        lastApiErrorMessage = err?.message || "Network error";
        console.error(`[AI Photo] Fetch error for ${modelName}:`, err);
      }
    }
  }

  if (!responseData) {
    if (lastApiErrorMessage) {
      throw new Error(`Gemini API Error: ${lastApiErrorMessage}. Please check your key in Settings.`);
    }
    if (!key) {
      throw new Error("No Gemini API key found. Please enter your API key in Settings -> Google Gemini API.");
    }
    throw new Error("AI photo analysis service unavailable. Please verify your network connection or API key.");
  }

  const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || responseData?.text || "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Could not parse food recognition JSON response.");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const p = parseNum(parsed.nutrients?.protein ?? parsed.protein);
  const c = parseNum(parsed.nutrients?.carbs ?? parsed.carbs);
  const f = parseNum(parsed.nutrients?.fats ?? parsed.fats);
  const fib = parseNum(parsed.nutrients?.fiber ?? parsed.fiber);

  // Build complete dynamic nutrient map containing all tracked nutrients & custom items
  const dynamicNutrientMap: Record<string, number> = {
    protein: p,
    carbs: c,
    fats: f,
    fiber: fib,
  };

  const rawParsedNutrients = parsed.nutrients || {};
  Object.keys(rawParsedNutrients).forEach((k) => {
    dynamicNutrientMap[k] = parseNum(rawParsedNutrients[k]);
  });
  Object.keys(parsed).forEach((k) => {
    if (!["isFood", "name", "confidenceScore", "calories", "tags", "nutrients", "meal_description"].includes(k)) {
      if (typeof parsed[k] === "number" || (typeof parsed[k] === "string" && !isNaN(parseFloat(parsed[k])))) {
        dynamicNutrientMap[k] = parseNum(parsed[k]);
      }
    }
  });

  const rawTags = Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : ["Photo Log"];
  const cleanTags = rawTags.map((t: string) =>
    t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim()
  ).filter(Boolean);

  const cal = parseNum(parsed.calories) || Math.round(p * 4 + c * 4 + f * 9);

  return {
    isFood: parsed.isFood !== false,
    name: parsed.name || "Analyzed Meal",
    confidenceScore: parseNum(parsed.confidenceScore) || 85,
    calories: cal,
    protein: p,
    carbs: c,
    fats: f,
    fiber: fib,
    nutrients: dynamicNutrientMap,
    tags: cleanTags,
    meal_description: parsed.meal_description || notes.trim() || "AI Photo Recognition Log",
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

  const activeNutrients = trackedNutrients.length > 0
    ? trackedNutrients
    : (profileData?.tracked_nutrients && profileData.tracked_nutrients.length > 0)
    ? profileData.tracked_nutrients.filter((n: any) => n.enabled ?? true)
    : DEFAULT_TRACKED_NUTRIENTS;

  const nutrientListStr = activeNutrients
    .map((n) => `"${n.id}": (${n.name} in ${n.unit})`)
    .join(", ");

  const sampleNutrientObj: Record<string, number> = {};
  activeNutrients.forEach((n) => {
    sampleNutrientObj[n.id] = (currentMeal.nutrients && currentMeal.nutrients[n.id]) !== undefined
      ? parseNum(currentMeal.nutrients[n.id])
      : 10;
  });

  const promptText = `Current meal: "${currentMeal.name}" (${currentMeal.calories} kcal).
Description: "${currentMeal.meal_description || ""}".
Nutrients: ${JSON.stringify(currentMeal.nutrients || {})}.
Tags: ${JSON.stringify(currentMeal.tags || [])}.

User refinement instruction: "${refinePrompt.trim()}".

Recalculate updated meal name, new total calories (kcal), updated meal description, updated clean dietary tags, and updated values for ALL tracked nutrients: ${nutrientListStr}.
Return ONLY valid JSON:
{"name": "...", "calories": 0, "meal_description": "...", "tags": ["High Protein"], "nutrients": ${JSON.stringify(sampleNutrientObj)}}`;

  let responseData: any = null;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke("gemini", {
        body: { prompt: promptText },
      });
      if (!error && data) responseData = data;
    } catch (err) {
      console.warn("[AI Refine] Supabase invoke failed, falling back to direct key:", err);
    }
  }

  if (!responseData && key) {
    const modelName = await getBestGeminiModel(key);
    try {
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
      if (res.ok) responseData = await res.json();
    } catch (err) {
      console.error("[AI Refine] Direct Gemini API call failed:", err);
    }
  }

  if (!responseData) throw new Error("Meal refinement AI service unavailable.");

  const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || responseData?.text || "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse refined meal object.");

  const parsed = JSON.parse(jsonMatch[0]);
  const parsedNutrients = parsed.nutrients || {};

  const dynamicNutrientMap: Record<string, number> = {};
  Object.keys(parsedNutrients).forEach((k) => {
    dynamicNutrientMap[k] = parseNum(parsedNutrients[k]);
  });

  return {
    name: parsed.name,
    calories: parseNum(parsed.calories),
    meal_description: parsed.meal_description,
    tags: parsed.tags,
    nutrients: dynamicNutrientMap,
    protein: parseNum(parsedNutrients.protein ?? parsed.protein),
    carbs: parseNum(parsedNutrients.carbs ?? parsed.carbs),
    fats: parseNum(parsedNutrients.fats ?? parsed.fats),
    fiber: parseNum(parsedNutrients.fiber ?? parsed.fiber),
  };
};
