import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Camera,
  Sparkles,
  Image as ImageIcon,
  FileText,
  Share2,
  Grid,
  Zap,
  ZapOff,
  CheckCircle2,
  Tag,
  Plus,
  Minus,
  Edit2,
  Pencil,
  Check,
  X,
  Square,
  RectangleVertical,
  Smartphone,
  Search,
  Paperclip,
  AtSign,
  Utensils,
  Clock,
  Flame,
  Wand2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { DEFAULT_TRACKED_NUTRIENTS, normalizeTrackedNutrients } from "../constants/nutrition";
import type { TrackedNutrient } from "../types";
import { PastFoodCard, PastFoodItem } from "./PastFoodCard";
import { StepperButton } from "./StepperButton";
import { TimePickerModal } from "./TimePickerModal";
import { formatDisplayTime } from "../utils/helpers";
import { FoodFilterBar } from "./FoodFilterBar";
import {
  filterAndSortFoods,
  getUserActiveAiTags,
  INITIAL_FOOD_FILTER_STATE,
  FoodFilterState,
} from "../utils/foodFilter";
import { AiClarificationModal, PendingAiClarification } from "./AiClarificationModal";

export const CameraLogView = ({
  setActiveTab,
  profileData,
  mealsState,
  recipesState,
  onAddMeal,
  triggerToast,
  onShareMeal,
  initialNotes,
}: {
  setActiveTab: (tab?: string) => void;
  profileData: any;
  mealsState?: any[];
  recipesState?: any[];
  onAddMeal: (meal: any) => void;
  triggerToast: (msg: string) => void;
  onShareMeal?: (meal: any) => void;
  initialNotes?: string;
}) => {
  // Flow States: "capture" -> "confirm" -> "preview"
  const [flowStep, setFlowStep] = useState<"capture" | "confirm" | "preview">("capture");
  
  // In Step 3 (preview): View vs Edit Mode
  const [isEditingDetails, setIsEditingDetails] = useState<boolean>(false);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState(initialNotes || "");
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(true);

  useEffect(() => {
    if (initialNotes) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);
  
  // Step 1 Notes Bottom-Sheet Popup State
  const [showNotesModal, setShowNotesModal] = useState(false);

  // SINGLE ATTACHED MEAL (Rule: 1 Meal Only for Maximum Simplicity)
  const [attachedItem, setAttachedItem] = useState<PastFoodItem | null>(null);
  
  // Toggle State for Expandable Past Foods & Recipes Drawer
  const [showPastFoodsDrawer, setShowPastFoodsDrawer] = useState(false);
  const [pastFoodFilters, setPastFoodFilters] = useState<FoodFilterState>(INITIAL_FOOD_FILTER_STATE);

  // Inline "@" Mention Auto-Complete Menu States
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [taggedNames, setTaggedNames] = useState<string[]>([]);

  // Instagram/TikTok-Grade Aspect Ratio Switcher: "1:1" -> "3:4" -> "9:16"
  const [aspectRatioMode, setAspectRatioMode] = useState<"1:1" | "3:4" | "9:16">("3:4");
  
  // Toolbar Toggles
  const [showGridTarget, setShowGridTarget] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loggedMealResult, setLoggedMealResult] = useState<any | null>(null);
  const [showAiRefineInput, setShowAiRefineInput] = useState(false);

  // AI Confidence & Clarification Flow States (90% Threshold)
  const [pendingClarification, setPendingClarification] = useState<PendingAiClarification | null>(null);
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
  const [hasBeenClarified, setHasBeenClarified] = useState(false);

  // Live WebRTC Stream State for Macbook / Desktop / Mobile
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const notesAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // Master Registry of ALL requested hardware tracks to guarantee 100% termination
  const allTracksRef = useRef<MediaStreamTrack[]>([]);

  // Editable Meal Card States (Step 3)
  const [editableName, setEditableName] = useState("");
  const [editableDesc, setEditableDesc] = useState("");
  const [editableCalories, setEditableCalories] = useState<number>(350);
  const [editableTime, setEditableTime] = useState<string>("");
  const [editableTags, setEditableTags] = useState<string[]>([]);
  const [editableNutrients, setEditableNutrients] = useState<Record<string, number>>({});

  // AI Refine Prompt in Step 3
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const changePhotoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fullPageNotesRef = useRef<HTMLTextAreaElement>(null);

  const convert24hTo12h = (time24: string): string => {
    if (!time24) return "12:00 PM";
    const [hoursStr, minutesStr] = time24.split(":");
    const hours = parseInt(hoursStr, 10);
    if (isNaN(hours)) return time24;
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours.toString().padStart(2, "0")}:${minutesStr || "00"} ${ampm}`;
  };

  const convert12hTo24h = (time12: string): string => {
    if (!time12) return "12:00";
    if (!time12.includes("AM") && !time12.includes("PM")) {
      const parts = time12.split(":");
      if (parts.length === 2) {
        const h = parseInt(parts[0], 10);
        const m = parts[1];
        return `${(isNaN(h) ? 12 : h).toString().padStart(2, "0")}:${m}`;
      }
      return "12:00";
    }
    const [timeVal, modifier] = time12.split(" ");
    let [hoursStr, minutesStr] = (timeVal || "12:00").split(":");
    let hours = parseInt(hoursStr, 10);
    if (isNaN(hours)) hours = 12;
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutesStr || "00"}`;
  };

  const formatDisplayTime = (t: string): string => {
    if (!t) return "12:00 PM";
    if (t.includes("AM") || t.includes("PM")) return t;
    return convert24hTo12h(t);
  };

  // Dynamic Guidance Metadata (Label & Placeholder changes in real time!)
  const contextGuidance = useMemo(() => {
    if (uploadedImage && attachedItem) {
      return {
        title: "Photo & Portion Notes",
        placeholder: "Add extra details or portion tweaks for accuracy..."
      };
    }
    if (uploadedImage) {
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
  }, [uploadedImage, attachedItem]);

  // Safe fallback for tracked nutrients
  const activeTrackedNutrients: TrackedNutrient[] = normalizeTrackedNutrients(
    profileData?.tracked_nutrients || DEFAULT_TRACKED_NUTRIENTS,
    profileData?.protein_goal
  );

  // Calculate Unified Past Meals & Saved Recipes List (Synced with ManualLogModal)
  const quickLogItems = useMemo<PastFoodItem[]>(() => {
    const items: PastFoodItem[] = [];
    const seenNames = new Set<string>();
    const getKey = (n: string) => n.trim().toLowerCase();

    const meals = mealsState && mealsState.length > 0 ? mealsState : (profileData?.meals || []);
    const recipes = recipesState && recipesState.length > 0 ? recipesState : (profileData?.recipes || []);

    const mealCounts = new Map<string, number>();
    meals.forEach((item: any) => {
      const key = getKey(item.name || "");
      if (key) mealCounts.set(key, (mealCounts.get(key) || 0) + 1);
    });

    recipes.forEach((recipe: any) => {
      const key = getKey(recipe.name || "");
      if (key) {
        seenNames.add(key);
        items.push({
          name: recipe.name,
          calories: recipe.calories || 0,
          protein: recipe.protein || 0,
          carbs: recipe.carbs || 0,
          fats: recipe.fats || 0,
          fiber: recipe.fiber || 0,
          image: recipe.image || "",
          type: "Recipe",
          meal_description: recipe.description || "",
          logCount: mealCounts.get(key) || 0,
          source: "recipe"
        });
      }
    });

    meals.forEach((meal: any) => {
      const key = getKey(meal.name || "");
      if (key && !seenNames.has(key)) {
        seenNames.add(key);
        items.push({
          name: meal.name,
          calories: meal.calories || 0,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fats: meal.fats || 0,
          fiber: meal.fiber || 0,
          image: meal.image || "",
          type: meal.type || "Meal",
          meal_description: meal.meal_description || "",
          logCount: mealCounts.get(key) || 1,
          source: "recent"
        });
      }
    });

    if (items.length === 0) {
      [
        { name: "Avocado Toast", calories: 280, protein: 10, carbs: 32, fats: 14, fiber: 6, source: "recent" as const, logCount: 2, meal_description: "Thin sourdough with avocado & sea salt" },
        { name: "Crispy Masala Dosa", calories: 360, protein: 6, carbs: 54, fats: 12, fiber: 4, source: "recipe" as const, logCount: 1, meal_description: "Thin, crispy fermented rice crepe stuffed with potato" },
        { name: "Spinach & Cheese Omelette", calories: 290, protein: 22, carbs: 3, fats: 22, fiber: 2, source: "recipe" as const, logCount: 3, meal_description: "Rich, cheesy omelette folded with fresh butter" },
        { name: "Steamed Idli with Sambar", calories: 220, protein: 7, carbs: 44, fats: 1, fiber: 3, source: "recipe" as const, logCount: 1, meal_description: "Soft, steamed rice cakes served with warm lentil stew" },
      ].forEach((fallback) => items.push(fallback));
    }

    return items;
  }, [mealsState, recipesState, profileData?.meals, profileData?.recipes]);

  const allFoodFilterTags = useMemo(() => {
    return getUserActiveAiTags(profileData?.tracking_tags);
  }, [profileData?.tracking_tags]);

  const filteredPastItems = useMemo(() => {
    let list = quickLogItems;
    if (pastFoodFilters.showRecipes === false) {
      list = list.filter((item) => item.source !== "recipe");
    }
    if (pastFoodFilters.showLogs === false) {
      list = list.filter((item) => item.source !== "recent");
    }
    return filterAndSortFoods(list as any, pastFoodFilters, undefined, activeTrackedNutrients);
  }, [quickLogItems, pastFoodFilters, activeTrackedNutrients]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery.trim()) return quickLogItems.slice(0, 5);
    const q = mentionQuery.toLowerCase();
    return quickLogItems.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 5);
  }, [quickLogItems, mentionQuery]);

  // ATTACH SINGLE MEAL (Replaces previous attached meal instantly & auto-collapses drawer!)
  const handleAttachItem = (item: PastFoodItem) => {
    setAttachedItem(item);
    triggerToast(`📎 Attached "${item.name}"`);
    setShowMentionMenu(false);
    setShowPastFoodsDrawer(false);
    setShowNotesModal(false); // 100% CLOSE ALL POPUPS
    setNotes((prev) => {
      const lastAt = prev.lastIndexOf("@");
      return lastAt !== -1 ? prev.slice(0, lastAt).trim() : prev;
    });
  };

  const handleRemoveAttached = () => {
    if (attachedItem) {
      triggerToast(`✕ Removed "${attachedItem.name}"`);
    }
    setAttachedItem(null);
  };

  const handleNotesTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);

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
    const lastAtIndex = notes.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      setNotes(notes.slice(0, lastAtIndex) + `@${item.name} `);
    } else {
      setNotes((prev) => prev + ` @${item.name} `);
    }
    setShowMentionMenu(false);
    triggerToast(`🏷️ Tagged "@${item.name}"`);
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Backspace") {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = notes.slice(0, cursorPos);

      for (const name of taggedNames) {
        const tagStr1 = `@${name} `;
        const tagStr2 = `@${name}`;
        if (textBeforeCursor.endsWith(tagStr1)) {
          e.preventDefault();
          const newNotes = notes.slice(0, cursorPos - tagStr1.length) + notes.slice(cursorPos);
          setNotes(newNotes);
          return;
        }
        if (textBeforeCursor.endsWith(tagStr2)) {
          e.preventDefault();
          const newNotes = notes.slice(0, cursorPos - tagStr2.length) + notes.slice(cursorPos);
          setNotes(newNotes);
          return;
        }
      }
    }
  };

  const renderHighlightedNotes = (text: string) => {
    if (!text) return null;
    
    // Sort tagged names by length descending so longer phrases match first
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
          <span key={i} className="text-orange-400 font-bold bg-orange-500/30 rounded font-sans">
            {part}
          </span>
        );
      }
      return <span key={i} className="text-white">{part}</span>;
    });
  };

  const getFullCombinedPrompt = (): string => {
    if (attachedItem && notes.trim()) {
      return `Attached meal: ${attachedItem.name}. Notes: ${notes.trim()}`;
    }
    if (attachedItem) {
      return `Attached meal: ${attachedItem.name}`;
    }
    return notes.trim();
  };

  const stopCameraHardware = () => {
    allTracksRef.current.forEach((track) => {
      try {
        track.enabled = false;
        track.stop();
      } catch (_) {}
    });
    allTracksRef.current = [];

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        try {
          track.enabled = false;
          track.stop();
        } catch (_) {}
      });
      setCameraStream(null);
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (_) {}
    }
  };

  const handleExitToDashboard = () => {
    stopCameraHardware();
    if (flowStep === "preview" && loggedMealResult) {
      const finalMealObj = {
        ...loggedMealResult,
        name: editableName,
        meal_description: editableDesc,
        calories: editableCalories,
        time: editableTime || loggedMealResult.time || "12:00 PM",
        tags: editableTags,
        nutrients: editableNutrients,
      };
      onAddMeal(finalMealObj);
    }
    setActiveTab("home");
  };

  useEffect(() => {
    let isCancelled = false;

    if (flowStep === "capture" && !uploadedImage) {
      if (cameraStream && videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = cameraStream;
        return;
      }

      if (!cameraStream && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
          .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
          .then((stream) => {
            if (isCancelled || !stream) return;
            
            const videoTracks = stream.getVideoTracks();
            allTracksRef.current.push(...videoTracks);

            setCameraStream(stream);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.log("WebRTC fallback to file input:", err);
            setHasMediaPermission(false);
          });
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [flowStep, uploadedImage]);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      stopCameraHardware();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handleBeforeUnload);

    return () => {
      stopCameraHardware();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handleBeforeUnload);
    };
  }, []);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setHasMediaPermission(false);
      return;
    }
    setHasMediaPermission(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      stopCameraHardware();
      const newImg = reader.result as string;
      setUploadedImage(newImg);
      handleAnalyzeAndLog(newImg);
    };
    reader.readAsDataURL(file);
  };

  const handleChangePreviewPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const newImg = reader.result as string;
      setUploadedImage(newImg);
      setLoggedMealResult((prev: any) => (prev ? { ...prev, image: newImg } : null));
      triggerToast("Photo updated! 📷");
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureFromWebcam = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        stopCameraHardware();
        setUploadedImage(dataUrl);
        handleAnalyzeAndLog(dataUrl);
        return;
      }
    }
    fileInputRef.current?.click();
  };

  const handleCycleAspectRatio = () => {
    let nextMode: "1:1" | "3:4" | "9:16" = "1:1";
    if (aspectRatioMode === "1:1") nextMode = "3:4";
    else if (aspectRatioMode === "3:4") nextMode = "9:16";
    else if (aspectRatioMode === "9:16") nextMode = "1:1";

    setAspectRatioMode(nextMode);
    const labelMap = { "1:1": "Square (1:1)", "3:4": "Portrait (3:4)", "9:16": "Full Story (9:16)" };
    triggerToast(`📐 Frame: ${labelMap[nextMode]}`);
  };

  const handleAnalyzeAndLog = async (imageOverride?: string) => {
    const targetImage = imageOverride || uploadedImage;
    if (!targetImage) return;

    const combinedNotes = getFullCombinedPrompt();

    const geminiKeyTag = (profileData?.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
    const key = geminiKeyTag.split(":")[1] || "";

    setIsProcessing(true);
    setErrorMessage("");

    try {
      let mealData: any = null;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const dynamicNutrientValues: Record<string, number> = {};
      (activeTrackedNutrients || []).forEach((n) => {
        if (n.id === "protein") dynamicNutrientValues.protein = 32;
        else if (n.id === "carbs") dynamicNutrientValues.carbs = 45;
        else if (n.id === "fats") dynamicNutrientValues.fats = 14;
        else if (n.id === "fiber") dynamicNutrientValues.fiber = 6;
        else if (n.id === "caffeine") dynamicNutrientValues.caffeine = 95;
        else if (n.id === "sugar") dynamicNutrientValues.sugar = 8;
        else if (n.id === "sodium") dynamicNutrientValues.sodium = 380;
        else dynamicNutrientValues[n.id] = 10;
      });

      const detectedTags: string[] = ["Photo Log"];
      const lowerNotes = combinedNotes.toLowerCase();
      if (lowerNotes.includes("egg") || lowerNotes.includes("chicken") || lowerNotes.includes("protein")) detectedTags.push("High Protein");
      if (lowerNotes.includes("sourdough") || lowerNotes.includes("bread") || lowerNotes.includes("carb")) detectedTags.push("Low Fat");
      if (lowerNotes.includes("coffee") || lowerNotes.includes("espresso")) detectedTags.push("Caffeine");
      if (lowerNotes.includes("keto") || lowerNotes.includes("avocado")) detectedTags.push("Keto");
      if (detectedTags.length === 1) detectedTags.push("Balanced");

      if (!key) {
        const mockMealName = combinedNotes.trim() ? combinedNotes.trim() : "Scanned Healthy Meal";
        mealData = {
          id: `camera_log_${Date.now()}`,
          name: mockMealName,
          calories: 450,
          protein: dynamicNutrientValues.protein || 32,
          carbs: dynamicNutrientValues.carbs || 45,
          fats: dynamicNutrientValues.fats || 14,
          fiber: dynamicNutrientValues.fiber || 6,
          nutrients: dynamicNutrientValues,
          type: "Camera Log",
          time: timeStr,
          image: targetImage,
          meal_description: combinedNotes.trim() || "AI Photo Recognition Log",
          tags: detectedTags
        };
      } else {
        const base64Data = targetImage.split(",")[1];
        const mimeType = targetImage.split(";")[0].split(":")[1] || "image/jpeg";

        const nutrientPromptList = (activeTrackedNutrients || [])
          .map((n) => `"${n.id}": (${n.name} in ${n.unit})`)
          .join(", ");

        const promptText = `Analyze this image. User notes: "${combinedNotes}". FIRST check if the main subject is edible food or a beverage. If it is NOT food (e.g. pen, stationery, keys, phone, desk, clothing), return JSON: {"isFood": false, "name": "Pen", "confidenceScore": 15}. If it IS food, estimate meal name, confidenceScore (0-100), total calories (kcal), dietary tags (clean text only e.g. ["High Protein"]), and user-tracked nutrients: ${nutrientPromptList}. Return ONLY valid JSON: {"isFood": true, "name":"...", "confidenceScore": 85, "calories":0,"tags":["High Protein"],"nutrients":{"protein":0,"carbs":0,"fats":0,"fiber":0}}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: promptText },
                    { inline_data: { mime_type: mimeType, data: base64Data } }
                  ]
                }
              ]
            })
          }
        );

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
          throw new Error("Could not parse nutrition data from photo. Please try again.");
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const parsedNutrients = parsed.nutrients || {};
        const rawTags = Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : detectedTags;
        
        const cleanParsedTags = rawTags.map((t: string) => t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim());

        mealData = {
          id: `camera_log_${Date.now()}`,
          name: parsed.name || "Scanned Healthy Meal",
          calories: parseInt(parsed.calories) || 350,
          protein: parseInt(parsedNutrients.protein || parsed.protein) || 25,
          carbs: parseInt(parsedNutrients.carbs || parsed.carbs) || 35,
          fats: parseInt(parsedNutrients.fats || parsed.fats) || 12,
          fiber: parseInt(parsedNutrients.fiber || parsed.fiber) || 5,
          nutrients: parsedNutrients,
          type: "Camera Log",
          time: timeStr,
          image: targetImage,
          meal_description: combinedNotes.trim() || "AI Photo Recognition Log",
          tags: cleanParsedTags
        };
      }

      // AI Confidence Score Check (Threshold: 90% & Non-Food Guardrail)
      const isNonFoodDetected = mealData.isFood === false || (mealData.name && (mealData.name.toLowerCase().includes("pen") || mealData.name.toLowerCase().includes("stationery") || mealData.name.toLowerCase().includes("keys") || mealData.name.toLowerCase().includes("phone")));

      const confidence = isNonFoodDetected ? 15 : (mealData.confidenceScore || (combinedNotes.length > 15 ? 92 : 78));

      if ((isNonFoodDetected || confidence < 90) && !hasBeenClarified) {
        setPendingClarification({
          mealData,
          confidenceScore: confidence,
          isNonFood: isNonFoodDetected,
          detectedObject: mealData.name || "Pen",
          image: targetImage,
          question: isNonFoodDetected
            ? `That looks like a ${mealData.name || "Pen 🖊️"} (non-food item)!`
            : `Is this "${mealData.name}" prepared with homemade ingredients or restaurant style?`,
          options: isNonFoodDetected
            ? ["Retake Photo", "Search Food Library"]
            : ["Homemade / Healthy Preparation", "Restaurant / Outside Food", "Extra Large Portion"]
        });
        setIsClarificationModalOpen(true);
        setIsProcessing(false);
        return;
      }

      onAddMeal(mealData);
      setLoggedMealResult(mealData);
      setEditableName(mealData.name);
      setEditableDesc(mealData.meal_description);
      setEditableCalories(mealData.calories);
      setEditableTags(mealData.tags || []);
      setEditableNutrients(mealData.nutrients || dynamicNutrientValues);
      setEditableTime(mealData.time || timeStr);
      setRefinePrompt("");
      
      triggerToast("Photo Meal Logged! ✨");
      setIsProcessing(false);
      setFlowStep("preview");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to analyze photo.");
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
    setEditableName(meal.name);
    setEditableDesc(meal.meal_description);
    setEditableCalories(meal.calories);
    setEditableTags(meal.tags || []);
    setEditableNutrients(meal.nutrients || {});
    setEditableTime(meal.time || "");
    triggerToast("Photo Meal Logged! ✨");
    setFlowStep("preview");
  };

  const handleBypassClarification = () => {
    if (!pendingClarification) return;
    const meal = pendingClarification.mealData;
    setHasBeenClarified(true);
    setIsClarificationModalOpen(false);
    onAddMeal(meal);
    setLoggedMealResult(meal);
    setEditableName(meal.name);
    setEditableDesc(meal.meal_description);
    setEditableCalories(meal.calories);
    setEditableTags(meal.tags || []);
    setEditableNutrients(meal.nutrients || {});
    setEditableTime(meal.time || "");
    triggerToast("Photo Meal Logged! ✨");
    setFlowStep("preview");
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

      if (!key) {
        // Smart Local Refinement Engine
        const currentCal = editableCalories || 450;
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

        const newName = editableName;
        const newDesc = `${editableDesc ? editableDesc + " • " : ""}${refinePrompt.trim()}`;

        setEditableCalories(adjustedCal);
        setEditableNutrients(newNutrients);
        setEditableDesc(newDesc);

        const updatedMeal = {
          ...loggedMealResult,
          name: newName,
          calories: adjustedCal,
          nutrients: newNutrients,
          meal_description: newDesc,
          tags: editableTags,
          time: editableTime || loggedMealResult?.time || "12:00 PM",
        };
        setLoggedMealResult(updatedMeal);
        onAddMeal(updatedMeal);
        setRefinePrompt("");
        setAttachedItem(null);
        setShowAiRefineInput(false);
        triggerToast("Meal refined with AI! ✨");
        setIsRefining(false);
        return;
      }

      // Live Gemini 1.5 Flash AI Refinement
      const promptText = `The user has logged a meal: "${editableName}" with ${editableCalories} kcal, current notes: "${editableDesc}", nutrients: ${JSON.stringify(editableNutrients)}, tags: ${JSON.stringify(editableTags)}. The user now wants to refine this meal with these specific instructions: "${combinedRefinement}". Calculate the new meal name, updated total calories (kcal), new meal description/notes, updated clean dietary tags (e.g. ["High Protein"]), and updated user nutrients (${nutrientPromptList}). Return ONLY valid JSON: {"name":"...","calories":0,"meal_description":"...","tags":["High Protein"],"nutrients":{"protein":0,"carbs":0,"fats":0,"fiber":0}}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        }
      );

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const updatedCal = parseInt(parsed.calories) || editableCalories;
        const updatedNutrients = parsed.nutrients || editableNutrients;
        const updatedName = parsed.name || editableName;
        const updatedDesc = parsed.meal_description || `${editableDesc ? editableDesc + " • " : ""}${refinePrompt.trim()}`;
        const rawTags = Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : editableTags;
        const cleanTags = rawTags.map((t: string) => t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim());

        setEditableName(updatedName);
        setEditableCalories(updatedCal);
        setEditableNutrients(updatedNutrients);
        setEditableDesc(updatedDesc);
        setEditableTags(cleanTags);

        const updatedMeal = {
          ...loggedMealResult,
          name: updatedName,
          calories: updatedCal,
          nutrients: updatedNutrients,
          meal_description: updatedDesc,
          tags: cleanTags,
          time: editableTime || loggedMealResult?.time || "12:00 PM",
        };
        setLoggedMealResult(updatedMeal);
        onAddMeal(updatedMeal);
        setRefinePrompt("");
        setAttachedItem(null);
        setShowAiRefineInput(false);
        triggerToast("Meal refined with AI! ✨");
      }
      setIsRefining(false);
    } catch (err: any) {
      console.error(err);
      triggerToast("Could not refine meal. Please try again.");
      setIsRefining(false);
    }
  };

  const toggleTag = (tagToToggle: string) => {
    if (editableTags.includes(tagToToggle)) {
      setEditableTags(editableTags.filter((t) => t !== tagToToggle));
    } else {
      setEditableTags([...editableTags, tagToToggle]);
    }
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

  const availableTags = useMemo(() => {
    return getUserActiveAiTags(profileData?.tracking_tags);
  }, [profileData?.tracking_tags]);

  const mealLogCount = useMemo(() => {
    if (!editableName.trim() || !mealsState) return 1;
    const q = editableName.trim().toLowerCase();
    const count = mealsState.filter((m: any) => m.name?.trim().toLowerCase() === q).length;
    return Math.max(1, count);
  }, [editableName, mealsState]);

  return (
    <div
      className={cn(
        "w-full min-h-[100dvh] flex flex-col justify-between select-none animate-fade-in text-left transition-colors duration-300 relative overflow-hidden",
        flowStep === "preview" ? "bg-[#FAF7F2] text-stone-900 p-0" : "bg-black text-white p-0 m-0"
      )}
    >
      {/* Hidden Native File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />
      <input
        ref={changePhotoInputRef}
        type="file"
        accept="image/*"
        onChange={handleChangePreviewPhoto}
        className="hidden"
      />

      {/* 100% EDGE-TO-EDGE LIVE CAMERA BACKGROUND & ASPECT RATIO CONTAINER (CAPTURE STEP) */}
      {flowStep === "capture" && (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-black z-0 pointer-events-auto flex flex-col items-center justify-center">
          {aspectRatioMode === "9:16" ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-black cursor-pointer" onClick={handleCaptureFromWebcam}>
              {cameraStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover min-w-full min-h-full"
                />
              ) : null}
            </div>
          ) : (
            <div className="w-full flex-1 flex flex-col items-center justify-center p-4 pt-16 pb-48 z-10 pointer-events-auto">
              <div
                onClick={handleCaptureFromWebcam}
                className={cn(
                  "w-full max-w-md bg-stone-900 rounded-[32px] overflow-hidden border border-white/20 shadow-2xl relative transition-all duration-300 cursor-pointer",
                  aspectRatioMode === "1:1" ? "aspect-square" : "aspect-[3/4]"
                )}
              >
                {cameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : null}

                {showGridTarget && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-40 h-40 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                        Plate Center
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {showGridTarget && aspectRatioMode === "9:16" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                  Plate Center
                </span>
              </div>
            </div>
          )}

          {/* High-End Gourmet Analyzing Spinner Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-orange-400 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black tracking-tight text-white font-sans">
                  Analyzing Dish & Nutrition...
                </h3>
                <p className="text-xs font-medium text-stone-400">
                  Calculating calories, macros, and tags...
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STANDARD CAMERA & PREVIEW FLOW */}
      <div className={cn("w-full flex flex-col justify-between flex-1 min-h-0 relative z-10", flowStep === "preview" ? "space-y-0" : "space-y-0")}>
        {flowStep !== "preview" && (
          <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
            <button
              type="button"
              onClick={handleExitToDashboard}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border active:scale-90 shadow-md bg-black/50 hover:bg-black/70 border-white/20 text-white backdrop-blur-md"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFlashOn(!isFlashOn)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all border cursor-pointer active:scale-90 backdrop-blur-md shadow-md",
                  isFlashOn ? "bg-amber-400 text-stone-950 border-amber-400" : "bg-black/50 text-white border-white/20 hover:bg-black/70"
                )}
                title="Toggle Flash"
              >
                {isFlashOn ? <Zap className="w-3.5 h-3.5 fill-stone-950" /> : <ZapOff className="w-3.5 h-3.5 text-white" />}
              </button>

              <button
                type="button"
                onClick={() => setShowGridTarget(!showGridTarget)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all border cursor-pointer active:scale-90 backdrop-blur-md shadow-md",
                  showGridTarget ? "bg-orange-500 text-white border-orange-500" : "bg-black/50 text-white border-white/20 hover:bg-black/70"
                )}
                title="Toggle Center Plate Target"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCycleAspectRatio}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all border cursor-pointer active:scale-90 backdrop-blur-md shadow-md bg-black/50 text-white border-white/20 hover:bg-black/70"
                title={`Aspect Ratio Mode: ${aspectRatioMode} (Tap to cycle)`}
              >
                {aspectRatioMode === "1:1" && <Square className="w-3.5 h-3.5 text-white" />}
                {aspectRatioMode === "3:4" && <RectangleVertical className="w-3.5 h-3.5 text-white" />}
                {aspectRatioMode === "9:16" && <Smartphone className="w-3.5 h-3.5 text-orange-400" />}
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="absolute top-16 left-4 right-4 z-40 bg-red-500 text-white p-3 rounded-2xl text-xs font-bold text-center shadow-lg">
            {errorMessage}
          </div>
        )}

        {flowStep === "capture" && (
          <div className="absolute bottom-4 left-3 right-3 z-30 flex flex-col items-center gap-2.5 pointer-events-auto">
            {/* FULL-WIDTH FROSTED GLASS ATTACHED MEAL BAR */}
            {attachedItem && (
              <div className="w-full bg-black/65 backdrop-blur-2xl border border-white/25 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-2xl animate-fade-in font-sans">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Paperclip className="w-4 h-4 text-orange-400 shrink-0" />
                  <span className="text-xs font-black text-white truncate font-sans">
                    {attachedItem.name}
                  </span>
                  {attachedItem.calories > 0 && (
                    <span className="text-[10px] font-bold text-orange-300 bg-orange-950/80 border border-orange-700/60 px-2.5 py-0.5 rounded-full shrink-0">
                      {attachedItem.calories} kcal
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedItem(null)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer shrink-0 transition-colors"
                  title="Remove attached meal"
                >
                  ✕
                </button>
              </div>
            )}

            {/* HEADER ROW WITH SLEEK [@ TAG MEAL] BUTTON */}
            <div className="w-full flex items-center justify-between px-1.5 pt-0.5">
              <span className="text-[9.5px] font-black uppercase text-stone-300 tracking-wider font-sans">
                Notes & Details (Optional)
              </span>
              <button
                type="button"
                onClick={() => {
                  notesAreaRef.current?.focus();
                  setNotes((prev) => (prev ? `${prev} @` : "@"));
                  setMentionQuery("");
                  setShowMentionMenu(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 hover:bg-orange-500/35 border border-orange-400/40 text-orange-300 text-[10px] font-black uppercase tracking-wider backdrop-blur-md cursor-pointer transition-all active:scale-90"
                title="Tag a past meal or recipe with @"
              >
                <AtSign className="w-3 h-3 text-orange-400" />
                <span>Tag Meal</span>
              </button>
            </div>

            {/* SINGLE SMOOTH FROSTED TEXT INPUT BOX WITH INLINE @ SHORTLIST DROPDOWN */}
            <div className="w-full relative">
              {/* BACKDROP HIGHLIGHT LAYER FOR ORANGE @MENTIONS */}
              {notes && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 p-3 text-xs font-bold leading-relaxed whitespace-pre-wrap break-words pointer-events-none overflow-hidden h-28 font-sans z-[11] select-none"
                >
                  {renderHighlightedNotes(notes)}
                </div>
              )}

              <textarea
                ref={notesAreaRef}
                value={notes}
                onChange={handleNotesTextChange}
                onKeyDown={handleNotesKeyDown}
                placeholder={`Try typing details like:\n• "Air fried with 1 tbsp olive oil & extra cheese"\n• "Portion tweak: Only ate half portion in photo"\n• "Half portion of @Pasta + @MorningShake"`}
                rows={4}
                className={cn(
                  "w-full bg-black/60 backdrop-blur-xl border border-white/20 focus:border-orange-500 focus:outline-none rounded-2xl p-3 text-xs font-bold placeholder:text-white/45 placeholder:text-[11px] placeholder:font-normal resize-none h-28 leading-relaxed shadow-xl relative z-10 font-sans",
                  notes ? "text-transparent caret-white selection:bg-orange-500/30" : "text-white"
                )}
              />

              {/* Inline "@" Mention Auto-Complete Dropdown (Dark Gourmet) */}
              <AnimatePresence>
                {showMentionMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-2 left-0 right-0 bg-stone-900/98 backdrop-blur-2xl border border-stone-700/80 rounded-2xl shadow-2xl p-2 z-50 max-h-48 overflow-y-auto space-y-1 text-left font-sans"
                  >
                    <span className="text-[9px] font-black uppercase text-orange-400 tracking-wider block px-2.5 py-1">
                      Tap to Tag Item (@{mentionQuery})
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
                          className="w-full p-2 rounded-xl hover:bg-stone-800 text-left flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Utensils className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            <span className="text-xs font-bold text-white truncate">{item.name}</span>
                          </div>
                          <span className="text-[9px] font-black text-orange-400 bg-orange-950/80 border border-orange-800/60 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                            + Tag
                          </span>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Viewfinder Controls Row (Symmetrical 3-Button Action Bar) */}
            <div className="flex items-center justify-between w-full px-6 py-1">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 shadow-md flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer shrink-0"
                title="Open Photo Gallery"
              >
                <ImageIcon className="w-5.5 h-5.5 text-white" />
              </button>

              <button
                type="button"
                onClick={handleCaptureFromWebcam}
                disabled={isProcessing}
                className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 border-4 border-white shadow-xl flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer shrink-0 disabled:opacity-50"
                title="Take Photo"
              >
                <Camera className="w-7 h-7 text-white" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPastFoodsDrawer(true);
                  setShowNotesModal(true);
                }}
                className={cn(
                  "w-12 h-12 rounded-full backdrop-blur-md border shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer shrink-0",
                  attachedItem ? "bg-orange-500 text-white border-orange-400 shadow-orange-500/30" : "bg-black/50 hover:bg-black/70 border-white/20 text-white"
                )}
                title={attachedItem ? `Attached: ${attachedItem.name}` : "Attach Past Meal or Recipe"}
              >
                <Paperclip className="w-5.5 h-5.5 text-white" />
              </button>
            </div>
          </div>
        )}

        {flowStep === "preview" && loggedMealResult && (
          <div className="flex-1 flex flex-col justify-between relative min-h-0 w-full text-left font-sans overflow-hidden bg-[#FAF7F2]">
            {/* Full-Bleed Top Hero Cover Image Header */}
            <div className="relative w-full h-60 shrink-0 overflow-hidden shadow-md group bg-stone-900">
              <img
                src={loggedMealResult.image || uploadedImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80"}
                alt={editableName || "Meal Photo"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              
              {/* Gourmet Dark Ambient Gradient Overlay (Ensures 100% legibility on light images) */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/45 to-black/20 pointer-events-none" />

              {/* Top Controls: Back Button & Camera Upload (Left) + Share Icon & Close Icon (Right) */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExitToDashboard}
                    className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                    title="Back to Dashboard"
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() => changePhotoInputRef.current?.click()}
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
                        const currentMealObj = {
                          ...loggedMealResult,
                          name: editableName,
                          meal_description: editableDesc,
                          calories: editableCalories,
                          time: editableTime || loggedMealResult.time || "12:00 PM",
                          tags: editableTags,
                          nutrients: editableNutrients,
                        };
                        onShareMeal(currentMealObj);
                      }}
                      className="h-8 px-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer border border-orange-400/40"
                      title="Share Meal Card"
                    >
                      <Share2 className="w-3.5 h-3.5 text-white" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Image Overlay: Single Frosted Pill + Hero Title + Clean Grey Metadata */}
              <div className="absolute bottom-4 left-4 right-4 z-10 text-left space-y-1.5">
                {/* Green Confirmation Frosted Pill (High contrast dark frosted capsule with emerald text) */}
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-black/65 backdrop-blur-md border border-emerald-400/60 px-3 py-1 rounded-full shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/80 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                      Logged Successfully
                    </span>
                  </div>
                </div>

                {/* Full Width Meal Title */}
                <h3 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-md truncate font-sans leading-tight text-white">
                  {editableName || "Gourmet Meal Log"}
                </h3>

                {/* Clean Grey Text Metadata Line (Below Title) */}
                <div className="flex items-center gap-1.5 text-stone-300 text-[11px] font-bold tracking-wide drop-shadow-sm">
                  <span className="text-orange-400 font-extrabold">{editableCalories || 0} KCAL</span>
                  <span className="text-stone-400 select-none">•</span>
                  <span>{formatDisplayTime(editableTime || loggedMealResult?.time)}</span>
                  <span className="text-stone-400 select-none">•</span>
                  <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              </div>
            </div>

            {/* Scrollable Body: Live Direct Editing Fields */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 text-left">
              {/* Row 1: Key Stats Banner (Logged Time Picker & Calories Stepper) */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Logged Time Picker Card (Entire Card Clickable to trigger custom TimePickerModal) */}
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
                      {editableTime || loggedMealResult?.time || "12:00 PM"}
                    </span>
                  </div>
                </button>

                {/* Total Energy Stepper Card */}
                <div className="bg-white border border-stone-200/80 rounded-2xl p-3 shadow-3xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                    <Flame className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[8.5px] font-black uppercase text-orange-600 tracking-wider block mb-0.5">
                      Total Energy
                    </span>
                    <div className="flex items-center gap-1">
                      <StepperButton
                        onStep={() => setEditableCalories((prev) => Math.max(0, prev - 25))}
                        className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 active:scale-90 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </StepperButton>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editableCalories === 0 ? "" : editableCalories}
                        onChange={(e) => setEditableCalories(parseInt(e.target.value) || 0)}
                        className="w-12 text-center text-xs font-black text-stone-900 bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[10px] font-bold text-stone-400 select-none">
                        kcal
                      </span>
                      <StepperButton
                        onStep={() => setEditableCalories((prev) => prev + 25)}
                        className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 active:scale-90 cursor-pointer"
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
                  value={editableName}
                  onChange={(e) => setEditableName(e.target.value)}
                  className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl px-3.5 py-2.5 text-xs font-black text-stone-900 shadow-3xs"
                  placeholder="Meal Title"
                />
              </div>

              {/* Row 3: Meal Description */}
              <div>
                <label className="text-[8.5px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                  Description / Extra Notes
                </label>
                <textarea
                  rows={4}
                  value={editableDesc}
                  onChange={(e) => setEditableDesc(e.target.value)}
                  placeholder="Add meal description, preparation notes, or ingredients..."
                  className="w-full bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-2xl p-3 text-xs font-medium text-stone-800 shadow-3xs resize-none h-28 leading-relaxed"
                />
              </div>

              {/* Row 4: Tracked Nutrients Grid */}
              <div className="pt-2 border-t border-stone-200/60 space-y-2">
                <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider block">
                  Macronutrient Breakdown
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
                            <Minus className="w-3 h-3" />
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
                            <Plus className="w-3 h-3" />
                          </StepperButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Dietary Tags Selector */}
              <div className="pt-3 border-t border-stone-200/60 space-y-2">
                <span className="text-[8.5px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-stone-400" />
                  Dietary & Tracking Tags
                </span>

                <div className="flex flex-wrap gap-1.5 py-1">
                  {availableTags.map((tag) => {
                    const isSelected = editableTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all border cursor-pointer select-none active:scale-95 shadow-3xs",
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

            {/* BOTTOM ACTION SECTION: GENERATE WITH AI & DONE / SAVE BUTTONS */}
            <div className="p-4 bg-white/95 backdrop-blur-md border-t border-stone-200/60 shrink-0 w-full font-sans space-y-2.5">
              {showAiRefineInput ? (
                /* STICKY BOTTOM DOCKED AI PANEL */
                <div className="space-y-2.5 animate-fade-in text-left">
                  <textarea
                    rows={3}
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="Describe changes (e.g. 'I only ate half', 'no dressing', 'add 20g protein')..."
                    className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 focus:bg-white focus:outline-none rounded-2xl p-3 text-xs font-bold text-stone-900 placeholder:text-stone-400 resize-none h-24 shadow-inner leading-relaxed"
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

              {/* Row 2: Full-Width Signature Orange Done Button */}
              <button
                type="button"
                onClick={handleExitToDashboard}
                className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none"
              >
                <Check className="w-4 h-4 text-white stroke-[3]" />
                <span>Done & View Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STEP 1 NOTES & ATTACHMENT BOTTOM-SHEET POPUP MODAL (Portal Rule #3: z-[9999], True Bottom Sheet Everywhere) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showNotesModal && (
              <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 font-sans">
                {/* Backdrop Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowNotesModal(false)}
                  className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
                />

                {/* Bottom Sheet Card */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className={cn(
                    "relative w-full max-w-md bg-stone-900/98 backdrop-blur-2xl rounded-t-[36px] border-t border-x border-stone-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col text-left text-white overflow-hidden z-10 mx-auto transition-[max-height,height] duration-300",
                    showPastFoodsDrawer ? "h-[85vh] max-h-[85dvh]" : "max-h-[62dvh]"
                  )}
                >
                  {/* Native Pull Indicator */}
                  <div className="w-10 h-1 bg-stone-700/80 rounded-full mx-auto mt-3 mb-1 shrink-0 select-none" />

                  {/* Modal Header */}
                  <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-stone-800/80">
                    {showPastFoodsDrawer ? (
                      <button
                        type="button"
                        onClick={() => setShowPastFoodsDrawer(false)}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-stone-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-orange-400" />
                        <span>Select Meal to Attach</span>
                      </button>
                    ) : (
                      <span className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2 font-sans">
                        <FileText className="w-4 h-4 text-orange-400" />
                        Initial Meal Notes
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotesModal(false)}
                      className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-all cursor-pointer border border-stone-700/60 active:scale-90"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                {showPastFoodsDrawer ? (
                  /* FULL HEIGHT DEDICATED FOOD PICKER VIEW */
                  <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-3.5 min-h-0 overflow-hidden text-left">

                    <FoodFilterBar
                      filters={pastFoodFilters}
                      onChange={setPastFoodFilters}
                      availableTags={allFoodFilterTags}
                      trackedNutrients={activeTrackedNutrients}
                      showTypeToggles={true}
                      matchCount={filteredPastItems.length}
                      placeholder="Search past meals & recipes..."
                      variant="dark"
                    />

                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pt-1 pr-0.5">
                      {filteredPastItems.length === 0 ? (
                        <div className="text-center py-12 space-y-2">
                          <Utensils className="w-8 h-8 text-stone-600 mx-auto" />
                          <p className="text-xs text-stone-400 font-semibold">
                            No matching past meals or recipes found
                          </p>
                        </div>
                      ) : (
                        filteredPastItems.map((item) => {
                          const isAttached = attachedItem?.name.toLowerCase() === item.name.toLowerCase();
                          return (
                            <div key={item.name} className="relative w-full">
                              <PastFoodCard
                                item={item}
                                trackedNutrients={activeTrackedNutrients}
                                actionType="pin"
                                variant="dark"
                                onPin={isAttached ? undefined : handleAttachItem}
                                onModify={undefined}
                              />
                              {isAttached && (
                                <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-[1px] rounded-2xl flex items-center justify-end px-4 border border-emerald-500/40">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-950 border border-emerald-700 px-3 py-1 rounded-full shadow-2xs">
                                    ✓ Attached
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Scrollable Content Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0 text-left">
                      <div className="space-y-1.5 text-left">
                        <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-wider block">
                          {contextGuidance.title}
                        </span>
                        <div className="relative">
                          <textarea
                            autoFocus
                            placeholder={contextGuidance.placeholder}
                            value={notes}
                            onChange={handleNotesTextChange}
                            rows={4}
                            className="w-full bg-stone-800/90 border border-stone-700 focus:border-orange-500 focus:outline-none rounded-2xl p-3.5 text-xs font-bold text-white placeholder:text-stone-500 resize-none shadow-inner leading-relaxed h-28"
                          />

                          {/* Inline "@" Mention Auto-Complete Dropdown (Dark Gourmet) */}
                          <AnimatePresence>
                            {showMentionMenu && (
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute bottom-full mb-2 left-0 right-0 bg-stone-850/98 backdrop-blur-xl border border-stone-700 rounded-2xl shadow-2xl p-2 z-50 max-h-44 overflow-y-auto space-y-1 text-left"
                              >
                                <span className="text-[9px] font-black uppercase text-orange-400 tracking-wider block px-2.5 py-1">
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
                                      className="w-full p-2 rounded-xl hover:bg-stone-800 text-left flex items-center justify-between transition-colors cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Utensils className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                        <span className="text-xs font-bold text-white truncate">{item.name}</span>
                                      </div>
                                      <span className="text-[9px] font-black text-orange-400 bg-orange-950/80 border border-orange-800/60 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
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

                      {attachedItem && (
                        <div className="flex items-center justify-between bg-stone-800/90 border border-orange-500/40 rounded-xl p-2.5 px-3 animate-fade-in shadow-inner">
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            <span className="text-xs font-bold text-orange-200 truncate">
                              Attached: {attachedItem.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveAttached}
                            className="text-stone-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-stone-700 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowPastFoodsDrawer(!showPastFoodsDrawer)}
                        className="w-full py-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-750 border border-stone-700 hover:border-orange-500/50 text-stone-200 text-xs font-black uppercase tracking-wider text-center shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Paperclip className="w-4 h-4 text-orange-400 font-bold" />
                        <span>Attach a Meal or Recipe</span>
                      </button>
                    </div>

                    {/* Sticky Bottom Actions Bar (With Mobile Safe Area) */}
                    <div className="p-4 sm:p-5 pt-3 pb-8 sm:pb-6 bg-stone-900/98 backdrop-blur-md border-t border-stone-800 shrink-0 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setNotes("");
                          setAttachedItem(null);
                          setShowNotesModal(false);
                          triggerToast("Note cleared");
                        }}
                        className="py-3.5 px-4 rounded-2xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-black uppercase tracking-wider text-center border border-stone-700 cursor-pointer active:scale-95 transition-all"
                      >
                        Clear
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowNotesModal(false);
                          if (notes.trim() || attachedItem) {
                            triggerToast("Note saved! 📝");
                          }
                        }}
                        className="flex-1 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider text-center shadow-md shadow-orange-500/20 cursor-pointer active:scale-95 transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Classic FitAI Custom Time Picker Modal */}
      <TimePickerModal
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        initialTime={
          editableTime
            ? editableTime.includes("AM") || editableTime.includes("PM")
              ? convert12hTo24h(editableTime)
              : editableTime
            : "12:00"
        }
        onSave={(timeStr) => {
          setEditableTime(convert24hTo12h(timeStr));
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
          setFlowStep("capture");
        }}
        onSearchFood={() => {
          setIsClarificationModalOpen(false);
          setShowPastFoodsDrawer(true);
        }}
        onClose={() => setIsClarificationModalOpen(false)}
      />
    </div>
  );
};
