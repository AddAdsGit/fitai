import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Scale,
  Droplet,
  Zap,
  Clock,
  Minus,
  Plus,
  Check,
  X,
  List,
  Edit2,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "../lib/utils";
import { BristolStoolIcon, GutIcon, BloatingIcon, BloatingStomachIcon } from "./BristolStoolIcons";
import { StepperButton } from "./StepperButton";
import { UniversalVitalLogCard } from "./UniversalVitalLogCard";
import { Profile, DailyWellness, WeightLog } from "../types";

export interface DailyVitalsSectionProps {
  profileData: Profile;
  selectedDate: string;
  todayStr: string;
  dailyNotes: DailyWellness[];
  weightLogs: WeightLog[];
  isVitalsLogOpen: boolean;
  setIsVitalsLogOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  activeVitalsTab: "weight" | "water" | "digestion" | "energy" | "bloating" | null;
  setActiveVitalsTab: (
    tab:
      | "weight"
      | "water"
      | "digestion"
      | "energy"
      | "bloating"
      | null
      | ((
          prev: "weight" | "water" | "digestion" | "energy" | "bloating" | null
        ) => "weight" | "water" | "digestion" | "energy" | "bloating" | null)
  ) => void;
  draftWeight: number | null;
  setDraftWeight: (w: number | null) => void;
  draftWeightTime: string;
  setDraftWeightTime: (t: string) => void;
  draftWater: number | null;
  setDraftWater: (w: number | null) => void;
  draftWaterTime: string;
  setDraftWaterTime: (t: string) => void;
  draftStoolType: number | null;
  setDraftStoolType: (t: number | null) => void;
  draftStoolTime: string;
  setDraftStoolTime: (t: string) => void;
  draftEnergy: number | null;
  setDraftEnergy: (l: number | null) => void;
  draftEnergyTime: string;
  setDraftEnergyTime: (t: string) => void;
  isWeightStepping: boolean;
  isWaterStepping: boolean;
  isStoolSliding: boolean;
  setIsStoolSliding: (s: boolean) => void;
  isEnergySliding: boolean;
  setIsEnergySliding: (s: boolean) => void;
  triggerWeightStepping: () => void;
  triggerWaterStepping: () => void;
  setTimePickerTarget: (
    target: "weight" | "water" | "digestion" | "energy" | "bloating"
  ) => void;
  setTimePickerInitialTime: (time: string) => void;
  setIsTimePickerOpen: (open: boolean) => void;
  handleLogWeight: (
    weight: number,
    date: string,
    time?: string
  ) => Promise<void>;
  handleDeleteWeight: (id: string) => Promise<void>;
  handleLogWater: (
    amount: number,
    date: string,
    time?: string
  ) => Promise<void>;
  handleDeleteWaterLogItem: (itemId: string, date: string) => Promise<void>;
  handleLogDigestion: (
    type: number | null,
    notes: string | null,
    date: string,
    time?: string
  ) => Promise<void>;
  handleDeleteStoolLogItem: (itemId: string, date: string) => Promise<void>;
  handleLogEnergy: (
    level: number | null,
    date: string,
    time?: string
  ) => Promise<void>;
  handleDeleteEnergyLogItem: (itemId: string, date: string) => Promise<void>;
  handleLogBloating: (
    level: number | null,
    date: string,
    time?: string
  ) => Promise<void>;
  handleDeleteBloatingLogItem: (itemId: string, date: string) => Promise<void>;
  DAILY_WATER_GOAL_ML: number;
}

