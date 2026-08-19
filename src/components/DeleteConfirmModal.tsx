import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Meal } from "../types";

export interface DeleteConfirmModalProps {
  mealPendingDelete: Meal | null;
  setMealPendingDelete: (meal: Meal | null) => void;
  confirmDeleteMeal: (meal: Meal) => void;
}

export function DeleteConfirmModal({
  mealPendingDelete,
  setMealPendingDelete,
  confirmDeleteMeal,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    if (mealPendingDelete) {
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [mealPendingDelete]);

  if (!mealPendingDelete || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] flex items-end justify-center font-sans"
        onClick={(e) => {
          if (e.target === e.currentTarget) setMealPendingDelete(null);
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setMealPendingDelete(null)}
          className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm cursor-pointer touch-none"
        />

        {/* Iconic Bottom-Aligned Mobile Sheet */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-6 pb-[max(20px,env(safe-area-inset-bottom,20px))] text-left space-y-4 overscroll-contain touch-pan-y"
        >
          {/* Top Drag Indicator Pill */}
          <div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-2 shrink-0 select-none" />

          {/* Header Icon + Titles */}
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0 shadow-3xs">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-stone-900 tracking-tight">Delete meal log?</h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5 leading-relaxed">
                This meal log will be permanently removed from your history. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Meal Details Box */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-3.5 text-left flex items-center gap-3 shadow-3xs">
            {mealPendingDelete.image ? (
              <img
                src={mealPendingDelete.image}
                alt={mealPendingDelete.name}
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200/60"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-orange-100/60 flex items-center justify-center text-lg shrink-0">
                🍽️
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-stone-900 truncate">
                {mealPendingDelete.name}
              </div>
              <div className="text-[11px] font-bold text-stone-500 mt-0.5 flex items-center gap-1.5">
                <span className="text-orange-600 font-extrabold">{mealPendingDelete.calories} kcal</span>
                <span className="text-stone-300">•</span>
                <span>{mealPendingDelete.time || "Logged"}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Full-Height Touch Targets */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setMealPendingDelete(null)}
              className="h-12 bg-stone-200/80 hover:bg-stone-300 text-stone-700 text-xs font-black uppercase tracking-wider rounded-2xl cursor-pointer select-none transition-all active:scale-[0.98] border-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                confirmDeleteMeal(mealPendingDelete);
                setMealPendingDelete(null);
              }}
              className="h-12 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-red-500/20 cursor-pointer select-none transition-all active:scale-[0.98] border-none"
            >
              Delete Log
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
