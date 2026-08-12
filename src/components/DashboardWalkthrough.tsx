import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Flame, Bot, ArrowRight, Check, Sparkles, X } from "lucide-react";

interface DashboardWalkthroughProps {
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: Camera,
    iconBg: "bg-orange-500",
    title: "Snap a Photo or Type What You Ate 📸",
    subtitle: "AI Meal Logging Engine",
    description: "Simply snap a photo of your plate or type a meal (e.g., '2 eggs and avocado toast'). FitAI's vision AI automatically calculates calories, protein, carbs, fats, and fiber in seconds!",
  },
  {
    icon: Flame,
    iconBg: "bg-amber-500",
    title: "Real-Time Calorie & Macro Progress",
    subtitle: "Daily Target Rings",
    description: "Monitor your remaining daily calories and tracked nutrients at a glance. All 4 macros (Protein, Carbs, Fats, Fiber) update dynamically as you log throughout the day.",
  },
  {
    icon: Bot,
    iconBg: "bg-emerald-500",
    title: "Log Vitals & Chat with AI Coach",
    subtitle: "Complete Health Tracking",
    description: "Log water intake, weight, energy levels, and gut health. Have questions or need recipe ideas? Chat directly with your 24/7 AI fitness coach anytime!",
  },
];

export const DashboardWalkthrough = ({ onDismiss }: DashboardWalkthroughProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onDismiss();
    }
  };

  const currentStep = STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-orange-950/40 backdrop-blur-md animate-fadeIn">
        <motion.div
          key={currentStepIndex}
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white/95 backdrop-blur-2xl rounded-[32px] p-6 max-w-sm w-full border border-white shadow-2xl shadow-orange-950/20 text-orange-950 space-y-5 relative overflow-hidden"
        >
          {/* Top Skip Button */}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-900/60 hover:text-orange-950 flex items-center justify-center border-none cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Icon & Step Badge */}
          <div className="flex flex-col items-center text-center space-y-2 pt-2">
            <div className={`w-14 h-14 rounded-2xl ${currentStep.iconBg} shadow-lg flex items-center justify-center text-white`}>
              <StepIcon className="w-7 h-7" />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/60 border border-orange-200/50">
              <Sparkles className="w-3 h-3 text-orange-600" />
              <span className="text-[10px] font-black text-orange-950/70 uppercase tracking-widest font-mono">
                Feature Spotlight {currentStepIndex + 1} of {STEPS.length}
              </span>
            </div>

            <h3 className="text-xl font-black text-orange-950 tracking-tight leading-snug">
              {currentStep.title}
            </h3>
          </div>

          {/* Card Body */}
          <div className="bg-orange-50/40 rounded-2xl p-4 border border-orange-100/60 text-xs font-bold text-orange-900/70 leading-relaxed text-center">
            {currentStep.description}
          </div>

          {/* Step Dots & Next CTA */}
          <div className="space-y-3 pt-1">
            <div className="flex justify-center gap-1.5">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex ? "w-6 bg-orange-500" : "w-2 bg-orange-200"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-2xl shadow-lg shadow-orange-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              <span>{currentStepIndex === STEPS.length - 1 ? "Got It! Let's Go 🚀" : "Next Feature"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
