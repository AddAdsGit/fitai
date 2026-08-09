import React from "react";
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
  return (
    <AnimatePresence>
      {mealPendingDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-[2px] flex items-center justify-center p-6 font-sans"
        >
          <motion.div
            initial={{ scale: 0.9, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 15 }}
            className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl border border-stone-100 text-left space-y-4"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900">Delete meal log?</h3>
                <p className="text-[10px] text-stone-400 font-semibold mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200/50 rounded-2xl p-3.5 text-left">
              <div className="text-[11px] font-black text-stone-800 leading-snug truncate">
                {mealPendingDelete.name}
              </div>
              <div className="text-[9px] font-bold text-stone-500 mt-1 flex items-center gap-1.5">
                <span className="text-orange-600 font-extrabold">{mealPendingDelete.calories} kcal</span>
                <span className="text-stone-300">•</span>
                <span>{mealPendingDelete.time}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setMealPendingDelete(null)}
                className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-black uppercase tracking-wider py-3 rounded-xl cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDeleteMeal(mealPendingDelete);
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-wider py-3 rounded-xl cursor-pointer select-none shadow-md shadow-red-500/10"
              >
                Delete Log
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
