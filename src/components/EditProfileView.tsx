import React, { useState } from "react";
import { Camera, User, Smile, Scale, Ruler, Target, Info, Plus, Minus, Tag, X, ChevronLeft, Droplet, Activity, Zap, Pencil } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { DefaultAvatar } from "./DefaultAvatar";
import { DEFAULT_TRACKING_TAGS } from "./SettingsView";

export const COMMON_TAG_TEMPLATES = [
  { name: "Gluten Free", description: "Apply when meal contains no wheat, barley, rye, or oats" },
  { name: "Dairy Free", description: "Apply when meal contains no milk, cheese, cream, butter, or yogurt" },
  { name: "Nut Free", description: "Apply when meal contains no peanuts, tree nuts, or seeds" },
  { name: "Vegan", description: "Apply when meal contains no animal products" },
  { name: "Vegetarian", description: "Apply when meal contains no meat or fish" },
  { name: "Keto", description: "Apply when meal is high fat and carbs are 10g or less" },
  { name: "Rich in Iron", description: "Apply when meal contains iron-rich foods (e.g. spinach, red meat)" },
  { name: "Rich in B12", description: "Apply when meal contains B12-rich foods (e.g. fish, eggs, meat)" },
  { name: "Rich in Omega-3", description: "Apply when meal contains omega-3 rich foods (e.g. salmon, walnuts, chia)" },
  { name: "Rich in Magnesium", description: "Apply when meal contains magnesium-rich foods (e.g. dark chocolate, avocado, pumpkin seeds)" },
  { name: "Sugar Free", description: "Apply when meal contains no added or natural sugars" },
  { name: "Low FODMAP", description: "Apply when meal complies with low FODMAP guidelines" }
];

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
          {/* Card 1: Identity */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-50">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <Smile className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Identity Details</span>
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

            <div>
              <label className="text-[9px] font-black text-[#9e9e9e] uppercase tracking-widest block mb-1 px-1">Full Name</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3 text-sm font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-shadow"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 px-1">
                <label className="text-[9px] font-black text-[#9e9e9e] uppercase tracking-widest">Bio Description</label>
                <span className="text-[8px] font-bold text-stone-400 flex items-center gap-0.5">↘ Drag corner to expand</span>
              </div>
              <div className="relative">
                <textarea
                  value={profileData.description}
                  onChange={(e) => setProfileData({ ...profileData, description: e.target.value.slice(0, 300) })}
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

          {/* Card 2: Age & Gender */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-50">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <User className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Age Settings</span>
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="text-[9px] font-black text-[#9e9e9e] uppercase tracking-widest">Age</label>
              </div>
              <div className="flex items-center bg-[#f5f5f5]/65 border border-stone-200/50 rounded-2xl px-2 py-1 shadow-sm">
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
                    className="bg-transparent border-none text-center text-xs font-bold text-[#1a1a1a] focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">Yrs Old</span>
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
          </div>

          {/* Card 3: Vitals */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <Scale className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Vitals & Biometrics</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">Interactive Stepper Config</span>
            </div>

            {/* Weight */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Body Weight</span>
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

            {/* Height */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Height</span>
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
                  onClick={() => setProfileData({ ...profileData, height: Math.min(250, (profileData.height || 170) + 1) })}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* BMI Card */}
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
              <div className="space-y-1.5 pt-1">
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
              <p className="text-[10px] text-stone-500 leading-relaxed font-medium">{bmiStatus.desc}</p>
            </div>

            {/* Daily Vitals & Trackers Config */}
            <div className="pt-3 border-t border-stone-100 space-y-3 text-left">
              <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Daily Vitals & Trackers</span>
              
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
                              {/* Minimalist Info Icon - ONLY for Digestion & Energy */}
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

                        {/* Toggle Switch */}
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

                      {/* Expanded Uncollapsable Goal Config (when toggle is enabled) */}
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
          </div>

          {/* Card 4: Goals & Targets */}
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

            {/* Macros Grid */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Macro Split Targets</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Protein (g)", key: "protein", color: "border-orange-200 text-orange-655 bg-orange-50/15" },
                  { label: "Carbs (g)", key: "carbs", color: "border-[#90E0EF] text-[#0077B6] bg-[#CAF0F8]/10" },
                  { label: "Fats (g)", key: "fats", color: "border-yellow-200 text-yellow-600 bg-yellow-50/15" },
                  { label: "Fiber (g)", key: "fiber", color: "border-emerald-200 text-emerald-700 bg-emerald-50/10" },
                ].map((m) => (
                  <div key={m.label} className={`border rounded-2xl p-3 flex flex-col justify-between shadow-2xs ${m.color}`}>
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-90">{m.label}</span>
                    <div className="flex items-center justify-between mt-2 gap-1 bg-white/95 border border-black/[0.04] rounded-xl px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => setProfileData({
                          ...profileData,
                          macros: { ...profileData.macros, [m.key]: Math.max(0, (profileData.macros[m.key] || 0) - 5) }
                        })}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90 transition-transform"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={profileData.macros[m.key] || 0}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          macros: { ...profileData.macros, [m.key]: parseInt(e.target.value) || 0 }
                        })}
                        className="flex-1 bg-transparent border-none text-center text-xs font-black text-stone-850 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setProfileData({
                          ...profileData,
                          macros: { ...profileData.macros, [m.key]: Math.min(500, (profileData.macros[m.key] || 0) + 5) }
                        })}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90 transition-transform"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        {/* Card 5: Tracking Tags */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-stone-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <Tag className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Tracking Tags</span>
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
              Toggle tags that the AI automatically applies to your meals based on ingredients or micro-nutrients. Click a tag to configure its AI rules.
            </p>

            {/* List of tags as tactile pill buttons */}
            <div className="flex flex-wrap gap-2 py-1.5">
              {currentTags.map((tag: any) => {
                const isSelected = selectedTagId === tag.id;
                return (
                  <div
                    key={tag.id}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all duration-150 cursor-pointer select-none active:scale-95 shadow-3xs",
                      tag.enabled
                        ? isSelected
                          ? "bg-stone-900 border-stone-900 text-white shadow-sm"
                          : "bg-emerald-50/80 border-emerald-300/80 text-emerald-950 hover:bg-emerald-100/80"
                        : "bg-stone-50/70 border-stone-200/80 text-stone-400 hover:border-stone-300 opacity-65 hover:opacity-100"
                    )}
                    onClick={() => handleToggleTag(tag.id)}
                    title={tag.enabled ? "Enabled — tap to disable" : "Disabled — tap to enable"}
                  >
                    {/* Glowing Green Dot Indicator */}
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full transition-all shrink-0",
                        tag.enabled
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                          : "bg-stone-300"
                      )}
                    />

                    <span>{tag.name}</span>

                    {/* Edit AI Rule Icon Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTagId(isSelected ? null : tag.id);
                      }}
                      className={cn(
                        "p-1 rounded-full transition-colors shrink-0 ml-0.5 border-none cursor-pointer flex items-center justify-center",
                        isSelected
                          ? "bg-white/20 text-white"
                          : tag.enabled
                          ? "text-emerald-700 hover:bg-emerald-200/60"
                          : "text-stone-400 hover:bg-stone-200/60"
                      )}
                      title="Edit AI rule"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>

                    {/* Delete Tag Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTag(tag.id);
                        if (isSelected) setSelectedTagId(null);
                      }}
                      className="p-0.5 rounded-full hover:bg-black/10 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer shrink-0"
                      title="Delete tag"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Selected Tag description rule editor */}
            {(() => {
              const activeSelectedTag = currentTags.find((t: any) => t.id === selectedTagId);
              if (!activeSelectedTag) return null;
              return (
                <div className="bg-stone-50 border border-stone-150 rounded-2xl p-3.5 space-y-2 mt-3 animate-fade-in text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">AI rule for {activeSelectedTag.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTagId(null)}
                      className="text-[9px] font-black text-stone-400 hover:text-stone-600 uppercase"
                    >
                      Close
                    </button>
                  </div>
                  <textarea
                    value={activeSelectedTag.description}
                    onChange={(e) => handleUpdateTagDesc(activeSelectedTag.id, e.target.value)}
                    rows={2}
                    placeholder="Describe guidelines for the AI..."
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 focus:outline-none focus:border-stone-400 placeholder:text-stone-300 resize-none leading-relaxed shadow-3xs"
                  />
                </div>
              );
            })()}

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
