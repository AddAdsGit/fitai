import React, { useState } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { ProgressBar } from "./InsightsView";
import type { Profile } from "../types";

export interface DailyProgressSectionProps {
  totalCalories: number;
  profileData: Profile;
  enabledNutrients: any[];
  getLoggedNutrientTotal: (nutrientId: string) => number;
  dailyTagHits?: Record<string, number>;
}

export function DailyProgressSection({
  totalCalories,
  profileData,
  enabledNutrients,
  getLoggedNutrientTotal,
}: DailyProgressSectionProps) {
  const [activeMacroPage, setActiveMacroPage] = useState(0);

  return (
    <div className="px-4 sm:px-6 mt-2 relative z-10">
      {/* Circular Progress for Calories */}
      <div className="relative w-full aspect-square max-w-[280px] mx-auto flex items-center justify-center my-3 sm:my-5">
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-xl"
          viewBox="0 0 240 240"
        >
          <circle
            cx="120"
            cy="120"
            r="104"
            strokeWidth="20"
            fill="transparent"
            className="stroke-orange-100/50"
          />
          <motion.circle
            cx="120"
            cy="120"
            r="104"
            strokeWidth="20"
            fill="transparent"
            strokeLinecap="round"
            className="stroke-orange-500"
            initial={{ strokeDashoffset: Math.PI * 2 * 104 }}
            animate={{
              strokeDashoffset:
                Math.PI * 2 * 104 -
                Math.min(1, totalCalories / ((profileData as any).goals?.dailyCalories || profileData.daily_calories_goal || 2000)) *
                  (Math.PI * 2 * 104),
            }}
            strokeDasharray={Math.PI * 2 * 104}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="text-center z-10 bg-white/40 backdrop-blur-md w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-inner border border-white/50">
          <div className="text-5xl font-black mb-1 text-orange-950 px-2 truncate selection:bg-orange-500 select-none">
            {totalCalories.toLocaleString()}
          </div>
          <div className="h-1.5 w-8 bg-orange-500 rounded-full mb-1" />
          <div className="text-orange-900/50 font-black tracking-[0.1em] text-[10px] uppercase">
            / {((profileData as any).goals?.dailyCalories || profileData.daily_calories_goal || 2000).toLocaleString()} KCAL
          </div>
        </div>
      </div>

      {/* Macro Progress Bars — Locked 2x2 Grid with Horizontal Swipe Carousel */}
      {(() => {
        const pages: any[][] = [];
        for (let i = 0; i < enabledNutrients.length; i += 4) {
          pages.push(enabledNutrients.slice(i, i + 4));
        }

        return (
          <div className="mt-3 sm:mt-4 flex flex-col gap-2">
            <div className="bg-white/60 backdrop-blur-md p-4 sm:p-5 rounded-[28px] sm:rounded-[32px] border border-white/80 shadow-xl shadow-orange-100/20 overflow-hidden">
              {pages.length === 1 ? (
                <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3.5 sm:gap-y-4">
                  {pages[0].map((macro: any, idx: number) => {
                    const totalVal = getLoggedNutrientTotal(macro.id);
                    return (
                      <div key={macro.id}>
                        <ProgressBar
                          label={macro.name}
                          value={totalVal}
                          max={macro.target}
                          color={macro.color}
                          unit={macro.unit}
                          index={idx}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  onScroll={(e) => {
                    const container = e.currentTarget;
                    const scrollPos = container.scrollLeft;
                    const width = container.clientWidth;
                    if (width > 0) {
                      const newPage = Math.round(scrollPos / width);
                      setActiveMacroPage(newPage);
                    }
                  }}
                  className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-2 px-2 gap-4"
                >
                  {pages.map((pageItems, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="w-full shrink-0 snap-center grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3.5 sm:gap-y-4"
                    >
                      {pageItems.map((macro: any, idx: number) => {
                        const totalVal = getLoggedNutrientTotal(macro.id);
                        return (
                          <div key={macro.id}>
                            <ProgressBar
                              label={macro.name}
                              value={totalVal}
                              max={macro.target}
                              color={macro.color}
                              unit={macro.unit}
                              index={pageIdx * 4 + idx}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Carousel Page Dots Indicator (only if > 4 nutrients) */}
            {pages.length > 1 && (
              <div className="flex justify-center items-center gap-1.5 select-none">
                {pages.map((_, dotIdx) => (
                  <div
                    key={dotIdx}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all duration-300",
                      dotIdx === activeMacroPage ? "bg-orange-500 w-3" : "bg-stone-300"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