export const DailyVitalsSection: React.FC<DailyVitalsSectionProps> = ({
  profileData,
  selectedDate,
  todayStr,
  dailyNotes,
  weightLogs,
  isVitalsLogOpen,
  setIsVitalsLogOpen,
  activeVitalsTab,
  setActiveVitalsTab,
  draftWeight,
  setDraftWeight,
  draftWeightTime,
  setDraftWeightTime,
  draftWater,
  setDraftWater,
  draftWaterTime,
  setDraftWaterTime,
  draftStoolType,
  setDraftStoolType,
  draftStoolTime,
  setDraftStoolTime,
  draftEnergy,
  setDraftEnergy,
  draftEnergyTime,
  setDraftEnergyTime,
  isWeightStepping,
  isWaterStepping,
  isStoolSliding,
  setIsStoolSliding,
  isEnergySliding,
  setIsEnergySliding,
  triggerWeightStepping,
  triggerWaterStepping,
  setTimePickerTarget,
  setTimePickerInitialTime,
  setIsTimePickerOpen,
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
  DAILY_WATER_GOAL_ML,
}) => {
  if (
    !profileData.agent_config?.trackWeight &&
    !profileData.agent_config?.trackWater &&
    !profileData.agent_config?.trackDigestion &&
    !profileData.agent_config?.trackEnergy &&
    !profileData.agent_config?.trackBloating
  ) {
    return null;
  }

  const wellnessToday = dailyNotes.find((n) => n.date === selectedDate);
  const weightTodayLog = weightLogs.find((l) => l.date === selectedDate);
  const waterIntake = wellnessToday?.water_intake || 0;
  const stoolType = wellnessToday?.stool_type ?? null;
  const energyLevel = wellnessToday?.energy_level ?? null;
  const bloatingLevel = wellnessToday?.bloating_level ?? null;

  const isWeightActive = profileData.agent_config?.trackWeight ?? true;
  const isWaterActive = profileData.agent_config?.trackWater ?? true;
  const isDigestionActive = profileData.agent_config?.trackDigestion ?? true;
  const isEnergyActive = profileData.agent_config?.trackEnergy ?? true;
  const isBloatingActive = profileData.agent_config?.trackBloating ?? true;

  // Calculate average weight from active logged days (per AGENTS.md Rule 2)
  const avgWeightData = React.useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return null;
    const sum = weightLogs.reduce((acc, curr) => acc + curr.weight, 0);
    const avg = (sum / weightLogs.length).toFixed(1);
    return { avg, count: weightLogs.length };
  }, [weightLogs]);

  const [isEditingWeight, setIsEditingWeight] = useState<boolean>(false);
  const [localDraftBloating, setLocalDraftBloating] = useState<number | null>(null);
  const [localDraftBloatingTime, setLocalDraftBloatingTime] = useState<string>("");
  const [localIsBloatingSliding, setLocalIsBloatingSliding] = useState<boolean>(false);

  // Auto-open input controls for single active vital (e.g. Weight, Water, Digestion, Energy, Bloating)
  useEffect(() => {
    const activeList = [
      isWeightActive && "weight",
      isWaterActive && "water",
      isDigestionActive && "digestion",
      isEnergyActive && "energy",
      isBloatingActive && "bloating",
    ].filter(Boolean) as Array<"weight" | "water" | "digestion" | "energy" | "bloating">;

    if (activeList.length === 1 && activeVitalsTab !== activeList[0]) {
      setActiveVitalsTab(activeList[0]);
    }
  }, [isWeightActive, isWaterActive, isDigestionActive, isEnergyActive, isBloatingActive, activeVitalsTab, setActiveVitalsTab]);

  // Sync/reset local draft states whenever dailyNotes, weightLogs, or selectedDate updates
  useEffect(() => {
    setDraftWeight(null);
    setDraftWater(null);
    setDraftStoolType(null);
    setDraftEnergy(null);
    setLocalDraftBloating(null);
    setLocalDraftBloatingTime("");
  }, [dailyNotes, weightLogs, selectedDate]);

  const getNowTimeStr = () => new Date().toTimeString().slice(0, 5);

  const waterLogsList =
    wellnessToday?.water_logs && wellnessToday.water_logs.length > 0
      ? wellnessToday.water_logs
      : waterIntake > 0
      ? [
          {
            id: "legacy-water",
            amount: waterIntake,
            time: wellnessToday?.water_log_time || getNowTimeStr(),
          },
        ]
      : [];

  const stoolLogsList =
    wellnessToday?.stool_logs && wellnessToday.stool_logs.length > 0
      ? wellnessToday.stool_logs
      : stoolType !== null
      ? [
          {
            id: "legacy-stool",
            type: stoolType,
            time: wellnessToday?.stool_log_time || getNowTimeStr(),
          },
        ]
      : [];

  const energyLogsList =
    wellnessToday?.energy_logs && wellnessToday.energy_logs.length > 0
      ? wellnessToday.energy_logs
      : energyLevel !== null
      ? [
          {
            id: "legacy-energy",
            level: energyLevel,
            time: wellnessToday?.energy_log_time || getNowTimeStr(),
          },
        ]
      : [];

  const bloatingLogsList =
    wellnessToday?.bloating_logs && wellnessToday.bloating_logs.length > 0
      ? wellnessToday.bloating_logs
      : bloatingLevel !== null
      ? [
          {
            id: "legacy-bloating",
            level: bloatingLevel,
            time: wellnessToday?.bloating_log_time || getNowTimeStr(),
          },
        ]
      : [];

  const totalLoggedVitals =
    (isWeightActive && weightTodayLog ? 1 : 0) +
    (isWaterActive ? waterLogsList.length : 0) +
    (isDigestionActive ? stoolLogsList.length : 0) +
    (isEnergyActive ? energyLogsList.length : 0) +
    (isBloatingActive ? bloatingLogsList.length : 0);

  const activeWeightTime =
    draftWeightTime || weightTodayLog?.log_time || getNowTimeStr();
  const currentWater = draftWater ?? waterIntake;
  const activeType = draftStoolType ?? stoolType ?? 4;
  const currentEnergy = draftEnergy ?? energyLevel ?? 3;
  const currentBloating = localDraftBloating ?? bloatingLevel ?? 1;

  const activeWaterTime =
    draftWaterTime || wellnessToday?.water_log_time || getNowTimeStr();
  const activeStoolTime =
    draftStoolTime || wellnessToday?.stool_log_time || getNowTimeStr();
  const activeEnergyTime =
    draftEnergyTime || wellnessToday?.energy_log_time || getNowTimeStr();
  const activeBloatingTime =
    localDraftBloatingTime || wellnessToday?.bloating_log_time || getNowTimeStr();

  const getBloatingDescription = (level: number) => {
    if (level === 1) return "Level 1: Normal & Comfortable — Zero Bloating";
    if (level === 2) return "Level 2: Mild Tightness — Slight Fullness After Food";
    if (level === 3) return "Level 3: Moderate Bloating — Noticeable Belly Pressure";
    return "Level 4: Severe Swelling — Tight Distension";
  };

  const formatInterestingTime = (timeStr?: string | null) => {
    if (!timeStr) return null;
    if (!timeStr.includes(":")) return timeStr;
    const [hStr, mStr] = timeStr.split(":");
    if (!hStr || !mStr) return timeStr;
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${mStr} ${ampm}`;
  };

  const activeVitalsList = [
    isWeightActive && {
      id: "weight" as const,
      label: "Weight",
      icon: Scale,
      isLogged: !!weightTodayLog,
      valText: weightTodayLog ? `${weightTodayLog.weight} kg` : "Weight",
    },
    isWaterActive && {
      id: "water" as const,
      label: "Water",
      icon: Droplet,
      isLogged: waterIntake > 0,
      valText: waterIntake > 0 ? `${(waterIntake / 1000).toFixed(1)}L` : "Water",
    },
    isDigestionActive && {
      id: "digestion" as const,
      label: "Digestion",
      icon: GutIcon,
      isLogged: stoolType !== null,
      valText: stoolType !== null ? `Type ${stoolType}` : "Digestion",
    },
    isEnergyActive && {
      id: "energy" as const,
      label: "Energy",
      icon: Zap,
      isLogged: energyLevel !== null,
      valText: energyLevel !== null ? `Lvl ${energyLevel}` : "Energy",
    },
    isBloatingActive && {
      id: "bloating" as const,
      label: "Bloating",
      icon: BloatingIcon,
      isLogged: bloatingLevel !== null,
      valText: bloatingLevel !== null ? `Lvl ${bloatingLevel}` : "Bloating",
    },
  ].filter(Boolean) as Array<{
    id: "weight" | "water" | "digestion" | "energy" | "bloating";
    label: string;
    icon: any;
    isLogged: boolean;
    valText: string;
  }>;

  // True activity-based 30s auto-collapse timer
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const resetActivity = () => setLastActivity(Date.now());

  useEffect(() => {
    // Past dates stay expanded with NO auto-collapse timer
    if (selectedDate !== todayStr) return;
    if (!isVitalsLogOpen && !activeVitalsTab) return;

    const timer = setTimeout(() => {
      if (isVitalsLogOpen) setIsVitalsLogOpen(false);
      if (activeVitalsTab) setActiveVitalsTab(null);
    }, 30000);

    return () => clearTimeout(timer);
  }, [isVitalsLogOpen, activeVitalsTab, lastActivity, setIsVitalsLogOpen, setActiveVitalsTab, selectedDate, todayStr]);

  return (
    <section
      onPointerDownCapture={resetActivity}
      onClickCapture={resetActivity}
      onKeyDownCapture={resetActivity}
      className="px-6 mt-6 relative z-10 text-left space-y-4 animate-fade-in"
    >

      {/* ADAPTIVE VITALS SELECTOR BAR */}
      {(() => {
        if (activeVitalsList.length <= 1) return null;

        const isCompactMorph = activeVitalsList.length > 3;

        if (!isCompactMorph) {
          // Expanded Full Text Layout: Standalone floating card buttons (for <= 3 active vitals)
          const gridCols = activeVitalsList.length === 2 ? "grid-cols-2" : "grid-cols-3";
          return (
            <div className={cn("grid gap-2.5 select-none mt-1", gridCols)}>
              {activeVitalsList.map((item) => {
                const IconComp = item.icon;
                const isActive = activeVitalsTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setActiveVitalsTab((prev) =>
                        prev === item.id ? null : item.id
                      )
                    }
                    className={cn(
                      "py-2.5 px-3 rounded-2xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 min-w-0 border shadow-2xs",
                      isActive
                        ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 font-black"
                        : "bg-white text-stone-800 border-stone-200/80 hover:bg-stone-50 hover:border-stone-300 font-extrabold"
                    )}
                    title={`Toggle ${item.label}`}
                  >
                    <IconComp
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive
                          ? "text-white"
                          : item.isLogged
                          ? "text-orange-500 font-bold"
                          : "text-stone-400"
                      )}
                    />
                    <span className="text-[11.5px] font-extrabold truncate tracking-tight">
                      {item.valText}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        }

        // Compressed Morphing Layout (for > 3 active vitals) - Transparent Tiles
        return (
          <div className="bg-white/90 backdrop-blur-md border border-stone-200/80 rounded-2xl p-1 flex items-center justify-between gap-1 shadow-3xs select-none mt-1">
            {activeVitalsList.map((item) => {
              const IconComp = item.icon;
              const isActive = activeVitalsTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setActiveVitalsTab((prev) =>
                      prev === item.id ? null : item.id
                    )
                  }
                  className={cn(
                    "py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer border-none active:scale-95 min-w-0",
                    isActive
                      ? "flex-[1.8] bg-orange-500 text-white shadow-md shadow-orange-500/20 font-black px-3"
                      : "flex-1 bg-transparent hover:bg-orange-50/60 text-stone-600 hover:text-stone-900"
                  )}
                  title={`Toggle ${item.label}`}
                >
                  <IconComp
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive
                        ? "text-white"
                        : item.isLogged
                        ? "text-orange-500 font-bold"
                        : "text-stone-400"
                    )}
                  />

                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="text-[11px] font-black truncate tracking-tight"
                    >
                      {item.valText}
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}
      {/* 1. WEIGHT LOG (POPS OUT WHEN TOGGLED) */}
      {isWeightActive && activeVitalsTab === "weight" && (
        <div className="flex flex-col gap-2">
          {weightTodayLog && !isEditingWeight ? (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-orange-50/60 rounded-2xl border border-orange-100/60 text-xs font-bold text-orange-950/70 animate-fade-in font-sans">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-black">✓</span>
                <span>Weight logged for today ({weightTodayLog.weight} kg)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-400 font-mono font-medium">
                  {weightTodayLog.log_time}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftWeight(weightTodayLog.weight);
                    setDraftWeightTime(weightTodayLog.log_time);
                    setIsEditingWeight(true);
                  }}
                  className="text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer border border-orange-200/60"
                  title="Edit Weight"
                >
                  Edit
                </button>
              </div>
            </div>
          ) : (
            (() => {
              const baseWeight = (() => {
                const pastLogs = weightLogs.filter((l) => l.date < todayStr);
                if (pastLogs.length > 0) {
                  const sortedPast = [...pastLogs].sort((a, b) =>
                    b.date.localeCompare(a.date)
                  );
                  return sortedPast[0].weight;
                }
                return profileData.weight || 70;
              })();

              const currentWeight = draftWeight ?? baseWeight;

              return (
                <div className="flex flex-col gap-2 w-full animate-fade-in">
                  <div className="flex items-center gap-2.5 w-full">
                    {/* Left: Time Pill */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setTimePickerTarget("weight");
                          setTimePickerInitialTime(activeWeightTime);
                          setIsTimePickerOpen(true);
                        }}
                        className="h-12 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-2xl px-3 text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          {formatInterestingTime(activeWeightTime) ||
                            activeWeightTime}
                        </span>
                      </button>
                    </div>

                    {/* Middle: Stepper */}
                    <div className="flex-1 flex items-center bg-white border border-stone-200/80 rounded-2xl px-1 py-1 shadow-3xs">
                      <StepperButton
                        onStep={() => {
                          setDraftWeight((prev) => {
                            const base = prev !== null ? prev : currentWeight;
                            return Math.max(30, Number((base - 0.1).toFixed(1)));
                          });
                          triggerWeightStepping();
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none bg-transparent active:scale-95 transition-all shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </StepperButton>
                      <div className="flex-1 flex items-center justify-center gap-0.5 text-xs font-bold text-stone-750">
                        <input
                          type="number"
                          step="0.1"
                          min="30"
                          max="300"
                          value={
                            draftWeight !== null ? draftWeight : currentWeight
                          }
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) setDraftWeight(val);
                            else if (e.target.value === "") setDraftWeight(0);
                          }}
                          className="w-14 text-center text-sm font-black text-stone-850 bg-transparent border-none focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-stone-400">kg</span>
                      </div>
                      <StepperButton
                        onStep={() => {
                          setDraftWeight((prev) => {
                            const base = prev !== null ? prev : currentWeight;
                            return Math.min(300, Number((base + 0.1).toFixed(1)));
                          });
                          triggerWeightStepping();
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none bg-transparent active:scale-95 transition-all shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </StepperButton>
                    </div>

                    {/* Right: Log Button */}
                    <button
                      onClick={async () => {
                        await handleLogWeight(
                          currentWeight,
                          selectedDate,
                          activeWeightTime
                        );
                        setDraftWeight(null);
                        setDraftWeightTime("");
                        setIsEditingWeight(false);
                      }}
                      className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border-none shadow-sm active:scale-95"
                      title="Save Weight"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </button>

                    {/* Cancel Edit Button if Editing */}
                    {isEditingWeight && (
                      <button
                        onClick={() => setIsEditingWeight(false)}
                        className="w-12 h-12 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border border-stone-200/80 shadow-3xs active:scale-95"
                        title="Cancel Editing"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* 2. WATER LOG (POPS OUT WHEN TOGGLED) */}
      {isWaterActive && activeVitalsTab === "water" && (
        <div className="flex flex-col gap-2">

          {selectedDate === todayStr &&
            (() => {
              const currentWaterIncrement =
                draftWater !== null ? draftWater : 250;
              return (
                <div className="flex flex-col gap-2 w-full animate-fade-in">
                  <div className="flex items-center gap-2.5 w-full">
                    {/* Left: Time Pill */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setTimePickerTarget("water");
                          setTimePickerInitialTime(activeWaterTime);
                          setIsTimePickerOpen(true);
                        }}
                        className="h-12 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-2xl px-3 text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          {formatInterestingTime(activeWaterTime) ||
                            activeWaterTime}
                        </span>
                      </button>
                    </div>

                    {/* Stepper with Typeable Input */}
                    <div className="flex-1 flex items-center bg-white border border-stone-200/80 rounded-2xl px-1 py-1 shadow-3xs">
                      <StepperButton
                        onStep={() => {
                          setDraftWater((prev) => {
                            const base = prev !== null ? prev : currentWaterIncrement;
                            return Math.max(50, base - 50);
                          });
                          triggerWaterStepping();
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-750 hover:bg-stone-50 cursor-pointer border-none bg-transparent active:scale-95 transition-all shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </StepperButton>
                      <div className="flex-1 flex items-center justify-center gap-0.5 text-xs font-bold text-stone-750">
                        <input
                          type="number"
                          step="50"
                          min="0"
                          max="5000"
                          value={currentWaterIncrement}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setDraftWater(val);
                            else if (e.target.value === "") setDraftWater(0);
                          }}
                          className="w-14 text-center text-sm font-black text-stone-850 bg-transparent border-none focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-stone-400">ml</span>
                      </div>
                      <StepperButton
                        onStep={() => {
                          setDraftWater((prev) => {
                            const base = prev !== null ? prev : currentWaterIncrement;
                            return Math.min(5000, base + 50);
                          });
                          triggerWaterStepping();
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-750 hover:bg-stone-50 cursor-pointer border-none bg-transparent active:scale-95 transition-all shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </StepperButton>
                    </div>

                    {/* Right: Solid Orange Checkmark Button */}
                    <button
                      onClick={async () => {
                        await handleLogWater(
                          currentWaterIncrement,
                          selectedDate,
                          activeWaterTime
                        );
                        setDraftWater(null);
                        setDraftWaterTime("");
                      }}
                      className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border-none shadow-sm active:scale-95"
                      title="Log Water"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Dynamic Hydration Description (Only when interacting) */}
                  {isWaterStepping && (
                    <div className="px-1 text-left animate-fade-in">
                      <span className="text-[11px] font-medium text-stone-500">
                        {(() => {
                          const inc = currentWaterIncrement || 250;
                          const nextTotal = waterIntake + inc;
                          return `Will add +${inc} ml → Total logged today: ${nextTotal} ml 💧`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
        </div>
      )}

      {/* 3. DIGESTION TRACKER (POPS OUT WHEN TOGGLED) */}
      {isDigestionActive && activeVitalsTab === "digestion" && (
        <div className="flex flex-col gap-2">

          {selectedDate === todayStr && (
            <div className="flex flex-col gap-2 w-full animate-fade-in">
              <div className="flex items-center gap-2.5 w-full">
                {/* Left: Time Pill */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTimePickerTarget("digestion");
                      setTimePickerInitialTime(activeStoolTime);
                      setIsTimePickerOpen(true);
                    }}
                    className="h-12 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-2xl px-3 text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>
                      {formatInterestingTime(activeStoolTime) ||
                        activeStoolTime}
                    </span>
                  </button>
                </div>

                {/* Middle: Clean Slider */}
                <div className="flex-1 flex flex-col justify-center bg-white border border-stone-200/80 rounded-2xl px-3 py-3 shadow-3xs">
                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={activeType}
                    onChange={(e) =>
                      setDraftStoolType(parseInt(e.target.value))
                    }
                    onMouseDown={() => setIsStoolSliding(true)}
                    onTouchStart={() => setIsStoolSliding(true)}
                    onMouseUp={() =>
                      setTimeout(() => setIsStoolSliding(false), 200)
                    }
                    onTouchEnd={() =>
                      setTimeout(() => setIsStoolSliding(false), 200)
                    }
                    className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                {/* Right: Action Box */}
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
                        await handleLogDigestion(
                          activeType,
                          null,
                          selectedDate,
                          activeStoolTime
                        );
                        setDraftStoolType(null);
                        setDraftStoolTime("");
                      }}
                      className="absolute inset-0 [backface-visibility:hidden] bg-[#F97316] hover:bg-orange-600 rounded-2xl flex items-center justify-center shadow-xs border-none cursor-pointer active:scale-95 transition-all"
                      title="Log Digestion"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </button>

                    {/* BACK: Brown Bristol Stool SVG */}
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-stone-50 border border-stone-200/80 rounded-2xl flex items-center justify-center shadow-2xs">
                      <BristolStoolIcon type={activeType} className="w-7 h-7" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic description below the section (only while sliding) */}
              {isStoolSliding && (
                <div className="px-1 text-left animate-fade-in">
                  <span className="text-[11px] font-medium text-stone-500">
                    {(() => {
                      if (activeType === 1)
                        return "Bristol Stool Type 1: Separate hard lumps, like nuts (hard to pass)";
                      if (activeType === 2)
                        return "Bristol Stool Type 2: Sausage-shaped, but lumpy";
                      if (activeType === 3)
                        return "Bristol Stool Type 3: Like a sausage, with cracks on surface";
                      if (activeType === 4)
                        return "Bristol Stool Type 4: Like a sausage or snake, smooth & soft (Optimal)";
                      if (activeType === 5)
                        return "Bristol Stool Type 5: Soft blobs with clear-cut edges";
                      if (activeType === 6)
                        return "Bristol Stool Type 6: Fluffy pieces with ragged edges, mushy stool";
                      return "Bristol Stool Type 7: Watery, no solid pieces (entirely liquid)";
                    })()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. ENERGY TRACKER (POPS OUT WHEN TOGGLED) */}
      {isEnergyActive && activeVitalsTab === "energy" && (
        <div className="flex flex-col gap-2">

          {selectedDate === todayStr && (
            <div className="flex flex-col gap-2 w-full animate-fade-in">
              <div className="flex items-center gap-2.5 w-full">
                {/* Left: Time Pill */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTimePickerTarget("energy");
                      setTimePickerInitialTime(activeEnergyTime);
                      setIsTimePickerOpen(true);
                    }}
                    className="h-12 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-2xl px-3 text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>
                      {formatInterestingTime(activeEnergyTime) ||
                        activeEnergyTime}
                    </span>
                  </button>
                </div>

                {/* Middle: Clean 1-5 Slider */}
                <div className="flex-1 flex flex-col justify-center bg-white border border-stone-200/80 rounded-2xl px-3 py-3 shadow-3xs">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={currentEnergy}
                    onChange={(e) =>
                      setDraftEnergy(parseInt(e.target.value))
                    }
                    onMouseDown={() => setIsEnergySliding(true)}
                    onTouchStart={() => setIsEnergySliding(true)}
                    onMouseUp={() =>
                      setTimeout(() => setIsEnergySliding(false), 200)
                    }
                    onTouchEnd={() =>
                      setTimeout(() => setIsEnergySliding(false), 200)
                    }
                    className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                {/* Right: Action Box */}
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
                        await handleLogEnergy(
                          currentEnergy,
                          selectedDate,
                          activeEnergyTime
                        );
                        setDraftEnergy(null);
                        setDraftEnergyTime("");
                      }}
                      className="absolute inset-0 [backface-visibility:hidden] bg-[#F97316] hover:bg-orange-600 rounded-2xl flex items-center justify-center shadow-xs border-none cursor-pointer active:scale-95 transition-all"
                      title="Log Energy"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </button>

                    {/* BACK: Energy Emoji Badge */}
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-stone-50 border border-stone-200/80 rounded-2xl flex items-center justify-center shadow-2xs text-lg select-none">
                      {(() => {
                        if (currentEnergy === 1) return "😴";
                        if (currentEnergy === 2) return "🥱";
                        if (currentEnergy === 3) return "⚡";
                        if (currentEnergy === 4) return "🔥";
                        return "🚀";
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic description below the section (only while sliding) */}
              {isEnergySliding && (
                <div className="px-1 text-left animate-fade-in">
                  <span className="text-[11px] font-medium text-stone-500">
                    {(() => {
                      if (currentEnergy === 1)
                        return "Energy Level 1: Extremely tired, struggling to focus";
                      if (currentEnergy === 2)
                        return "Energy Level 2: Low vitality, feeling sluggish";
                      if (currentEnergy === 3)
                        return "Energy Level 3: Moderate, stable & balanced energy";
                      if (currentEnergy === 4)
                        return "Energy Level 4: High vitality, feeling active & clear";
                      return "Energy Level 5: Maximum peak performance & focus";
                    })()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. BLOATING TRACKER (UPGRADED MINIMALIST VISUALIZATION ART) */}
      {isBloatingActive && activeVitalsTab === "bloating" && (
        <div className="flex flex-col gap-3 w-full animate-fade-in">
          {selectedDate === todayStr && (
            <div className="flex flex-col gap-3 w-full bg-white/80 backdrop-blur-md border border-stone-200/70 rounded-3xl p-4 shadow-sm">
              {/* Top Row: Vector Art Preview + Level Descriptor */}
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <BloatingStomachIcon level={currentBloating} className="w-10 h-10" />
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                      Bloating Severity
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTimePickerTarget("bloating");
                        setTimePickerInitialTime(activeBloatingTime);
                        setIsTimePickerOpen(true);
                      }}
                      className="text-[11px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer border-none bg-transparent"
                    >
                      <Clock className="w-3 h-3 text-orange-500" />
                      <span>{formatInterestingTime(activeBloatingTime) || activeBloatingTime}</span>
                    </button>
                  </div>
                  <span className="text-xs font-black text-stone-900 truncate">
                    {getBloatingDescription(currentBloating)}
                  </span>
                </div>
              </div>

              {/* 4 Interactive Bloating Level Selection Pills */}
              <div className="grid grid-cols-4 gap-1.5 w-full">
                {[
                  { level: 1, label: "1 - Normal", activeBg: "bg-emerald-500 text-white border-emerald-500" },
                  { level: 2, label: "2 - Mild", activeBg: "bg-amber-500 text-white border-amber-500" },
                  { level: 3, label: "3 - Moderate", activeBg: "bg-orange-500 text-white border-orange-500" },
                  { level: 4, label: "4 - Severe", activeBg: "bg-red-500 text-white border-red-500" },
                ].map((item) => {
                  const isSelected = currentBloating === item.level;
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setLocalDraftBloating(item.level)}
                      className={cn(
                        "h-10 rounded-xl text-[11px] font-bold transition-all cursor-pointer border active:scale-95 flex items-center justify-center",
                        isSelected
                          ? item.activeBg
                          : "bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200/80"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Action Row: Log Bloating Button */}
              <button
                type="button"
                onClick={async () => {
                  await handleLogBloating(
                    currentBloating,
                    selectedDate,
                    activeBloatingTime
                  );
                  setLocalDraftBloating(null);
                  setLocalDraftBloatingTime("");
                }}
                className="w-full h-11 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all border-none cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Log Bloating Level {currentBloating}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* UNIVERSAL COLLAPSIBLE LOGS DRAWER (ONLY SHOWN IF MULTIPLE VITALS OR NON-WEIGHT VITAL TRACKED) */}
      {totalLoggedVitals > 0 && (activeVitalsList.length > 1 || (activeVitalsList.length === 1 && activeVitalsList[0].id !== "weight")) && (
        <div className="w-full mt-2">
          {!isVitalsLogOpen ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsVitalsLogOpen(true)}
                className="text-[10.5px] font-bold text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1 cursor-pointer border-none bg-transparent px-3 py-1"
              >
                <List className="w-3 h-3 text-stone-400" />
                <span>view all vitals logs ({totalLoggedVitals})</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2.5 mt-3 pt-3 border-t border-stone-200/60 animate-fade-in">
              <div className="flex items-center justify-between px-0.5 mb-0.5">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                  Today's Logged Vitals ({totalLoggedVitals})
                </span>
                <button
                  type="button"
                  onClick={() => setIsVitalsLogOpen(false)}
                  className="text-[10px] font-bold text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1 cursor-pointer border-none bg-transparent"
                >
                  <span>hide logs</span>
                  <span className="text-[8px]">▲</span>
                </button>
              </div>

              {/* 1. Weight Log Card */}
              {weightTodayLog && (
                <UniversalVitalLogCard
                  type="weight"
                  valueText={`${weightTodayLog.weight} kg`}
                  logTime={weightTodayLog.log_time}
                  canDelete={selectedDate === todayStr}
                  onDelete={async () => {
                    if (weightTodayLog.id) {
                      await handleDeleteWeight(weightTodayLog.id);
                    }
                  }}
                />
              )}

              {/* 2. Water Log Cards */}
              {waterLogsList.map((item) => (
                <UniversalVitalLogCard
                  key={item.id}
                  type="water"
                  valueText={`${item.amount} ml`}
                  logTime={item.time}
                  canDelete={selectedDate === todayStr}
                  onDelete={async () => {
                    if (item.id === "legacy-water") {
                      await handleLogWater(0, selectedDate);
                    } else {
                      await handleDeleteWaterLogItem(item.id, selectedDate);
                    }
                  }}
                />
              ))}

              {/* 3. Digestion Log Cards */}
              {stoolLogsList.map((item) => {
                const itemConstipated = item.type === 1 || item.type === 2;
                const itemHealthy = item.type === 3 || item.type === 4;
                const statusLabel = itemConstipated ? "Constipated" : itemHealthy ? "Healthy" : "Loose";

                return (
                  <UniversalVitalLogCard
                    key={item.id}
                    type="digestion"
                    stoolType={item.type}
                    valueText={statusLabel}
                    subText={`(Type ${item.type})`}
                    logTime={item.time}
                    canDelete={selectedDate === todayStr}
                    onDelete={async () => {
                      if (item.id === "legacy-stool") {
                        await handleLogDigestion(null, null, selectedDate);
                      } else {
                        await handleDeleteStoolLogItem(item.id, selectedDate);
                      }
                    }}
                  />
                );
              })}

              {/* 4. Energy Log Cards */}
              {energyLogsList.map((item) => {
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
                    canDelete={selectedDate === todayStr}
                    onDelete={async () => {
                      if (item.id === "legacy-energy") {
                        await handleLogEnergy(null, selectedDate);
                      } else {
                        await handleDeleteEnergyLogItem(item.id, selectedDate);
                      }
                    }}
                  />
                );
              })}

              {/* 5. Bloating Log Cards */}
              {((wellnessToday?.bloating_logs || []).length > 0
                ? wellnessToday!.bloating_logs!
                : bloatingLevel !== null
                ? [
                    {
                      id: "legacy-bloating",
                      level: bloatingLevel,
                      time: wellnessToday?.bloating_log_time || getNowTimeStr(),
                    },
                  ]
                : []
              ).map((item) => {
                const bloatText = (() => {
                  if (item.level === 1) return "None";
                  if (item.level === 2) return "Mild Bloat";
                  if (item.level === 3) return "Moderate Bloat";
                  return "Severe Bloat";
                })();

                return (
                  <UniversalVitalLogCard
                    key={item.id}
                    type="bloating"
                    bloatingLevel={item.level}
                    valueText={bloatText}
                    subText={`(Level ${item.level})`}
                    logTime={item.time}
                    canDelete={selectedDate === todayStr}
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
            </div>
          )}
        </div>
      )}
    </section>
  );
};
