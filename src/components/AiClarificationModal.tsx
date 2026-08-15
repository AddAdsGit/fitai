import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Zap, X, HelpCircle, MessageSquare, Camera, Search, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

export interface PendingAiClarification {
  mealData: any;
  confidenceScore: number; // e.g. 78
  question: string;
  options: string[];
  isNonFood?: boolean;
  detectedObject?: string; // e.g. "Pen", "Keys"
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

  const handleProceed = () => {
    const finalAnswer = customAnswer.trim() || selectedOption || clarificationData.options[0] || "";
    onConfirm(finalAnswer);
  };

  if (isNonFood) {
    const objectName = clarificationData.detectedObject || clarificationData.mealData?.name || "Non-Food Item";
    return createPortal(
      <AnimatePresence>
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 font-sans select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF7F2] border border-red-200/80 rounded-[32px] w-full max-w-md relative z-10 shadow-2xl p-5 space-y-4 text-left overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.04]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 flex items-center justify-center font-bold text-sm">
                  ⚠️
                </div>
                <h4 className="text-xs font-black text-red-950 uppercase tracking-widest font-sans">
                  Non-Food Item Detected
                </h4>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white hover:bg-stone-100 text-stone-500 flex items-center justify-center transition-colors border border-stone-200/60 shadow-3xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* CONFIDENCE METER */}
            <div className="bg-white/90 border border-red-200/60 rounded-2xl p-3.5 space-y-2 shadow-3xs">
              <div className="flex justify-between items-center text-xs font-bold font-sans">
                <span className="text-[10px] font-black uppercase text-red-600 tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  AI Confidence: {confidenceScore}%
                </span>
                <span className="font-mono font-black text-[10px] uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  Inedible Object
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200/60">
                <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full w-[15%]" />
              </div>
            </div>

            {/* MESSAGE */}
            <div className="bg-white border border-stone-200/80 rounded-2xl p-4 space-y-2 text-center shadow-3xs">
              <div className="text-3xl">🖊️</div>
              <h5 className="text-sm font-black text-orange-950">
                That looks like a {objectName}!
              </h5>
              <p className="text-xs font-medium text-stone-500 leading-relaxed">
                FitAI is strictly designed for tracking edible meals and beverages. Logging non-food items is disabled to protect your nutritional data integrity.
              </p>
            </div>

            {/* RECOVERY BUTTONS */}
            <div className="space-y-2 pt-2 border-t border-black/[0.04]">
              {onRetakePhoto && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRetakePhoto();
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all font-sans"
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
                  className="w-full py-3 bg-white hover:bg-stone-100 border border-stone-200/90 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all font-sans"
                >
                  <Search className="w-3.5 h-3.5 text-stone-500" />
                  <span>Search Food Library</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    );
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 font-sans select-none">
        {/* Dark Frosted Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/60 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FAF7F2] border border-orange-200/80 rounded-[32px] w-full max-w-md relative z-10 shadow-2xl p-5 space-y-4 text-left overflow-hidden font-sans"
        >
          {/* Header & Close */}
          <div className="flex justify-between items-center pb-2 border-b border-black/[0.04]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-orange-500" />
              </div>
              <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest font-sans">
                AI Clarification Required
              </h4>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white hover:bg-stone-100 text-stone-500 flex items-center justify-center transition-colors border border-stone-200/60 shadow-3xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* CONFIDENCE PROGRESS METER */}
          <div className="bg-white/90 border border-stone-200/80 rounded-2xl p-3.5 space-y-2 shadow-3xs">
            <div className="flex justify-between items-center text-xs font-bold font-sans">
              <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-orange-500" />
                AI Confidence Score
              </span>
              <span className={cn(
                "font-mono font-black text-xs px-2 py-0.5 rounded-full border",
                isLowConfidence
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-orange-50 text-orange-700 border-orange-200"
              )}>
                {confidenceScore}%
              </span>
            </div>

            {/* Meter Bar */}
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidenceScore}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full transition-all",
                  isLowConfidence
                    ? "bg-gradient-to-r from-amber-400 to-amber-500"
                    : "bg-gradient-to-r from-orange-400 to-orange-500"
                )}
              />
            </div>
            <p className="text-[10.5px] font-medium text-stone-500 leading-tight">
              Confidence is below 90%. Please confirm 1 detail to ensure 100% macro accuracy.
            </p>
          </div>

          {/* QUESTION BOX */}
          <div className="space-y-3">
            <h5 className="text-xs font-black text-orange-950 leading-snug flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <span>{clarificationData.question}</span>
            </h5>

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
                      "w-full p-3 rounded-2xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer active:scale-98 font-sans",
                      isSelected
                        ? "bg-orange-50/80 border-orange-500 text-orange-950 font-black shadow-3xs"
                        : "bg-white/80 border-stone-200/80 hover:bg-stone-50 text-stone-700 font-bold"
                    )}
                  >
                    <span className="flex items-center gap-2">
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

            {/* OPEN-ENDED CUSTOM TEXT INPUT */}
            <div className="space-y-1 pt-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block text-left">
                Or Type Custom Detail (Optional)
              </label>
              <input
                type="text"
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
                placeholder="e.g. Stuffed with paneer & extra spices..."
                className="w-full bg-white border border-stone-200/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-orange-950 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 shadow-3xs font-sans"
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="space-y-2 pt-2 border-t border-black/[0.04]">
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
              className="w-full py-2.5 bg-white/90 hover:bg-stone-100 border border-stone-300/80 text-stone-600 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all font-sans"
            >
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <span>Bypass & Log Anyway</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
