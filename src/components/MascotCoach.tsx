import React from "react";
import { Flame } from "lucide-react";

interface MascotCoachProps {
  totalCalories: number;
  dailyGoal: number;
  mealsState: any[];
  username: string;
}

export const MascotCoach: React.FC<MascotCoachProps> = ({
  totalCalories,
  dailyGoal,
  mealsState,
  username,
}) => {
  const nameHandle = username || "pro";

  // Calculate real consecutive days streak
  const getStreak = (): number => {
    if (!mealsState || mealsState.length === 0) return 0;
    
    // Get unique sorted dates of logged meals
    const uniqueDates = Array.from(new Set(mealsState.map((m) => m.date))).sort();
    
    let streak = 0;
    const checkDate = new Date();
    
    // Check backwards from today
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (uniqueDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If checkDate is today and has no meals, check if yesterday had meals to preserve streak
        if (streak === 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];
          if (uniqueDates.includes(yesterdayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }
    return streak;
  };

  const streak = getStreak();

  // Determine state
  let state: "hungry" | "happy" | "full" = "happy";
  let speech = "";

  if (totalCalories === 0) {
    state = "hungry";
    speech = `Waiting for fuel... What did we eat today, @${nameHandle}? 🍽️`;
  } else if (totalCalories > dailyGoal) {
    state = "full";
    speech = `Oof, logged past target today! Let's focus on lean protein and clean steps now. You got this, @${nameHandle}! 💪`;
  } else {
    state = "happy";
    if (streak > 1) {
      speech = `${streak}-day streak! You are on fire today, @${nameHandle}! 🔥 Keep logging!`;
    } else {
      speech = `Great start, @${nameHandle}! Logged ${totalCalories} kcal and looking sharp. Let's finish strong! 🥗`;
    }
  }

  // Animated Mascot SVG
  return (
    <div className="bg-white/60 backdrop-blur-md rounded-[28px] border border-white/80 p-4 shadow-xl shadow-orange-100/10 flex items-center gap-4 relative overflow-hidden select-none">
      {/* Mascot Graphic Container */}
      <div className="w-16 h-16 shrink-0 relative flex items-center justify-center bg-gradient-to-br from-orange-100/50 to-orange-200/20 rounded-2xl border border-orange-100/40 shadow-inner group">
        
        {/* Animated Mascot SVG */}
        <svg
          viewBox="0 0 100 100"
          className="w-12 h-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
        >
          {/* Defining animations */}
          <style>{`
            @keyframes bob {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
            @keyframes wings {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(8deg); }
            }
            .mascot-body {
              animation: bob 3s ease-in-out infinite;
              transform-origin: center bottom;
            }
            .mascot-wing-l {
              animation: wings 3s ease-in-out infinite;
              transform-origin: 25px 50px;
            }
            .mascot-wing-r {
              animation: wings 3s ease-in-out infinite reverse;
              transform-origin: 75px 50px;
            }
          `}</style>

          {/* Grouping for Bobbing Animation */}
          <g className="mascot-body">
            {/* Feathers/Hair tuft */}
            <path d="M45,15 Q50,5 55,15 Q50,18 45,15 Z" fill="#F97316" />
            <path d="M40,18 Q50,8 48,18 Z" fill="#EA580C" />

            {/* Base Body - Minimalist Cute Round Owl/Chick shape */}
            <circle cx="50" cy="55" r="32" fill="#F97316" /> {/* Main Orange */}
            <circle cx="50" cy="58" r="24" fill="#FFF7ED" /> {/* Belly Cream */}

            {/* Wings */}
            {/* Left Wing */}
            <path
              d="M18,50 C12,50 14,65 24,60 C26,55 24,50 18,50 Z"
              fill="#EA580C"
              className="mascot-wing-l"
            />
            {/* Right Wing */}
            <path
              d="M82,50 C88,50 86,65 76,60 C74,55 76,50 82,50 Z"
              fill="#EA580C"
              className="mascot-wing-r"
            />

            {/* Feet */}
            <circle cx="40" cy="85" r="5" fill="#EAB308" />
            <circle cx="60" cy="85" r="5" fill="#EAB308" />

            {/* Dynamic Facial Features based on State */}
            {state === "hungry" && (
              <>
                {/* Hungry: Big wide eyes */}
                <circle cx="38" cy="46" r="9" fill="#FFFFFF" />
                <circle cx="38" cy="46" r="4.5" fill="#1C1917" />
                <circle cx="36" cy="44" r="1.5" fill="#FFFFFF" />

                <circle cx="62" cy="46" r="9" fill="#FFFFFF" />
                <circle cx="62" cy="46" r="4.5" fill="#1C1917" />
                <circle cx="60" cy="44" r="1.5" fill="#FFFFFF" />

                {/* Beak */}
                <path d="M46,52 L54,52 L50,60 Z" fill="#EAB308" />
              </>
            )}

            {state === "happy" && (
              <>
                {/* Happy: Curved smiling eyes */}
                <path
                  d="M30,48 Q38,40 46,48"
                  stroke="#1C1917"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="transparent"
                />
                <path
                  d="M54,48 Q62,40 70,48"
                  stroke="#1C1917"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="transparent"
                />

                {/* Beak */}
                <path d="M46,50 L54,50 L50,56 Z" fill="#EAB308" />
                
                {/* Rosy cheeks */}
                <circle cx="26" cy="56" r="4.5" fill="#FECDD3" opacity="0.8" />
                <circle cx="74" cy="56" r="4.5" fill="#FECDD3" opacity="0.8" />

                {/* Athletic Sweatband */}
                <rect x="28" y="24" width="44" height="7" rx="3.5" fill="#3B82F6" />
                <rect x="42" y="24" width="16" height="7" fill="#FFFFFF" />
              </>
            )}

            {state === "full" && (
              <>
                {/* Full: Drowsy/closed curved eyes */}
                <path
                  d="M30,44 Q38,52 46,44"
                  stroke="#1C1917"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  fill="transparent"
                />
                <path
                  d="M54,44 Q62,52 70,44"
                  stroke="#1C1917"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  fill="transparent"
                />

                {/* Sweating drop */}
                <path d="M78,34 Q82,38 78,42 Q74,38 78,34 Z" fill="#38BDF8" />

                {/* Beak */}
                <path d="M46,48 L54,48 L50,53 Z" fill="#EAB308" />
              </>
            )}
          </g>
        </svg>

        {/* Small badge overlay showing streak if > 0 */}
        {streak > 0 && (
          <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-1 shadow-md flex items-center justify-center gap-0.5">
            <Flame className="w-2.5 h-2.5 fill-white text-orange-500" />
            <span className="text-[7.5px] font-black leading-none">{streak}</span>
          </div>
        )}
      </div>

      {/* Speech bubble */}
      <div className="text-left flex-1 min-w-0">
        <div className="text-[8.5px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
          <span>Ollie Coach</span>
          {streak > 0 && (
            <span className="bg-orange-100 text-orange-700 font-extrabold px-1.5 py-0.5 rounded-md text-[7px] uppercase tracking-normal normal-case">
              🔥 {streak}d streak
            </span>
          )}
        </div>
        <p className="text-[11.5px] font-bold text-stone-700 leading-snug mt-1 select-none whitespace-normal">
          {speech}
        </p>
      </div>
    </div>
  );
};
