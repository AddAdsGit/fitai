import React from "react";
import { Plus, Pin, Edit2, Utensils, X, Paperclip, AtSign, Check } from "lucide-react";
import { cn } from "../lib/utils";
import type { TrackedNutrient } from "../types";
import { DEFAULT_TRACKED_NUTRIENTS, normalizeTrackedNutrients } from "../constants/nutrition";

export interface PastFoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  image?: string;
  type?: string;
  meal_description?: string;
  logCount?: number;
  source?: "recipe" | "recent";
  tags?: string[];
  nutrients?: Record<string, number>;
}

export const PastFoodCard: React.FC<{
  item: PastFoodItem;
  trackedNutrients?: TrackedNutrient[];
  onPin?: (item: PastFoodItem) => void;
  onAdd?: (item: PastFoodItem) => void;
  onModify?: (item: PastFoodItem) => void;
  onRemove?: (item: PastFoodItem) => void;
  actionType?: "pin" | "add" | "remove";
  variant?: "light" | "dark";
  isSelected?: boolean;
  onToggleSelect?: (item: PastFoodItem) => void;
}> = ({ item, trackedNutrients, onPin, onAdd, onModify, onRemove, actionType = "add", variant = "light", isSelected, onToggleSelect }) => {
  const isDark = variant === "dark";

  // Determine user's top 4 tracked nutrients
  const activeNutrients = trackedNutrients && trackedNutrients.length > 0 
    ? trackedNutrients 
    : normalizeTrackedNutrients(DEFAULT_TRACKED_NUTRIENTS);

  const displayNutrients = activeNutrients;

  // Helper to extract value for a nutrient ID
  const getNutrientValue = (id: string): number => {
    if (item.nutrients && item.nutrients[id] !== undefined) {
      return item.nutrients[id];
    }
    if (id === "protein") return item.protein || 0;
    if (id === "carbs") return item.carbs || 0;
    if (id === "fats") return item.fats || 0;
    if (id === "fiber") return item.fiber || 0;
    return 0;
  };

  // Smart Adaptive Nutrient Display: Full names for <= 6, Compact shortcuts for > 6
  const getNutrientDisplayLabel = (id: string, name: string, totalCount: number): string => {
    const lowerId = id.toLowerCase();
    if (totalCount <= 6) {
      if (lowerId === "protein") return "Protein";
      if (lowerId === "carbs") return "Carbs";
      if (lowerId === "fats") return "Fats";
      if (lowerId === "fiber") return "Fiber";
      if (lowerId === "caffeine") return "Caff";
      if (lowerId === "sugar") return "Sugar";
      if (lowerId === "sodium") return "Sodium";
      return name;
    }
    if (lowerId === "protein") return "P";
    if (lowerId === "carbs") return "C";
    if (lowerId === "fats") return "F";
    if (lowerId === "fiber") return "Fb";
    if (lowerId === "caffeine") return "Caff";
    if (lowerId === "sugar") return "Sug";
    if (lowerId === "sodium") return "Na";
    return name.slice(0, 2);
  };

  return (
    <div
      onClick={() => onToggleSelect ? onToggleSelect(item) : (onPin && onPin(item))}
      className={
        isSelected
          ? isDark
            ? "relative bg-orange-950/30 border-2 border-orange-500 rounded-2xl flex items-stretch shadow-md shadow-orange-500/10 transition-all text-left w-full cursor-pointer select-none overflow-hidden"
            : "relative bg-orange-50/70 border-2 border-orange-500 rounded-2xl flex items-stretch shadow-md shadow-orange-500/10 transition-all text-left w-full cursor-pointer select-none overflow-hidden"
          : isDark
            ? "relative bg-stone-800/90 backdrop-blur-md rounded-2xl border-2 border-stone-700/80 flex items-stretch shadow-md hover:border-orange-500/40 transition-all text-left w-full cursor-pointer select-none overflow-hidden"
            : "relative bg-white/90 backdrop-blur-md rounded-2xl border-2 border-stone-200/80 flex items-stretch shadow-3xs hover:shadow-2xs transition-all text-left w-full cursor-pointer select-none overflow-hidden"
      }
    >
      {/* Left Column: Flush Full-Bleed 3:4 Vertical Photo (Zero White Margins) */}
      <div className="relative w-28 sm:w-32 aspect-[3/4] shrink-0 bg-stone-100 dark:bg-stone-900 flex items-center justify-center overflow-hidden">
        {/* Top-Left Image Overlay Checkbox Indicator */}
        {onToggleSelect && (
          <div className="absolute top-1.5 left-1.5 z-20">
            {isSelected ? (
              <div className="w-5 h-5 rounded-full bg-orange-500 border-2 border-white text-white flex items-center justify-center shadow-md shadow-orange-500/40">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-black/40 backdrop-blur-xs border-2 border-white/90 shadow-xs" />
            )}
          </div>
        )}

        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Utensils className={isDark ? "w-7 h-7 text-stone-500" : "w-7 h-7 text-stone-400"} />
        )}
        {/* Frosted Glassmorphic Calorie Overlay Pill */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 py-1 px-1 bg-black/65 backdrop-blur-md border border-white/20 rounded-xl text-center shadow-2xs pointer-events-none">
          <span className="text-[10px] font-black text-white uppercase tracking-wider block leading-none">
            {item.calories} <span className="text-[8px] font-medium opacity-90 lowercase">kcal</span>
          </span>
        </div>
      </div>

      {/* Middle Details (Clean Internal Padding & Right-Side Safe Zone) */}
      <div className="flex-1 min-w-0 p-2.5 sm:p-3 pr-3.5 sm:pr-4 space-y-1">
        {/* Clean 2-Line Title */}
        <h4
          className={cn(
            "text-xs font-black line-clamp-2 leading-tight pr-0",
            isDark ? "text-white" : "text-stone-900"
          )}
          title={item.name}
        >
          {item.name}
        </h4>

        {/* 2-Line Description */}
        {item.meal_description && (
          <p className={isDark ? "text-[9.5px] text-stone-400 font-medium line-clamp-2 leading-tight" : "text-[9.5px] text-stone-400 font-semibold line-clamp-2 leading-tight"}>
            {item.meal_description}
          </p>
        )}

        {/* Dynamic All Nutrients Row (Smart Adaptive Display) */}
        <div className="text-[9.5px] font-bold flex flex-wrap items-center gap-1.5 pt-0.5">
          {displayNutrients.map((n, idx) => {
            const val = getNutrientValue(n.id);
            const label = getNutrientDisplayLabel(n.id, n.name, displayNutrients.length);
            return (
              <React.Fragment key={n.id}>
                {idx > 0 && <span className={isDark ? "text-stone-600 shrink-0" : "text-stone-300 shrink-0"}>•</span>}
                <span className={isDark ? "text-stone-300 font-bold shrink-0" : "text-stone-600 font-bold shrink-0"}>
                  {val}{n.unit || "g"} {label}
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* Tags Row: AI Tags + Green Log Counter + RECIPE/RECENT Badge at the End */}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {item.tags && item.tags.length > 0 && item.tags.map((tag) => (
            <span
              key={tag}
              className={
                isDark
                  ? "text-[7.5px] font-bold px-1.5 py-0.5 rounded-md bg-orange-950/60 border border-orange-800/60 text-orange-300"
                  : "text-[7.5px] font-bold px-1.5 py-0.5 rounded-md bg-orange-50 border border-orange-200/60 text-orange-700"
              }
            >
              {tag}
            </span>
          ))}

          {/* Log Count Badge */}
          {item.logCount !== undefined && item.logCount > 0 && (
            <span
              className={
                isDark
                  ? "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 leading-none shrink-0"
                  : "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 leading-none shrink-0"
              }
            >
              {item.logCount} {item.logCount === 1 ? "log" : "logs"}
            </span>
          )}

          {/* Recipe vs Recent Badge (Friendly Sky Blue for Recipe) */}
          {item.source === "recipe" ? (
            <span
              className={
                isDark
                  ? "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-sky-950/80 border border-sky-800 text-sky-300 leading-none shrink-0"
                  : "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-sky-50 border border-sky-200/80 text-sky-700 leading-none shrink-0"
              }
            >
              Recipe
            </span>
          ) : (
            <span
              className={
                isDark
                  ? "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-stone-900 border border-stone-700 text-stone-400 leading-none shrink-0"
                  : "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-stone-100 border border-stone-200/70 text-stone-500 leading-none shrink-0"
              }
            >
              Recent
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
