import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  TrendingUp,
  Minus,
  Plus,
  Scale,
  X,
  Share2,
  Droplets,
  Zap,
  Activity,
  Utensils,
  Home,
  Sparkles,
  ChevronDown,
  Calendar,
  Flame,
  Trophy,
  Wind,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
  ReferenceArea,
  AreaChart,
  Area,
  CartesianGrid,
  YAxis,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { cn } from "../lib/utils";
import type { Meal, WeightLog, DailyWellness } from "../types";
import { normalizeTrackedNutrients } from "../constants/nutrition";
import { calculateTDEE } from "../utils/metabolism";
import { formatNutrientValue } from "../utils/helpers";

type TimeRangeOption = "7D" | "14D" | "30D" | "60D" | "90D" | "CUSTOM";

export interface ProgressBarProps {
  key?: string;
  value: number;
  max?: number;
  label: string;
  color: string;
  percentage?: string;
  index?: number;
  unit?: string;
}

const ProgressBar = ({
  value,
  max,
  label,
  color,
  percentage,
  index = 0,
  unit = "",
}: ProgressBarProps) => (
  <div className="space-y-1.5 min-w-0 font-sans">
    <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-[0.05em] gap-1 min-w-0">
      <span className="text-orange-950/70 truncate">{label}</span>
      {max ? (
        <span style={{ color }} className="whitespace-nowrap shrink-0 font-mono font-bold">
          {formatNutrientValue(value)}
          <span className="text-orange-900/40 text-[9px] ml-0.5">
            / {formatNutrientValue(max)}
            {unit}
          </span>
        </span>
      ) : (
        <span style={{ color }} className="whitespace-nowrap shrink-0 font-mono font-bold">{percentage}%</span>
      )}
    </div>
    <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden border border-white/40 shadow-inner">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${max ? Math.min(100, (value / max) * 100) : value}%` }}
        transition={{ duration: 1, delay: index * 0.1 + 0.2, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

export { ProgressBar };

const formatFullDateLabel = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = months[m - 1] || "";
      return `${monthName} ${d}, ${y}`;
    }
    return dateStr;
  } catch (_) {
    return dateStr;
  }
};

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-orange-100/80 shadow-xl text-orange-950 font-sans text-xs space-y-0.5 z-50">
        <div className="font-mono text-[10px] text-orange-900/50 font-bold tracking-wider">
          {formatFullDateLabel(data.date)} at {data.time}
        </div>
        <div className="font-black flex items-center gap-1.5" style={{ color: data.fill }}>
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: data.fill }} />
          {data.label}
        </div>
      </div>
    );
  }
  return null;
};

const formatShortMonthDay = (dateInput: Date | string) => {
  if (!dateInput) return "";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput.includes("T") ? dateInput : `${dateInput}T00:00:00`) : dateInput;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  } catch (_) {
    return String(dateInput);
  }
};

const formatXAxisDateTick = (dateStr: string, totalDays: number = 7) => {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m - 1, d);
      if (totalDays <= 7) {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayName = daysOfWeek[dateObj.getDay()];
        return `${dayName} ${m}/${d}`;
      }
      return `${m}/${d}`;
    }
    return dateStr;
  } catch (_) {
    return dateStr;
  }
};

