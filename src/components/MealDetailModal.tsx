import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  Clock,
  Wand2,
  Edit2,
  Plus,
  Share2,
  Tag,
  ArrowLeft,
} from "lucide-react";
import { cn } from "../lib/utils";
import { normalizeTrackedNutrients, DEFAULT_TRACKED_NUTRIENTS } from "../constants/nutrition";
import { hasNoGeneratedImage, getMealEmoji, formatDisplayTime, formatNutrientValue } from "../utils/helpers";
import { getUserActiveAiTags } from "../utils/foodFilter";
import { PortionStepper } from "./PortionStepper";
import type { Meal, TrackedNutrient, Profile, Recipe } from "../types";

export interface MealDetailModalProps {
  meal: Meal | null;
  isOpen: boolean;
  onClose: () => void;
  onLogToday: (meal: Meal) => void;
  onConvertToRecipe?: (meal: Meal) => void;
  onEditMeal?: (meal: Meal) => void;
  onShareMeal?: (meal: Meal) => void;
  onDeleteMeal?: (meal: Meal) => void;
  profileData?: Profile;
  recipesState?: Recipe[];
  mealsState?: Meal[];
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  meal,
  isOpen,
  onClose,
  onLogToday,
  onConvertToRecipe,
  onEditMeal,
  onShareMeal,
  onDeleteMeal,
  profileData,
  recipesState = [],
  mealsState = [],
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [portionMultiplier, setPortionMultiplier] = useState(1);

  // Tracked nutrients normalization
  const activeTrackedNutrients: TrackedNutrient[] = useMemo(() => {
    try {
      return profileData?.tracked_nutrients && profileData.tracked_nutrients.length > 0
        ? profileData.tracked_nutrients
        : normalizeTrackedNutrients(DEFAULT_TRACKED_NUTRIENTS, profileData?.protein_goal || (profileData as any)?.goals?.dailyProtein);
    } catch {
      return DEFAULT_TRACKED_NUTRIENTS;
    }
  }, [profileData?.tracked_nutrients, profileData?.protein_goal, (profileData as any)?.goals?.dailyProtein]);

  // Log count calculation prioritizing lifetime recipe popularity
  const logCount = useMemo(() => {
    if (!meal?.name) return 1;
    try {
      const q = meal.name.trim().toLowerCase();
      if (Array.isArray(recipesState)) {
        const matchedRecipe = recipesState.find((r) => r && r.name && r.name.trim().toLowerCase() === q);
        if (matchedRecipe && matchedRecipe.log_count && matchedRecipe.log_count > 0) {
          return matchedRecipe.log_count;
        }
      }
      const count = Array.isArray(mealsState) ? mealsState.filter((m) => m && m.name && m.name.trim().toLowerCase() === q).length : 0;
      return Math.max(1, count);
    } catch {
      return 1;
    }
  }, [meal?.name, mealsState, recipesState]);

  // Check if already a recipe
  const isAlreadyRecipe = useMemo(() => {
    if (!meal) return false;
    if ((meal as any)?.recipe_id) return true;
    if (!meal.name || !Array.isArray(recipesState)) return false;
    try {
      const q = meal.name.trim().toLowerCase();
      return recipesState.some((r) => r && r.name && r.name.trim().toLowerCase() === q);
    } catch {
      return false;
    }
  }, [meal, recipesState]);

  const displayDate = useMemo(() => {
    if (!meal?.date) return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    try {
      const dateStr = String(meal.date).trim();
      if (!dateStr) return "Past Log";
      const parsed = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
      if (isNaN(parsed.getTime())) return dateStr;
      return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return String(meal.date || "Past Log");
    }
  }, [meal?.date]);

  // Helper to extract nutrient value
  const getNutrientVal = (nId: string): number => {
    if (!meal) return 0;
    try {
      if (meal.nutrients && typeof meal.nutrients === "object" && meal.nutrients[nId] !== undefined) {
        return Number(meal.nutrients[nId]) || 0;
      }
      if (nId === "protein") return Number(meal.protein) || 0;
      if (nId === "carbs") return Number(meal.carbs) || 0;
      if (nId === "fats") return Number(meal.fats) || 0;
      if (nId === "fiber") return Number((meal as any).fiber) || 0;
    } catch {
      return 0;
    }
    return 0;
  };

  const userActiveTags = useMemo(() => {
    return new Set(getUserActiveAiTags(profileData?.tracking_tags).map((t) => t.toLowerCase()));
  }, [profileData?.tracking_tags]);

  const tags = useMemo(() => {
    const raw = Array.isArray(meal?.tags) ? meal!.tags : [];
    return raw.filter((t) => t && userActiveTags.has(String(t).toLowerCase()));
  }, [meal?.tags, userActiveTags]);

