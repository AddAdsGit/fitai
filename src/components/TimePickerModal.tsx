import React, { useState, useEffect } from "react";
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative bg-white border border-stone-200/80 w-full max-w-xs rounded-3xl p-5 shadow-xl z-10 text-stone-850 text-left"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-5 select-none">
            <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>{title}</span>
            </h3>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center cursor-pointer border-none bg-transparent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Time Display and Direct-Typing Steppers */}
          <div className="bg-stone-50 border border-stone-200/60 rounded-2xl py-5 px-4 mb-4 flex flex-col items-center">
            <div className="flex items-center gap-3">
              {/* Hour Input + Stepper */}
              <div className="flex flex-col items-center">
                <StepperButton
                  onStep={incrementHours}
                  className="w-9 h-9 rounded-xl bg-white border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer border-none"
                  title="Next Hour (+1h)"
                >
                  <Plus className="w-4 h-4" />
                </StepperButton>
                <div className="my-1.5 relative">
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
                    className="w-16 text-center text-3xl font-black text-stone-900 bg-white border border-stone-200/80 rounded-xl py-1 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono shadow-3xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <StepperButton
                  onStep={decrementHours}
                  className="w-9 h-9 rounded-xl bg-white border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer border-none"
                  title="Previous Hour (-1h)"
                >
                  <Minus className="w-4 h-4" />
                </StepperButton>
              </div>

              {/* Separator */}
              <span className="text-3xl font-black text-stone-350 select-none pb-1 font-mono">:</span>

              {/* Minute Input + Stepper */}
              <div className="flex flex-col items-center">
                <StepperButton
                  onStep={incrementMinutes}
                  className="w-9 h-9 rounded-xl bg-white border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer border-none"
                  title="Forward 5 Minutes (+5m)"
                >
                  <Plus className="w-4 h-4" />
                </StepperButton>
                <div className="my-1.5 relative">
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
                    className="w-16 text-center text-3xl font-black text-stone-900 bg-white border border-stone-200/80 rounded-xl py-1 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono shadow-3xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <StepperButton
                  onStep={decrementMinutes}
                  className="w-9 h-9 rounded-xl bg-white border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer border-none"
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
              className="mt-4 bg-white hover:bg-stone-100 border border-stone-200/80 shadow-3xs rounded-full px-3 py-1 text-[11px] font-bold text-stone-600 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 select-none"
            >
              <RotateCcw className="w-3 h-3 text-stone-400" />
              <span>Reset to Now</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 select-none">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-2xl transition-all cursor-pointer border-none active:scale-98 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-2xl transition-all cursor-pointer border-none shadow-sm active:scale-98 text-xs"
            >
              Confirm Time
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