export const InsightsView = ({
  currentStreak = 0,
  mealsState = [],
  profileData,
  weightLogs = [],
  dailyNotes = [],
  onLogWeight,
  onDeleteWeight,
  triggerToast,
}: {
  currentStreak?: number;
  mealsState?: Meal[];
  profileData: any;
  weightLogs?: WeightLog[];
  dailyNotes?: DailyWellness[];
  onLogWeight?: (weight: number, date: string) => void;
  onDeleteWeight?: (id: string) => void;
  triggerToast?: (msg: string) => void;
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>("7D");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [showTdeeInfoModal, setShowTdeeInfoModal] = useState<boolean>(false);
  const [nutrientSlide, setNutrientSlide] = useState<number>(0);

  // Minimalist Interactive Scrubber State (Unified Mutual Exclusion & Auto-fade in 2.5s)
  const [activeChartScrub, setActiveChartScrub] = useState<{
    chartId: "calories" | "weight" | "water" | "energy" | "bloating" | "digestion";
    data: any;
  } | null>(null);
  const scrubTimerRef = React.useRef<any>(null);

  const triggerChartScrub = (
    chartId: "calories" | "weight" | "water" | "energy" | "bloating" | "digestion",
    payload: any
  ) => {
    if (!payload) return;
    if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
    setActiveChartScrub({ chartId, data: payload });
    scrubTimerRef.current = setTimeout(() => {
      setActiveChartScrub(null);
    }, 2500);
  };

  const handleChartStateScrub = (
    chartId: "calories" | "weight" | "water" | "energy" | "bloating" | "digestion",
    state: any
  ) => {
    if (state && state.activePayload && state.activePayload.length) {
      triggerChartScrub(chartId, state.activePayload[0].payload);
    }
  };

  useEffect(() => {
    return () => {
      if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
    };
  }, []);

  const localFormatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getTimeRangeLabel = (range: TimeRangeOption) => {
    switch (range) {
      case "7D": return "7 Days";
      case "14D": return "14 Days";
      case "30D": return "30 Days";
      case "60D": return "60 Days";
      case "90D": return "90 Days";
      case "CUSTOM": return "Custom Range";
      default: return "7 Days";
    }
  };

  const dateRangeBounds = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);

    if (timeRange === "7D") {
      start.setDate(today.getDate() - 6);
    } else if (timeRange === "14D") {
      start.setDate(today.getDate() - 13);
    } else if (timeRange === "30D") {
      start.setDate(today.getDate() - 29);
    } else if (timeRange === "60D") {
      start.setDate(today.getDate() - 59);
    } else if (timeRange === "90D") {
      start.setDate(today.getDate() - 89);
    } else if (timeRange === "CUSTOM") {
      start = new Date(customStartDate + "T00:00:00");
      end = new Date(customEndDate + "T23:59:59");
    }

    return { start, end };
  }, [timeRange, customStartDate, customEndDate]);

  const totalDaysInRange = useMemo(() => {
    const start = new Date(dateRangeBounds.start);
    const end = new Date(dateRangeBounds.end);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
  }, [dateRangeBounds]);

  const filteredWeightData = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return [];
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    const startStr = localFormatDateStr(dateRangeBounds.start);
    const endStr = localFormatDateStr(dateRangeBounds.end);
    return sorted.filter((log) => log.date >= startStr && log.date <= endStr);
  }, [weightLogs, dateRangeBounds]);

  const weightStats = useMemo(() => {
    if (!filteredWeightData || filteredWeightData.length === 0) {
      const fallback = profileData?.weight || 70;
      return { start: fallback, current: fallback, goal: profileData?.goals?.weightGoal || 70, change: 0, avgWeight: fallback };
    }
    const start = filteredWeightData[0].weight;
    const current = filteredWeightData[filteredWeightData.length - 1].weight;
    const goal = profileData?.goals?.weightGoal || 70;
    const change = parseFloat((current - start).toFixed(1));
    const totalWeight = filteredWeightData.reduce((sum, log) => sum + log.weight, 0);
    const avgWeight = parseFloat((totalWeight / filteredWeightData.length).toFixed(1));
    return { start, current, goal, change, avgWeight };
  }, [filteredWeightData, profileData?.weight, profileData?.goals?.weightGoal]);

  const activeTrackedNutrients = useMemo(() => {
    return normalizeTrackedNutrients(profileData?.tracked_nutrients, profileData?.goals?.dailyProtein);
  }, [profileData?.tracked_nutrients, profileData?.goals?.dailyProtein]);

  const chartData = useMemo(() => {
    const data = [];
    const start = new Date(dateRangeBounds.start);
    const end = new Date(dateRangeBounds.end);

    const current = new Date(start);
    while (current <= end) {
      const dateStr = localFormatDateStr(current);

      const daysMeals = (mealsState || []).filter((m) => m.date === dateStr);
      const calories = daysMeals.reduce((sum, m) => sum + m.calories, 0);

      let dayLabel = "";
      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
      if (totalDays <= 7) {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        dayLabel = daysOfWeek[current.getDay()];
      } else {
        dayLabel = `${current.getMonth() + 1}/${current.getDate()}`;
      }

      const hasLogs = daysMeals.length > 0 && calories > 0;

      const nutrientValues: Record<string, number | null> = {};
      activeTrackedNutrients.forEach((n) => {
        const daySum = daysMeals.reduce((mSum, m) => {
          const val = m.nutrients?.[n.id] ?? (m as any)[n.id] ?? 0;
          return mSum + (Number(val) || 0);
        }, 0);
        nutrientValues[n.id] = hasLogs ? daySum : null;
      });

      data.push({
        day: dayLabel,
        calories: hasLogs ? calories : null,
        goal: profileData?.goals?.dailyCalories || 2000,
        ...nutrientValues,
        date: dateStr,
      });

      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [dateRangeBounds, mealsState, profileData, activeTrackedNutrients]);

  const loggedDaysCount = useMemo(() => {
    return chartData.filter((item) => item.calories !== null && item.calories > 0).length;
  }, [chartData]);

  const activeLoggedChartData = useMemo(() => {
    return chartData.filter((item) => item.calories !== null && item.calories > 0);
  }, [chartData]);

  const periodNutrientStats = useMemo(() => {
    const dayCount = loggedDaysCount || 1;

    return activeTrackedNutrients.map((n) => {
      const totalPeriodVal = activeLoggedChartData.reduce((sum, d) => {
        const daysMeals = (mealsState || []).filter((m) => m.date === d.date);
        const dayNutrientSum = daysMeals.reduce((mSum, m) => {
          const val = m.nutrients?.[n.id] ?? (m as any)[n.id] ?? 0;
          return mSum + (Number(val) || 0);
        }, 0);
        return sum + dayNutrientSum;
      }, 0);

      const avgDaily = Math.round(totalPeriodVal / dayCount);
      const target = n.target || 100;
      const pct = Math.min(100, Math.round((avgDaily / target) * 100));

      return {
        ...n,
        avgDaily,
        target,
        pct,
      };
    });
  }, [activeLoggedChartData, mealsState, activeTrackedNutrients, loggedDaysCount]);

  const avgCalories = useMemo(() => {
    if (loggedDaysCount === 0) return 0;
    const total = activeLoggedChartData.reduce((sum, item) => sum + (item.calories || 0), 0);
    return Math.round(total / loggedDaysCount);
  }, [activeLoggedChartData, loggedDaysCount]);

  const hasAnyData = loggedDaysCount > 0;

  // High-Accuracy Dynamic TDEE Calculation
  const tdeeStats = useMemo(() => {
    return calculateTDEE(mealsState, weightLogs, dateRangeBounds, profileData);
  }, [mealsState, weightLogs, dateRangeBounds, profileData]);

  // Real Wellness Data Map by Date
  const wellnessByDate = useMemo(() => {
    const map = new Map<string, DailyWellness>();
    (dailyNotes || []).forEach((w) => {
      if (w.date) {
        map.set(w.date, w);
      }
    });
    return map;
  }, [dailyNotes]);

  // Reactive Multi-Day Vitals Data (Real Data from Supabase)
  const dynamicVitalsChartData = useMemo(() => {
    const data = [];
    const start = new Date(dateRangeBounds.start);
    const end = new Date(dateRangeBounds.end);
    const current = new Date(start);

    while (current <= end) {
      const dateStr = localFormatDateStr(current);

      let dayLabel = "";
      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
      if (totalDays <= 7) {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        dayLabel = daysOfWeek[current.getDay()];
      } else {
        dayLabel = `${current.getMonth() + 1}/${current.getDate()}`;
      }

      const row = wellnessByDate.get(dateStr);
      const water = row?.water_intake ?? (row?.water_logs && row.water_logs.length > 0 ? row.water_logs.reduce((s, l) => s + (l.amount || 0), 0) : null);
      
      const energyLogs = row?.energy_logs || [];
      const energy = row?.energy_level ?? (energyLogs.length > 0 ? energyLogs[energyLogs.length - 1].level : null);

      const bloatLogs = row?.bloating_logs || [];
      const bloating = row?.bloating_level ?? (bloatLogs.length > 0 ? bloatLogs[bloatLogs.length - 1].level : null);

      const stoolLogs = row?.stool_logs || [];
      const stoolType = row?.stool_type ?? (stoolLogs.length > 0 ? stoolLogs[stoolLogs.length - 1].type : null);

      data.push({
        day: dayLabel,
        date: dateStr,
        water: water !== undefined && water !== null && water > 0 ? parseFloat(water.toFixed(1)) : null,
        energy: energy !== undefined && energy !== null && energy > 0 ? energy : null,
        bloating: bloating !== undefined && bloating !== null && bloating > 0 ? bloating : null,
        stoolType: stoolType !== undefined && stoolType !== null && stoolType > 0 ? stoolType : null,
      });

      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [dateRangeBounds, wellnessByDate]);

  // Water Stats
  const waterStats = useMemo(() => {
    const logged = dynamicVitalsChartData.filter((d) => d.water !== null && d.water > 0);
    const count = logged.length;
    const avg = count > 0 ? parseFloat((logged.reduce((sum, d) => sum + (d.water || 0), 0) / count).toFixed(1)) : 0;
    const goal = profileData?.goals?.dailyWater || 3.0;
    return { avg, count, goal };
  }, [dynamicVitalsChartData, profileData?.goals?.dailyWater]);

  // Energy Stats
  const energyStats = useMemo(() => {
    const logged = dynamicVitalsChartData.filter((d) => d.energy !== null && d.energy > 0);
    const count = logged.length;
    const avg = count > 0 ? parseFloat((logged.reduce((sum, d) => sum + (d.energy || 0), 0) / count).toFixed(1)) : 0;
    let label = "No energy logs";
    if (avg >= 4.0) label = "High Energy Average";
    else if (avg >= 3.0) label = "Moderate Energy";
    else if (avg > 0) label = "Low Energy";
    return { avg, count, label };
  }, [dynamicVitalsChartData]);

  // Bloating Stats
  const bloatingStats = useMemo(() => {
    const logged = dynamicVitalsChartData.filter((d) => d.bloating !== null && d.bloating > 0);
    const count = logged.length;
    const avg = count > 0 ? parseFloat((logged.reduce((sum, d) => sum + (d.bloating || 0), 0) / count).toFixed(1)) : 0;
    let label = "No logs";
    let badgeBg = "text-stone-400";
    if (avg === 0) {
      label = "No logs";
      badgeBg = "text-stone-400";
    } else if (avg <= 1.5) {
      label = "Calm / None";
      badgeBg = "text-emerald-600";
    } else if (avg <= 2.5) {
      label = "Mild Bloating";
      badgeBg = "text-amber-600";
    } else if (avg <= 3.5) {
      label = "Moderate Bloating";
      badgeBg = "text-orange-600";
    } else {
      label = "Severe Bloating";
      badgeBg = "text-rose-600";
    }
    return { avg, count, label, badgeBg };
  }, [dynamicVitalsChartData]);

  // Real Digestion Scatter Points
  const dynamicDigestionScatterData = useMemo(() => {
    const data: any[] = [];
    const start = new Date(dateRangeBounds.start);
    const end = new Date(dateRangeBounds.end);
    const current = new Date(start);

    const labels: Record<number, string> = {
      1: "Hard/Constipated (Type 1)",
      2: "Mildly Hard (Type 2)",
      3: "Ideal/Normal (Type 3)",
      4: "Optimal/Smooth (Type 4)",
      5: "Soft (Type 5)",
      6: "Loose (Type 6)",
      7: "Liquid/Diarrhea (Type 7)",
    };
    const colors: Record<number, string> = {
      1: "#F59E0B",
      2: "#F59E0B",
      3: "#10B981",
      4: "#10B981",
      5: "#EF4444",
      6: "#EF4444",
      7: "#EF4444",
    };

    while (current <= end) {
      const dateStr = localFormatDateStr(current);
      let dayLabel = "";
      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
      if (totalDays <= 7) {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        dayLabel = daysOfWeek[current.getDay()];
      } else {
        dayLabel = `${current.getMonth() + 1}/${current.getDate()}`;
      }

      const row = wellnessByDate.get(dateStr);
      if (row) {
        const logs = row.stool_logs && row.stool_logs.length > 0 ? row.stool_logs : row.stool_type ? [{ id: '1', type: row.stool_type, time: row.stool_log_time || "12:00 PM" }] : [];
        logs.forEach((log) => {
          const stoolType = log.type;
          if (stoolType >= 1 && stoolType <= 7) {
            data.push({
              day: dayLabel,
              date: dateStr,
              time: log.time || "Logged",
              type: stoolType,
              label: labels[stoolType] || `Type ${stoolType}`,
              fill: colors[stoolType] || "#10B981",
            });
          }
        });
      }

      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [dateRangeBounds, wellnessByDate]);

  const digestionStats = useMemo(() => {
    if (dynamicDigestionScatterData.length === 0) return { avgType: 0, count: 0, label: "No logs recorded" };
    const count = dynamicDigestionScatterData.length;
    const avg = parseFloat((dynamicDigestionScatterData.reduce((s, d) => s + d.type, 0) / count).toFixed(1));
    let label = "Optimal Zone 🟢";
    if (avg < 2.8) label = "Constipated Zone 🟡";
    else if (avg > 4.5) label = "Loose Zone 🔴";
    return { avgType: avg, count, label };
  }, [dynamicDigestionScatterData]);

  // Real Eating Habits & Tags Aggregation
  const eatingHabitsStats = useMemo(() => {
    const startStr = localFormatDateStr(dateRangeBounds.start);
    const endStr = localFormatDateStr(dateRangeBounds.end);

    const rangeMeals = (mealsState || []).filter((m) => m.date >= startStr && m.date <= endStr);
    const totalMeals = rangeMeals.length;

    if (totalMeals === 0) {
      return { totalMeals: 0, tagCounts: [], topProportions: [] };
    }

    const tagMap = new Map<string, number>();
    rangeMeals.forEach((m) => {
      if (Array.isArray(m.tags) && m.tags.length > 0) {
        m.tags.forEach((t) => {
          const clean = t.trim();
          if (clean) tagMap.set(clean, (tagMap.get(clean) || 0) + 1);
        });
      } else {
        const hour = parseInt((m.time || "").split(":")[0], 10) || 12;
        const autoTag = hour < 11 ? "Breakfast" : hour < 16 ? "Lunch" : "Dinner";
        tagMap.set(autoTag, (tagMap.get(autoTag) || 0) + 1);
      }
    });

    const sortedTags = Array.from(tagMap.entries())
      .map(([tag, count]) => ({
        tag,
        count,
        pct: `${Math.round((count / totalMeals) * 100)}%`,
        rawPct: Math.round((count / totalMeals) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const topProportions = sortedTags.slice(0, 3);

    return {
      totalMeals,
      tagCounts: sortedTags.slice(0, 8),
      topProportions,
    };
  }, [mealsState, dateRangeBounds]);

  // Compute accurate current streak (today or yesterday start)
  const computedCurrentStreak = useMemo(() => {
    if (!mealsState || mealsState.length === 0) return currentStreak || 0;
    const datesWithLogs = new Set(mealsState.map((m) => m.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = localFormatDateStr(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = localFormatDateStr(yesterday);

    let startD: Date | null = null;
    if (datesWithLogs.has(todayStr)) {
      startD = today;
    } else if (datesWithLogs.has(yesterdayStr)) {
      startD = yesterday;
    } else {
      return 0;
    }

    let streak = 0;
    const d = new Date(startD);
    while (datesWithLogs.has(localFormatDateStr(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return Math.max(streak, currentStreak || 0);
  }, [mealsState, currentStreak]);

  // Compute accurate best streak from meal history
  const computedBestStreak = useMemo(() => {
    if (!mealsState || mealsState.length === 0) return Math.max(computedCurrentStreak, 0);
    const datesWithLogs = new Set(mealsState.map((m) => m.date));
    const sortedDates = Array.from(datesWithLogs).sort();
    if (sortedDates.length === 0) return computedCurrentStreak;
    let best = 1;
    let current = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1] + "T00:00:00");
      const curr = new Date(sortedDates[i] + "T00:00:00");
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }
    return Math.max(best, computedCurrentStreak);
  }, [mealsState, computedCurrentStreak]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="px-6 mt-8 relative z-10 space-y-6 pb-12 font-sans"
    >
      {/* Page Title & Range Selector Badge */}
      <div className="flex justify-between items-center min-w-0 gap-2">
        <h2 className="text-2xl font-black tracking-tight text-orange-950 truncate">
          Your Progress
        </h2>

        {/* Compact Dropdown Trigger Badge */}
        <button
          onClick={() => setShowCustomPicker(true)}
          className="bg-orange-100/70 hover:bg-orange-200/80 text-orange-950 px-3.5 py-1.5 rounded-full text-xs font-black tracking-tight border border-orange-200/60 flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer select-none shrink-0"
          title="Change time range"
        >
          <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          <span>{getTimeRangeLabel(timeRange)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-orange-600 shrink-0" />
        </button>
      </div>

      {/* Metrics Row (Streak Cards with Minimal Icon-Only Share) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Metric 1: Current Streak */}
        <div className="bg-white/60 backdrop-blur-md p-5 rounded-[24px] border border-white/80 shadow-sm flex flex-col justify-between gap-3 relative">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-xl shadow-inner border border-orange-500/10 select-none">
              🔥
            </div>
            <button
              onClick={() => {
                if (triggerToast) triggerToast("Streak copied to clipboard!");
              }}
              title="Share Streak"
              className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.05em] text-orange-950/50 mb-0.5 leading-tight">
              Current Streak
            </div>
            <div className="text-2xl font-black text-orange-950">
              {computedCurrentStreak} <span className="text-xs font-bold text-orange-900/40 font-sans">Days</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Best Record */}
        <div className="bg-white/60 backdrop-blur-md p-5 rounded-[24px] border border-white/80 shadow-sm flex flex-col justify-between gap-3 relative">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-xl shadow-inner border border-amber-500/10 select-none">
              🏆
            </div>
            <button
              onClick={() => {
                if (triggerToast) triggerToast("Record copied to clipboard!");
              }}
              title="Share Record"
              className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.05em] text-orange-950/50 mb-0.5 leading-tight">
              Best Record
            </div>
            <div className="text-2xl font-black text-orange-950">
              {computedBestStreak} <span className="text-xs font-bold text-orange-900/40 font-sans">Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calories Chart Card (Pure FitAI Brand Styling + Icon-Only Share) */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
              Calories
            </div>
            <div className="text-3xl font-black text-orange-950">
              {avgCalories.toLocaleString()}{" "}
              <span className="text-xs font-bold text-orange-900/40 tracking-normal">
                avg/d <span className="font-medium text-orange-900/40">(avg from {loggedDaysCount} logged days)</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (triggerToast) triggerToast("📊 Calorie report copied!");
            }}
            title="Share Calorie Report"
            className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {!hasAnyData ? (
          <div className="h-48 w-full flex flex-col items-center justify-center text-center">
            <span className="text-3xl mb-2">📊</span>
            <p className="text-xs font-bold text-orange-950/50">No calorie data yet</p>
            <p className="text-[10px] text-orange-950/30 font-medium mt-1">Start logging meals to see your calorie trends</p>
          </div>
        ) : (
          <div className="space-y-1 relative">
            {/* Auto-fading Scrubber Pill for Continuous Range */}
            <AnimatePresence>
              {activeChartScrub?.chartId === "calories" && activeChartScrub.data && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-orange-200/80 shadow-md shadow-orange-500/10 flex items-center gap-2 z-20 pointer-events-none font-sans"
                >
                  <span className="text-[10px] font-bold text-orange-900/60">
                    {formatFullDateLabel(activeChartScrub.data.date)}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-orange-300" />
                  <span className="text-xs font-black text-orange-600 tabular-nums">
                    {activeChartScrub.data.calories ? `${activeChartScrub.data.calories.toLocaleString()} kcal` : "Unlogged"}
                  </span>
                  {activeChartScrub.data.calories && activeChartScrub.data.goal && (
                    <span className={cn(
                      "text-[9px] font-bold tabular-nums",
                      activeChartScrub.data.calories > activeChartScrub.data.goal ? "text-orange-600" : "text-emerald-600"
                    )}>
                      ({activeChartScrub.data.calories > activeChartScrub.data.goal ? "+" : ""}
                      {(activeChartScrub.data.calories - activeChartScrub.data.goal).toLocaleString()})
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {timeRange === "7D" ? (
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      minTickGap={10}
                      tickFormatter={(str) => formatXAxisDateTick(str, totalDaysInRange)}
                      tick={{
                        fontSize: 10,
                        fontWeight: 900,
                        fill: "#7C2D12",
                        opacity: 0.5,
                      }}
                      dy={6}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(255, 112, 8, 0.05)" }}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        background: "rgba(255,255,255,0.9)",
                        backdropFilter: "blur(10px)",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        color: "#431407",
                        fontWeight: 900,
                      }}
                      itemStyle={{ color: "#FF7008", pointerEvents: "none" }}
                    />
                    <ReferenceLine y={profileData?.goals?.dailyCalories || 2000} stroke="#f9731640" strokeDasharray="6 4" strokeWidth={1.5} />
                    <Bar dataKey="calories" radius={[6, 6, 6, 6]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.calories > entry.goal ? "#fed7aa" : "#f97316"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    onMouseMove={(state) => handleChartStateScrub("calories", state)}
                    onTouchMove={(state) => handleChartStateScrub("calories", state)}
                  >
                    <ReferenceLine y={profileData?.goals?.dailyCalories || 2000} stroke="#f9731640" strokeDasharray="6 4" strokeWidth={1.5} />
                    <Line
                      type="monotone"
                      dataKey="calories"
                      connectNulls={true}
                      stroke="#f97316"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
                      activeDot={{
                        r: 6,
                        fill: "#f97316",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Minimalist Date Range Footer for Long Range Views */}
            {timeRange !== "7D" && (
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-orange-950/40 px-2 pt-1 border-t border-black/[0.04]">
                <span>{formatShortMonthDay(dateRangeBounds.start)}</span>
                <span className="text-[9px] font-bold text-orange-950/30 lowercase tracking-normal">slide across chart to inspect</span>
                <span>{formatShortMonthDay(dateRangeBounds.end)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hyper-Accurate Metabolism (TDEE) Card */}
      {profileData?.agent_config?.trackWeight !== false && (
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                <span>Daily Metabolism (TDEE)</span>
              </div>
              <div className="text-3xl font-black text-orange-950">
                {tdeeStats.isRealAI ? (
                  <>
                    {tdeeStats.tdee.toLocaleString()}{" "}
                    <span className="text-xs font-bold text-orange-900/40 tracking-normal font-sans">
                      kcal/day est
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-orange-950/30 font-mono">--</span>{" "}
                    <span className="text-xs font-bold text-orange-900/40 tracking-normal font-sans">
                      kcal/day
                    </span>
                  </>
                )}
              </div>
              <p className="text-[10px] font-semibold text-orange-900/50 mt-0.5">
                {tdeeStats.isRealAI ? (
                  <span className="text-emerald-700 font-bold">
                    ✨ Adaptive AI Model (from {tdeeStats.daysSampled} logged days)
                  </span>
                ) : (
                  "Standard Mifflin-St Jeor estimate (Log 7+ days with weight for Adaptive AI)"
                )}
              </p>
            </div>

            <button
              onClick={() => setShowTdeeInfoModal(true)}
              className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
              title="How is TDEE calculated?"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11px] font-bold text-orange-950/70">
            <span>Adaptive Metabolism Insight</span>
            <span className="text-orange-600 font-extrabold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {tdeeStats.isRealAI ? "Active Tracking" : "Standard Model"}
            </span>
          </div>
        </div>
      )}

      {/* Weight Tracking Card */}
      {profileData?.agent_config?.trackWeight !== false && (
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
                Average Weight (kg)
              </div>
              <div className="text-3xl font-black text-orange-950">
                {filteredWeightData.length > 0 ? (
                  <>
                    {weightStats.avgWeight}{" "}
                    <span className="text-xs font-bold text-orange-900/40 tracking-normal font-sans">
                      kg avg <span className="font-medium text-orange-900/40">(avg from {filteredWeightData.length} logged days)</span>
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-orange-950/40">No logs in range</span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                if (triggerToast) triggerToast("📈 Weight report copied!");
              }}
              title="Share Weight Progress"
              className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recharts Area Chart */}
          <div className="space-y-1 relative z-0">
            <AnimatePresence>
              {activeChartScrub?.chartId === "weight" && activeChartScrub.data && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-orange-200/80 shadow-md shadow-orange-500/10 flex items-center gap-2 z-20 pointer-events-none font-sans"
                >
                  <span className="text-[10px] font-bold text-orange-900/60">
                    {formatFullDateLabel(activeChartScrub.data.date)}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-orange-300" />
                  <span className="text-xs font-black text-orange-600 tabular-nums">
                    {activeChartScrub.data.weight} kg
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {filteredWeightData.length > 0 ? (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={filteredWeightData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      onMouseMove={(state) => handleChartStateScrub("weight", state)}
                      onTouchMove={(state) => handleChartStateScrub("weight", state)}
                    >
                      <defs>
                        <linearGradient id="insightsWeightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                      <YAxis 
                        domain={['dataMin - 0.5', 'dataMax + 0.5']} 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fontSize: 9, fill: "#7C2D12", opacity: 0.4, fontWeight: "bold" }}
                      />
                      <Area type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#insightsWeightGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Minimalist Date Range Footer */}
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-orange-950/40 px-2 pt-1 border-t border-black/[0.04]">
                  <span>{formatShortMonthDay(dateRangeBounds.start)}</span>
                  <span className="text-[9px] font-bold text-orange-950/30 lowercase tracking-normal">slide across chart to inspect</span>
                  <span>{formatShortMonthDay(dateRangeBounds.end)}</span>
                </div>
              </>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <Scale className="w-8 h-8 text-orange-950/20" />
                <span className="text-xs font-bold text-orange-900/40 mt-2">No weight logs recorded in this range</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Nutrient Tracking Carousel Card (2 Slides: List View & Trend Chart) */}
      {periodNutrientStats && periodNutrientStats.length > 0 && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.x < -30 || info.velocity.x < -200) {
              setNutrientSlide((prev) => (prev + 1) % 2);
            } else if (info.offset.x > 30 || info.velocity.x > 200) {
              setNutrientSlide((prev) => (prev - 1 + 2) % 2);
            }
          }}
          className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-4 font-sans relative overflow-hidden touch-pan-y select-none cursor-grab active:cursor-grabbing"
        >
          {/* Card Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
                Nutrient Tracking {nutrientSlide === 0 ? "(List)" : "(Trend Chart)"}
              </div>
              <div className="text-xs font-bold text-orange-900/60 font-sans">
                avg from {loggedDaysCount} logged days
              </div>
            </div>

            <button
              onClick={() => {
                if (triggerToast) triggerToast("🥗 Nutrient report copied!");
              }}
              title="Share Nutrient Tracking"
              className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Slide 0: Stacked Progress List */}
          {nutrientSlide === 0 && (
            <motion.div
              key="slide-list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-3 pt-1 min-h-[160px]"
            >
              {periodNutrientStats.map((n, idx) => {
                const isZero = n.avgDaily === 0;
                const statusBadgeText = isZero ? "0%" : `${n.pct}%`;

                const statusBg = isZero
                  ? "bg-stone-100 text-stone-400 border-stone-200"
                  : n.pct >= 90
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                  : n.pct >= 70
                  ? "bg-sky-50 text-sky-700 border-sky-200/60"
                  : "bg-amber-50 text-amber-700 border-amber-200/60";

                return (
                  <div
                    key={n.id}
                    className="bg-white/80 rounded-2xl p-4 border border-orange-100/60 shadow-xs space-y-2.5"
                  >
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: n.color }}
                        />
                        <span className="font-extrabold text-sm tracking-tight text-orange-950 truncate">
                          {n.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black text-orange-950 font-mono">
                          {n.avgDaily}<span className="text-[10px] text-orange-900/50 font-bold font-sans ml-0.5">{n.unit}</span>
                        </span>
                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border font-mono", statusBg)}>
                          {statusBadgeText}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-orange-100/40 h-2 rounded-full overflow-hidden border border-orange-200/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${n.pct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 }}
                        className="h-full rounded-full transition-all"
                        style={{ backgroundColor: n.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Slide 1: Multi-Nutrient Trend Chart */}
          {nutrientSlide === 1 && (
            <motion.div
              key="slide-chart"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-1 pt-2"
            >
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        background: "rgba(255,255,255,0.9)",
                        backdropFilter: "blur(10px)",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        color: "#431407",
                        fontWeight: 900,
                        fontSize: 11,
                      }}
                    />
                    {periodNutrientStats.map((n) => (
                      <Line
                        key={n.id}
                        type="monotone"
                        dataKey={n.id}
                        connectNulls={true}
                        stroke={n.color}
                        strokeWidth={2.5}
                        dot={false}
                        name={`${n.name} (${n.unit})`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Minimalist Date Range Footer */}
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-orange-950/40 px-2 pt-1 border-t border-black/[0.04]">
                <span>{formatShortMonthDay(dateRangeBounds.start)}</span>
                <span className="text-[9px] font-bold text-orange-950/30 lowercase tracking-normal">slide across chart to inspect</span>
                <span>{formatShortMonthDay(dateRangeBounds.end)}</span>
              </div>
            </motion.div>
          )}

          {/* Pagination Dots at Bottom Center (● ○) */}
          <div className="flex justify-center items-center gap-2 pt-2 pb-1">
            {[0, 1].map((idx) => (
              <button
                key={idx}
                onClick={() => setNutrientSlide(idx)}
                title={`Switch to slide ${idx + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all cursor-pointer",
                  nutrientSlide === idx
                    ? "w-6 bg-orange-500 shadow-xs"
                    : "w-2 bg-orange-200/80 hover:bg-orange-300",
                )}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* 1. Dedicated Water Hydration Card (Respects trackWater config) */}
      {profileData?.agent_config?.trackWater !== false && (
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-4 font-sans">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-100/70 text-sky-600 flex items-center justify-center border border-sky-200/50 shadow-2xs">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-0.5">
                  Water Hydration
                </div>
                <div className="text-2xl font-black text-orange-950">
                  {waterStats.count > 0 ? (
                    <>
                      {waterStats.avg}{" "}
                      <span className="text-xs font-bold text-orange-900/40 tracking-normal font-sans">
                        L avg/d <span className="font-medium text-sky-600 font-bold">({waterStats.goal}L daily goal)</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-black text-orange-950/40">No logs in range</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (triggerToast) triggerToast("💧 Water report copied!");
              }}
              title="Share Water Intake"
              className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic Water Intake Bar Chart */}
          <div className="space-y-1 relative pt-2">
            <AnimatePresence>
              {activeChartScrub?.chartId === "water" && activeChartScrub.data && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-sky-200/80 shadow-md shadow-sky-500/10 flex items-center gap-2 z-20 pointer-events-none font-sans"
                >
                  <span className="text-[10px] font-bold text-sky-900/60">
                    {formatFullDateLabel(activeChartScrub.data.date)}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-sky-300" />
                  <span className="text-xs font-black text-sky-600 tabular-nums">
                    {activeChartScrub.data.water ?? 0} L
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {waterStats.count > 0 ? (
              <>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dynamicVitalsChartData}
                      margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
                      onMouseMove={(state) => handleChartStateScrub("water", state)}
                      onTouchMove={(state) => handleChartStateScrub("water", state)}
                    >
                      <YAxis domain={[0, 'dataMax + 0.5']} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#7C2D12", opacity: 0.4, fontWeight: "bold" }} />
                      <ReferenceLine y={waterStats.goal} stroke="#38BDF8" strokeDasharray="4 4" strokeWidth={1.5} />
                      <Bar dataKey="water" fill="#38BDF8" radius={[6, 6, 6, 6]} name="Water (L)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Minimalist Date Range Footer */}
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-orange-950/40 px-2 pt-1 border-t border-black/[0.04]">
                  <span>{formatShortMonthDay(dateRangeBounds.start)}</span>
                  <span className="text-[9px] font-bold text-orange-950/30 lowercase tracking-normal">slide across chart to inspect</span>
                  <span>{formatShortMonthDay(dateRangeBounds.end)}</span>
                </div>
              </>
            ) : (
              <div className="h-36 flex flex-col items-center justify-center text-center p-4">
                <Droplets className="w-8 h-8 text-orange-950/20" />
                <span className="text-xs font-bold text-orange-900/40 mt-2">No water logs recorded in this range</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Dedicated Energy Levels Card (Respects trackEnergy config) */}
      {profileData?.agent_config?.trackEnergy !== false && (
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-4 font-sans">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100/70 text-amber-600 flex items-center justify-center border border-amber-200/50 shadow-2xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-0.5">
                  Energy Levels
                </div>
                <div className="text-2xl font-black text-orange-950">
                  {energyStats.avg > 0 ? (
                    <>
                      {energyStats.avg}{" "}
                      <span className="text-xs font-bold text-orange-900/40 tracking-normal font-sans">
                        / 5.0 <span className="font-medium text-amber-600 font-bold">({energyStats.label})</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-black text-orange-950/40">No logs in range</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (triggerToast) triggerToast("⚡ Energy report copied!");
              }}
              title="Share Energy Level"
              className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic Energy Level Line Chart */}
          <div className="space-y-1 relative pt-2">
            <AnimatePresence>
              {activeChartScrub?.chartId === "energy" && activeChartScrub.data && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-amber-200/80 shadow-md shadow-amber-500/10 flex items-center gap-2 z-20 pointer-events-none font-sans"
                >
                  <span className="text-[10px] font-bold text-amber-900/60">
                    {formatFullDateLabel(activeChartScrub.data.date)}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-amber-300" />
                  <span className="text-xs font-black text-amber-600 tabular-nums">
                    Level {activeChartScrub.data.energy ?? "-"} / 5.0
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {energyStats.count > 0 ? (
              <>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dynamicVitalsChartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      onMouseMove={(state) => handleChartStateScrub("energy", state)}
                      onTouchMove={(state) => handleChartStateScrub("energy", state)}
                    >
                      <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#7C2D12", opacity: 0.4, fontWeight: "bold" }} />
                      <Line type="monotone" dataKey="energy" connectNulls={true} stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: "#F59E0B", stroke: "#fff", strokeWidth: 2 }} name="Energy (1-5)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Minimalist Date Range Footer */}
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-orange-950/40 px-2 pt-1 border-t border-black/[0.04]">
                  <span>{formatShortMonthDay(dateRangeBounds.start)}</span>
                  <span className="text-[9px] font-bold text-orange-950/30 lowercase tracking-normal">slide across chart to inspect</span>
                  <span>{formatShortMonthDay(dateRangeBounds.end)}</span>
                </div>
              </>
            ) : (
              <div className="h-36 flex flex-col items-center justify-center text-center p-4">
                <Zap className="w-8 h-8 text-orange-950/20" />
                <span className="text-xs font-bold text-orange-900/40 mt-2">No energy logs recorded in this range</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Dedicated Bloating Severity Card (Respects trackBloating config) */}
      {profileData?.agent_config?.trackBloating !== false && (
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-4 font-sans text-left">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-0.5">
                Bloating Severity
              </div>
              <div className="text-2xl font-black text-orange-950">
                {bloatingStats.avg > 0 ? (
                  <>
                    {bloatingStats.avg}{" "}
                    <span className="text-xs font-bold text-orange-900/40 tracking-normal font-sans">
                      / 5.0 <span className={cn("font-bold", bloatingStats.badgeBg)}>({bloatingStats.label})</span>
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-black text-orange-950/40">No logs in range</span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                if (triggerToast) triggerToast("Bloating report copied!");
              }}
              title="Share Bloating Report"
              className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic Bloating Level Line Chart */}
          <div className="space-y-1 relative pt-2">
            <AnimatePresence>
              {activeChartScrub?.chartId === "bloating" && activeChartScrub.data && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-rose-200/80 shadow-md shadow-rose-500/10 flex items-center gap-2 z-20 pointer-events-none font-sans"
                >
                  <span className="text-[10px] font-bold text-rose-900/60">
                    {formatFullDateLabel(activeChartScrub.data.date)}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-rose-300" />
                  <span className="text-xs font-black text-rose-600 tabular-nums">
                    Level {activeChartScrub.data.bloating ?? "-"} / 5.0
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {bloatingStats.count > 0 ? (
              <>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dynamicVitalsChartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      onMouseMove={(state) => handleChartStateScrub("bloating", state)}
                      onTouchMove={(state) => handleChartStateScrub("bloating", state)}
                    >
                      <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#7C2D12", opacity: 0.4, fontWeight: "bold" }} />
                      <Line type="monotone" dataKey="bloating" connectNulls={true} stroke="#F43F5E" strokeWidth={3} dot={{ r: 4, fill: "#F43F5E", stroke: "#fff", strokeWidth: 2 }} name="Bloating (1-5)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Minimalist Date Range Footer */}
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-orange-950/40 px-2 pt-1 border-t border-black/[0.04]">
                  <span>{formatShortMonthDay(dateRangeBounds.start)}</span>
                  <span className="text-[9px] font-bold text-orange-950/30 lowercase tracking-normal">slide across chart to inspect</span>
                  <span>{formatShortMonthDay(dateRangeBounds.end)}</span>
                </div>
              </>
            ) : (
              <div className="h-36 flex flex-col items-center justify-center text-center p-4">
                <Wind className="w-8 h-8 text-orange-950/20" />
                <span className="text-xs font-bold text-orange-900/40 mt-2">No bloating logs recorded in this range</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Dedicated Digestion Card (Respects trackDigestion config) */}
      {profileData?.agent_config?.trackDigestion !== false && (
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-4 font-sans text-left">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-0.5">
                Digestion (Bristol Scatter)
              </div>
              <div className="text-2xl font-black text-orange-950 flex flex-wrap items-baseline gap-2">
                {digestionStats.count > 0 ? (
                  <>
                    <span>Type {digestionStats.avgType}</span>
                    <span className="text-xs font-bold text-emerald-600 tracking-normal font-sans">
                      {digestionStats.label}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-black text-orange-950/40">No logs in range</span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                if (triggerToast) triggerToast("Digestion report copied!");
              }}
              title="Share Digestion Report"
              className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic Multi-Dot Scatter Chart */}
          <div className="space-y-1 relative pt-2">
            <AnimatePresence>
              {activeChartScrub?.chartId === "digestion" && activeChartScrub.data && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-200/80 shadow-md shadow-emerald-500/10 flex items-center gap-2 z-20 pointer-events-none font-sans"
                >
                  <span className="text-[10px] font-bold text-emerald-950/70">
                    {formatFullDateLabel(activeChartScrub.data.date)} {activeChartScrub.data.time ? `at ${activeChartScrub.data.time}` : ""}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span className="text-xs font-black text-emerald-600 tabular-nums">
                    {activeChartScrub.data.label || `Type ${activeChartScrub.data.type}`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {digestionStats.count > 0 ? (
              <>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      onMouseMove={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length) {
                          triggerChartScrub("digestion", state.activePayload[0].payload);
                        }
                      }}
                      onTouchMove={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length) {
                          triggerChartScrub("digestion", state.activePayload[0].payload);
                        }
                      }}
                    >
                      <ReferenceLine y={3} stroke="#10B981" strokeDasharray="4 4" strokeWidth={1.5} />
                      <ReferenceLine y={4} stroke="#10B981" strokeDasharray="4 4" strokeWidth={1.5} />
                      <YAxis domain={[1, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#7C2D12", opacity: 0.4, fontWeight: "bold" }} tickFormatter={(val) => `Type ${val}`} />
                      <ZAxis range={[60, 60]} />
                      <Scatter data={dynamicDigestionScatterData} dataKey="type">
                        {dynamicDigestionScatterData.map((entry, index) => (
                          <Cell key={`scatter-cell-${index}`} fill={entry.fill} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Minimalist Date Range Footer */}
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-orange-950/40 px-2 pt-1 border-t border-black/[0.04]">
                  <span>{formatShortMonthDay(dateRangeBounds.start)}</span>
                  <span className="text-[9px] font-bold text-orange-950/30 lowercase tracking-normal">slide across chart to inspect</span>
                  <span>{formatShortMonthDay(dateRangeBounds.end)}</span>
                </div>
              </>
            ) : (
              <div className="h-36 flex flex-col items-center justify-center text-center p-4">
                <Activity className="w-8 h-8 text-orange-950/20" />
                <span className="text-xs font-bold text-orange-900/40 mt-2">No digestion logs recorded in this range</span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex justify-between items-center text-[10px] font-black text-orange-950/60 pt-1 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Optimal (Type 3–4)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Constipated (Type 1–2)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Loose (Type 5–7)
            </span>
          </div>
        </div>
      )}

      {/* 5. Dedicated Eating Habits & Meal Tags Card */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-5 font-sans text-left">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-0.5">
              Eating Habits & Tags
            </div>
            <div className="text-xs font-bold text-orange-900/60 font-sans">
              based on {eatingHabitsStats.totalMeals} logged meals
            </div>
          </div>

          <button
            onClick={() => {
              if (triggerToast) triggerToast("Eating Habits report copied!");
            }}
            title="Share Eating Habits"
            className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {eatingHabitsStats.totalMeals > 0 ? (
          <>
            {/* Dynamic Habit Proportion Bar */}
            {eatingHabitsStats.topProportions.length > 0 && (
              <div className="space-y-2">
                <div className="w-full h-4 bg-orange-100/50 rounded-full overflow-hidden flex border border-orange-200/30">
                  {eatingHabitsStats.topProportions.map((p, pIdx) => {
                    const colors = ["bg-orange-500", "bg-sky-400", "bg-amber-400"];
                    return (
                      <div
                        key={p.tag}
                        className={cn("h-full transition-all", colors[pIdx % colors.length])}
                        style={{ width: `${p.rawPct}%` }}
                        title={`${p.tag} (${p.pct})`}
                      />
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-[10px] font-black text-orange-950/60 px-1 flex-wrap gap-2">
                  {eatingHabitsStats.topProportions.map((p, pIdx) => {
                    const dotColors = ["bg-orange-500", "bg-sky-400", "bg-amber-400"];
                    return (
                      <span key={p.tag} className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full", dotColors[pIdx % dotColors.length])} />
                        {p.tag} ({p.pct})
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meal Tag Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {eatingHabitsStats.tagCounts.map((item, idx) => (
                <div key={idx} className="bg-white/80 border border-orange-100/80 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xs">
                  <span className="text-xs font-extrabold text-orange-950">{item.tag}</span>
                  <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md font-mono">
                    {item.count} {item.count === 1 ? "meal" : "meals"} ({item.pct})
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <Utensils className="w-8 h-8 text-orange-950/20" />
            <span className="text-xs font-bold text-orange-900/40 mt-2">No meals logged in this date range</span>
          </div>
        )}
      </div>

      {/* TIME RANGE PICKER BOTTOM SHEET MODAL (PORTAL TO BODY) */}
      {showCustomPicker &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-end justify-center font-sans"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCustomPicker(false);
            }}
          >
            <div
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm cursor-pointer touch-none"
              onClick={() => setShowCustomPicker(false)}
            />
            <div className="w-full max-w-md bg-[#FAF7F2] rounded-t-[36px] p-6 pb-[max(20px,env(safe-area-inset-bottom,20px))] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-x border-stone-200/80 space-y-5 font-sans relative z-10 overscroll-contain touch-pan-y animate-slide-up text-left">
              {/* Top Drag Indicator Pill */}
              <div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-1 shrink-0 select-none" />

              <div className="flex justify-between items-center pb-2 border-b border-stone-200/60 select-none">
                <div>
                  <h3 className="text-base font-black text-orange-950">Select Time Range</h3>
                  <p className="text-[10px] text-stone-400 font-semibold mt-0.5">
                    Choose a quick preset or set custom dates
                  </p>
                </div>
                <button
                  onClick={() => setShowCustomPicker(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors cursor-pointer border-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Presets Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">
                  Quick Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "7D", label: "7 Days" },
                    { id: "14D", label: "14 Days" },
                    { id: "30D", label: "30 Days" },
                    { id: "60D", label: "60 Days" },
                    { id: "90D", label: "90 Days" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setTimeRange(item.id as TimeRangeOption);
                        setShowCustomPicker(false);
                      }}
                      className={cn(
                        "py-2.5 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer border text-center active:scale-95 shadow-3xs",
                        timeRange === item.id
                          ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                          : "bg-white text-stone-700 border-stone-200/80 hover:bg-orange-50"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Pickers */}
              <div className="space-y-3 pt-2 border-t border-stone-200/60">
                <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">
                  Custom Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white border border-stone-200/80 rounded-2xl p-3 shadow-3xs">
                    <span className="text-[9px] font-black uppercase text-stone-400 block mb-1">Start Date</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value);
                        setTimeRange("custom");
                      }}
                      className="w-full text-xs font-bold text-stone-800 bg-transparent border-none focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div className="bg-white border border-stone-200/80 rounded-2xl p-3 shadow-3xs">
                    <span className="text-[9px] font-black uppercase text-stone-400 block mb-1">End Date</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value);
                        setTimeRange("custom");
                      }}
                      className="w-full text-xs font-bold text-stone-800 bg-transparent border-none focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCustomPicker(false)}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/20 active:scale-98 transition-all cursor-pointer border-none"
              >
                Apply Time Range
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* TDEE FORMULA & SCIENCE MODAL (PORTAL TO BODY) */}
      {showTdeeInfoModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-end justify-center font-sans"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowTdeeInfoModal(false);
            }}
          >
            <div
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm cursor-pointer touch-none"
              onClick={() => setShowTdeeInfoModal(false)}
            />
            <div className="bg-[#FAF7F2] rounded-t-[36px] p-6 pb-[max(20px,env(safe-area-inset-bottom,20px))] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-x border-stone-200/80 max-w-md w-full max-h-[85vh] overflow-y-auto space-y-4 font-sans relative z-10 overscroll-contain touch-pan-y text-left">
              {/* Top Drag Indicator Pill */}
              <div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-1 shrink-0 select-none" />

              <div className="flex justify-between items-center pb-2 border-b border-stone-200/60 select-none">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500 shrink-0" />
                  <h3 className="text-base font-black text-orange-950">
                    TDEE Calculation Science
                  </h3>
                </div>
                <button
                  onClick={() => setShowTdeeInfoModal(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors cursor-pointer border-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-orange-950/80 leading-relaxed">
                <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-3xs">
                  <div className="font-extrabold text-orange-950 mb-1 flex items-center gap-1">
                    <span>1. Basal Metabolic Rate (BMR)</span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Your resting burn is calculated using the established Mifflin-St Jeor formula based on your age, height, weight, and gender.
                  </p>
                </div>

                <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-3xs">
                  <div className="font-extrabold text-orange-950 mb-1">
                    2. Weight Change Calorie Impact
                  </div>
                  <p className="text-[11px] text-stone-600">
                    1 kg of body tissue equals ~7,700 kcal. FitAI measures your weight trend change over the selected days to find your daily calorie impact:
                  </p>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-2.5 mt-2 font-mono text-[10px] text-orange-900 font-bold">
                    Calorie Impact = (Weight Delta kg × 7,700) ÷ Days
                  </div>
                </div>

                <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-3xs">
                  <div className="font-extrabold text-orange-950 mb-1">
                    3. True AI TDEE Formula
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Combining your average logged intake with your weight trend delta reveals your actual real-world metabolism:
                  </p>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-2.5 mt-2 font-mono text-[10px] text-orange-900 font-bold">
                    Real TDEE = Avg Daily Intake - Calorie Impact
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-amber-900 text-[11px]">
                  <span className="font-extrabold block mb-0.5">⚠️ Tracking Consistency Warning:</span>
                  If you miss logging meals or scale weight for multiple days, your calculated TDEE will lose precision. Consistent daily tracking unlocks maximum accuracy!
                </div>
              </div>

              <button
                onClick={() => setShowTdeeInfoModal(false)}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/20 active:scale-98 transition-all cursor-pointer border-none mt-2"
              >
                Got It
              </button>
            </div>
          </div>,
          document.body
        )}
    </motion.div>
  );
};
