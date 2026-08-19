import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck, Lock, Trash2, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] flex items-end justify-center font-sans"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm cursor-pointer touch-none"
        />

        {/* Bottom Sheet */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="bg-[#FAF7F2] w-full max-w-md rounded-t-[36px] border-t border-x border-stone-200/80 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-6 pb-[max(20px,env(safe-area-inset-bottom,20px))] relative z-10 space-y-4 overscroll-contain touch-pan-y text-left"
        >
          {/* Top Drag Indicator Pill */}
          <div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-2 shrink-0 select-none" />

          {/* Header Row with Collision-Safe Layout */}
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-orange-100/80 border border-orange-200/60 flex items-center justify-center text-orange-600 shrink-0 shadow-3xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-stone-900 tracking-tight truncate">
                  Privacy Policy & Terms
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">
                  Data Commitment
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/70 shadow-3xs transition-all active:scale-95 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Policy Content Card */}
          <div className="bg-white rounded-[24px] border border-stone-200/80 p-4 space-y-4 max-h-[50vh] overflow-y-auto text-stone-700 text-xs leading-relaxed font-medium shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-contain touch-pan-y">
            <div className="p-3.5 bg-orange-50/70 rounded-2xl border border-orange-100 text-orange-950 flex items-start gap-2.5 shadow-3xs">
              <Lock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-semibold leading-normal">
                Your health and nutrition data is yours alone. FitAI never sells your personal logs, recipes, or biometric stats to third parties.
              </p>
            </div>

            <section className="space-y-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <EyeOff className="w-3.5 h-3.5 text-orange-600" />
                1. Data Collection & Usage
              </h3>
              <p className="text-stone-600 text-[11px]">
                We store your profile goals, daily meal logs, recipes, and vitals strictly to calculate progress and provide personalized macro breakdowns.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                2. AI Meal Processing
              </h3>
              <p className="text-stone-600 text-[11px]">
                When using AI nutrition estimates, meal descriptions and photos are processed through encrypted requests solely to calculate calories and macros. No personally identifiable data is attached.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-orange-600" />
                3. Your Account & Data Rights
              </h3>
              <p className="text-stone-600 text-[11px]">
                You retain full rights to delete your data at any time. Tapping "Delete Account" permanently removes all logs, recipes, and profile records immediately.
              </p>
            </section>

            <div className="pt-2 border-t border-stone-100 text-[10px] text-stone-400 text-center font-bold">
              FitAI v2.0 • Last updated August 2026
            </div>
          </div>

          {/* Clean Action Button */}
          <button
            onClick={onClose}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center"
          >
            Close
          </button>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
