import React, { useState, useRef, useEffect } from "react";
import { Camera, User, Smile, Scale, Ruler, Target, Info, Plus, Minus, Tag, X, ChevronLeft, Droplet, Activity, Zap, Pencil, Trash2, Search, Check, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { DefaultAvatar } from "./DefaultAvatar";
import { DEFAULT_TRACKING_TAGS } from "./SettingsView";

export const COMMON_TAG_TEMPLATES = [
  { name: "Gluten Free", description: "Apply when meal contains no wheat, barley, rye, or gluten" },
  { name: "Lactose Free", description: "Apply when meal contains no lactose or dairy products" },
  { name: "Vegan", description: "Apply when meal contains no animal products" },
  { name: "Vegetarian", description: "Apply when meal contains no meat or fish" },
  { name: "Keto", description: "Apply when meal is high fat and carbs are 10g or less" },
  { name: "Nut Free", description: "Apply when meal contains no peanuts, tree nuts, or seeds" },
];

export const FAMOUS_NUTRIENTS_CATALOG = [
  // Core Macros
  { id: "protein", name: "Protein", category: "Macros", target: 150, unit: "g", color: "#F97316" },
  { id: "carbs", name: "Carbs", category: "Macros", target: 150, unit: "g", color: "#0891B2" },
  { id: "fats", name: "Fats", category: "Macros", target: 60, unit: "g", color: "#EAB308" },
  { id: "fiber", name: "Fiber", category: "Macros", target: 30, unit: "g", color: "#10B981" },

  // Essential Vitamins
  { id: "vitamin_d", name: "Vitamin D3", category: "Vitamins", target: 1000, unit: "IU", color: "#F59E0B" },
  { id: "vitamin_c", name: "Vitamin C", category: "Vitamins", target: 90, unit: "mg", color: "#EAB308" },
  { id: "vitamin_b12", name: "Vitamin B12", category: "Vitamins", target: 2.4, unit: "mcg", color: "#A855F7" },
  { id: "vitamin_a", name: "Vitamin A", category: "Vitamins", target: 900, unit: "mcg", color: "#F97316" },
  { id: "vitamin_e", name: "Vitamin E", category: "Vitamins", target: 15, unit: "mg", color: "#84CC16" },
  { id: "vitamin_k", name: "Vitamin K", category: "Vitamins", target: 120, unit: "mcg", color: "#22C55E" },
  { id: "folate", name: "Folate (B9)", category: "Vitamins", target: 400, unit: "mcg", color: "#8B5CF6" },
  { id: "vitamin_b6", name: "Vitamin B6", category: "Vitamins", target: 1.7, unit: "mg", color: "#6366F1" },

  // Essential Minerals
  { id: "sodium", name: "Sodium", category: "Minerals", target: 2300, unit: "mg", color: "#6366F1" },
  { id: "potassium", name: "Potassium", category: "Minerals", target: 3500, unit: "mg", color: "#10B981" },
  { id: "calcium", name: "Calcium", category: "Minerals", target: 1000, unit: "mg", color: "#8B5CF6" },
  { id: "iron", name: "Iron", category: "Minerals", target: 18, unit: "mg", color: "#EF4444" },
  { id: "magnesium", name: "Magnesium", category: "Minerals", target: 400, unit: "mg", color: "#14B8A6" },
  { id: "zinc", name: "Zinc", category: "Minerals", target: 11, unit: "mg", color: "#64748B" },
  { id: "selenium", name: "Selenium", category: "Minerals", target: 55, unit: "mcg", color: "#475569" },

  // Fats & Carbs
  { id: "saturated_fat", name: "Saturated Fat", category: "Fats & Carbs", target: 20, unit: "g", color: "#EF4444" },
  { id: "trans_fat", name: "Trans Fat", category: "Fats & Carbs", target: 0, unit: "g", color: "#DC2626" },
  { id: "omega_3", name: "Omega-3 Fatty Acids", category: "Fats & Carbs", target: 2000, unit: "mg", color: "#3B82F6" },
  { id: "cholesterol", name: "Cholesterol", category: "Fats & Carbs", target: 300, unit: "mg", color: "#F97316" },
  { id: "sugar", name: "Added Sugar", category: "Fats & Carbs", target: 25, unit: "g", color: "#EC4899" },
  { id: "net_carbs", name: "Net Carbs", category: "Fats & Carbs", target: 50, unit: "g", color: "#06B6D4" },

  // Bioactives & Supplements
  { id: "caffeine", name: "Caffeine", category: "Supplements", target: 200, unit: "mg", color: "#78350F" },
  { id: "creatine", name: "Creatine Monohydrate", category: "Supplements", target: 5, unit: "g", color: "#0F172A" },
  { id: "collagen", name: "Collagen Peptides", category: "Supplements", target: 10, unit: "g", color: "#F43F5E" },
  { id: "ashwagandha", name: "Ashwagandha", category: "Supplements", target: 600, unit: "mg", color: "#059669" },
  { id: "electrolytes", name: "Total Electrolytes", category: "Supplements", target: 4000, unit: "mg", color: "#0284C7" },
];

export const COMMON_MICRO_NUTRIENTS = FAMOUS_NUTRIENTS_CATALOG;

export const EditProfileView = ({
  profileData,
  setProfileData,
  setActiveTab,
}: {
  key?: string;
  profileData: any;
  setProfileData: any;
  setActiveTab: (tab: string) => void;
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);

  // Searchable Micro-Nutrient Dropdown state
  const [nutrientSearchQuery, setNutrientSearchQuery] = useState("");
  const [isNutrientDropdownOpen, setIsNutrientDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNutrientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const currentTags = profileData.tracking_tags || DEFAULT_TRACKING_TAGS;

  const handleQuickAddTag = (tagName: string) => {
    if (!tagName) return;
    const template = COMMON_TAG_TEMPLATES.find((t) => t.name === tagName);
    if (!template) return;
    if (currentTags.some((t: any) => t.name.toLowerCase() === tagName.toLowerCase())) {
      return;
    }
    const newTag = {
      id: `tag_${Date.now()}`,
      name: template.name,
      description: template.description,
      enabled: true
    };
    setProfileData({ ...profileData, tracking_tags: [...currentTags, newTag] });
  };

  const handleToggleTag = (tagId: string) => {
    const updated = currentTags.map((t: any) =>
      t.id === tagId ? { ...t, enabled: !t.enabled } : t
    );
    setProfileData({ ...profileData, tracking_tags: updated });
  };

  const handleUpdateTagDesc = (tagId: string, desc: string) => {
    const updated = currentTags.map((t: any) =>
      t.id === tagId ? { ...t, description: desc } : t
    );
    setProfileData({ ...profileData, tracking_tags: updated });
  };

  const handleDeleteTag = (tagId: string) => {
    const updated = currentTags.filter((t: any) => t.id !== tagId);
    setProfileData({ ...profileData, tracking_tags: updated });
  };

  const handleRestoreDefaults = () => {
    setProfileData({ ...profileData, tracking_tags: DEFAULT_TRACKING_TAGS });
  };

  const handleAddCustomTag = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    if (currentTags.some((t: any) => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      return;
    }
    const newTag = {
      id: `custom_${Date.now()}`,
      name: trimmedName,
      description: newDesc.trim() || `Apply when meal meets ${trimmedName} guidelines`,
      enabled: true
    };
    setProfileData({ ...profileData, tracking_tags: [...currentTags, newTag] });
    setNewName("");
    setNewDesc("");
    setShowAddForm(false);
  };

  // BMI calculation
  const weight = profileData.weight || 70;
  const height = profileData.height || 170;
  const heightM = height / 100;
  const bmi = heightM > 0 ? parseFloat((weight / (heightM * heightM)).toFixed(1)) : 0;

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
    if (bmiValue < 18.5) return { label: "Underweight", color: "text-blue-500", bg: "bg-blue-50/55", border: "border-blue-100", desc: "Consider consulting a nutritionist to gain healthy mass safely." };
    if (bmiValue < 25) return { label: "Normal Weight", color: "text-emerald-500", bg: "bg-emerald-50/55", border: "border-emerald-100", desc: "Excellent! You are in a healthy, balanced weight zone." };
    if (bmiValue < 30) return { label: "Overweight", color: "text-orange-500", bg: "bg-orange-50/55", border: "border-orange-100", desc: "Keep logging daily meals and maintaining a moderate active deficit." };
    return { label: "Obese", color: "text-red-500", bg: "bg-red-50/55", border: "border-red-100", desc: "Work with FitAI Sync triggers and coaching to steadily guide your calorie deficit." };
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
        {/* Minimalist Back Navigation */}
        <div className="flex items-center justify-between bg-white px-4 py-3.5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02]">
          <button
            onClick={() => setActiveTab("profile")}
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-850 transition-colors cursor-pointer border-none bg-transparent active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 text-stone-400" />
            <span className="text-[11px] font-black uppercase tracking-wider">Back to Profile</span>
          </button>
          <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest bg-stone-50 px-2 py-1 rounded-md border border-stone-200/50">
            Auto-Saved
          </span>
        </div>

        <div className="space-y-5">
          {/* Card 1: Personal Profile & Biometrics */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-50">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <User className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Personal Profile & Biometrics</span>
            </div>

            {/* Avatar Picker */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-orange-500 shadow-md bg-stone-100 flex items-center justify-center shrink-0">
                  {profileData.imageUrl ? (
                    <img src={profileData.imageUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <DefaultAvatar />
                  )}
                </div>
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
                          const MAX_WIDTH = 200, MAX_HEIGHT = 200;
                          let w = img.width, h = img.height;
                          if (w > h) { if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; } }
                          else { if (h > MAX_HEIGHT) { w *= MAX_HEIGHT / h; h = MAX_HEIGHT; } }
                          canvas.width = w; canvas.height = h;
                          const ctx = canvas.getContext("2d");
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, w, h);
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
              <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Upload or change avatar</span>
            </div>

            {/* Full Name Row */}
            <div>
              <label className="text-[9px] font-black text-[#9e9e9e] uppercase tracking-widest block mb-1 px-1">Full Name</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3 text-sm font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-shadow"
              />
            </div>

            {/* Personal Self-Note Row */}
            <div>
              <div className="flex justify-between items-center mb-1 px-1">
                <label className="text-[9px] font-black text-[#9e9e9e] uppercase tracking-widest">Personal Self-Note</label>
                <span className="text-[8px] font-bold text-orange-500/80">✨ AI reads this for context</span>
              </div>
              <div className="relative">
                <textarea
                  value={profileData.description}
                  onChange={(e) => setProfileData({ ...profileData, description: e.target.value.slice(0, 300) })}
                  placeholder="e.g. Focusing on 120g protein daily & staying active 💪"
                  className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-orange-500/10 resize-y min-h-[84px] border border-transparent hover:border-stone-200 focus:border-transparent transition-colors"
                />
              </div>
              <div className="flex justify-between items-center mt-1 px-1">
                <span className="text-[8px] font-bold text-stone-400">Max 300 characters</span>
                <span className={cn("text-[9px] font-black tracking-wider", (profileData.description || "").length >= 280 ? "text-orange-600" : "text-stone-400")}>
                  {(profileData.description || "").length}/300
                </span>
              </div>
            </div>

            {/* Age Individual Row */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-2 shadow-2xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Age</span>
                <span className="text-[9px] font-black text-stone-400 uppercase">Yrs Old</span>
              </div>
              <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    const currentAge = getAge(profileData.dob) || 28;
                    const newAge = Math.max(10, currentAge - 1);
                    setProfileData({ ...profileData, dob: `${new Date().getFullYear() - newAge}-01-01` });
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  <input
                    type="number"
                    value={getAge(profileData.dob) || 28}
                    onChange={(e) => {
                      const newAge = parseInt(e.target.value) || 28;
                      setProfileData({ ...profileData, dob: `${new Date().getFullYear() - newAge}-01-01` });
                    }}
                    className="bg-transparent border-none text-center text-sm font-black text-stone-850 focus:outline-none w-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs font-bold text-stone-400">Yrs</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentAge = getAge(profileData.dob) || 28;
                    const newAge = Math.min(120, currentAge + 1);
                    setProfileData({ ...profileData, dob: `${new Date().getFullYear() - newAge}-01-01` });
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Height Individual Row */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Height</span>
                </div>
                <span className="text-[9px] font-black text-stone-400 uppercase">cm</span>
              </div>
              <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, height: Math.max(100, (profileData.height || 170) - 1) })}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  <input
                    type="number"
                    value={profileData.height || ""}
                    onChange={(e) => setProfileData({ ...profileData, height: parseInt(e.target.value) || 0 })}
                    className="bg-transparent border-none text-center text-sm font-black text-stone-850 focus:outline-none w-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs font-bold text-stone-400">cm</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, height: Math.min(250, (profileData.height || 170) + 1)} )}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Current Weight Individual Row */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Current Weight</span>
                </div>
                <span className="text-[9px] font-black text-stone-400 uppercase">kg</span>
              </div>
              <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, weight: Math.max(30, (profileData.weight || 70) - 1) })}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  <input
                    type="number"
                    value={profileData.weight || ""}
                    onChange={(e) => setProfileData({ ...profileData, weight: parseInt(e.target.value) || 0 })}
                    className="bg-transparent border-none text-center text-sm font-black text-stone-850 focus:outline-none w-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs font-bold text-stone-400">kg</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, weight: Math.min(300, (profileData.weight || 70) + 1) })}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* BMI Card Banner Row */}
            <div className={cn("p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-colors duration-300 shadow-2xs", bmiStatus.bg, bmiStatus.border)}>
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
                <span className="text-2xl font-black text-stone-900 tracking-tight leading-none">{bmi}</span>
                <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Index Value</span>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden flex relative">
                  <div className="w-[40%] h-full bg-blue-400/80" />
                  <div className="w-[15%] h-full bg-emerald-400/80" />
                  <div className="w-[10%] h-full bg-orange-400/80" />
                  <div className="w-[35%] h-full bg-red-400/80" />
                </div>
                <div className="flex justify-between text-[7px] font-black text-stone-400 tracking-widest">
                  <span>UNDER: &lt;18.5</span>
                  <span>NORMAL: 18.5-24.9</span>
                  <span>OVER: 25-29.9</span>
                  <span>OBESE: &gt;=30</span>
                </div>
              </div>
              <p className="text-[9.5px] text-stone-500 leading-relaxed font-medium">{bmiStatus.desc}</p>
            </div>
          </div>

          {/* Card 4: Daily Vitals Trackers (Separate Dedicated Section) */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4 text-left">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-50">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Daily Vitals Trackers</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  key: "trackWeight",
                  defaultOn: true,
                  label: "Weight Log",
                  desc: "Track daily body weight & trendlines",
                  icon: Scale,
                  hasGoal: false,
                  hasInfo: false,
                },
                {
                  key: "trackWater",
                  defaultOn: false,
                  label: "Water Intake",
                  desc: "Quick-log daily hydration in ml",
                  icon: Droplet,
                  hasGoal: true,
                  goalKey: "dailyWater",
                  goalDefault: 2500,
                  goalStep: 250,
                  goalMin: 500,
                  goalMax: 10000,
                  goalLabel: "Daily Hydration Goal",
                  goalUnit: "ml",
                  hasInfo: false,
                },
                {
                  key: "trackDigestion",
                  defaultOn: false,
                  label: "Digestion Log",
                  desc: "Bristol stool consistency spectrum",
                  icon: Activity,
                  hasGoal: false,
                  hasInfo: true,
                  infoTitle: "🩺 Bristol Stool Scale Guide",
                  infoContent: "The Bristol Stool Scale (Types 1–7) is the medical standard for evaluating gut motility and digestive health.\n\n• Types 1–2: Hard, lumpy stool (Constipation / dehydration)\n• Types 3–4: Smooth, soft sausage shape (Optimal gut motility)\n• Types 5–7: Fluffy or liquid stool (Inflammation / loose bowel)\n\nLogging your stool daily helps track food intolerances, fiber response, and gut balance.",
                },
                {
                  key: "trackEnergy",
                  defaultOn: false,
                  label: "Energy Level",
                  desc: "1 to 5 vitality & mood spectrum",
                  icon: Zap,
                  hasGoal: false,
                  hasInfo: true,
                  infoTitle: "⚡ Energy & Vitality Spectrum",
                  infoContent: "The 1 to 5 Vitality Spectrum tracks subjective daily energy levels:\n\n1: 😴 Exhausted / Drained\n2: 🥱 Sluggish / Heavy\n3: ⚡ Steady / Normal\n4: 🔥 High Energy / Active\n5: 🚀 Peak Vitality / Unstoppable\n\nTracking energy helps uncover how your macro ratios, sleep, and meal timing impact daily performance.",
                },
              ].map((item) => {
                const Icon = item.icon;
                const isEnabled = profileData.agent_config?.[item.key] ?? item.defaultOn;
                
                return (
                  <div
                    key={item.key}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all shadow-3xs flex flex-col gap-2.5",
                      isEnabled ? "bg-white border-stone-200/90" : "bg-stone-50 border-stone-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-center text-stone-600 shrink-0">
                          <Icon className="w-4 h-4 text-stone-500" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-850">{item.label}</span>
                            {item.hasInfo && (
                              <button
                                type="button"
                                onClick={() => setActiveInfoKey(item.key)}
                                className="w-4 h-4 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer border-none bg-transparent active:scale-90"
                                title="Learn more"
                              >
                                <Info className="w-3 h-3 text-stone-400 hover:text-orange-500 transition-colors" />
                              </button>
                            )}
                          </div>
                          <span className="text-[9.5px] font-medium text-stone-400">{item.desc}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setProfileData({
                          ...profileData,
                          agent_config: {
                            ...profileData.agent_config,
                            [item.key]: !isEnabled,
                          }
                        })}
                        className={cn(
                          "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border-none shrink-0",
                          isEnabled ? "bg-orange-500" : "bg-stone-200"
                        )}
                      >
                        <div
                          className={cn(
                            "bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200",
                            isEnabled ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {isEnabled && item.hasGoal && (
                      <div className="pt-2.5 border-t border-stone-150 flex items-center justify-between animate-fade-in">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{item.goalLabel}</span>
                        <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl px-2 py-1 shadow-3xs">
                          <button
                            type="button"
                            onClick={() => {
                              const currentVal = profileData.goals?.[item.goalKey] ?? item.goalDefault;
                              const newVal = Math.max(item.goalMin, currentVal - item.goalStep);
                              setProfileData({
                                ...profileData,
                                goals: { ...profileData.goals, [item.goalKey]: newVal }
                              });
                            }}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={profileData.goals?.[item.goalKey] ?? item.goalDefault}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || item.goalMin;
                              setProfileData({
                                ...profileData,
                                goals: { ...profileData.goals, [item.goalKey]: val }
                              });
                            }}
                            className="bg-transparent border-none text-center text-xs font-black text-stone-850 focus:outline-none w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-[10px] font-bold text-stone-400">{item.goalUnit}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const currentVal = profileData.goals?.[item.goalKey] ?? item.goalDefault;
                              const newVal = Math.min(item.goalMax, currentVal + item.goalStep);
                              setProfileData({
                                ...profileData,
                                goals: { ...profileData.goals, [item.goalKey]: newVal }
                              });
                            }}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 5: Goals & Targets */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-50">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Goals & Targets</span>
            </div>

            {/* Daily Calories Goal */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-2.5 shadow-2xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Daily Calorie Target</span>
                <span className="text-[9px] font-black text-stone-400 uppercase">kcal</span>
              </div>
              <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setProfileData({
                    ...profileData,
                    goals: { ...profileData.goals, dailyCalories: Math.max(800, (profileData.goals?.dailyCalories || 2000) - 50) }
                  })}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none bg-transparent"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex items-center justify-center">
                  <input
                    type="number"
                    value={profileData.goals?.dailyCalories || ""}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      goals: { ...profileData.goals, dailyCalories: parseInt(e.target.value) || 0 }
                    })}
                    className="bg-transparent border-none text-center text-sm font-black text-stone-850 focus:outline-none w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setProfileData({
                    ...profileData,
                    goals: { ...profileData.goals, dailyCalories: Math.min(10000, (profileData.goals?.dailyCalories || 2000) + 50) }
                  })}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none bg-transparent"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Target Weight Goal */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-2.5 shadow-2xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Target Weight</span>
                <span className="text-[9px] font-black text-stone-400 uppercase">kg</span>
              </div>
              <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setProfileData({
                    ...profileData,
                    goals: { ...profileData.goals, weightGoal: Math.max(30, (profileData.goals?.weightGoal || 70) - 1) }
                  })}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none bg-transparent"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex items-center justify-center">
                  <input
                    type="number"
                    value={profileData.goals?.weightGoal || ""}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      goals: { ...profileData.goals, weightGoal: parseFloat(e.target.value) || 0 }
                    })}
                    className="bg-transparent border-none text-center text-sm font-black text-stone-850 focus:outline-none w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setProfileData({
                    ...profileData,
                    goals: { ...profileData.goals, weightGoal: Math.min(300, (profileData.goals?.weightGoal || 70) + 1) }
                  })}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none bg-transparent"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Card: Nutrient Tracking (Dedicated Section) */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-stone-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <Activity className="w-4 h-4 text-orange-500" />
                </div>
                <h3 className="text-sm font-extrabold text-[#1a1a1a]">
                  Nutrient Tracking
                </h3>
              </div>
              {(() => {
                const trackedList = profileData.tracked_nutrients || [];
                const activeCount = trackedList.filter((n: any) => n.enabled ?? true).length;
                return (
                  <span
                    className={cn(
                      "text-[9px] font-black font-mono px-2 py-0.5 rounded-full border",
                      activeCount >= 8
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-orange-50 text-orange-600 border-orange-200/80"
                    )}
                  >
                    {activeCount}/8 Active Slots
                  </span>
                );
              })()}
            </div>
            <div className="space-y-3 pt-1 relative">
                  {/* Search Bar Input */}
                  <div ref={dropdownRef} className="relative">
                    <div className="flex items-center gap-2 bg-stone-50 border border-stone-200/90 rounded-2xl px-3 py-2 shadow-2xs focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500/50 transition-all">
                      <Search className="w-4 h-4 text-stone-400 shrink-0" />
                      <input
                        type="text"
                        value={nutrientSearchQuery}
                        onChange={(e) => {
                          setNutrientSearchQuery(e.target.value);
                          setIsNutrientDropdownOpen(true);
                        }}
                        onFocus={() => setIsNutrientDropdownOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setIsNutrientDropdownOpen(false);
                          }
                        }}
                        placeholder="+ Track Nutrient (Search Protein, Sodium, Vitamin D, etc.)..."
                        className="flex-1 bg-transparent border-none text-xs font-bold text-stone-850 placeholder:text-stone-400 focus:outline-none"
                      />
                      {nutrientSearchQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setNutrientSearchQuery("");
                            setIsNutrientDropdownOpen(false);
                          }}
                          className="w-5 h-5 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-600 border-none cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsNutrientDropdownOpen(!isNutrientDropdownOpen)}
                          className="w-6 h-6 rounded-lg hover:bg-stone-200/60 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors border-none bg-transparent cursor-pointer"
                          title={isNutrientDropdownOpen ? "Close dropdown" : "Open dropdown"}
                        >
                          {isNutrientDropdownOpen ? (
                            <ChevronUp className="w-4 h-4 text-stone-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-stone-400" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Dropdown Menu Overlay */}
                    {isNutrientDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-2xl shadow-xl z-30 max-h-72 overflow-y-auto p-2 space-y-1.5 animate-fade-in">
                        {(() => {
                          const query = nutrientSearchQuery.toLowerCase().trim();
                          const trackedList = profileData.tracked_nutrients || [];
                          const activeCount = trackedList.filter((n: any) => n.enabled ?? true).length;
                          const isAtCapacity = activeCount >= 8;
                          
                          const filtered = FAMOUS_NUTRIENTS_CATALOG.filter((item) => {
                            return !query || item.name.toLowerCase().includes(query) || item.id.includes(query) || item.category.toLowerCase().includes(query);
                          });

                          if (filtered.length === 0 && !query) {
                            return (
                              <div className="text-center py-4 text-xs font-bold text-stone-400">
                                No nutrients found.
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-1">
                              {isAtCapacity && (
                                <div className="px-2 py-1.5 bg-amber-50 rounded-xl border border-amber-200 text-[10px] font-extrabold text-amber-800 text-center mb-1">
                                  ⚠️ Max 8 active nutrient slots reached. Untrack an item to add a new one.
                                </div>
                              )}
                              {filtered.map((item) => {
                                const existing = trackedList.find((n: any) => n.id === item.id);
                                const isTracked = existing ? (existing.enabled ?? true) : false;

                                return (
                                  <div
                                    key={item.id}
                                    className={cn(
                                      "flex items-center justify-between p-2 rounded-xl text-xs transition-colors",
                                      isTracked ? "bg-stone-50/80" : "hover:bg-stone-50"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: item.color || "#F97316" }}
                                      />
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-extrabold text-stone-850 truncate">{item.name}</span>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-stone-400">
                                          <span className="uppercase tracking-wider">{item.category}</span>
                                          <span>•</span>
                                          <span className="font-mono">{item.target} {item.unit}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={!isTracked && isAtCapacity}
                                      onClick={() => {
                                        if (!isTracked && isAtCapacity) return;
                                        let updated;
                                        if (existing) {
                                          updated = trackedList.map((n: any) =>
                                            n.id === item.id ? { ...n, enabled: true } : n
                                          );
                                        } else {
                                          updated = [
                                            ...trackedList,
                                            { id: item.id, name: item.name, target: item.target, unit: item.unit, color: item.color, enabled: true, isDefault: false }
                                          ];
                                        }
                                        
                                        // Update macro state if macro item
                                        const updatedMacros = { ...(profileData.macros || {}) };
                                        if (["protein", "carbs", "fats", "fiber"].includes(item.id)) {
                                          updatedMacros[item.id] = item.target;
                                        }

                                        setProfileData({ ...profileData, macros: updatedMacros, tracked_nutrients: updated });
                                        setIsNutrientDropdownOpen(false);
                                        setNutrientSearchQuery("");
                                      }}
                                      className={cn(
                                        "px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all select-none flex items-center gap-1 shrink-0",
                                        isTracked
                                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
                                          : isAtCapacity
                                          ? "bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed"
                                          : "bg-orange-500 border-orange-500 hover:bg-orange-600 text-white cursor-pointer shadow-3xs active:scale-95"
                                      )}
                                    >
                                      {isTracked ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-600" />
                                          <span>Tracking</span>
                                        </>
                                      ) : isAtCapacity ? (
                                        <span>Full (8/8)</span>
                                      ) : (
                                        <>
                                          <Plus className="w-3 h-3" />
                                          <span>Track</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}

                              {/* Custom Nutrient Adder */}
                              {query && !filtered.some((f) => f.name.toLowerCase() === query) && (
                                <div className="pt-1 border-t border-stone-100 mt-1">
                                  <button
                                    type="button"
                                    disabled={isAtCapacity}
                                    onClick={() => {
                                      if (isAtCapacity) return;
                                      const customId = `custom_${Date.now()}`;
                                      const newNutrient = {
                                        id: customId,
                                        name: nutrientSearchQuery.trim(),
                                        target: 100,
                                        unit: "mg",
                                        color: "#F97316",
                                        enabled: true,
                                        isDefault: false
                                      };
                                      const updated = [...trackedList, newNutrient];
                                      setProfileData({ ...profileData, tracked_nutrients: updated });
                                      setNutrientSearchQuery("");
                                      setIsNutrientDropdownOpen(false);
                                    }}
                                    className={cn(
                                      "w-full text-left p-2 rounded-xl text-xs font-extrabold flex items-center justify-between transition-colors border-none",
                                      isAtCapacity
                                        ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                                        : "bg-orange-50 hover:bg-orange-100/80 text-orange-700 cursor-pointer"
                                    )}
                                  >
                                    <span>{isAtCapacity ? "Slots Full (8/8 Max)" : `+ Add "${nutrientSearchQuery}" as Custom Nutrient`}</span>
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Active Tracked Nutrients Grid */}
                  {(() => {
                    const trackedList = profileData.tracked_nutrients || [];
                    const activeNutrients = trackedList.filter((n: any) => n.enabled ?? true);

                    if (activeNutrients.length === 0) {
                      return (
                        <div className="text-center py-4 px-3 bg-stone-50/70 rounded-2xl border border-dashed border-stone-200/80 space-y-1">
                          <span className="text-xs font-black text-stone-700 block">✨ Pure Calorie Tracking Active</span>
                          <span className="text-[10px] font-medium text-stone-400 block">
                            You are tracking Calories only! Click &quot;+ Track Nutrient&quot; above to add Protein, Carbs, Sodium, etc.
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2 pt-1">
                        <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block px-1">
                          Active Target Slots ({activeNutrients.length}/8)
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {activeNutrients.map((item: any) => (
                            <div
                              key={item.id}
                              className="bg-stone-50/80 border border-stone-200/70 rounded-2xl p-2.5 flex flex-col justify-between shadow-3xs hover:border-stone-300 transition-all text-left"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: item.color || "#F97316" }}
                                  />
                                  <span className="text-xs font-extrabold text-stone-850 truncate">{item.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = trackedList.map((n: any) =>
                                      n.id === item.id ? { ...n, enabled: false } : n
                                    );
                                    setProfileData({ ...profileData, tracked_nutrients: updated });
                                  }}
                                  className="w-5 h-5 rounded-lg text-stone-350 hover:text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer border-none bg-transparent transition-colors shrink-0"
                                  title={`Remove ${item.name}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between mt-2 bg-white border border-stone-200/80 rounded-xl px-1.5 py-0.5 shadow-3xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const step = item.unit === "mg" ? 50 : item.unit === "IU" ? 100 : item.unit === "mcg" ? 10 : 5;
                                    const newVal = Math.max(0, (item.target || 0) - step);
                                    const updated = trackedList.map((n: any) =>
                                      n.id === item.id ? { ...n, target: newVal } : n
                                    );
                                    const updatedMacros = { ...(profileData.macros || {}) };
                                    if (["protein", "carbs", "fats", "fiber"].includes(item.id)) {
                                      updatedMacros[item.id] = newVal;
                                    }
                                    setProfileData({ ...profileData, macros: updatedMacros, tracked_nutrients: updated });
                                  }}
                                  className="w-5 h-5 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <div className="flex items-center justify-center gap-0.5 min-w-0">
                                  <input
                                    type="number"
                                    value={item.target || 0}
                                    onChange={(e) => {
                                      const newVal = Math.max(0, parseFloat(e.target.value) || 0);
                                      const updated = trackedList.map((n: any) =>
                                        n.id === item.id ? { ...n, target: newVal } : n
                                      );
                                      const updatedMacros = { ...(profileData.macros || {}) };
                                      if (["protein", "carbs", "fats", "fiber"].includes(item.id)) {
                                        updatedMacros[item.id] = newVal;
                                      }
                                      setProfileData({ ...profileData, macros: updatedMacros, tracked_nutrients: updated });
                                    }}
                                    className="w-12 text-center text-xs font-black text-stone-900 bg-transparent border-none focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <span className="text-[9px] font-bold text-stone-400 font-mono">{item.unit}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const step = item.unit === "mg" ? 50 : item.unit === "IU" ? 100 : item.unit === "mcg" ? 10 : 5;
                                    const newVal = (item.target || 0) + step;
                                    const updated = trackedList.map((n: any) =>
                                      n.id === item.id ? { ...n, target: newVal } : n
                                    );
                                    const updatedMacros = { ...(profileData.macros || {}) };
                                    if (["protein", "carbs", "fats", "fiber"].includes(item.id)) {
                                      updatedMacros[item.id] = newVal;
                                    }
                                    setProfileData({ ...profileData, macros: updatedMacros, tracked_nutrients: updated });
                                  }}
                                  className="w-5 h-5 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

        {/* Card 5: AI Meal Tags */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-stone-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <Tag className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">AI Meal Tags</span>
              </div>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="text-[9px] font-black uppercase text-stone-400 hover:text-stone-600 flex items-center gap-1 cursor-pointer bg-stone-50 px-2 py-1 rounded-lg border border-stone-200/50 shadow-3xs"
              >
                Restore Defaults
              </button>
            </div>

            <p className="text-[9.5px] text-stone-400 font-semibold leading-normal">
              Tags that FitAI's AI vision automatically assigns to logged meals based on ingredients.
            </p>

            {/* List of tags as clean 1-line cards */}
            <div className="space-y-2.5">
              {currentTags.map((tag: any) => {
                const isSelected = selectedTagId === tag.id;
                return (
                  <div
                    key={tag.id}
                    className={cn(
                      "p-3.5 rounded-[22px] border transition-all space-y-2 shadow-2xs",
                      tag.enabled
                        ? "bg-white border-stone-200"
                        : "bg-stone-50 border-stone-150 opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">{tag.name}</h4>
                        <p className="text-[10px] font-bold text-stone-400 mt-0.5">{tag.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Pencil Edit Rule Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedTagId(isSelected ? null : tag.id)}
                          className="p-1 rounded-full text-stone-400 hover:text-stone-700 border-none bg-transparent cursor-pointer"
                          title="Edit AI Rule"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleTag(tag.id)}
                          className={cn(
                            "w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer border-none shrink-0",
                            tag.enabled ? "bg-orange-500" : "bg-stone-300"
                          )}
                        >
                          <div
                            className={cn(
                              "bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform",
                              tag.enabled ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>

                        {/* Delete Tag Button */}
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteTag(tag.id);
                            if (isSelected) setSelectedTagId(null);
                          }}
                          className="text-stone-300 hover:text-red-500 border-none bg-transparent cursor-pointer transition-colors p-1"
                          title="Delete tag"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Rule Textarea Expansion */}
                    {isSelected && (
                      <div className="pt-2 border-t border-stone-100 space-y-1 text-left animate-fadeIn">
                        <span className="text-[9px] font-black text-stone-400 uppercase">AI Prompt Guideline</span>
                        <textarea
                          value={tag.description}
                          onChange={(e) => handleUpdateTagDesc(tag.id, e.target.value)}
                          rows={2}
                          placeholder="Describe guidelines for the AI..."
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-xs font-semibold text-stone-700 focus:outline-none resize-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Tags Section */}
            {/* Add Custom Tag Section */}
            <div className="pt-3 border-t border-stone-100">
              {showAddForm ? (
                <div className="space-y-2 border border-stone-150 bg-stone-50 rounded-2xl p-3.5 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Custom Tag</span>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-stone-400 hover:text-stone-600 text-[9px] font-black uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Nut Free"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:border-stone-400 shadow-3xs"
                  />
                  <textarea
                    placeholder="AI guidelines (e.g. contains no peanut or tree nut)"
                    rows={1.5}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-755 focus:outline-none focus:border-stone-400 resize-none shadow-3xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="w-full bg-stone-900 text-white hover:bg-stone-850 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg"
                  >
                    Add Custom Tag
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full h-9 bg-white border border-dashed border-stone-300 hover:border-stone-400 text-stone-500 hover:text-stone-700 flex items-center justify-center py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-3xs"
                >
                  + Custom Tag
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Context Info Modal Popup Dialog (for Digestion and Energy) */}
      {activeInfoKey && (() => {
        const infoMap: Record<string, { title: string; desc: string }> = {
          trackDigestion: {
            title: "🩺 Bristol Stool Scale Guide",
            desc: "The Bristol Stool Scale (Types 1–7) is the clinical standard for evaluating gut motility & digestive health.\n\n• Types 1–2: Hard, lumpy stool (Constipation / dehydration)\n• Types 3–4: Smooth, soft sausage shape (Optimal gut motility)\n• Types 5–7: Fluffy or liquid stool (Inflammation / loose bowel)\n\nLogging your stool daily helps track food intolerances, fiber response, and gut health trends over time.",
          },
          trackEnergy: {
            title: "⚡ Energy & Vitality Spectrum",
            desc: "The 1 to 5 Vitality Spectrum tracks subjective daily energy levels:\n\n1: 😴 Exhausted / Drained\n2: 🥱 Sluggish / Heavy\n3: ⚡ Steady / Normal\n4: 🔥 High Energy / Active\n5: 🚀 Peak Vitality / Unstoppable\n\nTracking energy helps uncover how macro ratios, hydration, and sleep impact your daily performance.",
          },
        };
        const info = infoMap[activeInfoKey];
        if (!info) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200/80 text-left space-y-4 animate-scale-in">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-sm font-black text-stone-850 tracking-tight">{info.title}</h3>
                <button
                  type="button"
                  onClick={() => setActiveInfoKey(null)}
                  className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center border-none cursor-pointer transition-all active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line font-medium">
                {info.desc}
              </p>
              <button
                type="button"
                onClick={() => setActiveInfoKey(null)}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs py-3 rounded-2xl shadow-sm border-none cursor-pointer transition-all active:scale-98"
              >
                Got it
              </button>
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
};
