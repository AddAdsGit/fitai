import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Utensils,
  X,
  Search,
  Camera,
  Edit2,
  Clock,
  Flame,
  Paperclip,
  Share2,
  Tag,
  AtSign,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import type { Meal, TrackedNutrient } from "../types";
import { hasNoGeneratedImage } from "../utils/helpers";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { TimePickerModal } from "./TimePickerModal";
import { PastFoodCard, PastFoodItem } from "./PastFoodCard";
import { DEFAULT_TRACKED_NUTRIENTS, normalizeTrackedNutrients } from "../constants/nutrition";

export const ManualLogModal = ({
  onClose,
  onAddMeal,
  onDeleteMeal,
  mealToEdit,
  onNavigateToSettings,
  mealsState = [],
  recipesState = [],
  initialAiMode = true,
  profileData,
  autoTriggerPhotoScan,
  onShareMeal,
}: {
  onClose: () => void;
  onAddMeal: (meal: any) => void;
  onDeleteMeal?: (meal: any) => void;
  mealToEdit?: Meal | null;
  onNavigateToSettings: () => void;
  mealsState?: Meal[];
  recipesState?: any[];
  initialAiMode?: boolean;
  profileData?: any;
  autoTriggerPhotoScan?: boolean;
  onShareMeal?: (meal: any) => void;
}) => {
  // Step State: "input" -> "preview"
  const [modalStep, setModalStep] = useState<"input" | "preview">(mealToEdit ? "preview" : "input");
  
  // Mode Switcher in Step 1: "ai" (default) vs "manual"
  const [logMode, setLogMode] = useState<"ai" | "manual">(mealToEdit ? "manual" : "ai");

  // In Step 2: "view" vs "edit" mode
  const [isEditingDetails, setIsEditingDetails] = useState<boolean>(false);

  const [name, setName] = useState(mealToEdit?.name || "");
  const [calories, setCalories] = useState(mealToEdit ? String(mealToEdit.calories) : "");
  const [mealDescription, setMealDescription] = useState((mealToEdit as any)?.meal_description || "");
  const [time, setTime] = useState(() => {
    if (mealToEdit?.time) return mealToEdit.time;
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return new Date().toLocaleTimeString("en-US", timeOptions);
  });

  const isEditing = !!mealToEdit;
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // SINGLE ATTACHED MEAL RULE
  const [attachedItem, setAttachedItem] = useState<PastFoodItem | null>(null);
  
  // Past Foods Drawer
  const [showPastFoodsDrawer, setShowPastFoodsDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pastFoodFilter, setPastFoodFilter] = useState<"all" | "recipes" | "recent">("all");
  
  // AI Instruction & Photos
  const [aiInstruction, setAiInstruction] = useState("");
  const [imageUrl, setImageUrl] = useState(mealToEdit?.image || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Result of generated / logged meal for preview & sharing
  const [loggedMealResult, setLoggedMealResult] = useState<any | null>(mealToEdit || null);

  // Inline "@" Mention Auto-Complete Menu States
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (mealToEdit && Array.isArray((mealToEdit as any).tags)) {
      return (mealToEdit as any).tags;
    }
    return [];
  });

  const PRESET_TAGS = [
    "High Protein",
    "Keto",
    "Gluten Free",
    "Caffeine",
    "Low Carb",
    "Dairy Free",
    "Vegan",
    "Manual Log",
  ];

  // Combine User Profile Tracking Tags with Preset Tags
  const availableTags = useMemo(() => {
    const userTrackingTags = (profileData?.tracking_tags || [])
      .filter((t: any) => t.enabled !== false)
      .map((t: any) => t.name);
    
    return Array.from(new Set([...userTrackingTags, ...PRESET_TAGS, ...selectedTags]));
  }, [profileData?.tracking_tags, selectedTags]);

  // High Quality Aesthetic Fallback Food Image
  const FALLBACK_FOOD_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80";

  // Calculate Log Count for this meal
  const mealLogCount = useMemo(() => {
    if (!name.trim() || !mealsState) return 1;
    const q = name.trim().toLowerCase();
    const count = mealsState.filter((m) => m.name.trim().toLowerCase() === q).length;
    return Math.max(1, count);
  }, [name, mealsState]);

  const activeTrackedNutrients: TrackedNutrient[] = normalizeTrackedNutrients(
    profileData?.tracked_nutrients || DEFAULT_TRACKED_NUTRIENTS,
    profileData?.protein_goal
  );

  // Editable dynamic nutrients map
  const [editableNutrients, setEditableNutrients] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    activeTrackedNutrients.forEach((n) => {
      if (mealToEdit) {
        if (n.id === "protein") initialMap.protein = mealToEdit.protein || 0;
        else if (n.id === "carbs") initialMap.carbs = mealToEdit.carbs || 0;
        else if (n.id === "fats") initialMap.fats = mealToEdit.fats || 0;
        else if (n.id === "fiber") initialMap.fiber = (mealToEdit as any).fiber || 0;
        else initialMap[n.id] = (mealToEdit as any).nutrients?.[n.id] || 0;
      } else {
        initialMap[n.id] = 0;
      }
    });
    return initialMap;
  });

  // Dynamic Context Guidance Engine
  const contextGuidance = useMemo(() => {
    if ((uploadedImage || imageUrl) && attachedItem) {
      return {
        title: "Photo & Portion Notes",
        placeholder: "Add extra details or portion tweaks for accuracy..."
      };
    }
    if (uploadedImage || imageUrl) {
      return {
        title: "Photo Details for AI Accuracy",
        placeholder: "Add hidden details for photo accuracy (e.g. cooked in olive oil, zero sugar)..."
      };
    }
    if (attachedItem) {
      return {
        title: "Portion Tweaks & Side Items",
        placeholder: "Add portion details (e.g. 2x serving, half portion, extra chutney & diet coke)..."
      };
    }
    return {
      title: "Tell Us What You Ate Today",
      placeholder: "Type what you ate today (e.g. 2 eggs on sourdough with black coffee)..."
    };
  }, [uploadedImage, imageUrl, attachedItem]);

  const convert24hTo12h = (time24: string): string => {
    const [hoursStr, minutesStr] = time24.split(":");
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutesStr} ${ampm}`;
  };

  const convert12hTo24h = (time12: string): string => {
    const [timeVal, modifier] = time12.split(" ");
    let [hoursStr, minutesStr] = timeVal.split(":");
    let hours = parseInt(hoursStr, 10);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutesStr}`;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoTriggerPhotoScan && fileInputRef.current) {
      const t = setTimeout(() => {
        fileInputRef.current?.click();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [autoTriggerPhotoScan]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const quickLogItems = useMemo(() => {
    const items: PastFoodItem[] = [];
    const seenNames = new Set<string>();
    const getKey = (n: string) => n.trim().toLowerCase();

    const mealCounts = new Map<string, number>();
    if (mealsState) {
      mealsState.forEach(item => {
        const key = getKey(item.name);
        mealCounts.set(key, (mealCounts.get(key) || 0) + 1);
      });
    }

    if (recipesState) {
      recipesState.forEach(recipe => {
        const key = getKey(recipe.name);
        seenNames.add(key);
        items.push({
          name: recipe.name,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fats: recipe.fats,
          image: recipe.image || "",
          type: "Recipe",
          meal_description: recipe.description || "",
          fiber: recipe.fiber || 0,
          logCount: mealCounts.get(key) || 0,
          source: "recipe"
        });
      });
    }

    if (mealsState) {
      mealsState.forEach(meal => {
        const key = getKey(meal.name);
        if (!seenNames.has(key)) {
          seenNames.add(key);
          items.push({
            name: meal.name,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fats: meal.fats,
            image: meal.image || "",
            type: meal.type,
            meal_description: meal.meal_description || "",
            fiber: meal.fiber || 0,
            logCount: mealCounts.get(key) || 1,
            source: "recent"
          });
        }
      });
    }

    if (items.length === 0) {
      [
        { name: "Avocado Toast", calories: 280, protein: 10, carbs: 32, fats: 14, fiber: 6, source: "recent" as const, logCount: 2, meal_description: "Thin sourdough with avocado & sea salt" },
        { name: "Crispy Masala Dosa", calories: 360, protein: 6, carbs: 54, fats: 12, fiber: 4, source: "recipe" as const, logCount: 1, meal_description: "Thin, crispy fermented rice crepe stuffed with potato" },
        { name: "Spinach & Cheese Omelette", calories: 290, protein: 22, carbs: 3, fats: 22, fiber: 2, source: "recipe" as const, logCount: 3, meal_description: "Rich, cheesy omelette folded with fresh butter" },
        { name: "Steamed Idli with Sambar", calories: 220, protein: 7, carbs: 44, fats: 1, fiber: 3, source: "recipe" as const, logCount: 1, meal_description: "Soft, steamed rice cakes served with warm lentil stew" },
      ].forEach((fallback) => items.push(fallback));
    }

    return items;
  }, [mealsState, recipesState]);

  const filteredQuickItems = useMemo(() => {
    let result = quickLogItems;
    if (pastFoodFilter === "recipes") {
      result = result.filter(item => item.source === "recipe");
    } else if (pastFoodFilter === "recent") {
      result = result.filter(item => item.source === "recent");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) || 
        (item.meal_description || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [quickLogItems, pastFoodFilter, searchQuery]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery.trim()) return quickLogItems.slice(0, 5);
    const q = mentionQuery.toLowerCase();
    return quickLogItems.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 5);
  }, [quickLogItems, mentionQuery]);

  const handleAttachItem = (item: PastFoodItem) => {
    setAttachedItem(item);
    
    if (!name.trim()) setName(item.name);
    if (!calories) setCalories(String(item.calories));
    if (!mealDescription && item.meal_description) setMealDescription(item.meal_description);
    if (!imageUrl && item.image) setImageUrl(item.image);

    setEditableNutrients((prev) => ({
      ...prev,
      protein: item.protein || prev.protein || 0,
      carbs: item.carbs || prev.carbs || 0,
      fats: item.fats || prev.fats || 0,
      fiber: item.fiber || prev.fiber || 0,
    }));

    setShowMentionMenu(false);
    setShowPastFoodsDrawer(false);
  };

  const handleRemoveAttached = () => {
    setAttachedItem(null);
  };

  const handleNotesTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAiInstruction(val);

    const lastAtIndex = val.lastIndexOf("@");
    if (lastAtIndex !== -1 && lastAtIndex >= val.length - 15) {
      const queryAfterAt = val.slice(lastAtIndex + 1);
      if (!queryAfterAt.includes(" ") && !queryAfterAt.includes("\n")) {
        setMentionQuery(queryAfterAt);
        setShowMentionMenu(true);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  const handleSelectMention = (item: PastFoodItem) => {
    handleAttachItem(item);
    const lastAtIndex = aiInstruction.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      setAiInstruction(aiInstruction.slice(0, lastAtIndex).trim());
    }
    setShowMentionMenu(false);
  };

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

  const toggleTag = (tagToToggle: string) => {
    if (selectedTags.includes(tagToToggle)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagToToggle));
    } else {
      setSelectedTags([...selectedTags, tagToToggle]);
    }
  };

  // AI GENERATE & LOG ACTION
  const handleGenerateAndLogWithAi = async () => {
    if (!aiInstruction.trim() && !uploadedImage && !attachedItem) return;

    const geminiKeyTag = (profileData?.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
    const key = geminiKeyTag.split(":")[1] || "";

    const fullInstruction = attachedItem 
      ? `Attached meal: ${attachedItem.name}. User notes: ${aiInstruction.trim()}`
      : aiInstruction.trim();

    setIsProcessing(true);
    setErrorMessage("");

    try {
      let rawText = "";
      let calculatedMeal: any = null;
      const finalImage = imageUrl || uploadedImage || attachedItem?.image || FALLBACK_FOOD_IMAGE;

      if (!key && uploadedImage) {
        calculatedMeal = {
          id: mealToEdit?.id || `meal_${Date.now()}`,
          name: name.trim() || attachedItem?.name || aiInstruction.trim() || "Photo Meal Log",
          calories: parseInt(calories) || 450,
          protein: 32,
          carbs: 45,
          fats: 14,
          fiber: 6,
          nutrients: { protein: 32, carbs: 45, fats: 14, fiber: 6 },
          type: "AI Photo Log",
          time: time.trim(),
          image: finalImage,
          meal_description: aiInstruction.trim() || "AI Photo Log",
          tags: selectedTags.length > 0 ? selectedTags : ["Photo Log", "High Protein"]
        };
      } else if (uploadedImage && key) {
        const commaIndex = uploadedImage.indexOf(",");
        const mimeType = uploadedImage.substring(5, uploadedImage.indexOf(";base64"));
        const base64Data = uploadedImage.substring(commaIndex + 1);
        
        const imagePrompt = `Analyze the food plate in this image. User notes & attached item: "${fullInstruction}". Estimate meal name, total calories, protein, carbs, fats, fiber, description. Return ONLY valid JSON: {"name":"...","calories":0,"protein":0,"carbs":0,"fats":0,"fiber":0,"description":"..."}`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: imagePrompt },
                  { inlineData: { mimeType: mimeType, data: base64Data } }
                ]
              }
            ]
          })
        });

        const data = await response.json();
        rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

        calculatedMeal = {
          id: mealToEdit?.id || `meal_${Date.now()}`,
          name: parsed.name || attachedItem?.name || aiInstruction.trim() || "Custom Meal Log",
          calories: parseInt(parsed.calories) || 350,
          protein: parseInt(parsed.protein) || 20,
          carbs: parseInt(parsed.carbs) || 40,
          fats: parseInt(parsed.fats) || 12,
          fiber: parseInt(parsed.fiber) || 5,
          nutrients: {
            protein: parseInt(parsed.protein) || 20,
            carbs: parseInt(parsed.carbs) || 40,
            fats: parseInt(parsed.fats) || 12,
            fiber: parseInt(parsed.fiber) || 5,
          },
          type: mealToEdit?.type || "AI Meal Log",
          time: time.trim(),
          image: finalImage,
          meal_description: parsed.description || aiInstruction.trim(),
          tags: selectedTags.length > 0 ? selectedTags : ["AI Log"]
        };
      } else {
        const prompt = `Calculate nutrition for: "${fullInstruction}". Return ONLY raw JSON: {"name":"...","calories":0,"protein":0,"carbs":0,"fats":0,"fiber":0,"description":"..."}`;
        
        if (isSupabaseConfigured) {
          const { data } = await supabase.functions.invoke("gemini", { body: { prompt } });
          if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            rawText = data.candidates[0].content.parts[0].text;
          }
        }

        let cleaned = rawText.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }

        const result = cleaned ? JSON.parse(cleaned) : {};
        
        calculatedMeal = {
          id: mealToEdit?.id || `meal_${Date.now()}`,
          name: result.name || attachedItem?.name || aiInstruction.trim() || "Custom Meal Log",
          calories: parseInt(result.calories) || 350,
          protein: parseInt(result.protein) || 20,
          carbs: parseInt(result.carbs) || 40,
          fats: parseInt(result.fats) || 12,
          fiber: parseInt(result.fiber) || 5,
          nutrients: {
            protein: parseInt(result.protein) || 20,
            carbs: parseInt(result.carbs) || 40,
            fats: parseInt(result.fats) || 12,
            fiber: parseInt(result.fiber) || 5,
          },
          type: mealToEdit?.type || "AI Meal Log",
          time: time.trim(),
          image: finalImage,
          meal_description: result.description || aiInstruction.trim(),
          tags: selectedTags.length > 0 ? selectedTags : ["AI Log"]
        };
      }

      onAddMeal(calculatedMeal);
      setLoggedMealResult(calculatedMeal);
      setName(calculatedMeal.name);
      setCalories(String(calculatedMeal.calories));
      setTime(calculatedMeal.time || time);
      setMealDescription(calculatedMeal.meal_description);
      setEditableNutrients(calculatedMeal.nutrients);
      setSelectedTags(calculatedMeal.tags);
      setImageUrl(calculatedMeal.image);
      
      setIsProcessing(false);
      setIsEditingDetails(false);
      setModalStep("preview");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to analyze instruction");
      setIsProcessing(false);
    }
  };

  // PURE MANUAL SAVE ACTION
  const handleSaveManualMeal = () => {
    const finalName = name.trim() || attachedItem?.name || "Manual Meal Log";
    if (!finalName) return;

    const finalImage = imageUrl || uploadedImage || attachedItem?.image || FALLBACK_FOOD_IMAGE;

    const manualMeal = {
      id: mealToEdit?.id || `meal_${Date.now()}`,
      name: finalName,
      calories: parseInt(calories) || (attachedItem ? attachedItem.calories : 350),
      protein: editableNutrients.protein || (attachedItem ? attachedItem.protein : 0),
      carbs: editableNutrients.carbs || (attachedItem ? attachedItem.carbs : 0),
      fats: editableNutrients.fats || (attachedItem ? attachedItem.fats : 0),
      fiber: editableNutrients.fiber || (attachedItem ? attachedItem.fiber || 0 : 0),
      nutrients: editableNutrients,
      type: mealToEdit?.type || "Manual Log",
      time: time.trim(),
      image: finalImage,
      meal_description: mealDescription.trim(),
      tags: selectedTags.length > 0 ? selectedTags : ["Manual Log"]
    };

    onAddMeal(manualMeal);
    setLoggedMealResult(manualMeal);
    setImageUrl(finalImage);
    setIsEditingDetails(false);
    setModalStep("preview");
  };

  const handleConfirmDelete = () => {
    if (mealToEdit && onDeleteMeal) {
      onDeleteMeal(mealToEdit);
    }
    onClose();
  };

  const getCurrentMealData = () => {
    return {
      id: loggedMealResult?.id || mealToEdit?.id || `meal_${Date.now()}`,
      name: name.trim() || "Meal Log",
      meal_description: mealDescription.trim(),
      calories: parseInt(calories) || 350,
      protein: editableNutrients.protein || 0,
      carbs: editableNutrients.carbs || 0,
      fats: editableNutrients.fats || 0,
      fiber: editableNutrients.fiber || 0,
      tags: selectedTags,
      nutrients: editableNutrients,
      image: imageUrl || uploadedImage || attachedItem?.image || FALLBACK_FOOD_IMAGE,
      time: time.trim(),
      type: mealToEdit?.type || "Meal Log"
    };
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/40 backdrop-blur-md"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
        />

        {modalStep === "input" ? (
          <div className="p-6 space-y-4 flex flex-col h-full min-h-0 overflow-y-auto">
            {/* Header Bar */}
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.04] shrink-0">
              <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <Utensils className="w-4 h-4 text-orange-500" />
                {isEditing ? "Edit Meal Log" : "Log Meal"}
              </h4>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors cursor-pointer border border-stone-200/60 shadow-3xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* DEDICATED STANDALONE MODE TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => setLogMode(logMode === "ai" ? "manual" : "ai")}
              className="w-full py-2.5 rounded-2xl bg-white hover:bg-orange-50/60 border border-stone-200/80 text-orange-950 text-xs font-black uppercase tracking-wider text-center shadow-3xs cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
            >
              {logMode === "ai" ? (
                <>
                  <Edit2 className="w-3.5 h-3.5 text-orange-500" />
                  <span>Switch to Manual Entry</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Switch to AI Entry</span>
                </>
              )}
            </button>

            {/* Scrollable Main Content */}
            <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 text-left min-h-0">
              {logMode === "ai" ? (
                /* MODE 1: AI ASSISTANT LOGGER */
                <div className="space-y-3">
                  {(uploadedImage || imageUrl) && (
                    <div className="relative w-full h-36 rounded-3xl overflow-hidden border border-stone-200 shadow-xs group shrink-0">
                      <img src={uploadedImage || imageUrl} className="w-full h-full object-cover" alt="Meal attachment" />
                      <button
                        type="button"
                        onClick={() => { setUploadedImage(null); setImageUrl(""); }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer backdrop-blur-md border border-white/20 active:scale-90"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col min-h-0 w-full space-y-1.5 text-left transition-all duration-300">
                    <div className="flex items-center justify-between shrink-0">
                      <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider block">
                        {contextGuidance.title}
                      </span>
                      <span className="text-[9px] font-bold text-stone-400/80 flex items-center gap-1">
                        <AtSign className="w-3 h-3 text-orange-500" /> Type @ to mention
                      </span>
                    </div>

                    <div className="relative flex-1 flex flex-col min-h-0 w-full">
                      <textarea
                        placeholder={contextGuidance.placeholder}
                        value={aiInstruction}
                        onChange={handleNotesTextChange}
                        className="flex-1 w-full h-full min-h-[140px] bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-3xl p-4 text-xs font-bold text-stone-900 placeholder:text-stone-400 placeholder:font-normal resize-none shadow-xs leading-relaxed"
                      />

                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-stone-100/90 backdrop-blur-md border border-stone-200/80 rounded-full px-2 py-1 shadow-3xs">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1 text-stone-500 hover:text-orange-600 transition-colors cursor-pointer"
                          title="Upload Photo"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-[1px] h-3 bg-stone-300" />
                        <button
                          type="button"
                          onClick={() => setShowPastFoodsDrawer(!showPastFoodsDrawer)}
                          className="p-1 text-stone-500 hover:text-orange-600 transition-colors cursor-pointer"
                          title="Attach Past Meal"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <AnimatePresence>
                        {showMentionMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute bottom-full mb-2 left-2 right-2 bg-white/95 backdrop-blur-xl border border-stone-200 rounded-2xl shadow-xl p-2 z-50 max-h-44 overflow-y-auto space-y-1"
                          >
                            <span className="text-[9px] font-black uppercase text-orange-950/50 tracking-wider block px-2.5 py-1">
                              Tap to Attach Item (@{mentionQuery})
                            </span>
                            {mentionSuggestions.length === 0 ? (
                              <p className="text-[10px] text-stone-400 font-semibold px-2.5 py-2">
                                No matching past meals found
                              </p>
                            ) : (
                              mentionSuggestions.map((item) => (
                                <button
                                  key={item.name}
                                  type="button"
                                  onClick={() => handleSelectMention(item)}
                                  className="w-full p-2 rounded-xl hover:bg-orange-50 text-left flex items-center justify-between transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Utensils className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                    <span className="text-xs font-bold text-stone-900 truncate">{item.name}</span>
                                  </div>
                                  <span className="text-[9px] font-black text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                                    + Attach
                                  </span>
                                </button>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="flex-1 py-3 bg-white border border-stone-200/80 hover:bg-orange-50/50 rounded-2xl text-[10.5px] font-black uppercase tracking-wider text-stone-700 cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-3xs active:scale-95">
                      <Camera className="w-4 h-4 text-orange-500 font-bold" />
                      <span>Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowPastFoodsDrawer(!showPastFoodsDrawer)}
                      className="flex-1 py-3 bg-white border border-stone-200/80 hover:bg-orange-50/50 rounded-2xl text-[10.5px] font-black uppercase tracking-wider text-stone-700 cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-3xs active:scale-95"
                    >
                      <Paperclip className="w-4 h-4 text-orange-500 font-bold" />
                      <span>Attach Meal</span>
                    </button>
                  </div>

                  {attachedItem && (
                    <div className="space-y-2 shrink-0 text-left">
                      <span className="text-[9.5px] font-black uppercase text-orange-950/60 tracking-widest flex items-center gap-1.5 font-sans">
                        <Paperclip className="w-3.5 h-3.5 text-orange-500" />
                        Attached Meal
                      </span>
                      <PastFoodCard
                        item={attachedItem}
                        trackedNutrients={activeTrackedNutrients}
                        actionType="remove"
                        onRemove={handleRemoveAttached}
                        onModify={undefined}
                      />
                    </div>
                  )}

                  <AnimatePresence>
                    {showPastFoodsDrawer && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/80 p-3.5 flex flex-col space-y-3 shadow-sm max-h-[38vh] shrink-0 text-left overflow-hidden"
                      >
                        <div className="flex items-center justify-between shrink-0">
                          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5 text-orange-500" />
                            Select Meal to Attach
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPastFoodsDrawer(false)}
                            className="text-[9.5px] font-black uppercase text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                          >
                            ✕ Cancel
                          </button>
                        </div>

                        <div className="relative w-full shrink-0">
                          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search past meals & recipes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-200/80 focus:border-orange-500 focus:outline-none rounded-2xl pl-9 pr-3 py-2 text-xs font-bold text-stone-900 placeholder:text-stone-400 shadow-inner"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {(["all", "recipes", "recent"] as const).map((filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setPastFoodFilter(filter)}
                              className={cn(
                                "px-3 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider transition-all border cursor-pointer",
                                pastFoodFilter === filter
                                  ? "bg-orange-500 text-white border-orange-500 shadow-2xs"
                                  : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                              )}
                            >
                              {filter === "all" ? "All Items" : filter === "recipes" ? "Saved Recipes" : "Recent Meals"}
                            </button>
                          ))}
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5">
                          {filteredQuickItems.length === 0 ? (
                            <div className="text-center py-6 space-y-2">
                              <Utensils className="w-8 h-8 text-stone-300 mx-auto" />
                              <p className="text-[10px] text-stone-400 font-semibold">
                                No matching past meals or recipes found
                              </p>
                            </div>
                          ) : (
                            filteredQuickItems.map((item) => {
                              const isAttached = attachedItem?.name.toLowerCase() === item.name.toLowerCase();
                              return (
                                <div key={item.name} className="relative">
                                  <PastFoodCard
                                    item={item}
                                    trackedNutrients={activeTrackedNutrients}
                                    actionType="pin"
                                    onPin={isAttached ? undefined : handleAttachItem}
                                    onModify={undefined}
                                  />
                                  {isAttached && (
                                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-2xl flex items-center justify-end px-4">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-3 py-1 rounded-full shadow-2xs">
                                        ✓ Attached
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* MODE 2: PURE MANUAL ENTRY */
                <div className="space-y-3.5 animate-fade-in text-left">
                  {uploadedImage || imageUrl ? (
                    <div className="relative w-full h-36 rounded-3xl overflow-hidden border border-stone-200 shadow-xs group shrink-0">
                      <img src={uploadedImage || imageUrl} className="w-full h-full object-cover" alt="Meal attachment" />
                      <button
                        type="button"
                        onClick={() => { setUploadedImage(null); setImageUrl(""); }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer backdrop-blur-md border border-white/20 active:scale-90"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-3 bg-white border border-stone-200/80 hover:bg-orange-50/50 rounded-2xl text-[10.5px] font-black uppercase tracking-wider text-stone-700 cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-3xs active:scale-95 shrink-0">
                      <Camera className="w-4 h-4 text-orange-500 font-bold" />
                      <span>Upload Meal Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  )}

                  {/* Row 1: 1-Line Full-Width Title */}
                  <div>
                    <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                      Meal Title / Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Crispy Masala Dosa"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl px-3.5 py-2.5 text-xs font-black text-stone-900 shadow-3xs"
                    />
                  </div>

                  {/* Row 2: Manually Expandable Description */}
                  <div>
                    <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                      Description / Extra Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Add meal description or preparation notes..."
                      value={mealDescription}
                      onChange={(e) => setMealDescription(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl p-3 text-xs font-medium text-stone-800 shadow-3xs resize-y min-h-[60px] max-h-[160px]"
                    />
                  </div>

                  {/* Row 3: 1-Line Time & Calories Row */}
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
                        Log Time
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsTimePickerOpen(true)}
                        className="w-full bg-white border border-stone-200 rounded-2xl px-3 py-2 text-xs font-bold text-stone-900 flex items-center justify-center gap-1.5 hover:bg-stone-50 transition-all cursor-pointer shadow-3xs"
                      >
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>{time}</span>
                      </button>
                    </div>
                  </div>

                  {/* Row 4: Tracked Nutrients Grid */}
                  <div className="pt-2 border-t border-stone-200/60 space-y-2">
                    <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider block">
                      Tracked Nutrients
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      {(activeTrackedNutrients || []).map((nutrient) => {
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
                                <Minus className="w-3.5 h-3.5" />
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
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 5: Dietary & Tracking Tags Selector in Manual Mode */}
                  <div className="pt-3 border-t border-stone-200/60 space-y-2">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-1.5 block">
                      <Tag className="w-3.5 h-3.5 text-orange-500" />
                      Tracking & Dietary Tags
                    </span>

                    <div className="flex flex-wrap gap-2 py-1">
                      {availableTags.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
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
            </div>

            {/* Action Footer */}
            <div className="shrink-0 pt-2 border-t border-stone-100 w-full font-sans">
              {logMode === "ai" ? (
                <button
                  type="button"
                  onClick={handleGenerateAndLogWithAi}
                  disabled={(!aiInstruction.trim() && !uploadedImage && !attachedItem) || isProcessing}
                  className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider text-center shadow-lg shadow-orange-500/25 cursor-pointer transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>{isProcessing ? "Calculating..." : "Generate & Log Meal"}</span>
                </button>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLogMode("ai")}
                    className="py-3.5 px-4 rounded-2xl bg-orange-50 hover:bg-orange-100/90 text-orange-950 border border-orange-200/80 text-xs font-black uppercase tracking-wider text-center shadow-3xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    <span>AI Entry</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveManualMeal}
                    className="flex-1 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider text-center shadow-lg shadow-orange-500/25 cursor-pointer transition-all active:scale-95"
                  >
                    <span>Save Log</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STEP 2: LOGGED PREVIEW STEP WITH 100% PRISTINE HERO COVER IMAGE (SHARE ON TOP-RIGHT OVERLAY) */
          <div className="flex-1 flex flex-col justify-between relative min-h-0 w-full text-left font-sans overflow-hidden">
            {/* FLUSH TOP HERO COVER IMAGE HEADER */}
            <div className="relative w-full h-52 shrink-0 overflow-hidden shadow-md group">
              <img
                src={imageUrl || uploadedImage || attachedItem?.image || FALLBACK_FOOD_IMAGE}
                alt={name || "Meal Photo"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              
              {/* Gourmet Dark Ambient Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-black/20" />

              {/* Top Controls: Camera Upload (Left) + Share Icon & Close Icon (Right) */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                  title="Change / Upload Photo"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>

                <div className="flex items-center gap-2">
                  {onShareMeal && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentMealObj = getCurrentMealData();
                        onAddMeal(currentMealObj);
                        onShareMeal(currentMealObj);
                      }}
                      className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                      title="Share meal card"
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
              {/* Bottom Overlay: Clean Subtitle + Meal Title (Left) and Single Unified Stat Pill (Right) */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white z-10">
                <div className="min-w-0 flex-1 pr-3 text-left">
                  {/* Subtle Metadata Subtitle: Log Count */}
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-300 drop-shadow-xs block mb-0.5">
                    Logged {mealLogCount} time{mealLogCount === 1 ? "" : "s"}
                  </span>

                  <h3 className="text-xl font-black tracking-tight drop-shadow-md truncate font-sans leading-tight text-white">
                    {name || "Gourmet Meal Log"}
                  </h3>
                </div>

                {/* Single Unified Frosted Glassmorphic Stat Pill */}
                <div className="bg-black/50 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full shadow-md text-center flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-black tracking-wider uppercase text-white block">
                    {calories || "0"} KCAL
                  </span>
                  <span className="text-white/40 text-[10px] select-none">•</span>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-white/90 block">
                    {time || "12:00 PM"}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Body: View vs Edit Mode */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 min-h-0 text-left">
              {!isEditingDetails ? (
                /* VIEW MODE: Rich Complete Meal Detail Card */
                <div className="space-y-4 text-left font-sans">
                  {/* Row 1: Key Stats Banner (Logged Time & Total Calories) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border border-stone-200/80 rounded-2xl p-3 shadow-3xs flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8.5px] font-black uppercase text-stone-400 tracking-wider block">
                          Logged Time
                        </span>
                        <span className="text-xs font-black text-stone-900 truncate block">
                          {time || "12:00 PM"}
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
                          {calories || "0"} kcal
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Description / Notes (if present) */}
                  {mealDescription && (
                    <div className="bg-white border border-stone-200/80 rounded-2xl p-3.5 shadow-3xs space-y-1">
                      <span className="text-[8.5px] font-black uppercase text-stone-400 tracking-widest block">
                        Notes & Description
                      </span>
                      <p className="text-xs text-stone-700 font-medium leading-relaxed italic">
                        "{mealDescription}"
                      </p>
                    </div>
                  )}

                  {/* Row 3: Macronutrient Summary Grid */}
                  <div className="space-y-2">
                    <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider block">
                      Macronutrient Breakdown
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      {(activeTrackedNutrients || []).map((nutrient) => {
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
                            <div className="bg-white border border-stone-200/80 rounded-xl px-2 py-1 text-center shadow-inner">
                              <span className="text-xs font-black text-stone-900">
                                {currentVal} {nutrient.unit}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 4: Dietary & Tracking Tags Display */}
                  {selectedTags.length > 0 && (
                    <div className="pt-2 border-t border-stone-200/60 space-y-2">
                      <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-widest block">
                        Tracking & Dietary Tags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTags.map((tag) => (
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
                /* EDIT MODE: Editable Form with Center Steppers & Clear Field Labels */
                <div className="space-y-3.5 text-left font-sans">
                  {/* Row 1: 1-Line Full-Width Title */}
                  <div>
                    <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                      Meal Title
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl px-3.5 py-2.5 text-xs font-black text-stone-900 shadow-3xs"
                      placeholder="Meal Title"
                    />
                  </div>

                  {/* Row 2: Manually Expandable Description */}
                  <div>
                    <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                      Description / Extra Notes
                    </label>
                    <textarea
                      rows={2}
                      value={mealDescription}
                      onChange={(e) => setMealDescription(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl p-3 text-xs font-medium text-stone-800 shadow-3xs resize-y min-h-[60px] max-h-[160px]"
                      placeholder="Add meal description or preparation notes..."
                    />
                  </div>

                  {/* Row 3: 1-Line Time & Calories Row (FitAI Center-Aligned Stepper Control) */}
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
                        Log Time
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsTimePickerOpen(true)}
                        className="w-full bg-white border border-stone-200 rounded-2xl px-3 py-2 text-xs font-bold text-stone-900 flex items-center justify-center gap-1.5 hover:bg-stone-50 transition-all cursor-pointer shadow-3xs"
                      >
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>{time}</span>
                      </button>
                    </div>
                  </div>

                  {/* Row 4: Tracked Nutrients Grid (FitAI Center-Aligned Stepper Control) */}
                  <div className="pt-2 border-t border-stone-200/60 space-y-2">
                    <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider block">
                      Tracked Nutrients
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      {(activeTrackedNutrients || []).map((nutrient) => {
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
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex-1 flex items-center justify-center gap-0.5">
                                <input
                                  type="number"
                                  inputMode="numeric"
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
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SPACIOUS & LEGIBLE DIETARY TAGS SECTION */}
                  <div className="pt-3 border-t border-stone-200/60 space-y-2">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-1.5 block">
                      <Tag className="w-3.5 h-3.5 text-orange-500" />
                      Tracking & Dietary Tags
                    </span>

                    <div className="flex flex-wrap gap-2 py-1">
                      {availableTags.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
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

              {/* ULTRA-SUBTLE MINIMALIST MEAL DELETION (WHEN EDITING AN EXISTING MEAL) */}
              {isEditing && onDeleteMeal && (
                <div className="pt-3 pb-1 flex flex-col items-center justify-center">
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-[10px] font-bold text-stone-400 hover:text-red-500 uppercase tracking-widest cursor-pointer transition-colors bg-transparent border-none py-1 active:scale-95"
                    >
                      Delete Meal Log
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-red-50/90 border border-red-200/80 px-3.5 py-1.5 rounded-full animate-fade-in shadow-3xs">
                      <span className="text-[10.5px] font-bold text-red-950">Delete meal?</span>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
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

            {/* PREVIEW FOOTER: VIEW MODE ([ EDIT ] + [ CLOSE ]) vs EDIT MODE ([ CANCEL ] + [ DONE ]) */}
            <div className="p-4 bg-white/80 backdrop-blur-md border-t border-stone-200/60 flex gap-2.5 shrink-0 w-full font-sans">
              {!isEditingDetails ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails(true)}
                    className="flex-1 py-3.5 rounded-2xl bg-white hover:bg-orange-50/60 text-stone-700 border border-stone-200/80 text-xs font-black uppercase tracking-wider cursor-pointer shadow-3xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>Edit Meal</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3.5 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/25 active:scale-95 transition-all text-center"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails(false)}
                    className="py-3.5 px-6 rounded-2xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80 text-xs font-black uppercase tracking-wider cursor-pointer shadow-3xs active:scale-95 transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const currentMealObj = getCurrentMealData();
                      onAddMeal(currentMealObj);
                      setIsEditingDetails(false);
                    }}
                    className="flex-1 py-3.5 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/25 active:scale-95 transition-all text-center"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>

      <TimePickerModal
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        initialTime={time.includes("M") ? convert12hTo24h(time) : time}
        onSave={(timeStr) => {
          setTime(convert12hTo24h(timeStr));
        }}
        title="Set Meal Log Time"
      />
    </div>
  );
};
