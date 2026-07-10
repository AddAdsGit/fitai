import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Camera, 
  ChevronLeft, 
  Plus, 
  Minus, 
  Check, 
  Copy, 
  Bot, 
  ArrowRight, 
  Flame,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Mifflin-St Jeor BMR and Macro Target Calculator
interface BodyMetrics {
  name: string;
  avatar: string;
  gender: "Male" | "Female";
  dob: string;
  height: number;
  weight: number;
  goal: "Lose Weight" | "Maintain Weight" | "Build Muscle";
  targetWeight: number;
  activityLevel: "Sedentary" | "Lightly Active" | "Moderately Active" | "Very Active";
  preferences: string[]; // Diets & Allergies
}

const DEFAULT_METRICS: BodyMetrics = {
  name: "",
  avatar: "",
  gender: "Male",
  dob: "1998-05-15",
  height: 175,
  weight: 70,
  goal: "Lose Weight",
  targetWeight: 65,
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
  onComplete,
  triggerToast,
}: {
  activeProfileId: string;
  supabase: any;
  onComplete: (data: any) => void;
  triggerToast: (msg: string) => void;
}) => {
  const [step, setStep] = useState(1);
  const [metrics, setMetrics] = useState<BodyMetrics>(DEFAULT_METRICS);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [aiBio, setAiBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // Targets calculated by AI
  const [targets, setTargets] = useState({
    calories: 2000,
    protein: 150,
    carbs: 150,
    fats: 60,
    fiber: 30,
  });

  // Load API Key to show on step 4
  useEffect(() => {
    if (activeProfileId && supabase) {
      supabase
        .from("profiles")
        .select("api_key")
        .eq("id", activeProfileId)
        .single()
        .then(({ data }: any) => {
          if (data?.api_key) {
            setApiKey(data.api_key);
          }
        });
    }
  }, [activeProfileId, supabase]);

  // Calculations: Age from DOB
  const calculateAge = (dobString: string) => {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age || 25;
  };

  // Perform Mifflin-St Jeor calculation
  const runAiTargetsCalculation = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const age = calculateAge(metrics.dob);
      let bmr = 0;
      
      if (metrics.gender === "Male") {
        bmr = 10 * metrics.weight + 6.25 * metrics.height - 5 * age + 5;
      } else {
        bmr = 10 * metrics.weight + 6.25 * metrics.height - 5 * age - 161;
      }

      // Activity Multipliers
      const activityMultipliers = {
        "Sedentary": 1.2,
        "Lightly Active": 1.375,
        "Moderately Active": 1.55,
        "Very Active": 1.725,
      };

      const multiplier = activityMultipliers[metrics.activityLevel] || 1.2;
      const tdee = bmr * multiplier;

      // Goal adjustments
      let targetCalories = Math.round(tdee);
      if (metrics.goal === "Lose Weight") {
        targetCalories = Math.round(tdee - 500);
        if (targetCalories < 1200) targetCalories = 1200; // safe lower bound
      } else if (metrics.goal === "Build Muscle") {
        targetCalories = Math.round(tdee + 300);
      }

      // Macro splits (AI Default - Balanced/High Protein style)
      // Protein: 2.0g per kg of body weight
      const proteinGrams = Math.round(metrics.weight * 2.0);
      const proteinCalories = proteinGrams * 4;

      // Fats: 25% of calories
      const fatGrams = Math.round((targetCalories * 0.25) / 9);
      const fatCalories = fatGrams * 9;

      // Carbs: remaining calories
      const remainingCalories = targetCalories - proteinCalories - fatCalories;
      const carbGrams = Math.max(20, Math.round(remainingCalories / 4));

      // Fiber: 30g for Male, 25g for Female
      const fiberGrams = metrics.gender === "Male" ? 30 : 25;

      setTargets({
        calories: targetCalories,
        protein: proteinGrams,
        carbs: carbGrams,
        fats: fatGrams,
        fiber: fiberGrams,
      });
      setIsCalculating(false);

      // Generate bio automatically
      generateAiBio(proteinGrams, carbGrams, fatGrams, targetCalories, fiberGrams);
    }, 1000);
  };

  // Dynamic Gemini AI Bio Generator
  const generateAiBio = async (p: number, c: number, f: number, cal: number, fib: number) => {
    setIsGeneratingBio(true);
    const age = calculateAge(metrics.dob);
    const goalText = metrics.goal === "Lose Weight" ? `lose weight (target: ${metrics.targetWeight}kg)` : metrics.goal === "Build Muscle" ? `build muscle (target: ${metrics.targetWeight}kg)` : "maintain weight";
    const dietPrefs = metrics.preferences.length > 0 ? metrics.preferences.join(", ") : "no specific food restrictions";
    
    // Check if key is available
    const key = localStorage.getItem("fitai_gemini_api_key") || 
                (import.meta as any).env.VITE_GEMINI_API_KEY || "";

    const fallbackBio = `Hey, I'm ${metrics.name}! I'm tracking my nutrition to ${goalText}. Currently focusing on keeping ${metrics.activityLevel.toLowerCase()} and maintaining a target of ${cal} kcal daily.`;

    if (!key) {
      setAiBio(fallbackBio);
      setIsGeneratingBio(false);
      return;
    }

    try {
      const prompt = `Write a brief, engaging, friendly first-person profile bio (maximum 2 sentences) for a user on a fitness app.
Details:
- Name: ${metrics.name}
- Age: ${age} years old
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
            generationConfig: { maxOutputTokens: 100, temperature: 0.7 }
          }),
        }
      );

      if (!response.ok) throw new Error("Gemini API error");

      const data = await response.json();
      const generated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (generated) {
        setAiBio(generated);
      } else {
        setAiBio(fallbackBio);
      }
    } catch (err) {
      console.error("AI Bio Generation Error:", err);
      setAiBio(fallbackBio);
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !metrics.name.trim()) {
      triggerToast("⚠️ Please enter your name to continue");
      return;
    }
    if (step === 3) {
      // Trigger calculation when moving into step 4 (the payoff screen)
      runAiTargetsCalculation();
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const togglePreference = (pref: string) => {
    setMetrics(prev => {
      const exists = prev.preferences.includes(pref);
      return {
        ...prev,
        preferences: exists 
          ? prev.preferences.filter(p => p !== pref)
          : [...prev.preferences, pref]
      };
    });
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

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const updatedPrefs = [...(metrics.preferences || []), "onboarded"];
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: metrics.name.trim(),
          image_url: metrics.avatar || null,
          height: metrics.height,
          weight: metrics.weight,
          dob: metrics.dob,
          gender: metrics.gender,
          description: aiBio.trim(),
          preferences: updatedPrefs,
          memories: metrics.preferences, // store diet preferences directly to memories
          daily_calories_goal: targets.calories,
          weight_goal: metrics.targetWeight,
          protein_goal: targets.protein,
          carbs_goal: targets.carbs,
          fats_goal: targets.fats,
          fiber_goal: targets.fiber
        })
        .eq('id', activeProfileId);

      if (error) {
        triggerToast("❌ Failed to save onboarding targets");
        console.error(error);
      } else {
        onComplete({
          name: metrics.name.trim(),
          imageUrl: metrics.avatar || null,
          height: metrics.height,
          weight: metrics.weight,
          dob: metrics.dob,
          gender: metrics.gender,
          description: aiBio.trim(),
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
        });
        triggerToast("✨ Welcome to FitAI! Account ready.");
      }
    } catch (err) {
      console.error(err);
      triggerToast("❌ Unexpected onboarding completion error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    triggerToast("📋 API Key copied to clipboard!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const totalSteps = 4;
  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-6 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
      
      {/* Onboarding Header Navigation */}
      <div className="w-full flex items-center justify-between gap-4 py-2 border-b border-stone-200/50">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-600 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {/* Progress Track */}
        <div className="flex-1 h-2 bg-stone-200/80 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
          />
        </div>
        
        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest shrink-0">
          Step {step} of {totalSteps}
        </span>
      </div>

      {/* Main Content Step Window */}
      <div className="flex-1 flex flex-col justify-center py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="w-full space-y-6"
          >
            
            {/* STEP 1: WELCOME & NAME */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-200 flex items-center justify-center rotate-6">
                    <Sparkles className="text-white w-7 h-7 -rotate-6 fill-white" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-stone-900 mt-2">
                    Let's get started
                  </h2>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    Welcome to FitAI. Tell us your name.
                  </p>
                </div>

                {/* Avatar Selection */}
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-stone-200 shadow-inner flex items-center justify-center bg-stone-100">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-stone-300 font-bold text-2xl uppercase">
                          {metrics.name?.slice(0, 2) || "AI"}
                        </span>
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

                {/* Name Input */}
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
              </div>
            )}

            {/* STEP 2: BODY METRICS */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black tracking-tight text-stone-900">
                    Tell us about your body
                  </h2>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    Biological measurements feed BMR calculations.
                  </p>
                </div>

                {/* Biological Sex (Restricted toggles) */}
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
                        className={`py-3.5 px-4 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
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

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={metrics.dob}
                    onChange={(e) => setMetrics(prev => ({ ...prev, dob: e.target.value }))}
                    required
                    className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                  />
                </div>

                {/* Height & Weight Steppers */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Height Stepper */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                      Height (cm)
                    </label>
                    <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setMetrics(prev => ({ ...prev, height: Math.max(100, prev.height - 1) }))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer"
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
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Weight Stepper */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                      Weight (kg)
                    </label>
                    <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setMetrics(prev => ({ ...prev, weight: Math.max(30, prev.weight - 1) }))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        value={metrics.weight}
                        onChange={(e) => setMetrics(prev => ({ ...prev, weight: parseFloat(e.target.value) || 70 }))}
                        className="flex-1 bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMetrics(prev => ({ ...prev, weight: Math.min(300, prev.weight + 1) }))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* STEP 3: LIFESTYLE & GOALS */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black tracking-tight text-stone-900">
                    Your trajectory & style
                  </h2>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    Define goals, activity levels, and preferences.
                  </p>
                </div>

                {/* Primary Goals */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                    What is your goal?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "Lose Weight", label: "🔥 Lose", subtitle: "Deficit" },
                      { id: "Maintain Weight", label: "⚡ Stay", subtitle: "Balance" },
                      { id: "Build Muscle", label: "💪 Bulk", subtitle: "Growth" },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setMetrics(prev => ({ ...prev, goal: g.id as any }))}
                        className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          metrics.goal === g.id
                            ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-100"
                            : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-tight">{g.label}</span>
                        <span className="text-[7px] font-bold opacity-60 uppercase">{g.subtitle}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Weight Slider (if lose/build) */}
                {metrics.goal !== "Maintain Weight" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <div className="flex justify-between items-end px-1">
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                        Target Weight (kg)
                      </label>
                      <span className="text-xs font-black text-orange-600">{metrics.targetWeight} kg</span>
                    </div>
                    <input
                      type="range"
                      min={metrics.weight - 30 > 30 ? metrics.weight - 30 : 30}
                      max={metrics.weight + 30}
                      step="0.5"
                      value={metrics.targetWeight}
                      onChange={(e) => setMetrics(prev => ({ ...prev, targetWeight: parseFloat(e.target.value) }))}
                      className="w-full accent-orange-500 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
                    />
                  </motion.div>
                )}

                {/* Activity Level selection */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                    Activity level
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "Sedentary", label: "🟢 Sedentary", desc: "Minimal activity" },
                      { id: "Lightly Active", label: "🟡 Lightly", desc: "1-3 days walks" },
                      { id: "Moderately Active", label: "🟠 Moderate", desc: "3-5 days gym" },
                      { id: "Very Active", label: "🔴 Heavy Active", desc: "6-7 days intense" },
                    ].map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setMetrics(prev => ({ ...prev, activityLevel: act.id as any }))}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer flex flex-col transition-all ${
                          metrics.activityLevel === act.id
                            ? "bg-orange-500 border-orange-500 text-white shadow-md"
                            : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-tight">{act.label}</span>
                        <span className={`text-[7px] font-medium leading-none mt-0.5 ${metrics.activityLevel === act.id ? "text-white/80" : "text-stone-400"}`}>{act.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dietary preferences / Exclusions */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                    Preferences & Exclusions
                  </label>
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {DIET_ALLERGY_OPTIONS.map((opt) => {
                      const isSelected = metrics.preferences.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => togglePreference(opt.id)}
                          className={`px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? "bg-orange-50 text-orange-600 border-orange-400 shadow-sm"
                              : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: PAYOFF SCREEN */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black tracking-tight text-stone-900">
                    Your custom AI targets
                  </h2>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    Calculated dynamically by FitAI.
                  </p>
                </div>

                {/* Loading State for Calculations */}
                {isCalculating ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    <span className="text-xs font-bold text-stone-500 animate-pulse">
                      Analyzing measurements & BMR...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Calorie Goal Board */}
                    <div className="bg-stone-900 text-white rounded-[24px] p-5 shadow-xl relative overflow-hidden flex items-center justify-between">
                      <div className="absolute -top-12 -left-12 w-28 h-28 bg-orange-500/20 rounded-full blur-2xl" />
                      <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl" />
                      
                      <div className="space-y-1 relative z-10">
                        <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">
                          Target Calories
                        </span>
                        <div className="text-3xl font-black tracking-tight">
                          {targets.calories.toLocaleString()} <span className="text-xs font-bold text-stone-400">kcal/day</span>
                        </div>
                      </div>
                      
                      <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center relative z-10 shadow-lg shadow-orange-500/30 animate-pulse">
                        <span className="text-2xl">🔥</span>
                      </div>
                    </div>

                    {/* Macronutrient breakdown */}
                    <div className="bg-white rounded-[24px] p-5 border border-stone-200/60 shadow-sm space-y-3.5">
                      <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-0.5">
                        Macro targets
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Protein", val: targets.protein, labelColor: "text-orange-600" },
                          { label: "Carbs", val: targets.carbs, labelColor: "text-[#006B7D]" },
                          { label: "Fats", val: targets.fats, labelColor: "text-yellow-600" },
                          { label: "Fiber", val: targets.fiber, labelColor: "text-[#10B981]" },
                        ].map((m) => (
                          <div key={m.label} className="bg-stone-50/50 p-2.5 rounded-xl border border-stone-100 flex flex-col items-center">
                            <span className="text-[8px] font-black text-stone-400 uppercase tracking-tight">{m.label}</span>
                            <span className={`text-base font-black tracking-tight mt-1 ${m.labelColor}`}>{m.val}g</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Generated Bio */}
                    <div className="bg-white rounded-[24px] p-5 border border-stone-200/60 shadow-sm space-y-2">
                      <div className="flex justify-between items-center px-0.5">
                        <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                          AI Generated Bio
                        </span>
                        {isGeneratingBio ? (
                          <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => generateAiBio(targets.protein, targets.carbs, targets.fats, targets.calories, targets.fiber)}
                            className="text-[9px] font-black text-orange-500 uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-2.5 h-2.5 fill-orange-500" /> Regenerate
                          </button>
                        )}
                      </div>
                      
                      <div className="bg-stone-50/50 border border-stone-100 rounded-xl p-3.5 relative">
                        {isGeneratingBio ? (
                          <div className="space-y-2 py-1">
                            <div className="h-3 bg-stone-200 rounded animate-pulse w-full" />
                            <div className="h-3 bg-stone-200 rounded animate-pulse w-5/6" />
                          </div>
                        ) : (
                          <textarea
                            value={aiBio}
                            onChange={(e) => setAiBio(e.target.value)}
                            rows={2}
                            className="w-full bg-transparent border-none text-[11px] font-bold text-stone-700 leading-relaxed focus:outline-none resize-none"
                          />
                        )}
                      </div>
                    </div>

                    {/* One-Click Custom GPT Voice Logging link */}
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200/40 rounded-[24px] p-5 space-y-3 shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center shadow-md">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-stone-900 leading-tight">
                            Instant Voice Logging
                          </h4>
                          <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider mt-0.5">
                            Connect ChatGPT Companion
                          </p>
                        </div>
                      </div>

                      <p className="text-[10px] text-stone-600 font-medium leading-normal">
                        Our Custom GPT lets you log meals instantly using text or voice recordings. Tap below to link accounts with a single click.
                      </p>

                      <div className="flex gap-2">
                        {/* 1-Click GPT Link */}
                        <a
                          href="https://chatgpt.com/g/g-6a4f69a8803c8191b29bc51494b65b1c-fitai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-stone-900 hover:bg-stone-855 text-white text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-center"
                        >
                          Connect Custom GPT (1-Click)
                        </a>

                        {/* Copy API key */}
                        <button
                          type="button"
                          onClick={copyToClipboard}
                          disabled={!apiKey}
                          className="px-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Actions Footer */}
      <div className="w-full pt-4 border-t border-stone-200/50 flex gap-4">
        {step < totalSteps ? (
          <button
            type="button"
            onClick={handleNext}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer animate-none"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={isSubmitting || isCalculating}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/50 flex items-center justify-center gap-2 cursor-pointer animate-none"
          >
            {isSubmitting ? "Completing Setup..." : "Complete Setup & Start Tracking"}
          </button>
        )}
      </div>

    </div>
  );
};
