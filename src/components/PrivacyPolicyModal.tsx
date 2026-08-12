import React from "react";
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
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#FAF7F2] w-full max-w-lg rounded-[32px] border border-white/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 pb-4 bg-white/80 border-b border-orange-100/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-orange-950 tracking-tight">
                  Privacy Policy & Terms
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-900/50">
                  FitAI Data Commitment
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto text-orange-950/80 text-xs leading-relaxed font-medium">
            <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100 text-orange-900 flex items-start gap-3">
              <Lock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium">
                Your health and nutrition data is yours alone. FitAI never sells your personal data, meal logs, or biometric stats to third parties.
              </p>
            </div>

            <section className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-orange-950 flex items-center gap-2">
                <EyeOff className="w-3.5 h-3.5 text-orange-600" />
                1. Data Collection & Usage
              </h3>
              <p>
                We store your profile preferences, target metrics, daily food logs, recipes, and biometric vitals strictly to calculate your progress and provide personalized AI macro breakdowns.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-orange-950 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                2. AI Meal Processing
              </h3>
              <p>
                When you use AI meal refiners, your textual meal descriptions are processed using encrypted requests via Google Gemini AI solely to calculate macronutrients. No personally identifiable profile information is attached to AI food prompt queries.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-orange-950 flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-orange-600" />
                3. Your Account & Data Rights
              </h3>
              <p>
                You retain full rights to delete your account and all associated data at any time. Triggering "Delete Account & Purge Data" in app settings permanently removes all profile records, meals, recipes, and vitals from our servers immediately.
              </p>
            </section>

            <div className="pt-2 border-t border-orange-100 text-[10px] text-stone-400 text-center font-bold">
              FitAI v2.0 • Last updated August 2026
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-white/80 border-t border-orange-100/50 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-2xl transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-500/20"
            >
              Understand & Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
