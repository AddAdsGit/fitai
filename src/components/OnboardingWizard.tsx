import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  ChevronLeft, 
  Plus, 
  Minus, 
  ArrowRight,
  Check,
  Search,
  X,
  Pencil,
  Info
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

const FULL_NUTRIENT_CATALOG = [
  { id: "iron", name: "Iron", defaultTarget: 18, unit: "mg", color: "#EF4444", type: "micro" },
  { id: "b12", name: "Vitamin B12", defaultTarget: 2.4, unit: "mcg", color: "#8B5CF6", type: "micro" },
  { id: "vit_d", name: "Vitamin D", defaultTarget: 600, unit: "IU", color: "#F59E0B", type: "micro" },
  { id: "sodium", name: "Sodium", defaultTarget: 2300, unit: "mg", color: "#64748B", type: "micro" },
  { id: "sugar", name: "Added Sugar", defaultTarget: 25, unit: "g", color: "#EC4899", type: "micro" },
  { id: "potassium", name: "Potassium", defaultTarget: 3400, unit: "mg", color: "#10B981", type: "micro" },
  { id: "calcium", name: "Calcium", defaultTarget: 1000, unit: "mg", color: "#3B82F6", type: "micro" },
  { id: "magnesium", name: "Magnesium", defaultTarget: 400, unit: "mg", color: "#6366F1", type: "micro" },
  { id: "zinc", name: "Zinc", defaultTarget: 11, unit: "mg", color: "#14B8A6", type: "micro" },
  { id: "vit_c", name: "Vitamin C", defaultTarget: 90, unit: "mg", color: "#F97316", type: "micro" },
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

  // Active Tooltip Info Popup state
  const [activeInfoTooltip, setActiveInfoTooltip] = useState<string | null>(null);

  // Targets state (configured on Step 3)
  const [targets, setTargets] = useState({
    calories: 2000,
    protein: 150,
    carbs: 150,
    fats: 60,
    fiber: 30,
  });

  const [selectedPlan, setSelectedPlan] = useState<"free" | "plus" | "pro">("pro");

  // AI Meal Tracking Tags State (Step 6 - Exact Card Model matching Nutrient Tracker)
  const [aiTrackingTags, setAiTrackingTags] = useState([
    { id: "tag_hp", name: "High Protein", description: "Apply when meal has >= 30g protein", enabled: true },
    { id: "tag_gf", name: "Gluten Free", description: "Apply when meal contains no gluten ingredients", enabled: false },
    { id: "tag_keto", name: "Keto", description: "Apply when meal has <= 10g net carbs", enabled: false },
    { id: "tag_if", name: "Intermittent Fasting", description: "Apply during daily eating window", enabled: false },
    { id: "tag_home", name: "Homemade", description: "Apply for home-cooked meals", enabled: true }
  ]);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [showCustomTagForm, setShowCustomTagForm] = useState(false);
  const [customTagName, setCustomTagName] = useState("");
  const [customTagRule, setCustomTagRule] = useState("");
  const [tagSearchQuery, setTagSearchQuery] = useState("");

  // Vitals Selection State (Step 5)
  const [selectedVitals, setSelectedVitals] = useState({
    weight: true,
    water: false,
    digestion: false,
    energy: false,
  });

  // Tracked Nutrients List (Step 4 - Edit Profile Model)
  const [trackedNutrientList, setTrackedNutrientList] = useState<any[]>(() => {
    return DEFAULT_TRACKED_NUTRIENTS.map(n => ({ ...n, enabled: true }));
  });

  const [nutrientSearchQuery, setNutrientSearchQuery] = useState("");
  const [isNutrientDropdownOpen, setIsNutrientDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNutrientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Step 7 AI Generation Loading animation
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("Calculating metabolic baseline...");

  const totalSteps = 8;

  // Handle Step 7 auto-progress animation
  useEffect(() => {
    if (step === 7) {
      setGenerationProgress(0);
      setGenerationStatus("Calculating metabolic baseline...");

      const t1 = setTimeout(() => {
        setGenerationProgress(35);
        setGenerationStatus("Configuring AI meal logger & ChatGPT assistant...");
      }, 600);

      const t2 = setTimeout(() => {
        setGenerationProgress(75);
        setGenerationStatus("Customizing daily macro & nutrition protocol...");
      }, 1200);

      const t3 = setTimeout(() => {
        setGenerationProgress(100);
        setGenerationStatus("98% Personalization Match Ready!");
      }, 1800);

      const t4 = setTimeout(() => {
        setStep(8);
      }, 2300);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [step]);

  const isStepValid = () => {
    if (step === 1) return metrics.name.trim() !== "";
    if (step === 2) return metrics.height > 0 && metrics.weight > 0 && metrics.age > 0;
    if (step === 3) return metrics.targetWeight > 0 && targets.calories > 0;
    if (step === 4) return trackedNutrientList.some(n => n.enabled);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !metrics.name.trim()) {
      triggerToast("⚠️ Please enter your name to continue!");
      return;
    }
    setStep(prev => Math.min(totalSteps, prev + 1));
  };

  const handleBack = () => {
    if (step === 7) return; // cannot go back during generating step
    if (step === 8) {
      setStep(6); // skip generating step when going back from pricing screen
      return;
    }
    setStep(prev => Math.max(1, prev - 1));
  };

  const toggleAiTag = (id: string) => {
    setAiTrackingTags(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const handleCreateCustomTag = () => {
    const trimmed = customTagName.trim();
    if (!trimmed) return;
    setAiTrackingTags(prev => [
      ...prev,
      {
        id: `tag_${Date.now()}`,
        name: trimmed,
        description: customTagRule.trim() || `Apply when meal meets ${trimmed} guidelines`,
        enabled: true
      }
    ]);
    setCustomTagName("");
    setCustomTagRule("");
    setShowCustomTagForm(false);
  };

  const handleUpdateTagDesc = (id: string, description: string) => {
    setAiTrackingTags(prev => prev.map(t => t.id === id ? { ...t, description } : t));
  };

  const handleDeleteTag = (id: string) => {
    setAiTrackingTags(prev => prev.filter(t => t.id !== id));
    if (editingTagId === id) setEditingTagId(null);
  };

  const activeNutrientCount = trackedNutrientList.filter(n => n.enabled).length;

  const toggleNutrientEnabled = (id: string) => {
    const targetItem = trackedNutrientList.find(n => n.id === id);
    if (targetItem && !targetItem.enabled && activeNutrientCount >= 8) {
      triggerToast("⚠️ Max 8 active nutrient slots reached!");
      return;
    }
    setTrackedNutrientList(prev => 
      prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n)
    );
  };

  const addNutrientFromCatalog = (item: any) => {
    if (activeNutrientCount >= 8) {
      triggerToast("⚠️ Max 8 active nutrient slots reached!");
      return;
    }
    const exists = trackedNutrientList.some(n => n.id === item.id);
    if (exists) {
      setTrackedNutrientList(prev => prev.map(n => n.id === item.id ? { ...n, enabled: true } : n));
    } else {
      setTrackedNutrientList(prev => [
        ...prev,
        {
          id: item.id,
          name: item.name,
          unit: item.unit,
          target: item.defaultTarget || 10,
          color: item.color || "#F97316",
          enabled: true,
          type: item.type || "micro"
        }
      ]);
    }
    setNutrientSearchQuery("");
    setIsNutrientDropdownOpen(false);
  };

  const handleAddCustomNutrient = () => {
    if (activeNutrientCount >= 8) {
      triggerToast("⚠️ Max 8 active nutrient slots reached!");
      return;
    }
    const trimmed = nutrientSearchQuery.trim();
    if (!trimmed) return;
    const customId = `custom_${Date.now()}`;
    const newNutrient = {
      id: customId,
      name: trimmed,
      target: 100,
      unit: "mg",
      color: "#F97316",
      enabled: true,
      type: "micro"
    };
    setTrackedNutrientList(prev => [...prev, newNutrient]);
    setNutrientSearchQuery("");
    setIsNutrientDropdownOpen(false);
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

    const multiplier = 1.55;
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

  useEffect(() => {
    const recommended = calculateRecommendedTargets(metrics);
    setTargets(recommended);
  }, [metrics.gender, metrics.age, metrics.height, metrics.weight]);

  const handleCurrentWeightChange = (newWeight: number) => {
    setMetrics(prev => ({ ...prev, weight: newWeight }));
  };

  const handleTargetWeightChange = (newTargetWeight: number) => {
    setMetrics(prev => ({ ...prev, targetWeight: newTargetWeight }));
  };

  const handleCaloriesChange = (newCalories: number) => {
    setTargets(prev => ({ ...prev, calories: newCalories }));
  };

  const handleMacroChange = (key: "protein" | "carbs" | "fats" | "fiber", val: number) => {
    setTargets(prev => ({ ...prev, [key]: val }));
    setTrackedNutrientList(prev => prev.map(n => n.id === key ? { ...n, target: val } : n));
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

    if (selectedPlan === "pro") {
      updatedPrefs.push("plan_pro");
    } else if (selectedPlan === "plus") {
      updatedPrefs.push("plan_plus");
    }

    const initialAgentConfig = {
      showGptWidget: true,
      generateImages: true,
      refinePhotos: false,
      artStyle: "gourmet",
      customArtStyle: "",
      requireConfirmation: true,
      trackWeight: selectedVitals.weight,
      trackWater: selectedVitals.water,
      trackDigestion: selectedVitals.digestion,
      trackEnergy: selectedVitals.energy,
      customInstructions: "Be a hyper-efficient fitness assistant. Minimize chit-chat. Keep replies extremely concise. Prefix macro estimations with ≈. Focus on accurate protein tracking and calorie targets."
    };

    const finalTrackedNutrients = trackedNutrientList.map((n) => ({
      ...n,
      target: n.id === "protein" ? targets.protein : n.id === "carbs" ? targets.carbs : n.id === "fats" ? targets.fats : n.id === "fiber" ? targets.fiber : n.target
    }));

    const activeMicros = finalTrackedNutrients.filter(n => n.enabled && n.type === "micro");
    const activeTags = aiTrackingTags.filter(t => t.enabled);

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
        tracking_tags: activeTags,
        knowledge_preferences: metrics.preferences || [],
        knowledge_health: [],
        knowledge_notes: [],
        knowledge_patterns: [],
        agent_memory: [],
        agent_config: initialAgentConfig,
        daily_calories_goal: targets.calories,
        weight_goal: metrics.targetWeight,
        protein_goal: targets.protein,
        tracked_nutrients: finalTrackedNutrients,
        track_micros: activeMicros.length > 0,
        micros: activeMicros
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
      tracking_tags: activeTags,
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
      tracked_nutrients: finalTrackedNutrients,
      trackMicros: activeMicros.length > 0,
      micros: activeMicros
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

  const progressPercent = (step / totalSteps) * 100;

  const filteredCatalog = FULL_NUTRIENT_CATALOG.filter(item => 
    !trackedNutrientList.some(tn => tn.id === item.id && tn.enabled) &&
    (item.name.toLowerCase().includes(nutrientSearchQuery.toLowerCase()) || item.id.toLowerCase().includes(nutrientSearchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-6 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
      
      {/* Sleek Header Progress Bar */}
      <div className="w-full flex items-center justify-between gap-4 py-2 border-b border-stone-200/50">
        <button
          onClick={handleBack}
          disabled={step === 1 || step === 7}
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
      </div>

      {/* Steps Content */}
      <div className="flex-1 flex flex-col justify-center py-4">
        
        {/* STEP 1: YOUR PROFILE */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <h2 className="text-2xl font-black tracking-tight text-stone-900">
                Welcome to FitAI
              </h2>
            </div>

            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-2 py-1">
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

        {/* STEP 3: DAILY GOALS */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center space-y-0.5">
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                Daily Goals
              </h2>
            </div>

            {/* Primary Goal Selector */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
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
                    className={`py-3 px-2 rounded-2xl border text-center text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
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

            {/* Target Weight */}
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

            {/* Daily Calories Target */}
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
          </div>
        )}

        {/* STEP 4: NUTRIENTS & MACROS (WITH SUBTLE INFO ICON) */}
        {step === 4 && (
          <div className="space-y-4 animate-fadeIn overflow-y-auto max-h-[70vh] pr-1 scrollbar-hide py-1 text-left">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  Nutrient Tracking
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveInfoTooltip(activeInfoTooltip === "nutrients" ? null : "nutrients")}
                  className="text-stone-400 hover:text-orange-500 border-none bg-transparent cursor-pointer transition-colors p-0.5"
                  title="Track macros and essential micro-nutrients to optimize daily energy and health."
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded-full border ${
                  activeNutrientCount >= 8
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-orange-50 text-orange-600 border-orange-200/80"
                }`}>
                  {activeNutrientCount}/8 Active Slots
                </span>
              </div>

              {activeInfoTooltip === "nutrients" && (
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-[10px] font-bold text-stone-600 text-left animate-fadeIn">
                  💡 Track Protein, Carbs, Fats, Fiber & micros (Iron, B12, Vit D) to optimize daily energy and recovery.
                </div>
              )}
            </div>

            {/* Search Dropdown Input */}
            <div ref={dropdownRef} className="relative">
              <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-2xl px-3.5 py-3 shadow-sm focus-within:border-orange-500 transition-all">
                <Search className="w-4 h-4 text-stone-400 shrink-0" />
                <input
                  type="text"
                  value={nutrientSearchQuery}
                  onChange={(e) => {
                    setNutrientSearchQuery(e.target.value);
                    setIsNutrientDropdownOpen(true);
                  }}
                  onFocus={() => setIsNutrientDropdownOpen(true)}
                  placeholder={activeNutrientCount >= 8 ? "Max 8 slots reached" : "+ Add Nutrient (B12, Iron, Sodium, Vit D, Sugar...)"}
                  disabled={activeNutrientCount >= 8}
                  className="flex-1 bg-transparent border-none text-xs font-bold text-stone-850 placeholder:text-stone-400 focus:outline-none disabled:opacity-50"
                />
                {nutrientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setNutrientSearchQuery("")}
                    className="text-stone-400 hover:text-stone-600 border-none bg-transparent cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Options List */}
              {isNutrientDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto p-1.5 space-y-1">
                  {activeNutrientCount >= 8 ? (
                    <div className="p-3 text-center text-xs text-amber-700 font-bold bg-amber-50 rounded-xl">
                      ⚠️ Max 8 active slots reached. Disable a nutrient to add new ones.
                    </div>
                  ) : (
                    <>
                      {filteredCatalog.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => addNutrientFromCatalog(item)}
                          className="flex items-center justify-between p-2.5 hover:bg-stone-50 rounded-xl cursor-pointer transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-stone-800">{item.name}</span>
                            <span className="text-[9px] font-medium text-stone-400">Default target: {item.defaultTarget} {item.unit}</span>
                          </div>
                          <Plus className="w-4 h-4 text-orange-500" />
                        </div>
                      ))}

                      {/* Subtle Custom Nutrient Adder */}
                      {nutrientSearchQuery.trim() && !filteredCatalog.some(f => f.name.toLowerCase() === nutrientSearchQuery.trim().toLowerCase()) && (
                        <div
                          onClick={handleAddCustomNutrient}
                          className="p-2.5 hover:bg-stone-50 rounded-xl cursor-pointer transition-colors text-[10px] font-bold text-stone-400 border-t border-stone-100 flex items-center justify-between"
                        >
                          <span>+ Add "{nutrientSearchQuery}" as Custom Nutrient</span>
                          <Plus className="w-3 h-3 text-stone-400" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Active Nutrients List Cards */}
            <div className="space-y-2.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Active Tracked Nutrients
              </label>
              {trackedNutrientList.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-[22px] border transition-all flex items-center justify-between shadow-2xs ${
                    n.enabled
                      ? "bg-white border-stone-200"
                      : "bg-stone-50 border-stone-150 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: n.color || "#F97316" }} />
                    <span className="text-xs font-black text-stone-900 uppercase tracking-wide">{n.name}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Stepper Target Input */}
                    {n.enabled && (
                      <div className="flex items-center gap-1 bg-stone-50 border border-stone-200/90 rounded-xl px-2 py-1 shadow-3xs">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0, (n.target || 10) - 5);
                            setTrackedNutrientList(prev => prev.map(item => item.id === n.id ? { ...item, target: val } : item));
                            if (["protein", "carbs", "fats", "fiber"].includes(n.id)) {
                              handleMacroChange(n.id as any, val);
                            }
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={n.target || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setTrackedNutrientList(prev => prev.map(item => item.id === n.id ? { ...item, target: val } : item));
                            if (["protein", "carbs", "fats", "fiber"].includes(n.id)) {
                              handleMacroChange(n.id as any, val);
                            }
                          }}
                          className="bg-transparent border-none text-center text-xs font-black text-stone-850 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[9px] font-bold text-stone-400">{n.unit}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const val = (n.target || 0) + 5;
                            setTrackedNutrientList(prev => prev.map(item => item.id === n.id ? { ...item, target: val } : item));
                            if (["protein", "carbs", "fats", "fiber"].includes(n.id)) {
                              handleMacroChange(n.id as any, val);
                            }
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => toggleNutrientEnabled(n.id)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer border-none shrink-0 ${
                        n.enabled ? "bg-orange-500" : "bg-stone-300"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                          n.enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => setTrackedNutrientList(prev => prev.filter(item => item.id !== n.id))}
                      className="text-stone-300 hover:text-red-500 border-none bg-transparent cursor-pointer transition-colors p-1"
                      title="Remove nutrient"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* STEP 5: DAILY VITALS (WITH SUBTLE INFO ICON) */}
        {step === 5 && (
          <div className="space-y-5 animate-fadeIn overflow-y-auto max-h-[70vh] pr-1 scrollbar-hide py-1">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  Daily Vitals
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveInfoTooltip(activeInfoTooltip === "vitals" ? null : "vitals")}
                  className="text-stone-400 hover:text-orange-500 border-none bg-transparent cursor-pointer transition-colors p-0.5"
                  title="Log weight, water, and gut comfort to build personalized AI wellness trends."
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeInfoTooltip === "vitals" && (
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-[10px] font-bold text-stone-600 text-left animate-fadeIn">
                  💡 Track Weight, Water, Digestion & Energy to power AI health insights and trendlines.
                </div>
              )}
            </div>

            {/* Simple Question Toggles */}
            <div className="space-y-3">
              {[
                { id: "weight", question: "Track Daily Weight?", desc: "Body weight logs & trendlines", defaultOn: true },
                { id: "water", question: "Track Water Intake?", desc: "Daily hydration volume counter", defaultOn: false },
                { id: "digestion", question: "Track Gut & Digestion?", desc: "Bristol stool spectrum & comfort", defaultOn: false },
                { id: "energy", question: "Track Daily Energy?", desc: "1 to 5 vitality & mood scale", defaultOn: false },
              ].map((v) => {
                const active = selectedVitals[v.id as keyof typeof selectedVitals];
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVitals(prev => ({ ...prev, [v.id]: !active }))}
                    className={`p-4 rounded-[24px] border cursor-pointer transition-all flex items-center justify-between ${
                      active
                        ? "bg-white border-orange-500 shadow-md shadow-orange-100/50"
                        : "bg-white border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-black text-stone-900 tracking-tight">{v.question}</h4>
                      <p className="text-[10px] font-bold text-stone-400 mt-0.5">{v.desc}</p>
                    </div>
                    
                    {/* Clean YES / NO Toggle Pill */}
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                      active
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-stone-100 text-stone-400"
                    }`}>
                      {active ? "YES" : "NO"}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* STEP 6: DIETARY PREFERENCES & AI TAGS (UNIFIED CARD UI MATCHING NUTRIENT TRACKER 1:1) */}
        {step === 6 && (
          <div className="space-y-4 animate-fadeIn overflow-y-auto max-h-[70vh] pr-1 scrollbar-hide py-1 text-left">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  Dietary Preferences & Tags
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveInfoTooltip(activeInfoTooltip === "tags" ? null : "tags")}
                  className="text-stone-400 hover:text-orange-500 border-none bg-transparent cursor-pointer transition-colors p-0.5"
                  title="Enable dietary tags that FitAI automatically assigns to logged meals via AI vision."
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeInfoTooltip === "tags" && (
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-[10px] font-bold text-stone-600 text-left animate-fadeIn">
                  💡 Enable tags so FitAI's AI vision automatically tags your logged meals based on ingredients.
                </div>
              )}
            </div>

            {/* Custom Tag Add Button & Search Header */}
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Active Dietary AI Tags
              </label>
              <button
                type="button"
                onClick={() => setShowCustomTagForm(!showCustomTagForm)}
                className="text-[9px] font-black uppercase text-orange-500 hover:underline border-none bg-transparent cursor-pointer"
              >
                {showCustomTagForm ? "Cancel" : "+ Custom Tag"}
              </button>
            </div>

            {/* Custom Tag Form */}
            {showCustomTagForm && (
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 space-y-2 animate-fadeIn">
                <input
                  type="text"
                  placeholder="Tag Name (e.g. Nut Free)"
                  value={customTagName}
                  onChange={(e) => setCustomTagName(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-850 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="AI rule (e.g. Apply when meal contains no nuts)"
                  value={customTagRule}
                  onChange={(e) => setCustomTagRule(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-medium text-stone-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateCustomTag}
                  className="w-full bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider py-2 rounded-xl border-none cursor-pointer"
                >
                  Add Tag
                </button>
              </div>
            )}

            {/* Tag List (Unified Card UI matching Nutrient Tracker 1:1!) */}
            <div className="space-y-2.5">
              {aiTrackingTags.map((t) => {
                const isEditing = editingTagId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-[22px] border transition-all space-y-2 shadow-2xs ${
                      t.enabled
                        ? "bg-white border-stone-200"
                        : "bg-stone-50 border-stone-150 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">{t.name}</h4>
                          <span className={`w-2 h-2 rounded-full ${t.enabled ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" : "bg-stone-300"}`} />
                        </div>
                        <p className="text-[10px] font-bold text-stone-400 mt-0.5">{t.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Pencil Edit Rule Button */}
                        <button
                          type="button"
                          onClick={() => setEditingTagId(isEditing ? null : t.id)}
                          className="p-1 rounded-full text-stone-400 hover:text-stone-700 border-none bg-transparent cursor-pointer"
                          title="Edit AI Rule"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => toggleAiTag(t.id)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer border-none shrink-0 ${
                            t.enabled ? "bg-orange-500" : "bg-stone-300"
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                              t.enabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>

                        {/* Remove Tag Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(t.id)}
                          className="text-stone-300 hover:text-red-500 border-none bg-transparent cursor-pointer transition-colors p-1"
                          title="Remove tag"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Rule Textarea Expansion */}
                    {isEditing && (
                      <div className="pt-2 border-t border-stone-100 space-y-1 text-left animate-fadeIn">
                        <span className="text-[9px] font-black text-stone-400 uppercase">AI Prompt Guideline</span>
                        <textarea
                          value={t.description}
                          onChange={(e) => handleUpdateTagDesc(t.id, e.target.value)}
                          rows={2}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-xs font-semibold text-stone-700 focus:outline-none resize-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* STEP 7: AI PLAN GENERATION ANIMATION (ULTRA-MINIMALISTIC) */}
        {step === 7 && (
          <div className="space-y-6 animate-fadeIn flex flex-col items-center justify-center text-center py-12">
            <div className="space-y-2 max-w-xs">
              <h2 className="text-xl font-black text-stone-900 tracking-tight">
                Building Your Assistant...
              </h2>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider h-8 flex items-center justify-center">
                {generationStatus}
              </p>
            </div>

            <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden max-w-xs shadow-inner">
              <div
                className="bg-orange-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* STEP 8: PRICING REVEAL */}
        {step === 8 && (
          <div className="space-y-4 animate-fadeIn overflow-y-auto max-h-[70vh] pr-1 scrollbar-hide py-1">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                Custom Protocol Ready
              </div>
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                Choose Your Plan
              </h2>
            </div>

            {/* 3 Tier Plan Cards */}
            <div className="space-y-3">
              
              {/* 1. FitAI Pro Option (Managed AI) */}
              <div
                onClick={() => setSelectedPlan("pro")}
                className={`p-4 rounded-[24px] border-2 cursor-pointer transition-all relative ${
                  selectedPlan === "pro"
                    ? "bg-white border-orange-500 shadow-xl shadow-orange-100"
                    : "bg-white/60 border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="absolute -top-3 right-4 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-sm">
                  Popular
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === "pro" ? "border-orange-500 bg-orange-500 text-white" : "border-stone-300"}`}>
                      {selectedPlan === "pro" && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">FitAI Pro</h4>
                      <p className="text-[10px] font-bold text-stone-400">Fully Managed AI (All Features Included)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-stone-900">$9.99</span>
                    <span className="text-[9px] text-stone-400 block font-bold">/month</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                  {[
                    "All AI Features Hosted Directly From Our Side",
                    "Unlimited AI Photo & Text Meal Logging",
                    "ChatGPT Auto-Sync & Gut Health Analytics",
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-stone-600">
                      <span>•</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. FitAI Plus Option (BYOK Model) */}
              <div
                onClick={() => setSelectedPlan("plus")}
                className={`p-4 rounded-[24px] border-2 cursor-pointer transition-all ${
                  selectedPlan === "plus"
                    ? "bg-white border-orange-500 shadow-xl shadow-orange-100"
                    : "bg-white/60 border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === "plus" ? "border-orange-500 bg-orange-500 text-white" : "border-stone-300"}`}>
                      {selectedPlan === "plus" && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">FitAI Plus</h4>
                      <p className="text-[10px] font-bold text-stone-400">BYOK Model (Bring Your Own API Key)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-stone-900">$4.99</span>
                    <span className="text-[9px] text-stone-400 block font-bold">/month</span>
                  </div>
                </div>
                <div className="mt-2 text-[9.5px] font-semibold text-stone-500 pl-8">
                  Unlock all AI features by connecting your own OpenAI / Gemini API key.
                </div>
              </div>

              {/* 3. Free Baseline Option */}
              <div
                onClick={() => setSelectedPlan("free")}
                className={`p-4 rounded-[24px] border-2 cursor-pointer transition-all ${
                  selectedPlan === "free"
                    ? "bg-white border-orange-500 shadow-xl shadow-orange-100"
                    : "bg-white/60 border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === "free" ? "border-orange-500 bg-orange-500 text-white" : "border-stone-300"}`}>
                      {selectedPlan === "free" && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">Free Baseline</h4>
                      <p className="text-[10px] font-bold text-stone-400">Basic Manual Tracking</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-stone-900">$0</span>
                    <span className="text-[9px] text-stone-400 block font-bold">Forever Free</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Navigation Footer */}
      {step !== 7 && (
        <div className="w-full pt-4 border-t border-stone-200/50 flex gap-4">
          <button
            type="button"
            onClick={step === totalSteps ? handleFinish : handleNext}
            disabled={!isStepValid() || isSubmitting}
            className={`w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
              (!isStepValid() || isSubmitting) ? "opacity-50 cursor-not-allowed shadow-none" : "shadow-lg shadow-orange-100 active:scale-[0.98]"
            }`}
          >
            <span>
              {step === totalSteps
                ? selectedPlan === "free"
                  ? "Launch Free FitAI"
                  : "Start 7-Day Free Trial"
                : "Continue"}
            </span>
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
