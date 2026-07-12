import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  BookOpen, BarChart2, Target, Search, Filter, X, Utensils,
  Plus, Sparkles, Check, Info, Scale, Ruler, Database, Camera,
  User, Smile,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import type { Meal, Recipe } from "../types";
import { hasNoGeneratedImage, getMealEmoji } from "../utils/helpers";
import { InsightsView } from "./InsightsView";
import { DefaultAvatar } from "./DefaultAvatar";

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
}) => {
  const [profileTab, setProfileTab] = useState<"meals" | "insights" | "memory">("meals");
  
  const memoriesText = (profileData.memories || []).join("\n");
  const [draftMemories, setDraftMemories] = useState(memoriesText);
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setDraftMemories((profileData.memories || []).join("\n"));
  }, [profileData.memories]);

  useEffect(() => {
    if (isEditingMemory && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditingMemory]);
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
    const key = localStorage.getItem("fitai_gemini_api_key") ||
                (import.meta as any).env.VITE_GEMINI_API_KEY ||
                "";

    setIsGeneratingRecipe(true);
    try {
      const prompt = `You are an expert chef and nutritionist. Convert this logged meal into a detailed, professional recipe.
Logged Meal:
- Name: "${meal.name}"
- Calories: ${meal.calories} kcal
- Protein: ${meal.protein}g
- Carbs: ${meal.carbs}g
- Fats: ${meal.fats}g
${meal.meal_description ? `- Description/Notes: "${meal.meal_description}"` : ""}

Please generate:
1. A refined, gourmet recipe name (e.g., instead of "chicken rice", write "Herb-Marinated Chicken Breast with Jasmine Rice").
2. Prep / cook time (e.g. "25 mins").
3. A list of specific ingredients with quantities that would match the macros listed above. Take the notes/description above into account when generating ingredients!
4. Step-by-step cooking instructions.
5. 2-3 micronutrients with estimated values (e.g. Iron, Vitamin C) in the format below.
6. A brief description of the recipe.

Return a JSON object matching this structure:
{
  "name": "gourmet recipe name",
  "time": "prep time (e.g. 20 mins)",
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
        let response = null;
        let lastError = "";

        for (const model of ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"]) {
          try {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
              })
            });

            if (response.ok) {
              lastError = "";
              break;
            } else {
              const errData = await response.json().catch(() => ({}));
              lastError = errData.error?.message || `HTTP ${response.status} Error`;
            }
          } catch (err: any) {
            lastError = err.message || "Connection failed";
          }
        }

        if (!response || !response.ok) {
          throw new Error(lastError || "Failed to contact Gemini API");
        }

        const resJson = await response.json();
        rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      let cleaned = rawText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      const result = JSON.parse(cleaned);

      // Build final recipe object
      const recipeData = {
        profile_id: activeProfileId,
        name: result.name || meal.name,
        time: result.time || "20 mins",
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        fiber: meal.fiber || 0,
        tags: ["AI Generated", meal.type || "Meal"],
        image: meal.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
        ingredients: result.ingredients || [],
        instructions: result.instructions || "No instructions generated.",
        micros: result.micros || [],
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

  // Recipes Filters state
  const [recipeSearch, setRecipeSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showLabelsDropdown, setShowLabelsDropdown] = useState(false);

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
          <div className="flex-1 flex justify-around">
            <div className="flex flex-col items-center">
              <div className="text-xl font-black text-[#1a1a1a]">
                {profileData.weight}
              </div>
              <div className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-wider">
                Weight(kg)
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xl font-black text-[#1a1a1a]">
                {profileData.height}
              </div>
              <div className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-wider">
                Height(cm)
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xl font-black text-[#1a1a1a]">
                {Math.abs(
                  new Date(
                    Date.now() - new Date(profileData.dob).getTime(),
                  ).getUTCFullYear() - 1970,
                )}
              </div>
              <div className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-wider">
                Age
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
          onClick={() => setProfileTab("meals")}
          className={cn(
            "flex-1 py-3 flex justify-center border-b-[3px] transition-colors",
            profileTab === "meals"
              ? "border-[#1a1a1a] text-[#1a1a1a]"
              : "border-transparent text-[#9e9e9e]",
          )}
        >
          <BookOpen className="w-6 h-6" />
        </button>
        <button
          onClick={() => setProfileTab("insights")}
          className={cn(
            "flex-1 py-3 flex justify-center border-b-[3px] transition-colors",
            profileTab === "insights"
              ? "border-[#1a1a1a] text-[#1a1a1a]"
              : "border-transparent text-[#9e9e9e]",
          )}
        >
          <BarChart2 className="w-6 h-6" />
        </button>
        <button
          onClick={() => setProfileTab("memory")}
          className={cn(
            "flex-1 py-3 flex justify-center border-b-[3px] transition-colors",
            profileTab === "memory"
              ? "border-[#1a1a1a] text-[#1a1a1a]"
              : "border-transparent text-[#9e9e9e]",
          )}
        >
          <Database className="w-6 h-6" />
        </button>
      </div>

      <div className="min-h-[300px] mt-4 relative z-10 w-full mb-20 font-sans">
        {profileTab === "meals" && (
          <div className="px-6 py-2 space-y-6">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 relative flex items-center bg-stone-100 hover:bg-stone-200/60 focus-within:bg-stone-50 border border-black/5 rounded-2xl px-2.5 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-orange-500/10 transition-all font-sans">
                  <Search className="w-3.5 h-3.5 text-stone-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-stone-900 placeholder:text-stone-400 font-sans"
                  />
                  {recipeSearch && (
                    <button
                      onClick={() => setRecipeSearch("")}
                      className="text-stone-400 hover:text-black shrink-0 text-xs font-black font-sans ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowLabelsDropdown(!showLabelsDropdown)}
                    type="button"
                    className={cn(
                      "p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative active:scale-95",
                      selectedTags.length > 0
                        ? "bg-orange-50 border-orange-200 text-orange-600 shadow-sm"
                        : "bg-stone-100 border-black/5 text-stone-600 hover:bg-stone-200"
                    )}
                    title="Filter by Labels"
                  >
                    <Filter className="w-4 h-4" />
                    {selectedTags.length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-orange-500 text-white border border-white rounded-full flex items-center justify-center text-[8px] font-black font-sans px-1 leading-none shadow-sm">
                        {selectedTags.length}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showLabelsDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowLabelsDropdown(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-md border border-neutral-100 rounded-[28px] p-4 shadow-2xl shadow-orange-950/10 z-50 flex flex-col gap-1.5 font-sans"
                        >
                          <div className="flex justify-between items-center px-2 pb-1.5 border-b border-stone-100">
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              Dietary Labels
                            </span>
                            {selectedTags.length > 0 && (
                              <button
                                onClick={() => setSelectedTags([])}
                                className="text-[9px] font-black uppercase text-orange-600 tracking-wider hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                              >
                                Clear ({selectedTags.length})
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-0.5 mt-1 no-scrollbar-all">
                            {(profileData.preferences && profileData.preferences.length > 0
                              ? profileData.preferences
                              : ["Gluten Free", "Dairy Free", "Keto", "Vegan", "Vegetarian", "High Protein", "Low Carb"]
                            ).map((tag: string) => {
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
                                      ? "bg-orange-500 text-white font-extrabold shadow-md animate-none"
                                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-955"
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

                {/* Add from Logs button */}
                <button
                  type="button"
                  onClick={() => setShowLogsToRecipeModal(true)}
                  className="p-2 bg-stone-100 hover:bg-stone-200 border border-black/5 text-stone-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm active:scale-95"
                  title="Add from Logs"
                >
                  <Sparkles className="w-4 h-4 pointer-events-none text-stone-500" />
                </button>

                {/* Add Custom Recipe Button (+) */}
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
                  className="p-2 bg-orange-50 hover:bg-orange-100 border border-orange-200/55 text-orange-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm active:scale-95"
                  title="Add Custom Recipe"
                >
                  <Plus className="w-4 h-4 pointer-events-none" />
                </button>
              </div>

              {selectedTags.length > 0 && (
                <motion.div
                  id="active-filters-row"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap items-center gap-2 mt-2 font-sans px-1 overflow-hidden"
                >
                  <AnimatePresence>
                    {selectedTags.map((tag) => (
                      <motion.span
                        key={tag}
                        id={`active-tag-badge-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-orange-100/70 hover:bg-orange-200/60 border border-orange-200 text-orange-800 rounded-full text-[10px] font-black tracking-wider uppercase shadow-sm cursor-pointer transition-all"
                      >
                        {tag}
                        <span className="opacity-80 font-sans font-light text-[12px] leading-none ml-0.5">×</span>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {/* Instagram Style Square Recipe Feed */}
            <div className="grid grid-cols-3 gap-[1.5px] -mx-6 pb-6">
              {recipes.length === 0 ? (
                <div className="col-span-3 text-center py-10 px-6 mx-6 bg-gradient-to-br from-orange-50/20 to-orange-50/5 border border-dashed border-orange-200 rounded-[32px] font-sans flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-orange-100/50 flex items-center justify-center text-3xl shadow-sm mb-4">
                    🍲
                  </div>
                  <h4 className="font-black text-sm text-[#1a1a1a]">Build Your Recipe Book</h4>
                  <p className="text-[10px] text-stone-500 font-semibold max-w-[240px] mt-1.5 leading-relaxed text-center">
                    Save your favourite meals, convert past logs into detailed recipes with AI, or design custom recipes.
                  </p>

                  <div className="flex gap-2.5 mt-5 w-full max-w-[280px]">
                    <button
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
                      className="flex-1 bg-stone-950 hover:bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 text-center"
                    >
                      Custom Recipe
                    </button>
                    <button
                      onClick={() => setShowLogsToRecipeModal(true)}
                      className="flex-1 border border-orange-500 text-orange-600 hover:bg-orange-50/50 text-[10px] font-black uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer active:scale-95 text-center"
                    >
                      Add from Logs
                    </button>
                  </div>
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="col-span-3 text-center py-12 bg-white/55 border border-dashed border-orange-100 rounded-[28px] p-6 mx-6 font-sans">
                  <span className="text-3xl inline-block">🍲</span>
                  <h5 className="font-bold text-xs text-orange-950 mt-2 font-sans font-extrabold text-center">
                    No recipes match current tags
                  </h5>
                  <p className="text-[10px] text-orange-950/40 font-sans font-medium text-center">
                    Try adjusting your search query, choosing another tag above, or configuring your dietary profile.
                  </p>
                </div>
              ) : (
                filteredRecipes.map((recipe) => (
                  <motion.div
                    key={recipe.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openRecipeDetails(recipe)}
                    className="aspect-square bg-stone-100 overflow-hidden relative cursor-pointer select-none active:brightness-90 transition-all duration-150 border border-white/5"
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

                    <div className="absolute top-1.5 right-1.5 bg-black/40 backdrop-blur-[4px] border border-white/5 px-1.5 py-0.5 rounded-md text-[8px] font-black text-white font-mono tracking-wider z-20 shadow-sm">
                      {recipe.calories} <span className="text-[7px] text-orange-300 font-sans font-bold">kcal</span>
                    </div>

                    <div className="absolute bottom-1.5 left-2 right-2 text-left z-20 flex flex-col pointer-events-none">
                      <span className="text-[9.5px] font-black text-white/95 leading-tight tracking-tight line-clamp-1">
                        {recipe.name}
                      </span>
                      <span className="text-[7px] text-orange-200/90 font-black uppercase tracking-wider mt-0.5">
                        ⏱️ {recipe.time}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {profileTab === "insights" && (
          <div className="pb-8">
            <InsightsView currentStreak={currentStreak} mealsState={mealsState} profileData={profileData} />
          </div>
        )}

        {profileTab === "memory" && (
          <div className="p-6 max-w-[calc(448px)] mx-auto space-y-6">
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-black/5 space-y-4">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">AI Memory</span>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full select-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live Sync
                </span>
              </div>

              <div className="text-[9.5px] font-bold text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-2xl border border-stone-200/40 text-left">
                Allergies, preferences, and dietary rules used by the AI to customize calculations and logs.
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
                        setProfileData({
                          ...profileData,
                          memories: val.split("\n").map(l => l.trim()).filter(l => l.length > 0)
                        });
                      }, 1000);
                    }}
                    onBlur={() => {
                      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                      setProfileData({
                        ...profileData,
                        memories: draftMemories.split("\n").map(l => l.trim()).filter(l => l.length > 0)
                      });
                      setIsEditingMemory(false);
                    }}
                    placeholder="Enter what AI should remember (one item per line, e.g.)&#13;• Allergic to peanuts&#13;• Prefers high-protein low-carb dinners&#13;• Gym routine is Mon/Wed/Fri mornings"
                    className="w-full bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-xs font-semibold text-stone-850 placeholder-stone-400 resize-none min-h-[180px] leading-relaxed transition-all"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingMemory(true)}
                    className="text-xs leading-relaxed min-h-[180px] py-0.5 cursor-text whitespace-pre-line text-left"
                  >
                    {draftMemories ? (
                      draftMemories.split("\n").map((line, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 py-0.5 text-stone-800 font-semibold">
                          <span className="text-orange-500">•</span>
                          <span>{line}</span>
                        </div>
                      ))
                    ) : (
                      <span className="font-medium text-stone-450 italic">
                        Tap here to write down things for the AI to remember...
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center text-[7px] font-black uppercase text-stone-400 tracking-widest px-1">
                <span>Auto-saves instantly</span>
                <span>{draftMemories.split("\n").filter(l => l.trim().length > 0).length} Memory Slots Active</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log to Recipe Modal */}
      <AnimatePresence>
        {showLogsToRecipeModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGeneratingRecipe && setShowLogsToRecipeModal(false)}
              className="absolute inset-0 bg-black/60"
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
                              {meal.calories} KCAL • P: {meal.protein}g C: {meal.carbs}g F: {meal.fats}g
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
      </AnimatePresence>
    </motion.div>
  );
};
