/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  Home,
  Settings,
  Plus,
  BarChart2,
  ChevronRight,
  TrendingUp,
  Target,
  Zap,
  User,
  ScanLine,
  Keyboard,
  X,
  Mic,
  Calendar as CalendarIcon,
  Bot,
  Brain,
  Grid3X3,
  Type,
  Camera,
  MessageSquare,
  Wand2,
  Crown,
  Smile,
  Moon,
  Footprints,
  Droplet,
  Utensils,
  Send,
  BookOpen,
  Search,
  Sparkles,
  Clock,
  Heart,
  PlusCircle,
  Filter,
  Check,
  Cloud,
  RefreshCw,
  Radio,
  ChevronDown,
  Scale,
  Ruler,
  Info,
  Database,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { cn } from "./lib/utils";
import { calculateNutritionFromIngredients } from "./utils/nutritionCalculator";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient";

// --- Types ---
type ViewMode = "macros" | "micros";

interface Meal {
  id: string;
  name: string;
  time: string;
  type: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  image: string;
  date: string;
}

interface Recipe {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  tags: string[];
  image: string;
  ingredients: string[];
  instructions: string;
  micros?: { name: string; value: number; unit: string }[];
}

// --- Mock Data ---
const INITIAL_MEALS: Meal[] = [
  {
    id: "1",
    name: "Morning Avocado Toast",
    time: "8:30 AM",
    type: "Breakfast",
    calories: 320,
    protein: 12,
    carbs: 35,
    fats: 18,
    image:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=60",
    date: "2026-07-08",
  },
  {
    id: "2",
    name: "Quinoa Power Bowl",
    time: "1:15 PM",
    type: "Lunch",
    calories: 450,
    protein: 22,
    carbs: 55,
    fats: 15,
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=60",
    date: "2026-07-08",
  },
];

const INITIAL_RECIPES: Recipe[] = [
  {
    id: "rec-1",
    name: "Avocado Salmon Protein Bowl",
    time: "15 mins",
    calories: 420,
    protein: 34,
    carbs: 12,
    fats: 28,
    tags: ["Keto", "Gluten Free"],
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
    ingredients: [
      "150g Grilled Salmon",
      "1/2 Ripe Avocado",
      "50g Salad Greens",
      "Lemon Vinaigrette",
    ],
    instructions:
      "Grill salmon. Slice avocado. Toss salad greens with vinaigrette. Combine in a premium bowl.",
  },
  {
    id: "rec-2",
    name: "Spinach Oat Pancakes",
    time: "12 mins",
    calories: 310,
    protein: 16,
    carbs: 45,
    fats: 8,
    tags: ["Gluten Free", "Vegetarian"],
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
    ingredients: [
      "1 cup Gluten Free Oats",
      "1 cup Unsweetened Almond Milk",
      "1 Egg",
      "Handful Spinach",
    ],
    instructions:
      "Blend ingredients until smooth. Bake on a hot non-stick skillet for 3 mins each side.",
  },
  {
    id: "rec-3",
    name: "Keto Spinach & Cheese Omelette",
    time: "10 mins",
    calories: 290,
    protein: 22,
    carbs: 3,
    fats: 22,
    tags: ["Keto", "Low Carb"],
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
    ingredients: [
      "3 Large Eggs",
      "1 cup Spinach",
      "30g Cheddar Cheese",
      "1 tbsp Butter",
    ],
    instructions:
      "Whisk eggs. Melt butter. Sauté spinach. Add eggs, cook through and fold over melted cheese.",
  },
  {
    id: "rec-4",
    name: "Mediterranean Chickpea Salad",
    time: "8 mins",
    calories: 340,
    protein: 12,
    carbs: 48,
    fats: 10,
    tags: ["Vegan", "Vegetarian", "Gluten Free"],
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
    ingredients: [
      "1 can Chickpeas",
      "Cucumber & Tomato dice",
      "Kalamata olives",
      "Olive oil & Lemon juice",
    ],
    instructions:
      "Rinse chickpeas. Combine with chopped vegetables. Drizzle olive oil and squeeze fresh lemon.",
  },
];

const DAYS = [
  { day: "THU", date: 11 },
  { day: "FRI", date: 12 },
  { day: "SAT", date: 13 },
  { day: "SUN", date: 14, active: true },
  { day: "MON", date: 15 },
  { day: "TUE", date: 16 },
];

const WEEKLY_CALORIES = [
  { day: "Mon", calories: 1850, goal: 2000 },
  { day: "Tue", calories: 1920, goal: 2000 },
  { day: "Wed", calories: 2100, goal: 2000 },
  { day: "Thu", calories: 1750, goal: 2000 },
  { day: "Fri", calories: 1980, goal: 2000 },
  { day: "Sat", calories: 2400, goal: 2000 },
  { day: "Sun", calories: 1450, goal: 2000 },
];

const WEEKLY_MACROS = [
  { day: "Mon", protein: 120, carbs: 150, fats: 50 },
  { day: "Tue", protein: 130, carbs: 160, fats: 55 },
  { day: "Wed", protein: 110, carbs: 180, fats: 60 },
  { day: "Thu", protein: 140, carbs: 140, fats: 45 },
  { day: "Fri", protein: 125, carbs: 170, fats: 65 },
  { day: "Sat", protein: 150, carbs: 200, fats: 70 },
  { day: "Sun", protein: 115, carbs: 130, fats: 40 },
];

const WEEKLY_MICROS = [
  { day: "Mon", score: 85 },
  { day: "Tue", score: 90 },
  { day: "Wed", score: 75 },
  { day: "Thu", score: 95 },
  { day: "Fri", score: 80 },
  { day: "Sat", score: 70 },
  { day: "Sun", score: 88 },
];

const MONTHLY_CALORIES = Array.from({ length: 30 }, (_, i) => ({
  day: (i + 1).toString(),
  calories: Math.round(1800 + Math.sin(i) * 300 + Math.cos(i * 2) * 200),
  goal: 2000,
}));

const SIXTY_CALORIES = Array.from({ length: 60 }, (_, i) => ({
  day: (i + 1).toString(),
  calories: Math.round(1800 + Math.sin(i / 1.5) * 300 + Math.cos(i * 1.2) * 200),
  goal: 2000,
}));

const NINETY_CALORIES = Array.from({ length: 90 }, (_, i) => ({
  day: (i + 1).toString(),
  calories: Math.round(1800 + Math.sin(i / 2) * 300 + Math.cos(i) * 200),
  goal: 2000,
}));

const MONTHLY_MACROS = Array.from({ length: 30 }, (_, i) => ({
  day: (i + 1).toString(),
  protein: Math.round(120 + Math.sin(i / 2) * 20),
  carbs: Math.round(150 + Math.cos(i / 2) * 30),
  fats: Math.round(55 + Math.sin(i) * 15),
}));

const SIXTY_MACROS = Array.from({ length: 60 }, (_, i) => ({
  day: (i + 1).toString(),
  protein: Math.round(120 + Math.sin(i / 3) * 25),
  carbs: Math.round(150 + Math.cos(i / 3) * 35),
  fats: Math.round(55 + Math.sin(i / 2) * 18),
}));

const NINETY_MACROS = Array.from({ length: 90 }, (_, i) => ({
  day: (i + 1).toString(),
  protein: Math.round(120 + Math.sin(i / 4) * 30),
  carbs: Math.round(150 + Math.cos(i / 4) * 40),
  fats: Math.round(55 + Math.sin(i / 3) * 20),
}));

const MONTHLY_MICROS = Array.from({ length: 30 }, (_, i) => ({
  day: (i + 1).toString(),
  score: Math.min(100, Math.max(0, Math.round(80 + Math.sin(i / 3) * 15))),
}));

// --- Components ---

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

