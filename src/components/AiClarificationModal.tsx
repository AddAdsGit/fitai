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
      <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center font-sans select-none pointer-events-auto">
        {/* Dark Backing Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/60 backdrop-blur-md cursor-pointer"
        />

        {/* BOTTOM SHEET CONTAINER */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FAF7F2] border-t border-x border-orange-200/80 rounded-t-[36px] sm:rounded-[36px] w-full max-w-lg max-h-[90vh] relative z-10 shadow-2xl flex flex-col text-left overflow-hidden font-sans"
        >
          {/* Top Handle Pill */}
          <div className="w-full pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-stone-300/80" />
          </div>

          {/* Sheet Header */}
          <div className="px-5 py-2.5 flex items-center justify-between border-b border-black/[0.04] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border",
                isNonFood
                  ? "bg-red-500/10 border-red-500/20 text-red-600"
                  : "bg-orange-500/10 border-orange-500/20 text-orange-600"
              )}>
                {isNonFood ? (
                  <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                ) : (
                  <Sparkles className="w-4.5 h-4.5 text-orange-500" />
                )}
              </div>
              <div>
                <h3 className="text-xs font-black text-orange-950 uppercase tracking-widest leading-none font-sans">
                  {isNonFood ? "Non-Food Object Detected" : "AI Meal Clarification"}
                </h3>
                <p className="text-[10.5px] font-bold text-stone-500 mt-0.5">
                  {isNonFood ? "Inedible item flagged" : "Ensure 100% nutritional accuracy"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-500 flex items-center justify-center transition-colors border border-stone-200/60 shadow-3xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* SCROLLABLE BODY CONTENT */}
          <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(88vh-130px)] font-sans">
            
            {/* PHOTO PREVIEW & CONFIDENCE METER CARD */}
            <div className="bg-white border border-stone-200/80 rounded-3xl p-3.5 space-y-3 shadow-3xs">
              <div className="flex items-center gap-3.5">
                {/* Photo Thumbnail */}
                {photoUrl ? (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-stone-200/80 shrink-0 bg-stone-100 shadow-3xs relative">
                    <img
                      src={photoUrl}
                      alt="Scanned dish"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-orange-50/80 border border-orange-100 flex items-center justify-center text-orange-500 text-xl font-bold shrink-0">
                    🍱
                  </div>
                )}

                {/* Confidence Score Bar */}
                <div className="flex-1 space-y-1.5 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-orange-500" />
                      Confidence Meter
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

                  {/* Progress Meter Bar */}
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200/60">
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
                      ? "Inedible item flagged. Meal logging blocked."
                      : confidenceScore >= 90
                      ? "High Certainty Log"
                      : "Below 90% confidence — confirm 1 quick detail below."}
                  </p>
                </div>
              </div>
            </div>

            {/* NON-FOOD VIEW VS CLARIFICATION QUESTION VIEW */}
            {isNonFood ? (
              <div className="bg-red-50/60 border border-red-200/80 rounded-3xl p-4 space-y-2 text-center">
                <div className="text-3xl">🖊️</div>
                <h4 className="text-sm font-black text-orange-950">
                  That looks like a {clarificationData.detectedObject || clarificationData.mealData?.name || "Pen 🖊️"}!
                </h4>
                <p className="text-xs font-medium text-stone-600 leading-relaxed">
                  FitAI is strictly designed for tracking food and drinks. Non-food entries are disabled to keep your daily macro charts clean.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-orange-950 leading-snug flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span>{clarificationData.question}</span>
                </h4>

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

          {/* STICKY BOTTOM ACTIONS BAR */}
          <div className="p-4 bg-white/95 backdrop-blur-md border-t border-stone-200/60 shrink-0 space-y-2 font-sans">
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
