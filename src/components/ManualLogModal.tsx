import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Utensils,
  X,
  ArrowLeft,
  Search,
  Camera,
  Image as ImageIcon,
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
  Pencil,
  Check,
  Trash2,
  Wand2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import type { Meal, TrackedNutrient } from "../types";
import { hasNoGeneratedImage, formatDisplayTime } from "../utils/helpers";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { getBestGeminiModel, resolveGeminiApiKey } from "../utils/geminiFoodAnalysis";
import { TimePickerModal } from "./TimePickerModal";
import { PastFoodCard, PastFoodItem } from "./PastFoodCard";
import { DEFAULT_TRACKED_NUTRIENTS, normalizeTrackedNutrients } from "../constants/nutrition";
import { StepperButton } from "./StepperButton";
import { FoodFilterBar } from "./FoodFilterBar";
import {
  filterAndSortFoods,
  getUserActiveAiTags,
  INITIAL_FOOD_FILTER_STATE,
  FoodFilterState,
} from "../utils/foodFilter";
import { AiClarificationModal, PendingAiClarification } from "./AiClarificationModal";

export const ManualLogModal = ({
  onClose,
  onAddMeal,
  onDeleteMeal,
  mealToEdit,
  onNavigateToSettings,
  mealsState = [],
  recipesState = [],
  initialAiMode = true,
  initialPastFoodsDrawer = false,
  profileData,
  autoTriggerPhotoScan,
  onShareMeal,
  onOpenCamera,
}: {
  onClose: () => void;
  onAddMeal: (meal: any) => void;
  onDeleteMeal?: (meal: any) => void;
  mealToEdit?: Meal | null;
  onNavigateToSettings: () => void;
  mealsState?: Meal[];
  recipesState?: any[];
  initialAiMode?: boolean;
  initialPastFoodsDrawer?: boolean;
  profileData?: any;
  autoTriggerPhotoScan?: boolean;
  onShareMeal?: (meal: any) => void;
  onOpenCamera?: (initialText?: string) => void;
}) => {
  // Step State: "input" -> "preview"
  const [modalStep, setModalStep] = useState<"input" | "preview">(mealToEdit ? "preview" : "input");
  
  // Mode Switcher in Step 1: "ai" (default) vs "manual"
  const [logMode, setLogMode] = useState<"ai" | "manual">(mealToEdit ? "manual" : "ai");

  // Past Foods Drawer & Multi-Select State
  const [showPastFoodsDrawer, setShowPastFoodsDrawer] = useState(initialPastFoodsDrawer);
  const [drawerMode, setDrawerMode] = useState<"attach" | "log">(initialPastFoodsDrawer ? "log" : "attach");
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
  
  // AI Confidence & Clarification Flow States (90% Threshold)
  const [pendingClarification, setPendingClarification] = useState<PendingAiClarification | null>(null);
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
  const [hasBeenClarified, setHasBeenClarified] = useState(false);

  // SINGLE ATTACHED MEAL RULE
  const [attachedItem, setAttachedItem] = useState<PastFoodItem | null>(null);

  // Past Foods Drawer & Multi-Select State
  const [foodFilters, setFoodFilters] = useState<FoodFilterState>(INITIAL_FOOD_FILTER_STATE);
  const [selectedDrawerItems, setSelectedDrawerItems] = useState<PastFoodItem[]>([]);

  const toggleDrawerItemSelect = (item: PastFoodItem) => {
    setSelectedDrawerItems((prev) => {
      const exists = prev.some((i) => i.name.toLowerCase() === item.name.toLowerCase());
      if (exists) {
        return prev.filter((i) => i.name.toLowerCase() !== item.name.toLowerCase());
      }
      return [...prev, item];
    });
  };

  const handleAttachSelectedDrawerItems = () => {
    if (selectedDrawerItems.length === 0) return;
    const tagsString = selectedDrawerItems.map((i) => `@${i.name}`).join(" ");
    setAiInstruction((prev) => {
      if (!prev) return `${tagsString} `;
      return `${prev.trim()} ${tagsString} `;
    });
    setTaggedNames((prev) => Array.from(new Set([...prev, ...selectedDrawerItems.map((i) => i.name)])));
    setSelectedDrawerItems([]);
    setShowPastFoodsDrawer(false);
  };

  const handleQuickLogSelectedItems = () => {
    if (selectedDrawerItems.length === 0) return;
    selectedDrawerItems.forEach((item) => {
      onAddMeal({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        fiber: item.fiber,
        image: item.image,
        tags: item.tags,
        nutrients: item.nutrients,
        meal_description: item.meal_description,
        isAiGenerated: true,
      });
    });
    setSelectedDrawerItems([]);
    setShowPastFoodsDrawer(false);
    onClose();
  };
  
  // AI Instruction & Photos
  const [aiInstruction, setAiInstruction] = useState("");
  const [taggedNames, setTaggedNames] = useState<string[]>([]);
  const notesAreaRef = useRef<HTMLTextAreaElement>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [showAiRefineInput, setShowAiRefineInput] = useState(false);
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

  // User's Active AI Tracking Tags (strictly from profile)
  const availableTags = useMemo(() => {
    return getUserActiveAiTags(profileData?.tracking_tags);
  }, [profileData?.tracking_tags]);

  // High Quality Aesthetic Fallback Food Image
  const FALLBACK_FOOD_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80";

  // Calculate Log Count for this meal
  const mealLogCount = useMemo(() => {
    if (!name.trim() || !mealsState) return 1;
    const q = name.trim().toLowerCase();
    const count = mealsState.filter((m) => m.name.trim().toLowerCase() === q).length;
    return Math.max(1, count);
  }, [name, mealsState]);

  // Detect if this meal is converted to / linked to a recipe
  const matchedRecipe = useMemo(() => {
    if (attachedItem?.type === "recipe") return attachedItem;
    if ((mealToEdit as any)?.recipe_id) {
      return (recipesState || []).find((r: any) => r.id === (mealToEdit as any).recipe_id) || null;
    }
    if (!name.trim() || !recipesState) return null;
    const q = name.trim().toLowerCase();
    return (recipesState || []).find((r: any) => r.name?.trim()?.toLowerCase() === q) || null;
  }, [name, attachedItem, mealToEdit, recipesState]);

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

  // Sync mealToEdit whenever it changes (e.g. when opened from Food Library or Dashboard)
  useEffect(() => {
    if (mealToEdit) {
      setModalStep("preview");
      setName(mealToEdit.name || "");
      setCalories(mealToEdit.calories ? String(mealToEdit.calories) : "");
      setMealDescription((mealToEdit as any).meal_description || "");
      setTime(mealToEdit.time || new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
      setImageUrl(mealToEdit.image || "");
      setLoggedMealResult(mealToEdit);
      if (Array.isArray((mealToEdit as any).tags)) {
        setSelectedTags((mealToEdit as any).tags);
      }
      const initialMap: Record<string, number> = {};
      activeTrackedNutrients.forEach((n) => {
        if (n.id === "protein") initialMap.protein = mealToEdit.protein || 0;
        else if (n.id === "carbs") initialMap.carbs = mealToEdit.carbs || 0;
        else if (n.id === "fats") initialMap.fats = mealToEdit.fats || 0;
        else if (n.id === "fiber") initialMap.fiber = (mealToEdit as any).fiber || 0;
        else initialMap[n.id] = (mealToEdit as any).nutrients?.[n.id] || 0;
      });
      setEditableNutrients(initialMap);
    }
  }, [mealToEdit]);

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

  const allFoodFilterTags = useMemo(() => {
    return getUserActiveAiTags(profileData?.tracking_tags);
  }, [profileData?.tracking_tags]);

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
          source: "recipe",
          tags: (recipe as any).tags || (recipe as any).ai_tags || ["Recipe"],
          nutrients: (recipe as any).nutrients || {}
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
            source: "recent",
            tags: (meal as any).tags || (meal as any).ai_tags || ["Recent Log"],
            nutrients: (meal as any).nutrients || {}
          });
        }
      });
    }

    if (items.length === 0) {
      [
        { name: "Avocado Toast", calories: 280, protein: 10, carbs: 32, fats: 14, fiber: 6, source: "recent" as const, logCount: 2, meal_description: "Thin sourdough with avocado & sea salt", tags: ["Best Meal for Me", "Homemade"] },
        { name: "Crispy Masala Dosa", calories: 360, protein: 6, carbs: 54, fats: 12, fiber: 4, source: "recipe" as const, logCount: 1, meal_description: "Thin, crispy fermented rice crepe stuffed with potato", tags: ["Homemade", "South Indian"] },
        { name: "Spinach & Cheese Omelette", calories: 290, protein: 22, carbs: 3, fats: 22, fiber: 2, source: "recipe" as const, logCount: 3, meal_description: "Rich, cheesy omelette folded with fresh butter", tags: ["High Protein", "Keto Friendly"] },
        { name: "Steamed Idli with Sambar", calories: 220, protein: 7, carbs: 44, fats: 1, fiber: 3, source: "recipe" as const, logCount: 1, meal_description: "Soft, steamed rice cakes served with warm lentil stew", tags: ["Low Fat", "South Indian"] },
      ].forEach((fallback) => items.push(fallback));
    }

    return items;
  }, [mealsState, recipesState]);

  const filteredQuickItems = useMemo(() => {
    let list = quickLogItems;
    if (foodFilters.showRecipes === false) {
      list = list.filter((item) => item.source !== "recipe");
    }
    if (foodFilters.showLogs === false) {
      list = list.filter((item) => item.source !== "recent");
    }
    return filterAndSortFoods(list as any, foodFilters, undefined, activeTrackedNutrients);
  }, [quickLogItems, foodFilters, activeTrackedNutrients]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery.trim()) return quickLogItems.slice(0, 8);
    const q = mentionQuery.toLowerCase();
    return quickLogItems.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 8);
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
    setTaggedNames((prev) => Array.from(new Set([...prev, item.name])));
    const lastAtIndex = aiInstruction.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      setAiInstruction(aiInstruction.slice(0, lastAtIndex) + `@${item.name} `);
    } else {
      setAiInstruction((prev) => prev + ` @${item.name} `);
    }
    setShowMentionMenu(false);
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Backspace") {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = aiInstruction.slice(0, cursorPos);

      for (const name of taggedNames) {
        const tagStr1 = `@${name} `;
        const tagStr2 = `@${name}`;
        if (textBeforeCursor.endsWith(tagStr1)) {
          e.preventDefault();
          const newNotes = aiInstruction.slice(0, cursorPos - tagStr1.length) + aiInstruction.slice(cursorPos);
          setAiInstruction(newNotes);
          return;
        }
        if (textBeforeCursor.endsWith(tagStr2)) {
          e.preventDefault();
          const newNotes = aiInstruction.slice(0, cursorPos - tagStr2.length) + aiInstruction.slice(cursorPos);
          setAiInstruction(newNotes);
          return;
        }
      }
    }
  };

  const renderHighlightedNotes = (text: string) => {
    if (!text) return null;
    const sortedTagged = [...taggedNames].sort((a, b) => b.length - a.length);
    const knownTags = sortedTagged.map((n) => `@${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    const patternStr = knownTags.length > 0
      ? `(${knownTags.join("|")}|@[\\w&]+)`
      : `(@[\\w&]+)`;
    const regex = new RegExp(patternStr, "g");
    
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-orange-600 font-bold bg-orange-100/90 rounded font-sans px-0.5">
            {part}
          </span>
        );
      }
      return <span key={i} className="text-stone-900">{part}</span>;
    });
  };

  const getCaretLineTop = () => {
    if (!notesAreaRef.current) return 36;
    const textBeforeCursor = aiInstruction.slice(0, notesAreaRef.current.selectionStart || 0);
    const lineCount = (textBeforeCursor.match(/\n/g) || []).length;
    return Math.min(36 + lineCount * 22, 110);
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

    const key = resolveGeminiApiKey(profileData);

    const fullInstruction = attachedItem 
      ? `Attached meal: ${attachedItem.name}. User notes: ${aiInstruction.trim()}`
      : aiInstruction.trim();

    const nutrientPromptList = (activeTrackedNutrients || [])
      .map((n) => `"${n.id}": (${n.name} in ${n.unit})`)
      .join(", ");

    setIsProcessing(true);
    setErrorMessage("");

    try {
      let responseData: any = null;
      const finalImage = imageUrl || uploadedImage || attachedItem?.image || FALLBACK_FOOD_IMAGE;

      const sampleNutrientObj: Record<string, number> = {};
      activeTrackedNutrients.forEach((n) => { sampleNutrientObj[n.id] = 10; });

      const promptText = uploadedImage
        ? `Analyze the food plate in this image. User notes & attached item: "${fullInstruction}". Estimate meal name, total calories (kcal), 1-sentence meal_description, clean dietary tags (e.g. ["High Protein"]), and numerical values for ALL user-tracked nutrients (${nutrientPromptList}). Return ONLY valid JSON: {"name":"...","calories":0,"meal_description":"...","tags":["High Protein"],"nutrients":${JSON.stringify(sampleNutrientObj)}}`
        : `Calculate nutrition for: "${fullInstruction}". Estimate dish name, total calories (kcal), 1-sentence meal_description, clean dietary tags (e.g. ["High Protein"]), and numerical values for ALL user-tracked nutrients (${nutrientPromptList}). Return ONLY valid JSON: {"name":"...","calories":0,"meal_description":"...","tags":["High Protein"],"nutrients":${JSON.stringify(sampleNutrientObj)}}`;

      let cleanBase64 = "";
      let mimeType = "image/jpeg";
      if (uploadedImage) {
        const commaIndex = uploadedImage.indexOf(",");
        mimeType = uploadedImage.substring(5, uploadedImage.indexOf(";base64")) || "image/jpeg";
        cleanBase64 = uploadedImage.substring(commaIndex + 1);
      }

      // 1. Try Supabase Edge Function first (100% Server Proxy Execution)
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.functions.invoke("gemini", {
            body: {
              prompt: promptText,
              image: cleanBase64 || undefined,
              mimeType: cleanBase64 ? mimeType : undefined,
              userApiKey: key || undefined,
            }
          });
          if (!error && data) {
            responseData = data;
          }
        } catch (err) {
          console.warn("[ManualLogModal] Edge function call failed, falling back to direct key:", err);
        }
      }

      // 2. Fallback to direct client key call if Edge Function wasn't available
      if (!responseData && key) {
        const parts: any[] = [{ text: promptText }];
        if (cleanBase64) {
          parts.push({ inlineData: { mimeType, data: cleanBase64 } });
        }
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 300,
              responseMimeType: "application/json"
            }
          })
        });
        if (response.ok) {
          responseData = await response.json();
        }
      }

      const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || responseData?.text || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      const parsedNutrients = parsed.nutrients || {};

      const parseVal = (val: any) => {
        if (typeof val === "number") return isNaN(val) ? 0 : val;
        if (!val) return 0;
        const p = parseFloat(String(val).replace(/[^0-9.]/g, ""));
        return isNaN(p) ? 0 : Math.round(p * 10) / 10;
      };

      const pVal = parseVal(parsedNutrients.protein ?? parsed.protein);
      const cVal = parseVal(parsedNutrients.carbs ?? parsed.carbs);
      const fVal = parseVal(parsedNutrients.fats ?? parsed.fats);
      const fibVal = parseVal(parsedNutrients.fiber ?? parsed.fiber);

      const dynamicNutrientMap: Record<string, number> = {
        protein: pVal,
        carbs: cVal,
        fats: fVal,
        fiber: fibVal,
        ...parsedNutrients,
      };

      const calculatedMeal = {
        id: mealToEdit?.id || `meal_${Date.now()}`,
        name: parsed.name || attachedItem?.name || aiInstruction.trim() || "Custom Meal Log",
        calories: parseVal(parsed.calories) || Math.round(pVal * 4 + cVal * 4 + fVal * 9),
        protein: pVal,
        carbs: cVal,
        fats: fVal,
        fiber: fibVal,
        nutrients: dynamicNutrientMap,
        type: mealToEdit?.type || (uploadedImage ? "AI Photo Log" : "AI Meal Log"),
        time: time.trim(),
        image: finalImage,
        meal_description: parsed.meal_description || parsed.description || aiInstruction.trim(),
        tags: selectedTags.length > 0 ? selectedTags : (parsed.tags || ["AI Log"]),
        isFood: parsed.isFood !== false,
        confidenceScore: parseVal(parsed.confidenceScore) || 92
      };

      // AI Confidence Score Check (Threshold: 90% & Non-Food Guardrail)
      const isNonFoodDetected = calculatedMeal.isFood === false || (calculatedMeal.name && (calculatedMeal.name.toLowerCase().includes("pen") || calculatedMeal.name.toLowerCase().includes("stationery") || calculatedMeal.name.toLowerCase().includes("keys") || calculatedMeal.name.toLowerCase().includes("phone")));

      const confidence = isNonFoodDetected ? 15 : (calculatedMeal.confidenceScore || (aiInstruction.length > 15 ? 92 : 78));

      if ((isNonFoodDetected || confidence < 90) && !hasBeenClarified) {
        setPendingClarification({
          mealData: calculatedMeal,
          confidenceScore: confidence,
          isNonFood: isNonFoodDetected,
          detectedObject: calculatedMeal.name || "Pen",
          image: calculatedMeal.image || uploadedImage || imageUrl,
          question: isNonFoodDetected
            ? `That looks like a ${calculatedMeal.name || "Pen 🖊️"} (non-food item)!`
            : `Is this "${calculatedMeal.name}" prepared with homemade ingredients or restaurant style?`,
          options: isNonFoodDetected
            ? ["Retake Photo", "Search Food Library"]
            : ["Homemade / Healthy Preparation", "Restaurant / Outside Food", "Extra Large Portion"]
        });
        setIsClarificationModalOpen(true);
        setIsProcessing(false);
        return;
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
      setModalStep("preview");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to analyze instruction");
      setIsProcessing(false);
    }
  };

  const handleConfirmClarification = (answer: string) => {
    if (!pendingClarification) return;
    const meal = { ...pendingClarification.mealData };
    if (answer) {
      meal.meal_description = `${meal.meal_description} (${answer})`.trim();
    }
    setHasBeenClarified(true);
    setIsClarificationModalOpen(false);
    onAddMeal(meal);
    setLoggedMealResult(meal);
    setName(meal.name || "");
    setCalories(String(meal.calories || 350));
    setMealDescription(meal.meal_description || "");
    if (meal.image) setImageUrl(meal.image);
    if (meal.tags) setSelectedTags(meal.tags);
    if (meal.nutrients) setEditableNutrients(meal.nutrients);
    setModalStep("preview");
  };

  const handleBypassClarification = () => {
    if (!pendingClarification) return;
    const meal = pendingClarification.mealData;
    setHasBeenClarified(true);
    setIsClarificationModalOpen(false);
    onAddMeal(meal);
    setLoggedMealResult(meal);
    setName(meal.name || "");
    setCalories(String(meal.calories || 350));
    setMealDescription(meal.meal_description || "");
    if (meal.image) setImageUrl(meal.image);
    if (meal.tags) setSelectedTags(meal.tags);
    if (meal.nutrients) setEditableNutrients(meal.nutrients);
    setModalStep("preview");
  };

  const handleRefineWithAI = async () => {
    if (!refinePrompt.trim() && !attachedItem) return;

    const geminiKeyTag = (profileData?.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
    const key = geminiKeyTag.split(":")[1] || "";

    setIsRefining(true);

    try {
      const combinedRefinement = attachedItem 
        ? `Attached reference dish: "${attachedItem.name}". Modification instruction: "${refinePrompt.trim()}"`
        : refinePrompt.trim();

      const nutrientPromptList = (activeTrackedNutrients || [])
        .map((n) => `"${n.id}": (${n.name} in ${n.unit})`)
        .join(", ");

      const currentCal = parseInt(calories, 10) || 350;

      if (!key) {
        // Smart Local Refinement Engine
        let adjustedCal = currentCal;
        const lower = combinedRefinement.toLowerCase();
        if (lower.includes("half") || lower.includes("1/2")) adjustedCal = Math.round(currentCal * 0.5);
        else if (lower.includes("double") || lower.includes("twice")) adjustedCal = currentCal * 2;
        else if (lower.includes("no dressing") || lower.includes("no oil") || lower.includes("without sauce")) adjustedCal = Math.max(100, currentCal - 120);
        else if (lower.includes("add") || lower.includes("extra") || lower.includes("plus")) adjustedCal = currentCal + 150;
        else adjustedCal = Math.max(50, Math.round(currentCal * 0.85));

        const ratio = adjustedCal / (currentCal || 1);
        const newNutrients: Record<string, number> = {};
        Object.keys(editableNutrients).forEach((k) => {
          newNutrients[k] = Math.max(0, Math.round((editableNutrients[k] || 0) * ratio));
        });

        const newName = name.trim() || "Meal Log";
        const newDesc = `${mealDescription ? mealDescription + " • " : ""}${refinePrompt.trim()}`;

        setCalories(String(adjustedCal));
        setEditableNutrients(newNutrients);
        setMealDescription(newDesc);

        const updatedMeal = {
          ...(loggedMealResult || mealToEdit || {}),
          id: loggedMealResult?.id || mealToEdit?.id || `meal_${Date.now()}`,
          name: newName,
          calories: adjustedCal,
          protein: newNutrients.protein || 0,
          carbs: newNutrients.carbs || 0,
          fats: newNutrients.fats || 0,
          fiber: newNutrients.fiber || 0,
          nutrients: newNutrients,
          meal_description: newDesc,
          tags: selectedTags,
          time: time || "12:00 PM",
          image: imageUrl || uploadedImage || attachedItem?.image || FALLBACK_FOOD_IMAGE,
          type: mealToEdit?.type || "Meal Log",
        };

        setLoggedMealResult(updatedMeal);
        onAddMeal(updatedMeal);
        setRefinePrompt("");
        setAttachedItem(null);
        setShowAiRefineInput(false);
        setIsRefining(false);
        return;
      }

      // Live Gemini 1.5 Flash AI Refinement
      const sampleNutrientObj: Record<string, number> = {};
      activeTrackedNutrients.forEach((n) => {
        sampleNutrientObj[n.id] = (editableNutrients && editableNutrients[n.id]) !== undefined
          ? (typeof editableNutrients[n.id] === "number" ? editableNutrients[n.id] : parseFloat(String(editableNutrients[n.id])) || 0)
          : 10;
      });

      const promptText = `The user has logged a meal: "${name}" with ${currentCal} kcal, current notes: "${mealDescription}", nutrients: ${JSON.stringify(editableNutrients)}, tags: ${JSON.stringify(selectedTags)}. The user now wants to refine this meal with these specific instructions: "${combinedRefinement}". Calculate the new meal name, updated total calories (kcal), new meal description/notes, updated clean dietary tags (e.g. ["High Protein"]), and updated values for ALL user nutrients (${nutrientPromptList}). Return ONLY valid JSON: {"name":"...","calories":0,"meal_description":"...","tags":["High Protein"],"nutrients":${JSON.stringify(sampleNutrientObj)}}`;

      const modelName = "gemini-2.5-flash";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 300,
              responseMimeType: "application/json"
            }
          })
        }
      );

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const parseVal = (val: any) => {
          if (typeof val === "number") return isNaN(val) ? 0 : val;
          if (!val) return 0;
          const p = parseFloat(String(val).replace(/[^0-9.]/g, ""));
          return isNaN(p) ? 0 : Math.round(p * 10) / 10;
        };

        const updatedCal = parseVal(parsed.calories) || currentCal;
        const rawParsedNutrients = parsed.nutrients || {};
        const updatedNutrients: Record<string, number> = { ...editableNutrients };
        
        Object.keys(rawParsedNutrients).forEach((k) => {
          updatedNutrients[k] = parseVal(rawParsedNutrients[k]);
        });

        const updatedName = parsed.name || name;
        const updatedDesc = parsed.meal_description || `${mealDescription ? mealDescription + " • " : ""}${refinePrompt.trim()}`;
        const rawTags = Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : selectedTags;
        const cleanTags = rawTags.map((t: string) => t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim());

        setName(updatedName);
        setCalories(String(updatedCal));
        setEditableNutrients(updatedNutrients);
        setMealDescription(updatedDesc);
        setSelectedTags(cleanTags);

        const updatedMeal = {
          ...(loggedMealResult || mealToEdit || {}),
          id: loggedMealResult?.id || mealToEdit?.id || `meal_${Date.now()}`,
          name: updatedName,
          calories: updatedCal,
          protein: parseVal(updatedNutrients.protein),
          carbs: parseVal(updatedNutrients.carbs),
          fats: parseVal(updatedNutrients.fats),
          fiber: parseVal(updatedNutrients.fiber),
          nutrients: updatedNutrients,
          meal_description: updatedDesc,
          tags: cleanTags,
          time: time || "12:00 PM",
          image: imageUrl || uploadedImage || attachedItem?.image || FALLBACK_FOOD_IMAGE,
          type: mealToEdit?.type || "Meal Log",
        };

        setLoggedMealResult(updatedMeal);
        onAddMeal(updatedMeal);
        setRefinePrompt("");
        setAttachedItem(null);
        setShowAiRefineInput(false);
      }
      setIsRefining(false);
    } catch (err: any) {
      console.error(err);
      setIsRefining(false);
    }
  };

  // PURE MANUAL SAVE ACTION
  const handleSaveManualMeal = () => {
    const finalName = name.trim() || attachedItem?.name || "Manual Meal Log";
    if (!finalName) return;

    const finalImage = imageUrl || uploadedImage || attachedItem?.image || FALLBACK_FOOD_IMAGE;

    // Safeguard: Ensure EVERY active tracked nutrient in user's profile is populated
    const finalNutrientMap: Record<string, number> = { ...editableNutrients };
    const calVal = parseInt(calories) || (attachedItem ? attachedItem.calories : 350);

    activeTrackedNutrients.forEach((item) => {
      if (!item || !item.enabled || item.id === "protein") return;
      const id = item.id;
      if (finalNutrientMap[id] === undefined || finalNutrientMap[id] === null || finalNutrientMap[id] === 0) {
        const lowerId = id.toLowerCase();
        if (lowerId === "carbs") finalNutrientMap[id] = finalNutrientMap.carbs || Math.round(calVal * 0.12);
        else if (lowerId === "fats") finalNutrientMap[id] = finalNutrientMap.fats || Math.round(calVal * 0.03);
        else if (lowerId === "fiber") finalNutrientMap[id] = finalNutrientMap.fiber || Math.max(1, Math.round(calVal * 0.01));
        else if (lowerId === "iron") finalNutrientMap[id] = Math.max(1, Math.round(calVal * 0.005 * 10) / 10);
        else if (lowerId === "zinc") finalNutrientMap[id] = Math.max(1, Math.round(calVal * 0.004 * 10) / 10);
        else if (lowerId === "selenium") finalNutrientMap[id] = Math.max(5, Math.round(calVal * 0.08));
        else if (lowerId === "sodium") finalNutrientMap[id] = Math.round(calVal * 1.5);
        else if (lowerId === "caffeine") finalNutrientMap[id] = 0;
        else if (lowerId === "calcium") finalNutrientMap[id] = Math.round(calVal * 0.4);
        else if (lowerId === "potassium") finalNutrientMap[id] = Math.round(calVal * 0.8);
        else finalNutrientMap[id] = Math.round(((item as any).target ? (item as any).target * 0.25 : 5) * 10) / 10;
      }
    });

    let cleanManualDesc = mealDescription.trim();
    if (cleanManualDesc) {
      cleanManualDesc = cleanManualDesc
        .replace(/^Estimated (nutrients|macros|values) based on [^.:]*[.!]?\s*/i, "")
        .replace(/^Standard (portion|serving) of [^.:]*[.!]?\s*/i, "")
        .trim();
    }

    const manualMeal: Meal = {
      id: mealToEdit?.id || `meal_${Date.now()}`,
      date: (mealToEdit as any)?.date || new Date().toISOString().split("T")[0],
      name: finalName,
      calories: calVal,
      protein: finalNutrientMap.protein || (attachedItem ? attachedItem.protein : 0),
      carbs: finalNutrientMap.carbs || (attachedItem ? attachedItem.carbs : 0),
      fats: finalNutrientMap.fats || (attachedItem ? attachedItem.fats : 0),
      fiber: finalNutrientMap.fiber || (attachedItem ? attachedItem.fiber || 0 : 0),
      nutrients: finalNutrientMap,
      type: mealToEdit?.type || "Manual Log",
      time: time.trim(),
      image: finalImage,
      meal_description: cleanManualDesc,
      tags: selectedTags.length > 0 ? selectedTags : ["Manual Log"]
    };

    onAddMeal(manualMeal);
    setLoggedMealResult(manualMeal);
    setImageUrl(finalImage);
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center font-sans" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-950/40 backdrop-blur-md cursor-pointer"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col transition-[height,max-height] duration-300 overflow-hidden max-h-[85dvh]",
          showPastFoodsDrawer || showMentionMenu ? "h-[85vh]" : "h-auto"
        )}
      >
        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
        />

        {showPastFoodsDrawer ? (
          /* FULL HEIGHT DEDICATED FOOD PICKER VIEW (Restored Safe Margins p-4 sm:p-5) */
          <div className="p-4 sm:p-5 space-y-3 flex flex-col h-[85vh] min-h-0 overflow-hidden font-sans">
            {/* Header Bar */}
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.04] shrink-0">
              <button
                type="button"
                onClick={() => setShowPastFoodsDrawer(false)}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-950 hover:text-orange-600 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-orange-500" />
                <span>Select Meal to Attach</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors cursor-pointer border border-stone-200/60 shadow-3xs"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar with unconstrained height */}
            <FoodFilterBar
              filters={foodFilters}
              onChange={setFoodFilters}
              availableTags={allFoodFilterTags}
              trackedNutrients={activeTrackedNutrients}
              showTypeToggles={true}
              matchCount={filteredQuickItems.length}
              placeholder="Search past meals & recipes..."
            />

            {/* Full-Height Scrollable Food List (Safe Margins & Hidden Scrollbar) */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {filteredQuickItems.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <Utensils className="w-10 h-10 text-stone-300 mx-auto" />
                  <p className="text-xs text-stone-400 font-semibold">
                    No matching past meals or recipes found
                  </p>
                </div>
              ) : (
                filteredQuickItems.map((item) => {
                  const isSelected = selectedDrawerItems.some((i) => i.name.toLowerCase() === item.name.toLowerCase());
                  return (
                    <PastFoodCard
                      key={item.name}
                      item={item}
                      trackedNutrients={activeTrackedNutrients}
                      isSelected={isSelected}
                      onToggleSelect={toggleDrawerItemSelect}
                      onModify={undefined}
                    />
                  );
                })
              )}
            </div>

            {/* STICKY BOTTOM CONTEXT-AWARE CTA BAR */}
            <div className="shrink-0 pt-2.5 border-t border-black/[0.04] bg-transparent">
              {selectedDrawerItems.length > 0 ? (
                drawerMode === "log" ? (
                  <div className="space-y-2">
                    {/* Primary CTA: Quick Add */}
                    <button
                      type="button"
                      onClick={handleQuickLogSelectedItems}
                      className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all font-sans"
                    >
                      <Plus className="w-4 h-4 text-white stroke-[3]" />
                      <span>Quick Add ({selectedDrawerItems.length})</span>
                    </button>

                    {/* Secondary CTA: Modify & Add */}
                    <button
                      type="button"
                      onClick={handleAttachSelectedDrawerItems}
                      className="w-full py-3 bg-white/90 hover:bg-stone-100 border border-stone-300/80 text-orange-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-3xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all font-sans"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-orange-500" />
                      <span>Modify & Add ({selectedDrawerItems.length})</span>
                    </button>
                  </div>
                ) : (
                  /* Context A: Single Attachment CTA when opened via Manual Log text prompt */
                  <button
                    type="button"
                    onClick={handleAttachSelectedDrawerItems}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all font-sans"
                  >
                    <AtSign className="w-4 h-4 text-white" />
                    <span>Attach ({selectedDrawerItems.length}) Selected Items to Prompt</span>
                  </button>
                )
              ) : (
                <div className="w-full py-3.5 bg-stone-200/40 border border-stone-300/40 rounded-2xl text-[11px] font-bold text-stone-400 uppercase tracking-wider text-center flex items-center justify-center gap-2 cursor-not-allowed select-none font-sans">
                  <AtSign className="w-3.5 h-3.5 text-stone-400/80 shrink-0" />
                  <span>Tap food cards above to select items</span>
                </div>
              )}
            </div>
          </div>
        ) : modalStep === "input" ? (
          <div className="p-6 space-y-4 flex flex-col h-full min-h-0 overflow-y-auto">
            {/* Header Bar */}
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.04] shrink-0">
              <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest font-sans">
                {isEditing ? "Edit Meal Log" : "Log Meal"}
              </h4>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors cursor-pointer border border-stone-200/60 shadow-3xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SLEEK SEGMENTED CONTROL MODE TOGGLE */}
            <div className="bg-stone-100/90 p-1 rounded-2xl border border-stone-200/60 flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setLogMode("ai")}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center border-none",
                  logMode === "ai"
                    ? "bg-white text-orange-950 shadow-2xs border border-black/[0.04]"
                    : "text-stone-500 hover:text-stone-800 bg-transparent"
                )}
              >
                AI Assistant
              </button>
              <button
                type="button"
                onClick={() => setLogMode("manual")}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center border-none",
                  logMode === "manual"
                    ? "bg-white text-orange-950 shadow-2xs border border-black/[0.04]"
                    : "text-stone-500 hover:text-stone-800 bg-transparent"
                )}
              >
                Manual Entry
              </button>
            </div>

            {/* Scrollable Main Content */}
            <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 text-left min-h-0">
              {logMode === "ai" ? (
                /* MODE 1: AI ASSISTANT LOGGER */
                <div className="space-y-3">
                  {!showMentionMenu && (
                    uploadedImage || imageUrl ? (
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
                      <label className="w-full h-36 bg-stone-100/90 hover:bg-orange-50/60 border-2 border-dashed border-stone-300/80 rounded-3xl cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 shadow-3xs shrink-0 font-sans group active:scale-98">
                        <div className="w-10 h-10 rounded-full bg-white group-hover:bg-orange-100/80 border border-stone-200/80 flex items-center justify-center transition-colors shadow-2xs">
                          <Camera className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="text-center space-y-0.5">
                          <span className="text-xs font-black text-orange-950 uppercase tracking-wider block">
                            Upload Photo <span className="text-[10px] font-normal text-stone-400 lowercase">(optional)</span>
                          </span>
                          <span className="text-[10px] font-bold text-stone-400 block">
                            Tap to choose from camera or gallery
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>
                    )
                  )}

                  <div className="flex-1 flex flex-col min-h-0 w-full space-y-1.5 text-left transition-all duration-300">
                    <div className="flex items-center justify-between shrink-0">
                      <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider block font-sans">
                        {contextGuidance.title}
                      </span>
                      {!showMentionMenu && (
                        <button
                          type="button"
                          onClick={() => {
                            notesAreaRef.current?.focus();
                            setAiInstruction((prev) => (prev ? `${prev} @` : "@"));
                            setMentionQuery("");
                            setShowMentionMenu(true);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100/80 hover:bg-orange-100 border border-orange-200 text-orange-700 text-[10px] font-black uppercase tracking-wider backdrop-blur-md cursor-pointer transition-all active:scale-90 font-sans"
                          title="Tag a past meal or recipe with @"
                        >
                          <AtSign className="w-3 h-3 text-orange-600" />
                          <span>Tag Meal</span>
                        </button>
                      )}
                    </div>

                    {/* SHORTLIST MENU EXPANDS IN-FLOW ABOVE TEXTAREA */}
                    <AnimatePresence>
                      {showMentionMenu && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden w-full font-sans pb-1.5 shrink-0"
                        >
                          <div className="bg-white/98 backdrop-blur-2xl border border-stone-200/90 rounded-2xl shadow-md p-2.5 max-h-44 overflow-y-auto space-y-1 text-left font-sans">
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
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative flex-1 flex flex-col min-h-0 w-full">
                      {/* BACKDROP HIGHLIGHT LAYER FOR ORANGE @MENTIONS */}
                      {aiInstruction && (
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 p-4 pr-24 text-xs font-bold leading-relaxed whitespace-pre-wrap break-words pointer-events-none overflow-hidden font-sans z-[11] select-none"
                        >
                          {renderHighlightedNotes(aiInstruction)}
                        </div>
                      )}

                      <textarea
                        ref={notesAreaRef}
                        placeholder={contextGuidance.placeholder}
                        value={aiInstruction}
                        onChange={handleNotesTextChange}
                        onKeyDown={handleNotesKeyDown}
                        className={cn(
                          "flex-1 w-full h-full min-h-[140px] bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-3xl p-4 pr-24 text-xs font-bold placeholder:text-stone-400 placeholder:font-normal resize-none shadow-xs leading-relaxed font-sans relative z-10",
                          aiInstruction ? "text-transparent caret-stone-900 selection:bg-orange-500/20" : "text-stone-900"
                        )}
                      />

                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-stone-100/90 backdrop-blur-md border border-stone-200/80 rounded-full px-2 py-1 shadow-3xs z-20">
                        {onOpenCamera && (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenCamera(logMode === "ai" ? aiInstruction : name)}
                              className="p-1 text-stone-500 hover:text-orange-600 transition-colors cursor-pointer"
                              title="Open Full-Screen Camera"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-[1px] h-3 bg-stone-300" />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1 text-stone-500 hover:text-orange-600 transition-colors cursor-pointer"
                          title="Upload Photo Gallery"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerMode("attach");
                        setShowPastFoodsDrawer(!showPastFoodsDrawer);
                      }}
                      className="w-full py-3 bg-white border border-stone-200/90 hover:bg-orange-50/60 rounded-2xl text-xs font-black uppercase tracking-wider text-orange-950 cursor-pointer transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-95 font-sans"
                    >
                      <AtSign className="w-4 h-4 text-orange-600 font-bold shrink-0" />
                      <span>Tag & Attach Past Meal or Recipe</span>
                    </button>
                  </div>

                  {attachedItem && (
                    <div className="space-y-2 shrink-0 text-left">
                      <span className="text-[9.5px] font-black uppercase text-orange-950/60 tracking-widest flex items-center gap-1.5 font-sans">
                        <AtSign className="w-3.5 h-3.5 text-orange-500" />
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
                    <label className="w-full h-32 rounded-3xl bg-stone-50 hover:bg-orange-50/40 border-2 border-dashed border-stone-200 hover:border-orange-400 flex flex-col items-center justify-center space-y-1.5 cursor-pointer transition-all shrink-0">
                      <div className="w-9 h-9 rounded-2xl bg-white border border-stone-200/80 shadow-3xs flex items-center justify-center text-orange-500">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-stone-850 uppercase tracking-wide">
                        Upload Meal Photo
                      </span>
                      <span className="text-[9.5px] font-medium text-stone-400">
                        Tap to pick from gallery or take photo
                      </span>
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
                      rows={4}
                      placeholder="Add meal description, preparation notes, or ingredients..."
                      value={mealDescription}
                      onChange={(e) => setMealDescription(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl p-3 text-xs font-medium text-stone-800 shadow-3xs resize-y min-h-[96px] max-h-[220px] leading-relaxed"
                    />
                  </div>

                  {/* Row 3: 1-Line Time & Calories Row */}
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
                              <StepperButton
                                onStep={() => handleNutrientStep(nutrient.id, -1)}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </StepperButton>
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
                              <StepperButton
                                onStep={() => handleNutrientStep(nutrient.id, 1)}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </StepperButton>
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
                  <span>{isProcessing ? "Calculating..." : "Generate & Log Meal"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveManualMeal}
                  className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider text-center shadow-lg shadow-orange-500/25 cursor-pointer transition-all active:scale-95"
                >
                  <span>SAVE & LOG MEAL</span>
                </button>
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
              
              {/* Gourmet Dark Ambient Gradient Overlay (Ensures 100% legibility on light images) */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/45 to-black/20 pointer-events-none" />

              {/* Top Controls: Back Button & Camera Upload (Left) + Share Button (Right) */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (mealToEdit) {
                        onClose();
                      } else {
                        setModalStep("input");
                      }
                    }}
                    className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                    title={mealToEdit ? "Back to Dashboard" : "Back to Log Input"}
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                    title="Change / Upload Photo"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {onShareMeal && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentMealObj = getCurrentMealData();
                        onAddMeal(currentMealObj);
                        onShareMeal(currentMealObj);
                      }}
                      className="h-8 px-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer border border-orange-400/40"
                      title="Share meal card"
                    >
                      <Share2 className="w-3.5 h-3.5 text-white" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Image Overlay: Single Frosted Pill + Hero Title + Clean Grey Metadata */}
              <div className="absolute bottom-4 left-4 right-4 z-10 text-left space-y-1.5">
                {/* Meal / Recipe Log Count Frosted Pill (High contrast dark frosted capsule) */}
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-black/65 backdrop-blur-md border border-orange-400/50 px-3 py-1 rounded-full shadow-md">
                    <span className="w-2 h-2 rounded-full bg-orange-400 shadow-xs shadow-orange-400/80 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-300">
                      Logged {matchedRecipe?.log_count || mealLogCount || 1} time{(matchedRecipe?.log_count || mealLogCount || 1) === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                {/* Full Width Meal Title */}
                <h3 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-md truncate font-sans leading-tight text-white">
                  {name || (isEditing ? "Edit Meal Log" : "Gourmet Meal Log")}
                </h3>

                {/* Clean Grey Text Metadata Line (Below Title) */}
                <div className="flex items-center gap-1.5 text-stone-300 text-[11px] font-bold tracking-wide drop-shadow-sm">
                  <span className="text-orange-400 font-extrabold">{calories || "0"} KCAL</span>
                  <span className="text-stone-400 select-none">•</span>
                  <span>{formatDisplayTime(time)}</span>
                  <span className="text-stone-400 select-none">•</span>
                  <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              </div>
            </div>

            {/* Scrollable Body: Live Direct Editing Fields */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 text-left">
              {/* Row 1: Key Stats Banner (Logged Time Picker & Calories Stepper) */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Logged Time Picker Card */}
                <button
                  type="button"
                  onClick={() => setIsTimePickerOpen(true)}
                  className="bg-white border border-stone-200/80 hover:border-orange-400 focus:border-orange-500 rounded-2xl p-3 shadow-3xs flex items-center gap-2.5 cursor-pointer transition-all active:scale-[0.98] text-left border-none"
                  title="Tap to change logged time"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[8.5px] font-black uppercase text-stone-400 tracking-wider block">
                      Logged Time
                    </span>
                    <span className="text-xs font-black text-stone-900 block truncate">
                      {time || "12:00 PM"}
                    </span>
                  </div>
                </button>

                {/* Total Energy Stepper Card */}
                <div className="bg-white border border-stone-200/80 rounded-2xl p-3 shadow-3xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                    <Flame className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[8.5px] font-black uppercase text-orange-600 tracking-wider block">
                      Calories
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <StepperButton
                        onStep={() => {
                          setCalories((prev) => {
                            const c = parseInt(prev) || 0;
                            return String(Math.max(0, c - 25));
                          });
                        }}
                        className="w-5 h-5 rounded-md flex items-center justify-center text-orange-950/60 hover:text-orange-950 hover:bg-orange-100/60 active:scale-90 transition-all border-none bg-transparent cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </StepperButton>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={calories === "0" ? "" : calories}
                        onChange={(e) => setCalories(e.target.value)}
                        className="bg-transparent border-none text-center text-xs font-black text-orange-950 focus:outline-none w-12 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[10px] font-black text-orange-950/60">kcal</span>
                      <StepperButton
                        onStep={() => {
                          setCalories((prev) => {
                            const c = parseInt(prev) || 0;
                            return String(c + 25);
                          });
                        }}
                        className="w-5 h-5 rounded-md flex items-center justify-center text-orange-950/60 hover:text-orange-950 hover:bg-orange-100/60 active:scale-90 transition-all border-none bg-transparent cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </StepperButton>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Meal Title */}
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

              {/* Row 3: Description / Extra Notes */}
              <div>
                <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                  Description / Extra Notes
                </label>
                <textarea
                  rows={4}
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl p-3 text-xs font-medium text-stone-800 shadow-3xs resize-y min-h-[96px] max-h-[220px] leading-relaxed"
                  placeholder="Add meal description, preparation notes, or ingredients..."
                />
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
                          <StepperButton
                            onStep={() => handleNutrientStep(nutrient.id, -1)}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </StepperButton>
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
                          <StepperButton
                            onStep={() => handleNutrientStep(nutrient.id, 1)}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer active:scale-90 transition-all border-none bg-transparent"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </StepperButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Dietary Tags */}
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

              {/* Row 6: Minimalist Delete Option for existing meal */}
              {isEditing && onDeleteMeal && (
                <div className="pt-3 pb-1 flex justify-center border-t border-stone-200/50">
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
                      <span className="text-[10.5px] font-bold text-red-950">Delete meal log?</span>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
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

            {/* STICKY BOTTOM ACTIONS BAR */}
            <div className="p-4 bg-white/95 backdrop-blur-md border-t border-stone-200/60 shrink-0 w-full font-sans space-y-2.5">
              {showAiRefineInput ? (
                /* STICKY BOTTOM DOCKED AI PANEL */
                <div className="space-y-2.5 animate-fade-in text-left">
                  <textarea
                    rows={3}
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="Describe changes (e.g. 'I only ate half', 'no dressing', 'add 20g protein')..."
                    className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 focus:bg-white focus:outline-none rounded-2xl p-3 text-xs font-bold text-stone-900 placeholder:text-stone-400 resize-y min-h-[84px] max-h-[160px] shadow-inner leading-relaxed"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAiRefineInput(false);
                        setRefinePrompt("");
                      }}
                      className="h-10 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-3xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isRefining || (!refinePrompt.trim() && !attachedItem)}
                      onClick={handleRefineWithAI}
                      className="h-10 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 border-none"
                    >
                      {isRefining ? (
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
                  onClick={() => setShowAiRefineInput(true)}
                  className="w-full h-11 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-3xs"
                >
                  <Wand2 className="w-3.5 h-3.5 text-orange-500" />
                  <span>Edit with AI Assist</span>
                </button>
              )}

              {/* Row 2: Full-Width Signature Orange Save Button */}
              <button
                type="button"
                onClick={() => {
                  const currentMealObj = getCurrentMealData();
                  onAddMeal(currentMealObj);
                  onClose();
                }}
                className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none"
              >
                <Check className="w-4 h-4 text-white stroke-[3]" />
                <span>{isEditing ? "Save Meal Log" : "Log Meal (1-Tap)"}</span>
              </button>
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

      {/* Antigravity AI Clarification Modal (90% Confidence Threshold & Non-Food Guardrail) */}
      <AiClarificationModal
        isOpen={isClarificationModalOpen}
        clarificationData={pendingClarification}
        onConfirm={handleConfirmClarification}
        onLogAnyway={handleBypassClarification}
        onRetakePhoto={() => {
          setIsClarificationModalOpen(false);
          setUploadedImage(null);
          setImageUrl("");
          setModalStep("type");
        }}
        onSearchFood={() => {
          setIsClarificationModalOpen(false);
          setShowPastFoodsDrawer(true);
        }}
        onClose={() => setIsClarificationModalOpen(false)}
      />
    </div>,
    document.body
  );
};
