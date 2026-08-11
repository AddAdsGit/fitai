import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Camera, 
  ChevronLeft, 
  Plus, 
  Minus, 
  ArrowRight, 
  Check,
  Target,
  Flame,
  ShieldCheck,
  Scale,
  Ruler,
  User,
  Heart,
  Activity
} from "lucide-react";

import { DefaultAvatar } from "./DefaultAvatar";
import { TERMS_AND_CONDITIONS } from "../constants/terms";
import { DEFAULT_TRACKED_NUTRIENTS } from "../constants/nutrition";
import { cn } from "../lib/utils";

interface BodyMetrics {
  name: string;
  username: string;
  avatar: string;
  gender: "Male" | "Female";
  age: number;
  height: number;
  weight: number;
  goal: "Lose Weight" | "Maintain Weight" | "Build Muscle";
  targetWeight: number;
  activityLevel: "Sedentary" | "Lightly Active" | "Moderately Active" | "Very Active";
  preferences: string[];
}

const DEFAULT_METRICS: BodyMetrics = {
  name: "",
  username: "",
  avatar: "",
  gender: "Male",
  age: 28,
  height: 175,
  weight: 70,
  goal: "Maintain Weight",
  targetWeight: 70,
  activityLevel: "Moderately Active",
  preferences: [],
};

const DIET_ALLERGY_OPTIONS = [
  { id: "High Protein", label: "🥩 High Protein" },
  { id: "Keto", label: "🥑 Keto" },
  { id: "Vegan", label: "🌱 Vegan" },
  { id: "Vegetarian", label: "🥦 Vegetarian" },
  { id: "Gluten Free", label: "🌾 Gluten Free" },
  { id: "Low Carb", label: "🍳 Low Carb" },
  { id: "Nut Allergy", label: "🥜 Nut Allergy" },
  { id: "Dairy Free", label: "🥛 Dairy Free" },
];

