import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Camera, 
  ChevronLeft, 
  Plus, 
  Minus, 
  ArrowRight,
  Flame,
  Scale,
  Ruler,
  Heart
} from "lucide-react";

import { DefaultAvatar } from "./DefaultAvatar";
import { TERMS_AND_CONDITIONS } from "../constants/terms";
import { DEFAULT_TRACKED_NUTRIENTS } from "../constants/nutrition";

interface BodyMetrics {
  name: string;
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
  { id: "Keto", label: "🥑 Keto" },
  { id: "Vegan", label: "🌱 Vegan" },
  { id: "Vegetarian", label: "🥦 Vegetarian" },
  { id: "Gluten Free", label: "🌾 Gluten Free" },
  { id: "Low Carb", label: "🥩 Low Carb" },
  { id: "Balanced", label: "🍎 Balanced" },
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
    return {
      ...DEFAULT_METRICS,
      name: profileData?.name || profileData?.display_name || "",
      avatar: profileData?.imageUrl || profileData?.image_url || "",
      age: initialAge,
      height: profileData?.height || 175,
      weight: profileData?.weight || 70,
      targetWeight: profileData?.weight_goal || profileData?.weight || 70,
    };
  });
  const [avatarPreview, setAvatarPreview] = useState(profileData?.imageUrl || profileData?.image_url || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Targets state (configured on Step 3)
  const [targets, setTargets] = useState({
    calories: 2000,
    protein: 150,
    carbs: 150,
    fats: 60,
    fiber: 30,
  });

  const [showAdvancedMacros, setShowAdvancedMacros] = useState(false);

  const isStepValid = () => {
    if (step === 1) {
      return metrics.name.trim() !== "";
    }
    if (step === 2) {
      return (
        metrics.height > 0 &&
        metrics.weight > 0 &&
        metrics.age > 0
      );
    }
    if (step === 3) {
      return (
        metrics.targetWeight > 0 &&
        targets.calories > 0
      );
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!metrics.name.trim()) {
        triggerToast("⚠️ Please enter your name to continue!");
        return;
      }
    }
    setStep(prev => Math.min(totalSteps, prev + 1));
  };

  const handleBack = () => {
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
  }, [profileData]);

  // Perform Mifflin-St Jeor calculation (used ONCE for default baseline recommendations)
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

  // Initialize targets once when biological metrics are completed
  useEffect(() => {
    const recommended = calculateRecommendedTargets(metrics);
    setTargets(recommended);
  }, [metrics.gender, metrics.age, metrics.height, metrics.weight]);

  // NO dynamic recalculation when editing weight/height/target weight — static & user controllable
  const handleCurrentWeightChange = (newWeight: number) => {
    setMetrics(prev => ({ ...prev, weight: newWeight }));
  };

  const handleTargetWeightChange = (newTargetWeight: number) => {
    setMetrics(prev => ({ ...prev, targetWeight: newTargetWeight }));
  };

  const handleActivityLevelChange = (activityLevel: "Sedentary" | "Lightly Active" | "Moderately Active" | "Very Active") => {
    setMetrics(prev => ({ ...prev, activityLevel }));
  };

  const handleCaloriesChange = (newCalories: number) => {
    setTargets(prev => ({
      ...prev,
      calories: newCalories
    }));
  };

  const handleMacroChange = (key: "protein" | "carbs" | "fats" | "fiber", val: number) => {
    setTargets(prev => ({
      ...prev,
      [key]: val
    }));
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
          setAvatarPreview(dataUrl);
          setMetrics(prev => ({ ...prev, avatar: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const generateAiBioSilently = async (p: number, c: number, f: number, cal: number, fib: number): Promise<string> => {
    const goalText = metrics.goal === "Lose Weight" ? `lose weight (target: ${metrics.targetWeight}kg)` : metrics.goal === "Build Muscle" ? `build muscle (target: ${metrics.targetWeight}kg)` : "maintain weight";
    const dietPrefs = metrics.preferences.length > 0 ? metrics.preferences.join(", ") : "no specific food restrictions";
    
    const fallbackBio = `Focusing on ${goalText} with a target of ${cal} kcal & ${p}g protein daily! 💪`;

    try {
      const prompt = `Write a 1-sentence personal self-note for ${metrics.name} focusing on ${goalText} with ${cal} kcal & ${p}g protein. Output only the self-note without quotes.`;

      const { data, error } = await supabase.functions.invoke("gemini", {
        body: { prompt }
      });
      if (error) return fallbackBio;

      const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return generated || fallbackBio;
    } catch (err) {
      return fallbackBio;
    }
  };

  const saveProfileData = async () => {
    const cleanUsername = (metrics.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "user") + "_" + Math.random().toString(36).substring(7);

    const goalText = metrics.goal === "Lose Weight" ? `lose weight (target: ${metrics.targetWeight}kg)` : metrics.goal === "Build Muscle" ? `build muscle (target: ${metrics.targetWeight}kg)` : "maintain weight";
    const silentBio = `Focusing on ${goalText} with a target of ${targets.calories} kcal & ${targets.protein}g protein daily! 💪`;

    // Fire AI bio enhancement in background asynchronously
    generateAiBioSilently(
      targets.protein,
      targets.carbs,
      targets.fats,
      targets.calories,
      targets.fiber
    ).then((aiBio) => {
      if (aiBio && aiBio !== silentBio) {
        supabase.from('profiles').update({ description: aiBio }).eq('id', activeProfileId).then();
      }
    }).catch(() => {});

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
        knowledge_health: [],
        knowledge_notes: [],
        knowledge_patterns: [],
        agent_memory: [],
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
      triggerToast("✨ Welcome to FitAI! Setup complete.");
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "❌ Failed to save onboarding targets");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSteps = 3;
  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-6 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
      
      {/* Header Progress */}
      <div className="w-full flex items-center justify-between gap-4 py-2 border-b border-stone-200/50">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-600 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-none"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex-1 h-2 bg-stone-200/80 rounded-full overflow-hidden relative">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-300"
          />
        </div>
        
        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest shrink-0">
          Step {step} of {totalSteps}
        </span>
      </div>

      {/* Steps Content */}
      <div className="flex-1 flex flex-col justify-center py-4">
        
        {/* STEP 1: YOUR PROFILE */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 shadow-xl shadow-orange-200 flex items-center justify-center">
                <Sparkles className="text-white w-6 h-6 fill-white" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-stone-900 mt-1">
                Your Profile
              </h2>
            </div>

            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-stone-200 shadow-inner flex items-center justify-center bg-stone-100">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <DefaultAvatar />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-stone-900 text-white rounded-full border-2 border-white flex items-center justify-center cursor-pointer shadow-md hover:bg-stone-800 active:scale-95 transition-all">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                Choose profile photo
              </span>
            </div>

            {/* Name input */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Full Name (e.g. Alex Doe)"
                value={metrics.name}
                onChange={(e) => setMetrics(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
              />
            </div>

            {/* Clean Terms Reference Link */}
            <p className="text-[9px] font-medium text-stone-400 text-center pt-2">
              By continuing, you agree to FitAI's{" "}
              <button type="button" onClick={() => setShowTermsModal(true)} className="font-bold text-orange-500 hover:underline cursor-pointer border-none bg-transparent">
                Terms of Service & Privacy Policy
              </button>
            </p>
          </div>
        )}

        {/* STEP 2: BODY MEASUREMENTS */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center space-y-0.5">
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                Body Measurements
              </h2>
            </div>

            {/* Sex selection */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Biological Sex
              </label>
              <div className="grid grid-cols-2 gap-4">
                {(["Male", "Female"] as const).map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => setMetrics(prev => ({ ...prev, gender }))}
                    className={`py-3 px-4 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                      metrics.gender === gender
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-100"
                        : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
                    }`}
                  >
                    {gender === "Male" ? "Male" : "Female"}
                  </button>
                ))}
              </div>
            </div>

            {/* Age stepper + Typable numeric input */}
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Age (years)
              </label>
              <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setMetrics(prev => ({ ...prev, age: Math.max(10, prev.age - 1) }))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  <input
                    type="number"
                    value={metrics.age}
                    onChange={(e) => setMetrics(prev => ({ ...prev, age: parseInt(e.target.value) || 28 }))}
                    className="bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">Yrs Old</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMetrics(prev => ({ ...prev, age: Math.min(120, prev.age + 1) }))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Height/Weight steppers + Typable inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                  Height (cm)
                </label>
                <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setMetrics(prev => ({ ...prev, height: Math.max(100, prev.height - 1) }))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={metrics.height}
                    onChange={(e) => setMetrics(prev => ({ ...prev, height: parseInt(e.target.value) || 170 }))}
                    className="flex-1 bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMetrics(prev => ({ ...prev, height: Math.min(250, prev.height + 1) }))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                  Weight (kg)
                </label>
                <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleCurrentWeightChange(Math.max(30, metrics.weight - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={metrics.weight}
                    onChange={(e) => handleCurrentWeightChange(parseFloat(e.target.value) || 70)}
                    className="flex-1 bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCurrentWeightChange(Math.min(300, metrics.weight + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DAILY TARGETS */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn overflow-y-auto max-h-[70vh] pr-1 scrollbar-hide py-1">
            <div className="text-center space-y-0.5">
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                Daily Targets
              </h2>
            </div>

            {/* Primary Goal Selector (Pure Typography) */}
            <div className="space-y-1">
              <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest block px-0.5">
                Primary Goal
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "Lose Weight", label: "Fat Loss" },
                  { id: "Maintain Weight", label: "Maintain" },
                  { id: "Build Muscle", label: "Muscle Gain" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      const updatedMetrics = { ...metrics, goal: g.id as any };
                      setMetrics(updatedMetrics);
                      const rec = calculateRecommendedTargets(updatedMetrics);
                      setTargets(rec);
                    }}
                    className={`py-2.5 px-2 rounded-2xl border text-center text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                      metrics.goal === g.id
                        ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-100"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Weight (kg) */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Target Weight (kg)
              </label>
              <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleTargetWeightChange(Math.max(35, metrics.targetWeight - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  <input
                    type="number"
                    value={metrics.targetWeight}
                    onChange={(e) => handleTargetWeightChange(parseFloat(e.target.value) || 70)}
                    className="bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">kg</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTargetWeightChange(Math.min(250, metrics.targetWeight + 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Daily Calories Target (kcal) */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Daily Calories Target (kcal)
              </label>
              <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleCaloriesChange(Math.max(800, targets.calories - 50))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  <input
                    type="number"
                    value={targets.calories}
                    onChange={(e) => handleCaloriesChange(parseInt(e.target.value) || 0)}
                    className="bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">kcal</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCaloriesChange(Math.min(10000, targets.calories + 50))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

              {/* Collapsible advanced macro panel toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancedMacros(!showAdvancedMacros)}
                className="w-full flex items-center justify-between py-3 px-4 bg-stone-100 hover:bg-stone-200/85 rounded-2xl text-stone-700 text-[10px] font-black uppercase tracking-wider border-none cursor-pointer transition-colors shadow-2xs select-none mt-2 active:scale-[0.99]"
              >
                <span>{showAdvancedMacros ? "Hide Macro Splits" : "Adjust Macro Split"}</span>
                <span className="text-[10px] font-black">{showAdvancedMacros ? "▲" : "▼"}</span>
              </button>

              {showAdvancedMacros && (
                <div className="grid grid-cols-2 gap-3 animate-fadeIn mt-2">
                  {[
                    { label: "Protein (g)", key: "protein", color: "border-orange-200 text-orange-600 bg-orange-50/15" },
                    { label: "Carbs (g)", key: "carbs", color: "border-[#90E0EF] text-[#0077B6] bg-[#CAF0F8]/10" },
                    { label: "Fats (g)", key: "fats", color: "border-yellow-200 text-yellow-600 bg-yellow-50/15" },
                    { label: "Fiber (g)", key: "fiber", color: "border-emerald-200 text-emerald-700 bg-emerald-50/10" },
                  ].map((m) => (
                    <div key={m.label} className={`border rounded-2xl p-3 flex flex-col justify-between shadow-2xs ${m.color}`}>
                      <span className="text-[9px] font-black uppercase tracking-wider opacity-90">{m.label}</span>
                      <div className="flex items-center justify-between mt-2.5 gap-1 bg-white/95 border border-black/[0.04] rounded-xl px-1.5 py-0.5">
                        <button
                          type="button"
                          onClick={() => handleMacroChange(m.key as any, Math.max(0, targets[m.key as keyof typeof targets] - 5))}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90 transition-transform"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={targets[m.key as keyof typeof targets]}
                          onChange={(e) => handleMacroChange(m.key as any, parseInt(e.target.value) || 0)}
                          className="flex-1 bg-transparent border-none text-center text-xs font-black text-stone-850 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleMacroChange(m.key as any, Math.min(500, targets[m.key as keyof typeof targets] + 5))}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90 transition-transform"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

      </div>

      {/* Navigation Footer */}
      {step <= totalSteps && (
        <div className="w-full pt-4 border-t border-stone-200/50 flex gap-4">
          <button
            type="button"
            onClick={step === totalSteps ? handleFinish : handleNext}
            disabled={!isStepValid() || isSubmitting}
            className={`w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
              (!isStepValid() || isSubmitting) ? "opacity-50 cursor-not-allowed shadow-none" : "shadow-lg shadow-orange-100 active:scale-[0.98]"
            }`}
          >
            <span>{step === totalSteps ? "🚀 Launch FitAI" : "Continue"}</span>
            {step < totalSteps && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* TERMS MODAL POPUP */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[32px] p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-stone-900">FitAI Terms & Conditions</h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold border-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-stone-600 font-medium">
              {TERMS_AND_CONDITIONS.map((section, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="font-black text-stone-900 uppercase text-[10px] tracking-wider">{section.title}</div>
                  <p>{section.content}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-full bg-orange-500 text-white font-black py-3 rounded-2xl cursor-pointer border-none"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
