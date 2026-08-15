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
import { getActiveFilterCount, INITIAL_FOOD_FILTER_STATE } from "../utils/foodFilter";

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
  const filterCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (filterCardRef.current && !filterCardRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
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

  const handleReset = () => {
    onChange({
      ...safeFilters,
      sortField: "date",
      sortDirection: "desc",
      selectedTags: [],
      search: "",
    });
  };

  const toggleTag = (tag: string) => {
    const selected = safeFilters.selectedTags || [];
    const isSelected = selected.includes(tag);
    onChange({
      ...safeFilters,
      selectedTags: isSelected
        ? selected.filter((t) => t !== tag)
        : [...selected, tag],
    });
  };

  const setSortField = (fieldId: string) => {
    if (safeFilters.sortField === fieldId) {
      onChange({
        ...safeFilters,
        sortDirection: safeFilters.sortDirection === "desc" ? "asc" : "desc",
      });
    } else {
      onChange({
        ...safeFilters,
        sortField: fieldId,
        sortDirection: fieldId === "name" ? "asc" : "desc",
      });
    }
  };

  const toggleSortDirection = () => {
    onChange({
      ...safeFilters,
      sortDirection: safeFilters.sortDirection === "desc" ? "asc" : "desc",
    });
  };

  return (
    <div className={cn("w-full space-y-2.5 font-sans relative", className)}>
      {/* TOP CONTROLS ROW */}
      <div className="flex items-center justify-between gap-1.5 w-full font-sans min-h-[38px] relative z-40">
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
                onChange={(e) => onChange({ ...safeFilters, search: e.target.value })}
                className={cn(
                  "w-full bg-transparent border-none outline-none text-xs font-bold font-sans min-w-0",
                  isDark ? "text-white placeholder:text-stone-500" : "text-stone-900 placeholder:text-stone-400"
                )}
              />
              {safeFilters.search && (
                <button
                  type="button"
                  onClick={() => onChange({ ...safeFilters, search: "" })}
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
                onChange({ ...safeFilters, search: "" });
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
            className="flex items-center justify-between gap-1.5 font-sans w-full"
          >
            {/* Left: 2 Multi-Toggle Pills (Recipes & Past Foods) */}
            {showTypeToggles && (
              <div className="flex items-center gap-1.5 shrink-0 py-0.5">
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...safeFilters, showRecipes: !safeFilters.showRecipes })
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer select-none shrink-0 flex items-center justify-center font-black active:scale-95",
                    safeFilters.showRecipes !== false
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20 border border-orange-500"
                      : isDark
                        ? "bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 opacity-70"
                        : "bg-stone-100 hover:bg-stone-200/80 text-stone-600 border border-stone-200/40 opacity-70"
                  )}
                >
                  <span>Recipes</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...safeFilters, showLogs: !safeFilters.showLogs })
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer select-none shrink-0 flex items-center justify-center font-black active:scale-95",
                    safeFilters.showLogs !== false
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20 border border-orange-500"
                      : isDark
                        ? "bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 opacity-70"
                        : "bg-stone-100 hover:bg-stone-200/80 text-stone-600 border border-stone-200/40 opacity-70"
                  )}
                >
                  <span>Past Foods</span>
                </button>
              </div>
            )}

            {/* Right: Search Icon + Filter Drawer Trigger + Custom Actions */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className={cn(
                  "p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-3xs",
                  safeFilters.search
                    ? "bg-orange-500 text-white border-orange-500"
                    : isDark
                      ? "bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200"
                      : "bg-stone-100 hover:bg-stone-200 border-black/5 text-stone-600"
                )}
                title="Search Recipes & Logs"
              >
                <Search className={cn("w-4 h-4", safeFilters.search ? "text-white" : isDark ? "text-stone-200" : "text-stone-600")} />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "h-8 px-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shrink-0 active:scale-95 shadow-3xs",
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
                  <span className="min-w-[16px] h-4 bg-white text-orange-600 rounded-full flex items-center justify-center text-[9px] font-black leading-none px-1">
                    {activeCount}
                  </span>
                )}
              </button>

              {customActions}
            </div>
          </motion.div>
        )}
      </div>

      {/* INVISIBLE CLICK-OUTSIDE BACKDROP (Clean Transparent Backdrop) */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-30 bg-transparent"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* EXPANDABLE FULL-WIDTH FILTER & SORT DRAWER */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden font-sans relative z-40 w-full"
          >
            <div
              ref={filterCardRef}
              className={cn(
                "border rounded-[32px] p-5 space-y-4 text-left font-sans transition-all",
                isDark
                  ? "bg-stone-900 border-stone-800 text-white shadow-md"
                  : isTransparent
                    ? "bg-stone-100/40 backdrop-blur-xs border-stone-200/60 text-stone-900 shadow-3xs"
                    : "bg-white/98 border-stone-200/90 shadow-2xs"
              )}
            >
              
              {/* SECTION 1: FILTER BY AI TAGS (TOP — MULTI-SELECT) */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-black uppercase tracking-wider block", isDark ? "text-stone-400" : "text-stone-400")}>
                      AI Tags (Multi-Select)
                    </span>
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

              {/* SECTION 2: SORT BY ATTRIBUTE + DIRECTION (BOTTOM — SINGLE SELECT) */}
              <div className={cn("space-y-3", availableTags.length > 0 && (isDark ? "pt-4 border-t border-stone-800" : "pt-4 border-t border-stone-100"))}>
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

              {/* SECTION 3: FOOTER (MATCH COUNT & RESET) */}
              <div className={cn("pt-3.5 flex items-center justify-between", isDark ? "border-t border-stone-800" : "border-t border-stone-100")}>
                <span className={cn("text-xs font-bold", isDark ? "text-stone-400" : "text-stone-600")}>
                  {matchCount !== undefined ? `${matchCount} food${matchCount === 1 ? "" : "s"} match` : ""}
                </span>

                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
