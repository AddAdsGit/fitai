import React from "react";
import { ChevronRight, BarChart2, Brain, Target, Bot } from "lucide-react";
import { motion } from "motion/react";

export const ProUpgradeModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[200] flex flex-col pointer-events-none">
    {/* Backdrop */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
    />

    {/* Modal Content */}
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute top-12 bottom-0 left-0 right-0 bg-[#FAF9F6] rounded-t-[40px] pointer-events-auto p-6 flex flex-col shadow-2xl overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[2rem] font-light tracking-tight text-[#1a1a1a] leading-none flex items-center gap-2">
          FitAI{" "}
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
            PRO
          </span>
        </h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center bg-black/5 rounded-full text-black/50 hover:bg-black/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-90" />
        </button>
      </div>

      <div className="flex-1 space-y-6 text-left">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[32px] p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <h3 className="text-2xl font-bold mb-2 relative z-10">
            Maximize Your Results
          </h3>
          <p className="text-orange-100 font-medium mb-6 relative z-10 text-sm">
            Unlock personalized coaching, data insights, and integrations.
          </p>
          <div className="flex items-end gap-1 relative z-10">
            <span className="text-4xl font-black">$9.99</span>
            <span className="text-orange-200 mb-1">/month</span>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] px-2">
            Pro Features
          </h4>
          <div className="space-y-3">
            {[
              {
                title: "Advanced Data Analysis",
                desc: "Unlock trends over 3 months and AI-powered correlations.",
                icon: <BarChart2 className="w-4 h-4" />,
              },
              {
                title: "Priority AI Responses",
                desc: "Get answers instantly with prioritized inference.",
                icon: <Brain className="w-4 h-4" />,
              },
              {
                title: "Smart Goal Tracking",
                desc: "AI automatically adjusts your targets based on progress.",
                icon: <Target className="w-4 h-4" />,
              },
              {
                title: "All Integrations",
                desc: "Connect with Telegram, ChatGPT, and Claude without limits.",
                icon: <Bot className="w-4 h-4" />,
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex gap-4 p-3 bg-white rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] items-center"
              >
                <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <div className="font-medium text-[#1a1a1a] mb-0.5">
                    {feature.title}
                  </div>
                  <div className="text-[11px] text-[#9e9e9e] leading-tight">
                    {feature.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 mt-auto pb-8">
        <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 rounded-[24px] shadow-lg shadow-orange-500/20 active:scale-95 transition-transform cursor-pointer">
          Start 7-Day Free Trial
        </button>
        <div className="text-center text-[10px] text-[#9e9e9e] mt-4 font-medium">
          Cancel anytime. Auto-renews after 7 days.
        </div>
      </div>
    </motion.div>
  </div>
);
