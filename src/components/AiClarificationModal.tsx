import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Zap, Camera, Search } from "lucide-react";
import { cn } from "../lib/utils";

export interface PendingAiClarification {
  mealData: any;
  confidenceScore: number;
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
  const isNonFood = clarificationData.isNonFood || confidenceScore < 30 || clarificationData.mealData?.isFood === false;
  const photoUrl = clarificationData.image || clarificationData.mealData?.image;
  const dishName = clarificationData.mealData?.name || "dish";

  const handleProceed = () => {
    const finalAnswer = customAnswer.trim() || selectedOption || clarificationData.options[0] || "";
    onConfirm(finalAnswer);
  };

  const dynamicPlaceholder = `e.g. Extra ${dishName}, no dressing, half portion...`;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-end justify-center font-sans select-none" onClick={onClose}>
        {/* Dark Backing Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-stone-950/40 backdrop-blur-md cursor-pointer"
        />

        {/* BOTTOM SHEET CONTAINER */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden max-h-[90dvh]"
        >
          {/* 1. FULL-BLEED ICONIC IMAGE PREVIEW HEADER */}
          <div className="relative w-full h-44 sm:h-52 bg-stone-900 shrink-0 overflow-hidden">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Scanned Food"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-500/20 to-orange-600/30 text-white">
                <span className="text-4xl">🍱</span>
              </div>
            )}

            {/* Gradient Overlay for Top Contrast */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

            {/* Top-Left Floating Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 z-20"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>

            {/* Top-Right Floating Confidence Badge */}
            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1.5 text-white shadow-md z-20 font-sans">
              <span className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isNonFood ? "bg-red-400" : confidenceScore < 70 ? "bg-amber-400" : "bg-emerald-400"
              )} />
              <span className="text-[11px] font-black font-mono tracking-wide">
                {confidenceScore}% {isNonFood ? "Inedible" : "Confidence"}
              </span>
            </div>
          </div>

          {/* 2. BODY CONTENT (SCROLLABLE) */}
          <div className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0 text-left font-sans">
            {isNonFood ? (
              <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-4 space-y-2 text-center shadow-3xs">
                <div className="text-3xl">🖊️</div>
                <h4 className="text-sm font-black text-orange-950">
                  That looks like a {clarificationData.detectedObject || clarificationData.mealData?.name || "Pen 🖊️"}!
                </h4>
                <p className="text-xs font-medium text-stone-600 leading-relaxed">
                  FitAI is strictly designed for tracking edible meals and drinks. Logging non-food items is disabled to protect your nutritional data integrity.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* QUESTION HEADER (Clean typography, zero icon soup) */}
                <h4 className="text-sm font-black text-orange-950 leading-snug">
                  {clarificationData.question}
                </h4>

                {/* MULTIPLE CHOICE OPTIONS */}
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
                            "w-5 h-5 rounded-full border text-[10px] font-black flex items-center justify-center shrink-0",
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

                {/* 2-3 LINE TEXTAREA WITH DYNAMIC PLACEHOLDER */}
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block text-left">
                    Or Type Custom Detail
                  </label>
                  <textarea
                    rows={3}
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    placeholder={dynamicPlaceholder}
                    className="w-full bg-white border border-stone-200/80 rounded-2xl p-3 text-xs font-bold text-orange-950 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 shadow-3xs font-sans resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. STICKY BOTTOM DOCKED STACKED CTAS (Text-Only, Zero Icons) */}
          <div className="p-4 bg-white/95 backdrop-blur-md border-t border-stone-200/60 shrink-0 w-full font-sans space-y-2">
            {isNonFood ? (
              <div className="space-y-2">
                {onRetakePhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRetakePhoto();
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/20 flex items-center justify-center cursor-pointer active:scale-95 transition-all font-sans border-none"
                  >
                    Retake Photo
                  </button>
                )}

                {onSearchFood && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSearchFood();
                    }}
                    className="w-full py-3 bg-stone-100 hover:bg-stone-200 border border-stone-200/80 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all font-sans"
                  >
                    Search Food Library
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleProceed}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-center cursor-pointer active:scale-95 transition-all font-sans border-none"
                >
                  Confirm & Proceed
                </button>

                <button
                  type="button"
                  onClick={onLogAnyway}
                  className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-200/80 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all font-sans"
                >
                  Log Anyway
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
