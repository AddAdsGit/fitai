/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Flame,
  Home,
  Plus,
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

// Import types & helpers
import type { Meal, Recipe } from "./types";
import { hasNoGeneratedImage, formatDateStr } from "./utils/helpers";


const INITIAL_MEALS: Meal[] = [
  {
    id: "1",
    name: "Morning Avocado Toast",
    time: "8:30 AM",
    type: "Breakfast",
    calories: 320,
    protein: 12,
    carbs: 35,
    fats: 18,
    image:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=60",
    date: new Date().toISOString().split('T')[0],
  },
  {
    id: "2",
    name: "Quinoa Power Bowl",
    time: "1:15 PM",
    type: "Lunch",
    calories: 450,
    protein: 22,
    carbs: 55,
    fats: 15,
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=60",
    date: new Date().toISOString().split('T')[0],
  },
];

const INITIAL_RECIPES: Recipe[] = [
  {
    id: "rec-1",
    name: "Avocado Salmon Protein Bowl",
    time: "15 mins",
    calories: 420,
    protein: 34,
    carbs: 12,
    fats: 28,
    tags: ["Keto", "Gluten Free"],
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
    ingredients: [
      "150g Grilled Salmon",
      "1/2 Ripe Avocado",
      "50g Salad Greens",
      "Lemon Vinaigrette",
    ],
    instructions:
      "Grill salmon. Slice avocado. Toss salad greens with vinaigrette. Combine in a premium bowl.",
  },
  {
    id: "rec-2",
    name: "Spinach Oat Pancakes",
    time: "12 mins",
    calories: 310,
    protein: 16,
    carbs: 45,
    fats: 8,
    tags: ["Gluten Free", "Vegetarian"],
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
    ingredients: [
      "1 cup Gluten Free Oats",
      "1 cup Unsweetened Almond Milk",
      "1 Egg",
      "Handful Spinach",
    ],
    instructions:
      "Blend ingredients until smooth. Bake on a hot non-stick skillet for 3 mins each side.",
  },
  {
    id: "rec-3",
    name: "Keto Spinach & Cheese Omelette",
    time: "10 mins",
    calories: 290,
    protein: 22,
    carbs: 3,
    fats: 22,
    tags: ["Keto", "Low Carb"],
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
    ingredients: [
      "3 Large Eggs",
      "1 cup Spinach",
      "30g Cheddar Cheese",
      "1 tbsp Butter",
    ],
    instructions:
      "Whisk eggs. Melt butter. Sauté spinach. Add eggs, cook through and fold over melted cheese.",
  },
  {
    id: "rec-4",
    name: "Mediterranean Chickpea Salad",
    time: "8 mins",
    calories: 340,
    protein: 12,
    carbs: 48,
    fats: 10,
    tags: ["Vegan", "Vegetarian", "Gluten Free"],
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
    ingredients: [
      "1 can Chickpeas",
      "Cucumber & Tomato dice",
      "Kalamata olives",
      "Olive oil & Lemon juice",
    ],
    instructions:
      "Rinse chickpeas. Combine with chopped vegetables. Drizzle olive oil and squeeze fresh lemon.",
  },
];

