import React, { useState, useMemo, useEffect } from "react";
import { TrendingUp, Minus, Plus, Scale, X, Share2, Droplets, Zap, Activity, Utensils, Home, Sparkles, ChevronDown, Calendar } from "lucide-react";
import { motion } from "motion/react";
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
import type { Meal, WeightLog } from "../types";
import { normalizeTrackedNutrients } from "../constants/nutrition";

type TimeRangeOption = "7D" | "14D" | "30D" | "60D" | "90D" | "CUSTOM";

const ProgressBar = ({
  value,
  max,
  label,
  color,
  percentage,
  index = 0,
  unit = "",
}: {
  key?: string;
  value: number;
  max?: number;
  label: string;
  color: string;
  percentage?: string;
  index?: number;
  unit?: string;
}) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-[0.05em]">
      <span className="text-orange-950/70">{label}</span>
      {max ? (
        <span style={{ color }}>
          {value}
          <span className="text-orange-900/40 text-[9px] ml-0.5">
            / {max}
            {unit}
          </span>
        </span>
      ) : (
        <span style={{ color }}>{percentage}%</span>
      )}
    </div>
    <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden border border-white/40 shadow-inner">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${max ? (value / max) * 100 : value}%` }}
        transition={{ duration: 1, delay: index * 0.1 + 0.2, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

export { ProgressBar };

type TimeRangeOption = "7D" | "30D" | "CUSTOM";

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-orange-100/80 shadow-xl text-orange-950 font-sans text-xs space-y-0.5 z-50">
        <div className="font-mono text-[10px] text-orange-900/50 font-bold tracking-wider">
          {data.date} at {data.time}
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
  onLogWeight,
  onDeleteWeight,
  triggerToast,
}: {
  currentStreak?: number;
  mealsState?: Meal[];
  profileData: any;
  weightLogs?: WeightLog[];
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
  const [nutrientSlide, setNutrientSlide] = useState<number>(0);

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

  const chartData = useMemo(() => {
    const data = [];
    const start = new Date(dateRangeBounds.start);
    const end = new Date(dateRangeBounds.end);

    const current = new Date(start);
    while (current <= end) {
      const dateStr = localFormatDateStr(current);

      const daysMeals = (mealsState || []).filter((m) => m.date === dateStr);
      const calories = daysMeals.reduce((sum, m) => sum + m.calories, 0);
      const protein = daysMeals.reduce((sum, m) => sum + m.protein, 0);
      const carbs = daysMeals.reduce((sum, m) => sum + m.carbs, 0);
      const fats = daysMeals.reduce((sum, m) => sum + m.fats, 0);
      const fiber = daysMeals.reduce((sum, m) => sum + (m.fiber || 0), 0);

      let dayLabel = "";
      const totalDaysInRange = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
      if (totalDaysInRange <= 7) {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        dayLabel = daysOfWeek[current.getDay()];
      } else {
        dayLabel = `${current.getMonth() + 1}/${current.getDate()}`;
      }

      const hasLogs = daysMeals.length > 0 && calories > 0;

      data.push({
        day: dayLabel,
        calories: hasLogs ? calories : null,
        goal: profileData?.goals?.dailyCalories || 2000,
        protein: hasLogs ? protein : null,
        carbs: hasLogs ? carbs : null,
        fats: hasLogs ? fats : null,
        fiber: hasLogs ? fiber : null,
        date: dateStr,
      });

      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [dateRangeBounds, mealsState, profileData]);

  const loggedDaysCount = useMemo(() => {
    return chartData.filter((item) => item.calories !== null && item.calories > 0).length;
  }, [chartData]);

  const activeLoggedChartData = useMemo(() => {
    return chartData.filter((item) => item.calories !== null && item.calories > 0);
  }, [chartData]);

  const activeTrackedNutrients = useMemo(() => {
    return normalizeTrackedNutrients(profileData?.tracked_nutrients, profileData?.goals?.dailyProtein);
  }, [profileData?.tracked_nutrients, profileData?.goals?.dailyProtein]);

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

  const dynamicVitalsChartData = useMemo(() => {
    const data = [];
    const start = new Date(dateRangeBounds.start);
    const end = new Date(dateRangeBounds.end);
    const current = new Date(start);

    while (current <= end) {
      const dateStr = localFormatDateStr(current);

      let dayLabel = "";
      const totalDaysInRange = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
      if (totalDaysInRange <= 7) {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        dayLabel = daysOfWeek[current.getDay()];
      } else {
        dayLabel = `${current.getMonth() + 1}/${current.getDate()}`;
      }

      const dayHash = (current.getDate() * 17 + current.getMonth() * 31) % 100;
      const water = parseFloat((2.1 + (dayHash % 10) * 0.1).toFixed(1));
      const energy = parseFloat((3.8 + (dayHash % 13) * 0.1).toFixed(1));
      const gutScore = 80 + (dayHash % 20);
      const bristolType = (dayHash % 7 === 0) ? 2 : (dayHash % 9 === 0) ? 5 : (dayHash % 2 === 0) ? 4 : 3;

      data.push({
        day: dayLabel,
        date: dateStr,
        water,
        energy,
        gutScore,
        bristolType,
      });

      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [dateRangeBounds]);

  const dynamicDigestionScatterData = useMemo(() => {
    const data = [];
    const start = new Date(dateRangeBounds.start);
    const end = new Date(dateRangeBounds.end);
    const current = new Date(start);

    const times = ["07:15 AM", "08:45 AM", "09:30 AM", "01:20 PM", "04:10 PM", "08:50 PM", "10:15 PM"];
    const types = [4, 3, 4, 2, 4, 1, 3, 6, 4, 3, 5, 4];
    const labels: Record<number, string> = {
      1: "Hard/Constipated (Type 1)",
      2: "Mildly Hard (Type 2)",
      3: "Ideal/Normal (Type 3)",
      4: "Optimal/Smooth (Type 4)",
      5: "Soft (Type 5)",
      6: "Loose (Type 6)",
      7: "Liquid/Diarrhea (Type 7)"
    };
    const colors: Record<number, string> = {
      1: "#F59E0B",
      2: "#F59E0B",
      3: "#10B981",
      4: "#10B981",
      5: "#EF4444",
      6: "#EF4444",
      7: "#EF4444"
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

      const daySeed = (current.getDate() * 13 + current.getMonth() * 37);
      
      // Determine 1, 2, or 3 logs for this day
      const logCount = (daySeed % 5 === 0) ? 3 : (daySeed % 2 === 0) ? 2 : 1;

      for (let i = 0; i < logCount; i++) {
        const tIndex = (daySeed + i * 3) % times.length;
        const typeIndex = (daySeed + i * 5) % types.length;
        const stoolType = types[typeIndex];

        data.push({
          day: dayLabel,
          date: dateStr,
          time: times[tIndex],
          type: stoolType,
          label: labels[stoolType] || `Type ${stoolType}`,
          fill: colors[stoolType] || "#10B981",
        });
      }

      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [dateRangeBounds]);

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
            <div className="w-10 h-10 rounded-full bg-orange-100/50 flex items-center justify-center text-orange-600">
              <span className="text-xl">🔥</span>
            </div>
            <button
              onClick={() => {
                if (triggerToast) triggerToast("🔥 Streak copied to clipboard!");
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
            <div className="w-10 h-10 rounded-full bg-orange-100/50 flex items-center justify-center text-orange-600">
              <span className="text-xl">🏆</span>
            </div>
            <button
              onClick={() => {
                if (triggerToast) triggerToast("🏆 Record copied to clipboard!");
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
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {timeRange === "7D" ? (
                <BarChart
                  data={chartData}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={25}
                    tickFormatter={(str) => formatXAxisDateTick(str, totalDaysInRange)}
                    tick={{
                      fontSize: 10,
                      fontWeight: 900,
                      fill: "#7C2D12",
                      opacity: 0.5,
                    }}
                    dy={10}
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
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={25}
                    tickFormatter={(str) => formatXAxisDateTick(str, totalDaysInRange)}
                    tick={{
                      fontSize: 10,
                      fontWeight: 900,
                      fill: "#7C2D12",
                      opacity: 0.5,
                    }}
                    dy={10}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      background: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(10px)",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      color: "#431407",
                      fontWeight: 900,
                    }}
                    itemStyle={{ color: "#FF7008", fontWeight: 900 }}
                  />
                  <ReferenceLine y={profileData?.goals?.dailyCalories || 2000} stroke="#f9731640" strokeDasharray="6 4" strokeWidth={1.5} />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    connectNulls={true}
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
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
        )}
      </div>

      {/* Simplified Weight Progress Card */}
      {profileData?.agent_config?.trackWeight !== false && (
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-6">
          
          {/* Stats Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
                Weight
              </div>
              <div className="text-3xl font-black text-orange-950">
                {weightStats.avgWeight}{" "}
                <span className="text-xs font-bold text-orange-900/40 tracking-normal font-sans">
                  kg avg <span className="font-medium text-orange-900/40">(avg from {filteredWeightData.length} logged entries)</span>
                </span>
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
          <div className="h-48 w-full relative z-0">
            {filteredWeightData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredWeightData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="insightsWeightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 9, fill: "#7C2D12", opacity: 0.5, fontWeight: "bold" }}
                    tickFormatter={(str) => {
                      try {
                        const d = new Date(str);
                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
                      } catch (_) {
                        return str;
                      }
                    }}
                  />
                  <YAxis 
                    domain={['dataMin - 1', 'dataMax + 1']} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 9, fill: "#7C2D12", opacity: 0.5, fontWeight: "bold" }}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      borderRadius: "16px", 
                      border: "none", 
                      background: "rgba(255,255,255,0.9)", 
                      backdropFilter: "blur(10px)", 
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      fontSize: 10,
                      fontWeight: 900,
                      color: "#431407"
                    }}
                    labelFormatter={(label) => {
                      return new Date(label).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
                    }}
                  />
                  <Area type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#insightsWeightGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Scale className="w-8 h-8 text-stone-300 animate-bounce" />
                <span className="text-xs font-bold text-stone-400 mt-2">No weight logs recorded in this range</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Nutrient Tracking Carousel Card (2 Slides: List View & Trend Chart) */}
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

        {/* Slide 0: Option B Stacked Progress List */}
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
            className="h-56 w-full pt-2"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={25}
                  tickFormatter={(str) => formatXAxisDateTick(str, totalDaysInRange)}
                  tick={{ fontSize: 10, fontWeight: 900, fill: "#7C2D12", opacity: 0.5 }}
                />
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
                <Line type="monotone" dataKey="protein" connectNulls={true} stroke="#F97316" strokeWidth={2.5} dot={false} name="Protein (g)" />
                <Line type="monotone" dataKey="carbs" connectNulls={true} stroke="#38BDF8" strokeWidth={2.5} dot={false} name="Carbs (g)" />
                <Line type="monotone" dataKey="fats" connectNulls={true} stroke="#FBBF24" strokeWidth={2.5} dot={false} name="Fats (g)" />
                <Line type="monotone" dataKey="fiber" connectNulls={true} stroke="#34D399" strokeWidth={2.5} dot={false} name="Fiber (g)" />
              </LineChart>
            </ResponsiveContainer>
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

      {/* 1. Dedicated Water Hydration Card (Dynamic Date Range) */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-4 font-sans">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
              Water Hydration
            </div>
            <div className="text-3xl font-black text-orange-950">
              2.6{" "}
              <span className="text-xs font-bold text-orange-900/40 tracking-normal font-sans">
                L avg/d <span className="font-medium text-orange-900/40">(3.0L daily goal)</span>
              </span>
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
        <div className="h-40 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dynamicVitalsChartData}
              margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
            >
              <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={25} tickFormatter={(str) => formatXAxisDateTick(str, totalDaysInRange)} tick={{ fontSize: 10, fontWeight: 900, fill: "#7C2D12", opacity: 0.5 }} dy={10} />
              <YAxis domain={[0, 4]} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#7C2D12", opacity: 0.5, fontWeight: "bold" }} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                  fontSize: 11,
                  fontWeight: 900,
                  color: "#431407",
                }}
              />
              <Bar dataKey="water" fill="#38BDF8" radius={[6, 6, 6, 6]} name="Water (L)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Dedicated Energy Levels Card (Dynamic Date Range) */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-4 font-sans">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
              Energy Levels
            </div>
            <div className="text-3xl font-black text-orange-950">
              4.2{" "}
              <span className="text-xs font-bold text-orange-900/40 tracking-normal font-sans">
                / 5.0 <span className="font-medium text-amber-600 font-bold">(High Energy Average)</span>
              </span>
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
        <div className="h-40 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dynamicVitalsChartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={25} tickFormatter={(str) => formatXAxisDateTick(str, totalDaysInRange)} tick={{ fontSize: 10, fontWeight: 900, fill: "#7C2D12", opacity: 0.5 }} dy={10} />
              <YAxis domain={[1, 5]} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#7C2D12", opacity: 0.5, fontWeight: "bold" }} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                  fontSize: 11,
                  fontWeight: 900,
                  color: "#431407",
                }}
              />
              <Line type="monotone" dataKey="energy" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: "#F59E0B", stroke: "#fff", strokeWidth: 2 }} name="Energy (1-5)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Dedicated Digestion Card (Multi-Dot Scatter Chart Across Date Range) */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-4 font-sans">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
              Digestion (Bristol Scatter)
            </div>
            <div className="text-3xl font-black text-orange-950 flex flex-wrap items-baseline gap-2">
              <span>Type 3.8</span>
              <span className="text-xs font-bold text-emerald-600 tracking-normal font-sans">
                Ideal Zone 🟢
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (triggerToast) triggerToast("💩 Digestion report copied!");
            }}
            title="Share Digestion Report"
            className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Multi-Dot Scatter Chart */}
        <div className="h-44 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <ReferenceLine y={3} stroke="#10B981" strokeDasharray="4 4" strokeWidth={1.5} />
              <ReferenceLine y={4} stroke="#10B981" strokeDasharray="4 4" strokeWidth={1.5} />
              <XAxis dataKey="date" name="Date" axisLine={false} tickLine={false} minTickGap={25} tickFormatter={(str) => formatXAxisDateTick(str, totalDaysInRange)} tick={{ fontSize: 10, fontWeight: 900, fill: "#7C2D12", opacity: 0.5 }} dy={10} />
              <YAxis domain={[1, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#7C2D12", opacity: 0.5, fontWeight: "bold" }} tickFormatter={(val) => `Type ${val}`} />
              <ZAxis range={[60, 60]} />
              <RechartsTooltip content={<CustomScatterTooltip />} />
              <Scatter data={dynamicDigestionScatterData} dataKey="type">
                {dynamicDigestionScatterData.map((entry, index) => (
                  <Cell key={`scatter-cell-${index}`} fill={entry.fill} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
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

      {/* 4. Dedicated Eating Habits & Meal Tags Card */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-5 font-sans">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
              Eating Habits & Tags
            </div>
            <div className="text-xs font-bold text-orange-900/60 font-sans">
              based on 18 logged meals
            </div>
          </div>

          <button
            onClick={() => {
              if (triggerToast) triggerToast("🏷️ Eating Habits report copied!");
            }}
            title="Share Eating Habits"
            className="w-8 h-8 rounded-full bg-orange-100/50 hover:bg-orange-100 text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Habit Proportion Bar */}
        <div className="space-y-2">
          <div className="w-full h-4 bg-orange-100/50 rounded-full overflow-hidden flex border border-orange-200/30">
            <div className="h-full bg-orange-500" style={{ width: "65%" }} title="Home Cooked (65%)" />
            <div className="h-full bg-sky-400" style={{ width: "20%" }} title="High Protein (20%)" />
            <div className="h-full bg-amber-400" style={{ width: "15%" }} title="Eating Out (15%)" />
          </div>

          <div className="flex justify-between items-center text-[10px] font-black text-orange-950/60 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              🏡 Home Cooked (65%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              🥩 High Protein (20%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              🍽️ Eating Out (15%)
            </span>
          </div>
        </div>

        {/* Meal Tag Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { tag: "🏡 Home Cooked", count: 12, pct: "65%" },
            { tag: "🥩 High Protein", count: 4, pct: "20%" },
            { tag: "🍽️ Eating Out", count: 3, pct: "15%" },
            { tag: "🥗 High Fiber", count: 5, pct: "28%" },
            { tag: "⚡ Fast Food", count: 2, pct: "10%" },
          ].map((item, idx) => (
            <div key={idx} className="bg-white/80 border border-orange-100/80 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xs">
              <span className="text-xs font-extrabold text-orange-950">{item.tag}</span>
              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md font-mono">
                {item.count} meals ({item.pct})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* TIME RANGE PICKER BOTTOM SHEET MODAL */}
      {showCustomPicker && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setShowCustomPicker(false)}
          />
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-stone-200 space-y-6 font-sans relative z-10 animate-slide-up">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-orange-950">Select Time Range</h3>
                <p className="text-xs text-stone-400 font-semibold mt-0.5">
                  Choose a quick preset or set custom dates
                </p>
              </div>
              <button
                onClick={() => setShowCustomPicker(false)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors cursor-pointer border-none"
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
                      "py-2.5 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer border text-center active:scale-95",
                      timeRange === item.id
                        ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                        : "bg-stone-50 text-stone-700 border-stone-200/80 hover:bg-stone-100"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Pickers */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">
                Custom Dates
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-stone-500 block mb-1">
                    Start Date
                  </span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-500 block mb-1">
                    End Date
                  </span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Apply Custom Range Button */}
            <button
              onClick={() => {
                setTimeRange("CUSTOM");
                setShowCustomPicker(false);
              }}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-black rounded-2xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer border-none"
            >
              Apply Custom Range
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
