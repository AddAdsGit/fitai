import React, { useState, useMemo } from "react";
import {
  Utensils,
  X,
  Search,
  Camera,
  Sparkles,
  Edit2,
  Plus,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import type { Meal } from "../types";
import { hasNoGeneratedImage } from "../utils/helpers";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

// Initial default food items for quick log
const QUICK_LOG_DEFAULTS = [
  { name: "Morning Avocado Toast", calories: 320, protein: 12, carbs: 35, fats: 18, image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=60", type: "Breakfast" },
  { name: "Quinoa Power Bowl", calories: 450, protein: 22, carbs: 55, fats: 15, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=60", type: "Lunch" },
  { name: "Avocado Salmon Protein Bowl", calories: 420, protein: 34, carbs: 12, fats: 28, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80", type: "Meal" },
  { name: "Spinach Oat Pancakes", calories: 310, protein: 16, carbs: 45, fats: 8, image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80", type: "Breakfast" },
  { name: "Keto Spinach & Cheese Omelette", calories: 290, protein: 22, carbs: 3, fats: 22, image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80", type: "Breakfast" },
  { name: "Mediterranean Chickpea Salad", calories: 340, protein: 12, carbs: 48, fats: 10, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80", type: "Lunch" },
];

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
}

export const ManualLogModal = ({
  onClose,
  onAddMeal,
  mealToEdit,
  onNavigateToSettings,
  mealsState = [],
  initialAiMode,
}: {
  onClose: () => void;
  onAddMeal: (meal: any) => void;
  mealToEdit?: Meal | null;
  onNavigateToSettings: () => void;
  mealsState?: Meal[];
  initialAiMode?: boolean;
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
  const [segment, setSegment] = useState<"quick" | "detailed">(() => {
    if (mealToEdit) return "detailed";
    if (initialAiMode) return "detailed";
    return "quick";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [imageUrl, setImageUrl] = useState(mealToEdit?.image || "");
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAiMode, setShowAiMode] = useState(initialAiMode || false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasImage = imageUrl && !hasNoGeneratedImage(imageUrl);
  // True if the user has entered any macro/name data (determines Write vs Edit label)
  const hasAnyValues = !!(name.trim() || calories || protein || carbs || fats);

  const hasGeminiKey = true;

  const quickLogItems = useMemo(() => {
    const itemsMap = new Map<string, QuickLogItem>();
    const getKey = (n: string) => n.trim().toLowerCase();

    // 1. Add user history items first (most recent)
    if (mealsState) {
      mealsState.forEach(item => {
        const key = getKey(item.name);
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            image: item.image || "",
            type: item.type,
            meal_description: (item as any).meal_description || "",
            fiber: (item as any).fiber || 0
          });
        }
      });
    }

    // 2. Add system defaults
    QUICK_LOG_DEFAULTS.forEach(item => {
      const key = getKey(item.name);
      if (!itemsMap.has(key)) {
        itemsMap.set(key, item);
      }
    });

    return Array.from(itemsMap.values());
  }, [mealsState]);

  const filteredQuickItems = useMemo(() => {
    if (!searchQuery.trim()) return quickLogItems;
    const q = searchQuery.toLowerCase();
    return quickLogItems.filter(item => 
      item.name.toLowerCase().includes(q) || 
      (item.meal_description || "").toLowerCase().includes(q)
    );
  }, [quickLogItems, searchQuery]);

  const handleRefineWithAi = async () => {
    if (!aiInstruction.trim()) return;

    const key = localStorage.getItem("fitai_gemini_api_key") ||
                (import.meta as any).env.VITE_GEMINI_API_KEY ||
                "";

    setIsProcessing(true);
    setErrorMessage("");
    try {
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

Return a JSON object containing the updated values:
{
  "name": "updated name (include modifications if relevant)",
  "calories": updated_calories,
  "protein": updated_protein,
  "carbs": updated_carbs,
  "fats": updated_fats,
  "fiber": updated_fiber,
  "description": "updated description of the portion or extra toppings/side items"
}
Do not return any markdown formatting, backticks, or "json" prefix. Just return the raw JSON string itself.`
        : `You are a nutrition estimator. Estimate the nutritional content of this meal description.
Meal description: "${aiInstruction}"

Return a JSON object with estimated nutritional values:
{
  "name": "Clean meal name",
  "calories": estimated_calories,
  "protein": estimated_protein_grams,
  "carbs": estimated_carbs_grams,
  "fats": estimated_fats_grams,
  "fiber": estimated_fiber_grams,
  "description": "Brief description of serving size, preparation style, and sides"
}
Do not return any markdown formatting, backticks, or "json" prefix. Just return the raw JSON string itself.`;

      let response = null;
      let lastError = "";
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
              headers: {
                "Content-Type": "application/json",
              },
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

        const data = await response.json();
        rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
        className="bg-white/85 backdrop-blur-xl border-t border-x border-white/60 rounded-t-[36px] w-full max-w-md p-6 space-y-6 relative z-10 shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center pb-2 border-b border-black/[0.04] shrink-0">
          <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-1.5 font-sans">
            <Utensils className="w-4 h-4 text-orange-500" />
            {showAiMode 
              ? (mealToEdit || hasAnyValues ? "Edit Log with AI 🤖" : "Write Log with AI 🤖")
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
              Quick Log
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

              {/* Food Items List */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-0.5">
                {filteredQuickItems.length === 0 ? (
                  <div className="text-center py-8 text-stone-450 text-[10px] font-bold">
                    No matching food items found.
                  </div>
                ) : (
                  filteredQuickItems.map((item, index) => {
                    const isDefaultImage = hasNoGeneratedImage(item.image);
                    return (
                      <div
                        key={`${item.name}-${index}`}
                        className="bg-stone-50/40 hover:bg-stone-50 border border-stone-200/50 rounded-2xl p-3 flex items-center justify-between gap-3 transition-colors shadow-2xs"
                      >
                        {/* Left Side: Preview & Name & Macros */}
                        <div className="flex items-center gap-3 min-w-0">
                          {isDefaultImage ? (
                            <div className="w-12 h-12 rounded-xl bg-orange-50/70 flex items-center justify-center text-xl shrink-0 border border-orange-100/50 shadow-inner select-none">
                              🍴
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-stone-200/60 shadow-2xs">
                              <img
                                src={item.image}
                                className="w-full h-full object-cover"
                                alt={item.name}
                              />
                            </div>
                          )}

                          <div className="text-left min-w-0">
                            <h5 className="text-[11px] font-black text-stone-900 truncate leading-snug">
                              {item.name}
                            </h5>
                            {item.meal_description && (
                              <p className="text-[9px] text-stone-400 font-medium truncate leading-tight mt-0.5" title={item.meal_description}>
                                {item.meal_description}
                              </p>
                            )}
                            <div className="text-[9px] font-bold text-stone-505 mt-1 flex flex-wrap gap-x-1.5 items-center">
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
                                type: item.type || "Meal",
                                image: item.image,
                                meal_description: item.meal_description || ""
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
                        <input
                          type="text"
                          placeholder="12:30 PM"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 text-center focus:outline-none focus:border-orange-500"
                        />
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
                      rows={6}
                      autoFocus
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5 text-xs font-semibold text-stone-900 focus:outline-none focus:border-orange-400 placeholder-stone-350 resize-none leading-relaxed"
                    />
                    <p className="text-[9px] text-stone-400 font-medium leading-relaxed">
                      AI will {hasAnyValues ? "recalculate macros based on your changes" : "estimate calories and macros from your description"}.
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
                    className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-stone-600 bg-stone-100 hover:bg-stone-200/85 active:scale-[0.98] transition-all duration-200 cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRefineWithAi}
                    disabled={!aiInstruction.trim() || isProcessing}
                    className="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 disabled:opacity-40 text-white text-xs py-3 rounded-2xl font-black uppercase tracking-widest text-center shadow-md shadow-orange-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center select-none"
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
                  {hasGeminiKey && (
                    <button
                      type="button"
                      onClick={() => setShowAiMode(true)}
                      className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center shadow-md shadow-orange-500/10"
                    >
                      {mealToEdit || hasAnyValues ? "AI Editor" : "AI Logger"}
                    </button>
                  )}
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
                        meal_description: mealDescription.trim()
                      });
                      onClose();
                    }}
                    className={cn(
                      "py-3 rounded-2xl text-white text-xs font-black uppercase tracking-widest text-center shadow-md shadow-emerald-600/15 active:scale-[0.98] transition-all duration-200 cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110",
                      hasGeminiKey ? "flex-1" : "w-full"
                    )}
                  >
                    Save
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};