// Components and helper utilities extracted to ./components and ./utils

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("page") === "oauth-consent") {
      return "oauth-consent";
    }
    return "home";
  });
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

  type GoalPopupType = "dailyCalories" | "weightGoal" | null;
  const [activeGoalConfigPopup, setActiveGoalConfigPopup] =
    useState<GoalPopupType>(null);
  const [goalConfigValue, setGoalConfigValue] = useState(2000);

  const INITIAL_PROFILE_STATE = {
    name: "John Doe",
    imageUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=60",
    description:
      "Fitness enthusiast & tech geek. Building a sustainable, high-protein lifestyle. Always optimizing! ✨ Adding more text here to test out the expansion feature and see how it works when the description gets fairly long.",
    height: 183,
    weight: 80,
    dob: "1998-05-15",
    gender: "Male",
    memories: [
      "Prefers high protein diet, specifically chicken and eggs.",
      "Allergic to shellfish.",
      "Usually works out at 6 PM on weekdays.",
    ],
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
    username: "",
    notionApiKey: "",
    notionDatabaseId: "",
    googleSheetsWebhookUrl: "",
    telegramBotToken: "",
    telegramChatId: "",
    telegramRemindersEnabled: false,
    telegramReportsEnabled: false,
    telegramReminderTimes: ["09:00", "13:00", "20:00"],
    timezone: "UTC"
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
  const [isConfiguringDate, setIsConfiguringDate] = useState(false);
  const [configuringDateIndex, setConfiguringDateIndex] = useState<number | null>(null);
  const [tempFullDate, setTempFullDate] = useState(todayStr);

  const updateDayAtIndex = (index: number, newDateString: string) => {
    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const d = new Date(newDateString + "T00:00:00");
    const updatedDay = {
      day: daysOfWeek[d.getDay()],
      date: d.getDate(),
      fullDate: newDateString
    };

    setDaysList((prev) => {
      const copy = [...prev];
      copy[index] = updatedDay;
      return copy;
    });
    setSelectedDate(newDateString);
  };

  const [profileData, setProfileDataState] = useState(INITIAL_PROFILE_STATE);
  const [mealsState, setMealsState] = useState<Meal[]>([]);
  const [recipes, setRecipesState] = useState<Recipe[]>([]);

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [session, setSession] = useState<any>(null);
  const [showDeveloperBypass, setShowDeveloperBypass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);

  const [onboardName, setOnboardName] = useState("");
  const [onboardHeight, setOnboardHeight] = useState("170");
  const [onboardWeight, setOnboardWeight] = useState("70");
  const [onboardDob, setOnboardDob] = useState("1998-05-15");
  const [onboardGender, setOnboardGender] = useState("Male");
  const [onboardBio, setOnboardBio] = useState("");
  const [onboardAvatar, setOnboardAvatar] = useState("");
  const [isOnboardLoading, setIsOnboardLoading] = useState(false);

  const handleUserAuthenticated = async (user: any) => {
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
      } else {
        const newKey = "fit_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const username = user.email ? user.email.split('@')[0] : "user_" + Math.random().toString(36).substring(7);
        
        const googleName = user.user_metadata?.full_name || username;
        const googleAvatar = user.user_metadata?.avatar_url || null;

        const newProfile = {
          id: user.id,
          username,
          display_name: googleName,
          image_url: googleAvatar,
          height: 175,
          weight: 70,
          dob: "1998-05-15",
          gender: "Male",
          memories: [],
          preferences: [],
          daily_calories_goal: 2000,
          weight_goal: 70.0,
          protein_goal: 150,
          carbs_goal: 150,
          fats_goal: 60,
          fiber_goal: 30,
          api_key: newKey
        };

        const { error: createErr } = await supabase
          .from('profiles')
          .insert(newProfile);

        if (createErr) {
          console.error("Error creating authenticated profile:", createErr);
        } else {
          setActiveProfileId(user.id);
          localStorage.setItem("fitai_active_profile_id", user.id);
          showToast(`✨ Profile created for @${username}!`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: "https://fitpush.vercel.app"
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

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        showToast(`❌ Login failed: ${error.message}`);
      } else {
        showToast("✨ Signed in successfully!");
      }
    } catch (err: any) {
      showToast(`❌ Error signing in: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        showToast(`❌ Sign up failed: ${error.message}`);
      } else {
        if (data.session === null) {
          showToast("✉️ Check your email to confirm registration!");
        } else {
          showToast("✨ Account created successfully!");
        }
      }
    } catch (err: any) {
      showToast(`❌ Error signing up: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfileId) return;

    setIsOnboardLoading(true);
    try {
      const updatedPrefs = [...(profileData.preferences || []), "onboarded"];
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: onboardName.trim(),
          image_url: onboardAvatar || null,
          height: parseInt(onboardHeight) || 170,
          weight: parseFloat(onboardWeight) || 70,
          dob: onboardDob,
          gender: onboardGender,
          description: onboardBio.trim(),
          preferences: updatedPrefs
        })
        .eq('id', activeProfileId);

      if (error) {
        showToast("❌ Failed to save onboarding settings");
        console.error(error);
      } else {
        setProfileDataState((prev: any) => ({
          ...prev,
          name: onboardName.trim(),
          imageUrl: onboardAvatar || null,
          height: parseInt(onboardHeight) || 170,
          weight: parseFloat(onboardWeight) || 70,
          dob: onboardDob,
          gender: onboardGender,
          description: onboardBio.trim(),
          preferences: updatedPrefs
        }));
        showToast("✨ Welcome to FitAI! Setup complete.");
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Unexpected onboarding error");
    } finally {
      setIsOnboardLoading(false);
    }
  };

  const handleLoginSubmit = async () => {
    const username = loginUsername.toLowerCase().trim();
    if (!username) return;
    
    try {
      const { data: existing, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.error("Error looking up profile:", error);
        showToast("❌ Database connection error");
        return;
      }

      if (existing) {
        setActiveProfileId(existing.id);
        localStorage.setItem("fitai_active_profile_id", existing.id);
        showToast(`✨ Welcome back, @${username}!`);
      } else {
        const newKey = "fit_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const newProfile = {
          username,
          display_name: username.charAt(0).toUpperCase() + username.slice(1),
          height: 175,
          weight: 70,
          dob: "1998-05-15",
          gender: "Male",
          memories: [],
          preferences: [],
          daily_calories_goal: 2000,
          weight_goal: 70.0,
          protein_goal: 150,
          carbs_goal: 150,
          fats_goal: 60,
          fiber_goal: 30,
          api_key: newKey
        };

        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select('id')
          .single();

        if (createErr) {
          console.error("Error creating new profile:", createErr);
          showToast("❌ Failed to create profile");
        } else if (created) {
          setActiveProfileId(created.id);
          localStorage.setItem("fitai_active_profile_id", created.id);
          showToast(`✨ Created isolated profile for @${username}!`);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Unexpected error occurred");
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
            memories: resolvedData.memories,
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
            timezone: resolvedData.timezone
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
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        handleUserAuthenticated(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        handleUserAuthenticated(session.user);
      } else {
        setActiveProfileId(null);
        localStorage.removeItem("fitai_active_profile_id");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const initSupabase = async () => {
      const savedProfileId = localStorage.getItem("fitai_active_profile_id");
      if (savedProfileId) {
        const { data: existing, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', savedProfileId)
          .maybeSingle();

        if (!error && existing) {
          setActiveProfileId(existing.id);
          return;
        }
      }

      setActiveProfileId(null);
    };

    initSupabase();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !activeProfileId) return;

    const loadUserData = async () => {
      setIsDataLoading(true);
      try {
        const [profileRes, recipesRes, mealsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', activeProfileId).single(),
          supabase.from('recipes').select('*').eq('profile_id', activeProfileId).order('name', { ascending: true }),
          supabase.from('meals').select('*').eq('profile_id', activeProfileId).order('created_at', { ascending: false })
        ]);

        if (profileRes.error) {
          console.error("Error loading profile details:", profileRes.error);
        } else if (profileRes.data) {
          const profile = profileRes.data;

          // Auto-sync local timezone to preferences
          const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const tzPref = `tz_${localTz}`;
          let currentPrefs = profile.preferences || [];
          if (!currentPrefs.some((p: string) => p.startsWith("tz_"))) {
            const updatedPrefs = [...currentPrefs.filter((p: string) => !p.startsWith("tz_")), tzPref];
            supabase.from('profiles').update({ preferences: updatedPrefs }).eq('id', profile.id).then();
            profile.preferences = updatedPrefs;
          }

          setProfileDataState({
            name: profile.display_name,
            username: profile.username || "",
            imageUrl: profile.image_url,
            description: profile.description,
            height: profile.height,
            weight: profile.weight,
            dob: profile.dob,
            gender: profile.gender,
            memories: profile.memories || [],
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

          setOnboardName(profile.display_name || "");
          setOnboardAvatar(profile.image_url || "");
          setOnboardHeight(String(profile.height || 170));
          setOnboardWeight(String(profile.weight || 70));
          setOnboardBio(profile.description || "");
          setOnboardDob(profile.dob || "1998-05-15");
          setOnboardGender(profile.gender || "Male");
        }

        if (recipesRes.error) {
          console.error("Error loading recipes:", recipesRes.error);
        } else {
          const mappedRecipes: Recipe[] = (recipesRes.data || []).map(r => ({
            id: r.id,
            name: r.name,
            time: r.time,
            calories: r.calories,
            protein: r.protein,
            carbs: r.carbs,
            fats: r.fats,
            fiber: r.fiber || 0,
            tags: r.tags || [],
            image: r.image,
            ingredients: r.ingredients || [],
            instructions: r.instructions,
            micros: r.micros || []
          }));
          setRecipesState(mappedRecipes);
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
            date: m.date
          }));
          setMealsState(mappedMeals);
        }
      } catch (err) {
        console.error("Unexpected error loading user data:", err);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadUserData();
  }, [activeProfileId]);

  // Real-time subscription: auto-refresh meals when ChatGPT logs a new meal
  useEffect(() => {
    if (!isSupabaseConfigured || !activeProfileId) return;

    const channel = supabase
      .channel(`meals-realtime-${activeProfileId}`)
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
              date: m.date,
            }));
            setMealsState(mappedMeals);
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

  const handleGenerateAiRecipe = async () => {
    // 1. Check if Gemini key is available
    const key = localStorage.getItem("fitai_gemini_api_key") || 
                (import.meta as any).env.VITE_GEMINI_API_KEY || "";
    if (!key) {
      alert("Please configure your Gemini API Key in settings first!");
      return;
    }

    setIsGeneratingRecipe(true);
    try {
      // 2. Fetch logged progress for today
      const today = new Date().toISOString().split("T")[0];
      const todayMeals = mealsState.filter(m => m.date === today);
      const mealsSummary = todayMeals.map(m => `- ${m.name} (${m.calories} kcal, ${m.protein}g Protein, ${m.carbs}g Carbs, ${m.fats}g Fats)`).join("\n");

      // 3. Calculate remaining macros based on goals
      const totalCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
      const totalProtein = todayMeals.reduce((sum, m) => sum + m.protein, 0);
      const totalCarbs = todayMeals.reduce((sum, m) => sum + m.carbs, 0);
      const totalFats = todayMeals.reduce((sum, m) => sum + m.fats, 0);

      const targetCalories = profileData.goals?.dailyCalories || 2000;
      const targetProtein = profileData.macros?.protein || 150;
      const targetCarbs = profileData.macros?.carbs || 50;
      const targetFats = profileData.macros?.fats || 80;

      const remainingCalories = Math.max(0, targetCalories - totalCalories);
      const remainingProtein = Math.max(0, targetProtein - totalProtein);
      const remainingCarbs = Math.max(0, targetCarbs - totalCarbs);
      const remainingFats = Math.max(0, targetFats - totalFats);

      const prompt = `You are a professional dietitian. Generate a custom meal recipe based on the user's consumption today and remaining macro goals.
Meals already logged today:
${mealsSummary || "None logged yet"}

Remaining macro goals:
- Calories: ${remainingCalories} kcal
- Protein: ${remainingProtein}g
- Carbs: ${remainingCarbs}g
- Fats: ${remainingFats}g

User profile details:
- Height: ${profileData.height} cm
- Weight: ${profileData.weight} kg
- Gender: ${profileData.gender}
- Preferences: ${(profileData.preferences || []).join(", ") || "None"}
- Health notes: ${(profileData.memories || []).join(", ") || "None"}

Generate a single custom meal recipe that helps complete their macro goals for today. It must align with user preferences and allergies.
Return a JSON object containing the recipe details:
{
  "name": "Creative Recipe Title",
  "time": "Prep time (e.g. '12 mins')",
  "calories": ${remainingCalories > 0 ? remainingCalories : 500},
  "protein": ${remainingProtein > 0 ? remainingProtein : 30},
  "carbs": ${remainingCarbs > 0 ? remainingCarbs : 40},
  "fats": ${remainingFats > 0 ? remainingFats : 15},
  "tags": ["AI Recommended"],
  "ingredients": ["exact ingredient 1 with quantity", "ingredient 2", ...],
  "instructions": "Step-by-step description of how to prepare the recipe..."
}
Do not include any markdown styling, backticks, or "json" prefix. Just return the raw JSON string itself.`;

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
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
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
      alert(`AI Recipe Generation Error: ${err.message || "Could not generate recipe"}`);
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
  }) => {
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    const formattedTime = newMealOrRecipe.time || new Date().toLocaleTimeString("en-US", timeOptions);

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
              image: newMealOrRecipe.image,
              type: newMealOrRecipe.type,
              time: formattedTime,
              date: selectedDate
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
        image: newMealOrRecipe.image || m.image
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
            image: newMealOrRecipe.image,
            type: newMealOrRecipe.type,
            time: formattedTime,
            date: selectedDate
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
      image:
        newMealOrRecipe.image ||
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
      date: selectedDate,
    };

    setMealsState((prev) => [meal, ...prev]);
    showToast(`🍽️ Logged: "${newMealOrRecipe.name}" (+${newMealOrRecipe.calories} kcal)`);
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

  if (isSupabaseConfigured && !activeProfileId) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-8 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
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

        <div className="my-auto space-y-8 py-12">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-200 flex items-center justify-center rotate-6">
              <Sparkles className="text-white w-8 h-8 -rotate-6 fill-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-center mt-2">
              Fit<span className="text-orange-500">AI</span>
            </h1>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest text-center">
              Personalized Nutrition Engine
            </p>
          </div>

          {/* Welcome Text */}
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-black text-stone-850">Welcome to FitAI</h2>
            <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
              Your AI nutrition engine.
            </p>
          </div>

          {/* Authentication Actions */}
          <div className="space-y-5">
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

            {/* Email & Password Authentication Form */}
            <form onSubmit={authMode === "login" ? handleEmailSignIn : handleEmailSignUp} className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all animate-none"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all animate-none"
              />
              
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/40 disabled:opacity-60 disabled:pointer-events-none cursor-pointer mt-1"
              >
                {authLoading ? "Authenticating..." : authMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            {/* Mode Switch Link */}
            <div className="text-center">
              <button
                onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                className="text-[9px] text-orange-500 hover:text-orange-600 font-bold transition-colors cursor-pointer bg-transparent border-0"
              >
                {authMode === "login" ? "Create an account" : "Sign in to your account"}
              </button>
            </div>

            {/* Minimal Developer Mode Bypass */}
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
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[8px] text-stone-300 font-bold tracking-widest uppercase">
          © 2026 FitAI. All rights reserved.
        </div>
      </div>
    );
  }

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

  const isOnboarded = profileData.preferences?.includes("onboarded");

  if (isSupabaseConfigured && activeProfileId && !isOnboarded) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-8 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
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

        <div className="my-auto space-y-6 py-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 shadow-xl shadow-orange-200 flex items-center justify-center rotate-6">
              <Sparkles className="text-white w-6 h-6 -rotate-6 fill-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-center mt-2">
              Setup Your Profile
            </h1>
            <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest text-center">
              Let's customize your AI nutrition targets.
            </p>
          </div>

          <form onSubmit={handleOnboardSubmit} className="space-y-4">
            {/* Profile Avatar Selection (Canvas Resized Upload) */}
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-stone-200 shadow-inner flex items-center justify-center bg-stone-100">
                  {onboardAvatar ? (
                    <img src={onboardAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-stone-300 font-bold text-lg uppercase">{onboardName?.slice(0, 2) || "AI"}</span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-stone-900 text-white rounded-full border-2 border-white flex items-center justify-center cursor-pointer shadow-md hover:bg-stone-850 active:scale-95 transition-all">
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
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
                            setOnboardAvatar(dataUrl);
                          }
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">
                Choose profile photo
              </span>
            </div>

            {/* Display Name */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Full Name</label>
              <input
                type="text"
                placeholder="Full Name (e.g. Alex Doe)"
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
              />
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Height (cm)</label>
                <input
                  type="number"
                  placeholder="Height (cm)"
                  value={onboardHeight}
                  onChange={(e) => setOnboardHeight(e.target.value)}
                  required
                  className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Weight (kg)"
                  value={onboardWeight}
                  onChange={(e) => setOnboardWeight(e.target.value)}
                  required
                  className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Date of Birth</label>
              <input
                type="date"
                value={onboardDob}
                onChange={(e) => setOnboardDob(e.target.value)}
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
              />
            </div>

            {/* Gender Selector */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Gender</label>
              <select
                value={onboardGender}
                onChange={(e) => setOnboardGender(e.target.value)}
                required
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 focus:outline-none focus:border-orange-500 shadow-sm transition-all cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Bio Description */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">
                About Yourself
              </label>
              <textarea
                placeholder="Describe your lifestyle, fitness goals, or allergies... (AI cannot edit this)"
                value={onboardBio}
                onChange={(e) => setOnboardBio(e.target.value)}
                rows={3}
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all resize-none animate-none"
              />
            </div>

            <button
              type="submit"
              disabled={isOnboardLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
            >
              {isOnboardLoading ? "Saving Setup..." : "Complete Setup"}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-[8px] text-stone-300 font-bold tracking-widest uppercase py-4">
          © 2026 FitAI. All rights reserved.
        </div>
      </div>
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
          <div className="w-9 h-9 rounded-xl bg-orange-500 shadow-lg shadow-orange-200 flex items-center justify-center rotate-3">
            <Flame className="text-white w-5 h-5 -rotate-3" />
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
            className="w-10 h-10 rounded-full border-2 border-orange-500 p-0.5 overflow-hidden shadow-md cursor-pointer hover:scale-105 transition-transform"
          >
            <img
              src={profileData.imageUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=60"}
              alt="User"
              className="w-full h-full object-cover rounded-full pointer-events-none"
            />
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
            <div id="calendar-strip" className="px-6 mt-8 relative z-10">
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
                        setConfiguringDateIndex(idx);
                        setTempFullDate(day.fullDate);
                        setIsConfiguringDate(true);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[58px] py-3.5 rounded-2xl transition-all duration-300 shadow-sm grow cursor-pointer",
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
                    value: 0, // TODO: track real fiber
                    max: profileData.macros.fiber,
                    color: "#6B7280",
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

            {/* Quick Log Action Row (Separated Containers) */}
            <div className="px-6 mt-6 relative z-10 text-left">
              <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-1.5 px-1">
                Quick Log Item
              </span>
              <div className="flex gap-2.5 items-stretch w-full">
                
                {/* Container 1: Unified Quick Calorie Logger Form */}
                <div className="w-full h-12 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 shadow-3xs flex gap-2 items-center p-1 px-2.5 min-w-0">
                  {/* description input (first) */}
                  <input
                    type="text"
                    placeholder="Add item..."
                    value={customCalName}
                    onChange={(e) => setCustomCalName(e.target.value)}
                    className="flex-1 h-full bg-transparent text-xs font-bold text-stone-900 placeholder-stone-400 focus:outline-none min-w-0"
                  />

                  {/* kcal input (second) */}
                  <input
                    type="number"
                    placeholder="kcal"
                    value={customCalVal}
                    onChange={(e) => setCustomCalVal(e.target.value)}
                    className="w-20 h-full bg-stone-50/50 border border-stone-200/50 rounded-xl text-center text-xs font-bold text-stone-900 placeholder-stone-400 focus:outline-none"
                  />
                  
                  {/* Submit button (inside container) */}
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
                        // Manual entry (has calories specified explicitly)
                        onAddMeal({
                          name: name || "Quick Cal Log",
                          calories: kcalVal,
                          protein: 0,
                          carbs: 0,
                          fats: 0,
                          type: "Quick Cal",
                        });
                        showToast(`Logged "${name || "Quick Cal Log"}" of ${kcalVal} kcal! ⚡`);
                        setCustomCalName("");
                        setCustomCalVal("");
                      } else {
                        // No calories specified, parse using local calculateNutritionFromIngredients
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
                        
                        showToast(`🤖 AI Estimated: ${nutrition.calories} kcal, ${nutrition.protein}g Protein`);
                        setCustomCalName("");
                        setCustomCalVal("");
                      }
                    }}
                    className="w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Log Meal"
                  >
                    <Check className="w-4.5 h-4.5" />
                  </button>
                </div>

              </div>
            </div>

            {/* Today's Consumption Section */}
            <section className="px-6 mt-16 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black tracking-tight text-orange-950">
                  {selectedDate === todayStr ? "Today's Consumption" : "Logged Consumption"}
                </h3>
                {selectedDate === todayStr && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsCameraFullScreen(true)}
                      className="text-orange-600 font-black uppercase text-[10px] tracking-[0.15em] flex items-center gap-1 group bg-orange-100/50 px-3.5 py-1.5 rounded-full border border-orange-200/30 hover:bg-orange-200/50 transition-colors cursor-pointer select-none active:scale-95"
                    >
                      <span>Add</span>
                      <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {activeMeals.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm">
                    <p className="text-sm font-bold text-gray-500">No logs for this date yet</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium leading-relaxed">
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

                    const hasImage = !hasNoGeneratedImage(meal.image);

                    if (!hasImage) {
                      return (
                        <motion.div
                          key={meal.id}
                          whileHover={{ y: -4, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleEditMeal(meal)}
                          className="relative rounded-[32px] overflow-hidden aspect-[4/3] sm:aspect-video shadow-xl shadow-stone-200/10 group cursor-pointer border border-stone-200/40 bg-gradient-to-br from-[#fffbfa] to-[#f9f6f3]"
                        >
                          {/* Centered Watermark Utensils Badge */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                            <Utensils className="w-40 h-40 text-stone-900" />
                          </div>

                          {/* Top Bar: Time, Calories, and Delete */}
                          <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-20">
                            <div className="bg-stone-100/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200/40">
                              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-stone-600">
                                {meal.time}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-full font-black flex items-center gap-1 shadow-md">
                                <span className="text-sm">{meal.calories}</span>
                                <span className="text-[9px] uppercase tracking-wider opacity-90">
                                  Kcal
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMeal(meal);
                                }}
                                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-red-50 hover:text-red-500 border border-stone-200 flex items-center justify-center text-stone-500 cursor-pointer transition-colors"
                                title="Delete log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Bottom Content: Name and Macros */}
                          <div className="absolute bottom-5 left-5 right-5 text-left">
                            <h4 className="text-stone-900 text-xl sm:text-2xl font-black mb-4 leading-tight tracking-tight">
                              {meal.name}
                            </h4>

                            <div className="flex gap-4">
                              {[
                                { l: "Protein", v: meal.protein },
                                { l: "Carbs", v: meal.carbs },
                                { l: "Fats", v: meal.fats },
                              ].map((m) => (
                                <div key={m.l} className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-stone-300 shadow-3xs" />
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                                      {m.l}
                                    </span>
                                    <span className="text-sm font-bold text-stone-850">
                                      {m.v}g
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
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
                        <img
                          src={meal.image}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                          alt={meal.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

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
                                handleDeleteMeal(meal);
                              }}
                              className="w-8 h-8 rounded-full backdrop-blur-md bg-black/30 hover:bg-red-500/80 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Content: Name and Macros */}
                        <div className="absolute bottom-5 left-5 right-5">
                          <h4 className="text-white text-xl sm:text-2xl font-black mb-4 leading-tight tracking-tight shadow-sm">
                            {meal.name}
                          </h4>

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
            {/* Minimal Favorite Recipes Section (Below Today's Consumption) */}
            {recipes.length > 0 && (
              <div className="px-6 mt-8 mb-20 relative z-10 space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                    Quick Log Favorites
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {recipes.slice(0, 6).map((rec) => (
                    <motion.button
                      key={rec.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onAddMeal({
                          name: rec.name,
                          calories: rec.calories,
                          protein: rec.protein,
                          carbs: rec.carbs,
                          fats: rec.fats,
                          image: rec.image,
                          type: "Favorite",
                        });
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 shadow-3xs transition-all select-none cursor-pointer text-left w-full"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-3xs border border-white">
                        <img
                          src={rec.image}
                          className="w-full h-full object-cover"
                          alt={rec.name}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="font-sans flex-1 min-w-0">
                        <div className="text-[10px] font-black text-stone-850 truncate leading-tight">
                          {rec.name}
                        </div>
                        <div className="text-[9px] font-black text-orange-600 mt-0.5">
                          {rec.calories} kcal
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
        {activeTab === "settings" && (
          <SettingsView
            key="settings-tab"
            profileData={profileData}
            setProfileData={setProfileData}
            triggerToast={(msg) => setToastMessage(msg)}
            session={session}
            onLogout={async () => {
              await supabase.auth.signOut();
              localStorage.removeItem("fitai_active_profile_id");
              setActiveProfileId(null);
              setMealsState([]);
              setRecipesState([]);
              setProfileDataState(INITIAL_PROFILE_STATE);
              setToastMessage("🔒 Logged out successfully");
            }}
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
                    {isEditingRecipe ? "Editing Mode" : "Recipe Dossier"}
                  </span>
                  <button
                    onClick={() => setSelectedRecipePopup(null)}
                    className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                  <p className="text-[10px] text-white/70 font-bold font-sans mt-0.5 flex items-center gap-1">
                    ⏱️ Prep time: {isEditingRecipe ? editPopupTime : selectedRecipePopup.time}
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
                  <div className="space-y-6 text-left">
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
                            {isAiCalculating ? "Extracting..." : "Auto-Fill with AI 🤖"}
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
                          tags: editPopupTags.length > 0 ? editPopupTags : ["Custom"],
                          image: editPopupImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
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

      {/* Date Configuration Popup (Precise Date Tracker) */}
      <AnimatePresence>
        {isConfiguringDate && configuringDateIndex !== null && (() => {
          const [yStr, mStr, dStr] = (tempFullDate || "2026-07-08").split("-");
          const selYear = parseInt(yStr) || 2026;
          const selMonth = parseInt(mStr) || 7;
          const selDay = parseInt(dStr) || 8;

          const daysInMonth = new Date(selYear, selMonth, 0).getDate();
          const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
          const monthsArray = [
            { val: 1, label: "Jan" },
            { val: 2, label: "Feb" },
            { val: 3, label: "Mar" },
            { val: 4, label: "Apr" },
            { val: 5, label: "May" },
            { val: 6, label: "Jun" },
            { val: 7, label: "Jul" },
            { val: 8, label: "Aug" },
            { val: 9, label: "Sep" },
            { val: 10, label: "Oct" },
            { val: 11, label: "Nov" },
            { val: 12, label: "Dec" },
          ];
          const yearsArray = Array.from({ length: 11 }, (_, i) => 2020 + i);

          const changeDatePart = (newY: number, newM: number, newD: number) => {
            const maxDays = new Date(newY, newM, 0).getDate();
            const safeD = newD > maxDays ? maxDays : newD;
            const formattedM = String(newM).padStart(2, "0");
            const formattedD = String(safeD).padStart(2, "0");
            const updatedFullDate = `${newY}-${formattedM}-${formattedD}`;
            setTempFullDate(updatedFullDate);
            updateDayAtIndex(configuringDateIndex, updatedFullDate);
          };

          const dayMeals = mealsState.filter((m) => m.date === tempFullDate);
          const logFound = dayMeals.length > 0;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/65 backdrop-blur-md z-[200] flex items-end justify-center font-sans"
            >
              {/* Backdrop click to close */}
              <div
                className="absolute inset-0"
                onClick={() => setIsConfiguringDate(false)}
              />

              {/* Bottom Sheet Modal */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="bg-white rounded-t-[36px] w-full max-w-md overflow-hidden flex flex-col shadow-2xl p-6 space-y-6 relative z-10"
              >
                {/* Header block */}
                <div className="flex justify-between items-center pb-2 border-b border-black/[0.04]">
                  <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-orange-500" />
                    Configure Date
                  </h4>
                  <button
                    onClick={() => setIsConfiguringDate(false)}
                    className="w-8 h-8 rounded-full bg-stone-100/80 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Input: Day, Month, Year simple picker */}
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Day Selector */}
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1.5">
                        Day
                      </label>
                      <select
                        value={selDay}
                        onChange={(e) => changeDatePart(selYear, selMonth, parseInt(e.target.value))}
                        className="w-full bg-stone-50 border border-stone-200/60 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-orange-400 transition-all font-sans cursor-pointer"
                      >
                        {daysArray.map((dayNum) => (
                          <option key={dayNum} value={dayNum}>
                            {dayNum}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Month Selector */}
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1.5">
                        Month
                      </label>
                      <select
                        value={selMonth}
                        onChange={(e) => changeDatePart(selYear, parseInt(e.target.value), selDay)}
                        className="w-full bg-stone-50 border border-stone-200/60 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-orange-400 transition-all font-sans cursor-pointer"
                      >
                        {monthsArray.map((mObj) => (
                          <option key={mObj.val} value={mObj.val}>
                            {mObj.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year Selector */}
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1.5">
                        Year
                      </label>
                      <select
                        value={selYear}
                        onChange={(e) => changeDatePart(parseInt(e.target.value), selMonth, selDay)}
                        className="w-full bg-stone-50 border border-stone-200/60 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-orange-400 transition-all font-sans cursor-pointer"
                      >
                        {yearsArray.map((yrNum) => (
                          <option key={yrNum} value={yrNum}>
                            {yrNum}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Logged Portion Status Tracker */}
                  {logFound ? (
                    <div className="bg-emerald-50/70 border border-emerald-100/50 p-4 rounded-2xl text-left space-y-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-800 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Log found
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                        <span>{dayMeals.length} meals logged</span>
                        <span className="text-emerald-700 font-extrabold">
                          {dayMeals.reduce((sum, m) => sum + m.calories, 0)} kcal
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-stone-50 border border-stone-200/50 p-4 rounded-2xl text-left space-y-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-stone-400 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                        No log found
                      </div>
                      <p className="text-[10px] text-stone-400 font-medium">
                        0 calories • No meals tracked yet.
                      </p>
                    </div>
                  )}
                </div>

                {/* Done Button */}
                <div className="pt-2">
                  <button
                    onClick={() => setIsConfiguringDate(false)}
                    className="w-full bg-[#1a1a1a] hover:bg-[#2c2c2c] text-white text-[10px] py-3 rounded-xl font-black uppercase tracking-widest text-center shadow-md transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
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
          />
        )}
      </AnimatePresence>

      {/* Floating ChatGPT Action Widget */}
      <AnimatePresence>
        {profileData.preferences?.includes("show_gpt_widget") && (activeTab === "home" || activeTab === "profile") && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              window.open("https://chatgpt.com/g/g-6a4f69a8803c8191b29bc51494b65b1c-fitai", "_blank");
            }}
            className="fixed bottom-28 right-6 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-[0_8px_25px_rgba(16,185,129,0.35)] z-40 border border-emerald-400/30 cursor-pointer"
            title="Open FitAI Custom GPT"
          >
            <Bot className="w-5 h-5 text-white" />
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
                  onClick={() => {
                    const gptUrl = localStorage.getItem("fitai_custom_gpt_url");
                    if (gptUrl && gptUrl.trim()) {
                      window.open(gptUrl.trim(), "_blank");
                    } else {
                      setIsCameraFullScreen(true);
                    }
                  }}
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
