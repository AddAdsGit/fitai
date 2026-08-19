import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  BookOpen,
  Utensils,
  Plus,
  Edit2,
  AtSign,
  Wand2,
} from "lucide-react";
import { PastFoodCard, PastFoodItem } from "./PastFoodCard";
import { FoodFilterBar } from "./FoodFilterBar";
import { PortionStepper } from "./PortionStepper";
import {
  filterAndSortFoods,
  getUserActiveAiTags,
  INITIAL_FOOD_FILTER_STATE,
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
  const [foodFilters, setFoodFilters] = useState<FoodFilterState>(INITIAL_FOOD_FILTER_STATE);
  const [selectedDrawerItems, setSelectedDrawerItems] = useState<PastFoodItem[]>([]);
  const [portionMultiplier, setPortionMultiplier] = useState(1);

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
    const mult = portionMultiplier > 0 ? portionMultiplier : 1;

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
      <div className="fixed inset-0 z-[9999] flex items-end justify-center font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/40 backdrop-blur-md"
        />

        {/* Mobile Popup Modal Sheet Card */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col h-[92vh] max-h-[92dvh] overflow-hidden text-left"
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
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 sm:px-5 space-y-2.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                return (
                  <PastFoodCard
                    key={`${item.source}-${item.name}`}
                    item={item}
                    trackedNutrients={activeTrackedNutrients}
                    isSelected={isSelected}
                    onToggleSelect={toggleDrawerItemSelect}
                    onModify={undefined}
                  />
                );
              })
            )}
          </div>

          {/* STICKY BOTTOM DUAL CTA BAR FOR MULTI-SELECT & QUICK LOG */}
          <div className="shrink-0 p-4 pt-2.5 border-t border-black/[0.04] bg-[#FAF7F2]">
            {selectedDrawerItems.length > 0 ? (
              <div className="space-y-2.5">
                {/* Portion Stepper for Selected Items */}
                <div className="bg-white/90 border border-stone-200/90 rounded-2xl p-2 shadow-3xs">
                  <PortionStepper
                    value={portionMultiplier}
                    onChange={setPortionMultiplier}
                    label={selectedDrawerItems.length === 1 ? `Portion (${selectedDrawerItems[0].name})` : `Portion Multiplier`}
                  />
                </div>

                {/* Primary CTA: Quick Add */}
                <button
                  type="button"
                  onClick={handleQuickLogSelectedItems}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all font-sans"
                >
                  <Plus className="w-4 h-4 text-white stroke-[3]" />
                  <span>
                    Quick Add ({selectedDrawerItems.length})
                    {selectedDrawerItems.length === 1 && (
                      <span className="opacity-90 font-bold ml-1">
                        • {Math.round(selectedDrawerItems[0].calories * (portionMultiplier > 0 ? portionMultiplier : 1))} kcal
                      </span>
                    )}
                  </span>
                </button>

                {/* Secondary CTA: Modify & Add (1) OR Combine with AI (2+) */}
                {selectedDrawerItems.length === 1 ? (
                  <button
                    type="button"
                    onClick={handleModifySelectedItems}
                    className="w-full py-3 bg-white/90 hover:bg-stone-100 border border-stone-300/80 text-orange-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-3xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all font-sans"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-orange-500" />
                    <span>Modify & Add (1)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleModifySelectedItems}
                    className="w-full py-3 bg-white/90 hover:bg-stone-100 border border-stone-300/80 text-orange-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-3xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all font-sans"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-orange-500" />
                    <span>Combine & Edit with AI ({selectedDrawerItems.length})</span>
                  </button>
                )}
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