export const OnboardingWizard = ({
  activeProfileId,
  supabase,
  profileData,
  onComplete,
  triggerToast,
}: {
  activeProfileId: string;
  supabase: any;
  profileData: any;
  onComplete: (data: any) => void;
  triggerToast: (msg: string) => void;
}) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<number>(1);

  const [metrics, setMetrics] = useState<BodyMetrics>(() => {
    let initialAge = 28;
    if (profileData?.dob) {
      const birthDate = new Date(profileData.dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let ageVal = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          ageVal--;
        }
        initialAge = ageVal || 28;
      }
    }

    const defaultUsername = profileData?.username || (profileData?.email ? profileData.email.split('@')[0] : "");

    return {
      ...DEFAULT_METRICS,
      name: profileData?.name || profileData?.display_name || "",
      username: defaultUsername,
      avatar: profileData?.imageUrl || profileData?.image_url || "",
      age: initialAge,
      height: profileData?.height || 175,
      weight: profileData?.weight || 70,
      targetWeight: profileData?.weight_goal || profileData?.weight || 70,
    };
  });

  const [avatarPreview, setAvatarPreview] = useState(profileData?.imageUrl || profileData?.image_url || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Targets state (configured on Step 3)
  const [targets, setTargets] = useState({
    calories: 2000,
    protein: 150,
    carbs: 150,
    fats: 60,
    fiber: 30,
  });

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameError, setUsernameError] = useState("");

  // Auto-set username availability check
  useEffect(() => {
    const cleanUsername = metrics.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanUsername) {
      setUsernameStatus("idle");
      setUsernameError("");
      return;
    }

    setUsernameStatus("checking");
    setUsernameError("");

    const delayDebounce = setTimeout(async () => {
      try {
        const { data: duplicate, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .neq('id', activeProfileId)
          .maybeSingle();

        if (error) {
          console.error(error);
          setUsernameStatus("available");
          return;
        }

        if (duplicate) {
          setUsernameStatus("taken");
          setUsernameError("Username is taken");
        } else {
          setUsernameStatus("available");
        }
      } catch (err) {
        console.error(err);
        setUsernameStatus("available");
      }
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [metrics.username, activeProfileId]);

  // Sync initials from Google/supabase profile
  useEffect(() => {
    if (profileData?.imageUrl || profileData?.image_url) {
      const url = profileData.imageUrl || profileData.image_url;
      setAvatarPreview(url);
      setMetrics(prev => ({ ...prev, avatar: url }));
    }
    if (profileData?.name || profileData?.display_name) {
      setMetrics(prev => ({ ...prev, name: profileData.name || profileData.display_name }));
    }
    if (profileData?.username && !metrics.username) {
      setMetrics(prev => ({ ...prev, username: profileData.username }));
    }
  }, [profileData]);

  // Mifflin-St Jeor recommendation engine
  const calculateRecommendedTargets = (currentMetrics: BodyMetrics) => {
    if (currentMetrics.height <= 0 || currentMetrics.weight <= 0) {
      return { calories: 2000, protein: 150, carbs: 150, fats: 60, fiber: 30 };
    }

    const age = currentMetrics.age;
    let bmr = 0;
    
    if (currentMetrics.gender === "Male") {
      bmr = 10 * currentMetrics.weight + 6.25 * currentMetrics.height - 5 * age + 5;
    } else {
      bmr = 10 * currentMetrics.weight + 6.25 * currentMetrics.height - 5 * age - 161;
    }

    const activityMultipliers = {
      "Sedentary": 1.2,
      "Lightly Active": 1.375,
      "Moderately Active": 1.55,
      "Very Active": 1.725,
    };

    const multiplier = activityMultipliers[currentMetrics.activityLevel] || 1.55;
    const tdee = bmr * multiplier;

    let targetCalories = Math.round(tdee);
    if (currentMetrics.goal === "Lose Weight") {
      targetCalories = Math.round(tdee - 450);
      if (targetCalories < 1200) targetCalories = 1200;
    } else if (currentMetrics.goal === "Build Muscle") {
      targetCalories = Math.round(tdee + 300);
    }

    let proteinMultiplier = 1.8;
    if (currentMetrics.goal === "Lose Weight") {
      proteinMultiplier = 2.0;
    } else if (currentMetrics.goal === "Build Muscle") {
      proteinMultiplier = 2.2;
    }

    const proteinGrams = Math.round(currentMetrics.weight * proteinMultiplier);
    const fatGrams = Math.max(30, Math.round((targetCalories * 0.25) / 9));
    const remainingCalories = targetCalories - (proteinGrams * 4) - (fatGrams * 9);
    const carbGrams = Math.max(30, Math.round(remainingCalories / 4));
    const fiberGrams = currentMetrics.gender === "Male" ? 30 : 25;

    return {
      calories: targetCalories,
      protein: proteinGrams,
      carbs: carbGrams,
      fats: fatGrams,
      fiber: fiberGrams,
    };
  };

  // Recalculate targets when biometric parameters change
  useEffect(() => {
    const recommended = calculateRecommendedTargets(metrics);
    setTargets(recommended);
  }, [metrics.gender, metrics.age, metrics.height, metrics.weight, metrics.activityLevel, metrics.goal]);

  const handleNext = () => {
    if (step === 1) {
      if (!metrics.name.trim()) {
        triggerToast("⚠️ Please enter your name!");
        return;
      }
      if (!metrics.username.trim()) {
        triggerToast("⚠️ Please enter a username!");
        return;
      }
      if (usernameStatus === "taken") {
        triggerToast("⚠️ This username is already taken!");
        return;
      }
    }
    setDirection(1);
    setStep(prev => Math.min(totalSteps, prev + 1));
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(prev => Math.max(1, prev - 1));
  };

  const togglePreference = (prefId: string) => {
    setMetrics(prev => {
      const isSelected = prev.preferences.includes(prefId);
      const updated = isSelected
        ? prev.preferences.filter(p => p !== prefId)
        : [...prev.preferences, prefId];
      return { ...prev, preferences: updated };
    });
  };

  const handleTargetWeightChange = (newTargetWeight: number) => {
    let goal: "Lose Weight" | "Maintain Weight" | "Build Muscle" = "Maintain Weight";
    if (newTargetWeight < metrics.weight) {
      goal = "Lose Weight";
    } else if (newTargetWeight > metrics.weight) {
      goal = "Build Muscle";
    }

    const updatedMetrics = { ...metrics, goal, targetWeight: newTargetWeight };
    setMetrics(updatedMetrics);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const max = 250;
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
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setAvatarPreview(dataUrl);
          setMetrics(prev => ({ ...prev, avatar: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const generateAiBioSilently = async (p: number, c: number, f: number, cal: number): Promise<string> => {
    const goalText = metrics.goal === "Lose Weight" ? `lose weight (target: ${metrics.targetWeight}kg)` : metrics.goal === "Build Muscle" ? `build muscle (target: ${metrics.targetWeight}kg)` : "maintain weight";
    const dietPrefs = metrics.preferences.length > 0 ? metrics.preferences.join(", ") : "clean eating";
    const fallbackBio = `Focusing on ${goalText} with a target of ${cal} kcal & ${p}g protein daily! 💪`;

    try {
      const prompt = `Write a 1-sentence punchy personal self-note for a fitness user named ${metrics.name} whose goal is ${goalText} with ${cal} kcal & ${p}g protein. Output only the self-note without quotes.`;
      const { data } = await supabase.functions.invoke("gemini", { body: { prompt } });
      const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return generated || fallbackBio;
    } catch (_) {
      return fallbackBio;
    }
  };

  const saveProfileData = async () => {
    const cleanUsername = metrics.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanUsername) {
      throw new Error("Please enter a valid username!");
    }

    const silentBio = await generateAiBioSilently(
      targets.protein,
      targets.carbs,
      targets.fats,
      targets.calories
    );

    const updatedPrefs = [
      ...(metrics.preferences || []),
      "onboarded"
    ];

    const initialAgentConfig = {
      showGptWidget: true,
      generateImages: true,
      refinePhotos: false,
      artStyle: "gourmet",
      customArtStyle: "",
      requireConfirmation: true,
      trackWeight: true,
      trackWater: true,
      trackDigestion: true,
      trackEnergy: true,
      customInstructions: "Be a hyper-efficient fitness assistant. Minimize chit-chat. Keep replies extremely concise. Prefix macro estimations with ≈. Focus on accurate protein tracking and calorie targets."
    };

    const { error } = await supabase
      .from('profiles')
      .update({
        username: cleanUsername,
        display_name: metrics.name.trim(),
        image_url: metrics.avatar || null,
        height: metrics.height,
        weight: metrics.weight,
        dob: `${new Date().getFullYear() - metrics.age}-01-01`,
        gender: metrics.gender,
        description: silentBio,
        preferences: updatedPrefs,
        knowledge_preferences: metrics.preferences || [],
        agent_config: initialAgentConfig,
        daily_calories_goal: targets.calories,
        weight_goal: metrics.targetWeight,
        protein_goal: targets.protein,
        tracked_nutrients: DEFAULT_TRACKED_NUTRIENTS.map((n) => ({
          ...n,
          target: { protein: targets.protein, carbs: targets.carbs, fats: targets.fats, fiber: targets.fiber }[n.id] ?? n.target
        }))
      })
      .eq('id', activeProfileId);

    if (error) {
      throw error;
    }

    return {
      name: metrics.name.trim(),
      imageUrl: metrics.avatar || null,
      height: metrics.height,
      weight: metrics.weight,
      dob: `${new Date().getFullYear() - metrics.age}-01-01`,
      gender: metrics.gender,
      description: silentBio,
      preferences: updatedPrefs,
      knowledge: {
        preferences: metrics.preferences || [],
        health: [],
        notes: [],
        patterns: []
      },
      agent_memory: [],
      agent_config: initialAgentConfig,
      goals: {
        dailyCalories: targets.calories,
        weightGoal: metrics.targetWeight
      },
      macros: {
        protein: targets.protein,
        carbs: targets.carbs,
        fats: targets.fats,
        fiber: targets.fiber
      },
      tracked_nutrients: DEFAULT_TRACKED_NUTRIENTS.map((n) => ({
        ...n,
        target: { protein: targets.protein, carbs: targets.carbs, fats: targets.fats, fiber: targets.fiber }[n.id] ?? n.target
      }))
    };
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const completedState = await saveProfileData();
      onComplete(completedState);
      triggerToast("✨ Welcome to FitAI! Your plan is live.");
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "❌ Failed to save onboarding targets");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) {
      return metrics.name.trim() !== "" && metrics.username.trim() !== "" && usernameStatus !== "taken";
    }
    if (step === 2) {
      return metrics.height > 0 && metrics.weight > 0 && metrics.age > 0;
    }
    if (step === 3) {
      return metrics.targetWeight > 0 && targets.calories > 0;
    }
    if (step === 4) {
      return disclaimerAgreed;
    }
    return true;
  };

  const totalSteps = 4;
  const progressPercent = (step / totalSteps) * 100;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-orange-950 font-sans selection:bg-orange-100 p-4 sm:p-6 max-w-md mx-auto relative shadow-2xl flex flex-col justify-between">
      
      {/* Brand Progress Header */}
      <div className="w-full flex items-center justify-between gap-4 py-3 border-b border-orange-200/40">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80 hover:bg-white text-orange-900 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer border border-orange-100 shadow-2xs active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex-1 h-2.5 bg-orange-100/60 rounded-full overflow-hidden relative border border-orange-200/30">
          <motion.div
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
          />
        </div>
        
        <span className="text-[10px] font-black text-orange-950/50 uppercase tracking-widest shrink-0 font-mono">
          {step}/{totalSteps}
        </span>
      </div>

      {/* Steps Content Area with Smooth Slide Transitions */}
      <div className="flex-1 flex flex-col justify-center py-4 relative min-h-[480px]">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full"
          >
            {/* STEP 1: IDENTITY & PREFERENCES */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 shadow-lg shadow-orange-200 flex items-center justify-center mb-1">
                    <Sparkles className="text-white w-6 h-6 fill-white" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-orange-950">
                    Welcome to FitAI
                  </h2>
                  <p className="text-xs font-bold text-orange-900/60 font-sans">
                    Let's personalize your intelligent nutrition assistant
                  </p>
                </div>

                {/* Glassmorphic Photo Selector */}
                <div className="flex flex-col items-center gap-2 py-1">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl shadow-orange-100/50 flex items-center justify-center bg-orange-100/50">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <DefaultAvatar />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full border-2 border-white flex items-center justify-center cursor-pointer shadow-md active:scale-95 transition-all">
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                  <span className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest">
                    Choose Profile Photo
                  </span>
                </div>

                {/* Name & Username Inputs */}
                <div className="space-y-3.5 bg-white/70 backdrop-blur-md rounded-[28px] p-4.5 border border-white/80 shadow-xl shadow-orange-100/20">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-orange-950/50 uppercase tracking-widest block px-1">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 w-4 h-4 text-orange-400" />
                      <input
                        type="text"
                        placeholder="Alex Morgan"
                        value={metrics.name}
                        onChange={(e) => setMetrics(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-orange-50/30 border border-orange-200/60 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-orange-950 placeholder-orange-900/30 focus:outline-none focus:border-orange-500 focus:bg-white shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-orange-950/50 uppercase tracking-widest block px-1">
                      Username
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs font-black text-orange-400">@</span>
                      <input
                        type="text"
                        placeholder="alex_fit"
                        value={metrics.username}
                        onChange={(e) => {
                          const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                          setMetrics(prev => ({ ...prev, username: cleaned }));
                        }}
                        className="w-full bg-orange-50/30 border border-orange-200/60 rounded-2xl pl-8 pr-10 py-3 text-xs font-bold text-orange-950 placeholder-orange-900/30 focus:outline-none focus:border-orange-500 focus:bg-white shadow-2xs transition-all"
                      />
                      {usernameStatus === "checking" && (
                        <div className="absolute right-3.5 w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      )}
                      {usernameStatus === "available" && (
                        <Check className="absolute right-3.5 w-4 h-4 text-emerald-600 font-bold" />
                      )}
                    </div>
                    {usernameStatus === "available" && (
                      <p className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider px-1 pt-0.5">✨ Username available!</p>
                    )}
                    {usernameStatus === "taken" && (
                      <p className="text-[9px] text-rose-500 font-extrabold uppercase tracking-wider px-1 pt-0.5">⚠️ This username is already taken.</p>
                    )}
                  </div>
                </div>

                {/* Dietary Tags */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-orange-950/50 uppercase tracking-widest block px-1">
                    Dietary Preferences & Allergies
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DIET_ALLERGY_OPTIONS.map((opt) => {
                      const isSelected = metrics.preferences.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => togglePreference(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95",
                            isSelected
                              ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200"
                              : "bg-white/80 text-orange-950 border-orange-200/60 hover:bg-orange-50"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: BODY METRICS & ACTIVITY */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black tracking-tight text-orange-950">
                    Your Biological Baseline
                  </h2>
                  <p className="text-xs font-bold text-orange-900/60 font-sans">
                    Used to calculate your precise baseline TDEE
                  </p>
                </div>

                {/* Sex Segmented Control */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-orange-950/50 uppercase tracking-widest block px-1">
                    Biological Sex
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 shadow-sm">
                    {(["Male", "Female"] as const).map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setMetrics(prev => ({ ...prev, gender }))}
                        className={cn(
                          "py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                          metrics.gender === gender
                            ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                            : "text-orange-950/60 hover:text-orange-950"
                        )}
                      >
                        {gender === "Male" ? "🙋‍♂️ Male" : "🙋‍♀️ Female"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Height, Weight & Age Card */}
                <div className="bg-white/70 backdrop-blur-md rounded-[28px] p-5 border border-white/80 shadow-xl shadow-orange-100/20 space-y-4">
                  {/* Age Stepper */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-orange-950 flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-orange-500" />
                      Age
                    </span>
                    <div className="flex items-center gap-2 bg-orange-50/50 rounded-xl p-1 border border-orange-200/40">
                      <button
                        type="button"
                        onClick={() => setMetrics(prev => ({ ...prev, age: Math.max(12, prev.age - 1) }))}
                        className="w-7 h-7 rounded-lg bg-white text-orange-950 flex items-center justify-center shadow-2xs hover:bg-orange-100 active:scale-90 transition-all border-none cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black text-orange-950 font-mono w-10 text-center">{metrics.age} yrs</span>
                      <button
                        type="button"
                        onClick={() => setMetrics(prev => ({ ...prev, age: Math.min(100, prev.age + 1) }))}
                        className="w-7 h-7 rounded-lg bg-white text-orange-950 flex items-center justify-center shadow-2xs hover:bg-orange-100 active:scale-90 transition-all border-none cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Height Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs font-black text-orange-950">
                      <span className="flex items-center gap-1.5">
                        <Ruler className="w-4 h-4 text-sky-500" />
                        Height
                      </span>
                      <span className="font-mono text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200/50">
                        {metrics.height} cm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={120}
                      max={220}
                      value={metrics.height}
                      onChange={(e) => setMetrics(prev => ({ ...prev, height: parseInt(e.target.value) || 175 }))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                    <div className="flex justify-between gap-1 pt-0.5">
                      {[160, 170, 175, 180, 185].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMetrics(prev => ({ ...prev, height: val }))}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold font-mono transition-all border cursor-pointer",
                            metrics.height === val ? "bg-sky-500 text-white border-sky-500" : "bg-white text-orange-900/60 border-orange-100 hover:bg-orange-50"
                          )}
                        >
                          {val}cm
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Weight Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs font-black text-orange-950">
                      <span className="flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-orange-500" />
                        Current Weight
                      </span>
                      <span className="font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200/50">
                        {metrics.weight} kg
                      </span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={180}
                      value={metrics.weight}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 70;
                        setMetrics(prev => ({ ...prev, weight: val, targetWeight: prev.targetWeight === prev.weight ? val : prev.targetWeight }));
                      }}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                    <div className="flex justify-between gap-1 pt-0.5">
                      {[60, 70, 75, 80, 90].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMetrics(prev => ({ ...prev, weight: val }))}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold font-mono transition-all border cursor-pointer",
                            metrics.weight === val ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-900/60 border-orange-100 hover:bg-orange-50"
                          )}
                        >
                          {val}kg
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Activity Level Grid */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-orange-950/50 uppercase tracking-widest block px-1">
                    Daily Activity Level
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: "Sedentary", label: "🟢 Sedentary", desc: "Desk job, low movement" },
                      { id: "Lightly Active", label: "🟡 Lightly Active", desc: "Light exercise 1-3 days" },
                      { id: "Moderately Active", label: "🟠 Moderately Active", desc: "Moderate workout 3-5 days" },
                      { id: "Very Active", label: "🔴 Very Active", desc: "Heavy exercise 6-7 days" },
                    ].map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setMetrics(prev => ({ ...prev, activityLevel: act.id as any }))}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-95 flex flex-col justify-between space-y-1",
                          metrics.activityLevel === act.id
                            ? "bg-white border-orange-500 shadow-md shadow-orange-100 ring-2 ring-orange-500/20"
                            : "bg-white/60 border-orange-100 hover:bg-white"
                        )}
                      >
                        <div className="text-xs font-black text-orange-950">{act.label}</div>
                        <div className="text-[9px] font-bold text-orange-900/50">{act.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: GOALS & DYNAMIC MACRO ENGINE */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black tracking-tight text-orange-950">
                    Your Goal & Targets
                  </h2>
                  <p className="text-xs font-bold text-orange-900/60 font-sans">
                    Calculated using Mifflin-St Jeor metabolic model
                  </p>
                </div>

                {/* Primary Goal Selection Cards */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "Lose Weight", label: "📉 Fat Loss", icon: "🔥" },
                    { id: "Maintain Weight", label: "⚖️ Maintain", icon: "✨" },
                    { id: "Build Muscle", label: "💪 Muscle Gain", icon: "⚡" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        const updated = { ...metrics, goal: g.id as any };
                        setMetrics(updated);
                        setTargets(calculateRecommendedTargets(updated));
                      }}
                      className={cn(
                        "p-3 rounded-2xl border text-center transition-all cursor-pointer active:scale-95 space-y-1",
                        metrics.goal === g.id
                          ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200"
                          : "bg-white/80 text-orange-950 border-orange-100 hover:bg-white"
                      )}
                    >
                      <div className="text-lg">{g.icon}</div>
                      <div className="text-[10px] font-black uppercase tracking-tight">{g.label}</div>
                    </button>
                  ))}
                </div>

                {/* Target Weight Card */}
                <div className="bg-white/70 backdrop-blur-md rounded-[28px] p-4 border border-white/80 shadow-xl shadow-orange-100/20 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-black text-orange-950/50 uppercase tracking-widest">
                      Goal Target Weight
                    </div>
                    <div className="text-xl font-black text-orange-950">
                      {metrics.targetWeight} <span className="text-xs font-bold text-orange-900/40">kg</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-orange-50/50 rounded-xl p-1 border border-orange-200/40">
                    <button
                      type="button"
                      onClick={() => handleTargetWeightChange(Math.max(35, metrics.targetWeight - 1))}
                      className="w-8 h-8 rounded-lg bg-white text-orange-950 flex items-center justify-center shadow-2xs hover:bg-orange-100 active:scale-90 transition-all border-none cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-black text-orange-950 font-mono w-12 text-center">{metrics.targetWeight} kg</span>
                    <button
                      type="button"
                      onClick={() => handleTargetWeightChange(Math.min(200, metrics.targetWeight + 1))}
                      className="w-8 h-8 rounded-lg bg-white text-orange-950 flex items-center justify-center shadow-2xs hover:bg-orange-100 active:scale-90 transition-all border-none cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Calorie & Macro Target Grid */}
                <div className="bg-white/70 backdrop-blur-md rounded-[28px] p-5 border border-white/80 shadow-xl shadow-orange-100/20 space-y-4">
                  {/* Calorie Banner */}
                  <div className="flex justify-between items-center bg-orange-50/80 p-3.5 rounded-2xl border border-orange-200/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                        <Flame className="w-4 h-4 fill-white" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-orange-950/60">Daily Target</div>
                        <div className="text-lg font-black text-orange-950 font-mono">{targets.calories} kcal</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTargets(prev => ({ ...prev, calories: Math.max(1000, prev.calories - 50) }))}
                        className="w-7 h-7 rounded-lg bg-white text-orange-950 flex items-center justify-center shadow-2xs hover:bg-orange-100 border-none cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargets(prev => ({ ...prev, calories: Math.min(8000, prev.calories + 50) }))}
                        className="w-7 h-7 rounded-lg bg-white text-orange-950 flex items-center justify-center shadow-2xs hover:bg-orange-100 border-none cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* 4 Macro Cards */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "Protein", key: "protein", color: "#F97316", unit: "g" },
                      { label: "Carbs", key: "carbs", color: "#38BDF8", unit: "g" },
                      { label: "Fats", key: "fats", color: "#FBBF24", unit: "g" },
                      { label: "Fiber", key: "fiber", color: "#34D399", unit: "g" },
                    ].map((m) => (
                      <div key={m.key} className="bg-white/90 rounded-2xl p-3 border border-orange-100/60 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-orange-950">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                            {m.label}
                          </span>
                          <span className="text-xs font-black font-mono" style={{ color: m.color }}>
                            {targets[m.key as keyof typeof targets]}g
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-orange-50/30 rounded-xl px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => setTargets(prev => ({ ...prev, [m.key]: Math.max(5, prev[m.key as keyof typeof targets] - 5) }))}
                            className="w-6 h-6 rounded-md bg-white text-orange-950 flex items-center justify-center shadow-2xs border-none cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-bold text-orange-950/60 font-mono">
                            {targets[m.key as keyof typeof targets]}g
                          </span>
                          <button
                            type="button"
                            onClick={() => setTargets(prev => ({ ...prev, [m.key]: Math.min(400, prev[m.key as keyof typeof targets] + 5) }))}
                            className="w-6 h-6 rounded-md bg-white text-orange-950 flex items-center justify-center shadow-2xs border-none cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: PLAN SUMMARY & INSTANT LAUNCH */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-200 flex items-center justify-center mx-auto mb-1">
                    <ShieldCheck className="text-white w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-orange-950">
                    Your Plan is Ready! 🎉
                  </h2>
                  <p className="text-xs font-bold text-orange-900/60 font-sans">
                    Review your personalized setup before launching FitAI
                  </p>
                </div>

                {/* Plan Summary Hero Card */}
                <div className="bg-white/80 backdrop-blur-md rounded-[28px] p-5 border border-white/80 shadow-xl shadow-orange-100/20 space-y-4">
                  <div className="flex items-center gap-3 border-b border-orange-100 pb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-300 shrink-0">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <DefaultAvatar />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-950">{metrics.name}</div>
                      <div className="text-xs font-bold text-orange-600 font-mono">@{metrics.username}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100/60">
                      <div className="text-[10px] font-black uppercase text-orange-950/50">Daily Calories</div>
                      <div className="text-base font-black text-orange-950 font-mono mt-0.5">{targets.calories} kcal</div>
                    </div>
                    <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100/60">
                      <div className="text-[10px] font-black uppercase text-orange-950/50">Protein Goal</div>
                      <div className="text-base font-black text-orange-600 font-mono mt-0.5">{targets.protein}g / day</div>
                    </div>
                    <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100/60">
                      <div className="text-[10px] font-black uppercase text-orange-950/50">Target Weight</div>
                      <div className="text-base font-black text-orange-950 font-mono mt-0.5">{metrics.targetWeight} kg</div>
                    </div>
                    <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100/60">
                      <div className="text-[10px] font-black uppercase text-orange-950/50">Primary Goal</div>
                      <div className="text-xs font-black text-emerald-600 mt-1">{metrics.goal}</div>
                    </div>
                  </div>
                </div>

                {/* Minimalist Agreement Checkbox */}
                <div className="bg-white/60 rounded-2xl p-4 border border-orange-100/80 shadow-2xs space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={disclaimerAgreed}
                      onChange={(e) => setDisclaimerAgreed(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-500 focus:ring-orange-200 cursor-pointer border-orange-300 mt-0.5 accent-orange-500"
                    />
                    <span className="text-xs text-orange-950 font-bold leading-relaxed">
                      I agree to the FitAI Terms of Service and Privacy Policy.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-[10px] font-black text-orange-600 hover:underline uppercase tracking-wider pl-7 cursor-pointer border-none bg-transparent"
                  >
                    View Terms & Conditions ↗
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="w-full pt-4 border-t border-orange-200/40">
        <button
          type="button"
          onClick={step === totalSteps ? handleFinish : handleNext}
          disabled={!isStepValid() || isSubmitting}
          className={cn(
            "w-full text-xs font-black uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none shadow-xl",
            step === totalSteps
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 active:scale-[0.98]"
              : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200 active:scale-[0.98]",
            (!isStepValid() || isSubmitting) && "opacity-50 cursor-not-allowed shadow-none"
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Launching...</span>
            </div>
          ) : (
            <>
              <span>{step === totalSteps ? "🚀 Start My Fitness Journey" : "Continue"}</span>
              {step < totalSteps && <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>

      {/* TERMS MODAL POPUP */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[32px] p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-orange-950">FitAI Terms & Conditions</h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-8 h-8 rounded-full bg-orange-50 text-orange-900 flex items-center justify-center font-bold border-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-orange-900/80 font-medium">
              {TERMS_AND_CONDITIONS.map((section, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="font-black text-orange-950 uppercase text-[10px] tracking-wider">{section.title}</div>
                  <p>{section.content}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setDisclaimerAgreed(true);
                setShowTermsModal(false);
              }}
              className="w-full bg-orange-500 text-white font-black py-3 rounded-2xl cursor-pointer border-none"
            >
              I Agree & Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
