import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  BookOpen,
  Utensils,
  Plus,
  Minus,
  Edit2,
  AtSign,
  Wand2,
} from "lucide-react";
import { PastFoodCard, PastFoodItem } from "./PastFoodCard";
import { FoodFilterBar } from "./FoodFilterBar";
import { PortionStepper } from "./PortionStepper";
import { StepperButton } from "./StepperButton";
import { cn } from "../lib/utils";
import {
  filterAndSortFoods,
  getUserActiveAiTags,
  INITIAL_FOOD_FILTER_STATE,
  loadSavedFoodFilters,
  type FoodFilterState,
} from "../utils/foodFilter";
import { normalizeTrackedNutrients, DEFAULT_TRACKED_NUTRIENTS } from "../constants/nutrition";
import type { Meal, Recipe, Profile, TrackedNutrient } from "../types";

export interface FoodLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: (meal: any) => void;
  onModifyMeal?: (item: PastFoodItem) => void;
  onCombineWithAi?: (items: PastFoodItem[]) => void;
  recipesState?: Recipe[];
  mealsState?: Meal[];
  profileData?: Profile;
  selectedDate: string;
  triggerToast: (msg: string) => void;
}

export const FoodLibraryModal: React.FC<FoodLibraryModalProps> = ({
  isOpen,
  onClose,
  onAddMeal,
  onModifyMeal,
  onCombineWithAi,
  recipesState = [],
  mealsState = [],
  profileData,
  selectedDate,
  triggerToast,
}) => {
  const [foodFilters, setFoodFilters] = useState<FoodFilterState>(loadSavedFoodFilters);
  const [selectedDrawerItems, setSelectedDrawerItems] = useState<PastFoodItem[]>([]);
  const [portionMultiplier, setPortionMultiplier] = useState(1);

  // Lock background body scroll to eliminate jitter and scroll bounce on mobile
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [isOpen]);

  const toggleDrawerItemSelect = (item: PastFoodItem) => {
    setSelectedDrawerItems((prev) => {
      const exists = prev.some((i) => i.name.toLowerCase() === item.name.toLowerCase());
      if (exists) {
        const next = prev.filter((i) => i.name.toLowerCase() !== item.name.toLowerCase());
        if (next.length === 0) setPortionMultiplier(1);
        return next;
      }
      return [...prev, item];
    });
  };

  const handleQuickLogSelectedItems = () => {
    if (selectedDrawerItems.length === 0) return;
    const isSingle = selectedDrawerItems.length === 1;
    const mult = isSingle && portionMultiplier > 0 ? portionMultiplier : 1;

    selectedDrawerItems.forEach((item) => {
      const scaledNutrients: Record<string, number> = {};
      if (item.nutrients) {
        Object.entries(item.nutrients).forEach(([k, v]) => {
          scaledNutrients[k] = Math.round((Number(v) || 0) * mult);
        });
      }

      onAddMeal({
        name: item.name,
        recipe_id: item.recipe_id || item.id,
        calories: Math.round(item.calories * mult),
        protein: Math.round(item.protein * mult),
        carbs: Math.round(item.carbs * mult),
        fats: Math.round(item.fats * mult),
        fiber: Math.round((item.fiber || 0) * mult),
        image: item.image,
        tags: item.tags,
        nutrients: Object.keys(scaledNutrients).length > 0 ? scaledNutrients : undefined,
        meal_description: mult !== 1 ? `${item.meal_description ? item.meal_description + " • " : ""}${mult}x portion` : item.meal_description,
        isAiGenerated: true,
      });
    });

    triggerToast(`Added ${selectedDrawerItems.length} item${selectedDrawerItems.length === 1 ? "" : "s"} to log!`);
    setSelectedDrawerItems([]);
    setPortionMultiplier(1);
    onClose();
  };

  const handleModifySelectedItems = () => {
    if (selectedDrawerItems.length === 0) return;

    if (selectedDrawerItems.length === 1) {
      const item = selectedDrawerItems[0];
      const mult = portionMultiplier > 0 ? portionMultiplier : 1;
      const scaledNutrients: Record<string, number> = {};
      if (item.nutrients) {
        Object.entries(item.nutrients).forEach(([k, v]) => {
          scaledNutrients[k] = Math.round((Number(v) || 0) * mult);
        });
      }

      const scaledItem: PastFoodItem = {
        ...item,
        id: item.id,
        recipe_id: item.recipe_id || item.id,
        calories: Math.round(item.calories * mult),
        protein: Math.round(item.protein * mult),
        carbs: Math.round(item.carbs * mult),
        fats: Math.round(item.fats * mult),
        fiber: Math.round((item.fiber || 0) * mult),
        nutrients: Object.keys(scaledNutrients).length > 0 ? scaledNutrients : item.nutrients,
      };

      if (onModifyMeal) {
        onModifyMeal(scaledItem);
      }
    } else {
      if (onCombineWithAi) {
        onCombineWithAi(selectedDrawerItems);
      } else if (onModifyMeal) {
        onModifyMeal(selectedDrawerItems[0]);
      }
    }

    setSelectedDrawerItems([]);
    setPortionMultiplier(1);
    onClose();
  };

  const activeTrackedNutrients: TrackedNutrient[] = useMemo(() => {
    return profileData?.tracked_nutrients && profileData.tracked_nutrients.length > 0
      ? profileData.tracked_nutrients
      : normalizeTrackedNutrients(DEFAULT_TRACKED_NUTRIENTS);
  }, [profileData?.tracked_nutrients]);

  // Active AI Tracking Tags (User configured in Profile / Onboarding)
  const availableAiTags = useMemo(() => {
    return getUserActiveAiTags(profileData?.tracking_tags);
  }, [profileData?.tracking_tags]);

  // Consolidate Recipes and Unique Past Meals
  const allLibraryItems: PastFoodItem[] = useMemo(() => {
    const items: PastFoodItem[] = [];

    // 1. Recipes
    if (foodFilters.showRecipes !== false) {
      (recipesState || []).forEach((r) => {
        items.push({
          id: r.id,
          recipe_id: r.id,
          name: r.name,
          calories: r.calories,
          protein: r.protein,
          carbs: r.carbs,
          fats: r.fats,
          fiber: r.fiber,
          image: r.image,
          type: "Recipe",
          meal_description: r.description || "Saved Recipe",
          source: "recipe",
          tags: r.tags,
          nutrients: (r as any).nutrients,
          logCount: r.log_count,
        });
      });
    }

    // 2. Recent Meals (Unique by name, newest first)
    if (foodFilters.showLogs !== false) {
      const seenRecentNames = new Set<string>();
      const mealCountMap: Record<string, number> = {};

      (mealsState || []).forEach((m) => {
        if (!m.name || !m.name.trim()) return;
        const lower = m.name.toLowerCase().trim();
        mealCountMap[lower] = (mealCountMap[lower] || 0) + 1;
      });

      // Avoid duplicating recipes if already listed
      const recipeNames = new Set((recipesState || []).map((r) => r.name.toLowerCase().trim()));

      [...(mealsState || [])].reverse().forEach((m) => {
        if (!m.name || !m.name.trim()) return;
        const lower = m.name.toLowerCase().trim();
        if (!seenRecentNames.has(lower) && !recipeNames.has(lower)) {
          seenRecentNames.add(lower);
          items.push({
            name: m.name,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fats: m.fats,
            fiber: m.fiber,
            image: m.image,
            type: m.type || "Meal",
            meal_description: m.meal_description || "",
            source: "recent",
            tags: m.tags,
            nutrients: m.nutrients,
            logCount: mealCountMap[lower] || 1,
          });
        }
      });
    }

    return items;
  }, [recipesState, mealsState, foodFilters.showRecipes, foodFilters.showLogs]);

  // Meal frequency map for sorting
  const mealFrequencyMap = useMemo(() => {
    const map: Record<string, number> = {};
    (mealsState || []).forEach((m) => {
      if (!m.name) return;
      const k = m.name.trim().toLowerCase();
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [mealsState]);

  // Filtered & Sorted list
  const filteredItems = useMemo(() => {
    return filterAndSortFoods(
      allLibraryItems as any,
      foodFilters,
      mealFrequencyMap,
      activeTrackedNutrients
    );
  }, [allLibraryItems, foodFilters, mealFrequencyMap, activeTrackedNutrients]);

  const handleQuickAdd = (item: PastFoodItem) => {
    const newMeal = {
      id: `meal-${Date.now()}`,
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      fiber: item.fiber || 0,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: selectedDate,
      type: item.type || "Meal",
      image: item.image || "",
      meal_description: item.meal_description || "",
      tags: item.tags || [],
      nutrients: item.nutrients || {
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        fiber: item.fiber || 0,
      },
    };

    onAddMeal(newMeal);
    triggerToast(`Logged "${item.name}" for today! 🍽️`);
    onClose();
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-end justify-center font-sans"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/40 backdrop-blur-md cursor-pointer touch-none"
        />

        {/* Mobile Popup Modal Sheet Card */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col max-h-[88vh] overflow-hidden text-left overscroll-contain touch-pan-y"
        >
          {/* Top Drag Indicator Pill */}
          <div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto mt-3 mb-1 shrink-0 select-none" />

          {/* Header Bar */}
          <div className="px-6 py-3 flex justify-between items-center border-b border-black/[0.04] shrink-0">
            <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <BookOpen className="w-4 h-4 text-orange-500" />
              Food Library
            </h4>
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors cursor-pointer border border-stone-200/60 shadow-3xs"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sticky Filter Section */}
          <div className="px-6 py-3 shrink-0 bg-[#FAF7F2]/95 backdrop-blur-xs border-b border-stone-200/40">
            <FoodFilterBar
              filters={foodFilters}
              onChange={setFoodFilters}
              availableTags={availableAiTags}
              trackedNutrients={activeTrackedNutrients}
              showTypeToggles={true}
              matchCount={filteredItems.length}
              placeholder="Search recipes, past meals, ingredients..."
            />
          </div>

          {/* Full-Height Scrollable Food Items List (Restored Safe Margins px-4 sm:px-5) */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 sm:px-5 space-y-2.5 overscroll-contain touch-pan-y [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 space-y-2 bg-white/60 rounded-3xl border border-dashed border-stone-200 p-6 my-2">
                <Utensils className="w-8 h-8 text-stone-300 mx-auto" />
                <h4 className="text-xs font-bold text-stone-700">No matching food items found</h4>
                <p className="text-[10px] text-stone-400 max-w-[240px] mx-auto">
                  Try adjusting your search query, dietary tags, or filter pills.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedDrawerItems.some((i) => i.name.toLowerCase() === item.name.toLowerCase());
                
                // Real-time live card scaling when single item portion is adjusted
                let displayItem = item;
                if (isSelected && selectedDrawerItems.length === 1 && portionMultiplier !== 1 && portionMultiplier > 0) {
                  const mult = portionMultiplier;
                  const scaledNutrients: Record<string, number> = {};
                  if (item.nutrients) {
                    Object.entries(item.nutrients).forEach(([k, v]) => {
                      scaledNutrients[k] = Math.round((Number(v) || 0) * mult);
                    });
                  }
                  displayItem = {
                    ...item,
                    calories: Math.round(item.calories * mult),
                    protein: Math.round(item.protein * mult),
                    carbs: Math.round(item.carbs * mult),
                    fats: Math.round(item.fats * mult),
                    fiber: Math.round((item.fiber || 0) * mult),
                    nutrients: Object.keys(scaledNutrients).length > 0 ? scaledNutrients : item.nutrients,
                  };
                }

                return (
                  <PastFoodCard
                    key={`${item.source}-${item.name}`}
                    item={displayItem}
                    trackedNutrients={activeTrackedNutrients}
                    isSelected={isSelected}
                    onToggleSelect={toggleDrawerItemSelect}
                    onModify={undefined}
                  />
                );
              })
            )}
          </div>

          {/* STICKY BOTTOM DUAL CTA BAR FOR MULTI-SELECT & QUICK LOG (EXACT 2-ROW DESIGN 3) */}
          <div className="shrink-0 p-4 pt-2.5 border-t border-black/[0.04] bg-[#FAF7F2]">
            {selectedDrawerItems.length > 0 ? (
              <div className="space-y-2.5">
                {/* ROW 1: 1-Item State vs 2+ Items State */}
                {selectedDrawerItems.length === 1 ? (
                  portionMultiplier === 1 ? (
                    /* STATE A: Baseline 1.00x: 50/50 Split (Left: Modify & Add | Right: [-] 1.00x [+] in thumb zone) */
                    <div className="grid grid-cols-2 gap-2.5 w-full">
                      {/* Left 50%: Modify & Add Button */}
                      <button
                        type="button"
                        onClick={handleModifySelectedItems}
                        className="h-11 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-3xs font-sans"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-orange-500" />
                        <span>Modify & Add</span>
                      </button>

                      {/* Right 50%: Compact Stepper Pill (Thumb Zone) */}
                      <div className="h-11 bg-white border border-stone-200/90 rounded-2xl px-2 py-1 flex items-center justify-between shadow-3xs transition-all w-full font-sans">
                        <StepperButton
                          onStep={() => setPortionMultiplier((prev) => Math.max(0.25, parseFloat((prev - 0.25).toFixed(2))))}
                          disabled={portionMultiplier <= 0.25}
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                          title="Decrease portion (-0.25x)"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </StepperButton>

                        <div className="flex items-center justify-center gap-0.5 min-w-0">
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            max="10"
                            value={portionMultiplier === 0 ? "" : portionMultiplier}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                setPortionMultiplier(val);
                              } else if (e.target.value === "") {
                                setPortionMultiplier(0);
                              }
                            }}
                            onBlur={() => {
                              if (portionMultiplier <= 0 || isNaN(portionMultiplier)) {
                                setPortionMultiplier(1);
                              }
                            }}
                            className="bg-transparent border-none text-center text-xs font-black text-stone-900 focus:outline-none w-10 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-[11px] font-bold text-stone-400 select-none">x</span>
                        </div>

                        <StepperButton
                          onStep={() => setPortionMultiplier((prev) => parseFloat((prev + 0.25).toFixed(2)))}
                          disabled={portionMultiplier >= 10}
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                          title="Increase portion (+0.25x)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </StepperButton>
                      </div>
                    </div>
                  ) : (
                    /* STATE B: Unified Full-Width Extended Pill (Left: (✕) Reset + Scaled Calories & Diff | Right: Controls pinned on Right) */
                    <div className="h-11 bg-white border border-stone-200/90 rounded-2xl px-2 py-1 flex items-center justify-between shadow-3xs transition-all w-full font-sans">
                      {/* Left Side: (✕) Reset Button + Live Scaled Calories & Diff */}
                      <div className="flex-1 flex items-center justify-start pl-1 pr-2 min-w-0 font-sans border-r border-stone-200/60 mr-1.5">
                        <button
                          type="button"
                          onClick={() => setPortionMultiplier(1)}
                          className="w-6 h-6 rounded-full bg-stone-100 hover:bg-orange-50 text-stone-400 hover:text-orange-600 flex items-center justify-center transition-all cursor-pointer border border-stone-200/40 active:scale-90 shrink-0 mr-1.5"
                          title="Reset portion to 1.00x"
                        >
                          <X className="w-3 h-3 stroke-[2.5]" />
                        </button>

                        <div className="flex-1 flex items-center justify-center gap-1 min-w-0 text-center truncate">
                          <span className="text-xs font-black text-stone-900 tabular-nums">
                            {Math.round(selectedDrawerItems[0].calories * (portionMultiplier > 0 ? portionMultiplier : 1))} kcal
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold tabular-nums ml-0.5",
                            Math.round(selectedDrawerItems[0].calories * (portionMultiplier > 0 ? portionMultiplier : 1)) - selectedDrawerItems[0].calories >= 0
                              ? "text-orange-600"
                              : "text-emerald-600"
                          )}>
                            ({Math.round(selectedDrawerItems[0].calories * (portionMultiplier > 0 ? portionMultiplier : 1)) - selectedDrawerItems[0].calories >= 0 ? "+" : ""}
                            {Math.round(selectedDrawerItems[0].calories * (portionMultiplier > 0 ? portionMultiplier : 1)) - selectedDrawerItems[0].calories})
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Stepper Controls pinned at exact right thumb position */}
                      <div className="w-[46%] sm:w-[45%] flex items-center justify-between shrink-0 pl-1">
                        <StepperButton
                          onStep={() => setPortionMultiplier((prev) => Math.max(0.25, parseFloat((prev - 0.25).toFixed(2))))}
                          disabled={portionMultiplier <= 0.25}
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                          title="Decrease portion (-0.25x)"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </StepperButton>

                        <div className="flex items-center justify-center gap-0.5 min-w-0">
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            max="10"
                            value={portionMultiplier === 0 ? "" : portionMultiplier}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                setPortionMultiplier(val);
                              } else if (e.target.value === "") {
                                setPortionMultiplier(0);
                              }
                            }}
                            onBlur={() => {
                              if (portionMultiplier <= 0 || isNaN(portionMultiplier)) {
                                setPortionMultiplier(1);
                              }
                            }}
                            className="bg-transparent border-none text-center text-xs font-black text-stone-900 focus:outline-none w-10 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-[11px] font-bold text-stone-400 select-none">x</span>
                        </div>

                        <StepperButton
                          onStep={() => setPortionMultiplier((prev) => parseFloat((prev + 0.25).toFixed(2)))}
                          disabled={portionMultiplier >= 10}
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                          title="Increase portion (+0.25x)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </StepperButton>
                      </div>
                    </div>
                  )
                ) : (
                  /* 2+ ITEMS SELECTED: Row 1 is Combine & Edit with AI */
                  <button
                    type="button"
                    onClick={handleModifySelectedItems}
                    className="w-full h-11 bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 font-black text-xs uppercase tracking-wider rounded-2xl shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all font-sans"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-orange-500" />
                    <span>Combine & Edit with AI ({selectedDrawerItems.length})</span>
                  </button>
                )}

                {/* ROW 2: Signature Orange Full-Width Primary Action (Clean, non-repetitive) */}
                <button
                  type="button"
                  onClick={handleQuickLogSelectedItems}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all font-sans border-none"
                >
                  <Plus className="w-4 h-4 text-white stroke-[3]" />
                  <span>Quick Add ({selectedDrawerItems.length})</span>
                </button>
              </div>
            ) : (
              <div className="w-full py-3.5 bg-stone-200/40 border border-stone-300/40 rounded-2xl text-[11px] font-bold text-stone-400 uppercase tracking-wider text-center flex items-center justify-center gap-2 cursor-not-allowed select-none font-sans">
                <AtSign className="w-3.5 h-3.5 text-stone-400/80 shrink-0" />
                <span>Tap food cards above to select items</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
