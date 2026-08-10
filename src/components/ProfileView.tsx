import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen, BarChart2, Target, Search, Filter, X, Utensils,
  Plus, Minus, Sparkles, Check, Info, Scale, Ruler, Database, Camera,
  User, Smile, ChevronDown, Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import type { Meal, Recipe, WeightLog } from "../types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { hasNoGeneratedImage, getMealEmoji } from "../utils/helpers";
import { normalizeTrackedNutrients, DEFAULT_TRACKED_NUTRIENTS as DEFAULT_NUTRIENT_CONSTANTS } from "../constants/nutrition";
import { InsightsView } from "./InsightsView";
import { DefaultAvatar } from "./DefaultAvatar";
import { DEFAULT_TRACKING_TAGS } from "./SettingsView";

const RecipeImage = ({ src, alt, fallbackEmoji }: { src: string; alt: string; fallbackEmoji: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="absolute inset-0 w-full h-full">
      <div className="absolute inset-0 bg-[#F4F3EF]/90 flex items-center justify-center select-none z-0">
        <span className="text-4xl filter drop-shadow-xs opacity-[0.85]">{fallbackEmoji}</span>
      </div>
      {!error && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover pointer-events-none transition-all duration-700 z-10",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
};

export const ProfileView = ({
  profileData,
  setProfileData,
  setActiveTab,
  recipes,
  setRecipes,
  onAddMeal,
  openGoalConfig,
  openRecipeDetails,
  triggerToast,
  activeProfileId,
  currentStreak,
  mealsState,
  weightLogs = [],
  onLogWeight,
  onDeleteWeight,
  onLogout,
}: {
  key?: string;
  profileData: any;
  setProfileData: any;
  setActiveTab: (tab: string) => void;
  recipes: Recipe[];
  setRecipes: any;
  onAddMeal: (recipeOrMeal: any) => void;
  openGoalConfig: (type: "dailyCalories" | "weightGoal") => void;
  openRecipeDetails: (recipe: Recipe) => void;
  triggerToast: (msg: string) => void;
  activeProfileId: string | null;
  currentStreak: number;
  mealsState: Meal[];
  weightLogs?: WeightLog[];
  onLogWeight?: (weight: number, date: string) => void;
  onDeleteWeight?: (id: string) => void;
  onLogout?: () => void;
}) => {
  const [profileTab, setProfileTab] = useState<"insights" | "meals" | "agent-brain">("insights");
  
  // V3.2 Restructured Agent Brain States (Combined Single Notepad)
  const getCombinedMemoriesText = () => {
    const k = profileData.knowledge || { preferences: [], health: [], notes: [], patterns: [] };
    const am = profileData.agent_memory || [];
    return [
      ...(k.preferences || []),
      ...(k.health || []),
      ...(k.notes || []),
      ...(k.patterns || []),
      ...am
    ].join("\n");
  };

  const [draftMemories, setDraftMemories] = useState(getCombinedMemoriesText());
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setDraftMemories(getCombinedMemoriesText());
  }, [profileData.knowledge, profileData.agent_memory]);

  useEffect(() => {
    if (isEditingMemory && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditingMemory]);

  const saveAllMemories = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const k = profileData.knowledge || { preferences: [], health: [], notes: [], patterns: [] };
    const am = profileData.agent_memory || [];

    // Map existing items to check where they came from
    const bucketMap = new Map<string, string>();
    (k.preferences || []).forEach((item: string) => bucketMap.set(item, "preferences"));
    (k.health || []).forEach((item: string) => bucketMap.set(item, "health"));
    (k.notes || []).forEach((item: string) => bucketMap.set(item, "notes"));
    (k.patterns || []).forEach((item: string) => bucketMap.set(item, "patterns"));
    am.forEach((item: string) => bucketMap.set(item, "agent_memory"));

    const newPreferences: string[] = [];
    const newHealth: string[] = [];
    const newNotes: string[] = [];
    const newPatterns: string[] = [];
    const newAgentMemory: string[] = [];

    lines.forEach((line) => {
      const originalBucket = bucketMap.get(line);
      if (originalBucket === "preferences") {
        newPreferences.push(line);
      } else if (originalBucket === "health") {
        newHealth.push(line);
      } else if (originalBucket === "patterns") {
        newPatterns.push(line);
      } else if (originalBucket === "agent_memory") {
        newAgentMemory.push(line);
      } else {
        // Brand new items added by the user
        // Classify based on keywords
        const lower = line.toLowerCase();
        const isAgentBehavior = lower.includes("reply") || lower.includes("converse") || lower.includes("tone") || lower.includes("brief") || lower.includes("short") || lower.includes("format") || lower.includes("bullet") || lower.includes("motivate") || lower.includes("speak") || lower.includes("talk");
        if (isAgentBehavior) {
          newAgentMemory.push(line);
        } else {
          newNotes.push(line);
        }
      }
    });

    setProfileData({
      ...profileData,
      knowledge: {
        preferences: newPreferences,
        health: newHealth,
        notes: newNotes,
        patterns: newPatterns
      },
      agent_memory: newAgentMemory
    });
  };
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showLogsToRecipeModal, setShowLogsToRecipeModal] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);

  // Search within the log-to-recipe modal
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // All meals, sorted by newest, filterable by search
  const filteredLogsForRecipe = useMemo(() => {
    if (!mealsState) return [];
    const sorted = [...mealsState].sort(
      (a, b) => new Date(b.date + "T00:00:00").getTime() - new Date(a.date + "T00:00:00").getTime()
    );
    if (!logSearchQuery.trim()) return sorted;
    const q = logSearchQuery.toLowerCase();
    return sorted.filter(
      (meal) =>
        meal.name.toLowerCase().includes(q) ||
        (meal.type || "").toLowerCase().includes(q) ||
        (meal.meal_description || "").toLowerCase().includes(q)
    );
  }, [mealsState, logSearchQuery]);

  const handleGenerateRecipeFromMeal = async (meal: Meal) => {
    setIsGeneratingRecipe(true);
    try {
      const prompt = `You are an expert chef and nutritionist. Convert this logged meal into a detailed, professional recipe.
Logged Meal:
- Name: "${meal.name}"
- Calories: ${meal.calories} kcal
- Protein: ${meal.protein}g
- Carbs: ${meal.nutrients?.carbs ?? meal.carbs ?? 0}g
- Fats: ${meal.nutrients?.fats ?? meal.fats ?? 0}g
${meal.meal_description ? `- Description/Notes: "${meal.meal_description}"` : ""}

Please generate:
1. A refined, gourmet recipe name (e.g., instead of "chicken rice", write "Herb-Marinated Chicken Breast with Jasmine Rice").
2. Prep / cook time (e.g. "25 mins").
3. 2-4 relevant dietary tags (e.g., ["High Protein", "Gluten Free", "Low Carb", "Quick & Easy"]).
4. A list of specific ingredients with quantities that would match the macros listed above. Take the notes/description above into account when generating ingredients!
5. Step-by-step cooking instructions.
6. 2-3 micronutrients with estimated values (e.g. Iron, Vitamin C) in the format below.
7. A brief description of the recipe.

Return a JSON object matching this structure:
{
  "name": "gourmet recipe name",
  "time": "prep time (e.g. 20 mins)",
  "tags": ["High Protein", "Gluten Free"],
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": "Step-by-step instructions text with numbered steps",
  "description": "Brief 1-sentence summary of the dish.",
  "micros": [
    {"name": "Iron", "target": 3, "unit": "mg"},
    {"name": "Vitamin C", "target": 15, "unit": "mg"}
  ]
}
Do not return any markdown formatting, backticks, or "json" prefix. Return only the raw JSON string.`;

      let rawText = "";

      let edgeSuccess = false;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.functions.invoke("gemini", {
            body: { prompt }
          });
          if (!error && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            rawText = data.candidates[0].content.parts[0].text;
            edgeSuccess = true;
          }
        } catch (e) {
          console.warn("Edge Function invoke error, falling back to direct API:", e);
        }
      }

      if (!edgeSuccess) {
        // All Gemini calls go through the authenticated edge function — the
        // client never talks to Google directly with an API key.
        throw new Error("AI generation is unavailable right now. Please try again.");
      }
      let cleaned = rawText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      const result = JSON.parse(cleaned);

      // Build tags array dynamically combining AI tags, meal tags, and auto high-protein badge
      const recipeTags = Array.from(
        new Set([
          ...(result.tags || []),
          ...(meal.tags || []),
          meal.protein >= 25 ? "High Protein" : "",
        ].filter(Boolean))
      );

      // Build final recipe object
      const recipeData = {
        profile_id: activeProfileId,
        name: result.name || meal.name,
        time: result.time || "20 mins",
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.nutrients?.carbs ?? meal.carbs ?? 0,
        fats: meal.nutrients?.fats ?? meal.fats ?? 0,
        fiber: meal.nutrients?.fiber ?? meal.fiber ?? 0,
        tags: recipeTags.length > 0 ? recipeTags : ["High Protein"],
        image: meal.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
        ingredients: result.ingredients || [],
        instructions: result.instructions || "No instructions generated.",
        // micros intentionally not persisted — recipes.micros does not exist in the live DB
        description: result.description || meal.meal_description || ""
      };

      if (isSupabaseConfigured && activeProfileId) {
        const { data, error } = await supabase
          .from("recipes")
          .insert(recipeData)
          .select("*")
          .single();

        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }

        const mapped: Recipe = {
          id: data.id,
          name: data.name,
          time: data.time,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fats: data.fats,
          fiber: data.fiber || 0,
          tags: data.tags || [],
          image: data.image,
          ingredients: data.ingredients || [],
          instructions: data.instructions,
          micros: data.micros || [],
          log_count: data.log_count || 0,
          description: data.description || ""
        };
        setRecipes((prev: Recipe[]) => [mapped, ...prev]);
      } else {
        const localRecipe: Recipe = {
          id: "rec_" + Date.now(),
          ...recipeData
        };
        setRecipes((prev: Recipe[]) => [localRecipe, ...prev]);
      }

      triggerToast("🍳 Recipe successfully created and saved!");
      setShowLogsToRecipeModal(false);
      setLogSearchQuery("");
    } catch (err) {
      console.error(err);
      triggerToast("❌ Failed to auto-generate recipe details.");
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  // Recipes & Logs Multi-Toggle & Search expansion states
  const [showRecipesFilter, setShowRecipesFilter] = useState(true);
  const [showLogsFilter, setShowLogsFilter] = useState(true);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedMealPopup, setSelectedMealPopup] = useState<Meal | null>(null);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showLabelsDropdown, setShowLabelsDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Clean, authoritative dietary tags (never raw onboarding flags or system timezones)
  const availableDietaryTags = useMemo(() => {
    const source = profileData.tracking_tags && profileData.tracking_tags.length > 0
      ? profileData.tracking_tags
      : DEFAULT_TRACKING_TAGS;
    return source
      .map((t: any) => (typeof t === "string" ? t : t.name))
      .filter((name: string) => name && !name.includes("/") && name !== "onboarded");
  }, [profileData.tracking_tags]);

  // Dynamic Tracked Nutrients List (Per Dynamic Nutrients Rule)
  const activeTrackedNutrients = useMemo(() => {
    return normalizeTrackedNutrients(profileData.tracked_nutrients, profileData.goals?.dailyProtein);
  }, [profileData.tracked_nutrients, profileData.goals?.dailyProtein]);

  // Meal frequency & duplicate tracking map
  const mealFrequencyMap = useMemo(() => {
    const map: Record<string, number> = {};
    (mealsState || []).forEach((m) => {
      const key = m.name.trim().toLowerCase();
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [mealsState]);

  const existingRecipeNames = useMemo(() => {
    return new Set((recipes || []).map((r) => r.name.trim().toLowerCase()));
  }, [recipes]);

  const uniquePastLogs = useMemo(() => {
    if (!mealsState) return [];
    const map = new Map<string, Meal>();
    mealsState.forEach((m) => {
      const key = m.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, m);
      }
    });
    return Array.from(map.values());
  }, [mealsState]);

  const filteredRecipes = recipes.filter((r) => {
    const sMatch =
      r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(recipeSearch.toLowerCase())) ||
      (r.ingredients || []).some((ing) => ing.toLowerCase().includes(recipeSearch.toLowerCase()));
    const tMatch = selectedTags.length > 0
      ? selectedTags.every((st) => r.tags.some((t) => t.toLowerCase() === st.toLowerCase()))
      : true;
    return sMatch && tMatch;
  });

  const filteredPastLogs = useMemo(() => {
    return uniquePastLogs.filter((m) => {
      // HIDE past log if it ALREADY exists as a saved Recipe!
      const isAlreadySaved = existingRecipeNames.has(m.name.trim().toLowerCase());
      if (isAlreadySaved) return false;

      const sMatch =
        m.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
        (m.type || "").toLowerCase().includes(recipeSearch.toLowerCase()) ||
        (m.meal_description || "").toLowerCase().includes(recipeSearch.toLowerCase());
      const tMatch = selectedTags.length > 0
        ? selectedTags.every((st) => (m.tags || []).some((t) => t.toLowerCase() === st.toLowerCase()))
        : true;
      return sMatch && tMatch;
    });
  }, [uniquePastLogs, recipeSearch, selectedTags, existingRecipeNames]);

  const updateGoal = (field: string, value: number) => {
    setProfileData({
      ...profileData,
      goals: { ...profileData.goals, [field]: value },
    });
    triggerToast(`Daily ${field === "dailyCalories" ? "Calorie" : "Weight"} target updated and synced successfully!`);
  };

  const updateMacro = (field: string, value: number) => {
    setProfileData({
      ...profileData,
      macros: { ...profileData.macros, [field]: value },
    });
    triggerToast(`Daily ${field.charAt(0).toUpperCase() + field.slice(1)} goal updated and synced successfully!`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="mt-4 relative z-10 pb-32"
    >
      <div className="px-6 space-y-6">
        <div className="flex gap-6 items-center px-1 pt-2">
          <div className="relative w-24 h-24 rounded-full border-[3px] border-orange-500 p-1 overflow-hidden shrink-0">
            {profileData.imageUrl ? (
              <img
                src={profileData.imageUrl}
                alt="User"
                className="w-full h-full object-cover rounded-full pointer-events-none"
              />
            ) : (
              <DefaultAvatar />
            )}
          </div>
          <div className="flex-1 grid grid-cols-3 gap-1 min-w-0 text-center items-center">
            <div
              onClick={() => openGoalConfig("dailyCalories")}
              className="flex flex-col items-center cursor-pointer hover:bg-stone-100/50 py-1 px-0.5 rounded-xl transition-all select-none min-w-0"
              title="Tap to edit daily calorie goal"
            >
              <div className="text-lg sm:text-xl font-black text-[#1a1a1a] truncate font-sans">
                {profileData.goals?.dailyCalories || profileData.daily_calories_goal || 2000}
              </div>
              <div className="text-[9px] font-extrabold text-[#9e9e9e] uppercase tracking-tight truncate w-full">
                KCAL GOAL
              </div>
            </div>
            <div
              onClick={() => setProfileTab("insights")}
              className="flex flex-col items-center cursor-pointer hover:bg-stone-100/50 py-1 px-0.5 rounded-xl transition-all select-none min-w-0"
              title="Tap to view weight progress & log weight"
            >
              <div className="text-lg sm:text-xl font-black text-[#1a1a1a] truncate font-sans">
                {profileData.weight || 0}
              </div>
              <div className="text-[9px] font-extrabold text-[#9e9e9e] uppercase tracking-tight truncate w-full">
                WEIGHT (KG)
              </div>
            </div>
            <div
              onClick={() => openGoalConfig("weightGoal")}
              className="flex flex-col items-center cursor-pointer hover:bg-stone-100/50 py-1 px-0.5 rounded-xl transition-all select-none min-w-0"
              title="Tap to edit weight goal"
            >
              <div className="text-lg sm:text-xl font-black text-[#1a1a1a] truncate font-sans">
                {profileData.goals?.weightGoal || profileData.weight_goal || profileData.weight || 0}
              </div>
              <div className="text-[9px] font-extrabold text-[#9e9e9e] uppercase tracking-tight truncate w-full">
                TARGET (KG)
              </div>
            </div>
          </div>
        </div>

        <div className="px-1 space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-bold text-[#1a1a1a]">{profileData.name}</div>
          </div>
          <div className="text-[13px] text-orange-950/70 font-medium leading-relaxed relative">
            <span className={cn(!showFullDesc && "line-clamp-2")}>
              {profileData.description}
            </span>
            {profileData.description.length > 80 && !showFullDesc && (
              <span
                onClick={() => setShowFullDesc(true)}
                className="text-orange-500 font-bold cursor-pointer hover:underline absolute bottom-0 right-0 bg-gradient-to-l from-[#FAF9F6] via-[#FAF9F6] to-transparent pl-8"
              >
                ...more
              </span>
            )}
            {showFullDesc && (
              <span
                onClick={() => setShowFullDesc(false)}
                className="text-orange-500 font-bold cursor-pointer hover:underline ml-1 block mt-1"
              >
                less
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-1 pt-2">
          <button
            onClick={() => setActiveTab("edit-profile")}
            className="flex-1 bg-white border border-gray-200 py-1.5 rounded-lg text-[13px] font-bold text-[#1a1a1a] shadow-sm hover:bg-gray-50 transition-colors"
          >
            Edit profile
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className="flex-1 bg-white border border-gray-200 py-1.5 rounded-lg text-[13px] font-bold text-[#1a1a1a] shadow-sm hover:bg-gray-50 transition-colors"
          >
            Settings
          </button>
        </div>
      </div>

      <div className="flex justify-between border-b border-black/5 mt-6 px-4">
        <button
          onClick={() => setProfileTab("insights")}
          className={cn(
            "flex-1 py-3 flex justify-center border-b-[3px] transition-colors",
            profileTab === "insights"
              ? "border-[#1a1a1a] text-[#1a1a1a]"
              : "border-transparent text-[#9e9e9e]",
          )}
          title="Insights & Weight Progress"
        >
          <BarChart2 className="w-6 h-6" />
        </button>
        <button
          onClick={() => setProfileTab("meals")}
          className={cn(
            "flex-1 py-3 flex justify-center border-b-[3px] transition-colors",
            profileTab === "meals"
              ? "border-[#1a1a1a] text-[#1a1a1a]"
              : "border-transparent text-[#9e9e9e]",
          )}
          title="Food Library"
        >
          <BookOpen className="w-6 h-6" />
        </button>
        <button
          onClick={() => setProfileTab("agent-brain")}
          className={cn(
            "flex-1 py-3 flex justify-center border-b-[3px] transition-colors",
            profileTab === "agent-brain"
              ? "border-[#1a1a1a] text-[#1a1a1a]"
              : "border-transparent text-[#9e9e9e]",
          )}
          title="Agent Brain"
        >
          <Database className="w-6 h-6" />
        </button>
      </div>

      <div className="min-h-[300px] mt-4 relative z-10 w-full mb-20 font-sans">
        {profileTab === "meals" && (
          <div className="px-6 py-2 space-y-4 font-sans">
            {/* Morphing 1-Line Control Bar */}
            <div className="flex items-center justify-between gap-1.5 font-sans min-h-[38px]">
              <AnimatePresence mode="wait">
                {isSearchExpanded ? (
                  <motion.div
                    key="expanded-search"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 font-sans w-full"
                  >
                    <div className="flex-1 relative flex items-center bg-stone-100 focus-within:bg-white border border-stone-300/80 rounded-2xl px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-orange-500/20 transition-all min-w-0">
                      <Search className="w-4 h-4 text-orange-500 mr-2 shrink-0" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search recipes, logs, or ingredients..."
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-stone-900 placeholder:text-stone-400 font-sans min-w-0"
                      />
                      {recipeSearch && (
                        <button
                          onClick={() => setRecipeSearch("")}
                          className="text-stone-400 hover:text-stone-700 shrink-0 text-xs font-black font-sans ml-1 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipeSearch("");
                        setIsSearchExpanded(false);
                      }}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200/80 text-stone-700 font-black text-xs rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
                    >
                      Cancel
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="collapsed-bar"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between gap-1.5 font-sans w-full"
                  >
                    {/* Left: 2 Multi-Toggle Pills (Recipes & Logs) */}
                    <div className="flex items-center gap-1.5 shrink-0 py-0.5">
                      <button
                        onClick={() => setShowRecipesFilter(!showRecipesFilter)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer select-none shrink-0 flex items-center justify-center font-black active:scale-95",
                          showRecipesFilter
                            ? "bg-orange-500 text-white shadow-md shadow-orange-500/20 border border-orange-500"
                            : "bg-stone-100 hover:bg-stone-200/80 text-stone-600 border border-stone-200/40 opacity-70"
                        )}
                      >
                        <span>Recipes</span>
                      </button>

                      <button
                        onClick={() => setShowLogsFilter(!showLogsFilter)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer select-none shrink-0 flex items-center justify-center font-black active:scale-95",
                          showLogsFilter
                            ? "bg-orange-500 text-white shadow-md shadow-orange-500/20 border border-orange-500"
                            : "bg-stone-100 hover:bg-stone-200/80 text-stone-600 border border-stone-200/40 opacity-70"
                        )}
                      >
                        <span>Past Foods</span>
                      </button>
                    </div>

                    {/* Right: Search Icon + Dietary Tags Dropdown + Add Dropdown */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Search Icon Trigger */}
                      <button
                        onClick={() => setIsSearchExpanded(true)}
                        type="button"
                        className="p-2 bg-stone-100 hover:bg-stone-200 border border-black/5 text-stone-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-xs"
                        title="Search Recipes & Logs"
                      >
                        <Search className="w-4 h-4 text-stone-600" />
                      </button>

                      {/* Dietary Tags Dropdown */}
                      <div className="relative shrink-0">
                        <button
                          onClick={() => {
                            setShowLabelsDropdown(!showLabelsDropdown);
                            setShowAddDropdown(false);
                          }}
                          type="button"
                          className={cn(
                            "p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative active:scale-95 shrink-0 shadow-xs",
                            selectedTags.length > 0
                              ? "bg-orange-50 border-orange-200 text-orange-600 shadow-xs"
                              : "bg-stone-100 border-black/5 text-stone-600 hover:bg-stone-200"
                          )}
                          title="Filter by Dietary Tags"
                        >
                          <Filter className="w-4 h-4" />
                          {selectedTags.length > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 bg-orange-500 text-white rounded-full flex items-center justify-center text-[7.5px] font-black font-sans px-1 leading-none shadow-sm">
                              {selectedTags.length}
                            </span>
                          )}
                        </button>
                        <AnimatePresence>
                          {showLabelsDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowLabelsDropdown(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md border border-neutral-100 rounded-[24px] p-3.5 shadow-2xl z-50 flex flex-col gap-1 font-sans"
                              >
                                <div className="flex justify-between items-center px-2 pb-2 border-b border-stone-100">
                                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                    Dietary Tags
                                  </span>
                                  {selectedTags.length > 0 && (
                                    <button
                                      onClick={() => setSelectedTags([])}
                                      className="text-[9px] font-black uppercase text-orange-600 tracking-wider hover:opacity-80 transition-all cursor-pointer"
                                    >
                                      Clear ({selectedTags.length})
                                    </button>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-0.5 mt-1 no-scrollbar-all">
                                  {availableDietaryTags.map((tag: string) => {
                                    const isSelected = selectedTags.includes(tag);
                                    return (
                                      <button
                                        key={tag}
                                        onClick={() => {
                                          if (isSelected) {
                                            setSelectedTags(selectedTags.filter((t) => t !== tag));
                                          } else {
                                            setSelectedTags([...selectedTags, tag]);
                                          }
                                        }}
                                        className={cn(
                                          "w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all flex items-center justify-between gap-2 select-none cursor-pointer",
                                          isSelected
                                            ? "bg-orange-500 text-white font-extrabold shadow-sm"
                                            : "text-stone-600 hover:bg-stone-50"
                                        )}
                                      >
                                        <span className="truncate">{tag}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Individual Convert Log (AI) Button */}
                      <button
                        type="button"
                        onClick={() => setShowLogsToRecipeModal(true)}
                        className="p-2 bg-stone-100 hover:bg-stone-200 border border-black/5 text-stone-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95"
                        title="Convert Log to Recipe (AI)"
                      >
                        <Wand2 className="w-4 h-4 text-stone-600" />
                      </button>

                      {/* Individual Add Custom Recipe Button (+) */}
                      <button
                        type="button"
                        onClick={() => {
                          const blankRecipe: Recipe = {
                            id: "new",
                            name: "",
                            time: "15 mins",
                            calories: 0,
                            protein: 0,
                            carbs: 0,
                            fats: 0,
                            tags: [],
                            image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
                            ingredients: [],
                            instructions: "",
                            micros: [],
                          };
                          openRecipeDetails(blankRecipe);
                        }}
                        className="p-2 bg-stone-100 hover:bg-stone-200 border border-black/5 text-stone-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95"
                        title="Add Custom Recipe"
                      >
                        <Plus className="w-4 h-4 text-stone-600" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active Tag Badges Row */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 font-sans px-1">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-100/70 hover:bg-orange-200/60 border border-orange-200 text-orange-800 rounded-full text-[9px] font-black tracking-wider uppercase cursor-pointer transition-all"
                  >
                    {tag}
                    <span className="opacity-80 font-light text-[11px] leading-none ml-0.5">×</span>
                  </span>
                ))}
              </div>
            )}

            {/* Instagram-Style Seamless Grid Display */}
            <div className="grid grid-cols-3 gap-[1px] bg-stone-200/80 -mx-6 pb-6">
              {showRecipesFilter &&
                filteredRecipes.map((recipe) => (
                  <motion.div
                    key={recipe.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openRecipeDetails(recipe)}
                    className="aspect-square bg-stone-100 overflow-hidden relative cursor-pointer select-none active:brightness-90 transition-all duration-150"
                  >
                    {!hasNoGeneratedImage(recipe.image) ? (
                      <RecipeImage
                        src={recipe.image}
                        alt={recipe.name}
                        fallbackEmoji={getMealEmoji(recipe.name)}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#F4F3EF]/90 flex items-center justify-center pointer-events-none select-none">
                        <span className="text-4xl filter drop-shadow-xs opacity-[0.85]">{getMealEmoji(recipe.name)}</span>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none z-10" />

                    {/* Top Left: Recipe Badge */}
                    <div className="absolute top-1.5 left-1.5 bg-orange-500/90 backdrop-blur-[4px] border border-white/10 px-1.5 py-0.5 rounded-md text-[7.5px] font-black text-white uppercase tracking-wider z-20 shadow-sm flex items-center gap-0.5">
                      <span>📖</span> Recipe
                    </div>

                    {/* Top Right: Calories Badge */}
                    <div className="absolute top-1.5 right-1.5 bg-black/40 backdrop-blur-[4px] border border-white/5 px-1.5 py-0.5 rounded-md text-[8px] font-black text-white font-mono tracking-wider z-20 shadow-sm">
                      {recipe.calories} <span className="text-[7px] text-orange-300 font-sans font-bold">kcal</span>
                    </div>

                    <div className="absolute bottom-1.5 left-2 right-2 text-left z-20 flex flex-col pointer-events-none">
                      <span className="text-[9.5px] font-black text-white/95 leading-tight tracking-tight line-clamp-1">
                        {recipe.name}
                      </span>
                      <span className="text-[7px] text-orange-200/90 font-black uppercase tracking-wider mt-0.5">
                        ⏱️ {recipe.time} {recipe.log_count ? `• Logged ${recipe.log_count}x` : ""}
                      </span>
                    </div>
                  </motion.div>
                ))}

              {showLogsFilter &&
                filteredPastLogs.map((meal) => {
                  const count = mealFrequencyMap[meal.name.trim().toLowerCase()] || 1;
                  return (
                    <motion.div
                      key={`past-log-${meal.id}`}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedMealPopup(meal)}
                      className="aspect-square bg-stone-100 overflow-hidden relative cursor-pointer select-none active:brightness-90 transition-all duration-150"
                    >
                      {meal.image && !hasNoGeneratedImage(meal.image) ? (
                        <img src={meal.image} className="w-full h-full object-cover" alt={meal.name} />
                      ) : (
                        <div className="absolute inset-0 bg-[#F4F3EF]/90 flex items-center justify-center pointer-events-none select-none">
                          <span className="text-4xl filter drop-shadow-xs opacity-[0.85]">{getMealEmoji(meal.name, meal.type)}</span>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none z-10" />

                      {/* Top Left: Past Food Badge */}
                      <div className="absolute top-1.5 left-1.5 bg-stone-900/80 backdrop-blur-[4px] border border-white/10 px-1.5 py-0.5 rounded-md text-[7.5px] font-black text-white uppercase tracking-wider z-20 shadow-sm flex items-center gap-0.5">
                        <span>🍲</span> Past Food
                      </div>

                      <div className="absolute top-1.5 right-1.5 bg-black/40 backdrop-blur-[4px] border border-white/5 px-1.5 py-0.5 rounded-md text-[8px] font-black text-white font-mono tracking-wider z-20 shadow-sm">
                        {meal.calories} <span className="text-[7px] text-orange-300 font-sans font-bold">kcal</span>
                      </div>

                      <div className="absolute bottom-1.5 left-2 right-2 text-left z-20 flex flex-col pointer-events-none">
                        <span className="text-[9.5px] font-black text-white/95 leading-tight tracking-tight line-clamp-1">
                          {meal.name}
                        </span>
                        <span className="text-[7px] text-orange-200/90 font-black uppercase tracking-wider mt-0.5">
                          Logged {count}x
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

              {/* Empty State */}
              {((!showRecipesFilter || filteredRecipes.length === 0) &&
                (!showLogsFilter || filteredPastLogs.length === 0)) && (
                <div className="col-span-3 text-center py-12 bg-white/55 border border-dashed border-orange-100 rounded-[28px] p-6 mx-6 font-sans">
                  <span className="text-3xl inline-block">
                    {!showRecipesFilter && !showLogsFilter ? "🔍" : "🍲"}
                  </span>
                  <h5 className="font-bold text-xs text-orange-950 mt-2 font-sans font-extrabold text-center">
                    {!showRecipesFilter && !showLogsFilter
                      ? "No Categories Active"
                      : "No Matching Items Found"}
                  </h5>
                  <p className="text-[10px] text-orange-950/40 font-sans font-medium text-center mt-1">
                    {!showRecipesFilter && !showLogsFilter
                      ? "Tap 'Recipes' or 'Past Foods' above to view items."
                      : "Try adjusting your search query or enabling toggles above."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {profileTab === "insights" && (
          <div className="pb-8">
            <InsightsView 
              currentStreak={currentStreak} 
              mealsState={mealsState} 
              profileData={profileData} 
              weightLogs={weightLogs}
              onLogWeight={onLogWeight}
              onDeleteWeight={onDeleteWeight}
              triggerToast={triggerToast}
            />
          </div>
        )}

        {profileTab === "agent-brain" && (
          <div className="px-6 py-4 max-w-[calc(448px)] mx-auto space-y-5 text-left">
            <div className="flex justify-between items-center pb-2 select-none">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-500" />
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">Agent Brain</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full select-none flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live Sync
              </span>
            </div>

            {/* notepad styled area */}
            <div className="w-full min-h-[220px] flex flex-col justify-start relative pt-2">
              {isEditingMemory ? (
                <textarea
                  ref={textareaRef}
                  value={draftMemories}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftMemories(val);
                    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = window.setTimeout(() => {
                      saveAllMemories(val);
                    }, 1000);
                  }}
                  onBlur={() => {
                    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                    saveAllMemories(draftMemories);
                    setIsEditingMemory(false);
                  }}
                  placeholder="Tap here to write down things for the AI to remember (one item per line, e.g.)&#13;• Allergic to peanuts&#13;• Prefers high-protein low-carb dinners"
                  className="w-full bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-sm font-semibold text-stone-800 placeholder-stone-400 resize-none min-h-[200px] leading-relaxed transition-all"
                />
              ) : (
                <div
                  onClick={() => setIsEditingMemory(true)}
                  className="text-sm leading-relaxed min-h-[200px] py-0.5 cursor-text whitespace-pre-line text-left text-stone-800 font-semibold"
                >
                  {draftMemories ? (
                    draftMemories.split("\n").map((line, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 py-1">
                        <span className="text-orange-500 text-xs mt-1">•</span>
                        <span>{line}</span>
                      </div>
                    ))
                  ) : (
                    <span className="font-medium text-stone-400 italic">
                      Tap here to write down things for the AI to remember...
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center text-[7.5px] font-black uppercase text-stone-400 tracking-widest pt-4 border-t border-stone-200/40 select-none">
              <span>Auto-saves instantly</span>
              <span>{draftMemories.split("\n").filter(l => l.trim().length > 0).length} Memory Slots Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Log to Recipe Modal (Portaled to document.body to escape stacking context) */}
      {createPortal(
        <AnimatePresence>
          {showLogsToRecipeModal && (
            <div className="fixed inset-0 z-[9999] flex items-end justify-center font-sans">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => !isGeneratingRecipe && setShowLogsToRecipeModal(false)}
                className="absolute inset-0 bg-black/60 cursor-pointer"
              />
              {/* Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl p-6 pb-8 z-10 flex flex-col max-h-[85vh]"
              >
                {/* Drag Handle */}
                <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-4" />

                {/* Title & Close */}
                <div className="flex justify-between items-center mb-3 text-left">
                  <div>
                    <h3 className="text-base font-black text-[#1a1a1a]">Convert Log to Recipe</h3>
                    <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Select any past logged meal to convert into an AI recipe</p>
                  </div>
                  {!isGeneratingRecipe && (
                    <button
                      onClick={() => setShowLogsToRecipeModal(false)}
                      className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search bar */}
                {!isGeneratingRecipe && (
                  <div className="relative mb-3">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search past logs by name or type..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-9 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-400"
                    />
                    {logSearchQuery && (
                      <button
                        onClick={() => setLogSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 min-h-[250px]">
                  {isGeneratingRecipe ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-3xl shadow-sm relative">
                        <div className="absolute inset-0 rounded-full border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                        🍳
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-[#1a1a1a]">Drafting Gourmet Recipe...</h4>
                        <p className="text-[10px] text-stone-400 font-semibold mt-1 max-w-[280px] leading-relaxed mx-auto">
                          Gemini Chef is structuring ingredients, detailing step-by-step steps, and predicting micronutrient content.
                        </p>
                      </div>
                    </div>
                  ) : filteredLogsForRecipe.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <div className="text-3xl">🗓️</div>
                      <h5 className="font-extrabold text-xs text-stone-700">
                        {logSearchQuery ? "No Matches Found" : "No Meals Logged Yet"}
                      </h5>
                      <p className="text-[10px] text-stone-400 font-medium max-w-[200px] mx-auto">
                        {logSearchQuery
                          ? "Try a different search term."
                          : "Go back to your home timeline to log some food before converting them to recipes."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredLogsForRecipe.map((meal) => (
                        <div
                          key={meal.id}
                          onClick={() => handleGenerateRecipeFromMeal(meal)}
                          className="bg-stone-50/55 hover:bg-orange-50/30 border border-stone-200/50 hover:border-orange-200/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-99"
                        >
                          <div className="flex items-center gap-3 min-w-0 text-left">
                            <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200/50">
                              {meal.image && !hasNoGeneratedImage(meal.image) ? (
                                <img src={meal.image} className="w-full h-full object-cover" alt={meal.name} />
                              ) : (
                                <div className="w-full h-full bg-orange-50/55 flex items-center justify-center text-lg select-none">
                                  {getMealEmoji(meal.name, meal.type)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-[11px] font-black text-stone-900 truncate leading-snug">{meal.name}</h5>
                              {meal.meal_description && (
                                <p className="text-[9px] text-stone-400 font-medium truncate leading-tight mt-0.5" title={meal.meal_description}>
                                  {meal.meal_description}
                                </p>
                              )}
                              <div className="text-[8px] text-stone-405 font-bold mt-1">
                                {meal.type} • {new Date(meal.date + "T00:00:00").toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                              </div>
                              <div className="text-[8px] font-mono text-orange-600 font-black tracking-wider mt-1">
                                {meal.calories} KCAL • P: {meal.protein}g C: {meal.carbs}g F: {meal.fats}g Fiber: {meal.fiber || 0}g
                              </div>
                            </div>
                          </div>
                          <span className="bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 rounded-lg text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 shrink-0 transition-colors">
                            ✨ Convert
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Selected Meal Details Modal Sheet (Portaled to document.body) */}
      {createPortal(
        <AnimatePresence>
          {selectedMealPopup && (
            <div className="fixed inset-0 z-[9999] flex items-end justify-center font-sans">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedMealPopup(null)}
                className="absolute inset-0 bg-black/60 cursor-pointer backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 240 }}
                className="relative w-full max-w-[448px] bg-stone-50 rounded-t-[36px] overflow-hidden flex flex-col max-h-[85vh] shadow-2xl z-10 border-t border-white/20 text-left font-sans"
              >
                {/* Hero Image / Emoji Banner */}
                <div className="h-44 w-full relative shrink-0 bg-stone-900">
                  {selectedMealPopup.image && !hasNoGeneratedImage(selectedMealPopup.image) ? (
                    <img
                      src={selectedMealPopup.image}
                      className="w-full h-full object-cover"
                      alt={selectedMealPopup.name}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-850 via-stone-900 to-stone-950 flex items-center justify-center">
                      <span className="text-6xl filter drop-shadow-md opacity-90 select-none">
                        {getMealEmoji(selectedMealPopup.name, selectedMealPopup.type)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-black/20 pointer-events-none" />

                  {/* Header Top Controls */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                    <span className="px-3 py-1 bg-black/55 backdrop-blur-md rounded-full text-[9px] font-black text-white/90 tracking-wide font-sans">
                      Logged {mealFrequencyMap[selectedMealPopup.name.trim().toLowerCase()] || 1}x in history
                    </span>
                    <button
                      onClick={() => setSelectedMealPopup(null)}
                      className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer active:scale-95"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* Overlaid Title, Tags & Date */}
                  <div className="absolute bottom-4 left-4 right-4 text-left z-20">
                    {selectedMealPopup.tags && selectedMealPopup.tags.length > 0 && (
                      <div className="flex gap-1.5 mb-1.5 flex-wrap">
                        {selectedMealPopup.tags.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-orange-500 text-white rounded-md text-[7.5px] font-black uppercase tracking-widest font-sans shadow-xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <h3 className="text-white text-lg font-black leading-tight tracking-tight drop-shadow-sm font-sans">
                      {selectedMealPopup.name}
                    </h3>
                    <p className="text-[10px] text-orange-200/90 font-bold font-sans mt-0.5 flex items-center gap-1.5">
                      <span>🗓️ {selectedMealPopup.date ? new Date(selectedMealPopup.date + "T00:00:00").toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Past Log'}</span>
                    </p>
                  </div>
                </div>

                {/* Scrollable Details Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
                  {/* Calories & Macro Progress Bars */}
                  <div className="bg-white rounded-3xl p-4 border border-stone-200/60 shadow-xs space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                        Macronutrient Density
                      </span>
                      <span className="text-xs font-black text-orange-600 font-mono">
                        🔥 {selectedMealPopup.calories} kcal
                      </span>
                    </div>

                    {/* Dynamic Tracked Nutrients Progress Bars (Per Dynamic Nutrients Rule) */}
                    <div className={cn(
                      "grid gap-2 text-center",
                      activeTrackedNutrients.length <= 4 ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4"
                    )}>
                      {activeTrackedNutrients.map((n) => {
                        const val = Number(selectedMealPopup.nutrients?.[n.id] ?? (selectedMealPopup as any)[n.id] ?? 0);
                        const targetVal = n.target || 100;
                        const pct = Math.min(100, Math.max(0, (val / targetVal) * 100));
                        return (
                          <div
                            key={n.id}
                            className="bg-stone-50/70 rounded-2xl p-2.5 border border-stone-200/50 flex flex-col justify-center min-w-0"
                          >
                            <span
                              className="text-[7.5px] font-black uppercase tracking-wider truncate"
                              style={{ color: n.color }}
                            >
                              {n.name}
                            </span>
                            <span className="text-xs font-black text-stone-900 mt-0.5">
                              {val}{n.unit}
                            </span>
                            <div className="w-full bg-stone-200/60 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: n.color
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Meal Description / Notes Callout */}
                  {selectedMealPopup.meal_description && (
                    <div className="bg-white rounded-3xl p-4 border border-stone-200/60 shadow-xs text-left">
                      <div className="text-[9px] font-black uppercase tracking-wider text-orange-600 mb-1">
                        Meal Notes & Insights
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed italic">
                        "{selectedMealPopup.meal_description}"
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2.5 pt-1 pb-2">
                    {!existingRecipeNames.has(selectedMealPopup.name.trim().toLowerCase()) && (
                      <button
                        onClick={() => {
                          const targetMeal = selectedMealPopup;
                          setSelectedMealPopup(null);
                          handleGenerateRecipeFromMeal(targetMeal);
                        }}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Wand2 className="w-4 h-4" />
                        <span>Convert to Recipe (AI)</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onAddMeal(selectedMealPopup);
                        triggerToast(`Logged "${selectedMealPopup.name}" for today! 🍽️`);
                        setSelectedMealPopup(null);
                      }}
                      className="flex-1 bg-stone-950 hover:bg-stone-900 text-white font-extrabold text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Log Again Today</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};
