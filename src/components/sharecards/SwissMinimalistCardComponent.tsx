import React from "react";
import { BrandLogo } from "../BrandLogo";

interface SwissMinimalistCardComponentProps {
  date?: string;
  calories: number;
  protein: number;
  targetCalories?: number;
  targetProtein?: number;
  mealsList: any[];
  handleStr?: string;
}

export const SwissMinimalistCardComponent: React.FC<SwissMinimalistCardComponentProps> = ({
  date,
  calories,
  protein,
  mealsList = [],
  handleStr = "@fitwarrior",
}) => {
  const getFormattedDate = () => {
    if (!date) return "TODAY";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "TODAY";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  };

  const mealSummaryStr = mealsList.length > 0
    ? mealsList.map((m: any) => `${m.name || "Meal"} (${m.protein || 0}g P)`).join(", ")
    : "No meals logged today";

  return (
    <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] flex flex-col justify-between p-8 border border-white/5 font-sans bg-[#080809] text-white select-none box-border">
      {/* Header row */}
      <div className="flex items-center justify-between w-full shrink-0">
        <div className="flex items-center gap-2">
          <BrandLogo variant="mono_white" size={14} boxSize="w-6 h-6" />
          <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono">
            {getFormattedDate()}
          </span>
        </div>
        <span className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase font-mono">
          {handleStr.startsWith("@") ? handleStr : `@${handleStr}`}
        </span>
      </div>

      {/* Dual Big Numbers */}
      <div className="grid grid-cols-2 gap-4 my-auto text-left">
        <div>
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">
            Energy
          </span>
          <span className="text-5xl font-black tracking-tighter leading-none text-white mt-2 block">
            {calories.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold text-orange-400 mt-1.5 block">
            kcal
          </span>
        </div>
        <div>
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block">
            Protein
          </span>
          <span className="text-5xl font-black tracking-tighter leading-none text-emerald-400 mt-2 block">
            {protein}g
          </span>
          <span className="text-[10px] font-bold text-emerald-400/60 mt-1.5 block">
            total
          </span>
        </div>
      </div>

      {/* Logged list */}
      <div className="border-t border-zinc-900 pt-4 text-left shrink-0">
        <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
          Day summary • {mealsList.length} {mealsList.length === 1 ? "meal" : "meals"}
        </span>
        <p className="text-[10px] leading-relaxed text-zinc-400 font-medium line-clamp-3">
          {mealSummaryStr}
        </p>
      </div>
    </div>
  );
};
