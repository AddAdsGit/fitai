import React from "react";
import { Flame } from "lucide-react";

interface ObsidianCardComponentProps {
  name: string;
  date?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  mealsList: any[];
  weight?: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFats?: number;
  targetFiber?: number;
  currentStreak?: number;
  mealImages?: Record<string, HTMLImageElement | string>;
  handleStr?: string;
  layout?: "original" | "split" | "split_circles" | "creative";
}

export const ObsidianCardComponent: React.FC<ObsidianCardComponentProps> = ({
  date,
  calories,
  protein,
  carbs,
  fats,
  fiber,
  mealsList,
  weight,
  targetCalories = 2000,
  targetProtein = 140,
  targetCarbs = 210,
  targetFats = 65,
  targetFiber = 35,
  currentStreak = 0,
  mealImages = {},
  handleStr,
  layout = "original",
}) => {
  // Format date exactly like the app: e.g., "JULY 13, 2026"
  const getFormattedSelectedDate = () => {
    if (!date) return "TODAY";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "TODAY";
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const dateStr = d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).toUpperCase();
    return `${weekday}, ${dateStr}`;
  };

  const totalCalories = calories;
  const goalCalories = targetCalories;

  // Check if the card date is today
  const isDateToday = () => {
    if (!date) return true;
    const cardDate = new Date(date);
    const todayDate = new Date();
    return cardDate.getFullYear() === todayDate.getFullYear() &&
           cardDate.getMonth() === todayDate.getMonth() &&
           cardDate.getDate() === todayDate.getDate();
  };
  const isToday = isDateToday();

  // Helper to extract components for the top-right calendar card
  const getDateCardValues = () => {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) {
      const today = new Date();
      return {
        month: today.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
        day: today.getDate().toString(),
        weekday: today.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      };
    }
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: d.getDate().toString(),
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    };
  };
  const dateCard = getDateCardValues();

  // Calorie ring parameters (exact dashboard values)
  const r = 104;
  const strokeDasharray = Math.PI * 2 * r;
  const strokeDashoffset = strokeDasharray - Math.min(1, totalCalories / goalCalories) * strokeDasharray;

  // Sort meals in descending order of calories to prioritize major food entries on the sharecard
  const sortedMeals = [...mealsList].sort((a, b) => (b.calories || 0) - (a.calories || 0));

  // Single-column adaptive layout:
  // Render up to 3 meals. If more, show dynamic fallback indicator.
  const totalMealsCount = sortedMeals.length;
  const displayCount = Math.min(totalMealsCount, 3);
  const activeMeals = sortedMeals.slice(0, 3);
  const showMoreIndicator = totalMealsCount > 3;

  return (
    <div
      id="obsidian-card-capture"
      className="relative w-[390px] h-[693.3px] bg-[#FAF9F6] flex flex-col justify-between pt-8 pb-6 px-6 select-none overflow-hidden font-sans border border-stone-200/30"
      style={{
        backgroundImage: `
          radial-gradient(circle at top right, rgba(255, 112, 8, 0.09) 0%, transparent 45%),
          radial-gradient(circle at bottom left, rgba(255, 184, 0, 0.05) 0%, transparent 45%)
        `
      }}
    >
      {/* BACKGROUND RING AURA / GLOW (Matching app visual depth) */}
      <div 
        className="absolute top-[130px] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full pointer-events-none filter blur-[40px] z-0"
        style={{
          background: "radial-gradient(circle, rgba(255, 112, 8, 0.07) 0%, transparent 70%)"
        }}
      />

      {/* 1. Header (Refactored for premium visual hierarchy, bold title, inline username/weight, and top-right date selection card) */}
      <header className="flex flex-col gap-1.5 z-10 shrink-0 select-none mb-1">
        <div className="flex justify-between items-center">
          <div className="flex flex-col min-w-0 pr-2">
            <h1 className="text-3xl font-black tracking-tight text-stone-900 leading-none">
              Today's Progress
            </h1>
            <div className="text-[11px] font-bold text-stone-500 mt-2 flex items-center gap-1.5">
              <span className="truncate max-w-[180px]" title={handleStr || "@user"}>
                {handleStr || "@user"}
              </span>
              {weight && weight > 0 && layout === "original" ? (
                <>
                  <span className="text-stone-300 font-normal">•</span>
                  <span className="shrink-0">
                    {isToday ? `${weight} kg` : `Last: ${weight} kg`}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          
          {/* Quick Date Selector Card Representation (Replaces Streak) */}
          <div className="flex flex-col items-center justify-center bg-white/95 backdrop-blur-md w-9.5 h-11.5 rounded-xl border border-stone-200/50 shadow-2xs shrink-0 select-none">
            <span className="text-[7.5px] font-black text-stone-400 lowercase leading-none">
              {dateCard.weekday.toLowerCase()}
            </span>
            <span className="text-[13px] font-black text-stone-700 leading-none mt-0.5 mb-0.5">
              {dateCard.day}
            </span>
            <span className="text-[7.5px] font-black text-stone-400 lowercase leading-none">
              {dateCard.month.toLowerCase()}
            </span>
          </div>
        </div>
      </header>

      {/* 3 & 4. Middle Stats Section (Dynamic Layout: Centered original vs Side-by-side split) */}
      {layout === "split_circles" ? (
        <div className="flex items-stretch gap-4 my-2 z-10 shrink-0">
          {/* Left Column: Enlarged Calorie Circle & Weight Card */}
          <div className="w-[58%] flex flex-col items-center justify-between py-1 shrink-0">
            {/* Calorie Progress Ring (Enlarged to 170px for split_circles layout) */}
            <div className="relative w-full aspect-square max-w-[170px] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-md"
                viewBox="0 0 240 240"
              >
                <circle
                  cx="120"
                  cy="120"
                  r={r}
                  strokeWidth="22"
                  fill="transparent"
                  stroke="rgba(255, 237, 213, 0.5)"
                />
                <circle
                  cx="120"
                  cy="120"
                  r={r}
                  strokeWidth="22"
                  fill="transparent"
                  strokeLinecap="round"
                  stroke="#F97316"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="text-center z-10 bg-white/85 w-[124px] h-[124px] rounded-full flex flex-col items-center justify-center shadow-inner border border-white/50">
                <span className="text-[34px] font-black text-orange-950 px-1 truncate leading-none">
                  {totalCalories.toLocaleString()}
                </span>
                <span className="text-[9.5px] text-orange-900/50 font-black tracking-wide mt-1 block uppercase leading-none">
                  KCAL
                </span>
              </div>
            </div>

            {/* Weight Capsule (Placed in Left Column - Enlarged) */}
            {weight && weight > 0 ? (
              <div className="bg-white/70 backdrop-blur-md w-full py-2.5 rounded-2xl border border-white/80 shadow-2xs flex flex-col items-center justify-center mt-2">
                <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest leading-none">
                  {isToday ? "TODAY'S WEIGHT" : "LAST WEIGHT"}
                </span>
                <span className="text-sm font-black text-stone-850 mt-1 leading-none">
                  {weight} <span className="text-[10px] text-stone-500 font-bold">kg</span>
                </span>
              </div>
            ) : (
              <div className="h-[38px]" />
            )}
          </div>

          {/* Right Column: 4 Circular Macro Progress Rings (Vertical Stack, No Container) */}
          <div className="flex-1 flex flex-col justify-center gap-4.5 pl-1 pr-2">
            {[
              { name: "Protein", value: protein, max: targetProtein, color: "#F97316", trackColor: "rgba(249,115,22,0.12)" },
              { name: "Fiber", value: fiber, max: targetFiber, color: "#10B981", trackColor: "rgba(16,185,129,0.12)" },
              { name: "Carbs", value: carbs, max: targetCarbs, color: "#0891B2", trackColor: "rgba(8,145,178,0.12)" },
              { name: "Fats", value: fats, max: targetFats, color: "#EAB308", trackColor: "rgba(234,179,8,0.12)" },
            ].map((macro) => {
              const macroR = 19;
              const macroCircumference = 2 * Math.PI * macroR;
              const macroOffset = macroCircumference - Math.min(1, macro.value / macro.max) * macroCircumference;
              return (
                <div key={macro.name} className="flex items-center justify-between gap-2.5 select-none w-full">
                  {/* Left Label (Outside Circle) */}
                  <div className="flex flex-col text-right min-w-0 flex-1 justify-center">
                    <span 
                      className="text-[10px] font-black uppercase tracking-wider leading-none"
                      style={{ color: macro.color }}
                    >
                      {macro.name}
                    </span>
                  </div>
                  
                  {/* Right Circle SVG (Values Staked Inside Circle) */}
                  <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute inset-0 w-full h-full -rotate-90"
                      viewBox="0 0 50 50"
                    >
                      <circle
                        cx="25"
                        cy="25"
                        r={macroR}
                        strokeWidth="4.5"
                        fill="transparent"
                        stroke={macro.trackColor}
                      />
                      <circle
                        cx="25"
                        cy="25"
                        r={macroR}
                        strokeWidth="4.5"
                        fill="transparent"
                        strokeLinecap="round"
                        stroke={macro.color}
                        strokeDasharray={macroCircumference}
                        strokeDashoffset={macroOffset}
                      />
                    </svg>
                    {/* Inner progress number & goal */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[9.5px] font-black text-stone-750 leading-none">
                        {macro.value}
                      </span>
                      <span className="text-[6.5px] font-bold text-stone-400 leading-none mt-[1px]">
                        /{macro.max}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : layout === "split" ? (
        <div className="flex items-stretch gap-4 my-2 z-10 shrink-0">
          {/* Left Column: Calorie Circle & Weight Card */}
          <div className="w-[42%] flex flex-col items-center justify-between py-1 shrink-0">
            {/* Calorie Progress Ring (Sized for split layout) */}
            <div className="relative w-full aspect-square max-w-[130px] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-md"
                viewBox="0 0 240 240"
              >
                <circle
                  cx="120"
                  cy="120"
                  r={r}
                  strokeWidth="22"
                  fill="transparent"
                  stroke="rgba(255, 237, 213, 0.5)"
                />
                <circle
                  cx="120"
                  cy="120"
                  r={r}
                  strokeWidth="22"
                  fill="transparent"
                  strokeLinecap="round"
                  stroke="#F97316"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="text-center z-10 bg-white/85 w-22 h-22 rounded-full flex flex-col items-center justify-center shadow-inner border border-white/50">
                <span className="text-2xl font-black text-orange-950 px-1 truncate leading-none">
                  {totalCalories.toLocaleString()}
                </span>
                <span className="text-[7.5px] text-orange-900/50 font-black tracking-wide mt-1 block uppercase leading-none">
                  KCAL
                </span>
              </div>
            </div>

            {/* Weight Capsule (Placed in Left Column) */}
            {weight && weight > 0 ? (
              <div className="bg-white/70 backdrop-blur-md w-full py-2 rounded-2xl border border-white/80 shadow-2xs flex flex-col items-center justify-center mt-2.5">
                <span className="text-[6.5px] font-black text-stone-400 uppercase tracking-widest leading-none">
                  {isToday ? "TODAY'S WEIGHT" : "LAST WEIGHT"}
                </span>
                <span className="text-xs font-black text-stone-850 mt-1 leading-none">
                  {weight} <span className="text-[9px] text-stone-500 font-bold">kg</span>
                </span>
              </div>
            ) : (
              <div className="h-[36px]" />
            )}
          </div>

          {/* Right Column: 4 Vertical Macros Progress Bars */}
          <div className="flex-1 bg-white/60 backdrop-blur-md p-3 rounded-[24px] border border-white/80 shadow-xl shadow-orange-100/10 flex flex-col justify-center gap-2.5">
            {[
              { name: "Protein", value: protein, max: targetProtein, color: "#F97316" },
              { name: "Fiber", value: fiber, max: targetFiber, color: "#10B981" },
              { name: "Carbs", value: carbs, max: targetCarbs, color: "#0891B2" },
              { name: "Fats", value: fats, max: targetFats, color: "#EAB308" },
            ].map((macro) => (
              <div key={macro.name} className="space-y-0.5">
                <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-[0.05em] leading-none mb-1">
                  <span className="text-orange-950/70">{macro.name}</span>
                  <span style={{ color: macro.color }} className="font-extrabold">
                    {macro.value}
                    <span className="text-orange-900/40 text-[8px] ml-0.5 font-bold">/{macro.max}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden border border-white/40 shadow-inner">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(macro.value / macro.max) * 100}%`,
                      backgroundColor: macro.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : layout === "creative" ? (
        <div className="flex flex-col items-center gap-3 my-2 z-10 shrink-0 w-full select-none">
          {/* Hero Centered Master Concentric Rings Widget */}
          {(() => {
            // Outermost (Thick): Calories (Orange #F97316, radius=51, strokeWidth=6.5)
            const rCal = 51;
            const circCal = 2 * Math.PI * rCal;
            const offCal = circCal - Math.min(1, totalCalories / goalCalories) * circCal;

            // Ring 2: Protein (Red #EF4444, radius=42.5, strokeWidth=4.5)
            const rProt = 42.5;
            const circProt = 2 * Math.PI * rProt;
            const offProt = circProt - Math.min(1, protein / targetProtein) * circProt;

            // Ring 3: Carbs (Cyan #0891B2, radius=34, strokeWidth=4.5)
            const rCarbs = 34;
            const circCarbs = 2 * Math.PI * rCarbs;
            const offCarbs = circCarbs - Math.min(1, carbs / targetCarbs) * circCarbs;

            // Ring 4: Fats (Amber #EAB308, radius=25.5, strokeWidth=4.5)
            const rFats = 25.5;
            const circFats = 2 * Math.PI * rFats;
            const offFats = circFats - Math.min(1, fats / targetFats) * circFats;

            // Innermost: Fiber (Emerald #10B981, radius=17, strokeWidth=4.5)
            const rFib = 17;
            const circFib = 2 * Math.PI * rFib;
            const offFib = circFib - Math.min(1, fiber / targetFiber) * circFib;

            return (
              <div className="relative w-full max-w-[200px] aspect-square flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full -rotate-90 drop-shadow-md"
                  viewBox="0 0 120 120"
                >
                  {/* Calories Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r={rCal}
                    strokeWidth="6"
                    fill="transparent"
                    stroke="rgba(249, 115, 22, 0.12)"
                  />
                  {/* Calories Arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r={rCal}
                    strokeWidth="6"
                    fill="transparent"
                    strokeLinecap="round"
                    stroke="#F97316"
                    strokeDasharray={circCal}
                    strokeDashoffset={offCal}
                  />

                  {/* Protein Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r={rProt}
                    strokeWidth="4.5"
                    fill="transparent"
                    stroke="rgba(239, 68, 68, 0.12)"
                  />
                  {/* Protein Arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r={rProt}
                    strokeWidth="4.5"
                    fill="transparent"
                    strokeLinecap="round"
                    stroke="#EF4444"
                    strokeDasharray={circProt}
                    strokeDashoffset={offProt}
                  />

                  {/* Carbs Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r={rCarbs}
                    strokeWidth="4.5"
                    fill="transparent"
                    stroke="rgba(8, 145, 178, 0.12)"
                  />
                  {/* Carbs Arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r={rCarbs}
                    strokeWidth="4.5"
                    fill="transparent"
                    strokeLinecap="round"
                    stroke="#0891B2"
                    strokeDasharray={circCarbs}
                    strokeDashoffset={offCarbs}
                  />

                  {/* Fats Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r={rFats}
                    strokeWidth="4.5"
                    fill="transparent"
                    stroke="rgba(234, 179, 8, 0.12)"
                  />
                  {/* Fats Arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r={rFats}
                    strokeWidth="4.5"
                    fill="transparent"
                    strokeLinecap="round"
                    stroke="#EAB308"
                    strokeDasharray={circFats}
                    strokeDashoffset={offFats}
                  />

                  {/* Fiber Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r={rFib}
                    strokeWidth="4.5"
                    fill="transparent"
                    stroke="rgba(16, 185, 129, 0.12)"
                  />
                  {/* Fiber Arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r={rFib}
                    strokeWidth="4.5"
                    fill="transparent"
                    strokeLinecap="round"
                    stroke="#10B981"
                    strokeDasharray={circFib}
                    strokeDashoffset={offFib}
                  />
                </svg>
                
                {/* Calories Count in Center Hole */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[27px] font-black text-stone-900 leading-none">
                    {totalCalories.toLocaleString()}
                  </span>
                  <span className="text-[8px] font-black text-stone-400 mt-1.5 tracking-wider uppercase leading-none">
                    KCAL
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Lower Section: Weight Capsule (Left) & Legend list (Right) */}
          <div className="flex gap-4 w-full mt-1.5 items-stretch justify-between">
            {/* Weight Capsule */}
            {weight && weight > 0 ? (
              <div className="bg-white/70 backdrop-blur-md w-[42%] py-2 rounded-2xl border border-stone-200/30 shadow-2xs flex flex-col items-center justify-center shrink-0">
                <span className="text-[7.5px] font-black text-stone-400 uppercase tracking-widest leading-none">
                  {isToday ? "TODAY'S WEIGHT" : "LAST WEIGHT"}
                </span>
                <span className="text-sm font-black text-stone-850 mt-1.5 leading-none">
                  {weight} <span className="text-[10px] text-stone-500 font-bold">kg</span>
                </span>
              </div>
            ) : (
              <div className="w-[42%] h-[48px]" />
            )}

            {/* Legend List */}
            <div className="flex-1 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-stone-200/30 shadow-2xs flex flex-col justify-center gap-1.5 min-w-0">
              {[
                { name: "Protein", val: protein, target: targetProtein, color: "#EF4444" },
                { name: "Carbs", val: carbs, target: targetCarbs, color: "#0891B2" },
                { name: "Fats", val: fats, target: targetFats, color: "#EAB308" },
                { name: "Fiber", val: fiber, target: targetFiber, color: "#10B981" },
              ].map((macro) => (
                <div key={macro.name} className="flex items-center justify-between text-[9.5px] leading-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-1.5 h-1.5 rounded-full shrink-0" 
                      style={{ backgroundColor: macro.color }}
                    />
                    <span className="text-[9.5px] font-extrabold text-stone-500 truncate lowercase tracking-wide">
                      {macro.name.toLowerCase()}
                    </span>
                  </div>
                  <span className="font-extrabold text-[9.5px] text-stone-850 shrink-0 ml-1">
                    {macro.val}<span className="text-stone-400 font-bold text-[8px]">/{macro.target}g</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 3. Calorie Ring (Exact copy of App.tsx progress ring layout, slightly enlarged for visual weight) */}
          <div className="relative w-full aspect-square max-w-[190px] mx-auto flex items-center justify-center my-3 z-10 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-xl"
              viewBox="0 0 240 240"
            >
              <circle
                cx="120"
                cy="120"
                r={r}
                strokeWidth="20"
                fill="transparent"
                stroke="rgba(255, 237, 213, 0.5)"
              />
              <circle
                cx="120"
                cy="120"
                r={r}
                strokeWidth="20"
                fill="transparent"
                strokeLinecap="round"
                stroke="#F97316"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="text-center z-10 bg-white/85 w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-inner border border-white/50">
              <div className="text-4xl font-black mb-0.5 text-orange-950 px-2 truncate selection:bg-orange-500 select-none">
                {totalCalories.toLocaleString()}
              </div>
              <div className="h-1.5 w-6 bg-orange-500 rounded-full mb-0.5" />
              <div className="text-orange-900/50 font-black tracking-[0.1em] text-[8px] uppercase">
                / {goalCalories.toLocaleString()} KCAL
              </div>
            </div>
          </div>

          {/* 4. Macros Grid (Exact copy of App.tsx macros panel) */}
          <div className="bg-white/60 backdrop-blur-md p-4 rounded-[32px] border border-white/80 shadow-xl shadow-orange-100/20 grid grid-cols-2 gap-x-5 gap-y-3.5 mx-1 z-10 shrink-0">
            {[
              { name: "Protein", value: protein, max: targetProtein, color: "#F97316" },
              { name: "Carbs", value: carbs, max: targetCarbs, color: "#0891B2" },
              { name: "Fats", value: fats, max: targetFats, color: "#EAB308" },
              { name: "Fiber", value: fiber, max: targetFiber, color: "#10B981" },
            ].map((macro) => (
              <div key={macro.name} className="space-y-1">
                <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-[0.05em]">
                  <span className="text-orange-950/70">{macro.name}</span>
                  <span style={{ color: macro.color }}>
                    {macro.value}
                    <span className="text-orange-900/40 text-[9px] ml-0.5">/ {macro.max}</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden border border-white/40 shadow-inner">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(macro.value / macro.max) * 100}%`,
                      backgroundColor: macro.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 5. Food Logs (Single Column Adaptive Layout) */}
      {totalMealsCount > 0 && (
        <div className="w-full flex flex-col gap-2 px-1 mt-1 z-10 shrink-0">
          {/* Subtle separator line to divide metrics from food list */}
          <div className="w-full border-t border-stone-200/50 mb-1 pointer-events-none" />
          
          {activeMeals.map((meal) => {
            const getMealEmoji = (typeStr: string) => {
              const t = typeStr?.toLowerCase() || "";
              if (t.includes("breakfast") || t.includes("morning")) return "🥞";
              if (t.includes("lunch") || t.includes("afternoon")) return "🥗";
              if (t.includes("dinner") || t.includes("night") || t.includes("evening")) return "🥩";
              if (t.includes("snack") || t.includes("bite") || t.includes("tea")) return "🍎";
              return "🍽️";
            };
            const mealEmoji = getMealEmoji(meal.type || "meal");
            const imageSrc = mealImages[meal.id || meal.name] || meal.image;
            const hasImage = !!imageSrc;

            // Determine card height dynamically based on active item count
            const cardHeight = 
              displayCount === 1 ? "h-[104px]" :
              displayCount === 2 ? "h-[82px]" :
              "h-[68px]";

            return (
              <div
                key={meal.id}
                className={`relative rounded-[20px] overflow-hidden ${cardHeight} shadow-sm border border-stone-200/40 z-10 shrink-0 w-full select-none flex items-center justify-between px-4`}
              >
                {hasImage ? (
                  <>
                    <img
                      src={typeof imageSrc === "string" ? imageSrc : imageSrc.src}
                      alt={meal.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/25 z-10" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-white/85 backdrop-blur-md" />
                )}

                {/* Left Side: Title and Macros */}
                <div className="flex flex-col text-left z-20 min-w-0 pr-4">
                  <h4 className={`text-[12px] font-black leading-tight tracking-tight truncate ${hasImage ? "text-white" : "text-stone-850"}`}>
                    {meal.name}
                  </h4>
                  <div className={`flex flex-wrap gap-x-2 gap-y-0.5 text-[7.5px] font-extrabold uppercase tracking-wide mt-1 ${hasImage ? "text-white/60" : "text-stone-500"}`}>
                    {[
                      { l: "P", v: `${meal.protein || 0}g` },
                      { l: "C", v: `${meal.carbs || 0}g` },
                      { l: "F", v: `${meal.fats || 0}g` },
                      { l: "Fb", v: `${meal.fiber || 0}g` },
                    ].map((m) => (
                      <span key={m.l}>{m.l}: {m.v}</span>
                    ))}
                  </div>
                </div>

                {/* Right Side: Calories and Time */}
                <div className="flex flex-col items-end justify-center z-20 shrink-0 text-right">
                  <span className={`text-xs font-black ${hasImage ? "text-orange-400" : "text-orange-600"}`}>
                    +{meal.calories} kcal
                  </span>
                  <span className={`text-[7.5px] font-black uppercase tracking-widest mt-1 ${hasImage ? "text-white/45" : "text-stone-400"}`}>
                    {meal.time || "LOGGED"}
                  </span>
                </div>
              </div>
            );
          })}
          
          {showMoreIndicator && (
            <p className="text-[9px] font-bold text-stone-400 italic mt-0.5 text-center">
              + {totalMealsCount - activeMeals.length} more logs today
            </p>
          )}
        </div>
      )}

      {/* Tag Hits Summary Row */}
      {(() => {
        const activeTags = (Object.entries(
          mealsList.reduce((acc: Record<string, number>, m: any) => {
            if (m.tags && Array.isArray(m.tags)) {
              m.tags.forEach((tag: string) => {
                acc[tag] = (acc[tag] || 0) + 1;
              });
            }
            return acc;
          }, {})
        ) as [string, number][]).filter(([_, count]) => count > 0);

        if (activeTags.length === 0) return null;

        return (
          <div className="flex flex-wrap gap-1 px-1 py-1.5 border-t border-stone-200/40 z-10 shrink-0 select-none mt-2">
            {activeTags.slice(0, 5).map(([tag, count]) => (
              <div
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-orange-200/30 bg-orange-500/5 text-orange-600 font-extrabold text-[8px] uppercase tracking-wider"
              >
                {tag} ×{count}
              </div>
            ))}
          </div>
        );
      })()}

      {/* 6. Footer (App branding footprint) */}
      <footer className="border-t border-stone-200/60 pt-3.5 flex justify-between items-center z-10 shrink-0 px-1 mt-1">
        <span className="text-[9px] font-bold tracking-[0.08em] text-stone-400">
          FITAI • DAILY REPORT
        </span>
        <span className="text-[9px] font-bold tracking-[0.05em] text-stone-400">
          fitpush.vercel.app
        </span>
      </footer>
    </div>
  );
};
