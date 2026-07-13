/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Flame,
  Home,
  Plus,
  Minus,
  Scale,
  Zap,
  User,
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  Sparkles,
  Camera,
  Check,
  Trash2,
  Utensils,
  Target,
  Bot,
  Loader2,
  BookOpen,
  Edit2,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { calculateNutritionFromIngredients } from "./utils/nutritionCalculator";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient";

// Import extracted components
import { InsightsView, ProgressBar } from "./components/InsightsView";
import { ManualLogModal } from "./components/ManualLogModal";
import { ProfileView } from "./components/ProfileView";
import { EditProfileView } from "./components/EditProfileView";
import { SettingsView } from "./components/SettingsView";
import { OAuthConsentView } from "./components/OAuthConsentView";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { CalendarPickerModal } from "./components/CalendarPickerModal";
import { DefaultAvatar } from "./components/DefaultAvatar";
import { RecipeShareModal } from "./components/RecipeShareModal";
import { MealShareModal } from "./components/MealShareModal";
import { DayShareModal } from "./components/DayShareModal";
import { PublicShareView } from "./components/PublicShareView";
import { ChatGPTIcon } from "./components/ChatGPTIcon";


// Import types & helpers
import type { Meal, Recipe, DailyWellness, WeightLog } from "./types";
import { hasNoGeneratedImage, formatDateStr, getMealEmoji } from "./utils/helpers";
import { generateShareUrl } from "./utils/shareUtils";


const INITIAL_MEALS: Meal[] = [];

const INITIAL_RECIPES: Recipe[] = [
  {
    id: "rec-1",
    name: "Steamed Idli with Sambar",
    time: "10 mins",
    calories: 220,
    protein: 7,
    carbs: 44,
    fats: 1,
    fiber: 5,
    tags: ["Vegetarian", "Gluten Free"],
    description: "Soft, steamed rice-and-lentil cakes served with mixed vegetable sambar.",
    image: "/images/idli.jpg",
    ingredients: [
      "2 pieces Steamed Idli",
      "1 bowl Vegetable Sambar",
      "1 tbsp Coconut Chutney",
    ],
    instructions:
      "Steam idli batter. Heat sambar and serve with coconut chutney on the side.",
  },
  {
    id: "rec-2",
    name: "Crispy Masala Dosa",
    time: "12 mins",
    calories: 360,
    protein: 6,
    carbs: 54,
    fats: 12,
    fiber: 4,
    tags: ["Vegetarian", "Gluten Free"],
    description: "Thin, crispy fermented rice crepe stuffed with a spiced potato mash.",
    image: "/images/dosa.jpg",
    ingredients: [
      "1 cup Dosa Batter",
      "100g Spiced Potato Mash (Alloo Masala)",
      "1 tbsp Butter or Ghee",
    ],
    instructions:
      "Spread batter thin on hot tawa. Drizzle butter, place potato filling, fold and crisp.",
  },
  {
    id: "rec-3",
    name: "Spinach & Cheese Omelette",
    time: "10 mins",
    calories: 290,
    protein: 22,
    carbs: 3,
    fats: 22,
    fiber: 2,
    tags: ["Keto", "Low Carb"],
    description: "A rich, cheesy omelette folded with fresh butter and sautéed baby spinach.",
    image: "/images/omelette.jpg",
    ingredients: [
      "3 Large Eggs",
      "1 cup Spinach",
      "30g Cheddar Cheese",
      "1 tbsp Butter",
    ],
    instructions:
      "Whisk eggs. Melt butter. Sauté spinach. Add eggs, cook through and fold over melted cheese.",
  },
];

// Components and helper utilities extracted to ./components and ./utils

