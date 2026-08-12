import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Utensils,
  X,
  Search,
  Camera,
  Sparkles,
  Edit2,
  Plus,
  Clock,
  BookOpen,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import type { Meal } from "../types";
import { hasNoGeneratedImage, getMealEmoji } from "../utils/helpers";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { DEFAULT_TRACKING_TAGS } from "./SettingsView";
import { TimePickerModal } from "./TimePickerModal";

const QUICK_LOG_DEFAULTS: any[] = [];

interface QuickLogItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  image: string;
  type?: string;
  meal_description?: string;
  fiber?: number;
  logCount?: number;
  source: "recipe" | "recent";
}

export const ManualLogModal = ({
  onClose,
  onAddMeal,
  mealToEdit,
  onNavigateToSettings,
  mealsState = [],
  recipesState = [],
  initialAiMode,
  profileData,
  initialSegment,
  autoTriggerPhotoScan,
}: {
  onClose: () => void;
  onAddMeal: (meal: any) => void;
  mealToEdit?: Meal | null;
  onNavigateToSettings: () => void;
  mealsState?: Meal[];
  recipesState?: any[];
  initialAiMode?: boolean;
  profileData?: any;
  initialSegment?: "quick" | "detailed";
  autoTriggerPhotoScan?: boolean;
}) => {
  const [name, setName] = useState(mealToEdit?.name || "");
  const [calories, setCalories] = useState(mealToEdit ? String(mealToEdit.calories) : "");
  const [protein, setProtein] = useState(mealToEdit ? String(mealToEdit.protein) : "");
  const [carbs, setCarbs] = useState(mealToEdit ? String(mealToEdit.carbs) : "");
  const [fats, setFats] = useState(mealToEdit ? String(mealToEdit.fats) : "");
  const [fiber, setFiber] = useState(mealToEdit && (mealToEdit as any).fiber ? String((mealToEdit as any).fiber) : "");
  const [mealDescription, setMealDescription] = useState((mealToEdit as any)?.meal_description || "");
  const [time, setTime] = useState(() => {
    if (mealToEdit?.time) return mealToEdit.time;
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return new Date().toLocaleTimeString("en-US", timeOptions);
  });

  const isEditing = !!mealToEdit;
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [segment, setSegment] = useState<"quick" | "detailed">(() => {
    if (mealToEdit) return "detailed";
    if (initialSegment) return initialSegment;
    if (initialAiMode) return "detailed";
    return "quick";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [pastFoodFilter, setPastFoodFilter] = useState<"all" | "recipes" | "recent">("all");
  const [aiInstruction, setAiInstruction] = useState("");
  const [imageUrl, setImageUrl] = useState(mealToEdit?.image || "");
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAiMode, setShowAiMode] = useState(initialAiMode || false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (mealToEdit && Array.isArray((mealToEdit as any).tags)) {
      return (mealToEdit as any).tags;
    }
    return [];
  });

  const geminiKeyTag = (profileData?.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
  const preferenceGeminiKey = geminiKeyTag.split(":")[1] || "";
  const hasGeminiKey = !!preferenceGeminiKey;

  const convert24hTo12h = (time24: string): string => {
    const [hoursStr, minutesStr] = time24.split(":");
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutesStr} ${ampm}`;
  };

  const convert12hTo24h = (time12: string): string => {
    const [timeVal, modifier] = time12.split(" ");
    let [hoursStr, minutesStr] = timeVal.split(":");
    let hours = parseInt(hoursStr, 10);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutesStr}`;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoTriggerPhotoScan && hasGeminiKey && fileInputRef.current) {
      const t = setTimeout(() => {
        fileInputRef.current?.click();
      }, 300);
      return () => clearTimeout(t);
    } else if (autoTriggerPhotoScan && !hasGeminiKey) {
      setErrorMessage("Please configure your Gemini API Key in Settings to use photo recognition.");
    }
  }, [autoTriggerPhotoScan, hasGeminiKey]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const hasImage = (imageUrl && !hasNoGeneratedImage(imageUrl)) || !!uploadedImage;
  const hasAnyValues = !!(name.trim() || calories || protein || carbs || fats);

  const quickLogItems = useMemo(() => {
    const items: QuickLogItem[] = [];
    const seenNames = new Set<string>();
    const getKey = (n: string) => n.trim().toLowerCase();

    // Calculate count of each meal logged in history
    const mealCounts = new Map<string, number>();
    if (mealsState) {
      mealsState.forEach(item => {
        const key = getKey(item.name);
        mealCounts.set(key, (mealCounts.get(key) || 0) + 1);
      });
    }

    // 1. Add all saved user recipes first
    if (recipesState) {
      recipesState.forEach(recipe => {
        const key = getKey(recipe.name);
        seenNames.add(key);
        items.push({
          name: recipe.name,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fats: recipe.fats,
          image: recipe.image || "",
          type: "Recipe",
          meal_description: recipe.description || "",
          fiber: recipe.fiber || 0,
          logCount: mealCounts.get(key) || 0,
          source: "recipe"
        });
      });
    }

    // 2. Add user recent meal logs
    if (mealsState) {
      mealsState.forEach(item => {
        const key = getKey(item.name);
        if (!seenNames.has(key)) {
          seenNames.add(key);
          items.push({
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            image: item.image || "",
            type: item.type || "Meal",
            meal_description: (item as any).meal_description || "",
            fiber: (item as any).fiber || 0,
            logCount: mealCounts.get(key) || 1,
            source: "recent"
          });
        }
      });
    }

    // 3. Add system defaults
    QUICK_LOG_DEFAULTS.forEach(item => {
      const key = getKey(item.name);
      if (!seenNames.has(key)) {
        seenNames.add(key);
        items.push({
          ...item,
          source: "recent"
        });
      }
    });

    return items;
  }, [mealsState, recipesState]);

  const filteredQuickItems = useMemo(() => {
    let result = quickLogItems;
    if (pastFoodFilter === "recipes") {
      result = result.filter(item => item.source === "recipe");
    } else if (pastFoodFilter === "recent") {
      result = result.filter(item => item.source === "recent");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) || 
        (item.meal_description || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [quickLogItems, pastFoodFilter, searchQuery]);

  const handleRefineWithAi = async () => {
    if (!aiInstruction.trim() && !uploadedImage) return;

    // Only the user's own key (from their profile preferences) may be used for
    // direct multimodal calls; the app never ships or caches its own key.
    const geminiKeyTag = (profileData?.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
    const key = geminiKeyTag.split(":")[1] || "";

    const enabledTrackingTags = (profileData?.tracking_tags || DEFAULT_TRACKING_TAGS)
      .filter((t: any) => t.enabled)
      .map((t: any) => ({ name: t.name, description: t.description }));
    const enabledTagsJson = JSON.stringify(enabledTrackingTags);

    setIsProcessing(true);
    setErrorMessage("");
    try {
      let rawText = "";
      
      if (uploadedImage) {
        if (!key) {
          throw new Error("Gemini API key is required for plate scanning. Please configure it in Settings.");
        }
        
        // Extract base64 components
        const commaIndex = uploadedImage.indexOf(",");
        const mimeType = uploadedImage.substring(5, uploadedImage.indexOf(";base64"));
        const base64Data = uploadedImage.substring(commaIndex + 1);
        
        const imagePrompt = `Analyze the food plate shown in this image. Estimate the meal name, calorie count, protein, carbs, fats, fiber, description, and assign matching tags. 
User description/notes if any: "${aiInstruction || "estimate this food plate"}"

List of tags you are allowed to assign (assign ONLY if they apply, read their descriptions):
${enabledTagsJson}

Return a clean, valid JSON object containing these details, with no markdown, backticks, or other text:
{
  "name": "Clean meal name",
  "calories": estimated_calories,
  "protein": estimated_protein_grams,
  "carbs": estimated_carbs_grams,
  "fats": estimated_fats_grams,
  "fiber": estimated_fiber_grams,
  "description": "Brief description of servings and sides observed.",
  "tags": ["Tag Name 1", "Tag Name 2"]
}`;
        
        // Use gemini-2.5-flash for multimodal image analysis
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: imagePrompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          })
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${response.status} Error`);
        }
        
        const data = await response.json();
        rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        setImageUrl(uploadedImage); // Save the actual photo!
      } else {
        // Standard text analysis flow
        const prompt = hasAnyValues
          ? `You are a nutrition calculator. You are modifying a meal log based on an instruction.
Base meal:
- Name: "${name || "Meal"}"
- Calories: ${calories || 0} kcal
- Protein: ${protein || 0}g
- Carbs: ${carbs || 0}g
- Fats: ${fats || 0}g
- Fiber: ${fiber || 0}g
${mealDescription ? `- Description/Notes: "${mealDescription}"` : ""}

Instruction: "${aiInstruction}"

List of tags you are allowed to assign (assign ONLY if they apply, read their descriptions):
${enabledTagsJson}

Return a JSON object containing the updated values:
{
  "name": "updated name (include modifications if relevant)",
  "calories": updated_calories,
  "protein": updated_protein,
  "carbs": updated_carbs,
  "fats": updated_fats,
  "fiber": updated_fiber,
  "description": "updated description of the portion or extra toppings/side items",
  "tags": ["Tag Name 1", "Tag Name 2"]
}
Do not return any markdown formatting, backticks, or "json" prefix. Just return the raw JSON string itself.`
          : `You are a nutrition estimator. Estimate the nutritional content of this meal description.
Meal description: "${aiInstruction}"

List of tags you are allowed to assign (assign ONLY if they apply, read their descriptions):
${enabledTagsJson}

Return a JSON object with estimated nutritional values:
{
  "name": "Clean meal name",
  "calories": estimated_calories,
  "protein": estimated_protein_grams,
  "carbs": estimated_carbs_grams,
  "fats": estimated_fats_grams,
  "fiber": estimated_fiber_grams,
  "description": "Brief description of serving size, preparation style, and sides",
  "tags": ["Tag Name 1", "Tag Name 2"]
}
Do not return any markdown formatting, backticks, or "json" prefix. Just return the raw JSON string itself.`;

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
          // All text-generation Gemini calls go through the authenticated edge
          // function — the client never talks to Google directly with an API key.
          throw new Error("AI generation is unavailable right now. Please try again.");
        }
      }

      let cleaned = rawText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      const result = JSON.parse(cleaned);
      if (result.name) setName(result.name);
      if (result.calories !== undefined) setCalories(String(Math.max(0, parseInt(result.calories) || 0)));
      if (result.protein !== undefined) setProtein(String(Math.max(0, parseInt(result.protein) || 0)));
      if (result.carbs !== undefined) setCarbs(String(Math.max(0, parseInt(result.carbs) || 0)));
      if (result.fats !== undefined) setFats(String(Math.max(0, parseInt(result.fats) || 0)));
      if (result.fiber !== undefined) setFiber(String(Math.max(0, parseInt(result.fiber) || 0)));
      if (result.description !== undefined) setMealDescription(result.description);
      if (result.tags && Array.isArray(result.tags)) setSelectedTags(result.tags);
      setAiInstruction("");
      setShowAiMode(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`AI Processing Error: ${err.message || "Could not parse instruction"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/40 backdrop-blur-md"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="bg-white border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md p-6 space-y-5 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center pb-2 border-b border-black/[0.04] shrink-0">
          <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-1.5 font-sans">
            <Utensils className="w-4 h-4 text-orange-500" />
            {showAiMode 
              ? (mealToEdit || hasAnyValues ? "Edit Log with AI" : "Write Log with AI")
              : (mealToEdit ? "Edit Meal Log" : "New Calorie Log")}
          </h4>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100/80 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Segment Switcher — hidden when editing an existing meal */}
        {!isEditing && (
          <div className="flex bg-stone-100 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setSegment("quick")}
              className={cn(
                "flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                segment === "quick" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500 hover:text-stone-900"
              )}
            >
              Past Foods
            </button>
            <button
              onClick={() => setSegment("detailed")}
              className={cn(
                "flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                segment === "detailed" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500 hover:text-stone-900"
              )}
            >
              Detailed Log
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-0.5 space-y-4 text-left">
          {segment === "quick" ? (
            /* QUICK LOG TAB */
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search past logs & default foods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Overlay Chips Bar: All | Recipes | Recent Logs */}
              <div className="flex items-center gap-1.5 pt-0.5 pb-1">
                <button
                  type="button"
                  onClick={() => setPastFoodFilter("all")}
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer border select-none",
                    pastFoodFilter === "all"
                      ? "bg-stone-900 border-stone-900 text-white shadow-3xs"
                      : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                  )}
                >
                  All ({quickLogItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPastFoodFilter("recipes")}
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer border flex items-center gap-1 select-none",
                    pastFoodFilter === "recipes"
                      ? "bg-orange-500 border-orange-500 text-white shadow-3xs"
                      : "bg-orange-50/70 border-orange-200/80 text-orange-700 hover:bg-orange-100/80"
                  )}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Recipes</span>
                  <span className="text-[8px] font-mono opacity-90">({quickLogItems.filter(i => i.source === "recipe").length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPastFoodFilter("recent")}
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer border flex items-center gap-1 select-none",
                    pastFoodFilter === "recent"
                      ? "bg-stone-900 border-stone-900 text-white shadow-3xs"
                      : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                  )}
                >
                  <History className="w-3 h-3" />
                  <span>Past Foods</span>
                  <span className="text-[8px] font-mono opacity-90">({quickLogItems.filter(i => i.source === "recent").length})</span>
                </button>
              </div>

              {/* Food Items List */}
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-0.5">
                {filteredQuickItems.length === 0 ? (
                  <div className="text-center py-8 text-stone-450 text-[10px] font-bold">
                    No matching {pastFoodFilter === "recipes" ? "recipes" : pastFoodFilter === "recent" ? "past foods" : "food items"} found.
                  </div>
                ) : (
                  filteredQuickItems.map((item, index) => {
                    const isDefaultImage = hasNoGeneratedImage(item.image);
                    return (
                      <div
                        key={`${item.name}-${index}`}
                        className="bg-white/60 hover:bg-white border border-stone-200/40 rounded-[22px] p-4 flex items-center justify-between gap-4 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.035)] active:scale-[0.99] group/card cursor-pointer"
                      >
                        {/* Left Side: Preview & Name & Macros */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          {isDefaultImage ? (
                            <div className="w-14 h-14 rounded-[16px] bg-orange-50/70 flex items-center justify-center shrink-0 border border-orange-100/50 shadow-inner select-none transition-transform duration-300 group-hover/card:scale-105 text-orange-500">
                              <Utensils className="w-6 h-6" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-[16px] overflow-hidden shrink-0 border border-stone-200/60 shadow-2xs transition-transform duration-300 group-hover/card:scale-105">
                              <img
                                src={item.image}
                                className="w-full h-full object-cover"
                                alt={item.name}
                              />
                            </div>
                          )}

                          <div className="text-left min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h5 className="text-[12px] font-black text-stone-900 truncate leading-snug">
                                {item.name}
                              </h5>
                              {item.source === "recipe" ? (
                                <span className="text-[7.5px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-stone-100/90 border border-stone-200/70 text-stone-600 shadow-3xs leading-none">
                                  Recipe
                                </span>
                              ) : (
                                <span className="text-[7.5px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-stone-100/90 border border-stone-200/70 text-stone-500 leading-none">
                                  Recent
                                </span>
                              )}
                              
                              <span className="text-[7.5px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 leading-none">
                                {item.logCount || 0} {item.logCount === 1 ? "log" : "logs"}
                              </span>
                            </div>
                            {item.meal_description && (
                              <p className="text-[9.5px] text-stone-400 font-semibold line-clamp-2 leading-relaxed" title={item.meal_description}>
                                {item.meal_description}
                              </p>
                            )}
                            <div className="text-[9.5px] font-bold text-stone-500 flex flex-wrap gap-x-2 items-center pt-0.5">
                              <span className="text-orange-600 font-extrabold">{item.calories} kcal</span>
                              <span className="text-stone-300">•</span>
                              <span>{item.protein}g P</span>
                              <span className="text-stone-300">•</span>
                              <span>{item.carbs}g C</span>
                              <span className="text-stone-300">•</span>
                              <span>{item.fats}g F</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Quick Add & Modify Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Modify Button */}
                          <button
                            onClick={() => {
                              setName(item.name);
                              setCalories(String(item.calories));
                              setProtein(String(item.protein));
                              setCarbs(String(item.carbs));
                              setFats(String(item.fats));
                              setFiber(String((item as any).fiber || 0));
                              setMealDescription(item.meal_description || "");
                              setSegment("detailed");
                            }}
                            className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40"
                            title="Modify before logging"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Add Button */}
                          <button
                            onClick={() => {
                              onAddMeal({
                                name: item.name,
                                calories: item.calories,
                                protein: item.protein,
                                carbs: item.carbs,
                                fats: item.fats,
                                fiber: item.fiber || 0,
                                type: item.type || "Meal",
                                image: item.image,
                                meal_description: item.meal_description || "",
                                tags: item.tags || []
                              });
                              onClose();
                            }}
                            className="w-8 h-8 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs shadow-orange-500/10"
                            title="Log immediately"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* DETAILED LOG TAB */
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {!showAiMode ? (
                  <motion.div
                    key="manual-form"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* ── Photo & Name Unified Card ── */}
                    <div
                      className="relative w-full rounded-3xl overflow-hidden border border-stone-200 bg-stone-50 transition-all duration-500 shadow-xs h-40"
                    >
                      {hasImage ? (
                        <img src={imageUrl} className="w-full h-full object-cover" alt="Meal photo" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-orange-500/10 via-amber-500/5 to-stone-100 flex flex-col items-center justify-center p-4">
                          <Camera className="w-6 h-6 text-stone-300" />
                        </div>
                      )}

                      {/* Top Right Action Buttons */}
                      <div className="absolute top-3 right-3 flex gap-2">
                        <label className="w-8 h-8 rounded-full backdrop-blur-md bg-black/35 hover:bg-black/55 border border-white/10 text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm active:scale-90 select-none">
                          <Camera className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setImageUrl(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>

                        {hasImage && (
                          <button
                            type="button"
                            onClick={() => setImageUrl("")}
                            className="w-8 h-8 rounded-full backdrop-blur-md bg-black/35 hover:bg-red-500/80 border border-white/10 text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm active:scale-90"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Bottom HUD glassmorphic bar for Item Name */}
                      <div className={cn(
                        "absolute bottom-3 left-3 right-3 rounded-2xl p-2.5 flex items-center gap-3 transition-all duration-300",
                        hasImage
                          ? "backdrop-blur-md bg-black/45 border border-white/10"
                          : "bg-stone-50 border border-stone-200/70 shadow-3xs"
                      )}>
                        <div className="flex-1 min-w-0 text-left">
                          <label className={cn(
                            "text-[8px] font-black uppercase tracking-wider block mb-0.5 leading-none",
                            hasImage ? "text-white/50" : "text-stone-400"
                          )}>
                            Item Name
                          </label>
                          <input
                            type="text"
                            placeholder="E.g. Grilled Chicken Salad"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn(
                              "w-full bg-transparent border-none p-0 text-xs font-black focus:outline-none focus:ring-0 truncate text-left",
                              hasImage ? "text-white placeholder-white/45" : "text-stone-850 placeholder-stone-400"
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Description — placed high, directly below Item Name */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                        Description
                      </label>
                      <textarea
                        placeholder="E.g. South Indian meals with dal, curd, salad, and Coke..."
                        value={mealDescription}
                        onChange={(e) => setMealDescription(e.target.value)}
                        rows={2}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-900 focus:outline-none focus:border-orange-400 placeholder-stone-350 resize-none leading-relaxed"
                      />
                    </div>

                    {/* Row 1: Calories + Log Time */}
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div>
                        <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                          Calories
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={calories}
                          onChange={(e) => setCalories(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 text-center focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Log Time
                        </label>
                        <div className="relative w-full">
                          <button
                            type="button"
                            onClick={() => setIsTimePickerOpen(true)}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 flex items-center justify-center gap-2 hover:bg-stone-100 transition-all cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>{time}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Protein, Carbs, Fats, Fiber */}
                    <div className="grid grid-cols-4 gap-2 text-left">
                      <div>
                        <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1 text-center truncate">
                          Protein
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={protein}
                          onChange={(e) => setProtein(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-1.5 py-2.5 text-xs font-bold text-stone-900 text-center focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1 text-center truncate">
                          Carbs
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={carbs}
                          onChange={(e) => setCarbs(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-1.5 py-2.5 text-xs font-bold text-stone-900 text-center focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1 text-center truncate">
                          Fats
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={fats}
                          onChange={(e) => setFats(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-1.5 py-2.5 text-xs font-bold text-stone-900 text-center focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1 text-center truncate">
                          Fiber
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={fiber}
                          onChange={(e) => setFiber(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-1.5 py-2.5 text-xs font-bold text-stone-900 text-center focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {/* Row 3: Tags Selector */}
                    <div className="text-left mt-3.5">
                      <label className="text-[10px] font-bold text-stone-550 block mb-2 px-1">
                        Active Tags
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {(profileData?.tracking_tags || DEFAULT_TRACKING_TAGS)
                          .filter((t: any) => t.enabled)
                          .map((tag: any) => {
                            const isSelected = selectedTags.includes(tag.name);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedTags(selectedTags.filter(t => t !== tag.name));
                                  } else {
                                    setSelectedTags([...selectedTags, tag.name]);
                                  }
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all select-none border cursor-pointer active:scale-95",
                                  isSelected
                                    ? "bg-stone-900 border-stone-900 text-white shadow-3xs"
                                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                                )}
                              >
                                <span className="text-xs">{tag.emoji}</span>
                                <span>{tag.name}</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ai-input"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3.5 py-2"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                      <span>{hasAnyValues ? "Edit with AI" : "Write with AI"}</span>
                    </div>
                    {errorMessage && (
                      <div className="bg-red-50 border border-red-150 text-red-650 rounded-2xl px-3 py-2 text-[10px] font-bold text-left leading-relaxed">
                        ⚠️ {errorMessage}
                      </div>
                    )}
                     <textarea
                      placeholder={hasAnyValues
                        ? `Describe changes... e.g. "double the portion", "swap rice for quinoa", "add 1 egg"`
                        : `Describe your meal... e.g. "200g grilled chicken with steamed broccoli and brown rice"`}
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      rows={4}
                      autoFocus
                      className="w-full bg-white border-2 border-orange-400/80 focus:border-orange-500 focus:outline-none focus:ring-0 rounded-2xl px-4 py-3.5 text-xs font-semibold text-stone-900 placeholder-stone-400 resize-none leading-relaxed shadow-3xs"
                    />

                    {/* Multimodal Camera Scan Controls */}
                    <div className="flex flex-col gap-3 py-1 text-left">
                      <div className="flex gap-2">
                        <label 
                          onClick={(e) => {
                            if (!hasGeminiKey) {
                              e.preventDefault();
                              setErrorMessage("Please configure your Gemini API Key in Settings to use photo recognition.");
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white border border-stone-200 hover:bg-stone-50 rounded-2xl text-[10px] font-black uppercase text-stone-700 cursor-pointer transition-all select-none active:scale-[0.98] shadow-3xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-stone-500" />
                          <span>Scan Plate</span>
                          {hasGeminiKey && (
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleImageFileChange}
                              className="hidden"
                            />
                          )}
                        </label>
                        <label 
                          onClick={(e) => {
                            if (!hasGeminiKey) {
                              e.preventDefault();
                              setErrorMessage("Please configure your Gemini API Key in Settings to use photo recognition.");
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white border border-stone-200 hover:bg-stone-50 rounded-2xl text-[10px] font-black uppercase text-stone-700 cursor-pointer transition-all select-none active:scale-[0.98] shadow-3xs"
                        >
                          <svg className="w-3.5 h-3.5 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                          <span>Upload Photo</span>
                          {hasGeminiKey && (
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileChange}
                              className="hidden"
                            />
                          )}
                        </label>
                      </div>
                      {uploadedImage && (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200 shadow-2xs group shrink-0">
                          <img src={uploadedImage} className="w-full h-full object-cover" alt="Preview" />
                          <button
                            type="button"
                            onClick={() => setUploadedImage(null)}
                            className="absolute top-1 right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white text-[9px] hover:bg-black font-sans font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-[9px] text-stone-400 font-medium leading-relaxed">
                      AI will {hasAnyValues ? "recalculate macros based on your changes" : "estimate calories and macros from your description or photo"}.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Fixed bottom CTA — always visible */}
        {segment === "detailed" && (
          <div className="shrink-0 pt-3 border-t border-stone-100">
            <AnimatePresence mode="wait">
              {showAiMode ? (
                <motion.div
                  key="ai-cta"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-2.5 w-full"
                >
                  <button
                    type="button"
                    onClick={() => { setShowAiMode(false); setAiInstruction(""); setErrorMessage(""); }}
                    className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200/60 active:scale-[0.98] transition-all duration-200 cursor-pointer text-center"
                  >
                    Manual Log
                  </button>
                  <button
                    type="button"
                    onClick={handleRefineWithAi}
                    disabled={(!aiInstruction.trim() && !uploadedImage) || isProcessing}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs py-3.5 rounded-2xl font-black uppercase tracking-widest text-center shadow-md shadow-orange-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center select-none font-bold"
                  >
                    {isProcessing ? "Calculating..." : "Generate"}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="log-cta"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-2.5 w-full"
                >
                  <button
                    type="button"
                    onClick={() => setShowAiMode(true)}
                    className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center shadow-md shadow-orange-500/25"
                  >
                    {mealToEdit || hasAnyValues ? "AI Editor" : "AI Logger"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!name.trim()) return;
                      onAddMeal({
                        id: mealToEdit?.id,
                        name: name.trim(),
                        calories: parseInt(calories) || 0,
                        protein: parseInt(protein) || 0,
                        carbs: parseInt(carbs) || 0,
                        fats: parseInt(fats) || 0,
                        fiber: parseInt(fiber) || 0,
                        type: mealToEdit?.type || "Manual Log",
                        time: time.trim(),
                        image: imageUrl,
                        meal_description: mealDescription.trim(),
                        tags: selectedTags
                      });
                      onClose();
                    }}
                    className="py-3 rounded-2xl text-white text-xs font-black uppercase tracking-widest text-center shadow-md shadow-emerald-600/15 active:scale-[0.98] transition-all duration-200 cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 flex-1"
                  >
                    Save
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <TimePickerModal
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        initialTime={time.includes("M") ? convert12hTo24h(time) : time}
        onSave={(timeStr) => {
          setTime(convert24hTo12h(timeStr));
        }}
        title="Set Meal Log Time"
      />
    </div>
  );
};
