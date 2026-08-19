import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { cn } from "../lib/utils";
import type { TrackedNutrient } from "../types";
import type { FoodFilterState } from "../utils/foodFilter";
import { getActiveFilterCount, INITIAL_FOOD_FILTER_STATE, saveFoodFilters } from "../utils/foodFilter";

export interface FoodFilterBarProps {
  filters?: FoodFilterState;
  onChange: (filters: FoodFilterState) => void;
  availableTags?: string[];
  trackedNutrients?: TrackedNutrient[];
  showTypeToggles?: boolean;
  matchCount?: number;
  customActions?: React.ReactNode;
  placeholder?: string;
  className?: string;
  variant?: "light" | "dark" | "transparent";
}

export const FoodFilterBar: React.FC<FoodFilterBarProps> = ({
  filters,
  onChange,
  availableTags = [],
  trackedNutrients = [],
  showTypeToggles = true,
  matchCount,
  customActions,
  placeholder = "Search recipes, logs, or ingredients...",
  className,
  variant = "light",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      // If click was inside the filter drawer, do not close
      if (drawerRef.current && drawerRef.current.contains(target)) {
        return;
      }
      // If click was on the filter button, let button onClick handle it
      if (filterBtnRef.current && filterBtnRef.current.contains(target)) {
        return;
      }
      // Clicked anywhere else (search bar, top bar, food list, background) -> close drawer
      setIsExpanded(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isExpanded]);

  const isDark = variant === "dark";
  const isTransparent = variant === "transparent";
  const safeFilters = filters || INITIAL_FOOD_FILTER_STATE;
  const activeCount = getActiveFilterCount(safeFilters);

  // Dynamic Sort Attribute options: Date -> Log Count -> A->Z -> Calories -> Active Nutrients
  const sortAttributes = [
    { id: "date", label: "Date" },
    { id: "log-count", label: "Log Count" },
    { id: "name", label: "A → Z" },
    { id: "calories", label: "Calories" },
    ...(trackedNutrients || []).map((n) => ({
      id: n.id,
      label: n.name,
    })),
  ];

  const updateFilters = (next: FoodFilterState) => {
    saveFoodFilters(next);
    onChange(next);
  };

  const handleReset = () => {
    const next: FoodFilterState = {
      ...INITIAL_FOOD_FILTER_STATE,
      search: safeFilters.search || "",
    };
    updateFilters(next);
  };

  const toggleTag = (tag: string) => {
    const selected = safeFilters.selectedTags || [];
    const isSelected = selected.includes(tag);
    updateFilters({
      ...safeFilters,
      selectedTags: isSelected
        ? selected.filter((t) => t !== tag)
        : [...selected, tag],
    });
  };

  const setSortField = (fieldId: string) => {
    if (safeFilters.sortField === fieldId) {
      updateFilters({
        ...safeFilters,
        sortDirection: safeFilters.sortDirection === "desc" ? "asc" : "desc",
      });
    } else {
      updateFilters({
        ...safeFilters,
        sortField: fieldId,
        sortDirection: fieldId === "name" ? "asc" : "desc",
      });
    }
  };

  const toggleSortDirection = () => {
    updateFilters({
      ...safeFilters,
      sortDirection: safeFilters.sortDirection === "desc" ? "asc" : "desc",
    });
  };

  return (
    <div className={cn("w-full space-y-2.5 font-sans relative", className)}>
      {/* TOP CONTROLS ROW */}
      <div className="flex items-center justify-between gap-2 w-full font-sans min-h-[38px] relative z-40">
        {/* FULL-WIDTH MORPHING SEARCH BAR WHEN OPEN */}
        {isSearchOpen ? (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 font-sans w-full"
          >
            <div className={cn(
              "flex-1 relative flex items-center border rounded-2xl px-3.5 py-2 shadow-3xs transition-all min-w-0",
              isDark
                ? "bg-stone-900 border-stone-700 focus-within:border-orange-500"
                : "bg-stone-100 focus-within:bg-white border-stone-300 focus-within:border-stone-400"
            )}>
              <Search className="w-4 h-4 text-orange-500 mr-2 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder={placeholder}
                value={safeFilters.search || ""}
                onChange={(e) => updateFilters({ ...safeFilters, search: e.target.value })}
                className={cn(
                  "w-full bg-transparent border-none outline-none text-xs font-bold font-sans min-w-0",
                  isDark ? "text-white placeholder:text-stone-500" : "text-stone-900 placeholder:text-stone-400"
                )}
              />
              {safeFilters.search && (
                <button
                  type="button"
                  onClick={() => updateFilters({ ...safeFilters, search: "" })}
                  className={cn(
                    "shrink-0 text-xs font-black font-sans ml-1 cursor-pointer transition-colors",
                    isDark ? "text-stone-400 hover:text-white" : "text-stone-400 hover:text-stone-700"
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                updateFilters({ ...safeFilters, search: "" });
                setIsSearchOpen(false);
              }}
              className={cn(
                "px-3.5 py-2 border font-black text-xs rounded-xl transition-all cursor-pointer shrink-0 active:scale-95",
                isDark
                  ? "bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200"
                  : "bg-stone-100 hover:bg-stone-200 border-stone-200/80 text-stone-700"
              )}
            >
              Cancel
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-2 font-sans w-full"
          >
            {/* Left: Minimalist Click-to-Search Input Area */}
            <div
              onClick={() => {
                setIsSearchOpen(true);
                setIsExpanded(false);
              }}
              className={cn(
                "flex-1 flex items-center gap-2 px-3.5 py-2 rounded-2xl border cursor-pointer transition-all min-w-0 shadow-3xs",
                isDark
                  ? "bg-stone-900 border-stone-700 text-stone-400 hover:border-stone-600"
                  : isTransparent
                    ? "bg-stone-100/60 hover:bg-stone-200/60 border-stone-200/80 text-stone-500"
                    : "bg-stone-100 hover:bg-stone-200/70 border-stone-200/80 text-stone-500"
              )}
            >
              <Search className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="text-xs font-semibold truncate select-none">
                {safeFilters.search || placeholder}
              </span>
            </div>

            {/* Right: Filter Drawer Trigger + Custom Actions */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                ref={filterBtnRef}
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className={cn(
                  "h-8 px-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shrink-0 active:scale-95 shadow-3xs",
                  isExpanded || activeCount > 0
                    ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                    : isDark
                      ? "bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200"
                      : "bg-stone-100 hover:bg-stone-200 border-black/5 text-stone-700"
                )}
                title="Filter & Sort Options"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {activeCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1.5 bg-white text-orange-600 rounded-full flex items-center justify-center text-[10px] font-black leading-none shrink-0 shadow-2xs">
                    {activeCount}
                  </span>
                )}
              </button>

              {customActions}
            </div>
          </motion.div>
        )}
      </div>

      {/* EXPANDABLE FULL-WIDTH FILTER & SORT DRAWER */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            ref={drawerRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden font-sans relative z-40 w-full"
          >
            <div
              className={cn(
                "border rounded-[32px] p-5 space-y-4 text-left font-sans transition-all",
                isDark
                  ? "bg-stone-900 border-stone-800 text-white shadow-md"
                  : isTransparent
                    ? "bg-stone-100/40 backdrop-blur-xs border-stone-200/60 text-stone-900 shadow-3xs"
                    : "bg-white/98 border-stone-200/90 shadow-2xs"
              )}
            >
              {/* DRAWER HEADER: Title & Quick Reset / Close */}
              <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
                <span className="text-[11px] font-black uppercase tracking-widest text-orange-950 dark:text-orange-400">
                  Filters & Sort
                </span>
                <div className="flex items-center gap-2">
                  {activeCount > 0 && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-600 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors",
                      isDark ? "bg-stone-800 hover:bg-stone-700 text-stone-300" : "bg-stone-100 hover:bg-stone-200 text-stone-500"
                    )}
                    title="Close Filter Panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* SECTION 1: FOOD TYPE (ALL, RECIPES, PAST FOODS) */}
              {showTypeToggles && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                    Food Type (Show Items)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {/* 1. All Foods */}
                    <button
                      type="button"
                      onClick={() =>
                        updateFilters({ ...safeFilters, showRecipes: true, showLogs: true })
                      }
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border select-none",
                        safeFilters.showRecipes !== false && safeFilters.showLogs !== false
                          ? "bg-orange-500 text-white border-orange-500 font-black shadow-2xs"
                          : isDark
                            ? "bg-stone-800 hover:bg-stone-750 border-stone-700 text-stone-400"
                            : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-500"
                      )}
                    >
                      All
                    </button>

                    {/* 2. Recipes Only */}
                    <button
                      type="button"
                      onClick={() =>
                        updateFilters({ ...safeFilters, showRecipes: true, showLogs: false })
                      }
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border select-none",
                        safeFilters.showRecipes === true && safeFilters.showLogs === false
                          ? "bg-orange-500 text-white border-orange-500 font-black shadow-2xs"
                          : isDark
                            ? "bg-stone-800 hover:bg-stone-750 border-stone-700 text-stone-400"
                            : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-500"
                      )}
                    >
                      Recipes
                    </button>

                    {/* 3. Past Foods Only */}
                    <button
                      type="button"
                      onClick={() =>
                        updateFilters({ ...safeFilters, showRecipes: false, showLogs: true })
                      }
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border select-none",
                        safeFilters.showRecipes === false && safeFilters.showLogs === true
                          ? "bg-orange-500 text-white border-orange-500 font-black shadow-2xs"
                          : isDark
                            ? "bg-stone-800 hover:bg-stone-750 border-stone-700 text-stone-400"
                            : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-500"
                      )}
                    >
                      Past Foods
                    </button>
                  </div>
                </div>
              )}
              
              {/* SECTION 2: FILTER BY AI TAGS (MULTI-SELECT) */}
              {availableTags.length > 0 && (
                <div className={cn("space-y-2", showTypeToggles && (isDark ? "pt-3.5 border-t border-stone-800" : "pt-3.5 border-t border-stone-100"))}>
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                    Dietary & AI Tags
                  </span>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {availableTags.map((tag) => {
                      const isSelected = (safeFilters.selectedTags || []).includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border select-none",
                            isSelected
                              ? "bg-orange-500 text-white border-orange-500 font-black shadow-2xs"
                              : isDark
                                ? "bg-stone-800 hover:bg-stone-750 border-stone-700 text-stone-200"
                                : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700"
                          )}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: SORT BY ATTRIBUTE + DIRECTION (SINGLE SELECT) */}
              <div className={cn("space-y-3", (showTypeToggles || availableTags.length > 0) && (isDark ? "pt-3.5 border-t border-stone-800" : "pt-3.5 border-t border-stone-100"))}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">
                    Sort By (Pick One)
                  </span>

                  {/* Distinct Direction Switcher Badge */}
                  <button
                    type="button"
                    onClick={toggleSortDirection}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-3xs",
                      isDark
                        ? "bg-orange-950/80 text-orange-400 border border-orange-500/30"
                        : "bg-orange-50 text-orange-600 border border-orange-200/80"
                    )}
                    title="Toggle Sort Direction"
                  >
                    {safeFilters.sortDirection === "desc" ? (
                      <>
                        <ArrowDown className="w-3 h-3 text-orange-500 font-bold" />
                        <span>HIGH → LOW</span>
                      </>
                    ) : (
                      <>
                        <ArrowUp className="w-3 h-3 text-orange-500 font-bold" />
                        <span>LOW → HIGH</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sort Attribute Pills */}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {sortAttributes.map((attr) => {
                    const isSelected = safeFilters.sortField === attr.id;
                    return (
                      <button
                        key={attr.id}
                        type="button"
                        onClick={() => setSortField(attr.id)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border select-none flex items-center gap-1",
                          isSelected
                            ? "bg-orange-500 text-white border-orange-500 font-black shadow-2xs"
                            : isDark
                              ? "bg-stone-800 hover:bg-stone-750 border-stone-700 text-stone-200"
                              : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700"
                        )}
                      >
                        <span>{attr.label}</span>
                        {isSelected && (
                          safeFilters.sortDirection === "desc" ? (
                            <ArrowDown className="w-3 h-3 text-white" />
                          ) : (
                            <ArrowUp className="w-3 h-3 text-white" />
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: FOOTER (MATCH COUNT) */}
              <div className={cn("pt-3 flex items-center justify-between", isDark ? "border-t border-stone-800" : "border-t border-stone-100")}>
                <span className={cn("text-xs font-bold", isDark ? "text-stone-400" : "text-stone-600")}>
                  {matchCount !== undefined ? `${matchCount} food${matchCount === 1 ? "" : "s"} match` : ""}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
