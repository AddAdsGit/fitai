import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Camera, 
  ChevronLeft, 
  Plus, 
  Minus, 
  Bot, 
  ArrowRight, 
  HelpCircle,
  ExternalLink,
  BookOpen
} from "lucide-react";

import { DefaultAvatar } from "./DefaultAvatar";
import { ChatGPTIcon } from "./ChatGPTIcon";

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
  height: 0,
  weight: 0,
  goal: "Maintain Weight",
  targetWeight: 0,
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
  { id: "Shellfish Allergy", label: "🦐 Shellfish Allergy" },
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
      name: profileData?.name || "",
      avatar: profileData?.imageUrl || "",
      age: initialAge,
      height: profileData?.height || 175,
      weight: profileData?.weight || 70,
      targetWeight: profileData?.weight_goal || 65,
    };
  });
  const [avatarPreview, setAvatarPreview] = useState(profileData?.imageUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom GPT page preference toggles
  const [enableGptWidget, setEnableGptWidget] = useState(true);
  const [requireGptConfirmation, setRequireGptConfirmation] = useState(true);

  // Targets state (configured on Step 3)
  const [targets, setTargets] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
  });

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameError, setUsernameError] = useState("");

  // Debounced Supabase validation check for username availability
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
          setUsernameStatus("idle");
          return;
        }

        if (duplicate) {
          setUsernameStatus("taken");
          setUsernameError("This username is already taken!");
        } else {
          setUsernameStatus("available");
        }
      } catch (err) {
        console.error(err);
        setUsernameStatus("idle");
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounce);
  }, [metrics.username, activeProfileId]);

  const isStepValid = () => {
    if (step === 1) {
      return (
        metrics.name.trim() !== "" &&
        metrics.username.trim() !== "" &&
        usernameStatus === "available"
      );
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
      if (!metrics.username.trim()) {
        triggerToast("⚠️ Please choose a username to continue!");
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
    if (profileData?.imageUrl) {
      setAvatarPreview(profileData.imageUrl);
      setMetrics(prev => ({ ...prev, avatar: profileData.imageUrl }));
    }
    if (profileData?.name) {
      setMetrics(prev => ({ ...prev, name: profileData.name }));
    }
    if (profileData?.username) {
      setMetrics(prev => ({ ...prev, username: profileData.username }));
    }
  }, [profileData]);

  // Perform Mifflin-St Jeor calculation (used for default recommendations)
  const calculateRecommendedTargets = (currentMetrics: BodyMetrics) => {
    if (currentMetrics.height <= 0 || currentMetrics.weight <= 0) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
      };
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

    const multiplier = activityMultipliers[currentMetrics.activityLevel] || 1.2;
    const tdee = bmr * multiplier;

    let targetCalories = Math.round(tdee);
    if (currentMetrics.goal === "Lose Weight") {
      targetCalories = Math.round(tdee - 500);
      if (targetCalories < 1200) targetCalories = 1200;
    } else if (currentMetrics.goal === "Build Muscle") {
      targetCalories = Math.round(tdee + 300);
    }

    let proteinMultiplier = 1.8;
    if (currentMetrics.goal === "Lose Weight") {
      proteinMultiplier = 2.0; // Higher protein to preserve lean muscle in deficit
    } else if (currentMetrics.goal === "Build Muscle") {
      proteinMultiplier = 2.2; // Extra protein to support muscle synthesis
    } else {
      proteinMultiplier = 1.8; // Maintenance protein
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

  // HIERARCHICAL REACTION HANDLERS:

  // 1. Current weight change handler (synchronizes targetWeight & goal if they match)
  const handleCurrentWeightChange = (newWeight: number) => {
    let goal: "Lose Weight" | "Maintain Weight" | "Build Muscle" = "Maintain Weight";
    let newTargetWeight = metrics.targetWeight;
    
    if (metrics.targetWeight === metrics.weight) {
      newTargetWeight = newWeight;
    }

    if (newTargetWeight < newWeight) {
      goal = "Lose Weight";
    } else if (newTargetWeight > newWeight) {
      goal = "Build Muscle";
    }

    const updatedMetrics = { ...metrics, weight: newWeight, targetWeight: newTargetWeight, goal };
    setMetrics(updatedMetrics);

    const recommended = calculateRecommendedTargets(updatedMetrics);
    setTargets(recommended);
  };

  // 2. Target weight change: Automatically determines goal under-the-hood and recalculates baseline targets
  const handleTargetWeightChange = (newTargetWeight: number) => {
    let goal: "Lose Weight" | "Maintain Weight" | "Build Muscle" = "Maintain Weight";
    if (newTargetWeight < metrics.weight) {
      goal = "Lose Weight";
    } else if (newTargetWeight > metrics.weight) {
      goal = "Build Muscle";
    }

    const updatedMetrics = { ...metrics, goal, targetWeight: newTargetWeight };
    setMetrics(updatedMetrics);

    const recommended = calculateRecommendedTargets(updatedMetrics);
    setTargets(recommended);
  };

  // 3. Activity Level change: Updates baseline calories and balances macros
  const handleActivityLevelChange = (activityLevel: "Sedentary" | "Lightly Active" | "Moderately Active" | "Very Active") => {
    const updatedMetrics = { ...metrics, activityLevel };
    setMetrics(updatedMetrics);

    const recommended = calculateRecommendedTargets(updatedMetrics);
    setTargets(recommended);
  };

  // 4. Calorie Target change: ONLY updates calories, no dynamic macro shifts
  const handleCaloriesChange = (newCalories: number) => {
    setTargets(prev => ({
      ...prev,
      calories: newCalories
    }));
  };

  // 5. Macro (Protein, Carbs, Fats) change: ONLY updates that macro, no confusing calorie recalculations
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

  // Generate Gemini AI Bio silently in the background
  const generateAiBioSilently = async (p: number, c: number, f: number, cal: number, fib: number): Promise<string> => {
    const age = metrics.age;
    const goalText = metrics.goal === "Lose Weight" ? `lose weight (target: ${metrics.targetWeight}kg)` : metrics.goal === "Build Muscle" ? `build muscle (target: ${metrics.targetWeight}kg)` : "maintain weight";
    const dietPrefs = metrics.preferences.length > 0 ? metrics.preferences.join(", ") : "no specific food restrictions";
    
    const fallbackBio = `Hey, I'm ${metrics.name}! I'm tracking my nutrition to ${goalText}. Currently focusing on keeping ${metrics.activityLevel.toLowerCase()} and maintaining a target of ${cal} kcal daily.`;

    const key = localStorage.getItem("fitai_gemini_api_key") || 
                (import.meta as any).env.VITE_GEMINI_API_KEY || "";

    if (!key) return fallbackBio;

    try {
      const prompt = `Write a brief, engaging, friendly first-person profile bio (maximum 2 sentences) for a user on a fitness app.
Details:
- Name: ${metrics.name}
- Age: ${age}
- Biology: ${metrics.gender}
- Height: ${metrics.height}cm
- Weight: ${metrics.weight}kg
- Goal: ${goalText}
- Activity Level: ${metrics.activityLevel}
- Dietary Preferences/Restrictions: ${dietPrefs}
- Target Intake: ${cal} calories, ${p}g protein, ${c}g carbs, ${f}g fats, ${fib}g fiber

Make it sound casual, optimistic, and clean. Do not include quotes or meta-commentary. Just output the bio.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 105, temperature: 0.7 }
          }),
        }
      );

      if (!response.ok) return fallbackBio;

      const data = await response.json();
      const generated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return generated || fallbackBio;
    } catch (err) {
      console.error("AI Bio Generation Error:", err);
      return fallbackBio;
    }
  };

  const saveProfileData = async () => {
    const cleanUsername = metrics.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanUsername) {
      throw new Error("Please enter a valid username!");
    }

    const { data: duplicate } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .neq('id', activeProfileId)
      .maybeSingle();

    if (duplicate) {
      throw new Error("This username is already taken. Please choose another one!");
    }

    const silentBio = await generateAiBioSilently(
      targets.protein,
      targets.carbs,
      targets.fats,
      targets.calories,
      targets.fiber
    );

    const updatedPrefs = [
      ...(metrics.preferences || []),
      "onboarded",
      ...(enableGptWidget ? ["show_gpt_widget"] : []),
      ...(requireGptConfirmation ? ["require_gpt_confirmation"] : [])
    ];

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
        memories: metrics.preferences,
        daily_calories_goal: targets.calories,
        weight_goal: metrics.targetWeight,
        protein_goal: targets.protein,
        carbs_goal: targets.carbs,
        fats_goal: targets.fats,
        fiber_goal: targets.fiber
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
      memories: metrics.preferences,
      goals: {
        dailyCalories: targets.calories,
        weightGoal: metrics.targetWeight
      },
      macros: {
        protein: targets.protein,
        carbs: targets.carbs,
        fats: targets.fats,
        fiber: targets.fiber
      }
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
        
        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-200 flex items-center justify-center">
                <Sparkles className="text-white w-7 h-7 fill-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-stone-900 mt-2">
                Let's get started
              </h2>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                Welcome to FitAI. Tell us your name.
              </p>
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

            {/* Username input */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Username
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-xs font-bold text-stone-400">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={metrics.username}
                  onChange={(e) => {
                    const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                    setMetrics(prev => ({ ...prev, username: cleaned }));
                  }}
                  required
                  className="w-full bg-white border border-stone-200 rounded-2xl pl-8 pr-10 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                />
                {usernameStatus === "checking" && (
                  <div className="absolute right-4 w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                )}
                {usernameStatus === "available" && (
                  <span className="absolute right-4 text-xs text-emerald-500 font-bold">✓</span>
                )}
                {usernameStatus === "taken" && (
                  <span className="absolute right-4 text-xs text-red-500 font-bold">✗</span>
                )}
              </div>
              {usernameStatus === "available" && (
                <p className="text-[8px] text-emerald-600 font-extrabold uppercase tracking-wider px-1">✨ Username available!</p>
              )}
              {usernameStatus === "taken" && (
                <p className="text-[8px] text-red-500 font-extrabold uppercase tracking-wider px-1">⚠️ This username is already taken.</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: BIOLOGY */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                Tell us about your body
              </h2>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                Biological sex and measurements calculate baseline TDEE.
              </p>
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
                    {gender === "Male" ? "🙋‍♂️ Male" : "🙋‍♀️ Female"}
                  </button>
                ))}
              </div>
            </div>

            {/* Age stepper */}
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
                    className="bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

            {/* Height/Weight steppers */}
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

        {/* STEP 3: TRAJECTORY, GOALS & PROTOCOLS (MERGED CONFIGURATOR) */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn overflow-y-auto max-h-[70vh] pr-1 scrollbar-hide py-1">
            <div className="text-center space-y-0.5">
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                Goals & Protocols
              </h2>
              <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                Refine targets directly. Calculations auto-sync with presets.
              </p>
            </div>

            {/* Activity Level Selector */}
            <div className="space-y-1">
              <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest block px-0.5">
                Activity Level
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "Sedentary", label: "🟢 Sedentary" },
                  { id: "Lightly Active", label: "🟡 Light" },
                  { id: "Moderately Active", label: "🟠 Moderate" },
                  { id: "Very Active", label: "🔴 Active" },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleActivityLevelChange(act.id as any)}
                    className={`py-2 px-1 rounded-xl border text-center text-[10px] font-black uppercase tracking-tight cursor-pointer ${
                      metrics.activityLevel === act.id
                        ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                        : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Weight Stepper (Precise, 35-250kg range) */}
            <div className="space-y-1">
              <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest block px-0.5">
                Target Weight
              </label>
              <div className="flex items-center justify-between bg-white border border-stone-200 rounded-2xl px-4 py-2 shadow-sm">
                <span className="text-xs font-bold text-stone-400">Target Weight</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTargetWeightChange(Math.max(35, metrics.targetWeight - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black text-stone-850 w-16 text-center">{metrics.targetWeight} kg</span>
                  <button
                    type="button"
                    onClick={() => handleTargetWeightChange(Math.min(250, metrics.targetWeight + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Premium Calorie & Macro Target Editor */}
            <div className="space-y-3.5">
              <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest block px-0.5">
                Nutrition protocol goals
              </label>

              {/* Calories Target Stepper card */}
              <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Daily Calories Target</span>
                  <span className="text-[8px] text-stone-400 font-bold uppercase mt-0.5">Adjustable target</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCaloriesChange(Math.max(800, targets.calories - 50))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer border-none shadow-2xs active:scale-90 transition-transform"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={targets.calories}
                    onChange={(e) => handleCaloriesChange(parseInt(e.target.value) || 0)}
                    className="w-16 bg-transparent border-none text-center text-sm font-black text-stone-850 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCaloriesChange(Math.min(10000, targets.calories + 50))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer border-none shadow-2xs active:scale-90 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[9px] font-black text-stone-450 uppercase">kcal</span>
                </div>
              </div>

              {/* Macros Grid adjustments (No 'g' suffix inside steppers, grams unit in card label headers) */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Protein (g)", key: "protein", color: "border-orange-200 text-orange-655 bg-orange-50/15" },
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
            </div>
          </div>
        )}

      </div>

      {/* Navigation Footer (active for all steps) */}
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
            <span>{step === totalSteps ? "Start Tracking 🚀" : "Continue"}</span>
            {step < totalSteps && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Date of Birth Picker removed - replaced by age stepper */}
    </div>
  );
};
