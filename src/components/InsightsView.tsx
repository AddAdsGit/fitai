import React, { useState, useMemo, useEffect } from "react";
import { TrendingUp, Minus, Plus, Scale, X } from "lucide-react";
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
  AreaChart,
  Area,
  CartesianGrid,
  YAxis,
} from "recharts";
import { cn } from "../lib/utils";
import type { Meal, WeightLog } from "../types";

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

export const InsightsView = ({
  currentStreak = 0,
  mealsState = [],
  profileData,
  weightLogs = [],
  onLogWeight,
  onDeleteWeight,
}: {
  currentStreak?: number;
  mealsState?: Meal[];
  profileData: any;
  weightLogs?: WeightLog[];
  onLogWeight?: (weight: number, date: string) => void;
  onDeleteWeight?: (id: string) => void;
}) => {
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "60D" | "90D">("7D");

  const filteredWeightData = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return [];
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    const limitDate = new Date();
    const numDays = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : timeRange === "60D" ? 60 : 90;
    limitDate.setDate(limitDate.getDate() - numDays);
    const limitDateStr = limitDate.toLocaleDateString("en-CA");
    return sorted.filter(log => log.date >= limitDateStr);
  }, [weightLogs, timeRange]);

  const weightStats = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) {
      return { start: profileData.weight, current: profileData.weight, goal: profileData.goals.weightGoal, change: 0 };
    }
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    const start = sorted[0].weight;
    const current = sorted[sorted.length - 1].weight;
    const goal = profileData.goals.weightGoal || 70;
    const change = current - start;
    return { start, current, goal, change };
  }, [weightLogs, profileData.weight, profileData.goals.weightGoal]);

  const localFormatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const chartData = useMemo(() => {
    const numDays = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : timeRange === "60D" ? 60 : 90;
    const data = [];
    const today = new Date();
    
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = localFormatDateStr(d);
      
      const daysMeals = (mealsState || []).filter(m => m.date === dateStr);
      const calories = daysMeals.reduce((sum, m) => sum + m.calories, 0);
      const protein = daysMeals.reduce((sum, m) => sum + m.protein, 0);
      const carbs = daysMeals.reduce((sum, m) => sum + m.carbs, 0);
      const fats = daysMeals.reduce((sum, m) => sum + m.fats, 0);
      const fiber = daysMeals.reduce((sum, m) => sum + (m.fiber || 0), 0);
      
      let dayLabel = "";
      if (timeRange === "7D") {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        dayLabel = daysOfWeek[d.getDay()];
      } else {
        dayLabel = d.getDate().toString();
      }
      
      data.push({
        day: dayLabel,
        calories,
        goal: profileData?.goals?.dailyCalories || 2000,
        protein,
        carbs,
        fats,
        fiber,
        date: dateStr
      });
    }
    return data;
  }, [timeRange, mealsState, profileData]);

  const avgCalories = useMemo(() => {
    const daysWithData = chartData.filter(item => item.calories > 0);
    if (daysWithData.length === 0) return 0;
    const total = daysWithData.reduce((sum, item) => sum + item.calories, 0);
    return Math.round(total / daysWithData.length);
  }, [chartData]);

  const hasAnyData = useMemo(() => chartData.some(d => d.calories > 0), [chartData]);

  // Compute best streak from meal history
  const bestStreak = useMemo(() => {
    if (!mealsState || mealsState.length === 0) return 0;
    const datesWithLogs = new Set(mealsState.map(m => m.date));
    const sortedDates = Array.from(datesWithLogs).sort();
    if (sortedDates.length === 0) return 0;
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
    return best;
  }, [mealsState]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="px-6 mt-8 relative z-10 space-y-8 pb-12"
    >
      {/* Page Title & Filter */}
      <div className="flex justify-between items-end">
        <h2 className="text-2xl font-black tracking-tight text-orange-950">
          Your Progress
        </h2>
        <div className="flex bg-orange-100/50 rounded-full p-1 border border-orange-200/30">
          {(["7D", "30D", "60D", "90D"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1.5 rounded-full transition-colors",
                timeRange === range
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-orange-900/60 hover:text-orange-900",
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* Metric 1 */}
        <div className="bg-white/60 backdrop-blur-md p-5 rounded-[24px] border border-white/80 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100/50 flex items-center justify-center text-orange-600 mb-2">
            <span className="text-xl">🔥</span>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.05em] text-orange-950/50 mb-1 leading-tight">
              Current
              <br />
              Streak
            </div>
            <div className="text-2xl font-black text-orange-950">{currentStreak}🔥</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white/60 backdrop-blur-md p-5 rounded-[24px] border border-white/80 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100/50 flex items-center justify-center text-orange-600 mb-2">
            <span className="text-xl">🏆</span>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.05em] text-orange-950/50 mb-1 leading-tight">
              Best
              <br />
              Streak
            </div>
            <div className="text-2xl font-black text-orange-950">{bestStreak}🏆</div>
          </div>
        </div>
      </div>

      {/* Calories Chart Card */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
              Calories
            </div>
            <div className="text-3xl font-black text-orange-950">
              {avgCalories.toLocaleString()}{" "}
              <span className="text-sm font-bold text-orange-900/40 tracking-normal">
                avg/d
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-100/50 flex items-center justify-center text-orange-600">
            <TrendingUp className="w-5 h-5" />
          </div>
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
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
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
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fontWeight: 900,
                    fill: "#7C2D12",
                    opacity: 0.5,
                  }}
                  dy={10}
                  tickFormatter={(val) => {
                    const num = Number(val);
                    if (timeRange === "30D") return num % 5 === 0 ? val : "";
                    if (timeRange === "60D") return num % 10 === 0 ? val : "";
                    return num % 15 === 0 ? val : "";
                  }}
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
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={false}
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

      {/* Weight Progress & Tracking Card (Toggled) */}
      {profileData.agent_config?.trackWeight && (
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80 space-y-6">
          
          {/* Stats Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
                Weight Tracking
              </div>
              <div className="text-3xl font-black text-orange-950">
                {weightStats.current} <span className="text-sm font-bold text-orange-900/40">kg</span>
              </div>
            </div>
            
            <div className="bg-orange-100/40 rounded-2xl p-2 px-3 border border-orange-200/20 flex gap-4 text-center select-none text-[10px] font-black uppercase tracking-wider text-orange-950/70">
              <div>
                <span className="text-orange-950/40 text-[8px] block leading-none mb-0.5">Start</span>
                <span>{weightStats.start} kg</span>
              </div>
              <div className="w-px h-6 bg-orange-200/30" />
              <div>
                <span className="text-orange-950/40 text-[8px] block leading-none mb-0.5">Goal</span>
                <span>{weightStats.goal} kg</span>
              </div>
              <div className="w-px h-6 bg-orange-200/30" />
              <div>
                <span className="text-orange-950/40 text-[8px] block leading-none mb-0.5">Current</span>
                <span>{weightStats.current} kg</span>
              </div>
            </div>
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

      {/* Macros Chart Card */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
              Macros Split
            </div>
            <div className="text-xl font-black text-orange-950">
              Macro Trend
            </div>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {timeRange === "7D" ? (
              <BarChart
                data={chartData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
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
                />
                <Bar
                  dataKey="protein"
                  stackId="a"
                  fill="#FF7008"
                  radius={[0, 0, 4, 4]}
                />
                <Bar dataKey="carbs" stackId="a" fill="#006B7D" />
                <Bar
                  dataKey="fats"
                  stackId="a"
                  fill="#FFB800"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart
                data={chartData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fontWeight: 900,
                    fill: "#7C2D12",
                    opacity: 0.5,
                  }}
                  dy={10}
                  tickFormatter={(val) => {
                    const num = Number(val);
                    if (timeRange === "30D") return num % 5 === 0 ? val : "";
                    if (timeRange === "60D") return num % 10 === 0 ? val : "";
                    return num % 15 === 0 ? val : "";
                  }}
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
                />
                <Line
                  type="monotone"
                  dataKey="protein"
                  stroke="#FF7008"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="carbs"
                  stroke="#006B7D"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fats"
                  stroke="#FFB800"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fiber"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FF7008]" />
            <span className="text-[10px] font-bold text-orange-950/60 uppercase">
              Protein
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#006B7D]" />
            <span className="text-[10px] font-bold text-orange-950/60 uppercase">
              Carbs
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FFB800]" />
            <span className="text-[10px] font-bold text-orange-950/60 uppercase">
              Fats
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="text-[10px] font-bold text-orange-950/60 uppercase">
              Fiber
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
