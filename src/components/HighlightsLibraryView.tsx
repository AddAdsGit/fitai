import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Flame, 
  Sparkles, 
  Share2, 
  Calendar, 
  TrendingUp, 
  Award, 
  Utensils
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { Meal, Recipe, WeightLog } from "../types";
import { ChronoCardComponent } from "./sharecards/ChronoCardComponent";
import { SwissMinimalistCardComponent } from "./sharecards/SwissMinimalistCardComponent";

interface ShareLibraryViewProps {
  profileData: any;
  mealsState: Meal[];
  recipes: Recipe[];
  currentStreak: number;
  weightLogs?: WeightLog[];
  setActiveTab: (tab: string) => void;
  onShareDay: (dateStr: string, variationId?: string) => void;
  onShareMeal: (meal: Meal) => void;
  onShareRecipe: (recipe: Recipe) => void;
  triggerToast?: (msg: string) => void;
}

export const HighlightsLibraryView: React.FC<ShareLibraryViewProps> = ({
  profileData,
  mealsState = [],
  recipes = [],
  currentStreak = 0,
  weightLogs = [],
  setActiveTab,
  onShareDay,
  onShareMeal,
  onShareRecipe,
  triggerToast,
}) => {
  const [activeTab, setActiveTabFilter] = useState<"all" | "daily" | "weekly" | "milestones">("all");

  // Current Date string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Today logged meals
  const todaysMeals = useMemo(() => {
    return mealsState.filter((m) => m.date === todayStr);
  }, [mealsState, todayStr]);

  const todayCalories = useMemo(() => {
    return todaysMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
  }, [todaysMeals]);

  const todayProtein = useMemo(() => {
    return todaysMeals.reduce((acc, m) => acc + (m.protein || 0), 0);
  }, [todaysMeals]);

  // Last 7 Days Analytics (Active Logged Days Only Rule)
  const past7DaysStats = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dates.push(str);
    }

    const mealsIn7Days = mealsState.filter((m) => dates.includes(m.date));
    const activeLoggedDates = Array.from(new Set(mealsIn7Days.map((m) => m.date)));
    const totalCals = mealsIn7Days.reduce((acc, m) => acc + (m.calories || 0), 0);
    const totalProtein = mealsIn7Days.reduce((acc, m) => acc + (m.protein || 0), 0);

    const avgCals = activeLoggedDates.length > 0 ? Math.round(totalCals / activeLoggedDates.length) : 0;
    const avgProtein = activeLoggedDates.length > 0 ? Math.round(totalProtein / activeLoggedDates.length) : 0;

    return {
      activeLoggedDaysCount: activeLoggedDates.length,
      totalCalories: totalCals,
      totalProtein,
      avgCalories: avgCals,
      avgProtein,
    };
  }, [mealsState]);

  // Top High-Protein Meal of the Week
  const topProteinMeal = useMemo(() => {
    if (mealsState.length === 0) return null;
    return [...mealsState].sort((a, b) => (b.protein || 0) - (a.protein || 0))[0];
  }, [mealsState]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-[#FAF7F2] text-orange-950 font-sans pb-36 select-none overflow-x-hidden"
    >
      {/* 1. Clean Sticky Header (No Redundant Share Button) */}
      <div className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur-md px-4 pt-3 pb-2 border-b border-orange-100/60 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setActiveTab("profile")}
            className="w-10 h-10 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-center text-orange-950 active:scale-95 transition-all"
            title="Back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <BrandLogo variant="boxed" size={15} boxSize="w-6 h-6" />
            <h1 className="text-base font-black tracking-tight text-orange-950">
              Share Library
            </h1>
          </div>

          <div className="w-10 h-10" /> {/* Spacer for clean symmetry */}
        </div>

        {/* Category Segmented Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-stone-200/50 p-1 rounded-2xl border border-stone-200/60">
          <button
            onClick={() => setActiveTabFilter("all")}
            className={`py-2 rounded-xl text-xs font-black transition-all text-center ${
              activeTab === "all"
                ? "bg-white text-orange-950 shadow-sm"
                : "text-stone-500 hover:text-orange-950"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setActiveTabFilter("daily")}
            className={`py-2 rounded-xl text-xs font-black transition-all text-center ${
              activeTab === "daily"
                ? "bg-white text-orange-950 shadow-sm"
                : "text-stone-500 hover:text-orange-950"
            }`}
          >
            Daily
          </button>

          <button
            onClick={() => setActiveTabFilter("weekly")}
            className={`py-2 rounded-xl text-xs font-black transition-all text-center ${
              activeTab === "weekly"
                ? "bg-white text-orange-950 shadow-sm"
                : "text-stone-500 hover:text-orange-950"
            }`}
          >
            Weekly
          </button>

          <button
            onClick={() => setActiveTabFilter("milestones")}
            className={`py-2 rounded-xl text-xs font-black transition-all text-center ${
              activeTab === "milestones"
                ? "bg-white text-orange-950 shadow-sm"
                : "text-stone-500 hover:text-orange-950"
            }`}
          >
            Milestones
          </button>
        </div>
      </div>

      {/* 2. Main Share Library Cards Grid */}
      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">

        {/* SECTION 1: Daily Share Cards */}
        {(activeTab === "all" || activeTab === "daily") && (
          <div className="space-y-6">
            {/* Card 1: Chrono Dual-Macro 9:16 Story */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-orange-900/60">
                  9:16 Story Card • Chrono Timeline
                </span>
                <span className="text-[10px] font-bold text-orange-600">
                  {todaysMeals.length} {todaysMeals.length === 1 ? "Meal" : "Meals"} Today
                </span>
              </div>

              <div className="w-full max-w-[340px] mx-auto aspect-[9/16] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/80 relative">
                <ChronoCardComponent
                  date={todayStr}
                  calories={todayCalories}
                  protein={todayProtein}
                  mealsList={todaysMeals}
                  handleStr={profileData?.username || profileData?.name || "fitwarrior"}
                />
              </div>

              <button
                onClick={() => onShareDay(todayStr, "chrono")}
                className="w-full max-w-[340px] mx-auto py-3 rounded-2xl bg-orange-500 text-white font-black text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share 9:16 Story
              </button>
            </div>

            {/* Card 2: Swiss Minimalist 3:4 */}
            <div className="space-y-2.5 pt-4 border-t border-orange-200/50">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-orange-900/60">
                  3:4 Swiss Minimalist Card
                </span>
              </div>

              <div className="w-full max-w-[340px] mx-auto aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/80 relative">
                <SwissMinimalistCardComponent
                  date={todayStr}
                  calories={todayCalories}
                  protein={todayProtein}
                  mealsList={todaysMeals}
                  handleStr={profileData?.username || profileData?.name || "fitwarrior"}
                />
              </div>

              <button
                onClick={() => onShareDay(todayStr, "swiss")}
                className="w-full max-w-[340px] mx-auto py-3 rounded-2xl bg-stone-900 text-white font-black text-xs shadow-md shadow-black/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share 3:4 Card
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: Weekly Insights Share Card */}
        {(activeTab === "all" || activeTab === "weekly") && (
          <div className="space-y-2.5 pt-4 border-t border-orange-200/50">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-900/60">
                Weekly Fuel & Insights Card
              </span>
              <span className="text-[10px] font-bold text-orange-600">
                {past7DaysStats.activeLoggedDaysCount} of 7 Days Logged
              </span>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-6 border border-white/80 shadow-xl shadow-orange-100/20 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block">
                    WEEKLY FUEL INTAKE
                  </span>
                  <div className="text-3xl font-black text-orange-950 mt-1">
                    {past7DaysStats.totalCalories.toLocaleString()}{" "}
                    <span className="text-sm font-bold text-orange-900/60">kcal</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">
                    DAILY AVG
                  </span>
                  <div className="text-xl font-black text-emerald-600 mt-1">
                    {past7DaysStats.avgCalories.toLocaleString()}{" "}
                    <span className="text-xs font-bold text-orange-900/60">kcal</span>
                  </div>
                  <span className="text-[8px] font-bold text-orange-900/40 block mt-0.5">
                    avg from {past7DaysStats.activeLoggedDaysCount} logged days
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-orange-100">
                <div className="bg-orange-50/60 p-3.5 rounded-2xl border border-orange-100/60">
                  <span className="text-[8px] font-black uppercase tracking-wider text-orange-900/50 block">
                    Total Protein
                  </span>
                  <div className="text-lg font-black text-orange-950 mt-0.5">
                    {past7DaysStats.totalProtein}g
                  </div>
                  <span className="text-[8px] font-bold text-orange-600">
                    avg {past7DaysStats.avgProtein}g/day
                  </span>
                </div>

                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100/60">
                  <span className="text-[8px] font-black uppercase tracking-wider text-emerald-900/50 block">
                    Consistency
                  </span>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">
                    {Math.round((past7DaysStats.activeLoggedDaysCount / 7) * 100)}%
                  </div>
                  <span className="text-[8px] font-bold text-emerald-600">
                    {past7DaysStats.activeLoggedDaysCount} of 7 days logged
                  </span>
                </div>
              </div>

              <button
                onClick={() => onShareDay(todayStr, "chrono")}
                className="w-full py-3 rounded-2xl bg-orange-500 text-white font-black text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share Weekly Card
              </button>
            </div>
          </div>
        )}

        {/* SECTION 3: Milestones & Top Meal Cards */}
        {(activeTab === "all" || activeTab === "milestones") && (
          <div className="space-y-4 pt-4 border-t border-orange-200/50">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-900/60">
                Milestones & Badges
              </span>
            </div>

            {/* Streak Milestone */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-[32px] p-6 text-white shadow-xl shadow-orange-500/20 flex items-center justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2">
                  <Flame className="w-5 h-5 fill-white text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-100 block">
                  Active Streak
                </span>
                <div className="text-4xl font-black mt-1 leading-none">
                  {currentStreak} <span className="text-sm font-bold text-orange-100">Days</span>
                </div>
              </div>

              <button
                onClick={() => onShareDay(todayStr, "chrono")}
                className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 active:scale-90 transition-all shadow-md shrink-0"
                title="Share Streak"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Top High-Protein Meal */}
            {topProteinMeal && (
              <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-5 border border-white/80 shadow-xl shadow-orange-100/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                    TOP PROTEIN MEAL
                  </span>
                  <button
                    onClick={() => onShareMeal(topProteinMeal)}
                    className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center active:scale-90 transition-all shadow-sm"
                    title="Share Meal"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3.5">
                  {topProteinMeal.image ? (
                    <img
                      src={topProteinMeal.image}
                      alt={topProteinMeal.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-orange-100 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-2xl shrink-0">
                      {topProteinMeal.name[0]}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-orange-950 truncate">
                      {topProteinMeal.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black text-orange-600">
                        {topProteinMeal.calories} kcal
                      </span>
                      <span className="text-xs font-black text-emerald-600">
                        {topProteinMeal.protein}g Protein
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
};
