import React from "react";
import { X, Target } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Profile } from "../types";

type GoalPopupType = "dailyCalories" | "weightGoal" | null;

export interface GoalConfigPopupProps {
  activeGoalConfigPopup: GoalPopupType;
  setActiveGoalConfigPopup: (type: GoalPopupType) => void;
  goalConfigValue: number;
  setGoalConfigValue: (value: number) => void;
  profileData: Profile;
  setProfileData: (data: Profile) => void;
  setToastMessage: (msg: string) => void;
}

export function GoalConfigPopup({
  activeGoalConfigPopup,
  setActiveGoalConfigPopup,
  goalConfigValue,
  setGoalConfigValue,
  profileData,
  setProfileData,
  setToastMessage,
}: GoalConfigPopupProps) {
  return (
    <AnimatePresence>
      {activeGoalConfigPopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/65 backdrop-blur-md z-[100] flex items-end justify-center font-sans"
        >
          {/* Slide up sheet panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-white rounded-t-[36px] w-full max-w-[448px] overflow-hidden flex flex-col shadow-2xl p-6 space-y-6"
          >
            {/* Header block with visual theme */}
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.04]">
              <div className="text-left">
                <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-1">
                  <Target className="w-4 h-4 text-orange-500" />
                  {activeGoalConfigPopup === "dailyCalories" ? "Calorie Target" : "Target Weight"}
                </h4>
                <p className="text-[10px] text-stone-500 font-bold">
                  Slide/tap adjustments with real-time visual indicator
                </p>
              </div>
              <button
                onClick={() => setActiveGoalConfigPopup(null)}
                className="w-8 h-8 rounded-full bg-stone-100/80 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slider panel content */}
            {activeGoalConfigPopup === "dailyCalories" ? (
              /* CALORIE SLIDER DIAL */
              <div className="space-y-6 text-center py-4">
                <div className="inline-block bg-orange-50 px-4 py-2.5 rounded-3xl border border-orange-100">
                  <div className="text-3xl font-black text-orange-600 font-mono">
                    {goalConfigValue.toLocaleString()} <span className="text-xs font-extrabold text-orange-950">kcal</span>
                  </div>
                  <span className="text-[8px] font-black text-orange-700/60 uppercase tracking-widest">
                    Estimated Daily Requirement
                  </span>
                </div>

                {/* Range Dial Slider */}
                <div className="px-4">
                  <input
                    type="range"
                    min={1200}
                    max={3500}
                    step={50}
                    value={goalConfigValue}
                    onChange={(e) => setGoalConfigValue(parseInt(e.target.value))}
                    className="w-full accent-orange-500 h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] font-bold text-stone-400 font-mono mt-1">
                    <span>1,200 kcal</span>
                    <span>2,000 kcal</span>
                    <span>3,500 kcal</span>
                  </div>
                </div>

                {/* Preset config shortcuts (Surplus, Maintenance, Deficit) */}
                <div className="space-y-2">
                  <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block">
                    Target Presets
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setGoalConfigValue(1600)}
                      className="p-2.5 bg-stone-100 hover:bg-orange-50 hover:text-orange-600 rounded-xl text-[9px] font-black uppercase tracking-wider text-stone-800 transition-all border border-transparent hover:border-orange-200/50 cursor-pointer"
                    >
                      🔥 Burning Burn <br /> (1600 cal)
                    </button>
                    <button
                      onClick={() => setGoalConfigValue(2000)}
                      className="p-2.5 bg-stone-100 hover:bg-orange-50 hover:text-orange-600 rounded-xl text-[9px] font-black uppercase tracking-wider text-stone-800 transition-all border border-transparent hover:border-orange-200/50 cursor-pointer"
                    >
                      🥗 Balance Lean <br /> (2000 cal)
                    </button>
                    <button
                      onClick={() => setGoalConfigValue(2600)}
                      className="p-2.5 bg-stone-100 hover:bg-orange-50 hover:text-orange-600 rounded-xl text-[9px] font-black uppercase tracking-wider text-stone-800 transition-all border border-transparent hover:border-orange-200/50 cursor-pointer"
                    >
                      💪 Muscle Build <br /> (2600 cal)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* WEIGHT ACCORDION SCALE SLIDER */
              <div className="space-y-6 text-center py-4">
                <div className="inline-block bg-blue-50 px-4 py-2.5 rounded-3xl border border-blue-100">
                  <div className="text-3xl font-black text-blue-600 font-mono">
                    {goalConfigValue} <span className="text-xs font-extrabold text-blue-950">kg</span>
                  </div>
                  <span className="text-[8px] font-black text-blue-700/60 uppercase tracking-widest">
                    Your Target Body Mass
                  </span>
                </div>

                {/* Weight slider scale */}
                <div className="px-4">
                  <input
                    type="range"
                    min={40}
                    max={120}
                    step={1}
                    value={goalConfigValue}
                    onChange={(e) => setGoalConfigValue(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] font-bold text-stone-400 font-mono mt-1">
                    <span>40 kg</span>
                    <span>80 kg</span>
                    <span>120 kg</span>
                  </div>
                </div>

                {/* Speed Dial discrete increments */}
                <div className="flex justify-center gap-3 items-center">
                  <button
                    onClick={() => setGoalConfigValue(Math.max(40, goalConfigValue - 1))}
                    className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 text-sm font-black transition-all flex items-center justify-center cursor-pointer"
                  >
                    -1
                  </button>
                  <span className="text-[9px] font-black text-blue-950">Fine Adjustment</span>
                  <button
                    onClick={() => setGoalConfigValue(Math.min(120, goalConfigValue + 1))}
                    className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 text-sm font-black transition-all flex items-center justify-center cursor-pointer"
                  >
                    +1
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons footer */}
            <button
              onClick={() => {
                if (activeGoalConfigPopup) {
                  setProfileData({
                    ...profileData,
                    daily_calories_goal: activeGoalConfigPopup === "dailyCalories" ? goalConfigValue : profileData.daily_calories_goal,
                    weight_goal: activeGoalConfigPopup === "weightGoal" ? goalConfigValue : profileData.weight_goal,
                    goals: {
                      ...((profileData as any).goals || {}),
                      [activeGoalConfigPopup]: goalConfigValue,
                    },
                  } as Profile);
                }
                setToastMessage(`Goal updated to ${goalConfigValue.toLocaleString()} successfully! ✨`);
                setActiveGoalConfigPopup(null);
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[11px] py-3 rounded-2xl font-black uppercase tracking-wider shadow-md shadow-orange-500/10 hover:shadow-orange-500/15 cursor-pointer text-center"
            >
              Apply goal configuration 🚀
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