const InsightsView = () => {
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "60D" | "90D">("7D");

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
          <button
            onClick={() => setTimeRange("7D")}
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1.5 rounded-full transition-colors",
              timeRange === "7D"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-orange-900/60 hover:text-orange-900",
            )}
          >
            7D
          </button>
          <button
            onClick={() => setTimeRange("30D")}
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1.5 rounded-full transition-colors",
              timeRange === "30D"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-orange-900/60 hover:text-orange-900",
            )}
          >
            30D
          </button>
          <button
            onClick={() => setTimeRange("60D")}
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1.5 rounded-full transition-colors",
              timeRange === "60D"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-orange-900/60 hover:text-orange-900",
            )}
          >
            60D
          </button>
          <button
            onClick={() => setTimeRange("90D")}
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1.5 rounded-full transition-colors",
              timeRange === "90D"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-orange-900/60 hover:text-orange-900",
            )}
          >
            90D
          </button>
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
            <div className="text-2xl font-black text-orange-950">12🔥</div>
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
            <div className="text-2xl font-black text-orange-950">18🔥</div>
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
              1,860{" "}
              <span className="text-sm font-bold text-orange-900/40 tracking-normal">
                avg/d
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-100/50 flex items-center justify-center text-orange-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {timeRange === "7D" ? (
              <BarChart
                data={WEEKLY_CALORIES}
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
                  itemStyle={{ color: "#FF7008", fontWeight: 900 }}
                />
                <Bar dataKey="calories" radius={[6, 6, 6, 6]}>
                  {WEEKLY_CALORIES.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.calories > entry.goal ? "#fed7aa" : "#f97316"}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart
                data={timeRange === "30D" ? MONTHLY_CALORIES : timeRange === "60D" ? SIXTY_CALORIES : NINETY_CALORIES}
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
      </div>

      {/* Macros Chart Card */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-orange-100/20 border border-white/80">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-950/50 mb-1">
              Macros Split
            </div>
            <div className="text-xl font-black text-orange-950">
              Weekly Trend
            </div>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {timeRange === "7D" ? (
              <BarChart
                data={WEEKLY_MACROS}
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
                data={timeRange === "30D" ? MONTHLY_MACROS : timeRange === "60D" ? SIXTY_MACROS : NINETY_MACROS}
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
        </div>
      </div>

    </motion.div>
  );
};

const PRESET_DIETS = [
  { name: "Keto", emoji: "🥑", label: "Ketogenic" },
  { name: "Vegan", emoji: "🌱", label: "Vegan" },
  { name: "Vegetarian", emoji: "🥗", label: "Vegetarian" },
  { name: "Gluten Free", emoji: "🌾", label: "Gluten-Free" },
  { name: "Dairy Free", emoji: "🥛", label: "Dairy-Free" },
  { name: "Halal", emoji: "🕌", label: "Halal" },
  { name: "Low Carb", emoji: "🍳", label: "Low-Carb" },
  { name: "Nut Free", emoji: "🥜", label: "Nut-Free" },
  { name: "Shellfish Free", emoji: "🦀", label: "No Shellfish" },
];

const ProfileView = ({
  profileData,
  setProfileData,
  setActiveTab,
  recipes,
  setRecipes,
  onAddMeal,
  openGoalConfig,
  openRecipeDetails,
  triggerToast,
  activeProfileId,
}: {
  key?: string;
  profileData: any;
  setProfileData: any;
  setActiveTab: (tab: string) => void;
  recipes: Recipe[];
  setRecipes: any;
  onAddMeal: (recipeOrMeal: any) => void;
  openGoalConfig: (type: "dailyCalories" | "weightGoal") => void;
  openRecipeDetails: (recipe: Recipe) => void;
  triggerToast: (msg: string) => void;
  activeProfileId: string | null;
}) => {
  const [profileTab, setProfileTab] = useState<"meals" | "insights" | "goals">(
    "meals",
  );
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [customPrefText, setCustomPrefText] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);



  // Recipes Filters state
  const [recipeSearch, setRecipeSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showLabelsDropdown, setShowLabelsDropdown] = useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [showNewRecipeModal, setShowNewRecipeModal] = useState(false);

  // Active configure popup state variables
  const [selectedConfigRecipe, setSelectedConfigRecipe] =
    useState<Recipe | null>(null);
  const [servingScale, setServingScale] = useState<number>(1);
  const [isManualAdjust, setIsManualAdjust] = useState<boolean>(false);
  const [customCalories, setCustomCalories] = useState<number>(0);
  const [customProtein, setCustomProtein] = useState<number>(0);
  const [customCarbs, setCustomCarbs] = useState<number>(0);
  const [customFats, setCustomFats] = useState<number>(0);

  // Sync manual adjustments to scales dynamically
  useEffect(() => {
    if (selectedConfigRecipe && !isManualAdjust) {
      setCustomCalories(
        Math.round(selectedConfigRecipe.calories * servingScale),
      );
      setCustomProtein(Math.round(selectedConfigRecipe.protein * servingScale));
      setCustomCarbs(Math.round(selectedConfigRecipe.carbs * servingScale));
      setCustomFats(Math.round(selectedConfigRecipe.fats * servingScale));
    }
  }, [selectedConfigRecipe, servingScale, isManualAdjust]);

  // Form states for creating custom recipe
  const [newRecName, setNewRecName] = useState("");
  const [newRecTime, setNewRecTime] = useState("");
  const [newRecCalories, setNewRecCalories] = useState("");
  const [newRecProtein, setNewRecProtein] = useState("");
  const [newRecCarbs, setNewRecCarbs] = useState("");
  const [newRecFats, setNewRecFats] = useState("");
  const [newRecTags, setNewRecTags] = useState<string[]>([]);
  const [newRecIngredients, setNewRecIngredients] = useState("");
  const [newRecInstructions, setNewRecInstructions] = useState("");

  const filteredRecipes = recipes.filter((r) => {
    const sMatch =
      r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(recipeSearch.toLowerCase()));
    const tMatch = selectedTags.length > 0
      ? selectedTags.every((st) => r.tags.some((t) => t.toLowerCase() === st.toLowerCase()))
      : true;
    return sMatch && tMatch;
  });

  const updateGoal = (field: string, value: number) => {
    setProfileData({
      ...profileData,
      goals: { ...profileData.goals, [field]: value },
    });
    triggerToast(`Daily ${field === "dailyCalories" ? "Calorie" : "Weight"} target updated and synced successfully!`);
  };

  const updateMacro = (field: string, value: number) => {
    setProfileData({
      ...profileData,
      macros: { ...profileData.macros, [field]: value },
    });
    triggerToast(`Daily ${field.charAt(0).toUpperCase() + field.slice(1)} goal updated and synced successfully!`);
  };

  const removePreference = (index: number) => {
    const newPrefs = [...profileData.preferences];
    newPrefs.splice(index, 1);
    setProfileData({ ...profileData, preferences: newPrefs });
  };

  const addPreference = () => {
    const pref = prompt("Enter new preference:");
    if (pref) {
      setProfileData({
        ...profileData,
        preferences: [...profileData.preferences, pref],
      });
    }
  };

  const togglePreference = (prefName: string) => {
    const index = profileData.preferences.findIndex(
      (p: string) => p.toLowerCase() === prefName.toLowerCase(),
    );
    if (index !== -1) {
      removePreference(index);
    } else {
      setProfileData({
        ...profileData,
        preferences: [...profileData.preferences, prefName],
      });
    }
  };

  const handleAddCustomPref = () => {
    if (customPrefText.trim()) {
      const alreadyExists = profileData.preferences.some(
        (p: string) => p.toLowerCase() === customPrefText.trim().toLowerCase(),
      );
      if (!alreadyExists) {
        setProfileData({
          ...profileData,
          preferences: [...profileData.preferences, customPrefText.trim()],
        });
      }
      setCustomPrefText("");
      setShowCustomInput(false);
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="mt-4 relative z-10 pb-32"
    >
      <div className="px-6 space-y-6">
        <div className="flex gap-6 items-center px-1 pt-2">
          <div className="relative w-24 h-24 rounded-full border-[3px] border-orange-500 p-1 overflow-hidden shrink-0">
            <img
              src={profileData.imageUrl}
              alt="User"
              className="w-full h-full object-cover rounded-full pointer-events-none"
            />
          </div>
          <div className="flex-1 flex justify-around">
            <div className="flex flex-col items-center">
              <div className="text-xl font-black text-[#1a1a1a]">
                {profileData.weight}
              </div>
              <div className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-wider">
                Weight(kg)
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xl font-black text-[#1a1a1a]">
                {profileData.height}
              </div>
              <div className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-wider">
                Height(cm)
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xl font-black text-[#1a1a1a]">
                {Math.abs(
                  new Date(
                    Date.now() - new Date(profileData.dob).getTime(),
                  ).getUTCFullYear() - 1970,
                )}
              </div>
              <div className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-wider">
                Age
              </div>
            </div>
          </div>
        </div>

        <div className="px-1 space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-bold text-[#1a1a1a]">{profileData.name}</div>
          </div>
          <div className="text-[13px] text-orange-950/70 font-medium leading-relaxed relative">
            <span className={cn(!showFullDesc && "line-clamp-2")}>
              {profileData.description}
            </span>
            {profileData.description.length > 80 && !showFullDesc && (
              <span
                onClick={() => setShowFullDesc(true)}
                className="text-orange-500 font-bold cursor-pointer hover:underline absolute bottom-0 right-0 bg-gradient-to-l from-[#FAF9F6] via-[#FAF9F6] to-transparent pl-8"
              >
                ...more
              </span>
            )}
            {showFullDesc && (
              <span
                onClick={() => setShowFullDesc(false)}
                className="text-orange-500 font-bold cursor-pointer hover:underline ml-1 block mt-1"
              >
                less
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-1 pt-2">
          <button
            onClick={() => setActiveTab("edit-profile")}
            className="flex-1 bg-white border border-gray-200 py-1.5 rounded-lg text-[13px] font-bold text-[#1a1a1a] shadow-sm hover:bg-gray-50 transition-colors"
          >
            Edit profile
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className="flex-1 bg-white border border-gray-200 py-1.5 rounded-lg text-[13px] font-bold text-[#1a1a1a] shadow-sm hover:bg-gray-50 transition-colors"
          >
            Settings
          </button>
        </div>
      </div>

      <div className="flex justify-between border-b border-black/5 mt-6 px-4">
        <button
          onClick={() => setProfileTab("meals")}
          className={cn(
            "flex-1 py-3 flex justify-center border-b-[3px] transition-colors",
            profileTab === "meals"
              ? "border-[#1a1a1a] text-[#1a1a1a]"
              : "border-transparent text-[#9e9e9e]",
          )}
        >
          <BookOpen className="w-6 h-6" />
        </button>
        <button
          onClick={() => setProfileTab("insights")}
          className={cn(
            "flex-1 py-3 flex justify-center border-b-[3px] transition-colors",
            profileTab === "insights"
              ? "border-[#1a1a1a] text-[#1a1a1a]"
              : "border-transparent text-[#9e9e9e]",
          )}
        >
          <BarChart2 className="w-6 h-6" />
        </button>
        <button
          onClick={() => setProfileTab("goals")}
          className={cn(
            "flex-1 py-3 flex justify-center border-b-[3px] transition-colors",
            profileTab === "goals"
              ? "border-[#1a1a1a] text-[#1a1a1a]"
              : "border-transparent text-[#9e9e9e]",
          )}
        >
          <Target className="w-6 h-6" />
        </button>
      </div>

      <div className="min-h-[300px] mt-4 relative z-10 w-full mb-20 font-sans">
        {profileTab === "meals" && (
          <div className="px-6 py-2 space-y-6">
            {/* Optimized Ultra-compact Search, Filter, and Add Header */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                {/* Search Input */}
                <div className="flex-1 relative flex items-center bg-stone-100 hover:bg-stone-200/60 focus-within:bg-stone-50 border border-black/5 rounded-2xl px-2.5 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-orange-500/10 transition-all font-sans">
                  <Search className="w-3.5 h-3.5 text-stone-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-stone-900 placeholder:text-stone-400 font-sans"
                  />
                  {recipeSearch && (
                    <button
                      onClick={() => setRecipeSearch("")}
                      className="text-stone-400 hover:text-black shrink-0 text-xs font-black font-sans ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Filter Label Dropdown Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowLabelsDropdown(!showLabelsDropdown)}
                    type="button"
                    className={cn(
                      "p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative active:scale-95",
                      selectedTags.length > 0
                        ? "bg-orange-50 border-orange-200 text-orange-600 shadow-sm"
                        : "bg-stone-100 border-black/5 text-stone-600 hover:bg-stone-200"
                    )}
                    title="Filter by Labels"
                  >
                    <Filter className="w-4 h-4" />
                    {selectedTags.length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-orange-500 text-white border border-white rounded-full flex items-center justify-center text-[8px] font-black font-sans px-1 leading-none shadow-sm">
                        {selectedTags.length}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showLabelsDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowLabelsDropdown(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-md border border-neutral-100 rounded-[28px] p-4 shadow-2xl shadow-orange-950/10 z-50 flex flex-col gap-1.5 font-sans"
                        >
                          <div className="flex justify-between items-center px-2 pb-1.5 border-b border-stone-100">
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              Dietary Labels
                            </span>
                            {selectedTags.length > 0 && (
                              <button
                                onClick={() => setSelectedTags([])}
                                className="text-[9px] font-black uppercase text-orange-600 tracking-wider hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                              >
                                Clear ({selectedTags.length})
                              </button>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-0.5 mt-1 no-scrollbar-all">
                            {(profileData.preferences && profileData.preferences.length > 0
                              ? profileData.preferences
                              : ["Gluten Free", "Dairy Free", "Keto", "Vegan", "Vegetarian", "High Protein", "Low Carb"]
                            ).map((tag) => {
                              const isSelected = selectedTags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedTags(selectedTags.filter((t) => t !== tag));
                                    } else {
                                      setSelectedTags([...selectedTags, tag]);
                                    }
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all flex items-center justify-between gap-2 select-none cursor-pointer",
                                    isSelected
                                      ? "bg-orange-500 text-white font-extrabold shadow-md animate-none"
                                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-955"
                                  )}
                                >
                                  <span className="truncate">{tag}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Add Custom Recipe Button (+) */}
                <button
                  type="button"
                  onClick={() => {
                    const blankRecipe: Recipe = {
                      id: "new",
                      name: "",
                      time: "15 mins",
                      calories: 0,
                      protein: 0,
                      carbs: 0,
                      fats: 0,
                      tags: [],
                      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
                      ingredients: [],
                      instructions: "",
                      micros: [],
                    };
                    openRecipeDetails(blankRecipe);
                  }}
                  className="p-2 bg-orange-50 hover:bg-orange-100 border border-orange-200/55 text-orange-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm active:scale-95"
                  title="Add Custom Recipe"
                >
                  <Plus className="w-4 h-4 pointer-events-none" />
                </button>
              </div>

              {/* Show active filter label row on next line. If no active labels, no line! */}
              {selectedTags.length > 0 && (
                <motion.div
                  id="active-filters-row"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap items-center gap-2 mt-2 font-sans px-1 overflow-hidden"
                >
                  <AnimatePresence>
                    {selectedTags.map((tag) => (
                      <motion.span
                        key={tag}
                        id={`active-tag-badge-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-orange-100/70 hover:bg-orange-200/60 border border-orange-200 text-orange-800 rounded-full text-[10px] font-black tracking-wider uppercase shadow-sm cursor-pointer transition-all"
                      >
                        {tag}
                        <span className="opacity-80 font-sans font-light text-[12px] leading-none ml-0.5">×</span>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {/* Custom Add Recipe inline overlay form */}
            {showNewRecipeModal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[24px] p-5 shadow-lg border border-orange-100 space-y-4"
              >
                <div className="flex justify-between items-center border-b border-black/[0.03] pb-2 font-sans">
                  <h5 className="font-bold text-sm text-orange-950 flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    Create Custom Recipe
                  </h5>
                  <button
                    onClick={() => setShowNewRecipeModal(false)}
                    className="text-gray-400 hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-orange-950/40 uppercase tracking-widest block mb-1">
                      Recipe Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Grandma's Protein Oatmeal"
                      value={newRecName}
                      onChange={(e) => setNewRecName(e.target.value)}
                      className="w-full bg-orange-50/20 border border-orange-100 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:border-orange-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-950/40 uppercase tracking-widest block mb-1">
                      Prep Time
                    </label>
                    <input
                      type="text"
                      placeholder="15 mins"
                      value={newRecTime}
                      onChange={(e) => setNewRecTime(e.target.value)}
                      className="w-full bg-orange-50/20 border border-orange-100 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:border-orange-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-950/40 uppercase tracking-widest block mb-1">
                      Calories (kcal)
                    </label>
                    <input
                      type="number"
                      placeholder="350"
                      value={newRecCalories}
                      onChange={(e) => setNewRecCalories(e.target.value)}
                      className="w-full bg-orange-50/20 border border-orange-100 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:border-orange-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-950/40 uppercase tracking-widest block mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      placeholder="20"
                      value={newRecProtein}
                      onChange={(e) => setNewRecProtein(e.target.value)}
                      className="w-full bg-orange-50/20 border border-orange-100 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:border-orange-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-950/40 uppercase tracking-widest block mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      placeholder="40"
                      value={newRecCarbs}
                      onChange={(e) => setNewRecCarbs(e.target.value)}
                      className="w-full bg-orange-50/20 border border-orange-100 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:border-orange-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-950/40 uppercase tracking-widest block mb-1">
                      Fats (g)
                    </label>
                    <input
                      type="number"
                      placeholder="10"
                      value={newRecFats}
                      onChange={(e) => setNewRecFats(e.target.value)}
                      className="w-full bg-orange-50/20 border border-orange-100 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:border-orange-500 font-sans"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-orange-950/40 uppercase tracking-widest block mb-1">
                      Dietary Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Keto, Gluten Free"
                      value={newRecTags.join(", ")}
                      onChange={(e) =>
                        setNewRecTags(
                          e.target.value.split(",").map((s) => s.trim()),
                        )
                      }
                      className="w-full bg-orange-50/20 border border-orange-100 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:border-orange-500 font-sans"
                    />
                  </div>
                  <div className="col-span-2 font-sans font-medium">
                    <label className="text-[10px] font-bold text-orange-950/40 uppercase tracking-widest block mb-1 font-sans">
                      Ingredients (one per line)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Oats&#10;Almond milk&#10;Chia seeds"
                      value={newRecIngredients}
                      onChange={(e) => setNewRecIngredients(e.target.value)}
                      className="w-full bg-orange-50/20 border border-orange-100 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:border-orange-500 font-sans"
                    />
                  </div>
                  <div className="col-span-2 font-sans font-medium">
                    <label className="text-[10px] font-bold text-orange-950/40 uppercase tracking-widest block mb-1 font-sans font-extrabold">
                      Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Cook oats with almond milk, then stir in chia seeds."
                      value={newRecInstructions}
                      onChange={(e) => setNewRecInstructions(e.target.value)}
                      className="w-full bg-orange-50/20 border border-orange-100 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:border-orange-500 font-sans"
                    />
                  </div>
                </div>
                <div className="flex gap-2 font-sans">
                  <button
                    onClick={async () => {
                      if (!newRecName.trim()) return;
                      const newRecipe: Recipe = {
                        id: "rec-" + Date.now(),
                        name: newRecName.trim(),
                        time: newRecTime || "10 mins",
                        calories: parseInt(newRecCalories) || 0,
                        protein: parseInt(newRecProtein) || 0,
                        carbs: parseInt(newRecCarbs) || 0,
                        fats: parseInt(newRecFats) || 0,
                        tags: newRecTags.filter(Boolean),
                        image:
                          "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80",
                        ingredients: newRecIngredients
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                        instructions:
                          newRecInstructions.trim() || "Mix and serve!",
                      };

                      if (isSupabaseConfigured && activeProfileId) {
                        try {
                          const { data, error } = await supabase
                            .from('recipes')
                            .insert({
                              profile_id: activeProfileId,
                              name: newRecipe.name,
                              time: newRecipe.time,
                              calories: newRecipe.calories,
                              protein: newRecipe.protein,
                              carbs: newRecipe.carbs,
                              fats: newRecipe.fats,
                              tags: newRecipe.tags,
                              image: newRecipe.image,
                              ingredients: newRecipe.ingredients,
                              instructions: newRecipe.instructions
                            })
                            .select('*')
                            .single();
                          if (error) {
                            console.error("Error creating recipe in Supabase:", error);
                            setRecipes([newRecipe, ...recipes]);
                          } else if (data) {
                            const mapped: Recipe = {
                              id: data.id,
                              name: data.name,
                              time: data.time,
                              calories: data.calories,
                              protein: data.protein,
                              carbs: data.carbs,
                              fats: data.fats,
                              tags: data.tags || [],
                              image: data.image,
                              ingredients: data.ingredients || [],
                              instructions: data.instructions,
                              micros: data.micros || []
                            };
                            setRecipes([mapped, ...recipes]);
                          }
                        } catch (err) {
                          console.error("Error creating recipe in Supabase:", err);
                          setRecipes([newRecipe, ...recipes]);
                        }
                      } else {
                        setRecipes([newRecipe, ...recipes]);
                      }

                      // Reset form
                      setNewRecName("");
                      setNewRecTime("");
                      setNewRecCalories("");
                      setNewRecProtein("");
                      setNewRecCarbs("");
                      setNewRecFats("");
                      setNewRecTags([]);
                      setNewRecIngredients("");
                      setNewRecInstructions("");
                      setShowNewRecipeModal(false);
                    }}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 py-2.5 rounded-xl text-white text-xs font-black shadow-md shadow-orange-500/10 transition-colors font-sans"
                  >
                    Save Recipe
                  </button>
                  <button
                    onClick={() => setShowNewRecipeModal(false)}
                    className="bg-gray-100 hover:bg-gray-200 py-2.5 px-4 rounded-xl text-gray-500 text-xs font-black transition-colors font-sans"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* Instagram Style Square Recipe Feed */}
            <div className="grid grid-cols-3 gap-[1.5px] -mx-6 pb-6">
              {filteredRecipes.length === 0 ? (
                <div className="col-span-3 text-center py-12 bg-white/55 border border-dashed border-orange-100 rounded-[28px] p-6 mx-6 font-sans">
                  <span className="text-3xl inline-block">🍲</span>
                  <h5 className="font-bold text-xs text-orange-950 mt-2 font-sans font-extrabold">
                    No recipes match current tags
                  </h5>
                  <p className="text-[10px] text-orange-950/40 font-sans font-medium">
                    Try adjusting your search query, choosing another tag above, or configuring your dietary profile.
                  </p>
                </div>
              ) : (
                filteredRecipes.map((recipe) => (
                  <motion.div
                    key={recipe.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openRecipeDetails(recipe)}
                    className="aspect-square bg-stone-100 overflow-hidden relative cursor-pointer select-none active:brightness-90 transition-all duration-150"
                  >
                    {/* Cover Photo */}
                    <img
                      src={recipe.image}
                      className="w-full h-full object-cover pointer-events-none"
                      alt={recipe.name}
                      referrerPolicy="no-referrer"
                    />

                    {/* Gradient Scrim Vignette for supreme text legibility */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none z-10" />

                    {/* Minimalist Top-Right Calories Pill */}
                    <div className="absolute top-1.5 right-1.5 bg-black/40 backdrop-blur-[4px] border border-white/5 px-1.5 py-0.5 rounded-md text-[8px] font-black text-white font-mono tracking-wider z-20 shadow-sm">
                      {recipe.calories} <span className="text-[7px] text-orange-300 font-sans font-bold">kcal</span>
                    </div>

                    {/* Minimalist Bottom Left Info (Always Visible) */}
                    <div className="absolute bottom-1.5 left-2 right-2 text-left z-20 flex flex-col pointer-events-none">
                      <span className="text-[9.5px] font-black text-white/95 leading-tight tracking-tight line-clamp-1">
                        {recipe.name}
                      </span>
                      <span className="text-[7px] text-orange-200/90 font-black uppercase tracking-wider mt-0.5">
                        ⏱️ {recipe.time}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {profileTab === "insights" && (
          <div className="pb-8">
            <InsightsView />
          </div>
        )}

        {profileTab === "goals" && (
          <div className="p-6 max-w-[calc(448px)] mx-auto space-y-6">
            {/* Preferences */}
            <div className="bg-white rounded-[28px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/5">
              <div className="mb-4">
                <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Dietary Profiler
                </h4>
                <p className="text-xs text-orange-950/50 font-medium font-sans">
                  Toggle active diets, allergen exclusions, or type a custom
                  preference below.
                </p>
              </div>

              {/* Presets Toggle Grid */}
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESET_DIETS.map((diet) => {
                  const isActive = profileData.preferences.some(
                    (p: string) => p.toLowerCase() === diet.name.toLowerCase(),
                  );
                  return (
                    <motion.button
                      key={diet.name}
                      onClick={() => togglePreference(diet.name)}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-300 shadow-sm font-sans",
                        isActive
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-400/20 border border-transparent"
                          : "bg-orange-50/20 border border-orange-100/40 text-orange-950/70 hover:bg-orange-50 hover:text-orange-950",
                      )}
                    >
                      <span>{diet.emoji}</span>
                      <span>{diet.label}</span>
                      {isActive && (
                        <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-white ml-0.5">
                          <X className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Custom Exclusions List & Creator */}
              <div className="border-t border-black/[0.03] pt-4 mt-2">
                {/* Custom items currently active (non-presets) */}
                {profileData.preferences.filter(
                  (p: string) =>
                    !PRESET_DIETS.some(
                      (d) => d.name.toLowerCase() === p.toLowerCase(),
                    ),
                ).length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-[10px] font-black text-orange-950/30 uppercase tracking-widest mb-2 font-sans">
                      Custom Exclusions
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {profileData.preferences.map(
                        (pref: string, i: number) => {
                          const isP = PRESET_DIETS.some(
                            (d) => d.name.toLowerCase() === pref.toLowerCase(),
                          );
                          if (isP) return null;
                          return (
                            <div
                              key={i}
                              className="px-3 py-1.5 bg-yellow-50/50 border border-yellow-200/50 rounded-lg text-xs font-bold text-yellow-800 flex items-center gap-1.5 shadow-sm font-sans"
                            >
                              <span>🔖</span>
                              <span>{pref}</span>
                              <button
                                onClick={() => removePreference(i)}
                                className="w-4 h-4 bg-yellow-100 text-yellow-600 rounded-full flex justify-center items-center hover:bg-yellow-200 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {/* Inline Custom Input Maker */}
                <div className="relative">
                  {showCustomInput ? (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 bg-orange-50/30 p-1.5 rounded-2xl border border-orange-100/30"
                    >
                      <input
                        type="text"
                        placeholder="Ex: No cilantro, Soy-Free..."
                        value={customPrefText}
                        onChange={(e) => setCustomPrefText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCustomPref();
                        }}
                        className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-orange-950 px-3 placeholder:text-orange-950/30 font-sans"
                        autoFocus
                      />
                      <button
                        onClick={handleAddCustomPref}
                        className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 font-bold text-[11px] text-white rounded-xl transition-colors shadow-sm shadow-orange-500/10 font-sans"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowCustomInput(false)}
                        className="w-7 h-7 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => setShowCustomInput(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-orange-50/30 border border-dashed border-orange-200/60 hover:border-orange-300 text-orange-600 hover:text-orange-700 rounded-xl text-xs font-bold transition-all duration-200 mt-1 font-sans"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Custom Restriction</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Goals */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-black/5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest">
                  Core Goals
                </h4>
                <span className="text-[8px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Tap to Configure
                </span>
              </div>
              <div className="flex gap-4">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openGoalConfig("dailyCalories")}
                  className="flex-1 bg-gradient-to-br from-orange-500/5 to-orange-500/10 hover:from-orange-500/10 hover:to-orange-500/15 rounded-2xl p-4 border border-orange-500/15 relative cursor-pointer group transition-colors text-left"
                >
                  <div className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1 flex justify-between items-center">
                    <span>Daily Intake</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-orange-950 tracking-tight">
                      {profileData.goals.dailyCalories.toLocaleString()}
                    </span>{" "}
                    <span className="text-[8px] font-black text-orange-950/40 uppercase">
                      kcal
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openGoalConfig("weightGoal")}
                  className="flex-1 bg-gradient-to-br from-blue-500/5 to-blue-500/10 hover:from-blue-500/10 hover:to-blue-500/15 rounded-2xl p-4 border border-blue-500/15 relative cursor-pointer group transition-colors text-left"
                >
                  <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 flex justify-between items-center">
                    <span>Weight Goal</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-blue-950 tracking-tight">
                      {profileData.goals.weightGoal}
                    </span>{" "}
                    <span className="text-[8px] font-black text-blue-950/40 uppercase">
                      kg
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Macro Limits */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-black/5">
              <h4 className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest mb-4">
                Macro Targets
              </h4>
              <div className="space-y-3">
                {Object.entries(profileData.macros).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex justify-between items-center text-sm font-medium bg-gray-50/50 p-2 rounded-lg"
                  >
                    <span className="capitalize text-gray-500">{key}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={val as number}
                        onChange={(e) =>
                          updateMacro(key, parseInt(e.target.value) || 0)
                        }
                        className="w-16 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100 font-bold text-orange-950 text-right focus:outline-none"
                      />
                      <span className="text-orange-950/50 text-xs font-bold leading-none">
                        g
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        )}
      </div>


    </motion.div>
  );
};

const EditProfileView = ({
  profileData,
  setProfileData,
  setActiveTab,
}: {
  key?: string;
  profileData: any;
  setProfileData: any;
  setActiveTab: (tab: string) => void;
}) => {
  // BMI calculation
  const weight = profileData.weight || 70;
  const height = profileData.height || 170;
  const heightM = height / 100;
  const bmi = heightM > 0 ? parseFloat((weight / (heightM * heightM)).toFixed(1)) : 0;

  // DOB age calculation
  const getAge = (dobString: string) => {
    if (!dobString) return 0;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let ageVal = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      ageVal--;
    }
    return ageVal;
  };

  const calculatedAge = getAge(profileData.dob);

  const getBmiStatus = (bmiValue: number) => {
    if (bmiValue < 18.5) {
      return {
        label: "Underweight",
        color: "text-blue-500",
        bg: "bg-blue-50/55",
        border: "border-blue-100",
        barColor: "bg-blue-500",
        desc: "Consider consulting a nutritionist to gain healthy mass safely."
      };
    }
    if (bmiValue < 25) {
      return {
        label: "Normal Weight",
        color: "text-emerald-500",
        bg: "bg-emerald-50/55",
        border: "border-emerald-100",
        barColor: "bg-emerald-500",
        desc: "Excellent! You are in a healthy, balanced weight zone."
      };
    }
    if (bmiValue < 30) {
      return {
        label: "Overweight",
        color: "text-orange-500",
        bg: "bg-orange-50/55",
        border: "border-orange-100",
        barColor: "bg-orange-500",
        desc: "Keep logging daily meals and maintaining a moderate active deficit."
      };
    }
    return {
      label: "Obese",
      color: "text-red-500",
      bg: "bg-red-50/55",
      border: "border-red-100",
      barColor: "bg-red-500",
      desc: "Work with FitAI Sync triggers and coaching to steadily guide your calorie deficit."
    };
  };

  const bmiStatus = getBmiStatus(bmi);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="mt-4 relative z-10 pb-32"
    >
      <div className="px-6 space-y-6 max-w-[448px] mx-auto">
        {/* Navigation Action bar */}
        <div className="flex justify-between items-center bg-white px-4 py-3 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02]">
          <button
            onClick={() => setActiveTab("profile")}
            className="text-orange-500 font-bold text-sm px-2 py-1 rounded-full hover:bg-orange-50 transition-colors"
          >
            Cancel
          </button>
          <h2 className="text-[14px] font-black tracking-widest uppercase text-[#1a1a1a]">
            Edit Profile
          </h2>
          <button
            onClick={() => setActiveTab("profile")}
            className="text-orange-500 font-bold text-sm px-2 py-1 rounded-full hover:bg-orange-50 transition-colors"
          >
            Done
          </button>
        </div>

        {/* Unified Profile Form Elements */}
        <div className="space-y-5">
          
          {/* Card 1: Identity (Name & Draggable Expandable Bio) */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-50">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <Smile className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Identity Details</span>
            </div>

            {/* Gold Standard Avatar Picker */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-orange-500 shadow-md bg-stone-100 flex items-center justify-center shrink-0">
                  {profileData.imageUrl ? (
                    <img
                      src={profileData.imageUrl}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-stone-400" />
                  )}
                </div>
                {/* Styled Camera overlay button */}
                <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-95 border border-white">
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const MAX_WIDTH = 200;
                          const MAX_HEIGHT = 200;
                          let width = img.width;
                          let height = img.height;

                          if (width > height) {
                            if (width > MAX_WIDTH) {
                              height *= MAX_WIDTH / width;
                              width = MAX_WIDTH;
                            }
                          } else {
                            if (height > MAX_HEIGHT) {
                              width *= MAX_HEIGHT / height;
                              height = MAX_HEIGHT;
                            }
                          }

                          canvas.width = width;
                          canvas.height = height;
                          const ctx = canvas.getContext("2d");
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);
                            // Compress to lightweight 70% quality JPEG
                            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                            setProfileData({ ...profileData, imageUrl: dataUrl });
                          }
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider">
                Upload or change avatar
              </span>
            </div>

            <div>
              <label className="text-[9px] font-black text-[#9e9e9e] uppercase tracking-widest block mb-1 px-1">
                Full Name
              </label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) =>
                  setProfileData({ ...profileData, name: e.target.value })
                }
                className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3 text-sm font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-shadow"
              />
            </div>



            <div>
              <div className="flex justify-between items-center mb-1 px-1">
                <label className="text-[9px] font-black text-[#9e9e9e] uppercase tracking-widest">
                  Bio Description
                </label>
                <span className="text-[8px] font-bold text-stone-400 flex items-center gap-0.5">
                  ↘ Drag corner to expand
                </span>
              </div>
              
              <div className="relative">
                <textarea
                  value={profileData.description}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      description: e.target.value.slice(0, 300),
                    })
                  }
                  placeholder="Write a custom fitness bio..."
                  className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-orange-500/10 resize-y min-h-[96px] border border-transparent hover:border-stone-200 focus:border-transparent transition-colors"
                />
              </div>
              
              <div className="flex justify-between items-center mt-1 px-1">
                <span className="text-[8px] font-bold text-stone-400">Max 300 characters</span>
                <span className={cn("text-[9px] font-black tracking-wider", (profileData.description || "").length >= 280 ? "text-orange-600" : "text-stone-400")}>
                  {(profileData.description || "").length}/300
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Age & Gender Settings (WITH DRAGGABLE EXPANDABLE INPUTS) */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-50">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <User className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Age & Birthdate Settings</span>
            </div>

            {/* DOB Selection */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="text-[9px] font-black text-[#9e9e9e] uppercase tracking-widest">
                  Date of Birth
                </label>
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  {calculatedAge ? `${calculatedAge} Yrs Old` : "Set Date"}
                </span>
              </div>
              <input
                type="date"
                value={profileData.dob}
                onChange={(e) =>
                  setProfileData({ ...profileData, dob: e.target.value })
                }
                className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3 text-sm font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-orange-500/10"
              />
            </div>

          </div>

          {/* Card 3: Interactive Vitals Layout (DECONSTRUCTED ROWS WITH BI-DIRECTIONAL SLIDERS) */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <Scale className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Vitals & Biometrics</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">Bi-directional slider sync</span>
            </div>

            {/* Weight Control Row */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-3 shadow-2xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Body Weight</span>
                </div>
                <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-xl px-2.5 py-1">
                  <input
                    type="number"
                    value={profileData.weight || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setProfileData({ ...profileData, weight: val });
                    }}
                    className="w-10 text-center text-xs font-black text-stone-800 focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">kg</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, weight: Math.max(30, (profileData.weight || 70) - 1) })}
                  className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 font-bold hover:bg-stone-100 active:scale-95 transition-all shadow-sm text-xs"
                >
                  -
                </button>
                <input
                  type="range"
                  min="30"
                  max="160"
                  value={profileData.weight || 70}
                  onChange={(e) => {
                    setProfileData({ ...profileData, weight: parseInt(e.target.value) });
                  }}
                  className="flex-1 accent-orange-500 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, weight: Math.min(160, (profileData.weight || 70) + 1) })}
                  className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 font-bold hover:bg-stone-100 active:scale-95 transition-all shadow-sm text-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Height Control Row */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-3 shadow-2xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Height</span>
                </div>
                <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-xl px-2.5 py-1">
                  <input
                    type="number"
                    value={profileData.height || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setProfileData({ ...profileData, height: val });
                    }}
                    className="w-10 text-center text-xs font-black text-stone-800 focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">cm</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, height: Math.max(100, (profileData.height || 170) - 1) })}
                  className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 font-bold hover:bg-stone-100 active:scale-95 transition-all shadow-sm text-xs"
                >
                  -
                </button>
                <input
                  type="range"
                  min="100"
                  max="220"
                  value={profileData.height || 170}
                  onChange={(e) => {
                    setProfileData({ ...profileData, height: parseInt(e.target.value) });
                  }}
                  className="flex-1 accent-orange-500 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, height: Math.min(220, (profileData.height || 170) + 1) })}
                  className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 font-bold hover:bg-stone-100 active:scale-95 transition-all shadow-sm text-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Live BMI Progress & Status Card */}
            <div className={cn("p-4 rounded-2xl border flex flex-col gap-3 transition-colors duration-300 shadow-2xs", bmiStatus.bg, bmiStatus.border)}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className={cn("w-4 h-4", bmiStatus.color)} />
                  <span className="text-[9px] font-black uppercase tracking-wider text-stone-500">Body Mass Index (BMI)</span>
                </div>
                <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white border shadow-3xs", bmiStatus.color)}>
                  {bmiStatus.label}
                </span>
              </div>
              
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-stone-900 tracking-tight leading-none">{bmi}</span>
                <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Index Value</span>
              </div>

              {/* zones scale visual bar */}
              <div className="space-y-1.5 pt-1">
                <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden flex relative">
                  <div className="w-[40%] h-full bg-blue-400/80" title="Underweight (< 18.5)" />
                  <div className="w-[15%] h-full bg-emerald-400/80" title="Normal (18.5 - 24.9)" />
                  <div className="w-[10%] h-full bg-orange-400/80" title="Overweight (25 - 29.9)" />
                  <div className="w-[35%] h-full bg-red-400/80" title="Obese (>= 30)" />
                </div>
                <div className="flex justify-between text-[7px] font-black text-stone-400 tracking-widest">
                  <span>UNDER: &lt;18.5</span>
                  <span>NORMAL: 18.5-24.9</span>
                  <span>OVER: 25-29.9</span>
                  <span>OBESE: &gt;=30</span>
                </div>
              </div>

              <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                {bmiStatus.desc}
              </p>
            </div>
          </div>

          {/* Card 4: Agent Memory & Connected GPT Sync (Bi-directional) */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4">
            <div className="flex justify-between items-center border-b border-stone-150 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <Database className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Agent Memory</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full select-none flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                GPT Sync Active
              </span>
            </div>



            <div>
              <div className="flex justify-between items-center mb-1 px-1">
                <label className="text-[9px] font-black text-[#9e9e9e] uppercase tracking-widest">
                  Memory Slots (One item per line)
                </label>
                <span className="text-[8px] font-bold text-stone-400">
                  ↘ Drag corner to expand
                </span>
              </div>

              <textarea
                value={profileData.memories.join("\n")}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    memories: e.target.value.split("\n"),
                  })
                }
                placeholder="List memories (e.g. Likes eggs, allergic to shellfish)..."
                className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-orange-500/10 resize-y min-h-[120px] border border-transparent hover:border-stone-200 focus:border-transparent transition-colors"
              />
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
};

const ProUpgradeModal = ({ onClose }: { onClose: () => void }) => (
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

      <div className="flex-1 space-y-6">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[32px] p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <h3 className="text-2xl font-bold mb-2 relative z-10">
            Maximize Your Results
          </h3>
          <p className="text-orange-100 font-medium mb-6 relative z-10 text-sm">
            Unlock personalized coaching, deep data insights, and advanced
            integrations.
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
        <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 rounded-[24px] shadow-lg shadow-orange-500/20 active:scale-95 transition-transform">
          Start 7-Day Free Trial
        </button>
        <div className="text-center text-[10px] text-[#9e9e9e] mt-4 font-medium">
          Cancel anytime. Auto-renews after 7 days.
        </div>
      </div>
    </motion.div>
  </div>
);

const SettingsView = ({
  profileData,
  setProfileData,
  triggerToast
}: {
  key?: string;
  profileData: any;
  setProfileData: any;
  triggerToast: (msg: string) => void;
}) => {
  const [showPro, setShowPro] = useState(false);
  const [showYaml, setShowYaml] = useState(false);

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/gpt-action`;

  const [notionKey, setNotionKey] = useState(profileData.notionApiKey || "");
  const [notionDb, setNotionDb] = useState(profileData.notionDatabaseId || "");
  const [sheetsWebhook, setSheetsWebhook] = useState(profileData.googleSheetsWebhookUrl || "");
  const [gptUrlVal, setGptUrlVal] = useState(localStorage.getItem("fitai_custom_gpt_url") || "");

  const handleSaveNotion = () => {
    setProfileData({
      ...profileData,
      notionApiKey: notionKey.trim(),
      notionDatabaseId: notionDb.trim()
    });
    triggerToast("💾 Saved Notion settings! Syncing to Supabase...");
  };

  const handleSaveSheets = () => {
    setProfileData({
      ...profileData,
      googleSheetsWebhookUrl: sheetsWebhook.trim()
    });
    triggerToast("💾 Saved Google Sheets webhook! Syncing...");
  };

  const handleSaveGptUrl = () => {
    localStorage.setItem("fitai_custom_gpt_url", gptUrlVal.trim());
    triggerToast("💾 Saved Custom GPT Link!");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`📋 Copied ${label} to clipboard!`);
  };

  const openApiYaml = `openapi: 3.1.0
info:
  title: FitAI GPT Sync Action API
  description: API for synchronizing user profiles, food/nutrition logs, recipes, and memories with the FitAI dashboard.
  version: 1.0.0
servers:
  - url: ${edgeFunctionUrl}
paths:
  /profile:
    get:
      summary: Retrieve the user's profile details
      operationId: getProfile
      responses:
        '200':
          description: Profile retrieved successfully
    post:
      summary: Update user profile or add memories
      operationId: updateProfile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                display_name:
                  type: string
                description:
                  type: string
                height:
                  type: integer
                weight:
                  type: number
                gender:
                  type: string
                daily_calories_goal:
                  type: integer
                weight_goal:
                  type: number
                preferences:
                  type: array
                  items:
                    type: string
                memories:
                  type: array
                  items:
                    type: string
      responses:
        '200':
          description: Profile updated successfully
  /meals:
    get:
      summary: Get logged meals for a specific date
      operationId: getMeals
      parameters:
        - name: date
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Logged meals retrieved successfully
    post:
      summary: Log a new meal
      operationId: logMeal
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - calories
              properties:
                name:
                  type: string
                calories:
                  type: integer
                protein:
                  type: integer
                carbs:
                  type: integer
                fats:
                  type: integer
                type:
                  type: string
                time:
                  type: string
                date:
                  type: string
      responses:
        '201':
          description: Meal logged successfully
  /recipes:
    get:
      summary: List user recipes
      operationId: getRecipes
      responses:
        '200':
          description: Recipes retrieved successfully
    post:
      summary: Save a new custom recipe
      operationId: saveRecipe
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
              properties:
                name:
                  type: string
                time:
                  type: string
                calories:
                  type: integer
                protein:
                  type: integer
                carbs:
                  type: integer
                fats:
                  type: integer
                tags:
                  type: array
                  items:
                    type: string
                ingredients:
                  type: array
                  items:
                    type: string
                instructions:
                  type: string
      responses:
        '201':
          description: Recipe saved successfully
components:
  schemas: {}
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
security:
  - BearerAuth: []`;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="px-6 mt-8 relative z-10 space-y-6 pb-24 font-sans text-left"
      >
        <div className="flex justify-between items-end mb-2 text-left">
          <h2 className="text-[3rem] font-light tracking-tight text-[#1a1a1a] leading-none mb-4">
            Settings
          </h2>
        </div>

        {/* Database Status banner */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/5 flex items-center gap-3">
          <div className={cn("w-3.5 h-3.5 rounded-full shrink-0", isSupabaseConfigured ? "bg-emerald-500 animate-pulse" : "bg-orange-500")} />
          <div className="flex-1">
            <div className="font-bold text-xs text-[#1a1a1a]">
              {isSupabaseConfigured ? "Supabase Cloud Sync Connected" : "Local Demo Mode Active"}
            </div>
            <div className="text-[9px] text-[#9e9e9e] font-semibold mt-0.5 leading-tight uppercase tracking-wider">
              {isSupabaseConfigured ? "Syncing profile, meals, and recipes in real-time" : "Setup VITE_SUPABASE_URL in .env.local to activate"}
            </div>
          </div>
        </div>

        {/* ChatGPT Custom GPT Action settings */}
        {isSupabaseConfigured && (
          <div>
            <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
              Custom GPT Action Setup
            </h3>
            <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <p className="text-[10px] text-stone-500 leading-relaxed font-semibold">
                🤖 Connect your ChatGPT Custom GPT to track food/images directly into FitAI in real-time. Use the credentials below:
              </p>
              
              <div className="space-y-3">
                {/* API Endpoint field */}
                <div>
                  <label className="text-[8px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                    Edge Action URL (Server URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={edgeFunctionUrl}
                      className="flex-1 bg-stone-50 border border-stone-150 rounded-xl px-3 py-1.5 text-[10px] font-bold text-stone-700 focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(edgeFunctionUrl, "API Endpoint URL")}
                      className="bg-stone-900 text-white text-[9px] font-black uppercase tracking-wider px-3.5 rounded-xl hover:bg-stone-850 active:scale-95 transition-all"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* API Key field */}
                <div>
                  <label className="text-[8px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                    Your Authentication Token (Bearer Key)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      readOnly
                      value={profileData.api_key || "No token generated"}
                      className="flex-1 bg-stone-50 border border-stone-150 rounded-xl px-3 py-1.5 text-[10px] font-bold text-stone-700 focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(profileData.api_key, "API Bearer Token")}
                      className="bg-stone-900 text-white text-[9px] font-black uppercase tracking-wider px-3.5 rounded-xl hover:bg-stone-850 active:scale-95 transition-all"
                    >
                      Copy Key
                    </button>
                  </div>
                </div>

                {/* Custom GPT Redirect Link field */}
                <div className="pt-2 border-t border-stone-100">
                  <label className="text-[8px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                    ChatGPT Custom GPT Redirect Link
                  </label>
                  <p className="text-[8px] text-stone-400 font-semibold mb-2 leading-tight">
                    Optional: Paste your Custom GPT URL here (e.g., https://chatgpt.com/g/g-xxxxx). If set, the homepage manual "+" button will open this Custom GPT in a new tab immediately.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="e.g. https://chatgpt.com/g/g-your-custom-gpt"
                      value={gptUrlVal}
                      onChange={(e) => setGptUrlVal(e.target.value)}
                      className="flex-1 bg-stone-50 border border-stone-150 rounded-xl px-3 py-1.5 text-[10px] font-bold text-stone-700 focus:outline-none"
                    />
                    <button
                      onClick={handleSaveGptUrl}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black uppercase tracking-wider px-3.5 rounded-xl active:scale-95 transition-all"
                    >
                      Save Link
                    </button>
                  </div>
                </div>

                {/* OpenAPI YAML Schema toggle */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowYaml(!showYaml)}
                    className="w-full bg-orange-50 hover:bg-orange-100 text-orange-600 text-[9px] font-black uppercase tracking-widest py-2 rounded-xl transition-colors border border-orange-200/50"
                  >
                    {showYaml ? "Hide OpenAPI YAML Spec" : "Show OpenAPI YAML Spec"}
                  </button>
                  {showYaml && (
                    <div className="mt-3 relative text-left">
                      <pre className="text-[8px] font-bold bg-stone-950 text-emerald-400/90 rounded-2xl p-4 overflow-x-auto max-h-48 leading-relaxed border border-stone-850 select-text">
                        {openApiYaml}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(openApiYaml, "OpenAPI Schema")}
                        className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white text-[8px] font-black uppercase px-2 py-1 rounded-lg"
                      >
                        Copy Spec
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Customization Settings */}
        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            AI Image Refinement
          </h3>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <Sparkles className="w-4 h-4 fill-orange-500 text-orange-500" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[#1a1a1a] text-xs">Aesthetic Food Photo Refiner</div>
                <p className="text-[9px] text-stone-500 leading-tight mt-1 font-semibold">
                  Auto-generates professional, gourmet-styled food photography matching your text-logged meals.
                </p>
              </div>
            </div>
            
            {/* Toggle Switch */}
            <button
              onClick={() => {
                const prefs = profileData.preferences || [];
                const isEnabled = prefs.includes("refine_food_pics");
                let newPrefs;
                if (isEnabled) {
                  newPrefs = prefs.filter((p: string) => p !== "refine_food_pics");
                  triggerToast("✨ Aesthetic Photo Refiner disabled");
                } else {
                  newPrefs = [...prefs, "refine_food_pics"];
                  triggerToast("✨ Aesthetic Photo Refiner enabled!");
                }
                setProfileData({ ...profileData, preferences: newPrefs });
              }}
              className={cn(
                "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer shrink-0 border border-black/5 focus:outline-none flex items-center",
                (profileData.preferences || []).includes("refine_food_pics") ? "bg-orange-500 justify-end" : "bg-stone-200 justify-start"
              )}
            >
              <motion.div
                layout
                className="w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Cloud Sync Integration (Notion / Google Sheets) */}
        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            Real-Time Cloud Integrations
          </h3>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-5">
            {/* Notion Integration inputs */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-black text-xs shadow-sm select-none shrink-0">
                  N
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] text-xs">Notion database Sync</div>
                  <div className="text-[9px] text-[#9e9e9e] font-medium leading-none mt-1">
                    Auto-inserts logged meals as database pages
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-1">
                <input
                  type="password"
                  placeholder="Notion Integration Token (secret_...)"
                  value={notionKey}
                  onChange={(e) => setNotionKey(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-150 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Notion Database UUID (32 characters)"
                  value={notionDb}
                  onChange={(e) => setNotionDb(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-150 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none"
                />
                <button
                  onClick={handleSaveNotion}
                  className="w-full bg-stone-900 hover:bg-stone-850 text-white text-[9px] font-black uppercase tracking-wider py-2 rounded-xl transition-all cursor-pointer"
                >
                  Save Notion Settings
                </button>
              </div>
            </div>

            <hr className="border-stone-100" />

            {/* Google Sheets inputs */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] text-xs">Google Sheets Stream</div>
                  <div className="text-[9px] text-[#9e9e9e] font-medium leading-none mt-1">
                    Streams daily metrics to your custom sheet webhook
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  placeholder="Sheets Webhook URL (Make, Zapier, or Script URL)"
                  value={sheetsWebhook}
                  onChange={(e) => setSheetsWebhook(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-150 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none"
                />
                <button
                  onClick={handleSaveSheets}
                  className="w-full bg-stone-900 hover:bg-stone-850 text-white text-[9px] font-black uppercase tracking-wider py-2 rounded-xl transition-all cursor-pointer"
                >
                  Save Google Sheets Webhook
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Account Management */}
        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            Account Management
          </h3>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-bold text-[#1a1a1a] text-xs">Logged in as @{profileData.username || "guest"}</div>
              <div className="text-[9px] text-stone-400 font-semibold leading-tight mt-1">
                Sign out of your account on this device
              </div>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.removeItem("fitai_active_profile_id");
                setActiveProfileId(null);
                showToast("🔒 Logged out successfully");
              }}
              className="bg-stone-900 text-white hover:bg-stone-850 text-[9px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Subscription */}
        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            Subscription
          </h3>
          <div className="bg-white rounded-[24px] p-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div
              className="flex justify-between items-center py-3 px-4 hover:bg-[#f5f5f5] rounded-[16px] transition-colors cursor-pointer group"
              onClick={() => setShowPro(true)}
            >
              <div className="flex items-center gap-4">
                <div className="w-[18px] h-[18px] text-[#4a4a4a] flex items-center justify-center font-bold">
                  ✨
                </div>
                <div>
                  <div className="font-medium text-[#1a1a1a]">FitAI Free</div>
                  <div className="text-[11px] text-[#9e9e9e] mt-0.5 font-medium">
                    Upgrade to Pro for limitless insights
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-white bg-orange-500 px-3 py-1 rounded-full uppercase tracking-wider">
                Upgrade
              </span>
            </div>
          </div>
        </div>

        {/* General Options */}
        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            General Options
          </h3>
          <div className="bg-white rounded-[24px] p-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex justify-between items-center py-3 px-4 hover:bg-[#f5f5f5] rounded-[16px] transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <User className="w-[18px] h-[18px] text-[#4a4a4a]" />
                <span className="font-medium text-[#1a1a1a]">Profile Configuration</span>
              </div>
              <ChevronRight className="w-[16px] h-[16px] text-[#d1d1d1] group-hover:text-[#4a4a4a] transition-colors" />
            </div>
            <div className="flex justify-between items-center py-3 px-4 hover:bg-[#f5f5f5] rounded-[16px] transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <Target className="w-[18px] h-[18px] text-[#4a4a4a]" />
                <span className="font-medium text-[#1a1a1a]">Dietary Goals</span>
              </div>
              <span className="text-[10px] font-semibold text-[#4a4a4a] bg-[#f5f5f5] px-3 py-1 rounded-full uppercase tracking-wider">
                Maintain
              </span>
            </div>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {showPro && <ProUpgradeModal onClose={() => setShowPro(false)} />}
      </AnimatePresence>
    </>
  );
};

const ManualLogModal = ({
  onClose,
  onAddMeal,
}: {
  onClose: () => void;
  onAddMeal: (meal: any) => void;
}) => {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [time, setTime] = useState(() => {
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return new Date().toLocaleTimeString("en-US", timeOptions);
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="bg-white rounded-t-[36px] w-full max-w-md p-6 space-y-6 relative z-10 shadow-2xl"
      >
        <div className="flex justify-between items-center pb-2 border-b border-black/[0.04]">
          <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-1.5">
            <Utensils className="w-4 h-4 text-orange-500" />
            Manual Calorie Log
          </h4>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100/80 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-left">
          <div>
            <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1">
              Meal / Snack Name
            </label>
            <input
              type="text"
              placeholder="E.g. Grilled Chicken Salad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                Calories (kcal)
              </label>
              <input
                type="number"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" /> Log Time (Local)
              </label>
              <input
                type="text"
                placeholder="E.g. 12:30 PM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                Fats (g)
              </label>
              <input
                type="number"
                placeholder="0"
                value={fats}
                onChange={(e) => setFats(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (!name.trim()) return;
            onAddMeal({
              name: name.trim(),
              calories: parseInt(calories) || 0,
              protein: parseInt(protein) || 0,
              carbs: parseInt(carbs) || 0,
              fats: parseInt(fats) || 0,
              type: "Manual Log",
              time: time.trim(),
            });
            onClose();
          }}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs py-3.5 rounded-xl font-black uppercase tracking-widest text-center shadow-lg transition-colors cursor-pointer"
        >
          Add to Daily Plate
        </button>
      </motion.div>
    </div>
  );
};


export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("macros");
  const [activeTab, setActiveTab] = useState("home");
  const [isCameraFullScreen, setIsCameraFullScreen] = useState(false);

  // Custom world-class popup states
  const [selectedRecipePopup, setSelectedRecipePopup] = useState<Recipe | null>(
    null,
  );
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editPopupName, setEditPopupName] = useState("");
  const [editPopupTime, setEditPopupTime] = useState("");
  const [editPopupCalories, setEditPopupCalories] = useState("");
  const [editPopupProtein, setEditPopupProtein] = useState("");
  const [editPopupCarbs, setEditPopupCarbs] = useState("");
  const [editPopupFats, setEditPopupFats] = useState("");
  const [editPopupTags, setEditPopupTags] = useState<string[]>([]);
  const [editPopupIngredients, setEditPopupIngredients] = useState("");
  const [editPopupInstructions, setEditPopupInstructions] = useState("");
  const [editPopupMicros, setEditPopupMicros] = useState<
    { name: string; value: number; unit: string }[]
  >([]);
  const [aiConfigMode, setAiConfigMode] = useState<"ai" | "manual">("ai");
  const [isAiCalculating, setIsAiCalculating] = useState(false);

  type GoalPopupType = "dailyCalories" | "weightGoal" | null;
  const [activeGoalConfigPopup, setActiveGoalConfigPopup] =
    useState<GoalPopupType>(null);
  const [goalConfigValue, setGoalConfigValue] = useState(2000);

  const INITIAL_PROFILE_STATE = {
    name: "John Doe",
    imageUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=60",
    description:
      "Fitness enthusiast & tech geek. Building a sustainable, high-protein lifestyle. Always optimizing! ✨ Adding more text here to test out the expansion feature and see how it works when the description gets fairly long.",
    height: 183,
    weight: 80,
    dob: "1998-05-15",
    gender: "Male",
    memories: [
      "Prefers high protein diet, specifically chicken and eggs.",
      "Allergic to shellfish.",
      "Usually works out at 6 PM on weekdays.",
    ],
    preferences: ["Gluten Free", "Keto"],
    goals: {
      dailyCalories: 2000,
      weightGoal: 75,
    },
    macros: {
      protein: 150,
      carbs: 50,
      fats: 80,
      fiber: 30,
    },
    trackMicros: true,
    micros: [
      { name: "Selenium", target: 55, unit: "mcg" },
      { name: "Vitamin A", target: 900, unit: "mcg" },
    ],
    api_key: "",
    notionApiKey: "",
    notionDatabaseId: "",
    googleSheetsWebhookUrl: ""
  };

  // Precise selected date tracking states
  const [selectedDate, setSelectedDate] = useState<string>("2026-07-08");
  const [daysList, setDaysList] = useState([
    { day: "MON", date: 6, fullDate: "2026-07-06" },
    { day: "TUE", date: 7, fullDate: "2026-07-07" },
    { day: "WED", date: 8, fullDate: "2026-07-08" },
    { day: "THU", date: 9, fullDate: "2026-07-09" },
    { day: "FRI", date: 10, fullDate: "2026-07-10" },
    { day: "SAT", date: 11, fullDate: "2026-07-11" },
  ]);
  const [isConfiguringDate, setIsConfiguringDate] = useState(false);
  const [configuringDateIndex, setConfiguringDateIndex] = useState<number | null>(null);
  const [tempFullDate, setTempFullDate] = useState("2026-07-08");

  const updateDayAtIndex = (index: number, newDateString: string) => {
    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const d = new Date(newDateString + "T00:00:00");
    const updatedDay = {
      day: daysOfWeek[d.getDay()],
      date: d.getDate(),
      fullDate: newDateString
    };

    setDaysList((prev) => {
      const copy = [...prev];
      copy[index] = updatedDay;
      return copy;
    });
    setSelectedDate(newDateString);
  };

  const [profileData, setProfileDataState] = useState(INITIAL_PROFILE_STATE);
  const [mealsState, setMealsState] = useState<Meal[]>([]);
  const [recipes, setRecipesState] = useState<Recipe[]>([]);

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [session, setSession] = useState<any>(null);
  const [showDeveloperBypass, setShowDeveloperBypass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);

  const [onboardName, setOnboardName] = useState("");
  const [onboardHeight, setOnboardHeight] = useState("170");
  const [onboardWeight, setOnboardWeight] = useState("70");
  const [onboardDob, setOnboardDob] = useState("1998-05-15");
  const [onboardGender, setOnboardGender] = useState("Male");
  const [onboardBio, setOnboardBio] = useState("");
  const [onboardAvatar, setOnboardAvatar] = useState("");
  const [isOnboardLoading, setIsOnboardLoading] = useState(false);

  const handleUserAuthenticated = async (user: any) => {
    try {
      const { data: existing, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error("Error looking up authenticated user profile:", error);
        return;
      }

      if (existing) {
        setActiveProfileId(existing.id);
        localStorage.setItem("fitai_active_profile_id", existing.id);
      } else {
        const newKey = "sb_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const username = user.email ? user.email.split('@')[0] : "user_" + Math.random().toString(36).substring(7);
        
        const googleName = user.user_metadata?.full_name || username;
        const googleAvatar = user.user_metadata?.avatar_url || null;

        const newProfile = {
          id: user.id,
          username,
          display_name: googleName,
          image_url: googleAvatar,
          height: 175,
          weight: 70,
          dob: "1998-05-15",
          gender: "Male",
          memories: [],
          preferences: [],
          daily_calories_goal: 2000,
          weight_goal: 70.0,
          protein_goal: 150,
          carbs_goal: 150,
          fats_goal: 60,
          fiber_goal: 30,
          api_key: newKey
        };

        const { error: createErr } = await supabase
          .from('profiles')
          .insert(newProfile);

        if (createErr) {
          console.error("Error creating authenticated profile:", createErr);
        } else {
          setActiveProfileId(user.id);
          localStorage.setItem("fitai_active_profile_id", user.id);
          showToast(`✨ Profile created for @${username}!`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        console.error("Google login error:", error);
        showToast("❌ Google login failed");
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Google login error");
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        showToast(`❌ Login failed: ${error.message}`);
      } else {
        showToast("✨ Signed in successfully!");
      }
    } catch (err: any) {
      showToast(`❌ Error signing in: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        showToast(`❌ Sign up failed: ${error.message}`);
      } else {
        if (data.session === null) {
          showToast("✉️ Check your email to confirm registration!");
        } else {
          showToast("✨ Account created successfully!");
        }
      }
    } catch (err: any) {
      showToast(`❌ Error signing up: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfileId) return;

    setIsOnboardLoading(true);
    try {
      const updatedPrefs = [...(profileData.preferences || []), "onboarded"];
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: onboardName.trim(),
          image_url: onboardAvatar || null,
          height: parseInt(onboardHeight) || 170,
          weight: parseFloat(onboardWeight) || 70,
          dob: onboardDob,
          gender: onboardGender,
          description: onboardBio.trim(),
          preferences: updatedPrefs
        })
        .eq('id', activeProfileId);

      if (error) {
        showToast("❌ Failed to save onboarding settings");
        console.error(error);
      } else {
        setProfileDataState((prev: any) => ({
          ...prev,
          name: onboardName.trim(),
          imageUrl: onboardAvatar || null,
          height: parseInt(onboardHeight) || 170,
          weight: parseFloat(onboardWeight) || 70,
          dob: onboardDob,
          gender: onboardGender,
          description: onboardBio.trim(),
          preferences: updatedPrefs
        }));
        showToast("✨ Welcome to FitAI! Setup complete.");
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Unexpected onboarding error");
    } finally {
      setIsOnboardLoading(false);
    }
  };

  const handleLoginSubmit = async () => {
    const username = loginUsername.toLowerCase().trim();
    if (!username) return;
    
    try {
      const { data: existing, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.error("Error looking up profile:", error);
        showToast("❌ Database connection error");
        return;
      }

      if (existing) {
        setActiveProfileId(existing.id);
        localStorage.setItem("fitai_active_profile_id", existing.id);
        showToast(`✨ Welcome back, @${username}!`);
      } else {
        const newKey = "sb_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const newProfile = {
          username,
          display_name: username.charAt(0).toUpperCase() + username.slice(1),
          height: 175,
          weight: 70,
          dob: "1998-05-15",
          gender: "Male",
          memories: [],
          preferences: [],
          daily_calories_goal: 2000,
          weight_goal: 70.0,
          protein_goal: 150,
          carbs_goal: 150,
          fats_goal: 60,
          fiber_goal: 30,
          api_key: newKey
        };

        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select('id')
          .single();

        if (createErr) {
          console.error("Error creating new profile:", createErr);
          showToast("❌ Failed to create profile");
        } else if (created) {
          setActiveProfileId(created.id);
          localStorage.setItem("fitai_active_profile_id", created.id);
          showToast(`✨ Created isolated profile for @${username}!`);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Unexpected error occurred");
    }
  };

  const profileDataRef = useRef(profileData);
  profileDataRef.current = profileData;

  const dbUpdateTimeoutRef = useRef<number | null>(null);

  const setProfileData = (newData: any) => {
    let resolvedData: any;
    if (typeof newData === 'function') {
      resolvedData = newData(profileDataRef.current);
    } else {
      resolvedData = newData;
    }
    
    setProfileDataState(resolvedData);

    if (isSupabaseConfigured && activeProfileId) {
      if (dbUpdateTimeoutRef.current) {
        clearTimeout(dbUpdateTimeoutRef.current);
      }

      dbUpdateTimeoutRef.current = setTimeout(async () => {
        const { error } = await supabase
          .from('profiles')
          .update({
            display_name: resolvedData.name,
            image_url: resolvedData.imageUrl,
            description: resolvedData.description,
            height: resolvedData.height,
            weight: resolvedData.weight,
            dob: resolvedData.dob,
            gender: resolvedData.gender,
            memories: resolvedData.memories,
            preferences: resolvedData.preferences,
            daily_calories_goal: resolvedData.goals.dailyCalories,
            weight_goal: resolvedData.goals.weightGoal,
            protein_goal: resolvedData.macros.protein,
            carbs_goal: resolvedData.macros.carbs,
            fats_goal: resolvedData.macros.fats,
            fiber_goal: resolvedData.macros.fiber,
            track_micros: resolvedData.trackMicros,
            micros: resolvedData.micros,
            notion_api_key: resolvedData.notionApiKey,
            notion_database_id: resolvedData.notionDatabaseId,
            google_sheets_webhook_url: resolvedData.googleSheetsWebhookUrl
          })
          .eq('id', activeProfileId);
        if (error) {
          console.error("Error updating profile in Supabase:", error);
        }
      }, 800) as any;
    }
  };

  const setRecipes = async (newRecipes: Recipe[] | ((prev: Recipe[]) => Recipe[])) => {
    const resolvedRecipes = typeof newRecipes === 'function' ? newRecipes(recipes) : newRecipes;
    setRecipesState(resolvedRecipes);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMealsState(INITIAL_MEALS);
      setRecipesState(INITIAL_RECIPES);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        handleUserAuthenticated(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        handleUserAuthenticated(session.user);
      } else {
        setActiveProfileId(null);
        localStorage.removeItem("fitai_active_profile_id");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const initSupabase = async () => {
      const savedProfileId = localStorage.getItem("fitai_active_profile_id");
      if (savedProfileId) {
        const { data: existing, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', savedProfileId)
          .maybeSingle();

        if (!error && existing) {
          setActiveProfileId(existing.id);
          return;
        }
      }

      // Check if the database has any profiles. If empty, create the default johndoe
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        console.error("Error loading profiles:", error);
        return;
      }

      if (!profiles || profiles.length === 0) {
        const defaultProf = {
          username: "johndoe",
          display_name: "John Doe",
          image_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=60",
          description: "Fitness enthusiast & tech geek. Building a sustainable, high-protein lifestyle. Always optimizing!",
          height: 183,
          weight: 80,
          dob: "1998-05-15",
          gender: "Male",
          memories: [
            "Prefers high protein diet, specifically chicken and eggs.",
            "Allergic to shellfish.",
            "Usually works out at 6 PM on weekdays."
          ],
          preferences: ["Gluten Free", "Keto"],
          daily_calories_goal: 2000,
          weight_goal: 75.0,
          protein_goal: 150,
          carbs_goal: 50,
          fats_goal: 80,
          fiber_goal: 30,
          track_micros: true,
          micros: [
            { name: "Selenium", target: 55, unit: "mcg" },
            { name: "Vitamin A", target: 900, unit: "mcg" }
          ],
          api_key: "test_gpt_secret_token_123"
        };

        const { error: createErr } = await supabase
          .from('profiles')
          .insert(defaultProf);

        if (createErr) {
          console.error("Error creating default profile:", createErr);
        }
      }

      setActiveProfileId(null);
    };

    initSupabase();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !activeProfileId) return;

    const loadProfileAndRecipes = async () => {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeProfileId)
        .single();

      if (profileErr) {
        console.error("Error loading profile details:", profileErr);
        return;
      }

      setProfileDataState({
        name: profile.display_name,
        imageUrl: profile.image_url,
        description: profile.description,
        height: profile.height,
        weight: profile.weight,
        dob: profile.dob,
        gender: profile.gender,
        memories: profile.memories || [],
        preferences: profile.preferences || [],
        goals: {
          dailyCalories: profile.daily_calories_goal,
          weightGoal: profile.weight_goal
        },
        macros: {
          protein: profile.protein_goal,
          carbs: profile.carbs_goal,
          fats: profile.fats_goal,
          fiber: profile.fiber_goal
        },
        trackMicros: profile.track_micros,
        micros: profile.micros || [],
        api_key: profile.api_key,
        notionApiKey: profile.notion_api_key || "",
        notionDatabaseId: profile.notion_database_id || "",
        googleSheetsWebhookUrl: profile.google_sheets_webhook_url || ""
      });

      setOnboardName(profile.display_name || "");
      setOnboardAvatar(profile.image_url || "");
      setOnboardHeight(String(profile.height || 170));
      setOnboardWeight(String(profile.weight || 70));
      setOnboardBio(profile.description || "");
      setOnboardDob(profile.dob || "1998-05-15");
      setOnboardGender(profile.gender || "Male");

      const { data: recipesData, error: recipesErr } = await supabase
        .from('recipes')
        .select('*')
        .eq('profile_id', activeProfileId)
        .order('name', { ascending: true });

      if (recipesErr) {
        console.error("Error loading recipes:", recipesErr);
      } else {
        const mappedRecipes: Recipe[] = (recipesData || []).map(r => ({
          id: r.id,
          name: r.name,
          time: r.time,
          calories: r.calories,
          protein: r.protein,
          carbs: r.carbs,
          fats: r.fats,
          tags: r.tags || [],
          image: r.image,
          ingredients: r.ingredients || [],
          instructions: r.instructions,
          micros: r.micros || []
        }));
        setRecipesState(mappedRecipes);
      }
    };

    loadProfileAndRecipes();
  }, [activeProfileId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !activeProfileId) return;

    const loadMeals = async () => {
      const { data: mealsData, error: mealsErr } = await supabase
        .from('meals')
        .select('*')
        .eq('profile_id', activeProfileId)
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });

      if (mealsErr) {
        console.error("Error loading meals from Supabase:", mealsErr);
      } else {
        const mappedMeals: Meal[] = (mealsData || []).map(m => ({
          id: m.id,
          name: m.name,
          time: m.time,
          type: m.type,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fats: m.fats,
          image: m.image,
          date: m.date
        }));
        setMealsState(mappedMeals);
      }
    };

    loadMeals();
  }, [activeProfileId, selectedDate]);





  const [customCalVal, setCustomCalVal] = useState("");
  const [customCalName, setCustomCalName] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Automatic toast dismissal
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const onAddMeal = async (newMealOrRecipe: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    image?: string;
    type?: string;
    time?: string;
  }) => {
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    const formattedTime = newMealOrRecipe.time || new Date().toLocaleTimeString("en-US", timeOptions);

    if (isSupabaseConfigured && profileData.api_key) {
      try {
        const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
        const res = await fetch(`${supabaseUrl}/functions/v1/gpt-action/meals`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${profileData.api_key}`
          },
          body: JSON.stringify({
            name: newMealOrRecipe.name,
            calories: newMealOrRecipe.calories,
            protein: newMealOrRecipe.protein,
            carbs: newMealOrRecipe.carbs,
            fats: newMealOrRecipe.fats,
            image: newMealOrRecipe.image,
            type: newMealOrRecipe.type,
            time: formattedTime,
            date: selectedDate
          })
        });

        if (res.ok) {
          const data = await res.json();
          const mapped: Meal = {
            id: data.meal.id,
            name: data.meal.name,
            time: data.meal.time,
            type: data.meal.type,
            calories: data.meal.calories,
            protein: data.meal.protein,
            carbs: data.meal.carbs,
            fats: data.meal.fats,
            image: data.meal.image,
            date: data.meal.date
          };
          setMealsState((prev) => [mapped, ...prev]);
          showToast(`🍽️ Logged & Synced: "${newMealOrRecipe.name}" (+${newMealOrRecipe.calories} kcal)`);
          return;
        } else {
          console.error("Failed to log meal through Edge Function:", await res.text());
        }
      } catch (err) {
        console.error("Error logging meal to Edge Function:", err);
      }
    }

    // Local / fallback mode
    const meal: Meal = {
      id: String(mealsState.length + 1),
      name: newMealOrRecipe.name,
      time: formattedTime,
      type: newMealOrRecipe.type || "Meal",
      calories: newMealOrRecipe.calories,
      protein: newMealOrRecipe.protein,
      carbs: newMealOrRecipe.carbs,
      fats: newMealOrRecipe.fats,
      image:
        newMealOrRecipe.image ||
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
      date: selectedDate,
    };

    setMealsState((prev) => [meal, ...prev]);
    showToast(`🍽️ Logged: "${newMealOrRecipe.name}" (+${newMealOrRecipe.calories} kcal)`);
  };

  const openRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipePopup(recipe);
    setIsEditingRecipe(recipe.id === "new");
    setEditPopupName(recipe.name);
    setEditPopupTime(recipe.time);
    setEditPopupCalories(recipe.calories ? String(recipe.calories) : "");
    setEditPopupProtein(recipe.protein ? String(recipe.protein) : "");
    setEditPopupCarbs(recipe.carbs ? String(recipe.carbs) : "");
    setEditPopupFats(recipe.fats ? String(recipe.fats) : "");
    setEditPopupTags(recipe.tags || []);
    setEditPopupIngredients((recipe.ingredients || []).join("\n"));
    setEditPopupInstructions(recipe.instructions || "");
    setEditPopupMicros(recipe.micros || []);
    setAiConfigMode(
      recipe.micros && recipe.micros.length > 0 ? "manual" : "ai",
    );
  };

  const openGoalConfig = (type: "dailyCalories" | "weightGoal") => {
    setActiveGoalConfigPopup(type);
    setGoalConfigValue(
      type === "dailyCalories"
        ? profileData.goals.dailyCalories
        : profileData.goals.weightGoal,
    );
  };

  // Filter meals for the active tracked date
  const activeMeals = mealsState.filter((m) => m.date === selectedDate);

  const totalCalories = activeMeals.reduce(
    (sum, meal) => sum + meal.calories,
    0,
  );
  const totalProtein = activeMeals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = activeMeals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFats = activeMeals.reduce((sum, meal) => sum + meal.fats, 0);

  if (isSupabaseConfigured && !activeProfileId) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-8 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
        {/* Absolute Custom Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[380px] z-[250] pointer-events-auto"
            >
              <div className="bg-stone-900/95 backdrop-blur-md text-white text-xs font-bold py-3.5 px-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 font-sans">
                <span className="flex-1 tracking-tight leading-tight">{toastMessage}</span>
                <button
                  onClick={() => setToastMessage(null)}
                  className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="my-auto space-y-8 py-12">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-200 flex items-center justify-center rotate-6">
              <Sparkles className="text-white w-8 h-8 -rotate-6 fill-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-center mt-2">
              Fit<span className="text-orange-500">AI</span>
            </h1>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest text-center">
              Personalized Nutrition Engine
            </p>
          </div>

          {/* Welcome Text */}
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-black text-stone-850">Welcome to FitAI</h2>
            <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
              Your AI nutrition engine.
            </p>
          </div>

          {/* Authentication Actions */}
          <div className="space-y-5">
            {/* Google Authentication Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Subtle Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-[9px] font-black tracking-widest text-stone-300 uppercase">OR</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>

            {/* Email & Password Authentication Form */}
            <form onSubmit={authMode === "login" ? handleEmailSignIn : handleEmailSignUp} className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all animate-none"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all animate-none"
              />
              
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/40 disabled:opacity-60 disabled:pointer-events-none cursor-pointer mt-1"
              >
                {authLoading ? "Authenticating..." : authMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            {/* Mode Switch Link */}
            <div className="text-center">
              <button
                onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                className="text-[9px] text-orange-500 hover:text-orange-600 font-bold transition-colors cursor-pointer bg-transparent border-0"
              >
                {authMode === "login" ? "Create an account" : "Sign in to your account"}
              </button>
            </div>

            {/* Minimal Developer Mode Bypass */}
            <div className="text-center pt-2">
              <button
                onClick={() => setShowDeveloperBypass(!showDeveloperBypass)}
                className="text-[8px] text-stone-400 hover:text-stone-500 font-bold uppercase tracking-widest transition-colors cursor-pointer bg-transparent border-0"
              >
                {showDeveloperBypass ? "Close Developer Bypass" : "Developer Bypass"}
              </button>
            </div>

            {/* Username Input Form (Conditional Bypass) */}
            <AnimatePresence>
              {showDeveloperBypass && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-2 overflow-hidden"
                >
                  <input
                    type="text"
                    placeholder="Enter developer username (e.g. johndoe)"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLoginSubmit();
                    }}
                    className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                  />
                  <button
                    onClick={handleLoginSubmit}
                    disabled={!loginUsername.trim()}
                    className="w-full bg-stone-900 hover:bg-stone-850 text-white text-[10px] font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    Bypass Authentication
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[8px] text-stone-300 font-bold tracking-widest uppercase">
          © 2026 FitAI. All rights reserved.
        </div>
      </div>
    );
  }

  const isOnboarded = profileData.preferences?.includes("onboarded");

  if (isSupabaseConfigured && activeProfileId && !isOnboarded) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-8 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
        {/* Absolute Custom Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[380px] z-[250] pointer-events-auto"
            >
              <div className="bg-stone-900/95 backdrop-blur-md text-white text-xs font-bold py-3.5 px-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 font-sans">
                <span className="flex-1 tracking-tight leading-tight">{toastMessage}</span>
                <button
                  onClick={() => setToastMessage(null)}
                  className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="my-auto space-y-6 py-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 shadow-xl shadow-orange-200 flex items-center justify-center rotate-6">
              <Sparkles className="text-white w-6 h-6 -rotate-6 fill-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-center mt-2">
              Setup Your Profile
            </h1>
            <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest text-center">
              Let's customize your AI nutrition targets.
            </p>
          </div>

          <form onSubmit={handleOnboardSubmit} className="space-y-4">
            {/* Profile Avatar Selection (Canvas Resized Upload) */}
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-stone-200 shadow-inner flex items-center justify-center bg-stone-100">
                  {onboardAvatar ? (
                    <img src={onboardAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-stone-300 font-bold text-lg uppercase">{onboardName?.slice(0, 2) || "AI"}</span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-stone-900 text-white rounded-full border-2 border-white flex items-center justify-center cursor-pointer shadow-md hover:bg-stone-850 active:scale-95 transition-all">
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          let width = img.width;
                          let height = img.height;
                          const max = 200;
                          if (width > max || height > max) {
                            if (width > height) {
                              height = Math.round((height * max) / width);
                              width = max;
                            } else {
                              width = Math.round((width * max) / height);
                              height = max;
                            }
                          }
                          canvas.width = width;
                          canvas.height = height;
                          const ctx = canvas.getContext("2d");
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);
                            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                            setOnboardAvatar(dataUrl);
                          }
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">
                Choose profile photo
              </span>
            </div>

            {/* Display Name */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Full Name</label>
              <input
                type="text"
                placeholder="Full Name (e.g. Alex Doe)"
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
              />
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Height (cm)</label>
                <input
                  type="number"
                  placeholder="Height (cm)"
                  value={onboardHeight}
                  onChange={(e) => setOnboardHeight(e.target.value)}
                  required
                  className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Weight (kg)"
                  value={onboardWeight}
                  onChange={(e) => setOnboardWeight(e.target.value)}
                  required
                  className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Date of Birth</label>
              <input
                type="date"
                value={onboardDob}
                onChange={(e) => setOnboardDob(e.target.value)}
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
              />
            </div>

            {/* Bio Description */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                About Yourself
              </label>
              <textarea
                placeholder="Describe your lifestyle, fitness goals, or allergies... (AI cannot edit this)"
                value={onboardBio}
                onChange={(e) => setOnboardBio(e.target.value)}
                rows={3}
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all resize-none animate-none"
              />
            </div>

            <button
              type="submit"
              disabled={isOnboardLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
            >
              {isOnboardLoading ? "Saving Setup..." : "Complete Setup"}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-[8px] text-stone-300 font-bold tracking-widest uppercase py-4">
          © 2026 FitAI. All rights reserved.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 pb-32 max-w-md mx-auto relative shadow-2xl overflow-x-hidden">
      {/* Absolute Custom Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[380px] z-[250] pointer-events-auto"
          >
            <div className="bg-stone-900/95 backdrop-blur-md text-white text-xs font-bold py-3.5 px-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 font-sans">
              <span className="flex-1 tracking-tight leading-tight">{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warm Background Gradient Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from)_0%,_transparent_40%)] from-orange-100/40 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-from)_0%,_transparent_40%)] from-orange-50/30 pointer-events-none" />

      {/* Dynamic Header */}
      <header
        id="header-main"
        className="px-6 pt-8 flex items-center justify-between relative z-10"
      >
        <div id="brand-logo" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-orange-500 shadow-lg shadow-orange-200 flex items-center justify-center rotate-3">
            <Flame className="text-white w-5 h-5 -rotate-3" />
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-orange-400">
            FitAI
          </h1>
        </div>
        <div id="user-stats" className="flex items-center gap-3">
          <motion.div
            id="streak-counter"
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-orange-100/50"
          >
            <span className="text-orange-500 text-lg">🔥</span>
            <span className="font-bold text-orange-900">12</span>
          </motion.div>
          <button
            id="profile-avatar"
            onClick={() => setActiveTab("profile")}
            className="w-10 h-10 rounded-full border-2 border-orange-500 p-0.5 overflow-hidden shadow-md cursor-pointer hover:scale-105 transition-transform"
          >
            <img
              src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=60"
              alt="User"
              className="w-full h-full object-cover rounded-full pointer-events-none"
            />
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === "home" && (
          <motion.div
            key="home-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Calendar Strip */}
            <div id="calendar-strip" className="px-6 mt-8 relative z-10">
              <div className="flex justify-between items-center overflow-x-auto pb-4 scrollbar-hide gap-3">
                {daysList.map((day, idx) => {
                  const isActive = day.fullDate === selectedDate;
                  const d = new Date(day.fullDate + "T00:00:00");
                  const shortDayName = d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
                  const shortMonthName = d.toLocaleDateString("en-US", { month: "short" }).toLowerCase();
                  return (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedDate(day.fullDate);
                        setConfiguringDateIndex(idx);
                        setTempFullDate(day.fullDate);
                        setIsConfiguringDate(true);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[58px] py-3.5 rounded-2xl transition-all duration-300 shadow-sm grow cursor-pointer",
                        isActive
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-200 ring-4 ring-orange-50"
                          : "bg-white/60 backdrop-blur-sm text-gray-500 border border-orange-50/50 hover:bg-white/90",
                      )}
                    >
                      <span className="text-[10px] font-black opacity-60 tracking-tighter">
                        {shortDayName}
                      </span>
                      <span className="text-lg font-black leading-none my-1">{day.date}</span>
                      <span className="text-[9px] font-black opacity-60 tracking-wider">
                        {shortMonthName}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="px-6 mt-4 relative z-10">
              {/* Circular Progress for Calories */}
              <div className="relative w-full aspect-square max-w-[280px] mx-auto flex items-center justify-center my-8">
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-xl"
                  viewBox="0 0 240 240"
                >
                  <circle
                    cx="120"
                    cy="120"
                    r="104"
                    strokeWidth="20"
                    fill="transparent"
                    className="stroke-orange-100/50"
                  />
                  <motion.circle
                    cx="120"
                    cy="120"
                    r="104"
                    strokeWidth="20"
                    fill="transparent"
                    strokeLinecap="round"
                    className="stroke-orange-500"
                    initial={{ strokeDashoffset: Math.PI * 2 * 104 }}
                    animate={{
                      strokeDashoffset:
                        Math.PI * 2 * 104 -
                        Math.min(1, totalCalories / profileData.goals.dailyCalories) *
                          (Math.PI * 2 * 104),
                    }}
                    strokeDasharray={Math.PI * 2 * 104}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="text-center z-10 bg-white/40 backdrop-blur-md w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-inner border border-white/50">
                  <div className="text-5xl font-black mb-1 text-orange-950 px-2 truncate selection:bg-orange-500 select-none">
                    {totalCalories.toLocaleString()}
                  </div>
                  <div className="h-1.5 w-8 bg-orange-500 rounded-full mb-1" />
                  <div className="text-orange-900/50 font-black tracking-[0.1em] text-[10px] uppercase">
                    / {profileData.goals.dailyCalories.toLocaleString()}{" "}
                    KCAL
                  </div>
                </div>
              </div>

              {/* Macro Progress Bars */}
              <div className="bg-white/60 backdrop-blur-md p-6 rounded-[32px] border border-white/80 shadow-xl shadow-orange-100/20 grid grid-cols-2 gap-x-6 gap-y-6 mt-6">
                {[
                  {
                    name: "Protein",
                    value: totalProtein,
                    max: profileData.macros.protein,
                    color: "#FF7008",
                  },
                  {
                    name: "Carbs",
                    value: totalCarbs,
                    max: profileData.macros.carbs,
                    color: "#006B7D",
                  },
                  {
                    name: "Fats",
                    value: totalFats,
                    max: profileData.macros.fats,
                    color: "#FFB800",
                  },
                  {
                    name: "Fiber",
                    value: Math.round(totalCarbs * 0.15),
                    max: profileData.macros.fiber,
                    color: "#6B7280",
                  },
                ].map((macro, idx) => (
                  <ProgressBar
                    key={macro.name}
                    label={macro.name}
                    value={macro.value}
                    max={macro.max}
                    color={macro.color}
                    index={idx}
                  />
                ))}
              </div>
            </div>

            {/* Quick Log Action Row (Separated Containers) */}
            <div className="px-6 mt-6 relative z-10 text-left">
              <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1.5 px-1">
                Quick Log Item
              </span>
              <div className="flex gap-2.5 items-stretch w-full">
                
                {/* Container 1: Unified Quick Calorie Logger Form */}
                <div className="flex-1 h-12 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 shadow-3xs flex gap-2 items-center p-1 px-2.5 min-w-0">
                  {/* description input (first) */}
                  <input
                    type="text"
                    placeholder="Add item..."
                    value={customCalName}
                    onChange={(e) => setCustomCalName(e.target.value)}
                    className="flex-1 h-full bg-transparent text-xs font-bold text-stone-900 placeholder-stone-400 focus:outline-none min-w-0"
                  />

                  {/* kcal input (second) */}
                  <input
                    type="number"
                    placeholder="kcal"
                    value={customCalVal}
                    onChange={(e) => setCustomCalVal(e.target.value)}
                    className="w-20 h-full bg-stone-50/50 border border-stone-200/50 rounded-xl text-center text-xs font-bold text-stone-900 placeholder-stone-400 focus:outline-none"
                  />
                  
                  {/* Submit button (inside container) */}
                  <button
                    onClick={() => {
                      const amt = parseInt(customCalVal);
                      if (!amt || amt <= 0) {
                        showToast("Enter calories");
                        return;
                      }
                      const name = customCalName.trim() || "Quick Cal";
                      onAddMeal({
                        name,
                        calories: amt,
                        protein: 0,
                        carbs: 0,
                        fats: 0,
                        type: "Quick Cal",
                      });
                      setCustomCalVal("");
                      setCustomCalName("");
                    }}
                    className="w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Log Quick Calories"
                  >
                    <Check className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Container 2: Standalone Manual Calorie Log Button / Custom GPT Link (Far Right) */}
                <button
                  onClick={() => {
                    const gptUrl = localStorage.getItem("fitai_custom_gpt_url");
                    if (gptUrl && gptUrl.trim()) {
                      window.open(gptUrl.trim(), "_blank");
                    } else {
                      setIsCameraFullScreen(true);
                    }
                  }}
                  className="w-12 h-12 bg-[#1a1a1a] hover:bg-[#2c2c2c] text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-3xs border border-stone-850"
                  title="Manual Log / Custom GPT"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>

              </div>
            </div>

            {/* Today's Consumption Section */}
            <section className="px-6 mt-16 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black tracking-tight text-orange-950">
                  {selectedDate === "2026-07-08" ? "Today's Consumption" : "Logged Consumption"}
                </h3>
                {selectedDate === "2026-07-08" && (
                  <button
                    onClick={() => {
                      const name = prompt("Enter food name:");
                      if (!name) return;
                      const cal = prompt("Calories (kcal):");
                      const prot = prompt("Protein (g):");
                      const carb = prompt("Carbs (g):");
                      const fat = prompt("Fats (g):");
                      onAddMeal({
                        name,
                        calories: parseInt(cal || "0") || 0,
                        protein: parseInt(prot || "0") || 0,
                        carbs: parseInt(carb || "0") || 0,
                        fats: parseInt(fat || "0") || 0,
                        type: "Quick Log",
                      });
                    }}
                    className="text-orange-600 font-black uppercase text-[10px] tracking-[0.15em] flex items-center gap-1 group bg-orange-100/50 px-3 py-1.5 rounded-full border border-orange-200/30 hover:bg-orange-200/50 transition-colors"
                  >
                    Add{" "}
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {activeMeals.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm">
                    <p className="text-sm font-bold text-gray-500">No logs for this date yet</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium leading-relaxed">
                      All meals, quick calories, or recipe favorites logged on this date will show up here.
                    </p>
                  </div>
                ) : (
                  activeMeals.map((meal) => {
                    const isQuickCal = meal.protein === 0 && meal.carbs === 0 && meal.fats === 0;

                    if (isQuickCal) {
                      return (
                        <motion.div
                          key={meal.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/90 p-4 shadow-3xs flex items-center justify-between gap-4 relative z-10"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-orange-100/50 flex items-center justify-center text-orange-600 shrink-0">
                              <Zap className="w-4 h-4 fill-orange-500 text-orange-500" />
                            </div>
                            <div className="text-left min-w-0">
                              <h4 className="text-xs font-black text-stone-850 truncate leading-tight">
                                {meal.name}
                              </h4>
                              <span className="text-[8px] font-bold text-stone-400 block mt-0.5 uppercase tracking-wider">
                                {meal.time}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-sm font-black text-orange-600 block">
                                {meal.calories} kcal
                              </span>
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm("Delete this log?")) {
                                  if (isSupabaseConfigured) {
                                    const { error } = await supabase
                                      .from('meals')
                                      .delete()
                                      .eq('id', meal.id);
                                    if (error) {
                                      console.error("Error deleting meal:", error);
                                      showToast("❌ Error deleting log");
                                    } else {
                                      setMealsState(prev => prev.filter(m => m.id !== meal.id));
                                      showToast("🗑️ Log deleted");
                                    }
                                  } else {
                                    setMealsState(prev => prev.filter(m => m.id !== meal.id));
                                    showToast("🗑️ Log deleted");
                                  }
                                }
                              }}
                              className="w-7 h-7 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-400 hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40 shrink-0"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key={meal.id}
                        whileHover={{ y: -4, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative rounded-[32px] overflow-hidden aspect-[4/3] sm:aspect-video shadow-xl shadow-orange-200/30 group"
                      >
                        <img
                          src={meal.image}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                          alt={meal.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                        {/* Top Bar: Time, Calories, and Delete */}
                        <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-20">
                          <div className="backdrop-blur-md bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white">
                              {meal.time}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="backdrop-blur-md bg-orange-500/90 text-white px-3 py-1.5 rounded-full font-black flex items-center gap-1 shadow-lg border border-orange-400/50">
                              <span className="text-sm">{meal.calories}</span>
                              <span className="text-[9px] uppercase tracking-wider opacity-90">
                                Kcal
                              </span>
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm("Delete this log?")) {
                                  if (isSupabaseConfigured) {
                                    const { error } = await supabase
                                      .from('meals')
                                      .delete()
                                      .eq('id', meal.id);
                                    if (error) {
                                      console.error("Error deleting meal:", error);
                                      showToast("❌ Error deleting log");
                                    } else {
                                      setMealsState(prev => prev.filter(m => m.id !== meal.id));
                                      showToast("🗑️ Log deleted");
                                    }
                                  } else {
                                    setMealsState(prev => prev.filter(m => m.id !== meal.id));
                                    showToast("🗑️ Log deleted");
                                  }
                                }
                              }}
                              className="w-8 h-8 rounded-full backdrop-blur-md bg-black/30 hover:bg-red-500/80 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Content: Name and Macros */}
                        <div className="absolute bottom-5 left-5 right-5">
                          <h4 className="text-white text-xl sm:text-2xl font-black mb-4 leading-tight tracking-tight shadow-sm">
                            {meal.name}
                          </h4>

                          <div className="flex gap-4">
                            {[
                              { l: "Protein", v: meal.protein },
                              { l: "Carbs", v: meal.carbs },
                              { l: "Fats", v: meal.fats },
                            ].map((m) => (
                              <div key={m.l} className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-sm" />
                                <div className="flex items-baseline gap-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-white/50">
                                    {m.l}
                                  </span>
                                  <span className="text-sm font-bold text-white">
                                    {m.v}g
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </section>
            {/* Minimal Favorite Recipes Section (Below Today's Consumption) */}
            {recipes.length > 0 && (
              <div className="px-6 mt-8 mb-20 relative z-10 space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                    Quick Log Favorites
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {recipes.slice(0, 6).map((rec) => (
                    <motion.button
                      key={rec.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onAddMeal({
                          name: rec.name,
                          calories: rec.calories,
                          protein: rec.protein,
                          carbs: rec.carbs,
                          fats: rec.fats,
                          image: rec.image,
                          type: "Favorite",
                        });
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 shadow-3xs transition-all select-none cursor-pointer text-left w-full"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-3xs border border-white">
                        <img
                          src={rec.image}
                          className="w-full h-full object-cover"
                          alt={rec.name}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="font-sans flex-1 min-w-0">
                        <div className="text-[10px] font-black text-stone-850 truncate leading-tight">
                          {rec.name}
                        </div>
                        <div className="text-[9px] font-black text-orange-600 mt-0.5">
                          {rec.calories} kcal
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
        {activeTab === "settings" && (
          <SettingsView
            key="settings-tab"
            profileData={profileData}
            setProfileData={setProfileData}
            triggerToast={(msg) => setToastMessage(msg)}
          />
        )}
        {activeTab === "profile" && (
          <ProfileView
            key="profile-tab"
            profileData={profileData}
            setProfileData={setProfileData}
            setActiveTab={setActiveTab}
            recipes={recipes}
            setRecipes={setRecipes}
            onAddMeal={onAddMeal}
            openGoalConfig={openGoalConfig}
            openRecipeDetails={openRecipeDetails}
            triggerToast={(msg) => setToastMessage(msg)}
            activeProfileId={activeProfileId}
          />
        )}
        {activeTab === "edit-profile" && (
          <EditProfileView
            key="edit-profile-tab"
            profileData={profileData}
            setProfileData={setProfileData}
            setActiveTab={setActiveTab}
          />
        )}
      </AnimatePresence>

      {/* World-Class Detail & Edit Recipe Popup Overlay */}
      <AnimatePresence>
        {selectedRecipePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/65 backdrop-blur-md z-[100] flex items-end justify-center font-sans"
          >
            {/* Sliding Bottom Sheet Sheet Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-stone-50 rounded-t-[36px] w-full max-w-[448px] h-[85vh] overflow-hidden flex flex-col shadow-2xl border-t border-white/20"
            >
              {/* Image Title Banner */}
              <div className="h-44 w-full relative shrink-0 bg-orange-100">
                <img
                  src={selectedRecipePopup.image}
                  className="w-full h-full object-cover"
                  alt={selectedRecipePopup.name}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/30 to-black/10" />

                {/* Header buttons */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                  <span className="px-3 py-1 bg-black/55 backdrop-blur-sm rounded-full text-[9px] font-black uppercase text-orange-400 tracking-wider font-sans">
                    {isEditingRecipe ? "Editing Mode" : "Recipe Dossier"}
                  </span>
                  <button
                    onClick={() => setSelectedRecipePopup(null)}
                    className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Overlaid Title */}
                <div className="absolute bottom-4 left-4 right-4 text-left">
                  <div className="flex gap-1.5 mb-1 flex-wrap">
                    {(isEditingRecipe ? editPopupTags : selectedRecipePopup.tags).map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-orange-500 text-white rounded-md text-[7px] font-black uppercase tracking-widest font-sans"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-white text-base font-black leading-tight tracking-tight drop-shadow-sm font-sans">
                    {isEditingRecipe ? editPopupName || "Unnamed Recipe" : selectedRecipePopup.name}
                  </h3>
                  <p className="text-[10px] text-white/70 font-bold font-sans mt-0.5 flex items-center gap-1">
                    ⏱️ Prep time: {isEditingRecipe ? editPopupTime : selectedRecipePopup.time}
                  </p>
                </div>
              </div>

              {/* Scrollable Form / Details Wrapper */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                {!isEditingRecipe ? (
                  /* VIEW MODE */
                  <div className="space-y-6 text-left">
                    {/* Calories & Standard Macros HUD block */}
                    <div className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-black/[0.02]">
                        <span className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest">
                          Macronutrient Density
                        </span>
                        <span className="text-xs font-black text-[#10B981] font-mono">
                          🔥 {selectedRecipePopup.calories} kcal
                        </span>
                      </div>

                      {/* Bar metrics representing Carb/Prot/Fat distribution */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-orange-50/50 rounded-2xl p-3 border border-orange-100 flex flex-col justify-center">
                          <span className="text-[8px] font-extrabold text-orange-700/60 uppercase">
                            Protein
                          </span>
                          <span className="text-sm font-black text-orange-950 mt-0.5">
                            {selectedRecipePopup.protein}g
                          </span>
                          <div className="w-full bg-orange-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                              className="bg-orange-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, (selectedRecipePopup.protein / 50) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-indigo-50/40 rounded-2xl p-3 border border-indigo-100 flex flex-col justify-center">
                          <span className="text-[8px] font-extrabold text-indigo-700/60 uppercase">
                            Carbohydrates
                          </span>
                          <span className="text-sm font-black text-[#1E3A8A] mt-0.5">
                            {selectedRecipePopup.carbs}g
                          </span>
                          <div className="w-full bg-indigo-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, (selectedRecipePopup.carbs / 150) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100 flex flex-col justify-center">
                          <span className="text-[8px] font-extrabold text-amber-700/60 uppercase">
                            Fats
                          </span>
                          <span className="text-sm font-black text-amber-950 mt-0.5">
                            {selectedRecipePopup.fats}g
                          </span>
                          <div className="w-full bg-amber-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, (selectedRecipePopup.fats / 70) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>



                    {/* Ingredients detail */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block font-sans">
                        Ingredients Needed
                      </span>
                      <ul className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm divide-y divide-black/[0.02] space-y-2.5">
                        {selectedRecipePopup.ingredients.map((ing, i) => (
                          <li
                            key={i}
                            className="text-xs font-bold text-orange-950/80 pt-2.5 first:pt-0 flex items-center gap-2 font-sans"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Instructions detail */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block font-sans">
                        Step-by-Step Instructions
                      </span>
                      <div className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm font-sans font-medium">
                        <p className="text-xs text-orange-950/75 font-semibold leading-relaxed whitespace-pre-line font-sans">
                          {selectedRecipePopup.instructions || "Enjoy this healthy portion immediately!"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* EDIT / CREATE MODE */
                  <div className="space-y-6 text-left font-sans animate-none">
                    {/* General Text Info Inputs */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                          Recipe Name / Title
                        </label>
                        <input
                          type="text"
                          value={editPopupName}
                          onChange={(e) => setEditPopupName(e.target.value)}
                          placeholder="e.g. Avocado Spinach Superfood Crunch"
                          className="w-full bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl px-4 py-3 text-xs font-bold text-orange-950 outline-none transition-all shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                          Prep Duration
                        </label>
                        <input
                          type="text"
                          value={editPopupTime}
                          onChange={(e) => setEditPopupTime(e.target.value)}
                          placeholder="e.g. 15 mins"
                          className="w-full bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl px-4 py-3 text-xs font-bold text-orange-950 outline-none transition-all shadow-inner"
                        />
                      </div>

                      {/* Tactile and Modern Dietary Tags Selector */}
                      <div className="bg-white rounded-3xl p-5 border border-stone-200/40 shadow-sm space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                          <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                            Dietary Labels / Tags
                          </label>
                          {editPopupTags.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setEditPopupTags([])}
                              className="text-[9px] font-black uppercase tracking-wider text-orange-600 hover:opacity-85 active:scale-95 transition-all cursor-pointer"
                            >
                              Clear All ({editPopupTags.length})
                            </button>
                          )}
                        </div>

                        {/* Quick Tap & Custom Active Tags Container */}
                        <div className="space-y-2">
                          <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block">
                            Tap to toggle label filters
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: "Keto 🥑", value: "Keto" },
                              { label: "Vegan 🌱", value: "Vegan" },
                              { label: "High Protein 💪", value: "High Protein" },
                              { label: "Gluten Free 🌾", value: "Gluten Free" },
                              { label: "Dairy Free 🥛", value: "Dairy Free" },
                              { label: "Low Carb 🥩", value: "Low Carb" },
                              { label: "Low Calorie 🔥", value: "Low Calorie" },
                            ].map((preset) => {
                              const isActive = editPopupTags.includes(preset.value);
                              return (
                                <motion.button
                                  key={preset.value}
                                  type="button"
                                  whileTap={{ scale: 0.93 }}
                                  onClick={() => {
                                    if (isActive) {
                                      setEditPopupTags(editPopupTags.filter((t) => t !== preset.value));
                                    } else {
                                      setEditPopupTags([...editPopupTags, preset.value]);
                                    }
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border select-none cursor-pointer active:scale-95 flex items-center gap-1",
                                    isActive
                                      ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20"
                                      : "bg-orange-50/40 border-orange-100 text-stone-600 hover:bg-orange-50 hover:border-orange-200 hover:text-stone-800"
                                  )}
                                >
                                  <span>{preset.label}</span>
                                  {isActive && <Check className="w-2.5 h-2.5 shrink-0 ml-0.5" />}
                                </motion.button>
                              );
                            })}

                            {/* Render active custom tags dynamically here if they don't match standard presets */}
                            {editPopupTags
                              .filter(
                                (tag) =>
                                  ![
                                    "Keto",
                                    "Vegan",
                                    "High Protein",
                                    "Gluten Free",
                                    "Dairy Free",
                                    "Low Carb",
                                    "Low Calorie",
                                  ].some((std) => std.toLowerCase() === tag.toLowerCase())
                              )
                              .map((customTag) => (
                                <motion.button
                                  key={customTag}
                                  type="button"
                                  whileTap={{ scale: 0.93 }}
                                  onClick={() => setEditPopupTags(editPopupTags.filter((t) => t !== customTag))}
                                  className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20 select-none cursor-pointer active:scale-95 flex items-center gap-1.5"
                                >
                                  <span>{customTag} ✨</span>
                                  <span className="text-[11px] font-light leading-none opacity-80">×</span>
                                </motion.button>
                              ))}
                          </div>
                        </div>

                        {/* Custom tags input form */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add custom tag... (Type & press enter)"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = e.currentTarget.value.trim();
                                if (val && !editPopupTags.some((t) => t.toLowerCase() === val.toLowerCase())) {
                                  const capitalized = val.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                                  setEditPopupTags([...editPopupTags, capitalized]);
                                  e.currentTarget.value = "";
                                }
                              }
                            }}
                            id="customTagInput"
                            className="flex-1 bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-xl px-3 py-2 text-[10px] font-bold text-orange-950 outline-none transition-all shadow-inner"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById("customTagInput") as HTMLInputElement | null;
                              if (input) {
                                const val = input.value.trim();
                                if (val && !editPopupTags.some((t) => t.toLowerCase() === val.toLowerCase())) {
                                  const capitalized = val.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                                  setEditPopupTags([...editPopupTags, capitalized]);
                                  input.value = "";
                                }
                              }
                            }}
                            className="px-4 py-2 bg-orange-50 hover:bg-orange-100/80 border border-orange-200 text-orange-700 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest active:scale-95 cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                          >
                            Add Tag
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                          Raw Ingredients (One entry per line)
                        </label>
                        <textarea
                          rows={4}
                          value={editPopupIngredients}
                          onChange={(e) => setEditPopupIngredients(e.target.value)}
                          placeholder="e.g.&#10;2 whole Avocados&#10;100g Fresh Spinach&#10;1 scoop Whey Protein"
                          className="w-full bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl px-4 py-3 text-xs font-bold text-orange-950 outline-none transition-all shadow-inner leading-relaxed"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                          Cooking Instructions step list
                        </label>
                        <textarea
                          rows={3}
                          value={editPopupInstructions}
                          onChange={(e) => setEditPopupInstructions(e.target.value)}
                          placeholder="e.g. Blend/mash avocados and fold in spinach slowly. Complete serving cold!"
                          className="w-full bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl px-4 py-3 text-xs font-bold text-orange-950 outline-none transition-all shadow-inner leading-relaxed"
                        />
                      </div>
                    </div>

                    {/* Nutritional Presciption Metrics with Auto-fill button */}
                    <div className="pt-4 border-t border-black/[0.04]">
                      <div className="bg-white rounded-3xl p-5 border border-stone-200/40 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                          <h6 className="text-[10px] font-black text-orange-950/50 uppercase tracking-widest block">
                            Portion Macrographics
                          </h6>
                          <button
                            type="button"
                            onClick={() => {
                              if (!editPopupIngredients.trim()) {
                                setToastMessage("Please enter some ingredients first to extract nutrition! 🥦");
                                return;
                              }
                              setIsAiCalculating(true);
                              setTimeout(() => {
                                const ingredientsArr = editPopupIngredients
                                  .split("\n")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                const calculations =
                                  calculateNutritionFromIngredients(
                                    editPopupName,
                                    ingredientsArr,
                                  );

                                let filledSome = false;
                                if (!editPopupCalories || editPopupCalories === "0" || editPopupCalories === "") {
                                  setEditPopupCalories(String(calculations.calories));
                                  filledSome = true;
                                }
                                if (!editPopupProtein || editPopupProtein === "0" || editPopupProtein === "") {
                                  setEditPopupProtein(String(calculations.protein));
                                  filledSome = true;
                                }
                                if (!editPopupCarbs || editPopupCarbs === "0" || editPopupCarbs === "") {
                                  setEditPopupCarbs(String(calculations.carbs));
                                  filledSome = true;
                                }
                                if (!editPopupFats || editPopupFats === "0" || editPopupFats === "") {
                                  setEditPopupFats(String(calculations.fats));
                                  filledSome = true;
                                }
                                if (!editPopupMicros || editPopupMicros.length === 0) {
                                  setEditPopupMicros(calculations.micros);
                                }

                                setIsAiCalculating(false);
                                
                                if (!filledSome) {
                                  // If all fields are already filled, ask if they want to overwrite them
                                  if (confirm("All fields are currently filled. Overwrite them all with calculated AI estimates?")) {
                                    setEditPopupCalories(String(calculations.calories));
                                    setEditPopupProtein(String(calculations.protein));
                                    setEditPopupCarbs(String(calculations.carbs));
                                    setEditPopupFats(String(calculations.fats));
                                    setEditPopupMicros(calculations.micros);
                                  }
                                }
                              }, 850);
                            }}
                            className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 select-none shrink-0 border",
                              isAiCalculating
                                ? "bg-stone-50 border-stone-100 text-stone-400 cursor-not-allowed"
                                : "bg-orange-50/70 border-orange-100/55 text-orange-600 hover:bg-orange-100/80 hover:text-orange-700"
                            )}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                            {isAiCalculating ? "Extracting..." : "Auto-Fill with AI 🤖"}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">
                              Calories (kcal)
                            </label>
                            <input
                              type="number"
                              value={editPopupCalories}
                              onChange={(e) => setEditPopupCalories(e.target.value)}
                              className="w-full bg-stone-50/50 border border-stone-200/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-950 outline-none transition-all shadow-inner animate-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">
                              Protein (g)
                            </label>
                            <input
                              type="number"
                              value={editPopupProtein}
                              onChange={(e) => setEditPopupProtein(e.target.value)}
                              className="w-full bg-stone-50/50 border border-stone-200/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-950 outline-none transition-all shadow-inner animate-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">
                              Carbs (g)
                            </label>
                            <input
                              type="number"
                              value={editPopupCarbs}
                              onChange={(e) => setEditPopupCarbs(e.target.value)}
                              className="w-full bg-stone-50/50 border border-stone-200/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-950 outline-none transition-all shadow-inner animate-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">
                              Fats (g)
                            </label>
                            <input
                              type="number"
                              value={editPopupFats}
                              onChange={(e) => setEditPopupFats(e.target.value)}
                              className="w-full bg-stone-50/50 border border-stone-200/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-950 outline-none transition-all shadow-inner animate-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Sticky Action Footer bar */}
              <div className="p-4 bg-white border-t border-black/[0.03] shrink-0 font-sans">
                {!isEditingRecipe ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingRecipe(true)}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-200/50 text-stone-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      ✏️ Edit recipe
                    </button>
                    <button
                      onClick={() => {
                        onAddMeal({
                          name: selectedRecipePopup.name,
                          calories: selectedRecipePopup.calories,
                          protein: selectedRecipePopup.protein,
                          carbs: selectedRecipePopup.carbs,
                          fats: selectedRecipePopup.fats,
                          image: selectedRecipePopup.image,
                          type: "Favorite",
                        });
                        setToastMessage(`Successfully logged portion of "${selectedRecipePopup.name}" for today! 🍽️`);
                        setSelectedRecipePopup(null);
                      }}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[10px] py-2.5 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10 transition-colors cursor-pointer"
                    >
                      <Utensils className="w-3.5 h-3.5" /> Log to Today's Plate
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 font-sans">
                    <button
                      onClick={() => {
                        if (selectedRecipePopup.id === "new") {
                          setSelectedRecipePopup(null);
                        } else {
                          setIsEditingRecipe(false);
                        }
                      }}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        // Validate
                        const finalName = editPopupName.trim() || "Unnamed Custom Dish";
                        const finalIngredients = editPopupIngredients
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean);

                        const actualIsNew = selectedRecipePopup.id === "new";
                        const updated: Recipe = {
                          id: actualIsNew ? "rec-" + Date.now() : selectedRecipePopup.id,
                          name: finalName,
                          time: editPopupTime || "15 mins",
                          calories: parseInt(editPopupCalories) || 0,
                          protein: parseInt(editPopupProtein) || 0,
                          carbs: parseInt(editPopupCarbs) || 0,
                          fats: parseInt(editPopupFats) || 0,
                          tags: editPopupTags.length > 0 ? editPopupTags : ["Custom"],
                          image: selectedRecipePopup.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
                          ingredients: finalIngredients,
                          instructions: editPopupInstructions.trim() || "Mix ingredients and serve fresh!",
                          micros: editPopupMicros,
                        };

                        if (isSupabaseConfigured && activeProfileId) {
                          try {
                            const recipeData = {
                              profile_id: activeProfileId,
                              name: updated.name,
                              time: updated.time,
                              calories: updated.calories,
                              protein: updated.protein,
                              carbs: updated.carbs,
                              fats: updated.fats,
                              tags: updated.tags,
                              image: updated.image,
                              ingredients: updated.ingredients,
                              instructions: updated.instructions,
                              micros: updated.micros
                            };

                            if (actualIsNew) {
                              const { data, error } = await supabase
                                .from('recipes')
                                .insert(recipeData)
                                .select('*')
                                .single();

                              if (error) {
                                console.error("Error creating recipe in Supabase:", error);
                                setRecipes([updated, ...recipes]);
                              } else if (data) {
                                const mapped: Recipe = {
                                  id: data.id,
                                  name: data.name,
                                  time: data.time,
                                  calories: data.calories,
                                  protein: data.protein,
                                  carbs: data.carbs,
                                  fats: data.fats,
                                  tags: data.tags || [],
                                  image: data.image,
                                  ingredients: data.ingredients || [],
                                  instructions: data.instructions,
                                  micros: data.micros || []
                                };
                                setRecipes([mapped, ...recipes]);
                              }
                            } else {
                              const { error } = await supabase
                                .from('recipes')
                                .update(recipeData)
                                .eq('id', selectedRecipePopup.id);

                              if (error) {
                                console.error("Error updating recipe in Supabase:", error);
                              }
                              setRecipes(recipes.map((r) => (r.id === updated.id ? updated : r)));
                            }
                          } catch (err) {
                            console.error("Error saving recipe to Supabase:", err);
                            if (actualIsNew) {
                              setRecipes([updated, ...recipes]);
                            } else {
                              setRecipes(recipes.map((r) => (r.id === updated.id ? updated : r)));
                            }
                          }
                        } else {
                          if (actualIsNew) {
                            setRecipes([updated, ...recipes]);
                          } else {
                            setRecipes(recipes.map((r) => (r.id === updated.id ? updated : r)));
                          }
                        }

                        // Close popups
                        setSelectedRecipePopup(null);
                        setToastMessage(`Recipe "${finalName}" saved successfully! 🎉`);
                      }}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-md shadow-orange-500/10 transition-colors cursor-pointer"
                    >
                      💾 Save changes
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Configuration Popup (Precise Date Tracker) */}
      <AnimatePresence>
        {isConfiguringDate && configuringDateIndex !== null && (() => {
          const [yStr, mStr, dStr] = (tempFullDate || "2026-07-08").split("-");
          const selYear = parseInt(yStr) || 2026;
          const selMonth = parseInt(mStr) || 7;
          const selDay = parseInt(dStr) || 8;

          const daysInMonth = new Date(selYear, selMonth, 0).getDate();
          const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
          const monthsArray = [
            { val: 1, label: "Jan" },
            { val: 2, label: "Feb" },
            { val: 3, label: "Mar" },
            { val: 4, label: "Apr" },
            { val: 5, label: "May" },
            { val: 6, label: "Jun" },
            { val: 7, label: "Jul" },
            { val: 8, label: "Aug" },
            { val: 9, label: "Sep" },
            { val: 10, label: "Oct" },
            { val: 11, label: "Nov" },
            { val: 12, label: "Dec" },
          ];
          const yearsArray = Array.from({ length: 11 }, (_, i) => 2020 + i);

          const changeDatePart = (newY: number, newM: number, newD: number) => {
            const maxDays = new Date(newY, newM, 0).getDate();
            const safeD = newD > maxDays ? maxDays : newD;
            const formattedM = String(newM).padStart(2, "0");
            const formattedD = String(safeD).padStart(2, "0");
            const updatedFullDate = `${newY}-${formattedM}-${formattedD}`;
            setTempFullDate(updatedFullDate);
            updateDayAtIndex(configuringDateIndex, updatedFullDate);
          };

          const dayMeals = mealsState.filter((m) => m.date === tempFullDate);
          const logFound = dayMeals.length > 0;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/65 backdrop-blur-md z-[200] flex items-end justify-center font-sans"
            >
              {/* Backdrop click to close */}
              <div
                className="absolute inset-0"
                onClick={() => setIsConfiguringDate(false)}
              />

              {/* Bottom Sheet Modal */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="bg-white rounded-t-[36px] w-full max-w-md overflow-hidden flex flex-col shadow-2xl p-6 space-y-6 relative z-10"
              >
                {/* Header block */}
                <div className="flex justify-between items-center pb-2 border-b border-black/[0.04]">
                  <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-orange-500" />
                    Configure Date
                  </h4>
                  <button
                    onClick={() => setIsConfiguringDate(false)}
                    className="w-8 h-8 rounded-full bg-stone-100/80 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Input: Day, Month, Year simple picker */}
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Day Selector */}
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1.5">
                        Day
                      </label>
                      <select
                        value={selDay}
                        onChange={(e) => changeDatePart(selYear, selMonth, parseInt(e.target.value))}
                        className="w-full bg-stone-50 border border-stone-200/60 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-orange-400 transition-all font-sans cursor-pointer"
                      >
                        {daysArray.map((dayNum) => (
                          <option key={dayNum} value={dayNum}>
                            {dayNum}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Month Selector */}
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1.5">
                        Month
                      </label>
                      <select
                        value={selMonth}
                        onChange={(e) => changeDatePart(selYear, parseInt(e.target.value), selDay)}
                        className="w-full bg-stone-50 border border-stone-200/60 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-orange-400 transition-all font-sans cursor-pointer"
                      >
                        {monthsArray.map((mObj) => (
                          <option key={mObj.val} value={mObj.val}>
                            {mObj.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year Selector */}
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1.5">
                        Year
                      </label>
                      <select
                        value={selYear}
                        onChange={(e) => changeDatePart(parseInt(e.target.value), selMonth, selDay)}
                        className="w-full bg-stone-50 border border-stone-200/60 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-orange-400 transition-all font-sans cursor-pointer"
                      >
                        {yearsArray.map((yrNum) => (
                          <option key={yrNum} value={yrNum}>
                            {yrNum}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Logged Portion Status Tracker */}
                  {logFound ? (
                    <div className="bg-emerald-50/70 border border-emerald-100/50 p-4 rounded-2xl text-left space-y-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-800 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Log found
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                        <span>{dayMeals.length} meals logged</span>
                        <span className="text-emerald-700 font-extrabold">
                          {dayMeals.reduce((sum, m) => sum + m.calories, 0)} kcal
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-stone-50 border border-stone-200/50 p-4 rounded-2xl text-left space-y-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-stone-400 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                        No log found
                      </div>
                      <p className="text-[10px] text-stone-400 font-medium">
                        0 calories • No meals tracked yet.
                      </p>
                    </div>
                  )}
                </div>

                {/* Done Button */}
                <div className="pt-2">
                  <button
                    onClick={() => setIsConfiguringDate(false)}
                    className="w-full bg-[#1a1a1a] hover:bg-[#2c2c2c] text-white text-[10px] py-3 rounded-xl font-black uppercase tracking-widest text-center shadow-md transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Dynamic World-Class Goals Dial Sliders Picker Popups */}
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
                      goals: {
                        ...profileData.goals,
                        [activeGoalConfigPopup]: goalConfigValue,
                      },
                    });
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

      {/* Manual Calorie Log Modal */}
      <AnimatePresence>
        {isCameraFullScreen && (
          <ManualLogModal
            onClose={() => setIsCameraFullScreen(false)}
            onAddMeal={onAddMeal}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav
        id="bottom-nav"
        className="fixed bottom-6 left-6 right-6 max-w-[calc(448px-3rem)] mx-auto z-50"
      >
        <div
          id="nav-container"
          className="backdrop-blur-2xl bg-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[24px] p-2 flex items-center justify-between gap-2 border border-white/50 w-full"
        >
          <NavButton
            id="nav-home"
            icon={Home}
            label="Home"
            active={activeTab === "home"}
            onClick={() => setActiveTab("home")}
          />

          <div className="flex-1 flex justify-center">
            {selectedDate === "2026-07-08" ? (
              <motion.button
                id="fab-add-food"
                onClick={() => {
                  const gptUrl = localStorage.getItem("fitai_custom_gpt_url");
                  if (gptUrl && gptUrl.trim()) {
                    window.open(gptUrl.trim(), "_blank");
                  } else {
                    setIsCameraFullScreen(true);
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[16px] shadow-[0_8px_30px_rgb(251,146,60,0.4)] flex items-center justify-center text-white relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_white_0%,_transparent_40%)] opacity-30" />
                <Plus className="w-7 h-7 stroke-[3px]" />
              </motion.button>
            ) : (
              <div
                id="fab-disabled"
                className="w-full h-14 bg-stone-50 border border-stone-200/50 rounded-[16px] flex flex-col items-center justify-center text-stone-400 select-none opacity-60"
                title="Logs are only editable on today's date"
              >
                <Plus className="w-5 h-5 stroke-[2px]" />
                <span className="text-[7px] font-black uppercase tracking-widest mt-0.5">Locked</span>
              </div>
            )}
          </div>

          <NavButton
            id="nav-profile"
            icon={User}
            label="Profile"
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({
  id,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  id: string;
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 h-14 rounded-[16px] transition-all duration-300 relative",
        active
          ? "text-orange-600"
          : "text-orange-950/30 hover:text-orange-600/60",
      )}
    >
      {active && (
        <motion.div
          layoutId="active-nav-bg"
          className="absolute inset-0 bg-orange-100/50 rounded-[16px] -z-10"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <Icon
        className={cn("w-5 h-5", active ? "stroke-[2.5px]" : "stroke-[2px]")}
      />
      <span className="text-[8px] font-black uppercase tracking-[0.1em]">
        {label}
      </span>
    </button>
  );
}
