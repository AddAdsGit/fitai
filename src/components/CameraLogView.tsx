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
  Check,
  X,
  Square,
  RectangleVertical,
  Smartphone,
  Search,
  Paperclip,
  Utensils,
  Clock,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { DEFAULT_TRACKED_NUTRIENTS, normalizeTrackedNutrients } from "../constants/nutrition";
import type { TrackedNutrient } from "../types";
import { PastFoodCard, PastFoodItem } from "./PastFoodCard";

export const CameraLogView = ({
  setActiveTab,
  profileData,
  mealsState,
  recipesState,
  onAddMeal,
  triggerToast,
  onShareMeal,
}: {
  setActiveTab: (tab?: string) => void;
  profileData: any;
  mealsState?: any[];
  recipesState?: any[];
  onAddMeal: (meal: any) => void;
  triggerToast: (msg: string) => void;
  onShareMeal?: (meal: any) => void;
}) => {
  // Flow States: "capture" -> "confirm" -> "preview"
  const [flowStep, setFlowStep] = useState<"capture" | "confirm" | "preview">("capture");
  
  // In Step 3 (preview): View vs Edit Mode
  const [isEditingDetails, setIsEditingDetails] = useState<boolean>(false);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(true);
  
  // Step 1 Notes Bottom-Sheet Popup State
  const [showNotesModal, setShowNotesModal] = useState(false);

  // SINGLE ATTACHED MEAL (Rule: 1 Meal Only for Maximum Simplicity)
  const [attachedItem, setAttachedItem] = useState<PastFoodItem | null>(null);
  
  // Toggle State for Expandable Past Foods & Recipes Drawer
  const [showPastFoodsDrawer, setShowPastFoodsDrawer] = useState(false);
  const [pastSearchQuery, setPastSearchQuery] = useState("");
  const [pastFilter, setPastFilter] = useState<"all" | "recent" | "recipes">("all");

  // Inline "@" Mention Auto-Complete Menu States
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  // Instagram/TikTok-Grade Aspect Ratio Switcher: "1:1" -> "3:4" -> "9:16"
  const [aspectRatioMode, setAspectRatioMode] = useState<"1:1" | "3:4" | "9:16">("3:4");
  
  // Toolbar Toggles
  const [showGridTarget, setShowGridTarget] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loggedMealResult, setLoggedMealResult] = useState<any | null>(null);

  // Live WebRTC Stream State for Macbook / Desktop / Mobile
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Master Registry of ALL requested hardware tracks to guarantee 100% termination
  const allTracksRef = useRef<MediaStreamTrack[]>([]);

  // Editable Meal Card States (Step 3)
  const [editableName, setEditableName] = useState("");
  const [editableDesc, setEditableDesc] = useState("");
  const [editableCalories, setEditableCalories] = useState<number>(350);
  const [editableTime, setEditableTime] = useState<string>("");
  const [editableTags, setEditableTags] = useState<string[]>([]);
  const [editableNutrients, setEditableNutrients] = useState<Record<string, number>>({});
  const [newTagInput, setNewTagInput] = useState("");
  const [showAddTagInput, setShowAddTagInput] = useState(false);

  // AI Refine Prompt in Step 3
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const timeInputRef = useRef<HTMLInputElement>(null);
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

  // Clean Text-Only Tag Presets (Zero Emojis)
  const PRESET_TAGS = [
    "High Protein",
    "Keto",
    "Gluten Free",
    "Caffeine",
    "Low Carb",
    "Dairy Free",
    "Vegan",
    "Photo Log",
  ];

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

  const filteredPastItems = useMemo(() => {
    let result = quickLogItems;
    if (pastFilter === "recipes") {
      result = result.filter(item => item.source === "recipe");
    } else if (pastFilter === "recent") {
      result = result.filter(item => item.source === "recent");
    }

    if (pastSearchQuery.trim()) {
      const q = pastSearchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) || 
        (item.meal_description || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [quickLogItems, pastFilter, pastSearchQuery]);

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
    setShowPastFoodsDrawer(false); // AUTO-COLLAPSE IMMEDIATELY
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
    handleAttachItem(item);
    const lastAtIndex = notes.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      setNotes(notes.slice(0, lastAtIndex).trim());
    }
    setShowMentionMenu(false);
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
          .then((stream) => {
            if (isCancelled) {
              stream.getTracks().forEach((t) => {
                t.enabled = false;
                t.stop();
              });
              return;
            }
            
            const videoTracks = stream.getVideoTracks();
            allTracksRef.current.push(...videoTracks);

            setCameraStream(stream);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.log("WebRTC fallback to file input:", err);
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
      setIsTypingNotesInCapture(false);
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
        setIsTypingNotesInCapture(false);
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

        const promptText = `Analyze this food image. User notes: "${combinedNotes}". Estimate meal name, total calories (kcal), dietary tags (clean text only e.g. ["High Protein","Keto"]), and values for user-tracked nutrients: ${nutrientPromptList}. Return ONLY valid JSON: {"name":"...","calories":0,"tags":["High Protein"],"nutrients":{"protein":0,"carbs":0,"fats":0,"fiber":0}}`;

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

  const handleAddCustomTag = () => {
    if (!newTagInput.trim()) return;
    const tagFormatted = newTagInput.trim().replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
    if (tagFormatted && !editableTags.includes(tagFormatted)) {
      setEditableTags([...editableTags, tagFormatted]);
    }
    setNewTagInput("");
    setShowAddTagInput(false);
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
    const userTrackingTags = (profileData?.tracking_tags || [])
      .filter((t: any) => t.enabled !== false)
      .map((t: any) => t.name);
    
    return Array.from(new Set([...userTrackingTags, ...PRESET_TAGS, ...editableTags]));
  }, [profileData?.tracking_tags, editableTags]);

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
        flowStep === "preview" ? "bg-[#FAF7F2] text-stone-900 p-0" : "bg-[#0D0D0D] text-white p-4 sm:p-5"
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

      {/* STANDARD CAMERA & PREVIEW FLOW */}
      <div className={cn("w-full flex flex-col justify-between flex-1 min-h-0", flowStep === "preview" ? "space-y-0" : "space-y-4")}>
        {flowStep !== "preview" && (
          <div className="flex items-center justify-between z-30 w-full pt-1 sm:pt-0">
            <button
              type="button"
              onClick={handleExitToDashboard}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border active:scale-90 shadow-md bg-black/40 hover:bg-black/60 border-white/20 text-white backdrop-blur-md"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFlashOn(!isFlashOn);
                  triggerToast(isFlashOn ? "⚡ Flash Off" : "⚡ Flash On");
                }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all border cursor-pointer active:scale-90 backdrop-blur-md shadow-md",
                  isFlashOn ? "bg-amber-400 text-stone-950 border-amber-400" : "bg-black/40 text-white border-white/20 hover:bg-black/60"
                )}
                title="Toggle Flash"
              >
                {isFlashOn ? <Zap className="w-3.5 h-3.5 fill-stone-950" /> : <ZapOff className="w-3.5 h-3.5 text-white" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowGridTarget(!showGridTarget);
                  triggerToast(showGridTarget ? "🎯 Framing Guide Off" : "🎯 Framing Guide On");
                }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all border cursor-pointer active:scale-90 backdrop-blur-md shadow-md",
                  showGridTarget ? "bg-orange-500 text-white border-orange-500" : "bg-black/40 text-white border-white/20 hover:bg-black/60"
                )}
                title="Toggle Center Plate Target"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCycleAspectRatio}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all border cursor-pointer active:scale-90 backdrop-blur-md shadow-md bg-black/40 text-white border-white/20 hover:bg-black/60"
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
          <div className="z-20 bg-red-500 text-white p-3 rounded-2xl text-xs font-bold text-center shadow-lg my-2 w-full">
            {errorMessage}
          </div>
        )}

        {flowStep === "capture" && (
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 w-full my-2 space-y-3">
            {hasMediaPermission === false ? (
              <div className="w-full h-[55vh] rounded-[28px] border border-stone-800 bg-stone-900/90 backdrop-blur-md shadow-xl flex flex-col items-center justify-center p-6 text-center space-y-4">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  Select Photo From Gallery
                </button>
              </div>
            ) : (
              <div
                onClick={handleCaptureFromWebcam}
                className={cn(
                  "w-full bg-black shadow-xl flex flex-col items-center justify-center relative cursor-pointer overflow-hidden transition-all duration-300 rounded-[28px] border border-stone-900",
                  aspectRatioMode === "1:1" ? "aspect-square max-h-[46vh]" : aspectRatioMode === "3:4" ? "aspect-[3/4] max-h-[54vh]" : "aspect-[9/16] h-[65vh]"
                )}
              >
                {cameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover min-w-full min-h-full"
                  />
                ) : null}

                {showGridTarget && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-40 h-40 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/70 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
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
                        Calculating calories, macros, and tags ✨
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {flowStep === "capture" && (
          <div className="w-full flex flex-col items-center gap-2 z-30 pb-2">
            {/* STICKY FROSTED NOTES & ATTACHMENT PREVIEW PILL */}
            {(notes.trim() || attachedItem) && (
              <div className="w-full max-w-sm px-2 animate-fade-in">
                <div
                  onClick={() => setShowNotesModal(true)}
                  className="bg-black/75 backdrop-blur-md border border-white/25 text-white rounded-2xl p-2.5 px-3.5 shadow-xl flex items-center justify-between gap-2 cursor-pointer hover:bg-black/85 active:scale-[0.98] transition-all"
                  title="Tap to edit notes"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {attachedItem ? (
                      <Paperclip className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-white truncate">
                      {attachedItem ? `Attached: ${attachedItem.name}` : `"${notes}"`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotes("");
                      setAttachedItem(null);
                      triggerToast("Note cleared");
                    }}
                    className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-[10px] font-bold cursor-pointer shrink-0"
                    title="Clear Note"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Viewfinder Controls Row */}
            <div className="flex items-center justify-between w-full px-4 py-1.5 rounded-full">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 shadow-md flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer shrink-0"
                title="Open Photo Gallery"
              >
                <ImageIcon className="w-5.5 h-5.5 text-white" />
              </button>

              <button
                type="button"
                onClick={handleCaptureFromWebcam}
                disabled={isProcessing}
                className="w-18 h-18 rounded-full bg-orange-500 hover:bg-orange-600 border-4 border-white shadow-md flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer shrink-0 disabled:opacity-50"
                title="Take Photo"
              >
                <Camera className="w-7 h-7 text-white" />
              </button>

              <button
                type="button"
                onClick={() => setShowNotesModal(true)}
                className={cn(
                  "w-12 h-12 rounded-full backdrop-blur-md border shadow-md flex items-center justify-center active:scale-90 transition-all cursor-pointer shrink-0",
                  notes.trim() || attachedItem ? "bg-orange-500 text-white border-orange-400" : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                )}
                title="Add Notes & Attachment"
              >
                <FileText className="w-5.5 h-5.5" />
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
              
              {/* Gourmet Dark Ambient Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-black/20 pointer-events-none" />

              {/* Top Controls: Back Button & Camera Upload (Left) + Share Icon & Close Icon (Right) */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExitToDashboard}
                    className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                    title="Back to Dashboard"
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() => changePhotoInputRef.current?.click()}
                    className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
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
                      className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                      title="Share Meal Card"
                    >
                      <Share2 className="w-4 h-4 text-white" />
                    </button>
                  )}

                  <button
                    onClick={handleExitToDashboard}
                    className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-md"
                    title="Done & Close"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Bottom Image Overlay: Option A Minimalist Design */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white z-10">
                <div className="min-w-0 flex-1 pr-3 text-left">
                  {/* Reassuring Confirmation Subtitle: Logged Successfully */}
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 drop-shadow-xs block mb-0.5">
                    ✓ Logged Successfully
                  </span>

                  <h3 className="text-xl font-black tracking-tight drop-shadow-md truncate font-sans leading-tight text-white">
                    {editableName || "Gourmet Meal Log"}
                  </h3>
                </div>

                {/* Single Unified Frosted Glassmorphic Stat Pill */}
                <div className="bg-black/50 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full shadow-md text-center flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-black tracking-wider uppercase text-white block">
                    {editableCalories || 0} KCAL
                  </span>
                  <span className="text-white/40 text-[10px] select-none">•</span>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-white/90 block">
                    {formatDisplayTime(editableTime || loggedMealResult.time)}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Body: Live Direct Editing Fields */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 text-left">
              {/* Row 1: Key Stats Banner (Logged Time Picker & Calories Stepper) */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Logged Time Picker Card (Entire Card Clickable to trigger clock picker) */}
                <div
                  onClick={() => {
                    try {
                      (timeInputRef.current as any)?.showPicker?.();
                    } catch (_) {}
                    timeInputRef.current?.focus();
                  }}
                  className="bg-white border border-stone-200/80 hover:border-orange-400 focus-within:border-orange-500 rounded-2xl p-3 shadow-3xs flex items-center gap-2.5 cursor-pointer transition-all active:scale-[0.98]"
                  title="Tap to change logged time"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[8.5px] font-black uppercase text-stone-400 tracking-wider block">
                      Logged Time
                    </span>
                    <input
                      ref={timeInputRef}
                      type="time"
                      value={
                        editableTime
                          ? editableTime.includes("AM") || editableTime.includes("PM")
                            ? convert12hTo24h(editableTime)
                            : editableTime
                          : "12:00"
                      }
                      onChange={(e) => setEditableTime(convert24hTo12h(e.target.value))}
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          (e.target as any).showPicker?.();
                        } catch (_) {}
                      }}
                      className="w-full bg-transparent border-none text-xs font-black text-stone-900 focus:outline-none p-0 cursor-pointer"
                    />
                  </div>
                </div>

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
                      <button
                        type="button"
                        onClick={() => setEditableCalories(Math.max(0, editableCalories - 25))}
                        className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 active:scale-90 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
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
                      <button
                        type="button"
                        onClick={() => setEditableCalories(editableCalories + 25)}
                        className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 active:scale-90 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
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

              {/* Row 3: Smart AI Refine / Notes Prompt Card */}
              <div className="bg-white border border-stone-200/80 focus-within:border-orange-500 rounded-2xl p-3.5 shadow-3xs space-y-2.5 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    Refine with AI / Notes
                  </span>

                  {!attachedItem ? (
                    <button
                      type="button"
                      onClick={() => setShowPastFoodsDrawer(true)}
                      className="text-[9px] font-black uppercase tracking-wider text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1 transition-all active:scale-95 shadow-3xs"
                    >
                      <Paperclip className="w-3 h-3 text-orange-500" />
                      <span>Attach Past Meal</span>
                    </button>
                  ) : null}
                </div>

                {attachedItem && (
                  <div className="flex items-center justify-between bg-orange-50/80 border border-orange-200 rounded-xl p-2 px-3 animate-fade-in shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="text-xs font-bold text-orange-950 truncate">
                        Attached: {attachedItem.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAttached}
                      className="text-orange-400 hover:text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded-md cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <textarea
                  rows={2}
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  placeholder='Tell AI to adjust (e.g. "I only ate half", "no dressing", "add 1 espresso")...'
                  className="w-full bg-transparent border-none focus:outline-none text-xs font-medium text-stone-800 placeholder:text-stone-400 resize-none"
                />

                {editableDesc && !refinePrompt && (
                  <div className="pt-2 border-t border-stone-100 text-[10.5px] text-stone-500 font-medium italic truncate">
                    Current Notes: "{editableDesc}"
                  </div>
                )}
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

              {/* Row 5: Dietary Tags Selector */}
              <div className="pt-3 border-t border-stone-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-orange-500" />
                    Tracking & Dietary Tags
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddTagInput(!showAddTagInput)}
                    className="text-[9px] font-black uppercase tracking-wider text-orange-600 hover:text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    Custom Tag
                  </button>
                </div>

                {showAddTagInput && (
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Add custom tag (e.g. Organic)..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="flex-1 bg-white border border-stone-200 focus:border-orange-500 focus:outline-none rounded-xl px-2.5 py-1 text-xs font-bold text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="px-3 py-1 bg-orange-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                )}

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

            {/* 2 STACKED ACTION BUTTONS: [ 🪄 Edit with AI ] + [ 📤 Share Meal Card ] */}
            <div className="p-4 bg-white/90 backdrop-blur-md border-t border-stone-200/60 flex flex-col gap-2.5 shrink-0 w-full font-sans">
              <button
                type="button"
                onClick={handleRefineWithAI}
                disabled={isRefining}
                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className={cn("w-4 h-4 text-amber-200", isRefining && "animate-spin")} />
                <span>{isRefining ? "Refining with AI..." : "Edit with AI"}</span>
              </button>

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
                    onAddMeal(currentMealObj);
                    onShareMeal(currentMealObj);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-white hover:bg-orange-50/60 text-stone-700 border border-stone-200/80 text-xs font-black uppercase tracking-wider cursor-pointer shadow-3xs active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4 text-orange-500" />
                  <span>Share Meal Card</span>
                </button>
              )}
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
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  className="relative w-full max-w-lg bg-stone-900/98 backdrop-blur-2xl rounded-t-[32px] sm:rounded-t-[36px] border-t border-x border-stone-800 shadow-2xl flex flex-col max-h-[90dvh] text-left text-white overflow-hidden z-10 mx-auto"
                >
                  {/* Native Pull Indicator */}
                  <div className="w-12 h-1.5 bg-stone-700/80 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                  {/* Modal Header */}
                  <div className="p-4 sm:p-5 pb-3 flex items-center justify-between shrink-0 border-b border-stone-800/70">
                    <span className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-400" />
                      Initial Meal Notes
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNotesModal(false)}
                      className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-all border border-stone-700/60 active:scale-90"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

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
                          rows={3}
                          className="w-full bg-stone-800/90 border border-stone-700 focus:border-orange-500 focus:outline-none rounded-2xl p-3.5 text-xs font-bold text-white placeholder:text-stone-500 resize-none shadow-inner leading-relaxed"
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

                    {/* Expandable Past Foods & Recipes Drawer (Dark Theme Single-Scroll) */}
                    <AnimatePresence>
                      {showPastFoodsDrawer && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-stone-800/90 backdrop-blur-md rounded-3xl border border-stone-700/80 p-4 flex flex-col space-y-3.5 shadow-xl text-left overflow-hidden w-full"
                        >
                          <div className="flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                              <Search className="w-3.5 h-3.5 text-orange-400" />
                              Select Meal to Attach
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPastFoodsDrawer(false)}
                              className="text-[9.5px] font-black uppercase text-stone-400 hover:text-white bg-stone-700/80 hover:bg-stone-700 px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                            >
                              ✕ Close
                            </button>
                          </div>

                          <div className="relative w-full shrink-0">
                            <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Search past meals & recipes..."
                              value={pastSearchQuery}
                              onChange={(e) => setPastSearchQuery(e.target.value)}
                              className="w-full bg-stone-900 border border-stone-700/80 focus:border-orange-500 focus:outline-none rounded-2xl pl-9 pr-3 py-2.5 text-xs font-bold text-white placeholder:text-stone-500 shadow-inner"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-0.5 scrollbar-none">
                            {(["all", "recent", "recipes"] as const).map((filter) => (
                              <button
                                key={filter}
                                type="button"
                                onClick={() => setPastFilter(filter)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-[9.5px] font-black uppercase tracking-wider transition-all border cursor-pointer shrink-0",
                                  pastFilter === filter
                                    ? "bg-orange-500 text-white border-orange-500 shadow-2xs"
                                    : "bg-stone-900 text-stone-400 border-stone-700 hover:bg-stone-800"
                                )}
                              >
                                {filter === "all" ? "All Items" : filter === "recent" ? "Recent Meals" : "Saved Recipes"}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-2.5 pt-1">
                            {filteredPastItems.length === 0 ? (
                              <div className="text-center py-5 space-y-1.5">
                                <Utensils className="w-6 h-6 text-stone-600 mx-auto" />
                                <p className="text-[10px] text-stone-500 font-semibold">
                                  No matching past meals found
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
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                      className="flex-1 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider text-center shadow-lg shadow-orange-500/25 cursor-pointer active:scale-95 transition-all"
                    >
                      Save Note
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
