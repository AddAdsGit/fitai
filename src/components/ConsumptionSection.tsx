import React, { useState } from "react";
import { Zap, Plus, Check, Share2, Trash2, Camera, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { ProgressBar } from "./InsightsView";
import { Profile, Meal } from "../types";
import { hasNoGeneratedImage, getMealEmoji } from "../utils/helpers";
import { calculateNutritionFromIngredients } from "../utils/nutritionCalculator";
import { DEFAULT_CUSTOM_GPT_URL } from "../constants/app";
import { ChatGPTIcon } from "./ChatGPTIcon";

export const TimelineImage = ({
  src,
  alt,
  fallbackEmoji,
}: {
  src: string;
  alt: string;
  fallbackEmoji: string;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="absolute inset-0 w-full h-full">
      <div className="absolute inset-0 bg-[#F4F3EF]/90 flex items-center justify-center select-none z-0">
        <span className="text-7xl sm:text-8xl group-hover:scale-110 transition-transform duration-700 opacity-[0.85] filter drop-shadow-xs">
          {fallbackEmoji}
        </span>
      </div>
      {!error && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 z-10",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
};

export interface ConsumptionSectionProps {
  totalCalories: number;
  profileData: Profile;
  enabledNutrients: any[];
  getLoggedNutrientTotal: (id: string) => number;
  dailyTagHits: Record<string, number>;
  selectedDate: string;
  todayStr: string;
  showQuickAdd: boolean;
  setShowQuickAdd: (show: boolean) => void;
  customCalName: string;
  setCustomCalName: (name: string) => void;
  customCalVal: string;
  setCustomCalVal: (val: string) => void;
  handleLogMealClick: () => void;
  onOpenCameraScanner?: () => void;
  onOpenFoodLibrary?: () => void;
  onAddMeal: (meal: any) => void;
  showToast: (msg: string) => void;
  activeMeals: Meal[];
  handleEditMeal: (meal: Meal) => void;
  handleShareMeal: (meal: Meal) => void;
  handleDeleteMeal: (meal: Meal) => void;
}

export const ConsumptionSection: React.FC<ConsumptionSectionProps> = ({
  totalCalories,
  profileData,
  enabledNutrients,
  getLoggedNutrientTotal,
  dailyTagHits,
  selectedDate,
  todayStr,
  showQuickAdd,
  setShowQuickAdd,
  customCalName,
  setCustomCalName,
  customCalVal,
  setCustomCalVal,
  handleLogMealClick,
  onOpenCameraScanner,
  onOpenFoodLibrary,
  onAddMeal,
  showToast,
  activeMeals,
  handleEditMeal,
  handleShareMeal,
  handleDeleteMeal,
}) => {
  return (
    <section className="px-6 mt-6 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black tracking-tight text-orange-950">
            {selectedDate === todayStr
              ? "Today's Consumption"
              : "Logged Consumption"}
          </h3>
          {selectedDate === todayStr && (
            <div className="flex items-center gap-1.5">
              {/* Camera Scanner Button */}
              {onOpenCameraScanner && (
                <button
                  onClick={onOpenCameraScanner}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 shadow-2xs border-none"
                  title="Scan with Camera"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
              {/* Quick Add Zap Button */}
              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 shadow-2xs border-none ${
                  showQuickAdd
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-600 shadow-stone-200/10"
                }`}
                title="Quick Add"
              >
                <Zap className="w-4 h-4" />
              </button>
              {/* Log Meal Plus Button */}
              <button
                onClick={handleLogMealClick}
                className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 shadow-sm shadow-orange-500/10 border-none"
                title="Log Meal"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>



        {/* Collapsible Quick Add Row */}
        <AnimatePresence>
          {showQuickAdd && selectedDate === todayStr && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pb-6">
                <div className="flex gap-2.5 items-center w-full">
                  <input
                    type="text"
                    placeholder="Add item..."
                    value={customCalName}
                    onChange={(e) => setCustomCalName(e.target.value)}
                    className="flex-1 h-12 bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl px-4 text-xs font-bold text-stone-900 placeholder-stone-400 focus:outline-none shadow-sm focus:ring-1 focus:ring-orange-500/10 transition-all text-left"
                  />
                  <input
                    type="number"
                    placeholder="kcal"
                    value={customCalVal}
                    onChange={(e) => setCustomCalVal(e.target.value)}
                    className="w-20 h-12 bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl text-center text-xs font-bold text-stone-900 placeholder-stone-400 focus:outline-none shadow-sm focus:ring-1 focus:ring-orange-500/10 transition-all"
                  />
                  <button
                    onClick={() => {
                      const name = customCalName.trim();
                      const kcalStr = customCalVal.trim();
                      const kcalVal = parseInt(kcalStr);

                      if (!name && !kcalStr) {
                        showToast("Enter an item name or calories");
                        return;
                      }

                      if (kcalStr && kcalVal > 0) {
                        onAddMeal({
                          name: name || "Quick Add",
                          calories: kcalVal,
                          protein: 0,
                          carbs: 0,
                          fats: 0,
                          type: "Quick Cal",
                        });
                        showToast(
                          `Logged "${name || "Quick Add"}" — ${kcalVal} kcal`
                        );
                        setCustomCalName("");
                        setCustomCalVal("");
                      } else {
                        const ingredientsList = name
                          .split(/,|and|\+/)
                          .map((i) => i.trim())
                          .filter(Boolean);

                        const nutrition = calculateNutritionFromIngredients(
                          name,
                          ingredientsList
                        );

                        onAddMeal({
                          name,
                          calories: nutrition.calories,
                          protein: nutrition.protein,
                          carbs: nutrition.carbs,
                          fats: nutrition.fats,
                          type: "Quick Cal",
                        });

                        showToast(
                          `AI Estimated: ${nutrition.calories} kcal, ${nutrition.protein}g Protein`
                        );
                        setCustomCalName("");
                        setCustomCalVal("");
                      }
                    }}
                    className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border-none shadow-sm active:scale-95"
                    title="Quick Add"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          {activeMeals.length === 0 ? (
            <div className="text-center py-12 px-6">
              <p className="text-sm font-bold text-stone-500">
                No logs for this date yet
              </p>
              <p className="text-[10px] text-stone-400 mt-1 font-medium leading-relaxed">
                All meals, quick calories, or recipe favorites logged on this
                date will show up here.
              </p>
            </div>
          ) : (
            activeMeals.map((meal) => {
              const isQuickCal =
                meal.protein === 0 &&
                meal.carbs === 0 &&
                meal.fats === 0 &&
                meal.fiber === 0;

              if (isQuickCal) {
                return (
                  <motion.div
                    key={meal.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleEditMeal(meal)}
                    className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/90 p-4 shadow-3xs flex items-center justify-between gap-4 relative z-10 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-orange-100/50 flex items-center justify-center text-orange-600 shrink-0">
                        <Zap className="w-4 h-4 fill-orange-500 text-orange-500" />
                      </div>
                      <div className="text-left min-w-0">
                        <h4 className="text-xs font-black text-stone-850 truncate leading-tight">
                          {meal.name}
                        </h4>
                        {meal.meal_description && (
                          <p className="text-[9px] text-stone-500 font-semibold mt-0.5 line-clamp-1">
                            {meal.meal_description}
                          </p>
                        )}
                        <span className="text-[8px] font-bold text-stone-400 block mt-0.5 uppercase tracking-wider">
                          {meal.time}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-black text-orange-600 block">
                          {meal.calories} kcal
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareMeal(meal);
                        }}
                        className="w-7 h-7 rounded-lg bg-stone-50 hover:bg-orange-50 text-stone-400 hover:text-orange-500 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40 shrink-0"
                        title="Share meal"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeal(meal);
                        }}
                        className="w-7 h-7 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-400 hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40 shrink-0"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              }

              const hasImage = true;

              if (!hasImage) {
                const getMealEmojiLocal = (typeStr: string) => {
                  const t = typeStr?.toLowerCase() || "";
                  if (t.includes("breakfast") || t.includes("morning"))
                    return "🥞";
                  if (t.includes("lunch") || t.includes("afternoon"))
                    return "🥗";
                  if (
                    t.includes("dinner") ||
                    t.includes("night") ||
                    t.includes("evening")
                  )
                    return "🥩";
                  if (
                    t.includes("snack") ||
                    t.includes("bite") ||
                    t.includes("tea")
                  )
                    return "🍎";
                  return "🍽️";
                };
                const mealEmoji = getMealEmojiLocal(meal.type);

                return (
                  <motion.div
                    key={meal.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleEditMeal(meal)}
                    className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/90 p-4 shadow-3xs flex items-center justify-between gap-4 relative z-10 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-stone-100/60 flex items-center justify-center text-sm shrink-0 border border-stone-200/20">
                        {mealEmoji}
                      </div>
                      <div className="text-left min-w-0">
                        <h4 className="text-xs font-black text-stone-850 truncate leading-tight">
                          {meal.name}
                        </h4>
                        {meal.meal_description && (
                          <p className="text-[9px] text-stone-500 font-semibold mt-0.5 line-clamp-1">
                            {meal.meal_description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                          <span className="text-[8px] font-bold text-stone-400 block uppercase tracking-wider">
                            {meal.time}
                          </span>
                          {enabledNutrients && enabledNutrients.length > 0 && (
                            <>
                              <span className="text-[8px] text-stone-300 font-bold">
                                •
                              </span>
                              <span className="text-[8px] font-extrabold text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
                                {enabledNutrients.slice(0, 4).map((n: any, idx: number) => {
                                  let val = 0;
                                  if (n.id === "protein") val = meal.protein || 0;
                                  else if (n.id === "carbs") val = meal.carbs || 0;
                                  else if (n.id === "fats") val = meal.fats || 0;
                                  else if (n.id === "fiber") val = meal.fiber || 0;
                                  else val = meal.nutrients?.[n.id] || 0;
                                  const code = n.id === "protein" ? "P" : n.id === "carbs" ? "C" : n.id === "fats" ? "F" : n.id === "fiber" ? "Fb" : n.name.slice(0, 2);
                                  return (
                                    <React.Fragment key={n.id}>
                                      {idx > 0 && <span>•</span>}
                                      <span>{code}: {val}{n.unit || "g"}</span>
                                    </React.Fragment>
                                  );
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right mr-1">
                        <span className="text-xs font-black text-stone-700 block">
                          +{meal.calories} kcal
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareMeal(meal);
                        }}
                        className="w-7 h-7 rounded-lg bg-stone-50 hover:bg-orange-50 text-stone-400 hover:text-orange-500 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40"
                        title="Share meal"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeal(meal);
                        }}
                        className="w-7 h-7 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-400 hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={meal.id}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleEditMeal(meal)}
                  className="relative rounded-[32px] overflow-hidden aspect-[4/3] sm:aspect-video shadow-xl shadow-orange-200/30 group cursor-pointer"
                >
                  {meal.image && !hasNoGeneratedImage(meal.image) ? (
                    <TimelineImage
                      src={meal.image}
                      alt={meal.name}
                      fallbackEmoji={getMealEmoji(meal.name, meal.type)}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#F4F3EF]/90 flex items-center justify-center select-none">
                      <span className="text-7xl sm:text-8xl group-hover:scale-110 transition-transform duration-700 opacity-[0.85] filter drop-shadow-xs">
                        {getMealEmoji(meal.name, meal.type)}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-t z-10 pointer-events-none",
                      meal.image && !hasNoGeneratedImage(meal.image)
                        ? "from-black/90 via-black/40 to-black/20"
                        : "from-stone-900/75 via-stone-900/25 to-transparent"
                    )}
                  />

                  {/* Top Bar: Time, Calories, and Delete */}
                  <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-20">
                    <div className="backdrop-blur-md bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white">
                        {meal.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="backdrop-blur-md bg-orange-500/90 text-white px-3 py-1.5 rounded-full font-black flex items-center gap-1 shadow-lg border border-orange-400/50">
                        <span className="text-sm">{meal.calories}</span>
                        <span className="text-[9px] uppercase tracking-wider opacity-90">
                          Kcal
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareMeal(meal);
                        }}
                        className="w-8 h-8 rounded-full backdrop-blur-md bg-black/30 hover:bg-orange-500/80 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
                        title="Share meal"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeal(meal);
                        }}
                        className="w-8 h-8 rounded-full backdrop-blur-md bg-black/30 hover:bg-red-550/85 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Content: Name and Macros */}
                  <div className="absolute bottom-5 left-5 right-5 text-left font-sans z-20">
                    <h4 className="text-white text-xl sm:text-2xl font-black mb-1 leading-tight tracking-tight shadow-sm line-clamp-2" title={meal.name}>
                      {meal.name}
                    </h4>
                    {meal.meal_description && (
                      <p className="text-[10px] text-white/75 font-semibold italic mb-3 line-clamp-1 truncate">
                        "{meal.meal_description}"
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {(() => {
                        const nutrientItems = enabledNutrients && enabledNutrients.length > 0
                          ? enabledNutrients.map((n: any) => {
                              let val = 0;
                              if (n.id === "protein") val = meal.protein || 0;
                              else if (n.id === "carbs") val = meal.carbs || 0;
                              else if (n.id === "fats") val = meal.fats || 0;
                              else if (n.id === "fiber") val = meal.fiber || 0;
                              else val = meal.nutrients?.[n.id] || 0;

                              let code = "P";
                              if (n.id === "protein") code = "P";
                              else if (n.id === "carbs") code = "C";
                              else if (n.id === "fats") code = "F";
                              else if (n.id === "fiber") code = "Fb";
                              else if (n.id === "caffeine") code = "Cf";
                              else if (n.id === "sugar") code = "Sg";
                              else if (n.id === "sodium") code = "Na";
                              else code = n.name ? (n.name.length <= 2 ? n.name.toUpperCase() : n.name.slice(0, 2)) : n.id.slice(0, 2).toUpperCase();

                              return {
                                id: n.id,
                                code,
                                val,
                                unit: n.unit || "g",
                              };
                            })
                          : [];

                        if (nutrientItems.length === 0) return null;

                        const displayed = nutrientItems.slice(0, 4);
                        const remainingCount = nutrientItems.length - 4;

                        return (
                          <>
                            {displayed.map((m) => (
                              <div key={m.id} className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40 shadow-xs shrink-0" />
                                <div className="flex items-baseline gap-1">
                                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white/60">
                                    {m.code}
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-white">
                                    {m.val}{m.unit}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {remainingCount > 0 && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/50 pl-0.5">
                                +{remainingCount} more
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* 2 Stacked Full-Width Minimalist Buttons below the list & empty state */}
        {selectedDate === todayStr && (
          <div className="flex flex-col gap-2.5 mt-6 mb-4">
            {/* Button 1: Add from Food Library */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenFoodLibrary || (() => handleLogMealClick())}
              className="w-full h-12 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-2xl px-4 flex items-center justify-center gap-2 text-stone-800 shadow-2xs transition-all cursor-pointer select-none"
            >
              <BookOpen className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-xs font-black tracking-tight">Add from Food Library</span>
            </motion.button>

            {/* Button 2: Track Meal via ChatGPT (Energetic FitAI Orange) */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const gptUrl = localStorage.getItem("fitai_custom_gpt_url") || DEFAULT_CUSTOM_GPT_URL;
                window.open(gptUrl, "_blank");
              }}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 rounded-2xl px-4 flex items-center justify-center gap-2 text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer select-none border-none"
            >
              <ChatGPTIcon className="w-4.5 h-4.5 text-white fill-white shrink-0" />
              <span className="text-xs font-black tracking-tight">Track Meal via ChatGPT</span>
            </motion.button>
          </div>
        )}
      </section>
  );
};
