import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Scale, Droplet, Zap, Heart, Check, Plus, Minus, Clock, Activity, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import type { Profile, DailyWellness, WeightLog, BloatingLogItem } from "../types";
import { BristolStoolIcon, GutIcon, BloatingIcon, BloatingStomachIcon } from "./BristolStoolIcons";
import { UniversalVitalLogCard } from "./UniversalVitalLogCard";
import { TimePickerModal } from "./TimePickerModal";

export interface VitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: Profile;
  selectedDate: string;
  todayStr: string;
  dailyNotes: DailyWellness[];
  weightLogs: WeightLog[];
  handleLogWeight: (weight: number, date: string, time?: string) => Promise<void>;
  handleDeleteWeight: (id: string) => Promise<void>;
  handleLogWater: (amount: number, date: string, time?: string) => Promise<void>;
  handleDeleteWaterLogItem: (itemId: string, date: string) => Promise<void>;
  handleLogDigestion: (type: number | null, notes: string | null, date: string, time?: string) => Promise<void>;
  handleDeleteStoolLogItem: (itemId: string, date: string) => Promise<void>;
  handleLogEnergy: (level: number | null, date: string, time?: string) => Promise<void>;
  handleDeleteEnergyLogItem: (itemId: string, date: string) => Promise<void>;
  handleLogBloating: (level: number | null, date: string, time?: string) => Promise<void>;
  handleDeleteBloatingLogItem: (itemId: string, date: string) => Promise<void>;
}

