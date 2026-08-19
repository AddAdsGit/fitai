import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Utensils,
  Camera,
  Minus,
  Plus,
  Sparkles,
  Loader2,
  Tag,
  Edit2,
  Share2,
  Clock,
  Flame,
  Trash2,
  ArrowLeft,
  Check,
  Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import type { Recipe, TrackedNutrient } from "../types";
import { hasNoGeneratedImage, formatNutrientValue } from "../utils/helpers";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { getBestGeminiModel } from "../utils/geminiFoodAnalysis";
import { DEFAULT_TRACKED_NUTRIENTS, normalizeTrackedNutrients } from "../constants/nutrition";
import { StepperButton } from "./StepperButton";
import { getUserActiveAiTags } from "../utils/foodFilter";

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onSaveRecipe: (recipe: Recipe) => Promise<void> | void;
  onDeleteRecipe: (recipeId: string) => void;
  onAddMeal: (meal: any) => void;
  onShareRecipe: (recipe: Recipe) => void;
  isEditingInitially?: boolean;
  profileData?: any;
  setToastMessage: (msg: string) => void;
}

// Fallback high quality food image
const FALLBACK_RECIPE_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80";

export const RecipeModal: React.FC<RecipeModalProps> = ({
  recipe,
  onClose,
  onSaveRecipe,
  onDeleteRecipe,
  onAddMeal,
  onShareRecipe,
  isEditingInitially = false,
  profileData,
  setToastMessage,
}) => {
  if (!recipe) return null;

  const isNewRecipe = recipe.id === "new" || recipe.id?.toString().startsWith("new-ai-");
  const [isEditing, setIsEditing] = useState<boolean>(isEditingInitially || isNewRecipe);
  const [isAiMode, setIsAiMode] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Present Active Tracked Nutrients only
  const activeTrackedNutrients: TrackedNutrient[] = normalizeTrackedNutrients(
    profileData?.tracked_nutrients || DEFAULT_TRACKED_NUTRIENTS,
    profileData?.protein_goal
  );

  // Form Field States
  const [name, setName] = useState(recipe.name || "");
  const [time, setTime] = useState(recipe.time || "15 mins");
  const [calories, setCalories] = useState(recipe.calories ? String(recipe.calories) : "");
  const [description, setDescription] = useState(recipe.description || "");
  const [tags, setTags] = useState<string[]>(recipe.tags || ["Custom"]);
  const [image, setImage] = useState(recipe.image || "");
  const [ingredientsText, setIngredientsText] = useState((recipe.ingredients || []).join("\n"));
  const [instructions, setInstructions] = useState(recipe.instructions || "");
  
  // Dynamic nutrient values for present tracked nutrients only
  const [editableNutrients, setEditableNutrients] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    activeTrackedNutrients.forEach((n) => {
      if (recipe) {
        if (n.id === "protein") initialMap.protein = recipe.protein || 0;
        else if (n.id === "carbs") initialMap.carbs = recipe.carbs || 0;
        else if (n.id === "fats") initialMap.fats = recipe.fats || 0;
        else if (n.id === "fiber") initialMap.fiber = recipe.fiber || 0;
        else initialMap[n.id] = (recipe as any).nutrients?.[n.id] || 0;
      } else {
        initialMap[n.id] = 0;
      }
    });
    return initialMap;
  });

  // Available AI Tracking Tags (strictly from user profile)
  const availableTags = useMemo(() => {
    return getUserActiveAiTags(profileData?.tracking_tags);
  }, [profileData?.tracking_tags]);

  // AI States
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiCalculating, setIsAiCalculating] = useState(false);

  // Sync state when recipe changes
  useEffect(() => {
    if (recipe) {
      const isNew = recipe.id === "new" || recipe.id?.toString().startsWith("new-ai-");
      setIsEditing(isEditingInitially || isNew);
      setName(recipe.name || "");
      setTime(recipe.time || "15 mins");
      setCalories(recipe.calories ? String(recipe.calories) : "");
      setDescription(recipe.description || "");
      setTags(recipe.tags || ["Custom"]);
      setImage(recipe.image || "");
      setIngredientsText((recipe.ingredients || []).join("\n"));
      setInstructions(recipe.instructions || "");
      setShowDeleteConfirm(false);

      const initialMap: Record<string, number> = {};
      activeTrackedNutrients.forEach((n) => {
        if (n.id === "protein") initialMap.protein = recipe.protein || 0;
        else if (n.id === "carbs") initialMap.carbs = recipe.carbs || 0;
        else if (n.id === "fats") initialMap.fats = recipe.fats || 0;
        else if (n.id === "fiber") initialMap.fiber = recipe.fiber || 0;
        else initialMap[n.id] = (recipe as any).nutrients?.[n.id] || 0;
      });
      setEditableNutrients(initialMap);
    }
  }, [recipe, isEditingInitially]);

  const handleNutrientValueChange = (id: string, valStr: string) => {
    const numVal = parseInt(valStr, 10);
    const validVal = isNaN(numVal) ? 0 : Math.max(0, numVal);
    setEditableNutrients((prev) => ({
      ...prev,
      [id]: validVal,
    }));
  };

  const handleNutrientStep = (id: string, delta: number) => {
    setEditableNutrients((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        [id]: next,
      };
    });
  };

  // Handle AI Recipe Generation
  const handleGenerateRecipeWithAi = async () => {
    if (!aiPrompt.trim()) return;

    const geminiKeyTag = (profileData?.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
    const key = geminiKeyTag.split(":")[1] || "";

    setIsAiGenerating(true);
    try {
      let rawText = "";
      const prompt = `Create a gourmet healthy recipe based on: "${aiPrompt}". Return ONLY valid JSON format: {"name":"...","time":"...","calories":0,"protein":0,"carbs":0,"fats":0,"fiber":0,"description":"...","ingredients":["..."],"instructions":"..."}`;

      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.functions.invoke("gemini", { body: { prompt, userApiKey: key || undefined } });
          if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            rawText = data.candidates[0].content.parts[0].text;
          } else if (data?.text) {
            rawText = data.text;
          }
        } catch (e) {
          console.warn("Edge function recipe generation error:", e);
        }
      }

      if (!rawText && key) {
        for (const modelName of ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-2.0-flash-lite"]) {
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  responseMimeType: "application/json"
                }
              })
            });
            if (response.ok) {
              const data = await response.json();
              const parts = data.candidates?.[0]?.content?.parts || [];
              rawText = parts.map((p: any) => p.text || "").join("\n") || data.text || "";
              if (rawText) break;
            }
          } catch (_) {}
        }
      }

      let cleaned = rawText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      const parsed = cleaned ? JSON.parse(cleaned) : null;
      if (parsed) {
        setName(parsed.name || name);
        setTime(parsed.time || time);
        setCalories(String(parsed.calories || 350));
        setEditableNutrients((prev) => ({
          ...prev,
          protein: parsed.protein || prev.protein || 25,
          carbs: parsed.carbs || prev.carbs || 35,
          fats: parsed.fats || prev.fats || 12,
          fiber: parsed.fiber || prev.fiber || 6,
        }));
        setDescription(parsed.description || description);
        if (Array.isArray(parsed.ingredients)) {
          setIngredientsText(parsed.ingredients.join("\n"));
        }
        setInstructions(parsed.instructions || instructions);
        setIsAiMode(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Estimate Nutrients from Ingredients list
  const handleAutoFillNutrients = () => {
    if (!ingredientsText.trim()) {
      return;
    }
    setIsAiCalculating(true);
    setTimeout(() => {
      const ings = ingredientsText.split("\n").map(s => s.trim()).filter(Boolean);
      const estimatedCalories = Math.max(150, ings.length * 110);
      const estimatedProtein = Math.max(10, Math.round(estimatedCalories * 0.08));
      const estimatedCarbs = Math.max(12, Math.round(estimatedCalories * 0.1));
      const estimatedFats = Math.max(5, Math.round(estimatedCalories * 0.03));
      const estimatedFiber = Math.max(3, Math.round(ings.length * 1.5));

      setCalories(String(estimatedCalories));
      setEditableNutrients((prev) => ({
        ...prev,
        protein: estimatedProtein,
        carbs: estimatedCarbs,
        fats: estimatedFats,
        fiber: estimatedFiber,
      }));
      setIsAiCalculating(false);
    }, 500);
  };

  const handleSave = async () => {
    const finalName = name.trim() || "Custom Recipe";
    const finalIngredients = ingredientsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedRecipe: Recipe = {
      ...recipe,
      id: isNewRecipe ? `rec-${Date.now()}` : recipe.id,
      name: finalName,
      time: time.trim() || "15 mins",
      calories: parseInt(calories) || 0,
      protein: editableNutrients.protein || 0,
      carbs: editableNutrients.carbs || 0,
      fats: editableNutrients.fats || 0,
      fiber: editableNutrients.fiber || 0,
      nutrients: editableNutrients,
      description: description.trim(),
      tags: tags.length > 0 ? tags : ["Custom"],
      image: image || recipe.image || FALLBACK_RECIPE_IMAGE,
      ingredients: finalIngredients,
      instructions: instructions.trim() || "Mix ingredients and serve fresh!",
    };

    await onSaveRecipe(updatedRecipe);
    setIsEditing(false);
    setIsAiMode(false);
  };

  const handleLogMeal = () => {
    onAddMeal({
      name: recipe.name,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fats: recipe.fats,
      fiber: recipe.fiber || 0,
      nutrients: editableNutrients,
      image: recipe.image || FALLBACK_RECIPE_IMAGE,
      type: "Recipe",
    });
    onClose();
  };

  const activeImage = image || recipe.image || FALLBACK_RECIPE_IMAGE;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-md z-[9999] flex items-end justify-center font-sans"
      >
        {/* Sliding Bottom Sheet Panel */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 240 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#FAF7F2] rounded-t-[36px] overflow-hidden flex flex-col max-h-[92vh] shadow-2xl z-10 border-t border-white/20 text-left font-sans"
          >
            {/* Scrollable Container (Image Header scrolls up naturally, CTA stays sticky at bottom) */}
            <div className="flex-1 overflow-y-auto min-h-0 text-left font-sans">
              {/* Full-Bleed Hero Cover Image Header (Bleeds to top border with zero white frame) */}
              <div className="relative w-full h-56 sm:h-60 shrink-0 overflow-hidden shadow-md group bg-stone-900">
                {!hasNoGeneratedImage(activeImage) ? (
                  <img
                    src={activeImage}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={name || recipe.name}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-850 to-stone-950 flex items-center justify-center">
                    <Utensils className="w-12 h-12 text-white opacity-20" />
                  </div>
                )}

                {/* Dark Ambient Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-black/20 pointer-events-none" />

                {/* Top Controls: Back (Left) + Camera (Edit Mode Only) + Circular Share (Right) */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          if (isNewRecipe) {
                            onClose();
                          } else {
                            setIsEditing(false);
                          }
                        } else {
                          onClose();
                        }
                      }}
                      className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                      title="Back"
                    >
                      <ArrowLeft className="w-4 h-4 text-white" />
                    </button>

                    {isEditing && (
                      <label className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md" title="Change / Upload Photo">
                        <Camera className="w-4 h-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImage(reader.result as string);
                                if (!isEditing) setIsEditing(true);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isNewRecipe && onShareRecipe && (
                      <button
                        type="button"
                        onClick={() => onShareRecipe(recipe)}
                        className="h-8 px-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer border border-orange-400/40"
                        title="Share recipe card"
                      >
                        <Share2 className="w-3.5 h-3.5 text-white" />
                        <span>Share</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Image Overlay: Single Frosted Pill + Hero Title + Clean Grey Metadata */}
                <div className="absolute bottom-4 left-4 right-4 z-10 text-left space-y-1.5">
                  {/* Recipe Log Count Frosted Pill (High contrast dark frosted capsule) */}
                  {!isNewRecipe && (
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-black/65 backdrop-blur-md border border-orange-400/50 px-3 py-1 rounded-full shadow-md">
                        <span className="w-2 h-2 rounded-full bg-orange-400 shadow-xs shadow-orange-400/80 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-300">
                          Logged {recipe.log_count || 1} time{(recipe.log_count || 1) === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Full Width Recipe Title */}
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-md truncate font-sans leading-tight text-white">
                    {isEditing ? name || "Unnamed Recipe" : recipe.name}
                  </h3>

                  {/* Clean Grey Text Metadata Line (Below Title) */}
                  <div className="flex items-center gap-1.5 text-stone-300 text-[11px] font-bold tracking-wide drop-shadow-sm">
                    <span className="text-orange-400 font-extrabold">{isEditing ? calories || "0" : recipe.calories || "0"} KCAL</span>
                    <span className="text-stone-400 select-none">•</span>
                    <span>{isEditing ? time || "15 mins" : recipe.time || "15 mins"}</span>
                  </div>
                </div>
              </div>

              {/* Scrollable Modal Body Content */}
              <div className="p-5 space-y-4 text-left">
            {!isEditing ? (
              /* VIEW MODE: Section Order -> Quick Stats, Description, Ingredients, Instructions, Nutrients, Tags */
              <div className="space-y-4 text-left font-sans">
                {/* 1. Quick Stats Banner (Prep Duration & Total Calories) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white border border-stone-200/80 rounded-2xl p-3 shadow-3xs flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-black uppercase text-stone-400 tracking-wider block">
                        Prep Duration
                      </span>
                      <span className="text-xs font-black text-stone-900 truncate block">
                        {recipe.time || "15 mins"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-stone-200/80 rounded-2xl p-3 shadow-3xs flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                      <Flame className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-black uppercase text-orange-600 tracking-wider block">
                        Total Energy
                      </span>
                      <span className="text-xs font-black text-stone-900 truncate block">
                        {recipe.calories || "0"} kcal
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Description detail */}
                {recipe.description && (
                  <p className="text-xs text-stone-700 font-medium leading-relaxed bg-white border border-stone-200/80 rounded-2xl p-4 shadow-3xs italic">
                    "{recipe.description}"
                  </p>
                )}

                {/* 3. Ingredients detail */}
                <div className="space-y-2">
                  <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-widest block">
                    Ingredients Needed
                  </span>
                  <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-3xs space-y-2">
                    {(recipe.ingredients || []).map((ing: string, i: number) => (
                      <div key={i} className="text-xs font-bold text-stone-800 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                        <span>{ing}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Instructions detail */}
                <div className="space-y-2">
                  <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-widest block">
                    Step-by-Step Instructions
                  </span>
                  <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-3xs">
                    <p className="text-xs text-stone-800 font-medium leading-relaxed whitespace-pre-line">
                      {recipe.instructions || "Mix ingredients and serve fresh!"}
                    </p>
                  </div>
                </div>

                {/* 5. Macronutrient Density (Present Tracked Nutrients Only) */}
                <div className="pt-2 border-t border-stone-200/60 space-y-2">
                  <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider block">
                    Macronutrient Density
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    {activeTrackedNutrients.map((n) => {
                      const val = editableNutrients[n.id] ?? 0;
                      return (
                        <div
                          key={n.id}
                          className="p-3 rounded-2xl border flex flex-col justify-between space-y-1 shadow-3xs"
                          style={{
                            backgroundColor: `${n.color}12`,
                            borderColor: `${n.color}35`,
                          }}
                        >
                          <span className="text-[9.5px] font-black uppercase tracking-wider truncate" style={{ color: n.color }}>
                            {n.name}
                          </span>
                          <div className="bg-white border border-stone-200/80 rounded-xl px-2 py-1 text-center shadow-inner">
                            <span className="text-xs font-black text-stone-900">{formatNutrientValue(val)} {n.unit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Dietary & Tracking Tags (At the Very Bottom) */}
                {tags.length > 0 && (
                  <div className="pt-2 border-t border-stone-200/60 space-y-2">
                    <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-widest block">
                      Dietary & Tracking Tags
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold shadow-3xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* EDIT / CREATE MODE */
              <div className="space-y-3.5 text-left font-sans">
                {/* 1. Recipe Name */}
                <div>
                  <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                    Recipe Name / Title
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Avocado Spinach Crunch Bowl"
                    className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl px-3.5 py-2.5 text-xs font-black text-stone-900 shadow-3xs"
                  />
                </div>

                {/* 2. Expandable Description */}
                <div>
                  <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Rich, nutrient-packed post-workout bowl..."
                    className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl p-3 text-xs font-medium text-stone-800 shadow-3xs resize-y min-h-[96px] max-h-[220px] leading-relaxed"
                  />
                </div>

                {/* 3. Calories & Prep Duration */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8.5px] font-black text-orange-500 uppercase tracking-widest block mb-1">
                      Calories
                    </label>
                    <div className="flex items-center bg-orange-50/80 border border-orange-200 focus-within:border-orange-500 focus-within:bg-white rounded-2xl px-1.5 py-1 shadow-3xs transition-all">
                      <StepperButton
                        onStep={() => {
                          setCalories((prev) => {
                            const c = parseInt(prev) || 0;
                            return String(Math.max(0, c - 25));
                          });
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-950/50 hover:text-orange-950 hover:bg-orange-100/60 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </StepperButton>
                      <div className="flex-1 flex items-center justify-center gap-0.5">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={calories === "0" ? "" : calories}
                          onChange={(e) => setCalories(e.target.value)}
                          className="bg-transparent border-none text-center text-xs font-black text-orange-950 focus:outline-none w-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] font-black uppercase text-orange-900/60 select-none">
                          kcal
                        </span>
                      </div>
                      <StepperButton
                        onStep={() => {
                          setCalories((prev) => {
                            const c = parseInt(prev) || 0;
                            return String(c + 25);
                          });
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-950/50 hover:text-orange-950 hover:bg-orange-100/60 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </StepperButton>
                    </div>
                  </div>
                  <div>
                    <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                      Prep Duration
                    </label>
                    <div className="flex items-center bg-stone-50 border border-stone-200 focus-within:border-orange-500 focus-within:bg-white rounded-2xl px-1.5 py-1 shadow-3xs transition-all">
                      <StepperButton
                        onStep={() => {
                          const currentMins = parseInt(time.replace(/\D+/g, ""), 10) || 15;
                          const nextMins = Math.max(5, currentMins - 5);
                          setTime(`${nextMins} mins`);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </StepperButton>
                      <div className="flex-1 flex items-center justify-center gap-0.5">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="15"
                          value={time ? String(parseInt(time.replace(/\D+/g, ""), 10) || "") : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setTime("");
                            } else {
                              setTime(`${val} mins`);
                            }
                          }}
                          className="bg-transparent border-none text-center text-xs font-black text-stone-900 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] font-black uppercase text-stone-400 select-none">
                          mins
                        </span>
                      </div>
                      <StepperButton
                        onStep={() => {
                          const currentMins = parseInt(time.replace(/\D+/g, ""), 10) || 15;
                          const nextMins = currentMins + 5;
                          setTime(`${nextMins} mins`);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </StepperButton>
                    </div>
                  </div>
                </div>

                {/* 4. Expandable Raw Ingredients Textarea */}
                <div>
                  <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                    Raw Ingredients (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={ingredientsText}
                    onChange={(e) => setIngredientsText(e.target.value)}
                    placeholder="e.g.&#10;2 whole Avocados&#10;100g Fresh Spinach&#10;1 scoop Whey Protein"
                    className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl p-3 text-xs font-medium text-stone-800 shadow-3xs resize-y min-h-[80px] max-h-[200px]"
                  />
                </div>

                {/* 5. Expandable Cooking Instructions */}
                <div>
                  <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                    Cooking Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Mash avocados and fold in spinach slowly. Serve chilled!"
                    className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl p-3 text-xs font-medium text-stone-800 shadow-3xs resize-y min-h-[80px] max-h-[200px]"
                  />
                </div>

                {/* 6. Present Tracked Nutrients with Signature Steppers (At Last) */}
                <div className="pt-2 border-t border-stone-200/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider block">
                      Nutrient Density
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoFillNutrients}
                      className="text-[9px] font-black uppercase tracking-wider text-orange-600 hover:text-orange-700 cursor-pointer flex items-center gap-1 active:scale-95 bg-transparent border-none"
                    >
                      <Wand2 className="w-3 h-3 text-orange-500" />
                      <span>{isAiCalculating ? "Calculating..." : "Calculate Nutrients"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left">
                    {activeTrackedNutrients.map((nutrient) => {
                      const currentVal = editableNutrients[nutrient.id] ?? 0;
                      return (
                        <div
                          key={nutrient.id}
                          className="p-3 rounded-2xl border flex flex-col justify-between space-y-1 shadow-3xs"
                          style={{
                            backgroundColor: `${nutrient.color}12`,
                            borderColor: `${nutrient.color}35`,
                          }}
                        >
                          <span
                            className="text-[9.5px] font-black uppercase tracking-wider truncate"
                            style={{ color: nutrient.color }}
                          >
                            {nutrient.name}
                          </span>
                          <div className="flex items-center justify-between bg-white border border-stone-200/80 rounded-xl px-1.5 py-1 shadow-inner">
                            <StepperButton
                              onStep={() => handleNutrientStep(nutrient.id, -1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                            >
                              <Minus className="w-3 h-3" />
                            </StepperButton>
                            <span className="text-xs font-black text-stone-900">
                              {currentVal} {nutrient.unit}
                            </span>
                            <StepperButton
                              onStep={() => handleNutrientStep(nutrient.id, 1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                            >
                              <Plus className="w-3 h-3" />
                            </StepperButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 7. Dietary & Tracking Tags (At the Very Bottom) */}
                <div className="pt-2 border-t border-stone-200/60 space-y-2">
                  <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-widest block">
                    Dietary & Tracking Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {availableTags.map((tag) => {
                      const isSelected = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setTags(tags.filter((t) => t !== tag));
                            } else {
                              setTags([...tags, tag]);
                            }
                          }}
                          className={cn(
                            "px-3.5 py-1.5 rounded-2xl text-xs font-bold tracking-wide transition-all border cursor-pointer select-none active:scale-95 shadow-3xs",
                            isSelected
                              ? "bg-orange-500 text-white border-orange-500 font-black shadow-2xs"
                              : "bg-white text-stone-600 border-stone-200 hover:bg-orange-50/50"
                          )}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Minimalist Capsule Delete Option */}
            {!isNewRecipe && onDeleteRecipe && (
              <div className="pt-3 pb-1 flex justify-center border-t border-stone-200/50">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-[10px] font-bold text-stone-400 hover:text-red-500 uppercase tracking-widest cursor-pointer transition-colors bg-transparent border-none py-1 active:scale-95"
                  >
                    Delete Recipe
                  </button>
                ) : (
                  <div className="flex items-center gap-3 bg-red-50/90 border border-red-200/80 px-3.5 py-1.5 rounded-full animate-fade-in shadow-3xs">
                    <span className="text-[10.5px] font-bold text-red-950">Delete recipe?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteRecipe(recipe.id);
                        onClose();
                      }}
                      className="text-[10px] font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-full cursor-pointer transition-all active:scale-95 border-none"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800 cursor-pointer bg-transparent border-none"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

          {/* Bottom Sticky Action Footer Bar */}
          <div className="sticky bottom-0 p-4 bg-white/95 backdrop-blur-md border-t border-stone-200/60 shrink-0 font-sans space-y-2.5 z-20">
            {!isEditing ? (
              <div className="space-y-2.5">
                {/* Row 1: White Edit Button */}
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full h-11 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/90 text-xs font-black uppercase tracking-wider cursor-pointer shadow-3xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-stone-600" />
                  <span>Edit Recipe</span>
                </button>

                {/* Row 2: Full-Width Vibrant Orange Log Button */}
                <button
                  type="button"
                  onClick={handleLogMeal}
                  className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none"
                >
                  <Utensils className="w-4 h-4 text-white stroke-[2.5]" />
                  <span>Log Recipe (1-Tap)</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* STICKY BOTTOM DOCKED AI PANEL */}
                {isAiMode ? (
                  <div className="space-y-2.5 animate-fade-in text-left">
                    <textarea
                      rows={3}
                      placeholder="Describe changes (e.g. Add 20g protein, swap rice with quinoa, reduce oil)..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 focus:bg-white focus:outline-none rounded-2xl p-3 text-xs font-bold text-stone-900 placeholder:text-stone-400 resize-y min-h-[84px] max-h-[160px] shadow-inner leading-relaxed"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAiMode(false);
                          setAiPrompt("");
                        }}
                        className="h-10 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-3xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateRecipeWithAi}
                        disabled={isAiGenerating || !aiPrompt.trim()}
                        className="h-10 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-md shadow-orange-500/25 flex items-center justify-center gap-1.5 disabled:opacity-40 border-none"
                      >
                        {isAiGenerating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Transforming...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3.5 h-3.5 text-white" />
                            <span>Transform</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Row 1: White AI Button */
                  <button
                    type="button"
                    onClick={() => setIsAiMode(true)}
                    className="w-full h-11 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/90 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wider active:scale-95 shadow-3xs"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-orange-500" />
                    <span>Edit with AI Assist</span>
                  </button>
                )}

                {/* Row 2: Full-Width Vibrant Orange Save Button */}
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 border-none"
                >
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                  <span>Save Recipe</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
