import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Camera, 
  ChevronLeft, 
  Plus, 
  Minus, 
  ArrowRight,
  Search,
  X,
  Pencil,
  Sparkles,
  Check
} from "lucide-react";

import { DefaultAvatar } from "./DefaultAvatar";
import { TERMS_AND_CONDITIONS } from "../constants/terms";
import { DEFAULT_TRACKING_TAGS } from "./SettingsView";
import { DEFAULT_TRACKED_NUTRIENTS } from "../constants/nutrition";
import { StepperButton } from "./StepperButton";
import { parseAiHealthPrompt } from "../utils/aiGoalSetter";

interface BodyMetrics {
  name: string;
  username: string;
  avatar: string;
  email?: string;
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
  age: 0,
  height: 0,
  weight: 0,
  goal: "Maintain Weight",
  targetWeight: 0,
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
    let initialAge = 0;
    if (profileData?.dob) {
      const birthDate = new Date(profileData.dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let ageVal = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          ageVal--;
        }
        initialAge = ageVal > 0 ? ageVal : 0;
      }
    }
    const userMeta = profileData?.user_metadata || profileData?.user?.user_metadata;
    const initialName = profileData?.name || profileData?.display_name || userMeta?.full_name || userMeta?.name || "";
    const emailPrefix = (profileData?.email || profileData?.user?.email || userMeta?.email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "");
    const initialUsername = profileData?.username || emailPrefix || initialName.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    const initialAvatar = profileData?.imageUrl || profileData?.image_url || userMeta?.avatar_url || userMeta?.picture || "";
    const initialEmail = profileData?.email || profileData?.user?.email || userMeta?.email || "";

    return {
      ...DEFAULT_METRICS,
      name: initialName,
      username: initialUsername,
      avatar: initialAvatar,
      email: initialEmail,
      age: initialAge,
      height: profileData?.height || 0,
      weight: profileData?.weight || 0,
      targetWeight: profileData?.weight_goal || profileData?.weight || 0,
    };
  });

  const initialAvatarUrl = profileData?.imageUrl || profileData?.image_url || profileData?.user_metadata?.avatar_url || profileData?.user_metadata?.picture || "";
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl);
  const [userEmail, setUserEmail] = useState(profileData?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    if (!userEmail && supabase?.auth) {
      supabase.auth.getUser().then((res: any) => {
        const emailVal = res?.data?.user?.email;
        if (emailVal) {
          setUserEmail(emailVal);
          setMetrics(prev => ({ ...prev, email: emailVal }));
        }
      });
    }
  }, [supabase]);

  // Targets state (configured on Step 3)
  const [targets, setTargets] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
  });

  // AI Meal Tracking Tags State (Step 6 - Clean Card Model matching Edit Profile)
  const [aiTrackingTags, setAiTrackingTags] = useState(() => DEFAULT_TRACKING_TAGS);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [showCustomTagForm, setShowCustomTagForm] = useState(false);
  const [customTagName, setCustomTagName] = useState("");
  const [customTagRule, setCustomTagRule] = useState("");
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  // Vitals Selection State (Step 5)
  const [selectedVitals, setSelectedVitals] = useState({
    weight: true,
    water: false,
    digestion: false,
    energy: false,
    bloating: true,
  });

  // Tracked Nutrients List (Step 4 - Edit Profile Model)
  const [trackedNutrientList, setTrackedNutrientList] = useState<any[]>(() => {
    return DEFAULT_TRACKED_NUTRIENTS.map(n => ({ ...n, enabled: true }));
  });

  const [nutrientSearchQuery, setNutrientSearchQuery] = useState("");
  const [isNutrientDropdownOpen, setIsNutrientDropdownOpen] = useState(false);
  const nutrientDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nutrientDropdownRef.current && !nutrientDropdownRef.current.contains(event.target as Node)) {
        setIsNutrientDropdownOpen(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const draftKey = activeProfileId ? `fitai_onboarding_draft_${activeProfileId}` : "fitai_onboarding_draft";

  // Load onboarding draft state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step && parsed.step >= 1 && parsed.step <= 6) {
          setStep(parsed.step);
        }
        if (parsed.metrics) setMetrics(prev => ({ ...prev, ...parsed.metrics }));
        if (parsed.targets) setTargets(prev => ({ ...prev, ...parsed.targets }));
      }
    } catch (e) {
      console.warn("Could not parse onboarding draft:", e);
    }
  }, [draftKey]);

  // Persist onboarding draft state on changes
  useEffect(() => {
    try {
      if (step >= 1 && step <= 6) {
        localStorage.setItem(draftKey, JSON.stringify({ step, metrics, targets }));
      }
    } catch (e) {
      console.warn("Could not save onboarding draft:", e);
    }
  }, [step, metrics, targets, draftKey]);

  // AI Goal Assistant state
  const [showAiGoalInput, setShowAiGoalInput] = useState(false);
  const [aiGoalPrompt, setAiGoalPrompt] = useState("");
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState("");
  const [aiAppliedReason, setAiAppliedReason] = useState("");
  const [isAiGoalLoading, setIsAiGoalLoading] = useState(false);

  const isPromptGenerated = aiGoalPrompt.trim() !== "" && aiGoalPrompt.trim() === lastGeneratedPrompt.trim();

  const handleApplyAiGoal = () => {
    if (!aiGoalPrompt.trim() || isPromptGenerated) return;
    setIsAiGoalLoading(true);
    setLastGeneratedPrompt(aiGoalPrompt.trim());
    setTimeout(() => {
      const res = parseAiHealthPrompt(aiGoalPrompt, metrics);
      setTargets({
        calories: res.calories,
        protein: res.protein,
        carbs: res.carbs,
        fats: res.fats,
        fiber: res.fiber,
      });

      if (res.targetWeight && res.targetWeight > 0) {
        setMetrics(prev => ({
          ...prev,
          targetWeight: res.targetWeight
        }));
      }

      // Update macro targets in trackedNutrientList (only enable new slots if generating directly on Step 4)
      setTrackedNutrientList(prev => prev.map(n => {
        const isRecommended = step === 4 && res.recommendedNutrientsToEnable.includes(n.id);
        let targetVal = n.target;
        if (n.id === "protein") targetVal = res.protein;
        if (n.id === "carbs") targetVal = res.carbs;
        if (n.id === "fats") targetVal = res.fats;
        if (n.id === "fiber") targetVal = res.fiber;
        return {
          ...n,
          target: targetVal,
          enabled: isRecommended ? true : n.enabled
        };
      }));

      setAiAppliedReason(res.summaryReason);

      if (res.healthMemoryNote) {
        setMetrics(prev => ({
          ...prev,
          preferences: Array.from(new Set([...(prev.preferences || []), res.healthMemoryNote]))
        }));
      }

      triggerToast(`✨ ${res.summaryReason}`);
      setIsAiGoalLoading(false);
      setShowAiGoalInput(false);
    }, 350);
  };

  // Step 7 AI Generation Loading animation (Total steps = 7)
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("Calculating metabolic baseline...");

  const totalSteps = 7;

  // Handle Step 7 auto-progress animation & finish directly
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
        handleFinish();
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
    if (step === 4) return true; // 100% Zen Calorie-Only mode supported (0 or more nutrients)
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

  const calculateBmiIdealWeight = (heightCm: number, currentWeight: number, goal: string) => {
    if (heightCm <= 0) return currentWeight > 0 ? currentWeight : 65;
    const heightM = heightCm / 100;
    const bmiIdeal = Math.round(22 * heightM * heightM);
    
    if (goal === "Maintain Weight") {
      return currentWeight > 0 ? currentWeight : bmiIdeal;
    }
    if (goal === "Build Muscle") {
      if (currentWeight > 0) {
        // If overweight (currentWeight > bmiIdeal + 3), target body recomposition at current weight
        if (currentWeight > bmiIdeal + 3) {
          return currentWeight;
        }
        return Math.round(currentWeight * 1.03);
      }
      return Math.round(bmiIdeal * 1.03);
    }
    // Fat Loss:
    if (currentWeight > 0 && currentWeight > bmiIdeal) {
      return bmiIdeal;
    }
    return currentWeight > 0 ? Math.max(30, Math.round(currentWeight - 4)) : bmiIdeal;
  };

  // Perform Mifflin-St Jeor calculation (used for dynamic recommendations)
  const calculateRecommendedTargets = (currentMetrics: BodyMetrics) => {
    if (currentMetrics.height <= 0 || currentMetrics.weight <= 0) {
      return { calories: 2000, protein: 150, carbs: 150, fats: 60, fiber: 30 };
    }

    const age = currentMetrics.age > 0 ? currentMetrics.age : 25;
    let bmr = 0;
    
    if (currentMetrics.gender === "Male") {
      bmr = 10 * currentMetrics.weight + 6.25 * currentMetrics.height - 5 * age + 5;
    } else {
      bmr = 10 * currentMetrics.weight + 6.25 * currentMetrics.height - 5 * age - 161;
    }

    const multiplier = 1.45;
    const tdee = bmr * multiplier;

    let targetCalories = Math.round(tdee);
    if (currentMetrics.goal === "Lose Weight") {
      targetCalories = Math.max(1200, Math.round(tdee * 0.80)); // 20% deficit
    } else if (currentMetrics.goal === "Build Muscle") {
      targetCalories = Math.round(tdee * 1.15); // 15% surplus
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

  // Targets populate dynamically when user selects Primary Goal or runs AI Goal Setter

  const handleCurrentWeightChange = (raw: string) => {
    if (raw === "") {
      setMetrics(prev => ({ ...prev, weight: 0 }));
    } else {
      const val = parseFloat(raw);
      if (!isNaN(val)) setMetrics(prev => ({ ...prev, weight: val }));
    }
  };

  const handleTargetWeightChange = (raw: string) => {
    if (raw === "") {
      setMetrics(prev => ({ ...prev, targetWeight: 0 }));
    } else {
      const val = parseFloat(raw);
      if (!isNaN(val)) setMetrics(prev => ({ ...prev, targetWeight: val }));
    }
  };

  const handleCaloriesChange = (raw: string) => {
    if (raw === "") {
      setTargets(prev => ({ ...prev, calories: 0 }));
    } else {
      const val = parseInt(raw);
      if (!isNaN(val)) setTargets(prev => ({ ...prev, calories: val }));
    }
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
    const emailPrefix = (userEmail || metrics.email || profileData?.email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "");
    const userHandle = metrics.username || emailPrefix || (metrics.name.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "") || "user");

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
      trackBloating: selectedVitals.bloating ?? true,
      customInstructions: "Be a hyper-efficient fitness assistant. Minimize chit-chat. Keep replies extremely concise. Prefix macro estimations with ≈. Focus on accurate protein tracking and calorie targets."
    };

    const finalTrackedNutrients = trackedNutrientList.map((n) => ({
      ...n,
      target: n.id === "protein" ? targets.protein : n.id === "carbs" ? targets.carbs : n.id === "fats" ? targets.fats : n.id === "fiber" ? targets.fiber : n.target
    }));

    const activeMicros = finalTrackedNutrients.filter(n => n.enabled && n.type === "micro");
    const activeTags = aiTrackingTags.filter(t => t.enabled);

    const profilePayload: any = {
      username: userHandle,
      display_name: metrics.name.trim() || userHandle,
      image_url: metrics.avatar || null,
      height: metrics.height || 170,
      weight: metrics.weight || 70,
      dob: `${new Date().getFullYear() - (metrics.age || 25)}-01-01`,
      gender: metrics.gender || "Male",
      description: silentBio,
      preferences: updatedPrefs,
      tracking_tags: activeTags,
      knowledge_preferences: metrics.preferences || [],
      knowledge_health: aiGoalPrompt.trim() ? [aiGoalPrompt.trim()] : [],
      knowledge_notes: [],
      knowledge_patterns: [],
      agent_memory: [],
      agent_config: initialAgentConfig,
      daily_calories_goal: targets.calories || 2000,
      weight_goal: metrics.targetWeight || metrics.weight || 70,
      protein_goal: targets.protein || 120,
      tracked_nutrients: finalTrackedNutrients,
      track_micros: activeMicros.length > 0,
      micros: activeMicros
    };

    if (activeProfileId) {
      profilePayload.id = activeProfileId;
      let { error } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (error && (error.code === '23505' || error.message?.includes('duplicate key'))) {
        // Username collision fallback: append random 4-digit code
        const safeHandle = `${userHandle.slice(0, 20)}_${Math.floor(1000 + Math.random() * 9000)}`;
        profilePayload.username = safeHandle;
        const retryRes = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
        error = retryRes.error;
      }

      if (error) {
        console.warn("Full profile upsert error, attempting essential update:", error);
        // Essential fallback update
        await supabase.from('profiles').update({
          display_name: metrics.name.trim(),
          daily_calories_goal: targets.calories || 2000,
          protein_goal: targets.protein || 120,
          tracked_nutrients: finalTrackedNutrients,
          preferences: updatedPrefs
        }).eq('id', activeProfileId).catch((err: any) => console.warn("Fallback update error:", err));
      }

      if (metrics.weight > 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        await supabase.from('weight_logs').upsert({
          profile_id: activeProfileId,
          date: todayStr,
          weight: metrics.weight
        }, { onConflict: 'profile_id,date' }).catch((err: any) => console.warn("Error logging initial weight:", err));
      }
    }

    return {
      name: metrics.name.trim(),
      username: profilePayload.username || userHandle,
      email: userEmail || metrics.email,
      imageUrl: metrics.avatar || null,
      height: metrics.height,
      weight: metrics.weight,
      weight_goal: metrics.targetWeight,
      daily_calories_goal: targets.calories,
      protein_goal: targets.protein,
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
      if (activeProfileId) {
        try {
          localStorage.setItem(`fitai_onboarded_${activeProfileId}`, "true");
        } catch (_) {}
      }
      try {
        localStorage.removeItem(draftKey);
      } catch (_) {}
      onComplete(completedState);
      triggerToast("✨ Welcome to FitAI! Setup complete.");
    } catch (err: any) {
      console.error("Onboarding completion error:", err);
      // Ensure user is never permanently stuck in onboarding loop
      if (activeProfileId) {
        try {
          localStorage.setItem(`fitai_onboarded_${activeProfileId}`, "true");
        } catch (_) {}
      }
      onComplete({
        name: metrics.name.trim() || "FitAI Member",
        daily_calories_goal: targets.calories || 2000,
        protein_goal: targets.protein || 120,
        tracked_nutrients: trackedNutrientList,
        preferences: [...(metrics.preferences || []), "onboarded"]
      });
      triggerToast("✨ Welcome to FitAI! Setup complete.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = (step / totalSteps) * 100;

  const filteredCatalog = FULL_NUTRIENT_CATALOG.filter(item => 
    !trackedNutrientList.some(tn => tn.id === item.id && tn.enabled) &&
    (item.name.toLowerCase().includes(nutrientSearchQuery.toLowerCase()) || item.id.toLowerCase().includes(nutrientSearchQuery.toLowerCase()))
  );

  const filteredTagCatalog = DEFAULT_TRACKING_TAGS.filter(item =>
    !aiTrackingTags.some(t => t.id === item.id && t.enabled) &&
    (item.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) || item.description.toLowerCase().includes(tagSearchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-5 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
      
      {/* Sleek Header Progress Bar */}
      <div className="w-full flex items-center justify-between gap-4 py-2 border-b border-stone-200/50 shrink-0">
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
      <div className="flex-1 min-h-0 flex flex-col justify-center py-2 overflow-y-auto pr-0.5 scrollbar-hide">
        
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
                  {(avatarPreview || metrics.avatar) ? (
                    <img src={avatarPreview || metrics.avatar} alt="Avatar" className="w-full h-full object-cover" />
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

            {/* Signed in Account Email */}
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Account Email
              </label>
              <input
                type="text"
                value={userEmail || metrics.email || profileData?.email || "Signed in account"}
                readOnly
                disabled
                className="w-full bg-stone-100/80 border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-600 cursor-not-allowed shadow-inner"
              />
            </div>

            {/* Name input */}
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                What should we call you?
              </label>
              <input
                type="text"
                placeholder="Your name or nickname (e.g. Siva)"
                value={metrics.name}
                onChange={(e) => setMetrics(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
              />
            </div>

            {/* Clean Terms Reference Link & Sign Out */}
            <div className="text-center pt-2 space-y-1.5">
              <p className="text-[9px] font-medium text-stone-400">
                By continuing, you agree to FitAI's{" "}
                <button type="button" onClick={() => setShowTermsModal(true)} className="font-bold text-orange-500 hover:underline cursor-pointer border-none bg-transparent p-0">
                  Terms of Service & Privacy Policy
                </button>
              </p>
              <button
                type="button"
                onClick={async () => {
                  if (supabase?.auth) {
                    await supabase.auth.signOut();
                    window.location.reload();
                  }
                }}
                className="text-[10px] font-bold text-stone-400 hover:text-stone-700 underline cursor-pointer bg-transparent border-none p-0 transition-colors block mx-auto"
              >
                Log Out / Switch Account
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ABOUT YOU */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center space-y-0.5">
              <h2 className="text-2xl font-black tracking-tight text-stone-900">
                About You
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
                <StepperButton
                  onStep={() => setMetrics(prev => ({ ...prev, age: prev.age === 0 ? 25 : Math.max(1, prev.age - 1) }))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </StepperButton>
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  <input
                    type="number"
                    placeholder="25"
                    value={metrics.age === 0 ? "" : metrics.age}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMetrics(prev => ({ ...prev, age: val === "" ? 0 : parseInt(val) || 0 }));
                    }}
                    className="bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">Yrs Old</span>
                </div>
                <StepperButton
                  onStep={() => setMetrics(prev => ({ ...prev, age: prev.age === 0 ? 25 : Math.min(120, prev.age + 1) }))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </StepperButton>
              </div>
            </div>

            {/* Height/Weight steppers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                  Height
                </label>
                <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                  <StepperButton
                    onStep={() => setMetrics(prev => ({ ...prev, height: prev.height === 0 ? 170 : Math.max(1, prev.height - 1) }))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </StepperButton>
                  <div className="flex-1 flex items-center justify-center gap-0.5">
                    <input
                      type="number"
                      placeholder="170"
                      value={metrics.height === 0 ? "" : metrics.height}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMetrics(prev => ({ ...prev, height: val === "" ? 0 : parseInt(val) || 0 }));
                      }}
                      className="bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] font-bold text-stone-400">cm</span>
                  </div>
                  <StepperButton
                    onStep={() => setMetrics(prev => ({ ...prev, height: prev.height === 0 ? 170 : Math.min(250, prev.height + 1) }))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </StepperButton>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                  Weight
                </label>
                <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                  <StepperButton
                    onStep={() => setMetrics(prev => ({ ...prev, weight: prev.weight === 0 ? 70 : Math.max(1, prev.weight - 1) }))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </StepperButton>
                  <div className="flex-1 flex items-center justify-center gap-0.5">
                    <input
                      type="number"
                      placeholder="70"
                      value={metrics.weight === 0 ? "" : metrics.weight}
                      onChange={(e) => handleCurrentWeightChange(e.target.value)}
                      className="bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] font-bold text-stone-400">kg</span>
                  </div>
                  <StepperButton
                    onStep={() => setMetrics(prev => ({ ...prev, weight: prev.weight === 0 ? 70 : Math.min(300, prev.weight + 1) }))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </StepperButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DAILY GOALS */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn py-2">
            <div className="text-center space-y-0.5">
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                Daily Goals
              </h2>
            </div>

            {/* AI Explanation Sub-badge */}
            {aiAppliedReason && (
              <div className="p-3 bg-orange-50/80 border border-orange-200/80 rounded-2xl text-[10.5px] font-bold text-orange-950 flex items-center justify-between gap-2 animate-fadeIn shadow-3xs text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="leading-snug">{aiAppliedReason}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiAppliedReason("")}
                  className="text-orange-400 hover:text-orange-700 bg-transparent border-none cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
                      const targetW = calculateBmiIdealWeight(metrics.height, metrics.weight, g.id);
                      const updatedMetrics = {
                        ...metrics,
                        goal: g.id as any,
                        targetWeight: targetW
                      };
                      setMetrics(updatedMetrics);
                      const rec = calculateRecommendedTargets(updatedMetrics);
                      setTargets(rec);
                      setTrackedNutrientList(prev => prev.map(n => {
                        let val = n.target;
                        if (n.id === "protein") val = rec.protein;
                        if (n.id === "carbs") val = rec.carbs;
                        if (n.id === "fats") val = rec.fats;
                        if (n.id === "fiber") val = rec.fiber;
                        return { ...n, target: val };
                      }));
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
                <StepperButton
                  onStep={() => handleTargetWeightChange(String(Math.max(35, (metrics.targetWeight || 70) - 1)))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </StepperButton>
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  <input
                    type="number"
                    value={metrics.targetWeight === 0 ? "" : metrics.targetWeight}
                    onChange={(e) => handleTargetWeightChange(e.target.value)}
                    className="bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">kg</span>
                </div>
                <StepperButton
                  onStep={() => handleTargetWeightChange(String(Math.min(250, (metrics.targetWeight || 70) + 1)))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </StepperButton>
              </div>
            </div>

            {/* Daily Calories Target */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Daily Calories Target (kcal)
              </label>
              <div className="flex items-center bg-white border border-stone-200 rounded-2xl px-2 py-1 shadow-sm">
                <StepperButton
                  onStep={() => handleCaloriesChange(String(Math.max(800, (targets.calories || 2000) - 50)))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </StepperButton>
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  <input
                    type="number"
                    value={targets.calories === 0 ? "" : targets.calories}
                    onChange={(e) => handleCaloriesChange(e.target.value)}
                    className="bg-transparent border-none text-center text-xs font-bold text-stone-700 focus:outline-none w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-bold text-stone-400">kcal</span>
                </div>
                <StepperButton
                  onStep={() => handleCaloriesChange(String(Math.min(10000, (targets.calories || 2000) + 50)))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </StepperButton>
              </div>
            </div>

            {/* Simple Text Trigger at the end of Step 3 */}
            <div className="pt-2 border-t border-stone-100">
              {!showAiGoalInput ? (
                <button
                  type="button"
                  onClick={() => setShowAiGoalInput(true)}
                  className="w-full text-center text-xs font-bold text-orange-500 hover:text-orange-600 hover:underline cursor-pointer bg-transparent border-none py-1.5 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Generate Goals with AI</span>
                </button>
              ) : (
                <div className="space-y-2 animate-fadeIn text-left pt-1">
                  <textarea
                    rows={2}
                    placeholder="Describe health conditions or diet goals (e.g. Thyroid, Diabetes, Keto)..."
                    value={aiGoalPrompt}
                    onChange={(e) => setAiGoalPrompt(e.target.value)}
                    className="w-full bg-white border border-stone-200/90 focus:border-orange-500 focus:outline-none rounded-xl p-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 resize-none min-h-[56px] shadow-2xs leading-relaxed"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAiGoalInput(false)}
                      className="h-10 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-3xs"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAiGoal}
                      disabled={isAiGoalLoading || !aiGoalPrompt.trim() || isPromptGenerated}
                      className={`h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center border-none ${
                        isPromptGenerated
                          ? "bg-stone-200 text-stone-500 cursor-not-allowed shadow-none"
                          : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white cursor-pointer active:scale-95 shadow-md shadow-orange-500/20 disabled:opacity-40"
                      }`}
                    >
                      <span>{isAiGoalLoading ? "Generating..." : isPromptGenerated ? "Generated ✓" : "Generate"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: NUTRIENTS & MACROS */}
        {step === 4 && (
          <div className="space-y-3.5 animate-fadeIn py-2 text-left">
            <div className="text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  Dashboard Nutrients
                </h2>
                <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded-full border ${
                  activeNutrientCount === 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    : activeNutrientCount >= 8
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-orange-50 text-orange-600 border-orange-200/80"
                }`}>
                  {activeNutrientCount === 0 ? "✨ Zen Calorie Mode (0/8)" : `${activeNutrientCount}/8 Active Slots`}
                </span>
              </div>
              <p className="text-[10px] text-stone-400 font-medium">
                Choose which macro & micro nutrient cards float on your daily view.
              </p>

              {/* AI Explanation Sub-badge */}
              {aiAppliedReason && (
                <div className="p-3 bg-orange-50/80 border border-orange-200/80 rounded-2xl text-[10.5px] font-bold text-orange-950 flex items-center justify-between gap-2 animate-fadeIn shadow-3xs text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="leading-snug">{aiAppliedReason}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiAppliedReason("")}
                    className="text-orange-400 hover:text-orange-700 bg-transparent border-none cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Search Dropdown Input */}
            <div ref={nutrientDropdownRef} className="relative">
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
                        <StepperButton
                          onStep={() => {
                            const val = Math.max(0, (n.target || 10) - 5);
                            setTrackedNutrientList(prev => prev.map(item => item.id === n.id ? { ...item, target: val } : item));
                            if (["protein", "carbs", "fats", "fiber"].includes(n.id)) {
                              handleMacroChange(n.id as any, val);
                            }
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </StepperButton>
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
                        <StepperButton
                          onStep={() => {
                            const val = (n.target || 0) + 5;
                            setTrackedNutrientList(prev => prev.map(item => item.id === n.id ? { ...item, target: val } : item));
                            if (["protein", "carbs", "fats", "fiber"].includes(n.id)) {
                              handleMacroChange(n.id as any, val);
                            }
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer border-none bg-transparent active:scale-90"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </StepperButton>
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

            {/* Simple Text Trigger at the end of Step 4 */}
            <div className="pt-2 border-t border-stone-100">
              {!showAiGoalInput ? (
                <button
                  type="button"
                  onClick={() => setShowAiGoalInput(true)}
                  className="w-full text-center text-xs font-bold text-orange-500 hover:text-orange-600 hover:underline cursor-pointer bg-transparent border-none py-1.5 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Generate Nutrients with AI</span>
                </button>
              ) : (
                <div className="space-y-2 animate-fadeIn text-left pt-1">
                  <textarea
                    rows={2}
                    placeholder="Describe health conditions or diet goals (e.g. Thyroid, Diabetes, Keto)..."
                    value={aiGoalPrompt}
                    onChange={(e) => setAiGoalPrompt(e.target.value)}
                    className="w-full bg-white border border-stone-200/90 focus:border-orange-500 focus:outline-none rounded-xl p-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 resize-none min-h-[56px] shadow-2xs leading-relaxed"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAiGoalInput(false)}
                      className="h-10 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-3xs"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAiGoal}
                      disabled={isAiGoalLoading || !aiGoalPrompt.trim() || isPromptGenerated}
                      className={`h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center border-none ${
                        isPromptGenerated
                          ? "bg-stone-200 text-stone-500 cursor-not-allowed shadow-none"
                          : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white cursor-pointer active:scale-95 shadow-md shadow-orange-500/20 disabled:opacity-40"
                      }`}
                    >
                      <span>{isAiGoalLoading ? "Generating..." : isPromptGenerated ? "Generated ✓" : "Generate"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: DAILY VITALS */}
        {step === 5 && (
          <div className="space-y-4 animate-fadeIn py-2">
            <div className="text-center space-y-0.5">
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                Daily Vitals
              </h2>
            </div>

            {/* Simple Question Toggles */}
            <div className="space-y-3">
              {[
                { id: "weight", question: "Track Daily Weight?", desc: "Body weight logs & trendlines", defaultOn: true },
                { id: "water", question: "Track Water Intake?", desc: "Daily hydration volume counter", defaultOn: false },
                { id: "digestion", question: "Track Gut & Digestion?", desc: "Bristol stool spectrum & comfort", defaultOn: false },
                { id: "energy", question: "Track Daily Energy?", desc: "1 to 5 vitality & mood scale", defaultOn: false },
                { id: "bloating", question: "Track Stomach Bloating?", desc: "4-level stomach distension & gas tightness", defaultOn: true },
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

        {/* STEP 6: AI MEAL TAGS (CLEAN 1-LINE CARD MODEL) */}
        {step === 6 && (
          <div className="space-y-3 animate-fadeIn py-2 text-left">
            <div className="text-center space-y-0.5">
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                AI Meal Tags
              </h2>
            </div>

            {/* Explanatory Callout Note */}
            <div className="bg-orange-50/70 border border-orange-200/70 rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-black text-orange-950 uppercase tracking-wider">
                What are AI Tags?
              </div>
              <p className="text-[10.5px] text-orange-900/80 font-medium leading-relaxed">
                FitAI automatically labels your logged meals with these tags so you can filter past logs in 1 tap and track habits (like Homemade vs Outside Food). Nutrients like Protein & Fiber are tracked separately via filters.
              </p>
            </div>

            {/* Search Dropdown Input for AI Meal Tags */}
            <div ref={tagDropdownRef} className="relative">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="+ Add Tag (Gluten Free, Halal, Keto...)"
                  value={tagSearchQuery}
                  onFocus={() => setIsTagDropdownOpen(true)}
                  onChange={(e) => {
                    setTagSearchQuery(e.target.value);
                    setIsTagDropdownOpen(true);
                  }}
                  className="w-full bg-white border border-stone-200/90 rounded-2xl pl-9 pr-8 py-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 shadow-2xs transition-all"
                />
                {tagSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setTagSearchQuery("");
                      setIsTagDropdownOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 border-none bg-transparent cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search Dropdown Catalog */}
              {isTagDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto p-1.5 space-y-1 animate-fadeIn">
                  {/* Matching Inactive Catalog Tags */}
                  {filteredTagCatalog.length > 0 ? (
                    filteredTagCatalog.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setAiTrackingTags(prev => {
                            const exists = prev.some(t => t.id === item.id);
                            if (exists) {
                              return prev.map(t => t.id === item.id ? { ...t, enabled: true } : t);
                            }
                            return [...prev, { ...item, enabled: true }];
                          });
                          setTagSearchQuery("");
                          setIsTagDropdownOpen(false);
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-orange-50/60 text-left flex items-center justify-between border-none bg-transparent cursor-pointer transition-colors group"
                      >
                        <div>
                          <div className="text-xs font-black text-stone-900 uppercase group-hover:text-orange-600">
                            {item.name}
                          </div>
                          <div className="text-[10px] font-medium text-stone-400">
                            {item.description}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-orange-500 shrink-0 ml-2" />
                      </button>
                    ))
                  ) : (
                    <div className="p-2.5 text-center text-xs font-medium text-stone-400">
                      No matching default tags found
                    </div>
                  )}

                  {/* + Custom Tag Option */}
                  <div className="border-t border-stone-100 pt-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomTagForm(true);
                        if (tagSearchQuery.trim()) {
                          setCustomTagName(tagSearchQuery.trim());
                        }
                        setIsTagDropdownOpen(false);
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-orange-50 text-left flex items-center justify-between border-none bg-transparent cursor-pointer transition-colors text-orange-600 font-black text-xs uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>{tagSearchQuery.trim() ? `Create Custom Tag "${tagSearchQuery.trim()}"` : "Create Custom Tag"}</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Tag Form */}
            {showCustomTagForm && (
              <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 space-y-2.5 animate-fadeIn shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-stone-700 tracking-wider">Create Custom AI Tag</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomTagForm(false)}
                    className="text-stone-400 hover:text-stone-600 border-none bg-transparent cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Tag Name (e.g. Low Sodium)"
                  value={customTagName}
                  onChange={(e) => setCustomTagName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-850 focus:outline-none focus:border-orange-500"
                />
                <input
                  type="text"
                  placeholder="AI prompt rule (e.g. Apply when meal has under 300mg sodium)"
                  value={customTagRule}
                  onChange={(e) => setCustomTagRule(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 focus:outline-none focus:border-orange-500"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCustomTagForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-bold border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCustomTag}
                    disabled={!customTagName.trim()}
                    className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-black uppercase tracking-wider border-none cursor-pointer disabled:opacity-40"
                  >
                    Add Tag
                  </button>
                </div>
              </div>
            )}

            {/* Active Tag List Header */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                Active AI Meal Tags ({aiTrackingTags.filter(t => t.enabled).length})
              </label>
            </div>

            {/* Tag List Cards */}
            <div className="space-y-2.5">
              {aiTrackingTags.filter(t => t.enabled).map((t) => {
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
                        <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">{t.name}</h4>
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

                        {/* Vibrant Orange Active Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => toggleAiTag(t.id)}
                          className="w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer border-none shrink-0 bg-orange-500"
                          title="Deactivate tag"
                        >
                          <div className="bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform translate-x-4" />
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

        {/* STEP 7: AI PLAN GENERATION ANIMATION (FINAL ONBOARDING STEP) */}
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

            {generationProgress >= 90 && (
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="mt-4 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-100 transition-all cursor-pointer border-none animate-fadeIn"
              >
                {isSubmitting ? "Saving Protocol..." : "Enter FitAI Dashboard →"}
              </button>
            )}
          </div>
        )}

      </div>

      {/* Navigation Footer */}
      {step !== 7 && (
        <div className="sticky bottom-0 z-30 pt-6 pb-2 bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6]/95 to-transparent flex gap-4 shrink-0">
          <button
            type="button"
            onClick={step === 6 ? () => setStep(7) : handleNext}
            disabled={!isStepValid() || isSubmitting}
            className={`w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
              (!isStepValid() || isSubmitting) ? "opacity-50 cursor-not-allowed shadow-none" : "shadow-lg shadow-orange-100 active:scale-[0.98]"
            }`}
          >
            <span>
              {step === 6
                ? "Finish Setup"
                : "Continue"}
            </span>
            {step === 6 ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* TERMS MODAL POPUP */}
      {showTermsModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-end justify-center font-sans"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowTermsModal(false);
            }}
          >
            <div
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm cursor-pointer touch-none"
              onClick={() => setShowTermsModal(false)}
            />
            <div className="bg-[#FAF7F2] rounded-t-[36px] p-6 pb-[max(20px,env(safe-area-inset-bottom,20px))] max-w-md w-full shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-x border-stone-200/80 space-y-4 max-h-[85vh] overflow-y-auto relative z-10 overscroll-contain touch-pan-y text-left">
              {/* Top Drag Indicator Pill */}
              <div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-1 shrink-0 select-none" />

              <div className="flex justify-between items-center border-b border-stone-200/60 pb-3 select-none">
                <h3 className="text-base font-black text-stone-900">FitAI Terms & Conditions</h3>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold border-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs text-stone-700 font-medium">
                {TERMS_AND_CONDITIONS.map((section, idx) => (
                  <div key={idx} className="space-y-1 bg-white border border-stone-200/80 rounded-2xl p-3.5 shadow-3xs">
                    <div className="font-black text-orange-950 uppercase text-[10px] tracking-wider">{section.title}</div>
                    <p className="leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl cursor-pointer border-none shadow-md shadow-orange-500/20 active:scale-98 transition-all"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};