export const VitalsModal: React.FC<VitalsModalProps> = ({
  isOpen,
  onClose,
  profileData,
  selectedDate,
  dailyNotes,
  weightLogs,
  handleLogWeight,
  handleDeleteWeight,
  handleLogWater,
  handleDeleteWaterLogItem,
  handleLogDigestion,
  handleDeleteStoolLogItem,
  handleLogEnergy,
  handleDeleteEnergyLogItem,
  handleLogBloating,
  handleDeleteBloatingLogItem,
}) => {
  const wellnessToday = dailyNotes.find((n) => n.date === selectedDate);
  const weightTodayLog = weightLogs.find((l) => l.date === selectedDate);

  const getNowTimeStr = () => new Date().toTimeString().slice(0, 5);

  // --- Editable Log Time States ---
  const [weightTime, setWeightTime] = useState<string>(getNowTimeStr());
  const [waterTime, setWaterTime] = useState<string>(getNowTimeStr());
  const [stoolTime, setStoolTime] = useState<string>(getNowTimeStr());
  const [energyTime, setEnergyTime] = useState<string>(getNowTimeStr());
  const [bloatingTime, setBloatingTime] = useState<string>(getNowTimeStr());

  // --- Sleek Custom Time Picker Modal State ---
  const [isTimePickerOpen, setIsTimePickerOpen] = useState<boolean>(false);
  const [timePickerTarget, setTimePickerTarget] = useState<"weight" | "water" | "digestion" | "energy" | "bloating" | null>(null);

  // Resolve most recent weight from log history
  const latestWeightFromHistory = React.useMemo(() => {
    if (weightLogs && weightLogs.length > 0) {
      const sorted = [...weightLogs].sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0].weight;
    }
    return profileData?.weight || 70.0;
  }, [weightLogs, profileData?.weight]);

  // --- Draft Values ---
  const [draftWeight, setDraftWeight] = useState<string>(
    weightTodayLog?.weight?.toString() || latestWeightFromHistory.toString()
  );

  const currentWater = wellnessToday?.water_intake || 0;
  const [draftWater, setDraftWater] = useState<number>(250);

  const currentStool = wellnessToday?.digestion_quality ?? 4;
  const [draftStoolType, setDraftStoolType] = useState<number | null>(null);

  const currentEnergy = wellnessToday?.energy_level ?? 3;
  const [draftEnergyLevel, setDraftEnergyLevel] = useState<number | null>(null);

  const currentBloating = wellnessToday?.bloating_level ?? 1;
  const [draftBloatingLevel, setDraftBloatingLevel] = useState<number | null>(null);

  // --- Animation & Expandable Drawer States ---
  const [isWaterStepping, setIsWaterStepping] = useState(false);
  const [isStoolSliding, setIsStoolSliding] = useState(false);
  const [isEnergySliding, setIsEnergySliding] = useState(false);
  const [isBloatingSliding, setIsBloatingSliding] = useState(false);
  const [showLogHistory, setShowLogHistory] = useState(false);

  // Sync draft states whenever dailyNotes, weightLogs, or selectedDate updates
  React.useEffect(() => {
    setDraftWeight(weightTodayLog?.weight?.toString() || latestWeightFromHistory.toString());
    setDraftWater(250);
    setDraftStoolType(null);
    setDraftEnergyLevel(null);
    setDraftBloatingLevel(null);
  }, [dailyNotes, weightLogs, selectedDate, latestWeightFromHistory]);

  if (!isOpen) return null;

  const isWeightActive = profileData?.agent_config?.trackWeight ?? true;
  const isWaterActive = profileData?.agent_config?.trackWater ?? false;
  const isDigestionActive = profileData?.agent_config?.trackDigestion ?? false;
  const isEnergyActive = profileData?.agent_config?.trackEnergy ?? false;
  const isBloatingActive = profileData?.agent_config?.trackBloating ?? true;
  const hasAnyActiveVitals = isWeightActive || isWaterActive || isDigestionActive || isEnergyActive || isBloatingActive;

  const activeStoolVal = draftStoolType !== null ? draftStoolType : currentStool;
  const activeEnergyVal = draftEnergyLevel !== null ? draftEnergyLevel : currentEnergy;
  const activeBloatingVal = draftBloatingLevel !== null ? draftBloatingLevel : currentBloating;

  const triggerWaterStepping = () => {
    setIsWaterStepping(true);
    setTimeout(() => setIsWaterStepping(false), 2500);
  };

  const getStoolDescription = (type: number) => {
    if (type === 1) return "Bristol Stool Type 1: Separate hard lumps, like nuts (hard to pass)";
    if (type === 2) return "Bristol Stool Type 2: Sausage-shaped, but lumpy";
    if (type === 3) return "Bristol Stool Type 3: Like a sausage, with cracks on surface";
    if (type === 4) return "Bristol Stool Type 4: Like a sausage or snake, smooth & soft (Optimal)";
    if (type === 5) return "Bristol Stool Type 5: Soft blobs with clear-cut edges";
    if (type === 6) return "Bristol Stool Type 6: Fluffy pieces with ragged edges, mushy stool";
    return "Bristol Stool Type 7: Watery, no solid pieces (entirely liquid)";
  };

  const getEnergyLevelDescription = (level: number) => {
    if (level === 1) return "Level 1: Exhausted / Very low energy";
    if (level === 2) return "Level 2: Low energy / Sluggish";
    if (level === 3) return "Level 3: Moderate / Balanced energy";
    if (level === 4) return "Level 4: High energy / Active";
    return "Level 5: Peak energy / Unstoppable";
  };

  const getBloatingDescription = (level: number) => {
    if (level === 1) return "Level 1: Normal & comfortable — Zero bloating 🍃";
    if (level === 2) return "Level 2: Mild tightness / Slight fullness after food 🟡";
    if (level === 3) return "Level 3: Moderate bloating & noticeable belly pressure 🟠";
    return "Level 4: Severe swelling, tight balloon distension 🔴";
  };

  const getActiveTargetInitialTime = () => {
    if (timePickerTarget === "weight") return weightTime;
    if (timePickerTarget === "water") return waterTime;
    if (timePickerTarget === "digestion") return stoolTime;
    if (timePickerTarget === "energy") return energyTime;
    if (timePickerTarget === "bloating") return bloatingTime;
    return getNowTimeStr();
  };

  const handleTimePickerSave = (newTimeStr: string) => {
    if (timePickerTarget === "weight") setWeightTime(newTimeStr);
    else if (timePickerTarget === "water") setWaterTime(newTimeStr);
    else if (timePickerTarget === "digestion") setStoolTime(newTimeStr);
    else if (timePickerTarget === "energy") setEnergyTime(newTimeStr);
    else if (timePickerTarget === "bloating") setBloatingTime(newTimeStr);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center font-sans">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 cursor-pointer backdrop-blur-xs"
          />

          {/* Modal Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 240 }}
            className="relative w-full max-w-[448px] bg-stone-50 rounded-t-[36px] overflow-hidden flex flex-col max-h-[85vh] shadow-2xl z-10 border-t border-white/20 text-left font-sans"
          >
            {/* Header */}
            <div className="p-5 pb-3 bg-white border-b border-stone-100 flex justify-between items-center shrink-0 select-none">
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <Heart className="w-4.5 h-4.5 text-orange-500 fill-orange-500" />
                  <span>Daily Vitals</span>
                </h3>
                <p className="text-[10px] text-stone-400 font-semibold mt-0.5">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer transition-colors border-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left">

              {!hasAnyActiveVitals && (
                <div className="py-8 px-4 text-center select-none bg-white border border-stone-200/80 rounded-3xl space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto shadow-3xs">
                    <Heart className="w-6 h-6 fill-orange-500" />
                  </div>
                  <h4 className="text-sm font-black text-stone-900">All Vitals Disabled</h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto font-medium leading-relaxed">
                    You have turned off all vital trackers. You can enable them anytime in <strong className="text-stone-800">Profile ➔ Edit Profile</strong>.
                  </p>
                </div>
              )}

              {/* 1. WEIGHT LOG */}
              {isWeightActive && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center select-none">
                    <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-stone-400" />
                      <span>Weight Log</span>
                    </h3>
                  </div>

                  {weightTodayLog ? (
                    <UniversalVitalLogCard
                      type="weight"
                      valueText={`${weightTodayLog.weight} kg`}
                      logTime={weightTodayLog.log_time}
                      onDelete={async () => {
                        if (weightTodayLog.id) {
                          await handleDeleteWeight(weightTodayLog.id);
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2.5 w-full">
                        {/* Gourmet Sleek Time Pill */}
                        <button
                          type="button"
                          onClick={() => {
                            setTimePickerTarget("weight");
                            setIsTimePickerOpen(true);
                          }}
                          className="h-12 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-2xl px-3 text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 select-none active:scale-95"
                        >
                          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="font-mono">{weightTime}</span>
                        </button>

                        {/* Stepper + Direct Typing Input */}
                        <div className="flex-1 flex items-center bg-white border border-stone-200/80 rounded-2xl px-2 py-1 shadow-3xs">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = parseFloat(draftWeight) || 70;
                              setDraftWeight(Math.max(10, cur - 0.5).toFixed(1));
                            }}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-750 hover:bg-stone-50 cursor-pointer border-none bg-transparent active:scale-95 transition-all"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-stone-750">
                            <input
                              type="number"
                              step="0.1"
                              value={draftWeight}
                              onChange={(e) => setDraftWeight(e.target.value)}
                              className="w-16 text-center text-sm font-black text-stone-950 bg-transparent border-none focus:outline-none font-mono"
                            />
                            <span className="text-stone-400">kg</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = parseFloat(draftWeight) || 70;
                              setDraftWeight((cur + 0.5).toFixed(1));
                            }}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-750 hover:bg-stone-50 cursor-pointer border-none bg-transparent active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Save Button */}
                        <button
                          onClick={async () => {
                            const val = parseFloat(draftWeight);
                            if (!isNaN(val) && val > 0) {
                              await handleLogWeight(val, selectedDate, weightTime);
                            }
                          }}
                          className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border-none shadow-sm active:scale-95"
                          title="Log Weight"
                        >
                          <Check className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. WATER LOG */}
              {isWaterActive && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center select-none">
                    <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                      <Droplet className="w-3.5 h-3.5 text-stone-400" />
                      <span>Water Log</span>
                    </h3>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2.5 w-full">
                      {/* Gourmet Sleek Time Pill */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimePickerTarget("water");
                          setIsTimePickerOpen(true);
                        }}
                        className="h-12 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-2xl px-3 text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 select-none active:scale-95"
                      >
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-mono">{waterTime}</span>
                      </button>

                      {/* Stepper + Direct Typing Input */}
                      <div className="flex-1 flex items-center bg-white border border-stone-200/80 rounded-2xl px-1 py-1 shadow-3xs select-none">
                        <button
                          type="button"
                          onClick={() => {
                            setDraftWater(Math.max(50, draftWater - 50));
                            triggerWaterStepping();
                          }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-750 hover:bg-stone-50 cursor-pointer border-none bg-transparent active:scale-95 transition-all"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-stone-750 font-mono">
                          <span className="text-xs text-stone-400 font-normal">Add</span>
                          <input
                            type="number"
                            step="50"
                            min="10"
                            max="3000"
                            value={draftWater}
                            onChange={(e) => setDraftWater(parseInt(e.target.value, 10) || 0)}
                            className="w-16 text-center text-sm font-black text-stone-800 bg-transparent border-none focus:outline-none font-mono"
                          />
                          <span className="text-stone-400">ml</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftWater(Math.min(3000, draftWater + 50));
                            triggerWaterStepping();
                          }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-750 hover:bg-stone-50 cursor-pointer border-none bg-transparent active:scale-95 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={async () => {
                          const amountToAdd = draftWater > 0 ? draftWater : 250;
                          await handleLogWater(amountToAdd, selectedDate, waterTime);
                          setDraftWater(250);
                          if (typeof navigator !== "undefined" && navigator.vibrate) {
                            navigator.vibrate(12);
                          }
                        }}
                        className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border-none shadow-sm active:scale-95"
                        title="Add Water Drink"
                      >
                        <Check className="w-5 h-5 text-white" />
                      </button>
                    </div>

                    {/* Dynamic Hydration Description (Only when interacting) */}
                    {isWaterStepping && (
                      <div className="px-1 text-left animate-fade-in">
                        <span className="text-[11px] font-medium text-stone-500">
                          {(() => {
                            const nextTotal = currentWater + draftWater;
                            return `Will add +${draftWater} ml → Total logged today: ${nextTotal} ml 💧`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. DIGESTION LOG */}
              {isDigestionActive && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center select-none">
                    <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                      <GutIcon className="w-3.5 h-3.5 text-stone-400" />
                      <span>Digestion Log</span>
                    </h3>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2.5 w-full">
                      {/* Gourmet Sleek Time Pill */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimePickerTarget("digestion");
                          setIsTimePickerOpen(true);
                        }}
                        className="h-12 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-2xl px-3 text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 select-none active:scale-95"
                      >
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-mono">{stoolTime}</span>
                      </button>

                      {/* Slider */}
                      <div className="flex-1 flex flex-col justify-center bg-white border border-stone-200/80 rounded-2xl px-3 py-3 shadow-3xs">
                        <input
                          type="range"
                          min="1"
                          max="7"
                          value={activeStoolVal}
                          onChange={(e) => setDraftStoolType(parseInt(e.target.value, 10))}
                          onMouseDown={() => setIsStoolSliding(true)}
                          onTouchStart={() => setIsStoolSliding(true)}
                          onMouseUp={() => setTimeout(() => setIsStoolSliding(false), 200)}
                          onTouchEnd={() => setTimeout(() => setIsStoolSliding(false), 200)}
                          className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>

                      {/* 3D Action Box */}
                      <div className="w-12 h-12 [perspective:1000px] shrink-0">
                        <div
                          className={cn(
                            "w-full h-full [transform-style:preserve-3d] transition-transform duration-500 relative",
                            isStoolSliding ? "[transform:rotateY(180deg)]" : ""
                          )}
                        >
                          {/* FRONT: Log Button */}
                          <button
                            onClick={async () => {
                              await handleLogDigestion(activeStoolVal, null, selectedDate, stoolTime);
                              setDraftStoolType(null);
                            }}
                            className="absolute inset-0 [backface-visibility:hidden] bg-[#F97316] hover:bg-orange-600 rounded-2xl flex items-center justify-center shadow-xs border-none cursor-pointer active:scale-95 transition-all"
                            title="Log Digestion"
                          >
                            <Check className="w-5 h-5 text-white" />
                          </button>

                          {/* BACK: Stool SVG */}
                          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-stone-50 border border-stone-200/80 rounded-2xl flex items-center justify-center shadow-2xs">
                            <BristolStoolIcon type={activeStoolVal} className="w-7 h-7" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic description matching dashboard exactly */}
                    {isStoolSliding && (
                      <div className="px-1 text-left animate-fade-in">
                        <span className="text-[11px] font-medium text-stone-500">
                          {getStoolDescription(activeStoolVal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. ENERGY LOG */}
              {isEnergyActive && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center select-none">
                    <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-stone-400" />
                      <span>Energy Log</span>
                    </h3>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2.5 w-full">
                      {/* Gourmet Sleek Time Pill */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimePickerTarget("energy");
                          setIsTimePickerOpen(true);
                        }}
                        className="h-12 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-2xl px-3 text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 select-none active:scale-95"
                      >
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-mono">{energyTime}</span>
                      </button>

                      {/* Slider */}
                      <div className="flex-1 flex flex-col justify-center bg-white border border-stone-200/80 rounded-2xl px-3 py-3 shadow-3xs">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={activeEnergyVal}
                          onChange={(e) => setDraftEnergyLevel(parseInt(e.target.value, 10))}
                          onMouseDown={() => setIsEnergySliding(true)}
                          onTouchStart={() => setIsEnergySliding(true)}
                          onMouseUp={() => setTimeout(() => setIsEnergySliding(false), 200)}
                          onTouchEnd={() => setTimeout(() => setIsEnergySliding(false), 200)}
                          className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>

                      {/* 3D Action Box */}
                      <div className="w-12 h-12 [perspective:1000px] shrink-0">
                        <div
                          className={cn(
                            "w-full h-full [transform-style:preserve-3d] transition-transform duration-500 relative",
                            isEnergySliding ? "[transform:rotateY(180deg)]" : ""
                          )}
                        >
                          {/* FRONT: Log Button */}
                          <button
                            onClick={async () => {
                              await handleLogEnergy(activeEnergyVal, selectedDate, energyTime);
                              setDraftEnergyLevel(null);
                            }}
                            className="absolute inset-0 [backface-visibility:hidden] bg-[#F97316] hover:bg-orange-600 rounded-2xl flex items-center justify-center shadow-xs border-none cursor-pointer active:scale-95 transition-all"
                            title="Log Energy"
                          >
                            <Check className="w-5 h-5 text-white" />
                          </button>

                          {/* BACK: Energy Emoji Badge matching dashboard 1-to-1 */}
                          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-stone-50 border border-stone-200/80 rounded-2xl flex items-center justify-center shadow-2xs text-lg select-none">
                            {(() => {
                              if (activeEnergyVal === 1) return "😴";
                              if (activeEnergyVal === 2) return "🥱";
                              if (activeEnergyVal === 3) return "⚡";
                              if (activeEnergyVal === 4) return "🔥";
                              return "🚀";
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic description matching dashboard exactly */}
                    {isEnergySliding && (
                      <div className="px-1 text-left animate-fade-in">
                        <span className="text-[11px] font-medium text-stone-500">
                          {getEnergyLevelDescription(activeEnergyVal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. BLOATING LOG */}
              {isBloatingActive && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center select-none">
                    <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                      <BloatingIcon className="w-3.5 h-3.5 text-stone-400" />
                      <span>Bloating Log</span>
                    </h3>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2.5 w-full">
                      {/* Gourmet Sleek Time Pill */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimePickerTarget("bloating");
                          setIsTimePickerOpen(true);
                        }}
                        className="h-12 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-2xl px-3 text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 select-none active:scale-95"
                      >
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-mono">{bloatingTime}</span>
                      </button>

                      {/* Slider */}
                      <div className="flex-1 flex flex-col justify-center bg-white border border-stone-200/80 rounded-2xl px-3 py-3 shadow-3xs">
                        <input
                          type="range"
                          min="1"
                          max="4"
                          value={activeBloatingVal}
                          onChange={(e) => setDraftBloatingLevel(parseInt(e.target.value, 10))}
                          onMouseDown={() => setIsBloatingSliding(true)}
                          onTouchStart={() => setIsBloatingSliding(true)}
                          onMouseUp={() => setTimeout(() => setIsBloatingSliding(false), 200)}
                          onTouchEnd={() => setTimeout(() => setIsBloatingSliding(false), 200)}
                          className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>

                      {/* 3D Action Box */}
                      <div className="w-12 h-12 [perspective:1000px] shrink-0">
                        <div
                          className={cn(
                            "w-full h-full [transform-style:preserve-3d] transition-transform duration-500 relative",
                            isBloatingSliding ? "[transform:rotateY(180deg)]" : ""
                          )}
                        >
                          {/* FRONT: Log Button */}
                          <button
                            onClick={async () => {
                              await handleLogBloating(activeBloatingVal, selectedDate, bloatingTime);
                              setDraftBloatingLevel(null);
                            }}
                            className="absolute inset-0 [backface-visibility:hidden] bg-[#F97316] hover:bg-orange-600 rounded-2xl flex items-center justify-center shadow-xs border-none cursor-pointer active:scale-95 transition-all"
                            title="Log Bloating"
                          >
                            <Check className="w-5 h-5 text-white" />
                          </button>

                          {/* BACK: Bloating Stomach Swelling Icon */}
                          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-stone-50 border border-stone-200/80 rounded-2xl flex items-center justify-center shadow-2xs">
                            <BloatingStomachIcon level={activeBloatingVal} className="w-7 h-7" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic description */}
                    {isBloatingSliding && (
                      <div className="px-1 text-left animate-fade-in">
                        <span className="text-[11px] font-medium text-stone-500">
                          {getBloatingDescription(activeBloatingVal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Minimalist Dashboard-Style Log Timeline Cards */}
              {(() => {
                const weightCount = (isWeightActive || weightTodayLog) && weightTodayLog ? 1 : 0;
                const waterCount = (isWaterActive || (wellnessToday?.water_logs?.length || 0) > 0) ? (wellnessToday?.water_logs?.length || (wellnessToday?.water_intake ? 1 : 0)) : 0;
                const stoolCount = (isDigestionActive || (wellnessToday?.stool_logs?.length || 0) > 0) ? (wellnessToday?.stool_logs?.length || (wellnessToday?.digestion_quality ? 1 : 0)) : 0;
                const energyCount = (isEnergyActive || (wellnessToday?.energy_logs?.length || 0) > 0) ? (wellnessToday?.energy_logs?.length || (wellnessToday?.energy_level ? 1 : 0)) : 0;
                const bloatingCount = (isBloatingActive || (wellnessToday?.bloating_logs?.length || 0) > 0) ? (wellnessToday?.bloating_logs?.length || (wellnessToday?.bloating_level ? 1 : 0)) : 0;
                const totalLogsCount = weightCount + waterCount + stoolCount + energyCount + bloatingCount;

                return (
                  <div className="pt-2 pb-1 select-none border-t border-stone-200/60">
                    <button
                      onClick={() => setShowLogHistory(!showLogHistory)}
                      className="w-full py-2 px-1 text-xs font-bold text-stone-500 hover:text-stone-800 flex items-center justify-between transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <span className="flex items-center gap-1.5 text-stone-500 font-semibold text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>Today's Log Timeline ({totalLogsCount})</span>
                      </span>
                      <span className="text-[10px] font-extrabold text-stone-400 font-mono">
                        {showLogHistory ? "Hide ▲" : "View All ▼"}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showLogHistory && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 space-y-2 overflow-hidden text-left"
                        >
                          {/* Weight Log Card */}
                          {weightTodayLog && (
                            <UniversalVitalLogCard
                              type="weight"
                              valueText={`${weightTodayLog.weight} kg`}
                              logTime={weightTodayLog.log_time}
                              onDelete={async () => {
                                if (weightTodayLog.id) {
                                  await handleDeleteWeight(weightTodayLog.id);
                                }
                              }}
                            />
                          )}

                          {/* Water Log Cards */}
                          {(wellnessToday?.water_logs || []).map((item) => (
                            <UniversalVitalLogCard
                              key={item.id}
                              type="water"
                              valueText={`+${item.amount} ml`}
                              logTime={item.time}
                              onDelete={async () => {
                                await handleDeleteWaterLogItem(item.id, selectedDate);
                              }}
                            />
                          ))}

                          {/* Stool Log Cards */}
                          {(wellnessToday?.stool_logs || []).map((item) => {
                            const isConstipated = item.type === 1 || item.type === 2;
                            const isHealthy = item.type === 3 || item.type === 4;
                            const statusLabel = isConstipated ? "Constipated" : isHealthy ? "Healthy" : "Loose";

                            return (
                              <UniversalVitalLogCard
                                key={item.id}
                                type="digestion"
                                stoolType={item.type}
                                valueText={statusLabel}
                                subText={`(Type ${item.type})`}
                                logTime={item.time}
                                onDelete={async () => {
                                  await handleDeleteStoolLogItem(item.id, selectedDate);
                                }}
                              />
                            );
                          })}

                          {/* Energy Log Cards */}
                          {(wellnessToday?.energy_logs || []).map((item) => {
                            const energyLabel = (() => {
                              if (item.level === 1) return "Exhausted";
                              if (item.level === 2) return "Sluggish";
                              if (item.level === 3) return "Steady";
                              if (item.level === 4) return "High Energy";
                              return "Peak Vitality";
                            })();

                            return (
                              <UniversalVitalLogCard
                                key={item.id}
                                type="energy"
                                valueText={energyLabel}
                                subText={`(Level ${item.level})`}
                                logTime={item.time}
                                onDelete={async () => {
                                  await handleDeleteEnergyLogItem(item.id, selectedDate);
                                }}
                              />
                            );
                          })}

                          {/* Bloating Log Cards */}
                          {((wellnessToday?.bloating_logs || []).length > 0
                            ? wellnessToday!.bloating_logs!
                            : wellnessToday?.bloating_level !== undefined && wellnessToday?.bloating_level !== null
                            ? [
                                {
                                  id: "legacy-bloating",
                                  level: wellnessToday.bloating_level,
                                  time: wellnessToday.bloating_log_time || "Today",
                                },
                              ]
                            : []
                          ).map((item) => {
                            const getBloatingLabel = (lvl: number) => {
                              if (lvl === 1) return "None";
                              if (lvl === 2) return "Mild Bloat";
                              if (lvl === 3) return "Moderate Bloat";
                              return "Severe Bloat";
                            };

                            return (
                              <UniversalVitalLogCard
                                key={item.id}
                                type="bloating"
                                bloatingLevel={item.level}
                                valueText={getBloatingLabel(item.level)}
                                subText={`(Level ${item.level})`}
                                logTime={item.time}
                                onDelete={async () => {
                                  if (item.id === "legacy-bloating") {
                                    await handleLogBloating(null, selectedDate);
                                  } else {
                                    await handleDeleteBloatingLogItem(item.id, selectedDate);
                                  }
                                }}
                              />
                            );
                          })}

                          {totalLogsCount === 0 && (
                            <div className="text-[11px] font-bold text-stone-400 text-center py-3">
                              No vitals logged yet for today.
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

            </div>
          </motion.div>

          {/* Sleek Custom Time Picker Modal */}
          <TimePickerModal
            isOpen={isTimePickerOpen}
            onClose={() => setIsTimePickerOpen(false)}
            initialTime={getActiveTargetInitialTime()}
            onSave={handleTimePickerSave}
            title={
              timePickerTarget === "weight" ? "Set Weight Log Time" :
              timePickerTarget === "water" ? "Set Water Log Time" :
              timePickerTarget === "digestion" ? "Set Digestion Log Time" :
              "Set Energy Log Time"
            }
          />
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
