import React, { useState, useEffect, useMemo } from "react";
import {
  Utensils,
  Camera,
  X,
  Minus,
  Plus,
  Sparkles,
  Loader2,
  Tag,
  Edit2,
  Share2,
  Clock,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import type { Recipe, TrackedNutrient } from "../types";
import { hasNoGeneratedImage } from "../utils/helpers";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { DEFAULT_TRACKED_NUTRIENTS, normalizeTrackedNutrients } from "../constants/nutrition";

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

  // Available tracking tags combining profile tags and presets
  const availableTags = useMemo(() => {
    const userTrackingTags = (profileData?.tracking_tags || [])
      .filter((t: any) => t.enabled !== false)
      .map((t: any) => t.name);
    
    return Array.from(new Set([...userTrackingTags, "High Protein", "Keto", "Gluten Free", "Vegan", "Low Carb", "Dairy Free", "Low Calorie", ...tags]));
  }, [profileData?.tracking_tags, tags]);

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

      if (key) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });
        const data = await response.json();
        rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else if (isSupabaseConfigured) {
        const { data } = await supabase.functions.invoke("gemini", { body: { prompt } });
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          rawText = data.candidates[0].content.parts[0].text;
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
        setToastMessage("Recipe generated by FitAI! ✨");
      }
    } catch (e) {
      console.error(e);
      setToastMessage("Failed to generate recipe with AI");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Estimate Nutrients from Ingredients list
  const handleAutoFillNutrients = () => {
    if (!ingredientsText.trim()) {
      setToastMessage("Please enter ingredients first to auto-calculate! 🥦");
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
      setToastMessage("Nutrients calculated from ingredients! ✨");
    }, 600);
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-md z-[100] flex items-end justify-center font-sans"
      >
        {/* Sliding Bottom Sheet Panel */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="bg-[#FAF7F2] rounded-t-[36px] w-full max-w-md h-[90vh] overflow-hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-x border-stone-200/80 relative"
        >
          {/* Full-Bleed Hero Cover Image Header */}
          <div className="relative w-full h-52 shrink-0 overflow-hidden shadow-md group bg-stone-900">
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

            {/* Top Controls: Camera Upload (Left) + Share Icon & Close Icon (Right) */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="relative">
                <label className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md">
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
              </div>

              <div className="flex items-center gap-2">
                {!isNewRecipe && (
                  <button
                    type="button"
                    onClick={() => onShareRecipe(recipe)}
                    className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                    title="Share recipe card"
                  >
                    <Share2 className="w-4 h-4 text-white" />
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                  title="Close modal"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Bottom Image Overlay: Clean Subtitle + Title (Left) and Single Unified Stat Pill (Right) */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white z-10">
              <div className="min-w-0 flex-1 pr-3 text-left">
                {/* Subtle Metadata Subtitle: Log Count */}
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-300 drop-shadow-xs block mb-0.5">
                  Logged {recipe.log_count || 0} time{(recipe.log_count || 0) === 1 ? "" : "s"}
                </span>

                <h3 className="text-xl font-black tracking-tight drop-shadow-md truncate font-sans leading-tight text-white">
                  {isEditing ? name || "Unnamed Recipe" : recipe.name}
                </h3>
              </div>

              {/* Single Unified Frosted Glassmorphic Stat Pill */}
              <div className="bg-black/50 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full shadow-md text-center flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-black tracking-wider uppercase text-white block">
                  {isEditing ? calories || "0" : recipe.calories || "0"} KCAL
                </span>
                <span className="text-white/40 text-[10px] select-none">•</span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-white/90 block">
                  {isEditing ? time || "15 mins" : recipe.time || "15 mins"}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left min-h-0">
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
                            <span className="text-xs font-black text-stone-900">{val} {n.unit}</span>
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
            ) : isAiMode ? (
              /* AI ASSIST RECIPE GENERATOR */
              <div className="space-y-3.5 text-left font-sans animate-fade-in">
                <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Generate Recipe with AI</span>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-3xs space-y-3">
                  <p className="text-xs text-stone-500 font-medium leading-relaxed font-sans">
                    Describe what you want to cook or list ingredients you have. FitAI will calculate ingredients, cooking steps, calories, and macros automatically!
                  </p>
                  <textarea
                    rows={5}
                    placeholder='e.g., "A high-protein, low-carb spinach and mushroom quiche using egg whites, feta cheese, and olive oil"'
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-2xl p-3.5 text-xs font-bold text-stone-900 placeholder:text-stone-400 resize-y min-h-[100px] max-h-[200px] shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRecipeWithAi}
                    disabled={isAiGenerating || !aiPrompt.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 disabled:opacity-40"
                  >
                    {isAiGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Generating Recipe...</span>
                      </>
                    ) : (
                      <span>Generate & Auto-Fill Form</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* EDIT / CREATE MODE: Section Order -> Name, Description, Calories & Prep Time, Ingredients, Instructions, Nutrients, Tags */
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
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Rich, nutrient-packed post-workout bowl..."
                    className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl p-3 text-xs font-medium text-stone-800 shadow-3xs resize-y min-h-[60px] max-h-[140px]"
                  />
                </div>

                {/* 3. Calories & Prep Duration */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8.5px] font-black text-orange-500 uppercase tracking-widest block mb-1">
                      Calories
                    </label>
                    <div className="flex items-center bg-orange-50/80 border border-orange-200 focus-within:border-orange-500 focus-within:bg-white rounded-2xl px-1.5 py-1 shadow-3xs transition-all">
                      <button
                        type="button"
                        onClick={() => {
                          const c = parseInt(calories) || 0;
                          setCalories(String(Math.max(0, c - 25)));
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-950/50 hover:text-orange-950 hover:bg-orange-100/60 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
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
                      <button
                        type="button"
                        onClick={() => {
                          const c = parseInt(calories) || 0;
                          setCalories(String(c + 25));
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-950/50 hover:text-orange-950 hover:bg-orange-100/60 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                      Prep Duration
                    </label>
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder="e.g. 15 mins"
                      className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl px-3 py-2 text-xs font-bold text-stone-900 shadow-3xs text-center"
                    />
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
                      className="text-[9px] font-black uppercase tracking-wider text-orange-600 hover:text-orange-700 cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-orange-500" />
                      <span>{isAiCalculating ? "Calculating..." : "Auto-Fill with AI"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left">
                    {activeTrackedNutrients.map((nutrient) => {
                      const currentVal = editableNutrients[nutrient.id] ?? 0;
                      return (
                        <div
                          key={nutrient.id}
                          className="p-2.5 rounded-2xl border flex flex-col justify-between space-y-1.5 transition-all shadow-3xs"
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
                          
                          <div className="flex items-center bg-white border border-stone-200/80 focus-within:border-orange-500 rounded-xl px-1 py-1 shadow-inner transition-all">
                            <button
                              type="button"
                              onClick={() => handleNutrientStep(nutrient.id, -1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <div className="flex-1 flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder="0"
                                value={currentVal === 0 ? "" : currentVal}
                                onChange={(e) => handleNutrientValueChange(nutrient.id, e.target.value)}
                                className="bg-transparent border-none text-center text-xs font-black text-stone-900 focus:outline-none w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-[10px] font-bold text-stone-400 select-none">
                                {nutrient.unit}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleNutrientStep(nutrient.id, 1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 7. Spacious Dietary & Tracking Tags (At the Very Bottom) */}
                <div className="pt-3 border-t border-stone-200/60 space-y-2">
                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-1.5 block">
                    <Tag className="w-3.5 h-3.5 text-orange-500" />
                    Dietary & Tracking Tags
                  </span>
                  <div className="flex flex-wrap gap-2 py-1">
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

            {/* Ultra-Subtle Delete Link (When viewing an existing recipe) */}
            {!isNewRecipe && (
              <div className="pt-3 pb-1 flex flex-col items-center justify-center">
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
                      className="text-[10px] font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-full cursor-pointer transition-all active:scale-95"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Sticky Action Footer Bar */}
          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-stone-200/60 shrink-0 font-sans">
            {!isEditing ? (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-3.5 rounded-2xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80 text-xs font-black uppercase tracking-wider cursor-pointer shadow-3xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Edit Recipe</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogMeal}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Log Meal</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2.5 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    if (isNewRecipe) {
                      onClose();
                    } else {
                      setIsEditing(false);
                    }
                  }}
                  className="py-3.5 px-5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer active:scale-95 shadow-3xs"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => setIsAiMode(!isAiMode)}
                  className="flex-1 py-3.5 bg-orange-50 hover:bg-orange-100/90 text-orange-950 border border-orange-200/80 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wider active:scale-95 shadow-3xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>{isAiMode ? "Manual Form" : "AI Assist"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="py-3.5 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
                >
                  Save Recipe
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