const TimelineImage = ({ src, alt, fallbackEmoji }: { src: string; alt: string; fallbackEmoji: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Fallback Emoji/Placeholder rendered always in the background */}
      <div className="absolute inset-0 bg-[#F4F3EF]/90 flex items-center justify-center select-none z-0">
        <span className="text-7xl sm:text-8xl group-hover:scale-110 transition-transform duration-700 opacity-[0.85] filter drop-shadow-xs">
          {fallbackEmoji}
        </span>
      </div>
      {/* Actual Image on top, fading in when loaded */}
      {!error && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 z-10",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
};

export default function App() {
  const [shareId, setShareId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("shareId");
  });
  const [shareTypeParam, setShareTypeParam] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("share");
  });
  const [shareDataParam, setShareDataParam] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("data");
  });

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("page") === "oauth-consent" || window.location.pathname === "/oauth-consent") {
      return "oauth-consent";
    }
    return "home";
  });
  const [shareItemPopup, setShareItemPopup] = useState<{ type: "meal" | "recipe" | "day", item: any } | null>(null);
  
  const handleLogMealClick = () => {
    const plusActionTag = (profileData.preferences || []).find((p: string) => p.startsWith("plus_button_action:")) || "";
    const plusAction = plusActionTag.split(":")[1] || "ai_logger";

    if (plusAction === "gpt_redirect") {
      const gptUrl = localStorage.getItem("fitai_custom_gpt_url") || "https://chatgpt.com/g/g-6a4f69a8803c8191b29bc51494b65b1c-fitai";
      window.open(gptUrl.trim(), "_blank");
      return;
    }

    if (plusAction === "camera") {
      setManualLogInitialAiMode(true);
      setIsCameraFullScreen(true);
      setManualLogInitialSegment("detailed");
      setAutoTriggerPhotoScan(true);
      return;
    }

    if (plusAction === "quick_log") {
      setManualLogInitialAiMode(false);
      setIsCameraFullScreen(true);
      setManualLogInitialSegment("quick");
      setAutoTriggerPhotoScan(false);
      return;
    }

    if (plusAction === "detailed_log") {
      setManualLogInitialAiMode(false);
      setIsCameraFullScreen(true);
      setManualLogInitialSegment("detailed");
      setAutoTriggerPhotoScan(false);
      return;
    }

    // Default: ai_logger
    setManualLogInitialAiMode(true);
    setIsCameraFullScreen(true);
    setManualLogInitialSegment("detailed");
    setAutoTriggerPhotoScan(false);
  };

  const handleShareMeal = (meal: Meal) => {
    setShareItemPopup({ type: "meal", item: meal });
  };
  
  const handleShareRecipe = (recipe: Recipe) => {
    setShareItemPopup({ type: "recipe", item: recipe });
  };

  const handleShareDay = () => {
    const mealsForDay = mealsState.filter(m => m.date === selectedDate);
    const dayCalories = mealsForDay.reduce((sum, m) => sum + (m.calories || 0), 0);
    const dayProtein = mealsForDay.reduce((sum, m) => sum + (m.protein || 0), 0);
    const dayCarbs = mealsForDay.reduce((sum, m) => sum + (m.carbs || 0), 0);
    const dayFats = mealsForDay.reduce((sum, m) => sum + (m.fats || 0), 0);
    const dayFiber = mealsForDay.reduce((sum, m) => sum + (m.fiber || 0), 0);

    const dayObj = {
      date: selectedDate,
      meals: mealsForDay,
      calories: dayCalories,
      protein: dayProtein,
      carbs: dayCarbs,
      fats: dayFats,
      fiber: dayFiber
    };
    setShareItemPopup({ type: "day", item: dayObj });
  };

  const [mealToEdit, setMealToEdit] = useState<Meal | null>(null);
  const [mealPendingDelete, setMealPendingDelete] = useState<Meal | null>(null);
  const [isCameraFullScreen, setIsCameraFullScreen] = useState(false);

  // Custom world-class popup states
  const [selectedRecipePopup, setSelectedRecipePopup] = useState<Recipe | null>(
    null,
  );
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editPopupName, setEditPopupName] = useState("");
  const [editPopupTime, setEditPopupTime] = useState("");
  const [editPopupCalories, setEditPopupCalories] = useState("");
  const [editPopupProtein, setEditPopupProtein] = useState("");
  const [editPopupCarbs, setEditPopupCarbs] = useState("");
  const [editPopupFats, setEditPopupFats] = useState("");
  const [editPopupDescription, setEditPopupDescription] = useState("");
  const [editPopupFiber, setEditPopupFiber] = useState("");
  const [isRecipeAiMode, setIsRecipeAiMode] = useState(false);
  const [recipeAiPrompt, setRecipeAiPrompt] = useState("");
  const [isRecipeAiGenerating, setIsRecipeAiGenerating] = useState(false);
  const [editPopupTags, setEditPopupTags] = useState<string[]>([]);
  const [editPopupIngredients, setEditPopupIngredients] = useState("");
  const [editPopupInstructions, setEditPopupInstructions] = useState("");
  const [editPopupImage, setEditPopupImage] = useState("");
  const [showRecipeImagePanel, setShowRecipeImagePanel] = useState(false);
  const [editPopupMicros, setEditPopupMicros] = useState<
    { name: string; value: number; unit: string }[]
  >([]);
  const [aiConfigMode, setAiConfigMode] = useState<"ai" | "manual">("ai");
  const [isAiCalculating, setIsAiCalculating] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [manualLogInitialAiMode, setManualLogInitialAiMode] = useState(false);
  const [manualLogInitialSegment, setManualLogInitialSegment] = useState<"quick" | "detailed">("detailed");
  const [autoTriggerPhotoScan, setAutoTriggerPhotoScan] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [draftWeight, setDraftWeight] = useState<number | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem("fitai_gemini_api_key");
    if (savedKey && savedKey.startsWith("AIzaSy")) {
      localStorage.removeItem("fitai_gemini_api_key");
    }
  }, []);

  useEffect(() => {
    if (!selectedRecipePopup) {
      setIsRecipeAiMode(false);
      setRecipeAiPrompt("");
    }
  }, [selectedRecipePopup]);

  type GoalPopupType = "dailyCalories" | "weightGoal" | null;
  const [activeGoalConfigPopup, setActiveGoalConfigPopup] =
    useState<GoalPopupType>(null);
  const [goalConfigValue, setGoalConfigValue] = useState(2000);

  const INITIAL_PROFILE_STATE = {
    name: "John Doe",
    imageUrl: "",
    description:
      "Fitness enthusiast & tech geek. Building a sustainable, high-protein lifestyle. Always optimizing! ✨ Adding more text here to test out the expansion feature and see how it works when the description gets fairly long.",
    height: 183,
    weight: 80,
    dob: "1998-05-15",
    gender: "Male",
    knowledge: {
      preferences: [
        "Prefers high protein diet, specifically chicken and eggs."
      ],
      health: [
        "Allergic to shellfish."
      ],
      notes: [
        "Usually works out at 6 PM on weekdays."
      ],
      patterns: []
    },
    agent_memory: [
      "Prefers concise answers with bullet points",
      "Uses a professional and encouraging tone"
    ],
    agent_config: {
      showGptWidget: true,
      generateImages: true,
      refinePhotos: false,
      artStyle: "gourmet",
      customArtStyle: "",
      requireConfirmation: false,
      trackWeight: true,
      customInstructions: "Be a hyper-efficient fitness assistant. Minimize chit-chat. Keep replies extremely concise. Prefix macro estimations with ≈. Focus on accurate protein tracking and calorie targets."
    },
    preferences: ["Gluten Free", "Keto"],
    goals: {
      dailyCalories: 2000,
      weightGoal: 75,
    },
    macros: {
      protein: 150,
      carbs: 50,
      fats: 80,
      fiber: 30,
    },
    trackMicros: true,
    micros: [
      { name: "Selenium", target: 55, unit: "mcg" },
      { name: "Vitamin A", target: 900, unit: "mcg" },
    ],
    api_key: "",
    username: "mk",
    notionApiKey: "",
    notionDatabaseId: "",
    googleSheetsWebhookUrl: "",
    telegramBotToken: "",
    telegramChatId: "",
    telegramRemindersEnabled: false,
    telegramReportsEnabled: false,
    telegramReminderTimes: ["09:00", "13:00", "20:00"],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  // Precise selected date tracking states
  const todayStr = formatDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [daysList, setDaysList] = useState(() => {
    const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const today = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + (i - 2));
      return {
        day: DAYS_OF_WEEK[d.getDay()],
        date: d.getDate(),
        fullDate: formatDateStr(d),
      };
    });
  });
  const recenterDaysList = (dateString: string) => {
    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const d = new Date(dateString + "T00:00:00");
    const newList = Array.from({ length: 6 }, (_, i) => {
      const tempD = new Date(d);
      tempD.setDate(d.getDate() + (i - 2));
      return {
        day: daysOfWeek[tempD.getDay()],
        date: tempD.getDate(),
        fullDate: formatDateStr(tempD),
      };
    });
    setDaysList(newList);
  };

  const getFormattedSelectedDate = () => {
    if (!selectedDate) return "";
    const d = new Date(selectedDate + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [profileData, setProfileDataState] = useState(INITIAL_PROFILE_STATE);
  const [mealsState, setMealsState] = useState<Meal[]>(() => {
    try {
      const saved = localStorage.getItem("fitai_meals");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [recipes, setRecipesState] = useState<Recipe[]>([]);

  useEffect(() => {
    localStorage.setItem("fitai_meals", JSON.stringify(mealsState));
  }, [mealsState]);
  const [dailyNotes, setDailyNotes] = useState<DailyWellness[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("fitai_daily_notes") || "[]");
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("fitai_daily_notes", JSON.stringify(dailyNotes));
  }, [dailyNotes]);

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("fitai_weight_logs") || "[]");
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("fitai_weight_logs", JSON.stringify(weightLogs));
  }, [weightLogs]);

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [session, setSession] = useState<any>(null);
  const [showDeveloperBypass, setShowDeveloperBypass] = useState(false);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState("");
  
  // Router States & Navigation
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Password Recovery States
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("pushstate-changed", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("pushstate-changed", handleLocationChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
      window.dispatchEvent(new Event("pushstate-changed"));
    }
  };

  const isAuthenticatingRef = useRef(false);

  const handleUserAuthenticated = async (user: any) => {
    if (isAuthenticatingRef.current) return;
    isAuthenticatingRef.current = true;
    try {
      const { data: existing, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error("Error looking up authenticated user profile:", error);
        return;
      }

      if (existing) {
        setActiveProfileId(existing.id);
        localStorage.setItem("fitai_active_profile_id", existing.id);
        if (!existing.email && user.email) {
          supabase.from('profiles').update({ email: user.email }).eq('id', existing.id).then();
        }
      } else {
        const newKey = "fit_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const baseUsername = user.email ? user.email.split('@')[0] : "user_" + Math.random().toString(36).substring(7);
        
        // Ensure username uniqueness
        let resolvedUsername = baseUsername;
        const { data: dupCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', baseUsername)
          .maybeSingle();

        if (dupCheck) {
          resolvedUsername = `${baseUsername}_${Math.random().toString(36).substring(7)}`;
        }

        const googleName = user.user_metadata?.full_name || resolvedUsername;
        const googleAvatar = user.user_metadata?.avatar_url || null;

        const newProfile = {
          id: user.id,
          username: resolvedUsername,
          display_name: googleName,
          image_url: googleAvatar,
          email: user.email,
          height: 175,
          weight: 70,
          dob: "1998-05-15",
          gender: "Male",
          preferences: [],
          daily_calories_goal: 2000,
          weight_goal: 70.0,
          protein_goal: 150,
          carbs_goal: 150,
          fats_goal: 60,
          fiber_goal: 30,
          api_key: newKey,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        const { error: createErr } = await supabase
          .from('profiles')
          .insert(newProfile);

        if (createErr) {
          console.error("Error creating authenticated profile:", createErr);
        } else {
          setActiveProfileId(user.id);
          localStorage.setItem("fitai_active_profile_id", user.id);
          showToast(`✨ Profile created for @${resolvedUsername}!`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const returnUrl = window.location.href;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: returnUrl
        }
      });
      if (error) {
        console.error("Google login error:", error);
        showToast("❌ Google login failed");
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Google login error");
    }
  };

  const handleEmailOtpSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = email.trim();
    if (!input) return;

    setAuthLoading(true);
    try {
      let targetEmail = input;

      // If it's a username (doesn't contain @), look up registered email in profiles table
      if (!input.includes("@")) {
        const cleanUsername = input.toLowerCase().replace(/[^a-z0-9_]/g, "");
        const { data: profile, error: dbErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (dbErr) {
          throw new Error(`Lookup failed: ${dbErr.message}`);
        }

        if (!profile || !profile.email) {
          showToast("❌ No registered email found for this username.");
          setAuthLoading(false);
          return;
        }

        targetEmail = profile.email;
      }

      setResolvedEmail(targetEmail);

      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        showToast(`❌ Failed to send link: ${error.message}`);
      } else {
        // Mask email for privacy (e.g., jo***@domain.com)
        const masked = targetEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");
        showToast(`✉️ Sent secure sign-in link & code to: ${masked}`);
        setOtpSent(true);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verificationCode.trim();
    if (!code || !resolvedEmail) return;

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resolvedEmail,
        token: code,
        type: "email",
      });

      if (error) {
        showToast(`❌ Verification failed: ${error.message}`);
      } else {
        showToast("✨ Logged in successfully!");
        setOtpSent(false);
        setVerificationCode("");
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    if (newPassword !== confirmNewPassword) {
      showToast("❌ Passwords do not match!");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) {
        showToast(`❌ Failed to update password: ${error.message}`);
      } else {
        showToast("✨ Password updated successfully!");
        setNewPassword("");
        setConfirmNewPassword("");
        navigateTo("/");
      }
    } catch (err: any) {
      showToast(`❌ Error updating password: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  // Onboarding submit removed, handled by OnboardingWizard

  const handleLoginSubmit = async () => {
    if (!import.meta.env.DEV) {
      showToast("❌ Developer bypass is disabled in production.");
      return;
    }
    const username = loginUsername.toLowerCase().trim();
    if (!username) return;
    
    setAuthLoading(true);
    try {
      // Query profile by username directly
      const { data: existing, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (fetchErr) {
        console.error("Bypass fetch error:", fetchErr);
        showToast(`❌ Failed to bypass: ${fetchErr.message}`);
        setAuthLoading(false);
        return;
      }

      if (existing) {
        // Set local storage and state directly
        localStorage.setItem("fitai_active_profile_id", existing.id);
        setActiveProfileId(existing.id);
        showToast(`✨ Authenticated bypass for @${username}!`);
      } else {
        // Create a new profile with a generated UUID
        const newId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
        const newKey = "fit_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const newProfile = {
          id: newId,
          username,
          display_name: username,
          height: 175,
          weight: 70,
          dob: "1998-05-15",
          gender: "Male",
          preferences: [],
          daily_calories_goal: 2000,
          weight_goal: 70.0,
          protein_goal: 150,
          carbs_goal: 150,
          fats_goal: 60,
          fiber_goal: 30,
          api_key: newKey,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        const { error: createErr } = await supabase
          .from('profiles')
          .insert(newProfile);

        if (createErr) {
          console.error("Bypass profile creation error:", createErr);
          showToast(`❌ Failed to bypass: ${createErr.message}`);
        } else {
          localStorage.setItem("fitai_active_profile_id", newId);
          setActiveProfileId(newId);
          showToast(`✨ Profile created for @${username}!`);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast("❌ Unexpected error during bypass");
    } finally {
      setAuthLoading(false);
    }
  };

  const profileDataRef = useRef(profileData);
  profileDataRef.current = profileData;

  const dbUpdateTimeoutRef = useRef<number | null>(null);

  const setProfileData = (newData: any) => {
    let resolvedData: any;
    if (typeof newData === 'function') {
      resolvedData = newData(profileDataRef.current);
    } else {
      resolvedData = newData;
    }
    
    setProfileDataState(resolvedData);

    if (!isDataLoading && resolvedData.agent_config?.trackWeight && resolvedData.weight !== profileDataRef.current.weight) {
      const todayStr = new Date().toLocaleDateString("en-CA");
      setWeightLogs(prev => {
        const filtered = prev.filter(l => l.date !== todayStr);
        return [...filtered, { weight: resolvedData.weight, date: todayStr }].sort((a, b) => a.date.localeCompare(b.date));
      });

      if (isSupabaseConfigured && activeProfileId) {
        supabase.from("weight_logs").upsert({
          profile_id: activeProfileId,
          weight: resolvedData.weight,
          date: todayStr
        }, { onConflict: "profile_id,date" }).then();
      }
    }

    if (isSupabaseConfigured && activeProfileId) {
      if (dbUpdateTimeoutRef.current) {
        clearTimeout(dbUpdateTimeoutRef.current);
      }

      dbUpdateTimeoutRef.current = setTimeout(async () => {
        const { error } = await supabase
          .from('profiles')
          .update({
            display_name: resolvedData.name,
            image_url: resolvedData.imageUrl,
            description: resolvedData.description,
            height: resolvedData.height,
            weight: resolvedData.weight,
            dob: resolvedData.dob,
            gender: resolvedData.gender,
            knowledge_preferences: resolvedData.knowledge.preferences,
            knowledge_health: resolvedData.knowledge.health,
            knowledge_notes: resolvedData.knowledge.notes,
            knowledge_patterns: resolvedData.knowledge.patterns,
            agent_memory: resolvedData.agent_memory,
            agent_config: resolvedData.agent_config,
            preferences: resolvedData.preferences,
            daily_calories_goal: resolvedData.goals.dailyCalories,
            weight_goal: resolvedData.goals.weightGoal,
            protein_goal: resolvedData.macros.protein,
            carbs_goal: resolvedData.macros.carbs,
            fats_goal: resolvedData.macros.fats,
            fiber_goal: resolvedData.macros.fiber,
            track_micros: resolvedData.trackMicros,
            micros: resolvedData.micros,
            notion_api_key: resolvedData.notionApiKey,
            notion_database_id: resolvedData.notionDatabaseId,
            google_sheets_webhook_url: resolvedData.googleSheetsWebhookUrl,
            telegram_bot_token: resolvedData.telegramBotToken,
            telegram_chat_id: resolvedData.telegramChatId,
            telegram_reminders_enabled: resolvedData.telegramRemindersEnabled,
            telegram_reports_enabled: resolvedData.telegramReportsEnabled,
            telegram_reminder_times: resolvedData.telegramReminderTimes,
            timezone: resolvedData.timezone,
            api_key: resolvedData.api_key
          })
          .eq('id', activeProfileId);
        if (error) {
          console.error("Error updating profile in Supabase:", error);
        }
      }, 800) as any;
    }
  };

  const setRecipes = async (newRecipes: Recipe[] | ((prev: Recipe[]) => Recipe[])) => {
    const resolvedRecipes = typeof newRecipes === 'function' ? newRecipes(recipes) : newRecipes;
    setRecipesState(resolvedRecipes);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Don't seed mealsState with fake meals — start empty so insights show real data
      setRecipesState(INITIAL_RECIPES);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsSessionLoading(false);
      return;
    }

    const initAuth = async () => {
      setIsSessionLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          await handleUserAuthenticated(session.user);
        } else {
          // Check username-only fallback
          const savedProfileId = localStorage.getItem("fitai_active_profile_id");
          if (savedProfileId) {
            const { data: existing, error } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', savedProfileId)
              .maybeSingle();

            if (!error && existing) {
              setActiveProfileId(existing.id);
            } else {
              setActiveProfileId(null);
              localStorage.removeItem("fitai_active_profile_id");
            }
          } else {
            setActiveProfileId(null);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setIsSessionLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        await handleUserAuthenticated(session.user);
        if (window.location.hash) {
          const url = new URL(window.location.href);
          url.hash = "";
          window.history.replaceState({ path: url.pathname }, "", url.toString());
        }
      } else if (event === "SIGNED_OUT") {
        setActiveProfileId(null);
        localStorage.removeItem("fitai_active_profile_id");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect / session handling rules
  useEffect(() => {
    if (isSessionLoading) return;

    const isLoggedIn = !!activeProfileId;

    if (isLoggedIn) {
      if (currentPath === "/login" || currentPath === "/signin") {
        navigateTo("/");
      }
    } else {
      if (currentPath === "/" || currentPath === "/dashboard") {
        navigateTo("/login");
      }
    }
  }, [currentPath, activeProfileId, isSessionLoading]);

  // Handle pending OAuth redirects after successful login
  useEffect(() => {
    if (isSessionLoading || !activeProfileId) return;

    const savedClientId = localStorage.getItem("fitai_oauth_client_id");
    const savedRedirectUri = localStorage.getItem("fitai_oauth_redirect_uri");
    const savedState = localStorage.getItem("fitai_oauth_state") || "";
    const savedTimestampStr = localStorage.getItem("fitai_oauth_timestamp");

    if (savedClientId && savedRedirectUri) {
      const now = Date.now();
      const savedTime = savedTimestampStr ? parseInt(savedTimestampStr, 10) : 0;
      const isRecent = now - savedTime < 10 * 60 * 1000; // 10 minutes (600,000ms)

      // Clear them first to avoid redirection loops and clean up stale data
      localStorage.removeItem("fitai_oauth_client_id");
      localStorage.removeItem("fitai_oauth_redirect_uri");
      localStorage.removeItem("fitai_oauth_state");
      localStorage.removeItem("fitai_oauth_timestamp");

      if (isRecent && currentPath !== "/oauth-consent") {
        // Redirect to the consent page with the saved parameters
        const url = `/oauth-consent?client_id=${encodeURIComponent(savedClientId)}&redirect_uri=${encodeURIComponent(savedRedirectUri)}&state=${encodeURIComponent(savedState)}`;
        navigateTo(url);
      }
    }
  }, [activeProfileId, currentPath, isSessionLoading]);

  // Sync activeTab for OAuth or other paths and support backwards compatibility for ?page=oauth-consent
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("page") === "oauth-consent") {
      const clientId = params.get("client_id") || "";
      const redirectUri = params.get("redirect_uri") || "";
      const state = params.get("state") || "";
      navigateTo(`/oauth-consent?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`);
      return;
    }

    if (currentPath === "/oauth-consent") {
      setActiveTab("oauth-consent");
    } else if (currentPath === "/" || currentPath === "/dashboard") {
      if (activeTab === "oauth-consent") {
        setActiveTab("home");
      }
    }
  }, [currentPath]);

  useEffect(() => {
    if (!isSupabaseConfigured || !activeProfileId) return;

    const loadUserData = async () => {
      setIsDataLoading(true);
      try {
        const [profileRes, recipesRes, mealsRes, wellnessRes, weightLogsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', activeProfileId).single(),
          supabase.from('recipes').select('*').eq('profile_id', activeProfileId).order('name', { ascending: true }),
          supabase.from('meals').select('*').eq('profile_id', activeProfileId).order('created_at', { ascending: false }),
          supabase.from('daily_wellness').select('*').eq('profile_id', activeProfileId),
          supabase.from('weight_logs').select('*').eq('profile_id', activeProfileId).order('date', { ascending: true })
        ]);

        if (profileRes.error) {
          console.error("Error loading profile details:", profileRes.error);
        } else if (profileRes.data) {
          const profile = profileRes.data;

          // Auto-sync local timezone to preferences and dedicated column
          const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const tzPref = `tz_${localTz}`;
          let currentPrefs = profile.preferences || [];
          const hasTzPref = currentPrefs.some((p: string) => p.startsWith("tz_"));
          const needsDbUpdate = !hasTzPref || profile.timezone !== localTz;
          
          if (needsDbUpdate) {
            const updatedPrefs = [...currentPrefs.filter((p: string) => !p.startsWith("tz_")), tzPref];
            supabase.from('profiles').update({ 
              preferences: updatedPrefs,
              timezone: localTz
            }).eq('id', profile.id).then();
            profile.preferences = updatedPrefs;
            profile.timezone = localTz;
          }

          if (profile.preferences?.includes("onboarded")) {
            localStorage.setItem(`fitai_onboarded_${activeProfileId}`, "true");
          }

          // Resolve latest logged weight from history
          let latestWeight = profile.weight;
          if (weightLogsRes && !weightLogsRes.error && weightLogsRes.data) {
            setWeightLogs(weightLogsRes.data);
            if (weightLogsRes.data.length > 0) {
              const sorted = [...weightLogsRes.data].sort((a, b) => a.date.localeCompare(b.date));
              latestWeight = sorted[sorted.length - 1].weight;
            }
          }

          setProfileDataState({
            name: profile.display_name,
            username: profile.username || "",
            imageUrl: profile.image_url,
            description: profile.description,
            height: profile.height,
            weight: latestWeight,
            dob: profile.dob,
            gender: profile.gender,
            knowledge: {
              preferences: profile.knowledge_preferences || [],
              health: profile.knowledge_health || [],
              notes: profile.knowledge_notes || [],
              patterns: profile.knowledge_patterns || []
            },
            agent_memory: profile.agent_memory || [],
            agent_config: profile.agent_config || {},
            preferences: profile.preferences || [],
            goals: {
              dailyCalories: profile.daily_calories_goal,
              weightGoal: profile.weight_goal
            },
            macros: {
              protein: profile.protein_goal,
              carbs: profile.carbs_goal,
              fats: profile.fats_goal,
              fiber: profile.fiber_goal
            },
            trackMicros: profile.track_micros,
            micros: profile.micros || [],
            api_key: profile.api_key,
            notionApiKey: profile.notion_api_key || "",
            notionDatabaseId: profile.notion_database_id || "",
            googleSheetsWebhookUrl: profile.google_sheets_webhook_url || "",
            telegramBotToken: profile.telegram_bot_token || "",
            telegramChatId: profile.telegram_chat_id || "",
            telegramRemindersEnabled: profile.telegram_reminders_enabled || false,
            telegramReportsEnabled: profile.telegram_reports_enabled || false,
            telegramReminderTimes: profile.telegram_reminder_times || ["09:00", "13:00", "20:00"],
            timezone: profile.timezone || "UTC"
          });

          // Load daily wellness notes if table query was successful
          let initialNotesList: DailyWellness[] = [];
          if (wellnessRes && !wellnessRes.error && wellnessRes.data) {
            initialNotesList = wellnessRes.data;
            setDailyNotes(wellnessRes.data);
          }

          // Onboarding states removed, handled by OnboardingWizard
        }

        if (recipesRes.error) {
          console.error("Error loading recipes:", recipesRes.error);
        } else {
          const mappedRecipes: Recipe[] = (recipesRes.data || []).map(r => {
            let img = r.image || "";
            let needsUpdate = false;
            if ((img.includes("1668236543090-82eba5ee5976") || img.includes("1589301760014-d929f3979dbc")) && r.name.toLowerCase().includes("idli")) {
              img = "/images/idli.jpg";
              needsUpdate = true;
            } else if (img.includes("1668236543090-82eba5ee5976") && r.name.toLowerCase().includes("dosa")) {
              img = "/images/dosa.jpg";
              needsUpdate = true;
            } else if (img.includes("1555939594-58d7cb561ad1") || img.includes("1600271886742-f049cd451bba")) {
              img = "/images/omelette.jpg";
              needsUpdate = true;
            }
            if (needsUpdate && isSupabaseConfigured) {
              supabase.from("recipes").update({ image: img }).eq("id", r.id).then();
            }
            return {
              id: r.id,
              name: r.name,
              time: r.time,
              calories: r.calories,
              protein: r.protein,
              carbs: r.carbs,
              fats: r.fats,
              fiber: r.fiber || 0,
              description: r.description || "",
              tags: r.tags || [],
              image: img,
              ingredients: r.ingredients || [],
              instructions: r.instructions,
              micros: r.micros || [],
              log_count: r.log_count || 0
            };
          });

          if (mappedRecipes.length === 0 && activeProfileId) {
            // Seed the 3 default recipes for beginning flow
            const seedPromises = INITIAL_RECIPES.map(r => 
              supabase.from("recipes").insert({
                profile_id: activeProfileId,
                name: r.name,
                time: r.time,
                calories: r.calories,
                protein: r.protein,
                carbs: r.carbs,
                fats: r.fats,
                fiber: r.fiber,
                description: r.description,
                tags: r.tags,
                image: r.image,
                ingredients: r.ingredients,
                instructions: r.instructions
              }).select("*").single()
            );

            Promise.all(seedPromises).then(seededResults => {
              const seededMapped = seededResults
                .map(res => res.data)
                .filter(Boolean)
                .map(r => ({
                  id: r.id,
                  name: r.name,
                  time: r.time,
                  calories: r.calories,
                  protein: r.protein,
                  carbs: r.carbs,
                  fats: r.fats,
                  fiber: r.fiber || 0,
                  description: r.description || "",
                  tags: r.tags || [],
                  image: r.image,
                  ingredients: r.ingredients || [],
                  instructions: r.instructions,
                  micros: r.micros || [],
                  log_count: r.log_count || 0
                }));
              if (seededMapped.length > 0) {
                setRecipesState(seededMapped);
              } else {
                setRecipesState(INITIAL_RECIPES);
              }
            }).catch(err => {
              console.error("Error seeding default recipes:", err);
              setRecipesState(INITIAL_RECIPES);
            });
          } else {
            setRecipesState(mappedRecipes);
          }
        }

        if (mealsRes.error) {
          console.error("Error loading meals from Supabase:", mealsRes.error);
        } else {
          const mappedMeals: Meal[] = (mealsRes.data || []).map(m => ({
            id: m.id,
            name: m.name,
            time: m.time,
            type: m.type,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fats: m.fats,
            fiber: m.fiber || 0,
            image: m.image,
            meal_description: m.meal_description || "",
            date: m.date
          }));

          if (mappedMeals.length === 0 && profileRes.data?.username === "johndoe") {
            const seedPromises = INITIAL_MEALS.map(m =>
              supabase.from("meals").insert({
                profile_id: activeProfileId,
                name: m.name,
                time: m.time,
                type: m.type,
                calories: m.calories,
                protein: m.protein,
                carbs: m.carbs,
                fats: m.fats,
                fiber: m.fiber || 0,
                image: m.image,
                meal_description: m.meal_description || "",
                date: m.date
              }).select("*").single()
            );

            Promise.all(seedPromises).then(seededResults => {
              const seededMapped = seededResults
                .map(res => res.data)
                .filter(Boolean)
                .map(m => ({
                  id: m.id,
                  name: m.name,
                  time: m.time,
                  type: m.type,
                  calories: m.calories,
                  protein: m.protein,
                  carbs: m.carbs,
                  fats: m.fats,
                  fiber: m.fiber || 0,
                  image: m.image,
                  meal_description: m.meal_description || "",
                  date: m.date
                }));
              if (seededMapped.length > 0) {
                setMealsState(seededMapped);
              } else {
                setMealsState(INITIAL_MEALS);
              }
            }).catch(err => {
              console.error("Error seeding default meals for johndoe:", err);
              setMealsState(INITIAL_MEALS);
            });
          } else {
            setMealsState(mappedMeals);
          }
        }
      } catch (err) {
        console.error("Unexpected error loading user data:", err);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadUserData();
  }, [activeProfileId]);

  // Real-time subscription: auto-refresh meals and daily wellness notes when updated
  useEffect(() => {
    if (!isSupabaseConfigured || !activeProfileId) return;

    const channel = supabase
      .channel(`db-realtime-${activeProfileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meals',
          filter: `profile_id=eq.${activeProfileId}`,
        },
        async () => {
          // Refetch all meals when any change happens (insert/update/delete)
          const { data, error } = await supabase
            .from('meals')
            .select('*')
            .eq('profile_id', activeProfileId)
            .order('created_at', { ascending: false });
          if (!error && data) {
            const mappedMeals: Meal[] = data.map((m) => ({
              id: m.id,
              name: m.name,
              time: m.time,
              type: m.type,
              calories: m.calories,
              protein: m.protein,
              carbs: m.carbs,
              fats: m.fats,
              fiber: m.fiber || 0,
              image: m.image,
              meal_description: m.meal_description || "",
              date: m.date,
            }));
            setMealsState(mappedMeals);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_wellness',
          filter: `profile_id=eq.${activeProfileId}`,
        },
        async () => {
          // Refetch all daily wellness notes when any change happens
          const { data, error } = await supabase
            .from('daily_wellness')
            .select('*')
            .eq('profile_id', activeProfileId);
          if (!error && data) {
            setDailyNotes(data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weight_logs',
          filter: `profile_id=eq.${activeProfileId}`,
        },
        async () => {
          // Refetch all weight logs when any change happens
          const { data, error } = await supabase
            .from('weight_logs')
            .select('*')
            .eq('profile_id', activeProfileId)
            .order('date', { ascending: true });
          if (!error && data) {
            setWeightLogs(data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${activeProfileId}`,
        },
        async (payload) => {
          if (payload.new) {
            const profile = payload.new;
            setProfileDataState((prev: any) => ({
              ...prev,
              name: profile.display_name,
              username: profile.username || "",
              imageUrl: profile.image_url,
              description: profile.description,
              height: profile.height,
              weight: profile.weight,
              dob: profile.dob,
              gender: profile.gender,
              knowledge: {
                preferences: profile.knowledge_preferences || [],
                health: profile.knowledge_health || [],
                notes: profile.knowledge_notes || [],
                patterns: profile.knowledge_patterns || []
              },
              agent_memory: profile.agent_memory || [],
              agent_config: profile.agent_config || {},
              preferences: profile.preferences || [],
              goals: {
                dailyCalories: profile.daily_calories_goal,
                weightGoal: profile.weight_goal
              },
              macros: {
                protein: profile.protein_goal,
                carbs: profile.carbs_goal,
                fats: profile.fats_goal,
                fiber: profile.fiber_goal
              },
              trackMicros: profile.track_micros,
              micros: profile.micros || [],
              api_key: profile.api_key,
              notionApiKey: profile.notion_api_key || "",
              notionDatabaseId: profile.notion_database_id || "",
              googleSheetsWebhookUrl: profile.google_sheets_webhook_url || "",
              telegramBotToken: profile.telegram_bot_token || "",
              telegramChatId: profile.telegram_chat_id || "",
              telegramRemindersEnabled: profile.telegram_reminders_enabled || false,
              telegramReportsEnabled: profile.telegram_reports_enabled || false,
              telegramReminderTimes: profile.telegram_reminder_times || ["09:00", "13:00", "20:00"],
              timezone: profile.timezone || "UTC"
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeProfileId]);



  const [customCalVal, setCustomCalVal] = useState("");
  const [customCalName, setCustomCalName] = useState("");
  const [toastMessage, setToastMessage] = useState<React.ReactNode | string | null>(null);

  // Automatic toast dismissal
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: React.ReactNode | string) => {
    setToastMessage(msg);
  };

  const handleLogout = async () => {
    if (activeProfileId) {
      localStorage.removeItem(`fitai_onboarded_${activeProfileId}`);
    }
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("fitai_active_profile_id");
    setActiveProfileId(null);
    setMealsState([]);
    setRecipesState([]);
    setProfileDataState(INITIAL_PROFILE_STATE);
    showToast("🔒 Logged out successfully");
  };

  const handleRecipeAiPromptGenerate = async (promptText: string) => {
    if (!promptText.trim()) {
      showToast("⚠️ Please enter a recipe description prompt");
      return;
    }
    
    const geminiKeyTag = (profileData.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
    const preferenceGeminiKey = geminiKeyTag.split(":")[1] || "";
    const key = preferenceGeminiKey ||
                localStorage.getItem("fitai_gemini_api_key") || 
                (import.meta as any).env.VITE_GEMINI_API_KEY ||
                "";

    setIsRecipeAiGenerating(true);
    try {
      const isEditMode = selectedRecipePopup && selectedRecipePopup.id !== "new";
      const prompt = isEditMode
        ? `You are a professional dietitian. Modify the following base recipe according to this user instruction: "${promptText}".
Base Recipe:
- Name: "${editPopupName || selectedRecipePopup.name}"
- Time: "${editPopupTime || selectedRecipePopup.time}"
- Calories: ${editPopupCalories || selectedRecipePopup.calories} kcal
- Protein: ${editPopupProtein || selectedRecipePopup.protein}g
- Carbs: ${editPopupCarbs || selectedRecipePopup.carbs}g
- Fats: ${editPopupFats || selectedRecipePopup.fats}g
- Fiber: ${editPopupFiber || selectedRecipePopup.fiber || 0}g
- Description: "${editPopupDescription || selectedRecipePopup.description || ""}"
- Ingredients:
${(editPopupIngredients ? editPopupIngredients.split("\n") : (selectedRecipePopup.ingredients || [])).map((i: string) => `- ${i}`).join("\n")}
- Instructions:
${editPopupInstructions || selectedRecipePopup.instructions || ""}

Please return a clean, valid JSON object containing the updated recipe details:
{
  "name": "updated/refined recipe name",
  "time": "updated prep time",
  "calories": updated_calories,
  "protein": updated_protein,
  "carbs": updated_carbs,
  "fats": updated_fats,
  "fiber": updated_fiber,
  "description": "updated teaser description",
  "tags": ["Vegetarian", "High Protein", ...],
  "ingredients": ["updated exact ingredient 1 with quantity", ...],
  "instructions": "updated step-by-step instructions"
}
Do not include any extra text, markdown styling, backticks, or "json" prefix. Just return the raw JSON string itself.`
        : `You are a professional dietitian. Create a single custom recipe based on the user's request prompt: "${promptText}".
Verify details, calculate accurate calorie content, and establish healthy macros. The recipe "name" must be a concise, descriptive food name strictly limited to 2-3 words (e.g., "Veg Biryani", "Avocado Toast").
Return a clean, valid JSON object containing the recipe details:
{
  "name": "Sleek Custom Dish Name",
  "time": "Prep time (e.g. '15 mins')",
  "calories": 350,
  "protein": 25,
  "carbs": 40,
  "fats": 12,
  "fiber": 6,
  "description": "A brief 1-sentence teaser description of what this dish is.",
  "tags": ["Vegetarian", "High Protein", ...],
  "ingredients": ["exact ingredient 1 with quantity", "ingredient 2", ...],
  "instructions": "Step-by-step description of how to prepare the recipe..."
}
Do not include any extra text, markdown styling, backticks, or "json" prefix. Just return the raw JSON string itself.`;

      let rawText = "";
      let edgeSuccess = false;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.functions.invoke("gemini", {
            body: { prompt }
          });
          if (!error && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            rawText = data.candidates[0].content.parts[0].text;
            edgeSuccess = true;
          }
        } catch (e) {
          console.warn("Edge Function invoke error, falling back to direct API:", e);
        }
      }

      if (!edgeSuccess) {
        let response = null;
        for (const model of ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"]) {
          try {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (response.ok) break;
          } catch (e) {}
        }
        if (response && response.ok) {
          const data = await response.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      }

      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      setEditPopupName(parsed.name || "Custom AI Dish");
      setEditPopupTime(parsed.time || "15 mins");
      setEditPopupCalories(parsed.calories ? String(parsed.calories) : "0");
      setEditPopupProtein(parsed.protein ? String(parsed.protein) : "0");
      setEditPopupCarbs(parsed.carbs ? String(parsed.carbs) : "0");
      setEditPopupFats(parsed.fats ? String(parsed.fats) : "0");
      setEditPopupFiber(parsed.fiber ? String(parsed.fiber) : "0");
      setEditPopupDescription(parsed.description || "");
      setEditPopupTags(parsed.tags || ["Custom"]);
      setEditPopupIngredients((parsed.ingredients || []).join("\n"));
      setEditPopupInstructions(parsed.instructions || "");
      
      setIsRecipeAiMode(false);
      showToast("✨ AI generated recipe successfully!");
    } catch (err) {
      console.error(err);
      const geminiKeyTag = (profileData.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
      const preferenceGeminiKey = geminiKeyTag.split(":")[1] || "";
      if (!preferenceGeminiKey) {
        showToast(
          <div className="text-left font-sans">
            <span className="font-bold text-stone-900 block text-xs">❌ Generation Failed</span>
            <span className="text-[10px] text-stone-500 font-semibold block leading-tight mt-1">
              Central AI credits are low. Configure your own free Gemini key in <strong className="text-orange-500">Settings</strong> to unlock uninterrupted generations!
            </span>
          </div>
        );
      } else {
        showToast("❌ Failed to generate recipe. Please check your Gemini API key.");
      }
    } finally {
      setIsRecipeAiGenerating(false);
    }
  };

  const handleGenerateAiRecipe = async () => {
    // 1. Check if Gemini key is available
    const geminiKeyTag = (profileData.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
    const preferenceGeminiKey = geminiKeyTag.split(":")[1] || "";
    const key = preferenceGeminiKey ||
                localStorage.getItem("fitai_gemini_api_key") || 
                (import.meta as any).env.VITE_GEMINI_API_KEY ||
                "";

    setIsGeneratingRecipe(true);
    try {
      // 2. Fetch logged progress for today
      const today = new Date().toISOString().split("T")[0];
      const todayMeals = mealsState.filter(m => m.date === today);
      const mealsSummary = todayMeals.map(m => `- ${m.name} (${m.calories} kcal, ${m.protein}g Protein, ${m.carbs}g Carbs, ${m.fats}g Fats, ${m.fiber || 0}g Fiber)`).join("\n");

      // 3. Calculate remaining macros based on goals
      const totalCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
      const totalProtein = todayMeals.reduce((sum, m) => sum + m.protein, 0);
      const totalCarbs = todayMeals.reduce((sum, m) => sum + m.carbs, 0);
      const totalFats = todayMeals.reduce((sum, m) => sum + m.fats, 0);
      const totalFiber = todayMeals.reduce((sum, m) => sum + (m.fiber || 0), 0);

      const targetCalories = profileData.goals?.dailyCalories || 2000;
      const targetProtein = profileData.macros?.protein || 150;
      const targetCarbs = profileData.macros?.carbs || 50;
      const targetFats = profileData.macros?.fats || 80;
      const targetFiber = profileData.macros?.fiber || 30;

      const remainingCalories = Math.max(0, targetCalories - totalCalories);
      const remainingProtein = Math.max(0, targetProtein - totalProtein);
      const remainingCarbs = Math.max(0, targetCarbs - totalCarbs);
      const remainingFats = Math.max(0, targetFats - totalFats);
      const remainingFiber = Math.max(0, targetFiber - totalFiber);
      const prompt = `You are a professional dietitian. Generate a custom meal recipe based on the user's consumption today and remaining macro goals.
Meals already logged today:
${mealsSummary || "None logged yet"}

Remaining macro goals:
- Calories: ${remainingCalories} kcal
- Protein: ${remainingProtein}g
- Carbs: ${remainingCarbs}g
- Fats: ${remainingFats}g
- Fiber: ${remainingFiber}g

User profile details:
- Height: ${profileData.height} cm
- Weight: ${profileData.weight} kg
- Gender: ${profileData.gender}
- Preferences: ${(profileData.preferences || []).join(", ") || "None"}
- Health notes: ${[
  ...(profileData.knowledge?.preferences || []),
  ...(profileData.knowledge?.health || []),
  ...(profileData.knowledge?.notes || []),
  ...(profileData.knowledge?.patterns || [])
].join(", ") || "None"}

Generate a single custom meal recipe that helps complete their macro goals for today. It must align with user preferences and allergies. The recipe "name" must be a concise, descriptive food name strictly limited to 2-3 words (e.g., "Veg Biryani", "Avocado Toast").
Return a JSON object containing the recipe details:
{
  "name": "Creative Recipe Title",
  "time": "Prep time (e.g. '12 mins')",
  "calories": ${remainingCalories > 0 ? remainingCalories : 500},
  "protein": ${remainingProtein > 0 ? remainingProtein : 30},
  "carbs": ${remainingCarbs > 0 ? remainingCarbs : 40},
  "fats": ${remainingFats > 0 ? remainingFats : 15},
  "fiber": ${remainingFiber > 0 ? remainingFiber : 5},
  "tags": ["AI Recommended"],
  "ingredients": ["exact ingredient 1 with quantity", "ingredient 2", ...],
  "instructions": "Step-by-step description of how to prepare the recipe..."
}
Do not include any markdown styling, backticks, or "json" prefix. Just return the raw JSON string itself.`;

      let rawText = "";

      let edgeSuccess = false;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.functions.invoke("gemini", {
            body: { prompt }
          });
          if (!error && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            rawText = data.candidates[0].content.parts[0].text;
            edgeSuccess = true;
          }
        } catch (e) {
          console.warn("Edge Function invoke error, falling back to direct API:", e);
        }
      }

      if (!edgeSuccess) {
        let response = null;
        let lastError = "";

        for (const model of ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"]) {
          try {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
              })
            });

            if (response.ok) {
              lastError = "";
              break;
            } else {
              const errData = await response.json().catch(() => ({}));
              lastError = errData.error?.message || `HTTP ${response.status} Error`;
            }
          } catch (err: any) {
            lastError = err.message || "Connection failed";
          }
        }

        if (!response || !response.ok) {
          throw new Error(lastError || "Failed to contact Gemini API");
        }

        const data = await response.json();
        rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      
      // Clean up text
      let cleaned = rawText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      const result = JSON.parse(cleaned);
      const generatedRecipe: Recipe = {
        id: "new-ai-" + Date.now(),
        name: result.name || "AI Personalized Recipe",
        time: result.time || "15 mins",
        calories: Math.max(0, parseInt(result.calories) || 0),
        protein: Math.max(0, parseInt(result.protein) || 0),
        carbs: Math.max(0, parseInt(result.carbs) || 0),
        fats: Math.max(0, parseInt(result.fats) || 0),
        fiber: Math.max(0, parseInt(result.fiber) || 0),
        tags: result.tags || ["Custom", "AI Generated"],
        ingredients: result.ingredients || [],
        instructions: result.instructions || "Prep and enjoy!",
        image: "", // Use fallback template card
      };

      // Open the details popup with this newly generated recipe!
      setSelectedRecipePopup(generatedRecipe);
      setIsEditingRecipe(false);
      showToast("✨ AI generated a custom recipe matching your macros!");
    } catch (err: any) {
      console.error(err);
      const geminiKeyTag = (profileData.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
      const preferenceGeminiKey = geminiKeyTag.split(":")[1] || "";
      if (!preferenceGeminiKey) {
        showToast(
          <div className="text-left font-sans">
            <span className="font-bold text-stone-900 block text-xs">❌ Generation Failed</span>
            <span className="text-[10px] text-stone-500 font-semibold block leading-tight mt-1">
              Central AI credits are low. Configure your own free Gemini key in <strong className="text-orange-500">Settings</strong> to unlock uninterrupted generations!
            </span>
          </div>
        );
      } else {
        showToast("❌ Failed to generate recipe. Please check your Gemini API key.");
      }
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const onAddMeal = async (newMealOrRecipe: {
    id?: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    image?: string;
    type?: string;
    time?: string;
    meal_description?: string;
  }) => {
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    const formattedTime = newMealOrRecipe.time || new Date().toLocaleTimeString("en-US", timeOptions);
    
    let finalImage = "";
    if (newMealOrRecipe.image && !hasNoGeneratedImage(newMealOrRecipe.image)) {
      finalImage = newMealOrRecipe.image;
    } else {
      const cleanName = newMealOrRecipe.name.trim();
      let southIndianContext = "";
      const lowerName = cleanName.toLowerCase();
      if (lowerName.includes("dosa") || lowerName.includes("idli") || lowerName.includes("idly") || lowerName.includes("sambar") || lowerName.includes("chutney") || lowerName.includes("vada") || lowerName.includes("uttapam")) {
        southIndianContext = " Plated on a traditional stainless steel plate (thali), accompanied by small individual metal bowls of sambar and coconut/peanut chutney.";
      }
      const prompt = `gourmet professional food photography of ${cleanName}.${southIndianContext} Crisp food separation with distinct ingredients clearly visible and neatly arranged. High detail textures, photorealistic, macro culinary shot, top-down view, clean bright studio lighting, sharp focus, volumetric depth, no blending or bleeding between food elements.`;
      
      // Extract Gemini API key from preferences array
      const geminiKeyTag = (profileData.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
      const geminiKey = geminiKeyTag.split(":")[1] || "";
      
      let generatedImage = "";
      if (geminiKey) {
        try {
          // Set a 6-second timeout for the Gemini request
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`;
          const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ["IMAGE"] }
            })
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            if (imagePart?.inlineData?.data) {
              generatedImage = `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`;
            }
          }
        } catch (err) {
          console.warn("[gemini-image] Failed to generate, falling back to Pollinations.ai:", err);
        }
      }
      
      if (!generatedImage) {
        const seed = Math.floor(Math.random() * 1000000);
        generatedImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=600&nologo=true&seed=${seed}&model=flux`;
      }
      
      finalImage = generatedImage;
    }

    if (newMealOrRecipe.id) {
      if (isSupabaseConfigured && profileData.api_key) {
        try {
          const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
          const res = await fetch(`${supabaseUrl}/functions/v1/gpt-action/meals?id=${newMealOrRecipe.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${profileData.api_key}`
            },
            body: JSON.stringify({
              name: newMealOrRecipe.name,
              calories: newMealOrRecipe.calories,
              protein: newMealOrRecipe.protein,
              carbs: newMealOrRecipe.carbs,
              fats: newMealOrRecipe.fats,
              fiber: (newMealOrRecipe as any).fiber,
              image: finalImage,
              type: newMealOrRecipe.type,
              time: formattedTime,
              date: selectedDate,
              meal_description: newMealOrRecipe.meal_description
            })
          });

          if (res.ok) {
            const data = await res.json();
            const mapped: Meal = {
              id: data.meal.id,
              name: data.meal.name,
              time: data.meal.time,
              type: data.meal.type,
              calories: data.meal.calories,
              protein: data.meal.protein,
              carbs: data.meal.carbs,
              fats: data.meal.fats,
              fiber: data.meal.fiber || 0,
              image: data.meal.image,
              meal_description: data.meal.meal_description || "",
              date: data.meal.date
            };
            setMealsState((prev) => prev.map(m => m.id === mapped.id ? mapped : m));
            showToast(`🍽️ Meal updated successfully!`);
            return;
          }
        } catch (err) {
          console.error("Error updating meal through Edge Function:", err);
        }
      }

      setMealsState((prev) => prev.map(m => m.id === newMealOrRecipe.id ? {
        ...m,
        name: newMealOrRecipe.name,
        time: formattedTime,
        type: newMealOrRecipe.type || m.type,
        calories: newMealOrRecipe.calories,
        protein: newMealOrRecipe.protein,
        carbs: newMealOrRecipe.carbs,
        fats: newMealOrRecipe.fats,
        fiber: (newMealOrRecipe as any).fiber || m.fiber || 0,
        image: finalImage,
        meal_description: newMealOrRecipe.meal_description !== undefined ? newMealOrRecipe.meal_description : m.meal_description
      } : m));
      showToast("🍽️ Meal updated locally");
      return;
    }

    if (isSupabaseConfigured && profileData.api_key) {
      try {
        const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
        const res = await fetch(`${supabaseUrl}/functions/v1/gpt-action/meals`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${profileData.api_key}`
          },
          body: JSON.stringify({
            name: newMealOrRecipe.name,
            calories: newMealOrRecipe.calories,
            protein: newMealOrRecipe.protein,
            carbs: newMealOrRecipe.carbs,
            fats: newMealOrRecipe.fats,
            fiber: (newMealOrRecipe as any).fiber,
            image: finalImage,
            type: newMealOrRecipe.type,
            time: formattedTime,
            date: selectedDate,
            meal_description: newMealOrRecipe.meal_description
          })
        });

        if (res.ok) {
          const data = await res.json();
          const mapped: Meal = {
            id: data.meal.id,
            name: data.meal.name,
            time: data.meal.time,
            type: data.meal.type,
            calories: data.meal.calories,
            protein: data.meal.protein,
            carbs: data.meal.carbs,
            fats: data.meal.fats,
            fiber: data.meal.fiber || 0,
            image: data.meal.image || finalImage,
            meal_description: data.meal.meal_description || "",
            date: data.meal.date
          };
          setMealsState((prev) => [mapped, ...prev]);
          showToast(`🍽️ Logged & Synced: "${newMealOrRecipe.name}" (+${newMealOrRecipe.calories} kcal)`);
          return;
        } else {
          console.error("Failed to log meal through Edge Function:", await res.text());
        }
      } catch (err) {
        console.error("Error logging meal to Edge Function:", err);
      }
    }

    // Local / fallback mode
    const meal: Meal = {
      id: String(mealsState.length + 1),
      name: newMealOrRecipe.name,
      time: formattedTime,
      type: newMealOrRecipe.type || "Meal",
      calories: newMealOrRecipe.calories,
      protein: newMealOrRecipe.protein,
      carbs: newMealOrRecipe.carbs,
      fats: newMealOrRecipe.fats,
      fiber: (newMealOrRecipe as any).fiber || 0,
      image: finalImage,
      meal_description: newMealOrRecipe.meal_description || "",
      date: selectedDate,
    };

    setMealsState((prev) => [meal, ...prev]);
    showToast(`🍽️ Logged: "${newMealOrRecipe.name}" (+${newMealOrRecipe.calories} kcal)`);
  };

  const handleSaveDailyNote = async (dateStr: string, text: string) => {
    const updatedNotes = [...dailyNotes.filter(n => n.date !== dateStr)];
    const textTrimmed = text.trim();
    
    if (textTrimmed) {
      updatedNotes.push({
        date: dateStr,
        notes: textTrimmed
      });
    }
    setDailyNotes(updatedNotes);

    if (isSupabaseConfigured && activeProfileId) {
      try {
        if (textTrimmed) {
          await supabase.from("daily_wellness").upsert({
            profile_id: activeProfileId,
            date: dateStr,
            notes: textTrimmed
          }, { onConflict: "profile_id,date" });
        } else {
          // Delete note if cleared
          await supabase.from("daily_wellness").delete().eq("profile_id", activeProfileId).eq("date", dateStr);
        }
      } catch (err) {
        console.error("Error saving daily wellness notes:", err);
      }
    }
  };

  const [lastDeletedMeal, setLastDeletedMeal] = useState<Meal | null>(null);
  const deleteTimeoutRef = useRef<number | null>(null);

  const commitDeletion = async (meal: Meal) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', meal.id);
      if (error) {
        console.error("Error committing meal delete in Supabase:", error);
      }
    }
  };

  const handleEditMeal = (meal: Meal) => {
    setManualLogInitialAiMode(false);
    setMealToEdit(meal);
    setIsCameraFullScreen(true);
  };

  const handleDeleteMeal = (meal: Meal) => {
    setMealPendingDelete(meal);
  };

  const confirmDeleteMeal = (meal: Meal) => {
    setMealPendingDelete(null);

    if (deleteTimeoutRef.current && lastDeletedMeal) {
      clearTimeout(deleteTimeoutRef.current);
      commitDeletion(lastDeletedMeal);
    }

    setLastDeletedMeal(meal);
    setMealsState(prev => prev.filter(m => m.id !== meal.id));

    deleteTimeoutRef.current = setTimeout(() => {
      commitDeletion(meal);
      setLastDeletedMeal(null);
      deleteTimeoutRef.current = null;
    }, 4000) as any;

    showToast(
      <div className="flex items-center justify-between w-full gap-2">
        <span>🗑️ Meal deleted</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMealsState(prev => [meal, ...prev]);
            setLastDeletedMeal(null);
            if (deleteTimeoutRef.current) {
              clearTimeout(deleteTimeoutRef.current);
              deleteTimeoutRef.current = null;
            }
            showToast("Restored meal!");
          }}
          className="text-orange-400 hover:text-orange-300 font-extrabold uppercase text-[10px] tracking-wider bg-white/10 px-2.5 py-1 rounded-lg ml-2 active:scale-95 transition-all"
        >
          Undo
        </button>
      </div>
    );
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('recipes')
          .delete()
          .eq('id', recipeId);
        if (error) {
          console.error("Error deleting recipe in Supabase:", error);
          showToast("❌ Error deleting recipe");
          return;
        }
      } catch (err) {
        console.error("Error deleting recipe:", err);
        showToast("❌ Error deleting recipe");
        return;
      }
    }

    setRecipesState(prev => prev.filter(r => r.id !== recipeId));
    setSelectedRecipePopup(null);
    showToast("🗑️ Recipe deleted");
  };

  const openRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipePopup(recipe);
    setIsEditingRecipe(recipe.id === "new");
    setEditPopupName(recipe.name);
    setEditPopupTime(recipe.time);
    setEditPopupCalories(recipe.calories ? String(recipe.calories) : "");
    setEditPopupProtein(recipe.protein ? String(recipe.protein) : "");
    setEditPopupCarbs(recipe.carbs ? String(recipe.carbs) : "");
    setEditPopupFats(recipe.fats ? String(recipe.fats) : "");
    setEditPopupDescription(recipe.description || "");
    setEditPopupFiber(recipe.fiber ? String(recipe.fiber) : "");
    setEditPopupTags(recipe.tags || []);
    setEditPopupIngredients((recipe.ingredients || []).join("\n"));
    setEditPopupInstructions(recipe.instructions || "");
    setEditPopupImage(recipe.image || "");
    setShowRecipeImagePanel(false);
    setEditPopupMicros(recipe.micros || []);
    setAiConfigMode(
      recipe.micros && recipe.micros.length > 0 ? "manual" : "ai",
    );
  };

  const openGoalConfig = (type: "dailyCalories" | "weightGoal") => {
    setActiveGoalConfigPopup(type);
    setGoalConfigValue(
      type === "dailyCalories"
        ? profileData.goals.dailyCalories
        : profileData.goals.weightGoal,
    );
  };

  // Filter meals for the active tracked date
  const activeMeals = mealsState.filter((m) => m.date === selectedDate);

  const totalCalories = activeMeals.reduce(
    (sum, meal) => sum + meal.calories,
    0,
  );
  const totalProtein = activeMeals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = activeMeals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFats = activeMeals.reduce((sum, meal) => sum + meal.fats, 0);
  const totalFiber = activeMeals.reduce((sum, meal) => sum + (meal.fiber || 0), 0);

  // Compute current streak: count consecutive days with at least one meal, going back from today
  const currentStreak = (() => {
    const datesWithLogs = new Set(mealsState.map((m) => m.date));
    let streak = 0;
    const d = new Date(todayStr + "T00:00:00");
    while (datesWithLogs.has(formatDateStr(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  const isViewingShare = shareId || (shareTypeParam && shareDataParam);

  if (isViewingShare) {
    return (
      <PublicShareView
        shareId={shareId}
        shareTypeParam={shareTypeParam}
        shareDataParam={shareDataParam}
        activeProfileId={activeProfileId}
        onImportMeal={onAddMeal}
        onImportRecipe={async (newRecipe) => {
          if (isSupabaseConfigured && activeProfileId) {
            const { data, error } = await supabase
              .from("recipes")
              .insert({
                profile_id: activeProfileId,
                name: newRecipe.name,
                time: newRecipe.time,
                calories: newRecipe.calories,
                protein: newRecipe.protein,
                carbs: newRecipe.carbs,
                fats: newRecipe.fats,
                fiber: newRecipe.fiber,
                tags: newRecipe.tags,
                image: newRecipe.image,
                ingredients: newRecipe.ingredients,
                instructions: newRecipe.instructions
              })
              .select("*")
              .single();
            if (error) throw error;
            if (data) {
              setRecipesState(prev => [data, ...prev]);
            }
          } else {
            setRecipesState(prev => [newRecipe, ...prev]);
          }
        }}
        onNavigateToDashboard={() => {
          const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.pushState({ path: newUrl }, "", newUrl);
          setShareId(null);
          setShareTypeParam(null);
          setShareDataParam(null);
        }}
        triggerToast={showToast}
        onAuthSuccess={(userId) => {
          setActiveProfileId(userId);
          localStorage.setItem("fitai_active_profile_id", userId);
        }}
      />
    );
  }

  if (isSupabaseConfigured && isSessionLoading && currentPath !== "/") {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-sans max-w-md mx-auto relative shadow-2xl">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- ROUTING HANDLERS ---

  // "/" is the main app — no more Redirecting... screen needed

  // 2. Reset Password View
  if (currentPath === "/reset-password") {
    const isLoggedIn = !!activeProfileId;
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-8 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[380px] z-[250] pointer-events-auto"
            >
              <div className="bg-stone-900/95 backdrop-blur-md text-white text-xs font-bold py-3.5 px-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 font-sans">
                <span className="flex-1 tracking-tight leading-tight">{toastMessage}</span>
                <button
                  onClick={() => setToastMessage(null)}
                  className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="my-auto space-y-8 py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-200 flex items-center justify-center">
              <Sparkles className="text-white w-8 h-8 fill-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-center mt-2">
              Fit<span className="text-orange-500">AI</span>
            </h1>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest text-center">
              Secure Password Reset
            </p>
          </div>

          {!isLoggedIn ? (
            <div className="space-y-4 text-center">
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-5 space-y-3">
                <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                  Invalid or expired password reset link. Please request a new recovery link from the login page.
                </p>
              </div>
              <button
                onClick={() => navigateTo("/login")}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/40 cursor-pointer"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1 text-center">
                <h2 className="text-xl font-black text-stone-850">Reset Your Password</h2>
                <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3">
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all animate-none"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all animate-none"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/40 disabled:opacity-60 disabled:pointer-events-none cursor-pointer mt-1"
                >
                  {resetLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="text-center text-[8px] text-stone-300 font-bold tracking-widest uppercase">
          © 2026 FitAI. All rights reserved.
        </div>
      </div>
    );
  }

  // 3. Login / Signup View
  if (currentPath === "/login" || currentPath === "/signin") {
    if (activeProfileId) {
      return (
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center font-sans max-w-md mx-auto relative shadow-2xl">
          <span className="text-xs font-black text-stone-400 uppercase tracking-widest animate-pulse">Redirecting...</span>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-8 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[380px] z-[250] pointer-events-auto"
            >
              <div className="bg-stone-900/95 backdrop-blur-md text-white text-xs font-bold py-3.5 px-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 font-sans">
                <span className="flex-1 tracking-tight leading-tight">{toastMessage}</span>
                <button
                  onClick={() => setToastMessage(null)}
                  className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="my-auto space-y-8 py-12">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3" onClick={() => navigateTo("/")} style={{ cursor: 'pointer' }}>
            <div className="w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-200 flex items-center justify-center">
              <Sparkles className="text-white w-8 h-8 fill-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-center mt-2">
              Fit<span className="text-orange-500">AI</span>
            </h1>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest text-center">
              Personalized Nutrition Engine
            </p>
          </div>



          {/* Authentication Actions */}
          <div className="space-y-5">
            <>
              {/* Google Authentication Button */}
              <button
                onClick={handleGoogleLogin}
                className="w-full bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Subtle Divider */}
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-[9px] font-black tracking-widest text-stone-300 uppercase">OR</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {/* Passwordless Email OTP / Magic Link Form */}
              {!otpSent ? (
                <form onSubmit={handleEmailOtpSignIn} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Username or email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all animate-none"
                  />

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/40 disabled:opacity-60 disabled:pointer-events-none cursor-pointer mt-1"
                  >
                    {authLoading ? "Sending Link..." : "Send Login Link"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider leading-relaxed">
                      ✉️ Check your inbox
                    </p>
                    <p className="text-[9px] text-stone-400 font-medium leading-relaxed">
                      Click the link in the email to log in instantly,<br />
                      or enter the 6-digit code below to connect here.
                    </p>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="6-digit verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, "").substring(0, 6))}
                    required
                    maxLength={6}
                    className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-center text-sm font-black tracking-widest text-stone-850 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all animate-none"
                  />

                  <div className="flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={authLoading || verificationCode.length < 6}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/40 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                    >
                      {authLoading ? "Verifying..." : "Verify Code"}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setVerificationCode("");
                      }}
                      className="w-full text-center text-[9px] text-stone-400 hover:text-stone-500 font-bold tracking-wider uppercase py-1 bg-transparent border-0 cursor-pointer transition-colors"
                    >
                      ← Back / Change Email
                    </button>
                  </div>
                </form>
              )}


                {/* Minimal Developer Mode Bypass */}
                {import.meta.env.DEV && (
                  <>
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setShowDeveloperBypass(!showDeveloperBypass)}
                        className="text-[8px] text-stone-400 hover:text-stone-500 font-bold uppercase tracking-widest transition-colors cursor-pointer bg-transparent border-0"
                      >
                        {showDeveloperBypass ? "Close Developer Bypass" : "Developer Bypass"}
                      </button>
                    </div>

                    {/* Username Input Form (Conditional Bypass) */}
                    <AnimatePresence>
                      {showDeveloperBypass && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-2 overflow-hidden"
                        >
                          <input
                            type="text"
                            placeholder="Enter developer username (e.g. johndoe)"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleLoginSubmit();
                            }}
                            className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                          />
                          <button
                            onClick={handleLoginSubmit}
                            disabled={!loginUsername.trim()}
                            className="w-full bg-stone-900 hover:bg-stone-850 text-white text-[10px] font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                          >
                            Bypass Authentication
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </>
            </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[8px] text-stone-300 font-bold tracking-widest uppercase">
          © 2026 FitAI. All rights reserved.
        </div>
      </div>
    );
  }

  // 4. OAuth Consent View (Must render even if activeProfileId is null / user is unauthenticated)
  if (currentPath === "/oauth-consent" || activeTab === "oauth-consent") {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-8 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[380px] z-[250] pointer-events-auto"
            >
              <div className="bg-stone-900/95 backdrop-blur-md text-white text-xs font-bold py-3.5 px-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 font-sans">
                <span className="flex-1 tracking-tight leading-tight">{toastMessage}</span>
                <button
                  onClick={() => setToastMessage(null)}
                  className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <OAuthConsentView
          setActiveTab={setActiveTab}
          triggerToast={(msg) => setToastMessage(msg)}
          navigateTo={navigateTo}
        />
      </div>
    );
  }

  // 5. Fallback Redirect for other unauthenticated routes
  if (!activeProfileId) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center font-sans max-w-md mx-auto relative shadow-2xl">
        <span className="text-xs font-black text-stone-400 uppercase tracking-widest animate-pulse">Redirecting to login...</span>
      </div>
    );
  }

  const handleLogWeight = async (weight: number, dateStr: string) => {
    if (!activeProfileId) return;
    
    const { data: upsertedData, error: upsertError } = await supabase
      .from("weight_logs")
      .upsert(
        {
          profile_id: activeProfileId,
          date: dateStr,
          weight: weight
        },
        { onConflict: "profile_id,date" }
      )
      .select();

    if (upsertError) {
      showToast("❌ Failed to save weight log");
      console.error(upsertError);
      return;
    }

    const loggedRow = (upsertedData && upsertedData[0]) || {
      id: Math.random().toString(),
      profile_id: activeProfileId,
      date: dateStr,
      weight: weight
    };

    setWeightLogs(prev => {
      const filtered = prev.filter(l => l.date !== dateStr);
      return [...filtered, loggedRow];
    });

    const { data: latest } = await supabase
      .from("weight_logs")
      .select("weight,date")
      .eq("profile_id", activeProfileId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest && latest.date === dateStr) {
      setProfileData((prev: any) => ({
        ...prev,
        weight: weight
      }));
    }

    showToast("✨ Weight logged successfully");
  };

  const handleDeleteWeight = async (logId: string) => {
    if (!activeProfileId) return;

    const logToDelete = weightLogs.find(l => l.id === logId);
    if (!logToDelete) return;

    const { error: deleteError } = await supabase
      .from("weight_logs")
      .delete()
      .eq("id", logId);

    if (deleteError) {
      showToast("❌ Failed to delete weight log");
      console.error(deleteError);
      return;
    }

    const remainingLogs = weightLogs.filter(l => l.id !== logId);
    setWeightLogs(remainingLogs);

    if (remainingLogs.length > 0) {
      const sorted = [...remainingLogs].sort((a, b) => b.date.localeCompare(a.date));
      const latestLog = sorted[0];
      
      setProfileData((prev: any) => ({
        ...prev,
        weight: latestLog.weight
      }));
    }

    showToast("Weight log removed");
  };

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans p-6 max-w-md mx-auto space-y-8 flex flex-col justify-center items-center">
        <div className="animate-pulse flex flex-col items-center gap-6 w-full px-4">
          <div className="w-16 h-16 bg-orange-200/50 rounded-2xl animate-bounce" />
          <div className="w-48 h-6 bg-orange-200/40 rounded-lg" />
          <div className="w-56 h-56 bg-orange-200/30 rounded-full flex items-center justify-center">
            <div className="w-40 h-40 bg-[#FAF9F6] rounded-full" />
          </div>
          <div className="w-full h-24 bg-orange-200/20 rounded-[24px]" />
          <div className="w-full h-12 bg-orange-200/25 rounded-2xl" />
          <div className="w-full h-32 bg-orange-200/20 rounded-[28px]" />
        </div>
      </div>
    );
  }

  const localOnboardedKey = activeProfileId ? `fitai_onboarded_${activeProfileId}` : null;
  const localOnboarded = localOnboardedKey ? localStorage.getItem(localOnboardedKey) === "true" : false;
  const isOnboarded = localOnboarded || profileData.preferences?.includes("onboarded");

  const isOauthConsentPage = currentPath === "/oauth-consent" || activeTab === "oauth-consent";

  if (isSupabaseConfigured && activeProfileId && !isOnboarded && !isOauthConsentPage) {
    return (
      <OnboardingWizard
        activeProfileId={activeProfileId}
        supabase={supabase}
        profileData={profileData}
        onComplete={(completedData) => {
          if (activeProfileId) {
            try {
              localStorage.setItem(`fitai_onboarded_${activeProfileId}`, "true");
            } catch (e) {
              console.warn("localStorage is blocked or disabled:", e);
            }
          }
          setProfileDataState((prev: any) => ({
            ...prev,
            ...completedData,
            goals: {
              ...prev.goals,
              ...completedData.goals
            },
            macros: {
              ...prev.macros,
              ...completedData.macros
            },
            knowledge: {
              ...prev.knowledge,
              ...completedData.knowledge
            }
          }));
        }}
        triggerToast={showToast}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 pb-32 max-w-md mx-auto relative shadow-2xl overflow-x-hidden">
      {/* Absolute Custom Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[380px] z-[250] pointer-events-auto"
          >
            <div className="bg-stone-900/95 backdrop-blur-md text-white text-xs font-bold py-3.5 px-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 font-sans">
              <span className="flex-1 tracking-tight leading-tight">{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warm Background Gradient Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from)_0%,_transparent_40%)] from-orange-100/40 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-from)_0%,_transparent_40%)] from-orange-50/30 pointer-events-none" />

      {/* Dynamic Header */}
      <header
        id="header-main"
        className="px-6 pt-8 flex items-center justify-between relative z-10"
      >
        <div id="brand-logo" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-orange-500 shadow-lg shadow-orange-200 flex items-center justify-center">
            <Flame className="text-white w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-orange-400">
            FitAI
          </h1>
        </div>
        <div id="user-stats" className="flex items-center gap-3">
          <motion.div
            id="streak-counter"
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-orange-100/50"
          >
            <span className="text-orange-500 text-lg">🔥</span>
            <span className="font-bold text-orange-900">{currentStreak}</span>
          </motion.div>
          <button
            id="profile-avatar"
            onClick={() => setActiveTab("profile")}
            className="w-10 h-10 rounded-full border-2 border-orange-500 p-0.5 overflow-hidden shadow-md cursor-pointer hover:scale-105 transition-transform flex items-center justify-center bg-stone-100"
          >
            {profileData.imageUrl ? (
              <img
                src={profileData.imageUrl}
                alt="User"
                className="w-full h-full object-cover rounded-full pointer-events-none"
              />
            ) : (
              <DefaultAvatar />
            )}
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === "home" && (
          <motion.div
            key="home-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Calendar Strip */}
            <div id="calendar-strip" className="px-6 mt-8 relative z-10 space-y-4">
              {/* Date Selector & Snap-to-Today Header */}
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-black uppercase tracking-widest text-stone-500">
                  {getFormattedSelectedDate()}
                </span>
                <div className="flex items-center gap-2">
                  {selectedDate !== todayStr && (
                    <button
                      onClick={() => {
                        setSelectedDate(todayStr);
                        recenterDaysList(todayStr);
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer border-none flex items-center gap-1 shrink-0"
                    >
                      Shift to Today
                    </button>
                  )}
                  <button
                    onClick={() => setIsDatePickerOpen(true)}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/60 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all border-none"
                    title="Choose Date"
                  >
                    <CalendarIcon className="w-4 h-4 text-stone-500" />
                  </button>
                  <button
                    onClick={handleShareDay}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/60 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
                    title="Share day summary"
                  >
                    <Share2 className="w-4 h-4 text-stone-500" />
                  </button>
                </div>
              </div>

              {/* Day Strips */}
              <div className="flex justify-between items-center overflow-x-auto pb-4 scrollbar-hide gap-3">
                {daysList.map((day, idx) => {
                  const isActive = day.fullDate === selectedDate;
                  const d = new Date(day.fullDate + "T00:00:00");
                  const shortDayName = d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
                  const shortMonthName = d.toLocaleDateString("en-US", { month: "short" }).toLowerCase();
                  return (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedDate(day.fullDate);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[58px] py-3.5 rounded-2xl transition-all duration-300 shadow-sm grow cursor-pointer shrink-0",
                        isActive
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-200 ring-4 ring-orange-50"
                          : "bg-white/60 backdrop-blur-sm text-gray-500 border border-orange-50/50 hover:bg-white/90",
                      )}
                    >
                      <span className="text-[10px] font-black opacity-60 tracking-tighter">
                        {shortDayName}
                      </span>
                      <span className="text-lg font-black leading-none my-1">{day.date}</span>
                      <span className="text-[9px] font-black opacity-60 tracking-wider">
                        {shortMonthName}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="px-6 mt-4 relative z-10">
              {/* Circular Progress for Calories */}
              <div className="relative w-full aspect-square max-w-[280px] mx-auto flex items-center justify-center my-8">
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-xl"
                  viewBox="0 0 240 240"
                >
                  <circle
                    cx="120"
                    cy="120"
                    r="104"
                    strokeWidth="20"
                    fill="transparent"
                    className="stroke-orange-100/50"
                  />
                  <motion.circle
                    cx="120"
                    cy="120"
                    r="104"
                    strokeWidth="20"
                    fill="transparent"
                    strokeLinecap="round"
                    className="stroke-orange-500"
                    initial={{ strokeDashoffset: Math.PI * 2 * 104 }}
                    animate={{
                      strokeDashoffset:
                        Math.PI * 2 * 104 -
                        Math.min(1, totalCalories / profileData.goals.dailyCalories) *
                          (Math.PI * 2 * 104),
                    }}
                    strokeDasharray={Math.PI * 2 * 104}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="text-center z-10 bg-white/40 backdrop-blur-md w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-inner border border-white/50">
                  <div className="text-5xl font-black mb-1 text-orange-950 px-2 truncate selection:bg-orange-500 select-none">
                    {totalCalories.toLocaleString()}
                  </div>
                  <div className="h-1.5 w-8 bg-orange-500 rounded-full mb-1" />
                  <div className="text-orange-900/50 font-black tracking-[0.1em] text-[10px] uppercase">
                    / {profileData.goals.dailyCalories.toLocaleString()}{" "}
                    KCAL
                  </div>
                </div>
              </div>

              {/* Macro Progress Bars */}
              <div className="bg-white/60 backdrop-blur-md p-6 rounded-[32px] border border-white/80 shadow-xl shadow-orange-100/20 grid grid-cols-2 gap-x-6 gap-y-6 mt-6">
                {[
                  {
                    name: "Protein",
                    value: totalProtein,
                    max: profileData.macros.protein,
                    color: "#FF7008",
                  },
                  {
                    name: "Carbs",
                    value: totalCarbs,
                    max: profileData.macros.carbs,
                    color: "#006B7D",
                  },
                  {
                    name: "Fats",
                    value: totalFats,
                    max: profileData.macros.fats,
                    color: "#FFB800",
                  },
                  {
                    name: "Fiber",
                    value: totalFiber,
                    max: profileData.macros.fiber,
                    color: "#10B981",
                  },
                ].map((macro, idx) => (
                  <ProgressBar
                    key={macro.name}
                    label={macro.name}
                    value={macro.value}
                    max={macro.max}
                    color={macro.color}
                    index={idx}
                  />
                ))}
              </div>
            </div>
 
            {/* Weight Tracker Section — only visible when not yet logged today */}
            {profileData.agent_config?.trackWeight && (() => {
              const todayStr = new Date().toLocaleDateString("en-CA");
              const todayLog = weightLogs.find(l => l.date === todayStr);
              
              if (todayLog) return null; // Logged weight appears in Today's Notes

              const baseWeight = (() => {
                const pastLogs = weightLogs.filter(l => l.date < todayStr);
                if (pastLogs.length > 0) {
                  const sortedPast = [...pastLogs].sort((a, b) => b.date.localeCompare(a.date));
                  return sortedPast[0].weight;
                }
                return profileData.weight || 70;
              })();

              const currentWeight = draftWeight ?? baseWeight;

              return (
                <section className="px-6 mt-10 relative z-10 text-left">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                      Today's Weight
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2.5 w-full">
                    <div className="flex-1 flex items-center bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl px-2 py-1.5 shadow-sm">
                      <button
                        onClick={() => {
                          setDraftWeight(Math.max(30, Number((currentWeight - 0.1).toFixed(1))));
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-white/60 cursor-pointer border-none bg-transparent active:scale-95 transition-all"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex-1 flex items-center justify-center gap-0.5 text-xs font-bold text-stone-750 select-none">
                        <span className="text-sm font-black text-stone-850">{currentWeight}</span>
                        <span className="text-stone-400">kg</span>
                      </div>
                      <button
                        onClick={() => {
                          setDraftWeight(Math.min(300, Number((currentWeight + 0.1).toFixed(1))));
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-white/60 cursor-pointer border-none bg-transparent active:scale-95 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        await handleLogWeight(currentWeight, todayStr);
                        setDraftWeight(null);
                      }}
                      className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border-none shadow-sm active:scale-95"
                      title="Log Weight"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </section>
              );
            })()}

            {/* Today's Consumption Section */}
            <section className="px-6 mt-16 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black tracking-tight text-orange-950">
                  {selectedDate === todayStr ? "Today's Consumption" : "Logged Consumption"}
                </h3>
                {selectedDate === todayStr && (
                  <div className="flex gap-2">
                    {/* Quick Add Zap Button */}
                    <button
                      onClick={() => setShowQuickAdd(!showQuickAdd)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 shadow-sm border-none ${
                        showQuickAdd
                          ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10"
                          : "bg-stone-100 hover:bg-stone-200 text-stone-500 shadow-stone-200/10"
                      }`}
                      title="Quick Add"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                    {/* Log Meal Plus Button */}
                    <button
                      onClick={handleLogMealClick}
                      className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 shadow-sm shadow-orange-500/10 border-none"
                      title="Log Meal"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Quick Add Row */}
              <AnimatePresence>
                {showQuickAdd && selectedDate === todayStr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-6">
                    <div className="flex gap-2.5 items-center w-full">
                      <input
                        type="text"
                        placeholder="Add item..."
                        value={customCalName}
                        onChange={(e) => setCustomCalName(e.target.value)}
                        className="flex-1 h-12 bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl px-4 text-xs font-bold text-stone-900 placeholder-stone-400 focus:outline-none shadow-sm focus:ring-1 focus:ring-orange-500/10 transition-all text-left"
                      />
                      <input
                        type="number"
                        placeholder="kcal"
                        value={customCalVal}
                        onChange={(e) => setCustomCalVal(e.target.value)}
                        className="w-20 h-12 bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl text-center text-xs font-bold text-stone-900 placeholder-stone-400 focus:outline-none shadow-sm focus:ring-1 focus:ring-orange-500/10 transition-all"
                      />
                      <button
                        onClick={() => {
                          const name = customCalName.trim();
                          const kcalStr = customCalVal.trim();
                          const kcalVal = parseInt(kcalStr);

                          if (!name && !kcalStr) {
                            showToast("Enter an item name or calories");
                            return;
                          }

                          if (kcalStr && kcalVal > 0) {
                            onAddMeal({
                              name: name || "Quick Add",
                              calories: kcalVal,
                              protein: 0,
                              carbs: 0,
                              fats: 0,
                              type: "Quick Cal",
                            });
                            showToast(`Logged "${name || "Quick Add"}" — ${kcalVal} kcal`);
                            setCustomCalName("");
                            setCustomCalVal("");
                          } else {
                            const ingredientsList = name
                              .split(/,|and|\+/)
                              .map((i) => i.trim())
                              .filter(Boolean);
                            
                            const nutrition = calculateNutritionFromIngredients(name, ingredientsList);
                            
                            onAddMeal({
                              name,
                              calories: nutrition.calories,
                              protein: nutrition.protein,
                              carbs: nutrition.carbs,
                              fats: nutrition.fats,
                              type: "Quick Cal",
                            });
                            
                            showToast(`AI Estimated: ${nutrition.calories} kcal, ${nutrition.protein}g Protein`);
                            setCustomCalName("");
                            setCustomCalVal("");
                          }
                        }}
                        className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border-none shadow-sm active:scale-95"
                        title="Quick Add"
                      >
                        <Check className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6">
                {activeMeals.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <p className="text-sm font-bold text-stone-500">No logs for this date yet</p>
                    <p className="text-[10px] text-stone-400 mt-1 font-medium leading-relaxed">
                      All meals, quick calories, or recipe favorites logged on this date will show up here.
                    </p>
                  </div>
                ) : (
                  activeMeals.map((meal) => {
                    const isQuickCal = meal.protein === 0 && meal.carbs === 0 && meal.fats === 0;

                    if (isQuickCal) {
                      return (
                        <motion.div
                          key={meal.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleEditMeal(meal)}
                          className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/90 p-4 shadow-3xs flex items-center justify-between gap-4 relative z-10 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-orange-100/50 flex items-center justify-center text-orange-600 shrink-0">
                              <Zap className="w-4 h-4 fill-orange-500 text-orange-500" />
                            </div>
                            <div className="text-left min-w-0">
                              <h4 className="text-xs font-black text-stone-850 truncate leading-tight">
                                {meal.name}
                              </h4>
                              {meal.meal_description && (
                                <p className="text-[9px] text-stone-500 font-semibold mt-0.5 line-clamp-1">
                                  {meal.meal_description}
                                </p>
                              )}
                              <span className="text-[8px] font-bold text-stone-400 block mt-0.5 uppercase tracking-wider">
                                {meal.time}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-sm font-black text-orange-600 block">
                                {meal.calories} kcal
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareMeal(meal);
                              }}
                              className="w-7 h-7 rounded-lg bg-stone-50 hover:bg-orange-50 text-stone-400 hover:text-orange-500 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40 shrink-0"
                              title="Share meal"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMeal(meal);
                              }}
                              className="w-7 h-7 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-400 hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40 shrink-0"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    }

                    const hasImage = true;

                    if (!hasImage) {
                      const getMealEmoji = (typeStr: string) => {
                        const t = typeStr?.toLowerCase() || "";
                        if (t.includes("breakfast") || t.includes("morning")) return "🥞";
                        if (t.includes("lunch") || t.includes("afternoon")) return "🥗";
                        if (t.includes("dinner") || t.includes("night") || t.includes("evening")) return "🥩";
                        if (t.includes("snack") || t.includes("bite") || t.includes("tea")) return "🍎";
                        return "🍽️";
                      };
                      const mealEmoji = getMealEmoji(meal.type);

                      return (
                        <motion.div
                          key={meal.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleEditMeal(meal)}
                          className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/90 p-4 shadow-3xs flex items-center justify-between gap-4 relative z-10 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-xl bg-stone-100/60 flex items-center justify-center text-sm shrink-0 border border-stone-200/20">
                              {mealEmoji}
                            </div>
                            <div className="text-left min-w-0">
                              <h4 className="text-xs font-black text-stone-850 truncate leading-tight">
                                {meal.name}
                              </h4>
                              {meal.meal_description && (
                                <p className="text-[9px] text-stone-500 font-semibold mt-0.5 line-clamp-1">
                                  {meal.meal_description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                                <span className="text-[8px] font-bold text-stone-400 block uppercase tracking-wider">
                                  {meal.time}
                                </span>
                                <span className="text-[8px] text-stone-300 font-bold">•</span>
                                <span className="text-[8px] font-extrabold text-stone-500 uppercase tracking-wide block">
                                  P: {meal.protein}g • C: {meal.carbs}g • F: {meal.fats}g
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right mr-1">
                              <span className="text-xs font-black text-stone-700 block">
                                +{meal.calories} kcal
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareMeal(meal);
                              }}
                              className="w-7 h-7 rounded-lg bg-stone-50 hover:bg-orange-50 text-stone-400 hover:text-orange-500 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40"
                              title="Share meal"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMeal(meal);
                              }}
                              className="w-7 h-7 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-400 hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors border border-stone-200/40"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key={meal.id}
                        whileHover={{ y: -4, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleEditMeal(meal)}
                        className="relative rounded-[32px] overflow-hidden aspect-[4/3] sm:aspect-video shadow-xl shadow-orange-200/30 group cursor-pointer"
                      >
                        {meal.image && !hasNoGeneratedImage(meal.image) ? (
                          <TimelineImage
                            src={meal.image}
                            alt={meal.name}
                            fallbackEmoji={getMealEmoji(meal.name, meal.type)}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[#F4F3EF]/90 flex items-center justify-center select-none">
                            <span className="text-7xl sm:text-8xl group-hover:scale-110 transition-transform duration-700 opacity-[0.85] filter drop-shadow-xs">
                              {getMealEmoji(meal.name, meal.type)}
                            </span>
                          </div>
                        )}
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-t z-10 pointer-events-none",
                          meal.image && !hasNoGeneratedImage(meal.image)
                            ? "from-black/90 via-black/40 to-black/20"
                            : "from-stone-900/75 via-stone-900/25 to-transparent"
                        )} />

                        {/* Top Bar: Time, Calories, and Delete */}
                        <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-20">
                          <div className="backdrop-blur-md bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white">
                              {meal.time}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="backdrop-blur-md bg-orange-500/90 text-white px-3 py-1.5 rounded-full font-black flex items-center gap-1 shadow-lg border border-orange-400/50">
                              <span className="text-sm">{meal.calories}</span>
                              <span className="text-[9px] uppercase tracking-wider opacity-90">
                                Kcal
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareMeal(meal);
                              }}
                              className="w-8 h-8 rounded-full backdrop-blur-md bg-black/30 hover:bg-orange-500/80 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
                              title="Share meal"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMeal(meal);
                              }}
                              className="w-8 h-8 rounded-full backdrop-blur-md bg-black/30 hover:bg-red-550/85 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Content: Name and Macros */}
                        <div className="absolute bottom-5 left-5 right-5 text-left font-sans z-20">
                          <h4 className="text-white text-xl sm:text-2xl font-black mb-1 leading-tight tracking-tight shadow-sm">
                            {meal.name}
                          </h4>
                          {meal.meal_description && (
                            <p className="text-[10px] text-white/75 font-semibold italic mb-3 line-clamp-1 truncate">
                              "{meal.meal_description}"
                            </p>
                          )}

                          <div className="flex gap-4">
                            {[
                              { l: "Protein", v: meal.protein },
                              { l: "Carbs", v: meal.carbs },
                              { l: "Fats", v: meal.fats },
                            ].map((m) => (
                              <div key={m.l} className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-sm" />
                                <div className="flex items-baseline gap-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-white/50">
                                    {m.l}
                                  </span>
                                  <span className="text-sm font-bold text-white">
                                    {m.v}g
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Daily Wellness Journal Section */}
            <section className="px-6 mt-10 mb-28 relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                  <span>{selectedDate === todayStr ? "Today's Notes" : "Logged Notes"}</span>
                </h3>
                {selectedDate && (
                  <span className="text-[9px] font-bold text-stone-400">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Weight logged note — plain text matching journal style */}
              {profileData.agent_config?.trackWeight && (() => {
                const weightTodayLog = weightLogs.find(l => l.date === selectedDate);
                if (!weightTodayLog) return null;
                return (
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-stone-800">
                      Today's Weight — {weightTodayLog.weight} kg
                    </p>
                    {selectedDate === todayStr && (
                      <button
                        onClick={async () => {
                          if (weightTodayLog.id) {
                            await handleDeleteWeight(weightTodayLog.id);
                          }
                        }}
                        className="w-4 h-4 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-500 hover:text-stone-700 cursor-pointer border-none transition-colors shrink-0"
                        title="Remove weight log"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })()}

              <WellnessJournal
                selectedDate={selectedDate}
                dailyNotes={dailyNotes}
                handleSaveDailyNote={handleSaveDailyNote}
                todayStr={todayStr}
              />
            </section>
          </motion.div>
        )}
        {activeTab === "settings" && (
          <SettingsView
            key="settings-tab"
            profileData={profileData}
            setProfileData={setProfileData}
            triggerToast={(msg) => setToastMessage(msg)}
            session={session}
            onLogout={handleLogout}
          />
        )}
        {activeTab === "profile" && (
          <ProfileView
            key="profile-tab"
            profileData={profileData}
            setProfileData={setProfileData}
            setActiveTab={setActiveTab}
            recipes={recipes}
            setRecipes={setRecipes}
            onAddMeal={onAddMeal}
            openGoalConfig={openGoalConfig}
            openRecipeDetails={openRecipeDetails}
            triggerToast={(msg) => setToastMessage(msg)}
            activeProfileId={activeProfileId}
            currentStreak={currentStreak}
            mealsState={mealsState}
            weightLogs={weightLogs}
            onLogWeight={handleLogWeight}
            onDeleteWeight={handleDeleteWeight}
            onLogout={handleLogout}
          />
        )}
        {activeTab === "edit-profile" && (
          <EditProfileView
            key="edit-profile-tab"
            profileData={profileData}
            setProfileData={setProfileData}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "oauth-consent" && (
          <OAuthConsentView
            key="oauth-consent-tab"
            setActiveTab={setActiveTab}
            triggerToast={(msg) => setToastMessage(msg)}
          />
        )}
      </AnimatePresence>

      {/* World-Class Detail & Edit Recipe Popup Overlay */}
      <AnimatePresence>
        {selectedRecipePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/65 backdrop-blur-md z-[100] flex items-end justify-center font-sans"
          >
            {/* Sliding Bottom Sheet Sheet Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-stone-50 rounded-t-[36px] w-full max-w-[448px] h-[85vh] overflow-hidden flex flex-col shadow-2xl border-t border-white/20"
            >
              {/* Image Title Banner */}
              <div className="h-44 w-full relative shrink-0 bg-stone-900">
                {!hasNoGeneratedImage(isEditingRecipe ? editPopupImage : selectedRecipePopup.image) ? (
                  <img
                    src={isEditingRecipe ? editPopupImage : selectedRecipePopup.image}
                    className="w-full h-full object-cover animate-fade-in"
                    alt={selectedRecipePopup.name}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-850 to-stone-950 flex items-center justify-center">
                    <Utensils className="w-12 h-12 text-white opacity-20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/30 to-black/10 pointer-events-none" />

                {/* Edit Photo Overlaid Button */}
                {isEditingRecipe && (
                  <button
                    onClick={() => setShowRecipeImagePanel(!showRecipeImagePanel)}
                    className="absolute bottom-3 right-3 backdrop-blur-md bg-black/45 hover:bg-black/60 border border-white/10 text-white text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer z-25 shadow-sm shadow-black/10 active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{showRecipeImagePanel ? "Close Edit" : "Edit Image"}</span>
                  </button>
                )}

                {/* Header buttons */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                  <span className="px-3 py-1 bg-black/55 backdrop-blur-sm rounded-full text-[9px] font-black uppercase text-orange-400 tracking-wider font-sans">
                    {isEditingRecipe 
                      ? "Editing Mode" 
                      : (selectedRecipePopup.id === "new" || selectedRecipePopup.id?.toString().startsWith("new-ai-") 
                          ? "New Recipe" 
                          : `Logged ${selectedRecipePopup.log_count || 0} time${(selectedRecipePopup.log_count || 0) === 1 ? "" : "s"}`)}
                  </span>
                  <div className="flex gap-2">
                    {!isEditingRecipe && selectedRecipePopup.id !== "new" && (
                      <button
                        onClick={() => handleShareRecipe(selectedRecipePopup)}
                        className="w-8 h-8 rounded-full bg-black/60 hover:bg-orange-500/80 text-white flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer"
                        title="Share recipe"
                      >
                        <Share2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedRecipePopup(null)}
                      className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Overlaid Title */}
                <div className="absolute bottom-4 left-4 right-4 text-left">
                  <div className="flex gap-1.5 mb-1 flex-wrap">
                    {(isEditingRecipe ? editPopupTags : selectedRecipePopup.tags).map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-orange-500 text-white rounded-md text-[7px] font-black uppercase tracking-widest font-sans"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-white text-base font-black leading-tight tracking-tight drop-shadow-sm font-sans">
                    {isEditingRecipe ? editPopupName || "Unnamed Recipe" : selectedRecipePopup.name}
                  </h3>
                  <p className="text-[10px] text-white/70 font-bold font-sans mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>⏱️ Prep time: {isEditingRecipe ? editPopupTime : selectedRecipePopup.time}</span>
                  </p>
                </div>
              </div>

              {/* Scrollable Form / Details Wrapper */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                {isEditingRecipe && showRecipeImagePanel && (
                  /* RECIPE COVER IMAGE EDITOR DRAWER */
                  <div className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm space-y-3 text-left animate-fade-in">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-orange-950/40 uppercase tracking-widest border-b border-black/[0.02] pb-2">
                      <Camera className="w-3.5 h-3.5 text-stone-500" />
                      <span>Recipe Cover Image Settings</span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <input
                        type="text"
                        placeholder="Paste image URL here..."
                        value={editPopupImage.startsWith("data:") ? "" : editPopupImage}
                        onChange={(e) => setEditPopupImage(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none placeholder-stone-400"
                      />
                      <div className="flex gap-2 items-center">
                        <div className="relative inline-block">
                          <button className="bg-stone-900 hover:bg-stone-850 text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-3xs">
                            Upload Photo
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditPopupImage(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </div>
                        {editPopupImage && (
                          <button
                            onClick={() => setEditPopupImage("")}
                            className="text-[9px] font-bold text-red-500 hover:text-red-655 ml-1.5 cursor-pointer"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {!isEditingRecipe ? (
                  /* VIEW MODE */
                  <div className="space-y-6 text-left font-sans">
                    {selectedRecipePopup.description && (
                      <p className="text-xs text-stone-500 font-semibold leading-relaxed bg-stone-50 border border-stone-200/50 rounded-2xl p-4 italic">
                        "{selectedRecipePopup.description}"
                      </p>
                    )}
                    {/* Calories & Standard Macros HUD block */}
                    <div className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-black/[0.02]">
                        <span className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest">
                          Macronutrient Density
                        </span>
                        <span className="text-xs font-black text-[#10B981] font-mono">
                          🔥 {selectedRecipePopup.calories} kcal
                        </span>
                      </div>

                      {/* Bar metrics representing Carb/Prot/Fat distribution */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-orange-50/50 rounded-2xl p-3 border border-orange-100 flex flex-col justify-center">
                          <span className="text-[8px] font-extrabold text-orange-700/60 uppercase">
                            Protein
                          </span>
                          <span className="text-sm font-black text-orange-950 mt-0.5">
                            {selectedRecipePopup.protein}g
                          </span>
                          <div className="w-full bg-orange-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                              className="bg-orange-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, (selectedRecipePopup.protein / 50) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-indigo-50/40 rounded-2xl p-3 border border-indigo-100 flex flex-col justify-center">
                          <span className="text-[8px] font-extrabold text-indigo-700/60 uppercase">
                            Carbohydrates
                          </span>
                          <span className="text-sm font-black text-[#1E3A8A] mt-0.5">
                            {selectedRecipePopup.carbs}g
                          </span>
                          <div className="w-full bg-indigo-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, (selectedRecipePopup.carbs / 150) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100 flex flex-col justify-center">
                          <span className="text-[8px] font-extrabold text-amber-700/60 uppercase">
                            Fats
                          </span>
                          <span className="text-sm font-black text-amber-950 mt-0.5">
                            {selectedRecipePopup.fats}g
                          </span>
                          <div className="w-full bg-amber-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, (selectedRecipePopup.fats / 70) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>



                    {/* Ingredients detail */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block font-sans">
                        Ingredients Needed
                      </span>
                      <ul className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm divide-y divide-black/[0.02] space-y-2.5">
                        {selectedRecipePopup.ingredients.map((ing, i) => (
                          <li
                            key={i}
                            className="text-xs font-bold text-orange-950/80 pt-2.5 first:pt-0 flex items-center gap-2 font-sans"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Instructions detail */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block font-sans">
                        Step-by-Step Instructions
                      </span>
                      <div className="bg-white rounded-3xl p-5 border border-black/[0.04] shadow-sm font-sans font-medium">
                        <p className="text-xs text-orange-950/75 font-semibold leading-relaxed whitespace-pre-line font-sans">
                          {selectedRecipePopup.instructions || "Enjoy this healthy portion immediately!"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isRecipeAiMode ? (
                  /* AI RECIPE GENERATOR MODE */
                  <div className="space-y-4 text-left font-sans animate-fadeIn">
                    <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                      <span>Generate Recipe with AI</span>
                    </div>
                    <div className="bg-white rounded-3xl p-5 border border-stone-200/40 shadow-sm space-y-4">
                      <p className="text-[10px] text-stone-500 font-medium leading-relaxed font-sans">
                        Describe the recipe you want to create (e.g. ingredients you have, dietary goals, or a dish name). Gemini will design the instructions, ingredients list, calories, and macros for you.
                      </p>
                      <textarea
                        rows={6}
                        placeholder='e.g., "A high-protein, low-carb spinach and mushroom quiche using egg whites, feta cheese, and oat flour for crust"'
                        value={recipeAiPrompt}
                        onChange={(e) => setRecipeAiPrompt(e.target.value)}
                        className="w-full bg-stone-50/50 border border-stone-250 focus:border-orange-500 rounded-2xl px-4 py-3.5 text-xs font-semibold text-stone-900 focus:outline-none placeholder-stone-400 resize-none leading-relaxed font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => handleRecipeAiPromptGenerate(recipeAiPrompt)}
                        disabled={isRecipeAiGenerating}
                        className="w-full bg-stone-900 hover:bg-stone-850 text-white text-[10px] font-black uppercase tracking-wider py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md border-none disabled:opacity-50 font-sans"
                      >
                        {isRecipeAiGenerating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Generating Recipe...</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-4 h-4 text-white" />
                            <span>Generate & Auto-Fill Form</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* EDIT / CREATE MODE */
                  <div className="space-y-6 text-left font-sans animate-none">
                    {/* General Text Info Inputs */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                          Recipe Name / Title
                        </label>
                        <input
                          type="text"
                          value={editPopupName}
                          onChange={(e) => setEditPopupName(e.target.value)}
                          placeholder="e.g. Avocado Spinach Superfood Crunch"
                          className="w-full bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl px-4 py-3 text-xs font-bold text-orange-950 outline-none transition-all shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                          Short Description
                        </label>
                        <input
                          type="text"
                          value={editPopupDescription}
                          onChange={(e) => setEditPopupDescription(e.target.value)}
                          placeholder="e.g. Spiced potato-filled crepe served with chutney"
                          className="w-full bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl px-4 py-3 text-xs font-bold text-orange-950 outline-none transition-all shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                          Prep Duration
                        </label>
                        <input
                          type="text"
                          value={editPopupTime}
                          onChange={(e) => setEditPopupTime(e.target.value)}
                          placeholder="e.g. 15 mins"
                          className="w-full bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl px-4 py-3 text-xs font-bold text-orange-950 outline-none transition-all shadow-inner"
                        />
                      </div>

                      {/* Tactile and Modern Dietary Tags Selector */}
                      <div className="bg-white rounded-3xl p-5 border border-stone-200/40 shadow-sm space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                          <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                            Dietary Labels / Tags
                          </label>
                          {editPopupTags.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setEditPopupTags([])}
                              className="text-[9px] font-black uppercase tracking-wider text-orange-600 hover:opacity-85 active:scale-95 transition-all cursor-pointer"
                            >
                              Clear All ({editPopupTags.length})
                            </button>
                          )}
                        </div>

                        {/* Quick Tap & Custom Active Tags Container */}
                        <div className="space-y-2">
                          <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block">
                            Tap to toggle label filters
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: "Keto 🥑", value: "Keto" },
                              { label: "Vegan 🌱", value: "Vegan" },
                              { label: "High Protein 💪", value: "High Protein" },
                              { label: "Gluten Free 🌾", value: "Gluten Free" },
                              { label: "Dairy Free 🥛", value: "Dairy Free" },
                              { label: "Low Carb 🥩", value: "Low Carb" },
                              { label: "Low Calorie 🔥", value: "Low Calorie" },
                            ].map((preset) => {
                              const isActive = editPopupTags.includes(preset.value);
                              return (
                                <motion.button
                                  key={preset.value}
                                  type="button"
                                  whileTap={{ scale: 0.93 }}
                                  onClick={() => {
                                    if (isActive) {
                                      setEditPopupTags(editPopupTags.filter((t) => t !== preset.value));
                                    } else {
                                      setEditPopupTags([...editPopupTags, preset.value]);
                                    }
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border select-none cursor-pointer active:scale-95 flex items-center gap-1",
                                    isActive
                                      ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20"
                                      : "bg-orange-50/40 border-orange-100 text-stone-600 hover:bg-orange-50 hover:border-orange-200 hover:text-stone-800"
                                  )}
                                >
                                  <span>{preset.label}</span>
                                  {isActive && <Check className="w-2.5 h-2.5 shrink-0 ml-0.5" />}
                                </motion.button>
                              );
                            })}

                            {/* Render active custom tags dynamically here if they don't match standard presets */}
                            {editPopupTags
                              .filter(
                                (tag) =>
                                  ![
                                    "Keto",
                                    "Vegan",
                                    "High Protein",
                                    "Gluten Free",
                                    "Dairy Free",
                                    "Low Carb",
                                    "Low Calorie",
                                  ].some((std) => std.toLowerCase() === tag.toLowerCase())
                              )
                              .map((customTag) => (
                                <motion.button
                                  key={customTag}
                                  type="button"
                                  whileTap={{ scale: 0.93 }}
                                  onClick={() => setEditPopupTags(editPopupTags.filter((t) => t !== customTag))}
                                  className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20 select-none cursor-pointer active:scale-95 flex items-center gap-1.5"
                                >
                                  <span>{customTag} ✨</span>
                                  <span className="text-[11px] font-light leading-none opacity-80">×</span>
                                </motion.button>
                              ))}
                          </div>
                        </div>

                        {/* Custom tags input form */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add custom tag... (Type & press enter)"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = e.currentTarget.value.trim();
                                if (val && !editPopupTags.some((t) => t.toLowerCase() === val.toLowerCase())) {
                                  const capitalized = val.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                                  setEditPopupTags([...editPopupTags, capitalized]);
                                  e.currentTarget.value = "";
                                }
                              }
                            }}
                            id="customTagInput"
                            className="flex-1 bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-xl px-3 py-2 text-[10px] font-bold text-orange-950 outline-none transition-all shadow-inner"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById("customTagInput") as HTMLInputElement | null;
                              if (input) {
                                const val = input.value.trim();
                                if (val && !editPopupTags.some((t) => t.toLowerCase() === val.toLowerCase())) {
                                  const capitalized = val.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                                  setEditPopupTags([...editPopupTags, capitalized]);
                                  input.value = "";
                                }
                              }
                            }}
                            className="px-4 py-2 bg-orange-50 hover:bg-orange-100/80 border border-orange-200 text-orange-700 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest active:scale-95 cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                          >
                            Add Tag
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                          Raw Ingredients (One entry per line)
                        </label>
                        <textarea
                          rows={4}
                          value={editPopupIngredients}
                          onChange={(e) => setEditPopupIngredients(e.target.value)}
                          placeholder="e.g.&#10;2 whole Avocados&#10;100g Fresh Spinach&#10;1 scoop Whey Protein"
                          className="w-full bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl px-4 py-3 text-xs font-bold text-orange-950 outline-none transition-all shadow-inner leading-relaxed"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-orange-950/40 uppercase tracking-widest block">
                          Cooking Instructions step list
                        </label>
                        <textarea
                          rows={3}
                          value={editPopupInstructions}
                          onChange={(e) => setEditPopupInstructions(e.target.value)}
                          placeholder="e.g. Blend/mash avocados and fold in spinach slowly. Complete serving cold!"
                          className="w-full bg-white border border-stone-200/70 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl px-4 py-3 text-xs font-bold text-orange-950 outline-none transition-all shadow-inner leading-relaxed"
                        />
                      </div>
                    </div>

                    {/* Nutritional Presciption Metrics with Auto-fill button */}
                    <div className="pt-4 border-t border-black/[0.04]">
                      <div className="bg-white rounded-3xl p-5 border border-stone-200/40 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                          <h6 className="text-[10px] font-black text-orange-950/50 uppercase tracking-widest block">
                            Portion Macrographics
                          </h6>
                          <button
                            type="button"
                            onClick={() => {
                              if (!editPopupIngredients.trim()) {
                                setToastMessage("Please enter some ingredients first to extract nutrition! 🥦");
                                return;
                              }
                              setIsAiCalculating(true);
                              setTimeout(() => {
                                const ingredientsArr = editPopupIngredients
                                  .split("\n")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                const calculations =
                                  calculateNutritionFromIngredients(
                                    editPopupName,
                                    ingredientsArr,
                                  );

                                let filledSome = false;
                                if (!editPopupCalories || editPopupCalories === "0" || editPopupCalories === "") {
                                  setEditPopupCalories(String(calculations.calories));
                                  filledSome = true;
                                }
                                if (!editPopupProtein || editPopupProtein === "0" || editPopupProtein === "") {
                                  setEditPopupProtein(String(calculations.protein));
                                  filledSome = true;
                                }
                                if (!editPopupCarbs || editPopupCarbs === "0" || editPopupCarbs === "") {
                                  setEditPopupCarbs(String(calculations.carbs));
                                  filledSome = true;
                                }
                                if (!editPopupFats || editPopupFats === "0" || editPopupFats === "") {
                                  setEditPopupFats(String(calculations.fats));
                                  filledSome = true;
                                }
                                if (!editPopupMicros || editPopupMicros.length === 0) {
                                  setEditPopupMicros(calculations.micros);
                                }

                                setIsAiCalculating(false);
                                
                                if (!filledSome) {
                                  setEditPopupCalories(String(calculations.calories));
                                  setEditPopupProtein(String(calculations.protein));
                                  setEditPopupCarbs(String(calculations.carbs));
                                  setEditPopupFats(String(calculations.fats));
                                  setEditPopupMicros(calculations.micros);
                                  setToastMessage("Estimation calculated and applied! (Values overwritten)");
                                }
                              }, 850);
                            }}
                            className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 select-none shrink-0 border",
                              isAiCalculating
                                ? "bg-stone-50 border-stone-100 text-stone-400 cursor-not-allowed"
                                : "bg-orange-50/70 border-orange-100/55 text-orange-600 hover:bg-orange-100/80 hover:text-orange-700"
                            )}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                            {isAiCalculating ? "Extracting..." : "Auto-Fill with AI"}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">
                              Calories (kcal)
                            </label>
                            <input
                              type="number"
                              value={editPopupCalories}
                              onChange={(e) => setEditPopupCalories(e.target.value)}
                              className="w-full bg-stone-50/50 border border-stone-200/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-950 outline-none transition-all shadow-inner animate-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">
                              Protein (g)
                            </label>
                            <input
                              type="number"
                              value={editPopupProtein}
                              onChange={(e) => setEditPopupProtein(e.target.value)}
                              className="w-full bg-stone-50/50 border border-stone-200/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-950 outline-none transition-all shadow-inner animate-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">
                              Carbs (g)
                            </label>
                            <input
                              type="number"
                              value={editPopupCarbs}
                              onChange={(e) => setEditPopupCarbs(e.target.value)}
                              className="w-full bg-stone-50/50 border border-stone-200/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-950 outline-none transition-all shadow-inner animate-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">
                              Fats (g)
                            </label>
                            <input
                              type="number"
                              value={editPopupFats}
                              onChange={(e) => setEditPopupFats(e.target.value)}
                              className="w-full bg-stone-50/50 border border-stone-200/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-950 outline-none transition-all shadow-inner animate-none"
                            />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">
                              Fiber (g)
                            </label>
                            <input
                              type="number"
                              value={editPopupFiber}
                              onChange={(e) => setEditPopupFiber(e.target.value)}
                              className="w-full bg-stone-50/50 border border-stone-200/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-950 outline-none transition-all shadow-inner animate-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Sticky Action Footer bar */}
              <div className="p-4 bg-white border-t border-black/[0.03] shrink-0 font-sans">
                {!isEditingRecipe ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditPopupImage(selectedRecipePopup.image || "");
                        setShowRecipeImagePanel(false);
                        setIsEditingRecipe(true);
                      }}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-200/50 text-stone-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      ✏️ Edit recipe
                    </button>
                    {selectedRecipePopup.id !== "new" && (
                      <button
                        onClick={() => handleDeleteRecipe(selectedRecipePopup.id)}
                        className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-red-100"
                        title="Delete recipe"
                      >
                        <Trash2 className="w-4 h-4 text-red-550" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onAddMeal({
                          name: selectedRecipePopup.name,
                          calories: selectedRecipePopup.calories,
                          protein: selectedRecipePopup.protein,
                          carbs: selectedRecipePopup.carbs,
                          fats: selectedRecipePopup.fats,
                          image: selectedRecipePopup.image,
                          type: "Favorite",
                        });
                        
                        // Increment recipe log count
                        const newCount = (selectedRecipePopup.log_count || 0) + 1;
                        setRecipesState(prev => prev.map(r => r.id === selectedRecipePopup.id ? { ...r, log_count: newCount } : r));
                        if (isSupabaseConfigured) {
                          supabase
                            .from('recipes')
                            .update({ log_count: newCount })
                            .eq('id', selectedRecipePopup.id)
                            .then();
                        }

                        setToastMessage(`Successfully logged portion of "${selectedRecipePopup.name}" for today! 🍽️`);
                        setSelectedRecipePopup(null);
                      }}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[10px] py-2.5 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10 transition-colors cursor-pointer"
                    >
                      <Utensils className="w-3.5 h-3.5" /> Log to Today's Plate
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 font-sans">
                    {selectedRecipePopup.id !== "new" && (
                      <button
                        onClick={() => handleDeleteRecipe(selectedRecipePopup.id)}
                        className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-red-100"
                        title="Delete recipe"
                      >
                        <Trash2 className="w-4 h-4 text-red-550" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (selectedRecipePopup.id === "new") {
                          setSelectedRecipePopup(null);
                        } else {
                          setIsEditingRecipe(false);
                        }
                      }}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRecipeAiMode(!isRecipeAiMode)}
                      className="px-3.5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-655 rounded-xl transition-all cursor-pointer border border-orange-100/55 flex items-center justify-center gap-1 font-black text-[10px] uppercase tracking-wider active:scale-95"
                    >
                      {isRecipeAiMode ? "Manual Form" : (selectedRecipePopup.id === "new" ? "AI Generator" : "AI Editor")}
                    </button>
                    <button
                      onClick={async () => {
                        // Validate
                        const finalName = editPopupName.trim() || "Unnamed Custom Dish";
                        const finalIngredients = editPopupIngredients
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean);

                        const actualIsNew = selectedRecipePopup.id === "new";
                        const updated: Recipe = {
                          id: actualIsNew ? "rec-" + Date.now() : selectedRecipePopup.id,
                          name: finalName,
                          time: editPopupTime || "15 mins",
                          calories: parseInt(editPopupCalories) || 0,
                          protein: parseInt(editPopupProtein) || 0,
                          carbs: parseInt(editPopupCarbs) || 0,
                          fats: parseInt(editPopupFats) || 0,
                          fiber: parseInt(editPopupFiber) || 0,
                          description: editPopupDescription.trim(),
                          tags: editPopupTags.length > 0 ? editPopupTags : ["Custom"],
                          image: editPopupImage || "",
                          ingredients: finalIngredients,
                          instructions: editPopupInstructions.trim() || "Mix ingredients and serve fresh!",
                          micros: editPopupMicros,
                        };

                        if (isSupabaseConfigured && activeProfileId) {
                          try {
                            const recipeData = {
                              profile_id: activeProfileId,
                              name: updated.name,
                              time: updated.time,
                              calories: updated.calories,
                              protein: updated.protein,
                              carbs: updated.carbs,
                              fats: updated.fats,
                              fiber: updated.fiber,
                              description: updated.description,
                              tags: updated.tags,
                              image: updated.image,
                              ingredients: updated.ingredients,
                              instructions: updated.instructions,
                              micros: updated.micros
                            };

                            if (actualIsNew) {
                              const { data, error } = await supabase
                                .from('recipes')
                                .insert(recipeData)
                                .select('*')
                                .single();

                              if (error) {
                                console.error("Error creating recipe in Supabase:", error);
                                setRecipes([updated, ...recipes]);
                              } else if (data) {
                                const mapped: Recipe = {
                                  id: data.id,
                                  name: data.name,
                                  time: data.time,
                                  calories: data.calories,
                                  protein: data.protein,
                                  carbs: data.carbs,
                                  fats: data.fats,
                                  fiber: data.fiber,
                                  description: data.description,
                                  tags: data.tags || [],
                                  image: data.image,
                                  ingredients: data.ingredients || [],
                                  instructions: data.instructions,
                                  micros: data.micros || []
                                };
                                setRecipes([mapped, ...recipes]);
                              }
                            } else {
                              const { error } = await supabase
                                .from('recipes')
                                .update(recipeData)
                                .eq('id', selectedRecipePopup.id);

                              if (error) {
                                console.error("Error updating recipe in Supabase:", error);
                              }
                              setRecipes(recipes.map((r) => (r.id === updated.id ? updated : r)));
                            }
                          } catch (err) {
                            console.error("Error saving recipe to Supabase:", err);
                            if (actualIsNew) {
                              setRecipes([updated, ...recipes]);
                            } else {
                              setRecipes(recipes.map((r) => (r.id === updated.id ? updated : r)));
                            }
                          }
                        } else {
                          if (actualIsNew) {
                            setRecipes([updated, ...recipes]);
                          } else {
                            setRecipes(recipes.map((r) => (r.id === updated.id ? updated : r)));
                          }
                        }

                        // Close popups
                        setSelectedRecipePopup(null);
                        setToastMessage(`Recipe "${finalName}" saved successfully! 🎉`);
                      }}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-md shadow-orange-500/10 transition-colors cursor-pointer"
                    >
                      💾 Save changes
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Dynamic World-Class Goals Dial Sliders Picker Popups */}
      <AnimatePresence>
        {activeGoalConfigPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/65 backdrop-blur-md z-[100] flex items-end justify-center font-sans"
          >
            {/* Slide up sheet panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-[36px] w-full max-w-[448px] overflow-hidden flex flex-col shadow-2xl p-6 space-y-6"
            >
              {/* Header block with visual theme */}
              <div className="flex justify-between items-center pb-2 border-b border-black/[0.04]">
                <div className="text-left">
                  <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-1">
                    <Target className="w-4 h-4 text-orange-500" />
                    {activeGoalConfigPopup === "dailyCalories" ? "Calorie Target" : "Target Weight"}
                  </h4>
                  <p className="text-[10px] text-stone-500 font-bold">
                    Slide/tap adjustments with real-time visual indicator
                  </p>
                </div>
                <button
                  onClick={() => setActiveGoalConfigPopup(null)}
                  className="w-8 h-8 rounded-full bg-stone-100/80 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Slider panel content */}
              {activeGoalConfigPopup === "dailyCalories" ? (
                /* CALORIE SLIDER DIAL */
                <div className="space-y-6 text-center py-4">
                  <div className="inline-block bg-orange-50 px-4 py-2.5 rounded-3xl border border-orange-100">
                    <div className="text-3xl font-black text-orange-600 font-mono">
                      {goalConfigValue.toLocaleString()} <span className="text-xs font-extrabold text-orange-950">kcal</span>
                    </div>
                    <span className="text-[8px] font-black text-orange-700/60 uppercase tracking-widest">
                      Estimated Daily Requirement
                    </span>
                  </div>

                  {/* Range Dial Slider */}
                  <div className="px-4">
                    <input
                      type="range"
                      min={1200}
                      max={3500}
                      step={50}
                      value={goalConfigValue}
                      onChange={(e) => setGoalConfigValue(parseInt(e.target.value))}
                      className="w-full accent-orange-500 h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-bold text-stone-400 font-mono mt-1">
                      <span>1,200 kcal</span>
                      <span>2,000 kcal</span>
                      <span>3,500 kcal</span>
                    </div>
                  </div>

                  {/* Preset config shortcuts (Surplus, Maintenance, Deficit) */}
                  <div className="space-y-2">
                    <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block">
                      Target Presets
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setGoalConfigValue(1600)}
                        className="p-2.5 bg-stone-100 hover:bg-orange-50 hover:text-orange-600 rounded-xl text-[9px] font-black uppercase tracking-wider text-stone-800 transition-all border border-transparent hover:border-orange-200/50 cursor-pointer"
                      >
                        🔥 Burning Burn <br /> (1600 cal)
                      </button>
                      <button
                        onClick={() => setGoalConfigValue(2000)}
                        className="p-2.5 bg-stone-100 hover:bg-orange-50 hover:text-orange-600 rounded-xl text-[9px] font-black uppercase tracking-wider text-stone-800 transition-all border border-transparent hover:border-orange-200/50 cursor-pointer"
                      >
                        🥗 Balance Lean <br /> (2000 cal)
                      </button>
                      <button
                        onClick={() => setGoalConfigValue(2600)}
                        className="p-2.5 bg-stone-100 hover:bg-orange-50 hover:text-orange-600 rounded-xl text-[9px] font-black uppercase tracking-wider text-stone-800 transition-all border border-transparent hover:border-orange-200/50 cursor-pointer"
                      >
                        💪 Muscle Build <br /> (2600 cal)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* WEIGHT ACCORDION SCALE SLIDER */
                <div className="space-y-6 text-center py-4">
                  <div className="inline-block bg-blue-50 px-4 py-2.5 rounded-3xl border border-blue-100">
                    <div className="text-3xl font-black text-blue-600 font-mono">
                      {goalConfigValue} <span className="text-xs font-extrabold text-blue-950">kg</span>
                    </div>
                    <span className="text-[8px] font-black text-blue-700/60 uppercase tracking-widest">
                      Your Target Body Mass
                    </span>
                  </div>

                  {/* Weight slider scale */}
                  <div className="px-4">
                    <input
                      type="range"
                      min={40}
                      max={120}
                      step={1}
                      value={goalConfigValue}
                      onChange={(e) => setGoalConfigValue(parseInt(e.target.value))}
                      className="w-full accent-blue-500 h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-bold text-stone-400 font-mono mt-1">
                      <span>40 kg</span>
                      <span>80 kg</span>
                      <span>120 kg</span>
                    </div>
                  </div>

                  {/* Speed Dial discrete increments */}
                  <div className="flex justify-center gap-3 items-center">
                    <button
                      onClick={() => setGoalConfigValue(Math.max(40, goalConfigValue - 1))}
                      className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 text-sm font-black transition-all flex items-center justify-center cursor-pointer"
                    >
                      -1
                    </button>
                    <span className="text-[9px] font-black text-blue-950">Fine Adjustment</span>
                    <button
                      onClick={() => setGoalConfigValue(Math.min(120, goalConfigValue + 1))}
                      className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 text-sm font-black transition-all flex items-center justify-center cursor-pointer"
                    >
                      +1
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons footer */}
              <button
                onClick={() => {
                  if (activeGoalConfigPopup) {
                    setProfileData({
                      ...profileData,
                      goals: {
                        ...profileData.goals,
                        [activeGoalConfigPopup]: goalConfigValue,
                      },
                    });
                  }
                  setToastMessage(`Goal updated to ${goalConfigValue.toLocaleString()} successfully! ✨`);
                  setActiveGoalConfigPopup(null);
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[11px] py-3 rounded-2xl font-black uppercase tracking-wider shadow-md shadow-orange-500/10 hover:shadow-orange-500/15 cursor-pointer text-center"
              >
                Apply goal configuration 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Deletion Confirmation Modal */}
      <AnimatePresence>
        {mealPendingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-[2px] flex items-center justify-center p-6 font-sans"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl border border-stone-100 text-left space-y-4"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-900">Delete meal log?</h3>
                  <p className="text-[10px] text-stone-400 font-semibold mt-0.5">This action cannot be undone.</p>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200/50 rounded-2xl p-3.5 text-left">
                <div className="text-[11px] font-black text-stone-800 leading-snug truncate">
                  {mealPendingDelete.name}
                </div>
                <div className="text-[9px] font-bold text-stone-500 mt-1 flex items-center gap-1.5">
                  <span className="text-orange-600 font-extrabold">{mealPendingDelete.calories} kcal</span>
                  <span className="text-stone-300">•</span>
                  <span>{mealPendingDelete.time}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setMealPendingDelete(null)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-black uppercase tracking-wider py-3 rounded-xl cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDeleteMeal(mealPendingDelete);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-wider py-3 rounded-xl cursor-pointer select-none shadow-md shadow-red-500/10"
                >
                  Delete Log
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Calorie Log Modal */}
      <AnimatePresence>
        {isCameraFullScreen && (
          <ManualLogModal
            onClose={() => {
              setIsCameraFullScreen(false);
              setMealToEdit(null);
            }}
            onAddMeal={onAddMeal}
            mealToEdit={mealToEdit}
            onNavigateToSettings={() => setActiveTab("profile")}
            mealsState={mealsState}
            recipesState={recipes}
            initialAiMode={manualLogInitialAiMode}
            profileData={profileData}
          />
        )}
      </AnimatePresence>

      {/* Visual Share Modal Overlay */}
      <AnimatePresence>
        {shareItemPopup && shareItemPopup.type === "recipe" && (
          <RecipeShareModal
            item={shareItemPopup.item}
            profileData={profileData}
            onClose={() => setShareItemPopup(null)}
            triggerToast={showToast}
          />
        )}
        {shareItemPopup && shareItemPopup.type === "meal" && (
          <MealShareModal
            item={shareItemPopup.item}
            profileData={profileData}
            onClose={() => setShareItemPopup(null)}
            triggerToast={showToast}
          />
        )}
        {shareItemPopup && shareItemPopup.type === "day" && (
          <DayShareModal
            item={shareItemPopup.item}
            profileData={profileData}
            currentStreak={currentStreak}
            onClose={() => setShareItemPopup(null)}
            triggerToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Floating ChatGPT Action Widget */}
      <AnimatePresence>
        {(profileData.agent_config?.showGptWidget ?? true) && (activeTab === "home" || activeTab === "profile") && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              window.open("https://chatgpt.com/g/g-6a4f69a8803c8191b29bc51494b65b1c-fitai", "_blank");
            }}
            className="fixed bottom-28 right-6 w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-center shadow-[0_8px_25px_rgba(249,115,22,0.35)] z-40 border border-orange-400/30 cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Open FitAI Custom GPT"
          >
            <ChatGPTIcon className="w-5.5 h-5.5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      {activeTab !== "oauth-consent" && (
        <nav
          id="bottom-nav"
          className="fixed bottom-6 left-6 right-6 max-w-[calc(448px-3rem)] mx-auto z-50"
        >
          <div
            id="nav-container"
            className="backdrop-blur-2xl bg-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[24px] p-2 flex items-center justify-between gap-2 border border-white/50 w-full"
          >
            <NavButton
              id="nav-home"
              icon={Home}
              label="Home"
              active={activeTab === "home"}
              onClick={() => setActiveTab("home")}
            />

            <div className="flex-1 flex justify-center">
              {selectedDate === todayStr ? (
                <motion.button
                  id="fab-add-food"
                  onClick={handleLogMealClick}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[16px] shadow-[0_8px_30px_rgb(251,146,60,0.4)] flex items-center justify-center text-white relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_white_0%,_transparent_40%)] opacity-30" />
                  <Plus className="w-7 h-7 stroke-[3px]" />
                </motion.button>
              ) : (
                <div
                  id="fab-disabled"
                  className="w-full h-14 bg-stone-50 border border-stone-200/50 rounded-[16px] flex flex-col items-center justify-center text-stone-400 select-none opacity-60"
                  title="Logs are only editable on today's date"
                >
                  <Plus className="w-5 h-5 stroke-[2px]" />
                  <span className="text-[7px] font-black uppercase tracking-widest mt-0.5">Locked</span>
                </div>
              )}
            </div>

            <NavButton
              id="nav-profile"
              icon={User}
              label="Profile"
              active={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
            />
          </div>
        </nav>
      )}

      {/* Custom Premium Calendar Date Picker Modal */}
      <CalendarPickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(dateStr) => {
          setSelectedDate(dateStr);
          recenterDaysList(dateStr);
        }}
      />
    </div>
  );
}

function NavButton({
  id,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  id: string;
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 h-14 rounded-[16px] transition-all duration-300 relative",
        active
          ? "text-orange-600"
          : "text-orange-950/30 hover:text-orange-600/60",
      )}
    >
      {active && (
        <motion.div
          layoutId="active-nav-bg"
          className="absolute inset-0 bg-orange-100/50 rounded-[16px] -z-10"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <Icon
        className={cn("w-5 h-5", active ? "stroke-[2.5px]" : "stroke-[2px]")}
      />
      <span className="text-[8px] font-black uppercase tracking-[0.1em]">
        {label}
      </span>
    </button>
  );
}

interface WellnessJournalProps {
  selectedDate: string;
  dailyNotes: DailyWellness[];
  handleSaveDailyNote: (dateStr: string, text: string) => Promise<void>;
  todayStr: string;
}

function WellnessJournal({
  selectedDate,
  dailyNotes,
  handleSaveDailyNote,
  todayStr
}: WellnessJournalProps) {
  const activeNoteObj = dailyNotes.find(n => n.date === selectedDate);
  const activeNoteText = activeNoteObj ? activeNoteObj.notes : "";

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState(activeNoteText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Sync draft when database value or selected date changes
  useEffect(() => {
    setDraftNote(activeNoteText);
  }, [activeNoteText, selectedDate]);

  // Debounced auto-save effect
  const triggerAutoSave = (newVal: string) => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      handleSaveDailyNote(selectedDate, newVal);
    }, 1000);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraftNote(val);
    triggerAutoSave(val);
  };

  const handleBlur = () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    handleSaveDailyNote(selectedDate, draftNote);
    setIsEditingNote(false);
  };

  // Auto focus when entering edit mode
  useEffect(() => {
    if (isEditingNote && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to the end of the text
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditingNote]);

  const isReadOnly = selectedDate !== todayStr;

  return (
    <div className="flex flex-col gap-4 text-left w-full relative select-none">
      {/* Editorial Note Area */}
      <div className="w-full min-h-[80px] flex flex-col justify-start">
        {isEditingNote && !isReadOnly ? (
          <textarea
            ref={textareaRef}
            value={draftNote}
            onChange={handleTextareaChange}
            onBlur={handleBlur}
            placeholder="Tap here to write down how you felt, symptoms, water intake, or notes about today..."
            className="w-full bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-sm font-semibold text-stone-800 placeholder-stone-400 resize-none min-h-[90px] leading-relaxed transition-all"
          />
        ) : (
          <div
            onClick={() => {
              if (!isReadOnly) setIsEditingNote(true);
            }}
            className={cn(
              "text-sm leading-relaxed min-h-[90px] py-0.5 transition-colors duration-200 select-text whitespace-pre-line",
              !isReadOnly ? "cursor-text" : "cursor-default",
              activeNoteText
                ? "font-semibold text-stone-800"
                : "font-medium text-stone-400 italic"
            )}
          >
            {activeNoteText || (isReadOnly ? "No notes recorded for this date." : "Tap here to write down how you felt, symptoms, water intake, or notes about today...")}
          </div>
        )}
      </div>
    </div>
  );
}