  const getScaledMeal = (baseMeal: Meal): Meal => {
    const mult = portionMultiplier > 0 ? portionMultiplier : 1;
    const matchedRecipe = Array.isArray(recipesState)
      ? recipesState.find((r) => r && (r.id === (baseMeal as any).recipe_id || (r.name && r.name.trim().toLowerCase() === baseMeal.name.trim().toLowerCase())))
      : null;

    const recipeId = (baseMeal as any).recipe_id || matchedRecipe?.id;

    const scaledNutrients: Record<string, number> = {};
    if (baseMeal.nutrients) {
      Object.entries(baseMeal.nutrients).forEach(([k, v]) => {
        scaledNutrients[k] = Math.round((v || 0) * mult);
      });
    }

    return {
      ...baseMeal,
      recipe_id: recipeId,
      calories: Math.round(baseMeal.calories * mult),
      protein: Math.round(baseMeal.protein * mult),
      carbs: Math.round(baseMeal.carbs * mult),
      fats: Math.round(baseMeal.fats * mult),
      fiber: Math.round((baseMeal.fiber || 0) * mult),
      nutrients: Object.keys(scaledNutrients).length > 0 ? scaledNutrients : baseMeal.nutrients,
      meal_description: mult !== 1 ? `${baseMeal.meal_description ? baseMeal.meal_description + " • " : ""}${mult}x portion` : baseMeal.meal_description,
    } as any;
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && meal && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center font-sans" onClick={onClose}>
          {/* Backdrop */}
          <motion.div
            key="meal-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Sheet Container */}
          <motion.div
            key="meal-modal-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-[#FAF7F2] rounded-t-[36px] overflow-hidden flex flex-col max-h-[92vh] shadow-2xl z-10 border-t border-white/20 text-left font-sans"
          >
            {/* Scrollable Container (Image Header scrolls up naturally, CTA stays sticky at bottom) */}
            <div className="flex-1 overflow-y-auto min-h-0 text-left font-sans">
              {/* Hero Image / Banner (Bleeds to top border with zero white frame) */}
              <div className="h-56 sm:h-60 w-full relative shrink-0 bg-stone-900 overflow-hidden group">
                {meal.image && !hasNoGeneratedImage(meal.image) ? (
                  <img
                    src={meal.image}
                    className="w-full h-full object-cover"
                    alt={meal.name || "Meal"}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-stone-850 via-stone-900 to-stone-950 flex items-center justify-center text-5xl select-none">
                    {getMealEmoji(meal.name || "", meal.type)}
                  </div>
                )}

                {/* Gourmet Dark Ambient Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/45 to-black/20 pointer-events-none" />

                {/* Top Controls: Minimalist Back Button (Left) & Vibrant Orange Share Button (Right) */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                      title="Back"
                    >
                      <ArrowLeft className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {onShareMeal && (
                      <button
                        type="button"
                        onClick={() => {
                          onShareMeal(meal);
                        }}
                        className="h-8 px-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer border border-orange-400/40"
                        title="Share meal card"
                      >
                        <Share2 className="w-3.5 h-3.5 text-white" />
                        <span>Share</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Image Overlay: Symmetrical Frosted Pill + Full-Width Title + Clean Grey Metadata */}
                <div className="absolute bottom-4 left-4 right-4 z-10 text-left space-y-1.5">
                  {/* Log Count Frosted Pill */}
                  <div>
                    <div className="inline-flex items-center gap-1.5 bg-black/65 backdrop-blur-md border border-orange-400/50 px-3 py-1 rounded-full shadow-md">
                      <span className="w-2 h-2 rounded-full bg-orange-400 shadow-xs shadow-orange-400/80 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-300">
                        Logged {logCount} time{logCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  {/* Full Width Meal Title */}
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-md truncate font-sans leading-tight text-white">
                    {meal.name || "Meal Log"}
                  </h3>

                  {/* Clean Grey Text Metadata Line (Below Title) */}
                  <div className="flex items-center gap-1.5 text-stone-300 text-[11px] font-bold tracking-wide drop-shadow-sm">
                    <span className="text-orange-400 font-extrabold">{meal.calories || 0} KCAL</span>
                    <span className="text-stone-400 select-none">•</span>
                    <span>{formatDisplayTime(meal.time)}</span>
                    <span className="text-stone-400 select-none">•</span>
                    <span>{displayDate}</span>
                  </div>
                </div>
              </div>

              {/* Scrollable Details Content Body */}
              <div className="p-5 space-y-4 text-left">
              {/* 1. Quick Stats Banner (Logged Time & Total Energy) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white border border-stone-200/80 rounded-2xl p-3 shadow-3xs flex flex-col justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider truncate">
                      Logged Time
                    </span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/60 rounded-xl px-2.5 py-1.5 text-center">
                    <span className="text-xs font-black text-stone-900 font-mono block truncate">
                      {formatDisplayTime(meal.time)}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-stone-200/80 rounded-2xl p-3 shadow-3xs flex flex-col justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-orange-600 tracking-wider truncate">
                      Calories
                    </span>
                  </div>
                  <div className="bg-orange-50/60 border border-orange-200/60 rounded-xl px-2.5 py-1.5 text-center">
                    <span className="text-xs font-black text-orange-950 font-mono block truncate">
                      {meal.calories || 0} <span className="text-[9px] font-black text-orange-950/50 uppercase">kcal</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Description / Notes Detail */}
              {meal.meal_description && (
                <div className="space-y-1.5">
                  <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-widest block">
                    Meal Notes & Description
                  </span>
                  <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-3xs">
                    <p className="text-xs text-stone-700 font-medium leading-relaxed whitespace-pre-line">
                      {meal.meal_description}
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Macronutrient Density (Matching RecipeModal Tinted Cards) */}
              {activeTrackedNutrients && activeTrackedNutrients.length > 0 && (
                <div className="pt-2 border-t border-stone-200/60 space-y-2">
                  <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider block">
                    Macronutrient Density
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    {activeTrackedNutrients.map((n) => {
                      const val = getNutrientVal(n.id);
                      const cardColor = n.color || "#F97316";
                      return (
                        <div
                          key={n.id}
                          className="p-3 rounded-2xl border flex flex-col justify-between space-y-1 shadow-3xs"
                          style={{
                            backgroundColor: `${cardColor}12`,
                            borderColor: `${cardColor}35`,
                          }}
                        >
                          <span className="text-[9.5px] font-black uppercase tracking-wider truncate" style={{ color: cardColor }}>
                            {n.name}
                          </span>
                          <div className="bg-white border border-stone-200/80 rounded-xl px-2 py-1 text-center shadow-inner">
                            <span className="text-xs font-black text-stone-900">{formatNutrientValue(val)} {n.unit || "g"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Dietary & Tracking Tags */}
              {tags.length > 0 && (
                <div className="pt-2 border-t border-stone-200/60 space-y-2">
                  <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-widest block flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-stone-400" />
                    <span>Dietary & Tracking Tags</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold shadow-3xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Minimalist Capsule Delete Option */}
              {onDeleteMeal && (
                <div className="pt-3 pb-1 flex justify-center border-t border-stone-200/50">
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-[10px] font-bold text-stone-400 hover:text-red-500 uppercase tracking-widest cursor-pointer transition-colors bg-transparent border-none py-1 active:scale-95"
                    >
                      Delete Meal Log
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-red-50/90 border border-red-200/80 px-3.5 py-1.5 rounded-full animate-fade-in shadow-3xs">
                      <span className="text-[10.5px] font-bold text-red-950">Delete meal log?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteMeal(meal);
                          onClose();
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-full cursor-pointer transition-all active:scale-95 border-none"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800 cursor-pointer bg-transparent border-none"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

            {/* STICKY BOTTOM ACTIONS BAR */}
            <div className="sticky bottom-0 p-4 bg-white/95 backdrop-blur-md border-t border-stone-200/60 shrink-0 w-full font-sans space-y-2.5 z-20">
              {/* Portion Stepper for 1-Tap Scaling */}
              <div className="bg-white/90 border border-stone-200/90 rounded-2xl p-2 shadow-3xs">
                <PortionStepper
                  value={portionMultiplier}
                  onChange={setPortionMultiplier}
                  label="Portion Multiplier"
                />
              </div>

              {/* Row 1: Two White Secondary Buttons (Shared 50/50 width or 100% if single) */}
              <div className={cn("grid gap-2.5", !isAlreadyRecipe && onConvertToRecipe ? "grid-cols-2" : "grid-cols-1")}>
                {!isAlreadyRecipe && onConvertToRecipe && (
                  <button
                    type="button"
                    onClick={() => {
                      onConvertToRecipe(meal);
                      onClose();
                    }}
                    className="h-11 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-3xs"
                  >
                    <Wand2 className="w-4 h-4 text-orange-500" />
                    <span>Convert to Recipe</span>
                  </button>
                )}

                {onEditMeal && (
                  <button
                    type="button"
                    onClick={() => {
                      onEditMeal(getScaledMeal(meal));
                      onClose();
                    }}
                    className="h-11 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-3xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-600" />
                    <span>Edit / Modify</span>
                  </button>
                )}
              </div>

              {/* Row 2: One Signature Orange Primary Action Button (100% Full Width) */}
              <button
                type="button"
                onClick={() => {
                  onLogToday(getScaledMeal(meal));
                  onClose();
                }}
                className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-orange-500/25 border-none"
              >
                <Plus className="w-4 h-4 text-white stroke-[3]" />
                <span>
                  Log for Today (1-Tap)
                  {portionMultiplier !== 1 && (
                    <span className="opacity-90 font-bold ml-1">
                      • {Math.round(meal.calories * (portionMultiplier > 0 ? portionMultiplier : 1))} kcal
                    </span>
                  )}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
