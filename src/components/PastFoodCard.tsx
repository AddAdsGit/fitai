import React from "react";
import { Plus, Pin, Edit2, Utensils, X, Paperclip } from "lucide-react";
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
}> = ({ item, trackedNutrients, onPin, onAdd, onModify, onRemove, actionType = "add", variant = "light" }) => {
  const isDark = variant === "dark";

  // Determine user's top 4 tracked nutrients
  const activeNutrients = trackedNutrients && trackedNutrients.length > 0 
    ? trackedNutrients 
    : normalizeTrackedNutrients(DEFAULT_TRACKED_NUTRIENTS);

  const top4Nutrients = activeNutrients.slice(0, 4);

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

  // Clean, un-confusing short nutrient symbols (P, C, F, Fb, etc.)
  const getNutrientSymbol = (id: string, name: string): string => {
    const lowerId = id.toLowerCase();
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
      className={
        isDark
          ? "bg-stone-800/90 backdrop-blur-md rounded-2xl border border-stone-700/80 p-3 flex items-center justify-between gap-2.5 shadow-md hover:border-orange-500/40 transition-all text-left w-full"
          : "bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200/80 p-3 flex items-center justify-between gap-2.5 shadow-3xs hover:shadow-2xs transition-all text-left w-full"
      }
    >
      {/* Left Image / Placeholder */}
      <div
        className={
          isDark
            ? "w-12 h-12 rounded-2xl bg-stone-900 border border-stone-700/80 overflow-hidden shrink-0 flex items-center justify-center shadow-inner"
            : "w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200/60 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs"
        }
      >
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Utensils className={isDark ? "w-5 h-5 text-stone-500" : "w-5 h-5 text-stone-400"} />
        )}
      </div>

      {/* Middle Details */}
      <div className="flex-1 min-w-0 pr-1 space-y-1">
        {/* Title + Badges Row */}
        <div className="flex items-center gap-1.5 min-w-0">
          <h4
            className={isDark ? "text-xs font-black text-white truncate" : "text-xs font-black text-stone-900 truncate"}
            title={item.name}
          >
            {item.name}
          </h4>

          {/* Recipe vs Recent Badge */}
          {item.source === "recipe" ? (
            <span
              className={
                isDark
                  ? "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300 leading-none shrink-0"
                  : "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-purple-50 border border-purple-200/70 text-purple-600 leading-none shrink-0"
              }
            >
              Recipe
            </span>
          ) : (
            <span
              className={
                isDark
                  ? "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-stone-900 border border-stone-700 text-stone-400 leading-none shrink-0"
                  : "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-stone-100 border border-stone-200/70 text-stone-500 leading-none shrink-0"
              }
            >
              Recent
            </span>
          )}

          {/* Log Count Badge */}
          {item.logCount !== undefined && item.logCount > 0 && (
            <span
              className={
                isDark
                  ? "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 leading-none shrink-0"
                  : "text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 leading-none shrink-0"
              }
            >
              {item.logCount} {item.logCount === 1 ? "log" : "logs"}
            </span>
          )}
        </div>

        {/* 1-Line Description */}
        {item.meal_description && (
          <p className={isDark ? "text-[9.5px] text-stone-400 font-medium line-clamp-1 leading-tight" : "text-[9.5px] text-stone-400 font-semibold line-clamp-1 leading-tight"}>
            {item.meal_description}
          </p>
        )}

        {/* Dynamic Top-4 Nutrients Row */}
        <div className="text-[9.5px] font-bold flex items-center gap-1 pt-0.5 truncate whitespace-nowrap">
          <span className={isDark ? "text-orange-400 font-black shrink-0" : "text-orange-600 font-black shrink-0"}>
            {item.calories} kcal
          </span>
          
          {top4Nutrients.map((n) => {
            const val = getNutrientValue(n.id);
            const symbol = getNutrientSymbol(n.id, n.name);
            return (
              <React.Fragment key={n.id}>
                <span className={isDark ? "text-stone-600 shrink-0" : "text-stone-300 shrink-0"}>•</span>
                <span className={isDark ? "text-stone-300 font-bold shrink-0" : "text-stone-600 font-bold shrink-0"}>
                  {val}{n.unit || "g"} {symbol}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Modify / Edit Button */}
        {onModify && (
          <button
            type="button"
            onClick={() => onModify(item)}
            className={
              isDark
                ? "w-8 h-8 rounded-full bg-stone-900 hover:bg-stone-750 text-stone-300 flex items-center justify-center cursor-pointer transition-colors border border-stone-700 active:scale-90"
                : "w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40 active:scale-90"
            }
            title="Modify before logging"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Attach Button */}
        {actionType === "pin" && onPin && (
          <button
            type="button"
            onClick={() => onPin(item)}
            className="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-md shadow-orange-500/25 shrink-0"
            title="Attach to meal notes"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        )}

        {/* Remove / Detach Button */}
        {actionType === "remove" && (onRemove || onPin) && (
          <button
            type="button"
            onClick={() => (onRemove ? onRemove(item) : onPin && onPin(item))}
            className={
              isDark
                ? "w-8 h-8 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-300 flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-stone-700"
                : "w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-stone-200"
            }
            title="Detach / Remove item"
          >
            <X className={isDark ? "w-4 h-4 text-stone-400" : "w-4 h-4 text-stone-600"} />
          </button>
        )}

        {/* Add Immediately Button */}
        {actionType === "add" && onAdd && (
          <button
            type="button"
            onClick={() => onAdd(item)}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-sm shadow-orange-500/20 shrink-0"
            title="Log immediately"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        )}
      </div>
    </div>
  );
};
