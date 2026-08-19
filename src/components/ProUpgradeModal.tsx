import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, BarChart2, Brain, Target, Bot, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const ProUpgradeModal = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

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

        {/* Modal Content */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-6 pb-[max(20px,env(safe-area-inset-bottom,20px))] flex flex-col gap-5 max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y relative z-10 text-left"
        >
          {/* Top Drag Handle */}
          <div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-1 shrink-0 select-none" />

          <div className="flex justify-between items-center select-none pb-1 border-b border-stone-200/60">
            <h2 className="text-xl font-black tracking-tight text-orange-950 flex items-center gap-1.5">
              <span>FitAI</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] uppercase font-black tracking-widest shadow-xs">
                PRO
              </span>
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 transition-colors border-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 text-left">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[28px] p-5 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-[9px] font-black uppercase tracking-wider mb-3">
                <Sparkles className="w-3 h-3" />
                <span>Next-Gen Fitness AI</span>
              </div>
              <h3 className="text-xl font-black mb-1 relative z-10">
                Maximize Your Results
              </h3>
              <p className="text-orange-100 font-medium mb-4 relative z-10 text-xs leading-relaxed">
                Unlock 1-on-1 AI coaching, advanced metabolic analytics, and recipe intelligence.
              </p>
              <div className="flex items-end gap-1 relative z-10">
                <span className="text-3xl font-black">$9.99</span>
                <span className="text-orange-100 mb-1 text-xs font-bold">/month</span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Included Features
              </span>
              <div className="space-y-2">
                {[
                  {
                    title: "Advanced Data Analysis",
                    desc: "Unlock trends over 3 months and AI-powered metabolic correlations.",
                    icon: <BarChart2 className="w-4 h-4 text-orange-500" />,
                  },
                  {
                    title: "Priority AI Responses",
                    desc: "Get meal analysis and coaching answers instantly with zero wait time.",
                    icon: <Brain className="w-4 h-4 text-orange-500" />,
                  },
                  {
                    title: "Smart Goal Tracking",
                    desc: "AI automatically adjusts your macro targets based on actual progress.",
                    icon: <Target className="w-4 h-4 text-orange-500" />,
                  },
                  {
                    title: "All Integrations",
                    desc: "Connect with Apple Health, Telegram, and wearables seamlessly.",
                    icon: <Bot className="w-4 h-4 text-orange-500" />,
                  },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="flex gap-3.5 p-3.5 bg-white border border-stone-200/80 rounded-2xl shadow-3xs items-center"
                  >
                    <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <div className="text-xs font-black text-orange-950 mb-0.5">
                        {feature.title}
                      </div>
                      <div className="text-[10px] text-stone-500 font-medium leading-tight">
                        {feature.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 mt-auto">
            <button
              disabled
              className="w-full bg-stone-200 text-stone-400 font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl cursor-not-allowed border-none"
            >
              Coming Soon
            </button>
            <div className="text-center text-[10px] text-stone-400 mt-2 font-semibold">
              Pro subscriptions are launching soon!
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
