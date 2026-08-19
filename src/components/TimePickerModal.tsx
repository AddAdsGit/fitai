import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Plus, Minus, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StepperButton } from "./StepperButton";

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTime: string; // "HH:MM" (24h format)
  onSave: (timeStr: string) => void;
  title?: string;
}

export const TimePickerModal = ({
  isOpen,
  onClose,
  initialTime,
  onSave,
  title = "Set Log Time",
}: TimePickerModalProps) => {
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    if (initialTime) {
      const parts = initialTime.split(":");
      const h = parseInt(parts[0] || "12", 10);
      const m = parseInt(parts[1] || "00", 10);
      if (!isNaN(h)) setHours(h);
      if (!isNaN(m)) setMinutes(m);
    } else {
      const now = new Date();
      setHours(now.getHours());
      setMinutes(now.getMinutes());
    }
  }, [initialTime, isOpen]);

  // Lock body scroll
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

  if (!isOpen) return null;

  const handleResetNow = () => {
    const now = new Date();
    setHours(now.getHours());
    setMinutes(now.getMinutes());
  };

  const incrementHours = () => {
    setHours((prev) => (prev + 1) % 24);
  };

  const decrementHours = () => {
    setHours((prev) => (prev - 1 + 24) % 24);
  };

  const incrementMinutes = () => {
    setMinutes((prev) => {
      const rounded = Math.floor(prev / 5) * 5;
      return (rounded + 5) % 60;
    });
  };

  const decrementMinutes = () => {
    setMinutes((prev) => {
      const rounded = Math.ceil(prev / 5) * 5;
      return (rounded - 5 + 60) % 60;
    });
  };

  const handleSave = () => {
    const formattedHours = String(Math.max(0, Math.min(23, hours))).padStart(2, "0");
    const formattedMinutes = String(Math.max(0, Math.min(59, minutes))).padStart(2, "0");
    onSave(`${formattedHours}:${formattedMinutes}`);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-end justify-center font-sans"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs cursor-pointer touch-none"
        />

        {/* Bottom Sheet Card */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="relative bg-[#FAF7F2] border-t border-x border-stone-200/80 w-full max-w-md rounded-t-[36px] p-6 pb-[max(20px,env(safe-area-inset-bottom,20px))] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-10 text-stone-850 text-left overscroll-contain touch-pan-y space-y-4"
        >
          {/* Top Drag Indicator Pill */}
          <div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-1 shrink-0 select-none" />

          {/* Header */}
          <div className="flex justify-between items-center select-none">
            <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>{title}</span>
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-stone-200/60 text-stone-400 hover:text-stone-700 flex items-center justify-center cursor-pointer border-none bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Time Display and Direct-Typing Steppers */}
          <div className="bg-white border border-stone-200/80 rounded-2xl py-5 px-4 flex flex-col items-center shadow-3xs">
            <div className="flex items-center gap-3">
              {/* Hour Input + Stepper */}
              <div className="flex flex-col items-center">
                <StepperButton
                  onStep={incrementHours}
                  className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer border-none"
                  title="Next Hour (+1h)"
                >
                  <Plus className="w-4 h-4" />
                </StepperButton>
                <div className="my-2 relative">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={String(hours).padStart(2, "0")}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setHours(Math.max(0, Math.min(23, val)));
                      } else if (e.target.value === "") {
                        setHours(0);
                      }
                    }}
                    className="w-18 text-center text-3xl font-black text-stone-900 bg-stone-50 border border-stone-200/80 rounded-xl py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono shadow-3xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <StepperButton
                  onStep={decrementHours}
                  className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer border-none"
                  title="Previous Hour (-1h)"
                >
                  <Minus className="w-4 h-4" />
                </StepperButton>
              </div>

              {/* Separator */}
              <span className="text-3xl font-black text-stone-300 select-none pb-1 font-mono">:</span>

              {/* Minute Input + Stepper */}
              <div className="flex flex-col items-center">
                <StepperButton
                  onStep={incrementMinutes}
                  className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer border-none"
                  title="Forward 5 Minutes (+5m)"
                >
                  <Plus className="w-4 h-4" />
                </StepperButton>
                <div className="my-2 relative">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={String(minutes).padStart(2, "0")}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setMinutes(Math.max(0, Math.min(59, val)));
                      } else if (e.target.value === "") {
                        setMinutes(0);
                      }
                    }}
                    className="w-18 text-center text-3xl font-black text-stone-900 bg-stone-50 border border-stone-200/80 rounded-xl py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono shadow-3xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <StepperButton
                  onStep={decrementMinutes}
                  className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer border-none"
                  title="Back 5 Minutes (-5m)"
                >
                  <Minus className="w-4 h-4" />
                </StepperButton>
              </div>
            </div>

            {/* Reset to Current Time pill */}
            <button
              type="button"
              onClick={handleResetNow}
              className="mt-4 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 shadow-3xs rounded-full px-3.5 py-1.5 text-[11px] font-black text-stone-600 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 select-none"
            >
              <RotateCcw className="w-3 h-3 text-stone-400" />
              <span>Reset to Current Time</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 select-none pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-12 bg-stone-200/80 hover:bg-stone-300 text-stone-700 font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer border-none active:scale-98 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-12 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer border-none shadow-md shadow-orange-500/20 active:scale-98 text-xs"
            >
              Confirm Time
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
