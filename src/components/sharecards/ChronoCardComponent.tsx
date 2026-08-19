import React from "react";
import { BrandLogo } from "../BrandLogo";

interface ChronoCardComponentProps {
  date?: string;
  calories: number;
  protein: number;
  targetProtein?: number;
  mealsList: any[];
  mealImages?: Record<string, HTMLImageElement | string>;
  handleStr?: string;
}

export const ChronoCardComponent: React.FC<ChronoCardComponentProps> = ({
  date,
  calories,
  protein,
  targetProtein = 150,
  mealsList = [],
  mealImages = {},
  handleStr = "@fitwarrior",
}) => {
  const getFormattedDate = () => {
    if (!date) return "TODAY";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "TODAY";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  };

  const totalMealsCount = mealsList.length;
  const maxDisplay = totalMealsCount >= 6 ? 5 : totalMealsCount;
  const topMeals = mealsList.slice(0, maxDisplay);
  const remainingMeals = totalMealsCount - maxDisplay;

  // Dynamic row sizing based on meal count to eliminate all wasted vertical space
  const rowHeight = 
    totalMealsCount <= 2 ? "h-[76px] p-3" :
    totalMealsCount <= 3 ? "h-[70px] p-3" :
    totalMealsCount === 4 ? "h-[62px] p-2.5" :
    "h-[56px] p-2";

  const thumbSize = 
    totalMealsCount <= 3 ? "w-12 h-12 rounded-xl" :
    totalMealsCount === 4 ? "w-11 h-11 rounded-xl" :
    "w-9 h-9 rounded-lg";

  const spaceGap = 
    totalMealsCount <= 3 ? "space-y-3" :
    totalMealsCount === 4 ? "space-y-2.5" :
    "space-y-2";

  return (
    <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] flex flex-col justify-between p-6 border border-white/10 font-sans bg-[#0A0B0D] text-white select-none box-border">
      {/* 1. Header Row */}
      <div className="flex items-center justify-between w-full shrink-0">
        <BrandLogo variant="mono_white" size={16} boxSize="w-7 h-7" />
        <span className="text-zinc-400 text-xs font-bold tracking-widest uppercase font-mono">
          {handleStr.startsWith("@") ? handleStr : `@${handleStr}`}
        </span>
      </div>

      {/* 2. Date & Title */}
      <div className="w-full shrink-0 mt-3 mb-1">
        <h2 className="font-black text-2xl tracking-tight text-white leading-none">
          {getFormattedDate()}
        </h2>
        <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase mt-1.5 block">
          Daily Timeline • {totalMealsCount} {totalMealsCount === 1 ? "Meal" : "Meals"}
        </span>
      </div>

      {/* 3. Timeline Stack with Dual Metric Pills */}
      <div className={`flex-1 flex flex-col justify-center ${spaceGap} my-2`}>
        {topMeals.length > 0 ? (
          <>
            {topMeals.map((meal, idx) => {
              const imageSrc = mealImages[meal.id || meal.name] || meal.image;
              const hasImage = !!imageSrc;

              return (
                <div
                  key={meal.id || idx}
                  className={`flex items-center justify-between gap-3 bg-zinc-900/70 border border-white/10 ${rowHeight} rounded-2xl shadow-sm`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {hasImage ? (
                      <img
                        src={typeof imageSrc === "string" ? imageSrc : imageSrc.src}
                        alt={meal.name}
                        className={`${thumbSize} object-cover border border-white/10 shrink-0`}
                      />
                    ) : (
                      <div className={`${thumbSize} bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-black text-zinc-300 shrink-0`}>
                        {meal.name ? meal.name[0].toUpperCase() : "M"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-white truncate leading-tight">
                        {meal.name || "Logged Meal"}
                      </span>
                      <span className="block text-[8px] text-zinc-400 font-mono uppercase mt-0.5 tracking-wider">
                        Meal {idx + 1}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-orange-400 text-xs font-black">
                      +{meal.calories || 0} kcal
                    </span>
                    <span className="block text-emerald-400 text-[10px] font-black mt-0.5">
                      +{meal.protein || 0}g Pro
                    </span>
                  </div>
                </div>
              );
            })}

            {remainingMeals > 0 && (
              <div className="text-center py-1.5 bg-zinc-900/50 border border-white/5 rounded-xl text-[9px] font-bold text-zinc-400">
                + {remainingMeals} more {remainingMeals === 1 ? "meal" : "meals"} logged today
              </div>
            )}
          </>
        ) : (
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 text-center text-xs text-zinc-500">
            No meals logged today
          </div>
        )}
      </div>

      {/* 4. Dual Bottom Summary Box */}
      <div className="flex flex-col gap-2.5 w-full border-t border-white/10 pt-3.5 shrink-0">
        <div className="grid grid-cols-2 gap-2.5 text-left">
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
            <span className="text-[8px] text-white/50 font-bold uppercase tracking-wider block">
              Energy
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-white">{calories.toLocaleString()}</span>
              <span className="text-[9px] text-orange-400 uppercase font-bold">kcal</span>
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl">
            <span className="text-[8px] text-emerald-400/70 font-bold uppercase tracking-wider block">
              Protein
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-emerald-400">{protein}g</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
