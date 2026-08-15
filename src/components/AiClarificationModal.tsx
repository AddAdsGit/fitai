import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Zap,
  X,
  HelpCircle,
  MessageSquare,
  Camera,
  Search,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../lib/utils";

export interface PendingAiClarification {
  mealData: any;
  confidenceScore: number; // e.g. 78
  question: string;
  options: string[];
  isNonFood?: boolean;
  detectedObject?: string;
  image?: string;
}

export interface AiClarificationModalProps {
  isOpen: boolean;
  clarificationData: PendingAiClarification | null;
  onConfirm: (answer: string) => void;
  onLogAnyway: () => void;
  onRetakePhoto?: () => void;
  onSearchFood?: () => void;
  onClose: () => void;
}

export const AiClarificationModal: React.FC<AiClarificationModalProps> = ({
  isOpen,
  clarificationData,
  onConfirm,
  onLogAnyway,
  onRetakePhoto,
  onSearchFood,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>(
    clarificationData?.options?.[0] || ""
  );
  const [customAnswer, setCustomAnswer] = useState<string>("");

  if (!isOpen || !clarificationData || typeof document === "undefined") return null;

  const confidenceScore = Math.min(100, Math.max(0, clarificationData.confidenceScore || 78));
  const isLowConfidence = confidenceScore < 70;
  const isNonFood = clarificationData.isNonFood || confidenceScore < 30 || clarificationData.mealData?.isFood === false;
  const photoUrl = clarificationData.image || clarificationData.mealData?.image;

  const handleProceed = () => {
    const finalAnswer = customAnswer.trim() || selectedOption || clarificationData.options[0] || "";
    onConfirm(finalAnswer);
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-end justify-center font-sans select-none" onClick={onClose}>
        {/* Dark Backing Overlay matching ManualLogModal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-stone-950/40 backdrop-blur-md cursor-pointer"
        />

        {/* BOTTOM SHEET CONTAINER IDENTICAL TO MANUAL LOG MODAL */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col transition-[height,max-height] duration-300 overflow-hidden max-h-[85dvh]"
        >
          {/* Header Bar */}
          <div className="p-6 pb-3 space-y-3 shrink-0">
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.04]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                </div>
                <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest font-sans">
                  {isNonFood ? "Non-Food Object Detected" : "AI Meal Clarification"}
                </h4>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors cursor-pointer border border-stone-200/60 shadow-3xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SLEEK CONFIDENCE METER HEADER CARD */}
            <div className="bg-white/90 border border-stone-200/80 rounded-2xl p-3.5 space-y-2 shadow-3xs">
              <div className="flex items-center gap-3">
                {photoUrl ? (
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-stone-200/80 shrink-0 bg-stone-100 shadow-3xs relative">
                    <img src={photoUrl} alt="Scanned food" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 text-lg shrink-0 font-bold">
                    🍱
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-orange-500" />
                      AI Confidence
                    </span>
                    <span className={cn(
                      "font-mono font-black text-[11px] px-2 py-0.5 rounded-full border",
                      isNonFood
                        ? "bg-red-50 text-red-700 border-red-200"
                        : isLowConfidence
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-orange-50 text-orange-700 border-orange-200"
                    )}>
                      {confidenceScore}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${confidenceScore}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full transition-all",
                        isNonFood
                          ? "bg-gradient-to-r from-red-400 to-red-500"
                          : isLowConfidence
                          ? "bg-gradient-to-r from-amber-400 to-amber-500"
                          : "bg-gradient-to-r from-orange-400 to-orange-500"
                      )}
                    />
                  </div>

                  <p className="text-[10px] font-semibold text-stone-500 truncate">
                    {isNonFood
                      ? "Inedible item flagged — logging disabled"
                      : confidenceScore >= 90
                      ? "High Certainty Log"
                      : "Under 90% confidence — confirm 1 detail below."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Questions Body */}
          <div className="px-6 pb-6 space-y-4 flex-1 overflow-y-auto min-h-0 text-left">
            {isNonFood ? (
              <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-4 space-y-2 text-center">
                <div className="text-3xl">🖊️</div>
                <h4 className="text-sm font-black text-orange-950">
                  That looks like a {clarificationData.detectedObject || clarificationData.mealData?.name || "Pen 🖊️"}!
                </h4>
                <p className="text-xs font-medium text-stone-600 leading-relaxed">
                  FitAI is strictly designed for tracking edible meals and beverages. Logging non-food items is disabled to protect your nutritional data integrity.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h5 className="text-xs font-black text-orange-950 leading-snug flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span>{clarificationData.question}</span>
                </h5>

                {/* Multiple Choice Options */}
                <div className="space-y-2">
                  {clarificationData.options.map((opt, idx) => {
                    const isSelected = (selectedOption === opt || (!selectedOption && idx === 0)) && !customAnswer.trim();
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSelectedOption(opt);
                          setCustomAnswer("");
                        }}
                        className={cn(
                          "w-full p-3.5 rounded-2xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer active:scale-98 font-sans",
                          isSelected
                            ? "bg-orange-50/90 border-orange-500 text-orange-950 font-black shadow-3xs"
                            : "bg-white border-stone-200/80 hover:bg-stone-50 text-stone-700 font-bold"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={cn(
                            "w-5.5 h-5.5 rounded-full border text-[10px] font-black flex items-center justify-center shrink-0",
                            isSelected
                              ? "bg-orange-500 border-orange-500 text-white"
                              : "border-stone-300 text-stone-400 bg-stone-50"
                          )}>
                            {isSelected ? "✓" : idx + 1}
                          </span>
                          <span>{opt}</span>
                        </span>
                        {idx === 0 && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded-full border border-orange-200/60 shrink-0">
                            Recommended
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Open-Ended Custom Answer Input */}
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block text-left">
                    Or Type Custom Detail (Optional)
                  </label>
                  <input
                    type="text"
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    placeholder="e.g. Stuffed with paneer & extra spices..."
                    className="w-full bg-white border border-stone-200/80 rounded-2xl px-3.5 py-3 text-xs font-bold text-orange-950 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 shadow-3xs font-sans"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STICKY BOTTOM DOCKED ACTIONS BAR (100% Manual Log Style) */}
          <div className="p-4 bg-white/95 backdrop-blur-md border-t border-stone-200/60 shrink-0 w-full font-sans space-y-2.5">
            {isNonFood ? (
              <div className="grid grid-cols-2 gap-2">
                {onRetakePhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRetakePhoto();
                    }}
                    className="py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all font-sans"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Retake Photo</span>
                  </button>
                )}

                {onSearchFood && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSearchFood();
                    }}
                    className="py-3.5 bg-stone-100 hover:bg-stone-200 border border-stone-200/80 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all font-sans"
                  >
                    <Search className="w-3.5 h-3.5 text-stone-500" />
                    <span>Search Food</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleProceed}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all font-sans"
                >
                  <span>Confirm Answer & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onLogAnyway}
                  className="w-full py-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-stone-600 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all font-sans"
                >
                  <Zap className="w-3.5 h-3.5 text-orange-500" />
                  <span>Bypass & Log Anyway</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
