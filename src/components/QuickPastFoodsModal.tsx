import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { History, X, Search, Plus, Utensils, BookOpen, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import type { Meal, Recipe } from "../types";
import { getMealEmoji } from "../utils/helpers";

export interface QuickPastFoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meals: Meal[];
  recipes: Recipe[];
  onAddMeal: (meal: any) => Promise<void> | void;
  showToast: (msg: string) => void;
}

export const QuickPastFoodsModal: React.FC<QuickPastFoodsModalProps> = ({
  isOpen,
  onClose,
  meals,
  recipes,
  onAddMeal,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "recent" | "recipes">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loggingId, setLoggingId] = useState<string | null>(null);

  // Compile unique recent meals (deduplicated by name, showing latest stats)
  const uniqueRecentMeals = useMemo(() => {
    const map = new Map<string, Meal & { logCount: number }>();
    for (const m of meals) {
      const key = m.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, { ...m, logCount: 1 });
      } else {
        const existing = map.get(key)!;
        existing.logCount += 1;
      }
    }
    return Array.from(map.values());
  }, [meals]);

  // Combine items for the list
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let list: Array<{
      id: string;
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      fiber: number;
      image?: string;
      type?: string;
      source: "recent" | "recipe";
      logCount?: number;
      description?: string;
    }> = [];

    if (activeTab === "all" || activeTab === "recent") {
      uniqueRecentMeals.forEach((m) => {
        list.push({
          id: `recent-${m.id}`,
          name: m.name,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fats: m.fats,
          fiber: m.fiber || 0,
          image: m.image,
          type: m.type,
          source: "recent",
          logCount: m.logCount,
          description: m.meal_description,
        });
      });
    }

    if (activeTab === "all" || activeTab === "recipes") {
      recipes.forEach((r) => {
        list.push({
          id: `recipe-${r.id}`,
          name: r.name,
          calories: r.calories,
          protein: r.protein,
          carbs: r.carbs,
          fats: r.fats,
          fiber: r.fiber || 0,
          image: r.image,
          type: "Recipe",
          source: "recipe",
          description: r.description,
        });
      });
    }

    if (query) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
      );
    }

    return list;
  }, [activeTab, searchQuery, uniqueRecentMeals, recipes]);

  const handleQuickLog = async (item: typeof filteredItems[0]) => {
    setLoggingId(item.id);
    try {
      await onAddMeal({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        fiber: item.fiber,
        image: item.image,
        type: item.type || (item.source === "recipe" ? "Recipe Log" : "Meal Log"),
        meal_description: item.description,
      });
      showToast(`⚡ Added "${item.name}" to today's log!`);
      onClose();
    } catch (e) {
      console.error("Failed to log past meal:", e);
      showToast(`Error adding ${item.name}`);
    } finally {
      setLoggingId(null);
    }
  };

  if (!isOpen) return null;

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

        {/* Sheet Drawer */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 pb-3 border-b border-black/[0.04] shrink-0 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                  <History className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-orange-950 uppercase tracking-widest leading-none">
                    Log Previous Meal
                  </h3>
                  <p className="text-[10px] text-stone-500 font-bold mt-0.5">
                    1-tap add from your history or saved recipes
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors cursor-pointer border border-stone-200/60 shadow-3xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search past meals or recipes..."
                className="w-full bg-white border border-stone-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-stone-850 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 shadow-3xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-2 select-none pt-1">
              {[
                { id: "all", label: "All Items", icon: Utensils },
                { id: "recent", label: "Recent Meals", icon: Clock },
                { id: "recipes", label: "Saved Recipes", icon: BookOpen },
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex-1 py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border",
                      isActive
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20"
                        : "bg-white text-stone-600 border-stone-200/80 hover:bg-stone-50"
                    )}
                  >
                    <IconComp className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List Content */}
          <div className="p-4 space-y-2.5 overflow-y-auto flex-1 overscroll-contain">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 px-6 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-orange-100/50 text-orange-500 flex items-center justify-center mx-auto">
                  <Utensils className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-stone-700">No matching items found</p>
                <p className="text-[10px] text-stone-400 font-medium">
                  {searchQuery
                    ? `No past meals or recipes matching "${searchQuery}"`
                    : "Log a meal or save recipes to see your instant favorites here."}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const emoji = getMealEmoji(item.name, item.type);
                const isLogging = loggingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white/80 backdrop-blur-md border border-stone-200/70 hover:border-orange-300 rounded-2xl p-3.5 shadow-3xs flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Food Emoji / Icon */}
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl shrink-0 shadow-2xs border border-orange-100/50">
                        {emoji}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-stone-900 truncate leading-snug">
                            {item.name}
                          </h4>
                          {item.source === "recipe" && (
                            <span className="text-[8px] font-black uppercase tracking-wider bg-orange-100/70 text-orange-700 px-1.5 py-0.2 rounded-md shrink-0">
                              Recipe
                            </span>
                          )}
                        </div>

                        {/* Macros & Calories */}
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-stone-500">
                          <span className="text-orange-600 font-black">
                            {item.calories} kcal
                          </span>
                          <span className="text-stone-300">•</span>
                          <span className="text-stone-600 font-bold truncate">
                            P: {item.protein}g · C: {item.carbs}g · F: {item.fats}g · Fb: {item.fiber}g
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 1-Tap Add Button */}
                    <button
                      disabled={isLogging}
                      onClick={() => handleQuickLog(item)}
                      className="py-2 px-3 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-sm shadow-orange-500/20 shrink-0 border-none disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                      <span>{isLogging ? "Adding..." : "Log"}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
