import React, { useState, useMemo } from "react";
import { ChevronRight, ArrowLeft, Bot, Sparkles, Database, Check, Bell, Phone, MessageSquare, Mail, Plus, Camera, Edit2, Search, X, Trash2, RotateCcw, Sliders, Heart, Mic, ShieldCheck, AlertTriangle, FileText, Activity, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { ProUpgradeModal } from "./ProUpgradeModal";
import { ChatGPTIcon } from "./ChatGPTIcon";
import { performHealthSync, requestHealthPermissions, clearHealthSyncLogs, type SyncLogEntry } from "../services/healthSyncService";
import { PrivacyPolicyModal } from "./PrivacyPolicyModal";
import { DEFAULT_CUSTOM_GPT_URL, TELEGRAM_BOT_URL } from "../constants/app";

const getOpenApiYaml = (edgeFunctionUrl: string) => `openapi: 3.1.0
info:
  title: FitAI GPT Sync Action API
  description: |
    API for synchronizing user profiles, food/nutrition logs, and recipes with the FitAI dashboard.
    
    CRITICAL BEHAVIORAL RULES FOR THE CUSTOM GPT:
    1. Recipe Modifications & Extras: If the user logs a meal that modifies a stored recipe (e.g., "burrito with extra chicken and rice"), the GPT must:
       a. Call GET /recipes to list recipes, matching the base item ("burrito").
       b. Retrieve the macros for the base recipe.
       c. Estimate the nutritional values of the extras specified (e.g., extra chicken and rice).
       d. Sum the base macros and the extras macros to compute the new total.
       e. Log the combined meal via POST /meals using the combined macros and appending the extra description to the name (e.g. "Burrito with extra chicken and rice").
    2. Editing Logged Meals by Instruction: If the user wants to adjust a logged meal (e.g., "actually, make that breakfast 2 eggs instead of 1"), the GPT must:
       a. Call GET /meals?date=YYYY-MM-DD to find the target meal.
       b. Estimate the updated calorie/macro totals based on the change request.
       c. Call PATCH /meals?id=<id> with the updated calorie/macro numbers.
    3. Deleting Logged Meals: If the user requests to delete or remove a logged item, the GPT must call GET /meals to find the ID and invoke DELETE /meals?id=<id>.
    4. Health Conditions, Injuries & AI Agent Memory: Whenever the user mentions a health condition, injury, food allergy, or preference during conversation (e.g. 'I have Thyroid', 'I injured my knee'), the GPT MUST call PATCH /profile and include the note under knowledge_health or knowledge_notes so it is permanently remembered in the user's AI Agent Memory!
  version: 1.0.0
servers:
  - url: ${edgeFunctionUrl}
    description: FitAI Webhook Action API (Proxied via fitpush.vercel.app)
paths:
  /profile:
    get:
      summary: Retrieve the user's profile details
      description: Fetches bio, preferences, weight/height info, calorie goal, and tracked nutrient targets.
      operationId: getProfile
      responses:
        '200':
          description: Profile retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  profile:
                    type: object
                    properties:
                      id:
                        type: string
                      username:
                        type: string
                      display_name:
                        type: string
                      description:
                        type: string
                      height:
                        type: integer
                      weight:
                        type: number
                      preferences:
                        type: array
                        items:
                          type: string
                      tracking_tags:
                        type: array
                        description: User's custom and default tracking tags
                        items:
                          type: object
                          properties:
                            id:
                              type: string
                            name:
                              type: string
                            emoji:
                              type: string
                            color:
                              type: string
                            description:
                              type: string
                            enabled:
                              type: boolean
                            isDefault:
                              type: boolean
                      daily_calories_goal:
                        type: integer
                      weight_goal:
                        type: number
                      protein_goal:
                        type: integer
                      tracked_nutrients:
                        type: array
                        description: Nutrients the user tracks, with per-nutrient daily targets (e.g. carbs, fats, fiber, plus custom ones).
                        items:
                          type: object
                          properties:
                            id:
                              type: string
                            name:
                              type: string
                            target:
                              type: number
                            unit:
                              type: string
                            enabled:
                              type: boolean
                      agent_memory:
                        type: array
                        description: Conversation preferences like tone, response style (e.g., "be brief")
                        items:
                          type: string
                      telegram_reminders_enabled:
                        type: boolean
                        description: Whether Telegram reminders are enabled
                      telegram_reminder_times:
                        type: array
                        description: Scheduled Telegram reminder times
                        items:
                          type: string
                      telegram_reports_enabled:
                        type: boolean
                        description: Whether daily Telegram reports are enabled
                      dob:
                        type: string
                        description: Date of birth
                      gender:
                        type: string
                        description: Gender
                      timezone:
                        type: string
                        description: User's timezone (Olson string)
    post:
      x-openai-isConsequential: false
      summary: Update user profile
      description: Modify user specifications such as display name, body metrics, goals, or preferences.
      operationId: updateProfile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                display_name:
                  type: string
                height:
                  type: integer
                weight:
                  type: number
                description:
                  type: string
                gender:
                  type: string
                daily_calories_goal:
                  type: integer
                weight_goal:
                  type: number
                preferences:
                  type: array
                  items:
                    type: string
                protein_goal:
                  type: integer
                  description: Daily protein target in grams
                timezone:
                  type: string
                  description: User's timezone as Olson string (e.g., "America/New_York", "Asia/Kolkata")
                knowledge_preferences:
                  type: array
                  description: User's food likes, dislikes, desired macros, and meal-time preferences.
                  items:
                    type: string
                knowledge_health:
                  type: array
                  description: Allergies, intolerances, medical symptoms, and health conditions.
                  items:
                    type: string
                knowledge_notes:
                  type: array
                  description: Daily schedules, water goals, habits, and miscellaneous notes.
                  items:
                    type: string
                knowledge_patterns:
                  type: array
                  description: Detected correlations between food and wellbeing (e.g., "Biryani causes bloating").
                  items:
                    type: string
                agent_memory:
                  type: array
                  description: Tone, response length, and other conversation preferences (e.g., "be brief", "use metric").
                  items:
                    type: string
                telegram_reminders_enabled:
                  type: boolean
                  description: Enable or disable Telegram meal-logging reminders.
                telegram_reminder_times:
                  type: array
                  description: Times to send Telegram reminders (e.g., ["09:00", "20:00"]).
                  items:
                    type: string
                telegram_reports_enabled:
                  type: boolean
                  description: Enable or disable daily Telegram summary reports.
      responses:
        '200':
          description: Profile updated successfully
  /meals:
    get:
      summary: Get logged meals for a specific date
      description: Fetch all breakfast, lunch, dinner, or other logged items for a given day.
      operationId: getMeals
      parameters:
        - name: date
          in: query
          description: The target log date in YYYY-MM-DD format. Defaults to today's date.
          required: false
          schema:
            type: string
        - name: limit
          in: query
          description: >-
            Optional number of recent meals to retrieve across all dates (sorted newest first).
            Use this to search past history. If specified, 'date' is ignored.
          required: false
          schema:
            type: integer
      responses:
        '200':
          description: Logged meals retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  date:
                    type: string
                  meals:
                    type: array
                    items:
                      type: object
                  daily_remaining:
                    type: object
                    description: Remaining amounts for calories, protein, and every nutrient the user tracks (e.g. carbs, fats, fiber, plus custom ones), keyed by nutrient id.
                    additionalProperties:
                      type: number
                  daily_tag_hits:
                    type: object
                    description: Count of each tag consumed on the queried date
                    additionalProperties:
                      type: integer
    post:
      x-openai-isConsequential: false
      summary: Log a new meal
      description: Record a consumed item, specifying name, macros (protein, carbs, fats), and calorie count. Trigger automatic Notion & Google Sheets sync if configured.
      operationId: logMeal
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - calories
              properties:
                name:
                  type: string
                  description: The name of the meal (e.g. "Avocado Toast with Egg")
                calories:
                  type: integer
                  description: Total calories in kcal
                protein:
                  type: integer
                  description: Protein in grams
                nutrients:
                  type: object
                  description: Map of nutrient id to grams consumed, covering the user's tracked nutrients (see GET /profile tracked_nutrients). Always include carbs, fats, and fiber; add any custom tracked nutrients the user has enabled (e.g. {"carbs":45,"fats":12,"fiber":8,"iron":2}).
                  additionalProperties:
                    type: number
                carbs:
                  type: integer
                  description: Legacy alias for nutrients.carbs; prefer the nutrients object
                fats:
                  type: integer
                  description: Legacy alias for nutrients.fats; prefer the nutrients object
                fiber:
                  type: integer
                  description: Legacy alias for nutrients.fiber; prefer the nutrients object
                type:
                  type: string
                  description: Categorization of the log (e.g. "Breakfast", "Lunch", "Dinner", "Snack")
                time:
                  type: string
                  description: Time of consumption (e.g. "8:30 AM")
                date:
                  type: string
                  description: Target date in YYYY-MM-DD format. Defaults to today.
                image:
                  type: string
                  description: >-
                    Leave this field EMPTY. Do NOT pass any image URL here — not from the user's upload, not from a web search.
                    The server automatically fetches a real matching food photo for every meal using the meal name.
                    Only pass a value here if the user explicitly provides a direct public image URL themselves.
                timezone:
                  type: string
                  description: The user's timezone identifier (e.g., "America/New_York", "Asia/Kolkata"). If provided, it is used to resolve the current local date and time if they are not explicitly specified.
                meal_description:
                  type: string
                  description: Optional detailed notes or description of the meal (e.g., ingredients, prep style).
                tags:
                  type: array
                  description: Array of custom or default tags (e.g., ["Gluten Free", "Rich in Iron"])
                  items:
                    type: string
                openaiFileIdRefs:
                  type: array
                  description: References to images or files uploaded by the user to the chat session. The backend will download these.
                  items:
                    type: object
                    properties:
                      id:
                        type: string
                      name:
                        type: string
                      mime_type:
                        type: string
                      download_link:
                        type: string
      responses:
        '201':
          description: Meal logged successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  meal:
                    type: object
                  daily_remaining:
                    type: object
                    description: Remaining amounts for calories, protein, and every nutrient the user tracks (e.g. carbs, fats, fiber, plus custom ones), keyed by nutrient id.
                    additionalProperties:
                      type: number
                  daily_tag_hits:
                    type: object
                    description: Count of each tag consumed on the target date
                    additionalProperties:
                      type: integer
    delete:
      x-openai-isConsequential: false
      summary: Delete a logged meal
      description: Remove a logged meal entry from the dashboard by its unique ID.
      operationId: deleteMeal
      parameters:
        - name: id
          in: query
          description: The unique UUID of the meal to delete.
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Meal deleted successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  meal:
                    type: object
                  daily_remaining:
                    type: object
                    description: Remaining amounts for calories, protein, and every nutrient the user tracks (e.g. carbs, fats, fiber, plus custom ones), keyed by nutrient id.
                    additionalProperties:
                      type: number
                  daily_tag_hits:
                    type: object
                    description: Count of each tag consumed on the target date
                    additionalProperties:
                      type: integer
        '400':
          description: Missing ID parameter
        '404':
          description: Meal not found
    patch:
      x-openai-isConsequential: false
      summary: Update a logged meal
      description: Modify properties of an existing logged meal by its unique ID.
      operationId: updateMeal
      parameters:
        - name: id
          in: query
          description: The unique UUID of the meal to update.
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                calories:
                  type: integer
                protein:
                  type: integer
                nutrients:
                  type: object
                  description: Map of nutrient id to grams; provided keys are merged into the meal's existing nutrients (e.g. {"carbs":45,"fiber":8}).
                  additionalProperties:
                    type: number
                carbs:
                  type: integer
                  description: Legacy alias for nutrients.carbs; prefer the nutrients object
                fats:
                  type: integer
                  description: Legacy alias for nutrients.fats; prefer the nutrients object
                fiber:
                  type: integer
                  description: Legacy alias for nutrients.fiber; prefer the nutrients object
                type:
                  type: string
                time:
                  type: string
                date:
                  type: string
                image:
                  type: string
                meal_description:
                  type: string
                  description: Optional detailed notes or description of the meal (e.g., ingredients, prep style).
                tags:
                  type: array
                  description: Array of tags to set on the meal
                  items:
                    type: string
      responses:
        '200':
          description: Meal updated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  meal:
                    type: object
                  daily_remaining:
                    type: object
                    description: Remaining amounts for calories, protein, and every nutrient the user tracks (e.g. carbs, fats, fiber, plus custom ones), keyed by nutrient id.
                    additionalProperties:
                      type: number
                  daily_tag_hits:
                    type: object
                    description: Count of each tag consumed on the target date
                    additionalProperties:
                      type: integer
        '400':
          description: Missing ID or invalid parameters
        '404':
          description: Meal not found
  /daily-wellness:
    get:
      summary: Get daily wellness notes
      description: Retrieve wellness and health notes for a specific date.
      operationId: getDailyWellness
      parameters:
        - name: date
          in: query
          description: The target date in YYYY-MM-DD format. Defaults to today's date.
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Wellness notes retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  date:
                    type: string
                  notes:
                    type: string
                  water_intake:
                    type: integer
                    description: Water consumed so far in ml
                  stool_type:
                    type: integer
                    description: Bristol stool scale type (1-7), if logged
                  stool_size:
                    type: string
                    description: Stool size (e.g. "small", "medium", "large"), if logged
                  energy_level:
                    type: integer
                    description: Daily energy & vitality level (1-5), if logged
                  water_log_time:
                    type: string
                    description: Time water was logged (HH:MM format)
                  stool_log_time:
                    type: string
                    description: Time stool consistency was logged (HH:MM format)
                  energy_log_time:
                    type: string
                    description: Time energy level was logged (HH:MM format)
    post:
      summary: Save daily wellness data
      description: Create or update the wellness log for a specific date. Only provided fields are changed; omitted fields keep their existing values.
      operationId: saveDailyWellness
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                date:
                  type: string
                  description: Optional target date in YYYY-MM-DD format. Defaults to today.
                notes:
                  type: string
                  description: The text content of the daily wellness or health note.
                water_intake:
                  type: integer
                  description: Total water consumed in ml for the day
                stool_type:
                  type: integer
                  description: Bristol stool scale type (1-7)
                stool_size:
                  type: string
                  description: Stool size (e.g. "small", "medium", "large")
                energy_level:
                  type: integer
                  description: Daily energy level on 1-5 scale (1=Exhausted, 2=Sluggish, 3=Steady, 4=High, 5=Peak)
                water_log_time:
                  type: string
                  description: Optional time water was logged in HH:MM format
                stool_log_time:
                  type: string
                  description: Optional time stool was logged in HH:MM format
                energy_log_time:
                  type: string
                  description: Optional time energy was logged in HH:MM format
      responses:
        '200':
          description: Daily wellness notes saved successfully
  /weight:
    get:
      summary: Get weight history logs
      description: Retrieve the history of logged weights for the user, sorted chronologically.
      operationId: getWeightLogs
      responses:
        '200':
          description: Weight logs retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  weight_logs:
                    type: array
                    items:
                      type: object
    post:
      summary: Log a weight entry
      description: Log or update the user's weight for a specific date (defaults to today). Automatically updates current profile weight if it is the most recent log.
      operationId: logWeight
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - weight
              properties:
                date:
                  type: string
                  description: YYYY-MM-DD. Defaults to today.
                weight:
                  type: number
                  description: Weight in kg (e.g. 78.5)
                log_time:
                  type: string
                  description: Time the weight was recorded in HH:MM format
      responses:
        '200':
          description: Weight log saved successfully
  /logout:
    post:
      x-openai-isConsequential: true
      summary: Revoke access token / Log out
      description: Rotates the user's API key, immediately invalidating the current ChatGPT connection on the server.
      operationId: logoutUser
      responses:
        '200':
          description: Logged out successfully
  /recipes:
    get:
      summary: List user recipes
      description: Retrieve stored recipes with their instructions and ingredients.
      operationId: getRecipes
      responses:
        '200':
          description: Recipes retrieved successfully
    post:
      x-openai-isConsequential: false
      summary: Save a new custom recipe
      description: Store a custom dish outline, including cooking time, macros, tags, ingredients, and instructions.
      operationId: saveRecipe
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
              properties:
                name:
                  type: string
                time:
                  type: string
                  description: E.g., "25 mins"
                calories:
                  type: integer
                protein:
                  type: integer
                carbs:
                  type: integer
                fats:
                  type: integer
                fiber:
                  type: integer
                description:
                  type: string
                  description: Short summary of the dish
                tags:
                  type: array
                  items:
                    type: string
                ingredients:
                  type: array
                  items:
                    type: string
                instructions:
                  type: string
                image:
                  type: string
                  description: URL of a recipe image
      responses:
        '201':
          description: Recipe saved successfully
components:
  schemas: {}
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
security:
  - BearerAuth: []
`;

export const DEFAULT_TRACKING_TAGS = [
  { id: 'best_meal', name: 'Best Meal for Me', description: 'Apply when meal is exceptionally nutrient-dense, personalized to your goals, or a favorite saved meal', enabled: true },
  { id: 'homemade', name: 'Homemade', description: 'Apply when meal is cooked at home from scratch', enabled: true },
  { id: 'outside_food', name: 'Outside Food', description: 'Apply when meal is from a restaurant, street vendor, or food delivery', enabled: true },
  { id: 'vegan', name: 'Vegan', description: 'Apply when meal contains no animal products', enabled: true },
  { id: 'vegetarian', name: 'Vegetarian', description: 'Apply when meal contains no meat, poultry, or seafood', enabled: false },
  { id: 'gluten_free', name: 'Gluten Free', description: 'Apply when meal contains no wheat, barley, rye, or gluten', enabled: false },
  { id: 'lactose_free', name: 'Lactose Free', description: 'Apply when meal contains no lactose or dairy products', enabled: false },
  { id: 'halal', name: 'Halal', description: 'Apply when meal complies with Islamic dietary guidelines', enabled: false },
  { id: 'nut_free', name: 'Nut Free', description: 'Apply when meal contains no peanuts or tree nuts', enabled: false },
  { id: 'quick_prep', name: 'Quick Prep', description: 'Apply when meal takes under 15 minutes to prepare', enabled: false },
];

export const SettingsView = ({
  profileData,
  setProfileData,
  triggerToast,
  onLogout,
  session,
}: {
  key?: string;
  profileData: any;
  setProfileData: any;
  triggerToast: (msg: string) => void;
  onLogout: () => void;
  session: any;
}) => {
  const [showPro, setShowPro] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [activeSubView, setActiveSubView] = useState<"notion" | "reminders" | "gpt" | "logging" | "gemini" | "floating_widget" | "health_sync" | null>(null);

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/gpt-action`;

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { supabase } = await import("../lib/supabaseClient");
      if (session?.user?.id) {
        await supabase.from("meals").delete().eq("user_id", session.user.id);
        await supabase.from("recipes").delete().eq("user_id", session.user.id);
        await supabase.from("profiles").delete().eq("id", session.user.id);
      }
      triggerToast("Account & all user data permanently deleted.");
      onLogout();
    } catch (err) {
      console.error("Error deleting account:", err);
      triggerToast("Failed to delete account. Please try signing out.");
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  // --- Notion States ---
  const [notionKey, setNotionKey] = useState(profileData.notionApiKey || "");
  const [notionDb, setNotionDb] = useState(profileData.notionDatabaseId || "");
  const [notionEnabled, setNotionEnabled] = useState(!!(profileData.notionApiKey && profileData.notionDatabaseId));

  // --- Telegram States ---
  const [tgBotToken, setTgBotToken] = useState(profileData.telegramBotToken || "");
  const [tgChatId, setTgChatId] = useState(profileData.telegramChatId || "");
  const [tgReportsEnabled, setTgReportsEnabled] = useState(!!profileData.telegramReportsEnabled);
  const [tgRemindersEnabled, setTgRemindersEnabled] = useState(!!profileData.telegramRemindersEnabled);
  const [tgReminderTimes, setTgReminderTimes] = useState<string[]>(profileData.telegramReminderTimes || ["09:00", "13:00", "20:00"]);
  const [newReminderTime, setNewReminderTime] = useState("");
  const [userTimezone, setUserTimezone] = useState(profileData.timezone || "UTC");
  const [isTestingTg, setIsTestingTg] = useState(false);
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);

  // --- Gemini API States ---
  const initialGeminiKey = useMemo(() => {
    const keyTag = (profileData.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
    return keyTag.split(":")[1] || "";
  }, [profileData.preferences]);

  const [geminiKey, setGeminiKey] = useState(initialGeminiKey);

  const handleSaveGemini = () => {
    const filteredPrefs = (profileData.preferences || []).filter((p: string) => !p.startsWith("gemini_api_key:"));
    if (geminiKey.trim()) {
      filteredPrefs.push(`gemini_api_key:${geminiKey.trim()}`);
    }
    setProfileData({
      ...profileData,
      preferences: filteredPrefs
    });
    triggerToast(geminiKey.trim() ? "💾 Saved Gemini API Key!" : "💾 Disabled Gemini image generation");
    setActiveSubView(null);
  };

  const openApiYaml = useMemo(() => getOpenApiYaml(edgeFunctionUrl), [edgeFunctionUrl]);

  // Notion Validations & Save
  const handleSaveNotion = () => {
    if (notionEnabled) {
      if (!notionKey.trim().startsWith("secret_")) {
        triggerToast("❌ Notion token must start with 'secret_'");
        return;
      }
      if (notionKey.trim().length < 25) {
        triggerToast("❌ Invalid Notion token length");
        return;
      }
      const cleanDbId = notionDb.trim().replace(/-/g, "");
      if (cleanDbId.length !== 32) {
        triggerToast("❌ Database ID must be a 32-character UUID");
        return;
      }
    }

    setProfileData({
      ...profileData,
      notionApiKey: notionEnabled ? notionKey.trim() : "",
      notionDatabaseId: notionEnabled ? notionDb.trim() : ""
    });
    triggerToast(notionEnabled ? "💾 Saved Notion settings!" : "💾 Disabled Notion Sync");
    setActiveSubView(null);
  };

  // Telegram Save
  const handleSaveTelegram = () => {
    if (tgReportsEnabled || tgRemindersEnabled) {
      if (!tgChatId.trim()) {
        triggerToast("❌ Telegram Chat ID is required");
        return;
      }
    }

    setProfileData({
      ...profileData,
      telegramBotToken: tgBotToken.trim(),
      telegramChatId: tgChatId.trim(),
      telegramReportsEnabled: tgReportsEnabled,
      telegramRemindersEnabled: tgRemindersEnabled,
      telegramReminderTimes: tgReminderTimes,
      timezone: userTimezone
    });
    triggerToast("💾 Saved Telegram settings!");
    setActiveSubView(null);
  };

  // Telegram Test Notification
  const handleTestTelegram = async () => {
    if (!tgChatId.trim()) {
      triggerToast("❌ Chat ID is required to send a test message!");
      return;
    }

    setIsTestingTg(true);
    try {
      const res = await fetch(`${edgeFunctionUrl}/telegram/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${profileData.api_key}`
        },
        body: JSON.stringify({
          telegram_bot_token: tgBotToken.trim(),
          telegram_chat_id: tgChatId.trim()
        })
      });

      if (res.ok) {
        triggerToast("🚀 Verification message sent! Check your Telegram.");
      } else {
        const err = await res.json();
        triggerToast(`❌ Test failed: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      triggerToast("❌ Connection error. Check your bot settings.");
    } finally {
      setIsTestingTg(false);
    }
  };

  // Reminder Times Management
  const addReminderTime = () => {
    if (!newReminderTime) return;
    if (tgReminderTimes.includes(newReminderTime)) {
      triggerToast("⏰ Time already configured");
      return;
    }
    setTgReminderTimes([...tgReminderTimes, newReminderTime].sort());
    setNewReminderTime("");
  };

  const removeReminderTime = (timeToRemove: string) => {
    setTgReminderTimes(tgReminderTimes.filter(t => t !== timeToRemove));
  };

  // Render Sub-Views

  if (activeSubView === "gemini") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-6 mt-8 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-black text-[#1a1a1a]">Google Gemini API</h2>
        </div>

        <div className="bg-orange-50/50 border border-orange-100 rounded-[24px] p-5 space-y-3.5 text-left">
          <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider">
            Premium Features Unlocked with your API Key:
          </span>
          <ul className="space-y-2.5 text-xs font-semibold text-stone-700">
            <li className="flex items-start gap-2">
              <span className="text-orange-500">📷</span>
              <div>
                <strong className="text-stone-900 block text-[11px] font-black leading-none mb-1">Ultra-Realistic Food Photos</strong>
                Generates high-definition, photorealistic culinary photography for your daily logs.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">🧠</span>
              <div>
                <strong className="text-stone-900 block text-[11px] font-black leading-none mb-1">Peak Reasoning Engine</strong>
                Unlocks Google's flagship reasoning models for highly precise nutritional analyses and macro calculations.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">🔍</span>
              <div>
                <strong className="text-stone-900 block text-[11px] font-black leading-none mb-1">In-App Camera & Scan</strong>
                Unlocks the ability to upload or capture photos of your real food plates to log macros instantly!
              </div>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-[18px] px-4 py-3.5 text-xs font-bold text-[#1a1a1a] shadow-xs outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all placeholder:text-stone-300"
            />
            <p className="text-[9.5px] text-stone-500 font-bold leading-relaxed mt-2.5 font-sans">
              ⏱️ <strong>1 min setup for unmatched quality.</strong> Get your free key from{" "}
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-orange-500 underline font-black"
              >
                Google AI Studio
              </a>.
            </p>
          </div>
        </div>

          <button
            onClick={handleSaveGemini}
            className="w-full bg-stone-900 text-white hover:bg-stone-850 text-xs font-black uppercase tracking-wider py-4 rounded-[18px] transition-all active:scale-98 shadow-sm cursor-pointer"
          >
            Save Connection Settings
          </button>
        </motion.div>
    );
  }

  if (activeSubView === "health_sync") {
    const isGfitOn = (profileData.preferences || []).some((p: string) => p === "health_sync_gfit:true");
    const isAfitOn = (profileData.preferences || []).some((p: string) => p === "health_sync_afit:true");
    const logs: SyncLogEntry[] = profileData.health_sync_logs || [];
    const lastSyncedAt = profileData.health_sync_last_synced_at || null;

    const toggleGfit = async () => {
      const filtered = (profileData.preferences || []).filter((p: string) => !p.startsWith("health_sync_gfit:"));
      const nextVal = !isGfitOn;
      filtered.push(`health_sync_gfit:${nextVal}`);
      setProfileData({ ...profileData, preferences: filtered });
      if (nextVal) {
        triggerToast("Requesting Google Fit permissions...");
        const perm = await requestHealthPermissions("google");
        if (perm.success) {
          triggerToast("Google Fit Sync Enabled");
          performHealthSync(session, profileData, setProfileData, "google");
        } else {
          triggerToast(perm.message);
        }
      } else {
        triggerToast("Disabled Google Fit Sync");
      }
    };

    const toggleAfit = async () => {
      const filtered = (profileData.preferences || []).filter((p: string) => !p.startsWith("health_sync_afit:"));
      const nextVal = !isAfitOn;
      filtered.push(`health_sync_afit:${nextVal}`);
      setProfileData({ ...profileData, preferences: filtered });
      if (nextVal) {
        triggerToast("Requesting Apple Health permissions...");
        const perm = await requestHealthPermissions("apple");
        if (perm.success) {
          triggerToast("Apple Health Sync Enabled");
          performHealthSync(session, profileData, setProfileData, "apple");
        } else {
          triggerToast(perm.message);
        }
      } else {
        triggerToast("Disabled Apple Health Sync");
      }
    };

    const handleSyncNow = async () => {
      if (!isGfitOn && !isAfitOn) {
        triggerToast("Please enable Apple Health or Google Fit first");
        return;
      }
      setIsHealthSyncing(true);
      try {
        if (isAfitOn) {
          await performHealthSync(session, profileData, setProfileData, "apple");
        }
        if (isGfitOn) {
          await performHealthSync(session, profileData, setProfileData, "google");
        }
        triggerToast("Health data synced successfully");
      } catch (err) {
        console.error(err);
        triggerToast("Sync completed with issues. Check log below.");
      } finally {
        setIsHealthSyncing(false);
      }
    };

    const handleClearLogs = async () => {
      await clearHealthSyncLogs(session, profileData, setProfileData);
      triggerToast("Sync logs cleared");
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-2.5 sm:px-4 mt-6 relative z-10 space-y-4 pb-32 font-sans text-left"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-black text-[#1a1a1a]">Health Sync</h2>
            <p className="text-[10px] font-semibold text-stone-400">Native HealthKit & Google Fit Integration</p>
          </div>
        </div>

        {/* Platform Overview Banner */}
        <div className="bg-orange-50/60 border border-orange-100/80 rounded-[28px] p-4 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              <span className="text-xs font-black uppercase text-orange-950 tracking-wider">
                Smartwatch & App Integration
              </span>
            </div>
            {lastSyncedAt && (
              <span className="text-[9px] font-mono font-bold text-orange-800/70 bg-orange-100/60 px-2 py-0.5 rounded-full">
                Synced {new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-orange-900/70 leading-relaxed">
            Sync active calories burned, daily steps, and weight logs automatically to Supabase for AI conversation context.
          </p>
        </div>

        {/* Google Fit / Health Connect Card */}
        <div className="bg-white p-4 rounded-[28px] border border-stone-150 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shrink-0 font-black text-xs font-mono">
                GFit
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-900">Google Fit & Health Connect</h4>
                <p className="text-[10px] font-semibold text-stone-400">Android, Noise, Boat, Samsung, Amazfit, Fitbit</p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleGfit}
              className={cn(
                "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0",
                isGfitOn ? "bg-orange-500 justify-end" : "bg-stone-200 justify-start"
              )}
            >
              <motion.div layout className="w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {isGfitOn && (
            <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-100 space-y-1 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span>Google Fit Integration Active</span>
                <span className="text-[9px] font-mono text-emerald-600 font-extrabold uppercase bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>
              <p className="text-[10px] text-stone-400 font-medium">Background sync for active burn calories, steps, and weight logs.</p>
            </div>
          )}
        </div>

        {/* Apple Health Card */}
        <div className="bg-white p-4 rounded-[28px] border border-stone-150 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 font-black text-xs font-mono">
                AFit
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-900">Apple Health (HealthKit)</h4>
                <p className="text-[10px] font-semibold text-stone-400">Apple Watch, iPhone Health, Connected iOS Apps</p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleAfit}
              className={cn(
                "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0",
                isAfitOn ? "bg-orange-500 justify-end" : "bg-stone-200 justify-start"
              )}
            >
              <motion.div layout className="w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {isAfitOn && (
            <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-100 space-y-1 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span>HealthKit Integration Active</span>
                <span className="text-[9px] font-mono text-emerald-600 font-extrabold uppercase bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>
              <p className="text-[10px] text-stone-400 font-medium">Background sync for active burn calories, steps, and weight logs.</p>
            </div>
          )}
        </div>

        {/* Action Connect & Sync Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isHealthSyncing}
            className={cn(
              "w-full py-3.5 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all duration-200",
              isHealthSyncing && "opacity-80 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", isHealthSyncing && "animate-spin")} />
            <span>{isHealthSyncing ? "Syncing Health Data..." : "Connect & Sync Now"}</span>
          </button>
        </div>

        {/* Sync & Error Logs Showcase */}
        <div className="bg-white p-4 rounded-[28px] border border-stone-150 shadow-2xs space-y-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-stone-600" />
              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">Sync & Error Logs</h4>
              {logs.length > 0 && (
                <span className="text-[9px] font-mono font-bold bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md">
                  {logs.length}
                </span>
              )}
            </div>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="text-[10px] font-bold text-stone-400 hover:text-rose-500 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-center">
              <p className="text-[11px] font-medium text-stone-400">No sync logs recorded yet. Tap "Connect & Sync Now" to run initial sync.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl border bg-stone-50/70 border-stone-100 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : log.status === "warning" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 font-mono">
                        {log.provider === "apple" ? "Apple Health" : "Google Fit"}
                      </span>
                    </div>

                    <span className="text-[9px] font-medium text-stone-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-[11px] font-medium text-stone-700 leading-snug">{log.message}</p>

                  {log.details?.errorText && (
                    <p className="text-[10px] font-mono text-rose-600 bg-rose-50 p-1.5 rounded-lg break-words">
                      {log.details.errorText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (activeSubView === "notion") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-6 mt-8 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-black text-[#1a1a1a]">Notion Integration</h2>
        </div>

        {/* Setup Guide */}
        <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-950 flex items-center justify-center text-white font-black text-sm select-none">
              N
            </div>
            <div>
              <div className="font-extrabold text-[#1a1a1a] text-xs">Notion database Sync</div>
              <div className="text-[10px] text-stone-400 font-bold leading-none mt-1">
                Auto-syncs meal logs into a Notion database table
              </div>
            </div>
          </div>

          <div className="text-[10px] font-semibold text-stone-550 space-y-2 pt-2 border-t border-stone-100 leading-relaxed">
            <p className="font-extrabold text-stone-700">How to Connect:</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>Go to <a href="https://notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-orange-500 hover:underline font-extrabold">notion.so/my-integrations ↗</a> and create a new internal integration. Copy your token.</li>
              <li>Open your Notion workspace and create a table database.</li>
              <li>Share the database page with your integration (click the three dots in Notion top-right → Add Connections).</li>
              <li>Copy the database ID from the URL (the 32-character string between the workspace name and the query mark).</li>
            </ol>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-700">Enable Syncing</span>
            <button
              onClick={() => setNotionEnabled(!notionEnabled)}
              className={cn(
                "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center",
                notionEnabled ? "bg-orange-500 justify-end" : "bg-stone-200 justify-start"
              )}
            >
              <motion.div layout className="w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {notionEnabled && (
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div>
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider block mb-1">
                  Internal Integration Token
                </label>
                <input
                  type="password"
                  placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={notionKey}
                  onChange={(e) => setNotionKey(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-150 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider block mb-1">
                  Database UUID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8d39c0c8be034ff99971936c53e81d24"
                  value={notionDb}
                  onChange={(e) => setNotionDb(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-150 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSaveNotion}
            className="w-full bg-stone-950 hover:bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider py-3 rounded-xl cursor-pointer active:scale-95 transition-all mt-4"
          >
            Verify & Save Settings
          </button>
        </div>
      </motion.div>
    );
  }

  if (activeSubView === "reminders") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-6 mt-8 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-black text-[#1a1a1a]">Telegram Alerts</h2>
        </div>

        {/* Setup Guide */}
        <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-550">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.95 1.23-5.51 3.63-.52.36-.99.53-1.41.52-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.37-.49 1.02-.74 3.99-1.74 6.66-2.88 7.99-3.44 3.8-1.6 4.59-1.88 5.1-.19.01.03.01.07.01.1z" />
              </svg>
            </div>
            <div>
              <div className="font-extrabold text-[#1a1a1a] text-xs">Telegram Reports & Alerts</div>
              <div className="text-[10px] text-stone-400 font-bold leading-none mt-1">
                Receive logging reminders and end-of-day summaries
              </div>
            </div>
          </div>

          <div className="text-[10px] font-semibold text-stone-550 space-y-2 pt-2 border-t border-stone-100 leading-relaxed">
            <p className="font-extrabold text-stone-700">How to Connect:</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>Start a conversation with the official <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer" className="font-extrabold underline">FitAI Telegram Bot</a>.</li>
              <li>Send `/start` or `/id` to the bot to retrieve your unique numeric **Chat ID**.</li>
              <li>Enter your Chat ID below and click **Send Test Message** to verify the connection.</li>
            </ol>
          </div>

          {/* Credentials */}
          <div className="space-y-3 pt-3 border-t border-stone-100">
            <div>
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider block mb-1">
                Telegram Chat ID
              </label>
              <input
                type="text"
                placeholder="e.g. 987654321"
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-150 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>
            
            <button
              onClick={handleTestTelegram}
              disabled={isTestingTg}
              className="w-full border border-sky-200 bg-sky-50/50 hover:bg-sky-50 text-sky-600 text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none"
            >
              {isTestingTg ? "Sending Test..." : "⚡ Send Test Message"}
            </button>
          </div>

          {/* Toggles */}
          <div className="space-y-4 pt-3 border-t border-stone-100">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-stone-700 block">Daily Report Summaries</span>
                <span className="text-[9px] text-stone-450 block leading-tight mt-0.5">End-of-day summary of calorie & macro milestones</span>
              </div>
              <button
                onClick={() => setTgReportsEnabled(!tgReportsEnabled)}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center",
                  tgReportsEnabled ? "bg-orange-500 justify-end" : "bg-stone-200 justify-start"
                )}
              >
                <motion.div layout className="w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-stone-700 block">Logging Reminders</span>
                <span className="text-[9px] text-stone-450 block leading-tight mt-0.5">Periodic prompts to log your food items</span>
              </div>
              <button
                onClick={() => setTgRemindersEnabled(!tgRemindersEnabled)}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center",
                  tgRemindersEnabled ? "bg-orange-500 justify-end" : "bg-stone-200 justify-start"
                )}
              >
                <motion.div layout className="w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>

          {/* Reminder Times & Timezone Settings */}
          {(tgReportsEnabled || tgRemindersEnabled) && (
            <div className="space-y-4 pt-4 border-t border-stone-100">
              <div>
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider block mb-1">
                  Local Timezone
                </label>
                <select
                  value={userTimezone}
                  onChange={(e) => setUserTimezone(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-150 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-850 focus:outline-none"
                >
                  <option value="UTC">UTC</option>
                  <option value="Asia/Kolkata">India (IST - Asia/Kolkata)</option>
                  <option value="America/New_York">US Eastern (EST - America/New_York)</option>
                  <option value="America/Chicago">US Central (CST - America/Chicago)</option>
                  <option value="America/Los_Angeles">US Pacific (PST - America/Los_Angeles)</option>
                  <option value="Europe/London">London (GMT/BST - Europe/London)</option>
                  <option value="Asia/Singapore">Singapore (SGT - Asia/Singapore)</option>
                  <option value="Australia/Sydney">Sydney (AEST - Australia/Sydney)</option>
                  <option value="Asia/Dubai">Dubai (GST - Asia/Dubai)</option>
                </select>
              </div>

              {tgRemindersEnabled && (
                <div>
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider block mb-1.5">
                    Configure Reminder Alerts (Local Time)
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tgReminderTimes.map((time) => (
                      <span
                        key={time}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 border border-stone-200 text-stone-700 rounded-full text-[10px] font-black shadow-3xs"
                      >
                        {time}
                        <button
                          onClick={() => removeReminderTime(time)}
                          className="text-stone-400 hover:text-red-500 text-xs font-light font-sans ml-0.5 cursor-pointer leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className="bg-stone-50 border border-stone-150 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-850 focus:outline-none flex-1"
                    />
                    <button
                      onClick={addReminderTime}
                      className="bg-stone-900 hover:bg-stone-800 text-white text-[9px] font-black uppercase tracking-wider px-4 py-1.5 rounded-xl cursor-pointer"
                    >
                      Add Time
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSaveTelegram}
            className="w-full bg-stone-950 hover:bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider py-3 rounded-xl cursor-pointer active:scale-95 transition-all mt-4"
          >
            Verify & Save Settings
          </button>
        </div>
      </motion.div>
    );
  }

  if (activeSubView === "gpt") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-6 mt-8 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-black text-[#1a1a1a]">Custom GPT</h2>
        </div>

        {/* Status card */}
        <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-50 select-none">
            <div className="flex items-center gap-2">
              <ChatGPTIcon className="w-5 h-5 text-stone-750" />
              <span className="text-[11px] font-black text-stone-850 uppercase tracking-wider">ChatGPT Connection</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100/50">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Linked</span>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={DEFAULT_CUSTOM_GPT_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-850 text-white text-[10px] font-black uppercase tracking-wider py-3.5 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-99 text-center select-none border-none"
            >
              <span>Open Custom GPT ↗</span>
            </a>

            <div className="flex justify-end select-none">
              <button
                onClick={() => {
                  const confirmReset = window.confirm(
                    "Are you sure you want to unlink your ChatGPT connection? This will immediately revoke ChatGPT's access to your profile."
                  );
                  if (confirmReset) {
                    const newKey = "fit_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
                    setProfileData({
                      ...profileData,
                      api_key: newKey
                    });
                    triggerToast("🔒 ChatGPT unlinked successfully!");
                  }
                }}
                className="text-[9px] font-bold text-stone-400 hover:text-red-500 transition-colors bg-transparent border-none p-0 cursor-pointer underline hover:no-underline"
              >
                Unlink Connection
              </button>
            </div>

            <div className="space-y-5 pt-3 border-t border-stone-100">

              <div className="flex items-center justify-between pt-3 border-t border-stone-50">
                <div>
                  <span className="text-[10px] font-bold text-stone-700 block">Generate Food Images</span>
                  <span className="text-[9px] text-stone-400 font-medium block leading-tight">Create AI/Stock food photos automatically for text-only logs</span>
                </div>
                <button
                  onClick={() => {
                    const current = profileData.agent_config || {};
                    const isEnabled = current.generateImages ?? true;
                    setProfileData({
                      ...profileData,
                      agent_config: { ...current, generateImages: !isEnabled }
                    });
                    triggerToast(!isEnabled ? "🖼️ Image generation enabled!" : "🖼️ Image generation disabled");
                  }}
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative flex items-center cursor-pointer ${
                    (profileData.agent_config?.generateImages ?? true) ? "bg-emerald-500" : "bg-stone-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                      (profileData.agent_config?.generateImages ?? true) ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-50">
                <div>
                  <span className="text-[10px] font-bold text-stone-700 block">Require Log Confirmation</span>
                  <span className="text-[9px] text-stone-400 font-medium block leading-tight">Always ask for confirmation before saving logged meals</span>
                </div>
                <button
                  onClick={() => {
                    const current = profileData.agent_config || {};
                    const isEnabled = current.requireConfirmation ?? false;
                    setProfileData({
                      ...profileData,
                      agent_config: { ...current, requireConfirmation: !isEnabled }
                    });
                    triggerToast(!isEnabled ? "✅ Log confirmation required!" : "✅ Log confirmation optional");
                  }}
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative flex items-center cursor-pointer ${
                    (profileData.agent_config?.requireConfirmation ?? false) ? "bg-emerald-500" : "bg-stone-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                      (profileData.agent_config?.requireConfirmation ?? false) ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-stone-50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-stone-700 block">Refine Uploaded Photos with AI</span>
                    <span className="text-[9px] text-stone-400 font-medium block leading-tight">Replace uploaded food photos with styled AI versions</span>
                  </div>
                  <button
                    onClick={() => {
                      const current = profileData.agent_config || {};
                      const isEnabled = current.refinePhotos ?? false;
                      setProfileData({
                        ...profileData,
                        agent_config: { ...current, refinePhotos: !isEnabled }
                      });
                      triggerToast(!isEnabled ? "🎨 AI Photo Refinement enabled!" : "🎨 AI Photo Refinement disabled");
                    }}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative flex items-center cursor-pointer ${
                      (profileData.agent_config?.refinePhotos ?? false) ? "bg-emerald-500" : "bg-stone-200"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                        (profileData.agent_config?.refinePhotos ?? false) ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {(profileData.agent_config?.refinePhotos ?? false) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 space-y-3 pl-1"
                  >
                    <div>
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider block mb-1">Visual Art Style</label>
                      <select
                        value={profileData.agent_config?.artStyle || "gourmet"}
                        onChange={(e) => {
                          const current = profileData.agent_config || {};
                          setProfileData({
                            ...profileData,
                            agent_config: { ...current, artStyle: e.target.value }
                          });
                        }}
                        className="w-full bg-stone-50 border border-stone-150 rounded-xl px-3 py-2 text-[10px] font-bold text-stone-700 focus:outline-none cursor-pointer"
                      >
                        <option value="gourmet">Gourmet Studio (Default)</option>
                        <option value="anime">Anime / Studio Ghibli illustration</option>
                        <option value="south_indian">Traditional South Indian Home-style</option>
                        <option value="restaurant">Vibrant Restaurant Plating</option>
                        <option value="dubai">Dubai Luxury / Fine Dining</option>
                        <option value="custom">Custom Prompt Style...</option>
                      </select>
                    </div>

                    {profileData.agent_config?.artStyle === "custom" && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                      >
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-wider block mb-1">Custom Style Prompt</label>
                        <input
                          type="text"
                          placeholder="e.g. claymation style, oil painting, sketch"
                          value={profileData.agent_config?.customArtStyle || ""}
                          onChange={(e) => {
                            const current = profileData.agent_config || {};
                            setProfileData({
                              ...profileData,
                              agent_config: { ...current, customArtStyle: e.target.value }
                            });
                          }}
                          className="w-full bg-stone-50 border border-stone-150 rounded-xl px-3 py-2 text-[10px] font-bold text-stone-700 focus:outline-none focus:border-stone-300"
                        />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Custom Instructions Textarea */}
              <div className="flex flex-col gap-1.5 pt-3 border-t border-stone-50">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-stone-700">Custom Instructions to AI</label>
                  <button
                    type="button"
                    onClick={() => {
                      const current = profileData.agent_config || {};
                      setProfileData({
                        ...profileData,
                        agent_config: {
                          ...current,
                          customInstructions: "Be a hyper-efficient fitness assistant. Minimize chit-chat. Keep replies extremely concise. Prefix macro estimations with ≈. Focus on accurate protein tracking and calorie targets."
                        }
                      });
                      triggerToast("✏️ Reset to default instructions!");
                    }}
                    className="text-[9px] font-bold text-stone-400 hover:text-orange-500 transition-colors bg-transparent border-none p-0 cursor-pointer underline hover:no-underline"
                  >
                    Restore Default
                  </button>
                </div>
                <span className="text-[9px] text-stone-400 font-medium block leading-tight mb-2">Write strict behavioral rules for the agent (e.g. 'be brief', 'no greetings')</span>
                <textarea
                  value={profileData.agent_config?.customInstructions || ""}
                  onChange={(e) => {
                    const current = profileData.agent_config || {};
                    setProfileData({
                      ...profileData,
                      agent_config: { ...current, customInstructions: e.target.value }
                    });
                  }}
                  placeholder="E.g. Be very brief, do not repeat yourself, count double protein for eggs..."
                  className="w-full bg-stone-50 border border-stone-150 rounded-2xl p-3 text-[10px] font-bold text-stone-700 focus:outline-none focus:border-stone-300 min-h-[80px]"
                />
              </div>

              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-3 text-[9px] text-orange-800 font-medium leading-normal flex items-start gap-2 select-none">
                <span>⚙️</span>
                <span>ChatGPT cannot modify these settings. These are your strict instructions.</span>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (activeSubView === "logging") {
    const currentAction = profileData.preferences?.find((p: string) => p.startsWith("plus_button_action:"))?.split(":")[1] || "ai_logger";

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-6 mt-8 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-black text-[#1a1a1a]">Logging Preferences</h2>
        </div>

        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            Plus Button (+) Action
          </h3>
          <p className="text-[10px] text-stone-450 font-bold px-3 mb-4 leading-normal">
            Choose what action triggers automatically when you tap the Plus (+) button on your Home screen.
          </p>

          <div className="space-y-3">
            {[
              {
                id: "ai_logger",
                title: "AI Logger (Default)",
                description: "Describe meals in natural language, AI handles the rest.",
                icon: Sparkles,
              },
              {
                id: "quick_log",
                title: "Past Foods",
                description: "Search history or tap past logs to add meals in one click.",
                icon: Search,
              },
              {
                id: "detailed_log",
                title: "Detailed Manual Form",
                description: "Opens standard text fields to manually input calories and macros.",
                icon: Edit2,
              },
              {
                id: "camera",
                title: "Direct Camera Capture",
                description: "Opens the scanner and immediately triggers the device camera.",
                icon: Camera,
              },
              {
                id: "gpt_redirect",
                title: "Redirect to Custom GPT",
                description: "Launches and opens your Custom ChatGPT fitness action.",
                icon: Bot,
              },
            ].map((opt) => {
              const isSelected = currentAction === opt.id;
              const IconComp = opt.icon;

              return (
                <motion.div
                  key={opt.id}
                  onClick={() => {
                    const filteredPrefs = (profileData.preferences || []).filter((p: string) => !p.startsWith("plus_button_action:"));
                    filteredPrefs.push(`plus_button_action:${opt.id}`);
                    setProfileData({
                      ...profileData,
                      preferences: filteredPrefs
                    });
                    triggerToast(`Saved preference: ${opt.title} ⚡`);
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer select-none",
                    isSelected
                      ? "bg-orange-50/70 border-orange-200/60 shadow-xs"
                      : "bg-white border-stone-100 hover:border-stone-200 shadow-3xs"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-orange-500 text-white" : "bg-stone-50 text-stone-550 border border-stone-100"
                    )}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <h4 className={cn("text-xs font-black leading-tight", isSelected ? "text-orange-950" : "text-stone-850")}>
                        {opt.title}
                      </h4>
                      <p className="text-[9.5px] text-stone-400 font-semibold mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {currentAction === "gpt_redirect" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-white rounded-3xl p-5 border border-stone-100 shadow-2xs space-y-3.5 text-left"
            >
              <div>
                <label className="text-[9px] font-black text-stone-450 uppercase tracking-widest block mb-1.5 px-1">
                  Custom GPT Chat URL
                </label>
                <input
                  type="text"
                  placeholder="https://chatgpt.com/g/g-..."
                  value={localStorage.getItem("fitai_custom_gpt_url") || DEFAULT_CUSTOM_GPT_URL}
                  onChange={(e) => {
                    localStorage.setItem("fitai_custom_gpt_url", e.target.value);
                  }}
                  className="w-full bg-stone-50 border border-stone-150 rounded-2xl px-4 py-3 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-400"
                />
              </div>
              <p className="text-[9.5px] text-stone-400 font-bold leading-relaxed px-1">
                Tapping the Plus button will launch a new tab pointing directly to your ChatGPT custom action interface.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  if (activeSubView === "floating_widget") {
    const isWidgetEnabled = profileData.agent_config?.showGptWidget ?? true;
    const currentAction = profileData.agent_config?.floatingWidgetAction || "gpt";

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-6 mt-8 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-black text-[#1a1a1a]">Floating Button Actions</h2>
        </div>

        {/* Master Toggle Card */}
        <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-stone-900 block">Show Floating Action Button</span>
              <span className="text-[10px] text-stone-400 font-semibold block leading-tight mt-0.5">
                Display floating quick action button on Home & Profile screens
              </span>
            </div>
            <button
              onClick={() => {
                const current = profileData.agent_config || {};
                const isEnabled = current.showGptWidget ?? true;
                setProfileData({
                  ...profileData,
                  agent_config: { ...current, showGptWidget: !isEnabled }
                });
                triggerToast(!isEnabled ? "💬 Floating button enabled!" : "💬 Floating button hidden");
              }}
              className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative flex items-center cursor-pointer ${
                isWidgetEnabled ? "bg-emerald-500" : "bg-stone-200"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                  isWidgetEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Live Interactive Button Preview Card */}
        <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-2xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
              Live Floating Button Preview
            </span>
            <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 uppercase font-mono">
              {currentAction}
            </span>
          </div>

          <div className="flex items-center justify-between bg-stone-50/70 rounded-2xl p-4 border border-stone-150">
            <div>
              <span className="text-xs font-black text-stone-900 block">
                {currentAction === "gpt" ? "FitAI Custom GPT" :
                 currentAction === "voice" ? "AI Voice Logger" :
                 currentAction === "camera" ? "AI Photo Logger" :
                 currentAction === "vitals" ? "Daily Vitals Tracker" :
                 "Detailed Manual Log"}
              </span>
              <span className="text-[10px] text-stone-400 font-semibold block mt-0.5">
                {currentAction === "gpt" ? "Orange Theme • 💬 Custom GPT" :
                 currentAction === "voice" ? "Emerald Theme • 🎙️ Natural Voice" :
                 currentAction === "camera" ? "Purple Theme • 📸 AI Scanner" :
                 currentAction === "vitals" ? "Red Theme • 💓 Vitals Sheet" :
                 "Dark Theme • ✏️ Manual Form"}
              </span>
            </div>

            {/* Live Floating FAB Button */}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center shadow-md text-white border border-white/20 shrink-0",
              currentAction === "vitals" ? "bg-gradient-to-tr from-rose-500 to-red-500" :
              currentAction === "voice" ? "bg-gradient-to-tr from-emerald-500 to-teal-500" :
              currentAction === "camera" ? "bg-gradient-to-tr from-purple-500 to-indigo-500" :
              currentAction === "manual" ? "bg-stone-900" :
              "bg-gradient-to-tr from-orange-500 to-amber-500"
            )}>
              {currentAction === "voice" && <Mic className="w-5.5 h-5.5 text-white" />}
              {currentAction === "camera" && <Camera className="w-5.5 h-5.5 text-white" />}
              {currentAction === "vitals" && <Heart className="w-5.5 h-5.5 text-white fill-white" />}
              {currentAction === "manual" && <Edit2 className="w-5.5 h-5.5 text-white" />}
              {currentAction === "gpt" && <ChatGPTIcon className="w-5.5 h-5.5 text-white" />}
            </div>
          </div>
        </div>

        {/* Action Selection List (Exact same UI as Plus Button Actions) */}
        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            Floating Button Default Action
          </h3>
          <p className="text-[10px] text-stone-450 font-bold px-3 mb-4 leading-normal">
            Choose what action triggers automatically when you tap the Floating Action button on your screen.
          </p>

          <div className="space-y-3">
            {[
              {
                id: "gpt",
                title: "FitAI Custom GPT (Default)",
                description: "Launches and opens your Custom ChatGPT fitness companion.",
                icon: Bot,
              },
              {
                id: "voice",
                title: "AI Voice Logger",
                description: "Speak meal details out loud in natural language.",
                icon: Mic,
              },
              {
                id: "camera",
                title: "AI Photo Logger",
                description: "Snap food photo to auto-estimate calories & macros.",
                icon: Camera,
              },
              {
                id: "vitals",
                title: "Daily Vitals Tracker",
                description: "Log weight, water intake, stool scale, & energy level.",
                icon: Heart,
              },
              {
                id: "manual",
                title: "Detailed Manual Log",
                description: "Opens standard text fields to manually input calories and macros.",
                icon: Edit2,
              },
            ].map((opt) => {
              const isSelected = currentAction === opt.id;
              const IconComp = opt.icon;

              return (
                <motion.div
                  key={opt.id}
                  onClick={() => {
                    const current = profileData.agent_config || {};
                    setProfileData({
                      ...profileData,
                      agent_config: { ...current, floatingWidgetAction: opt.id }
                    });
                    triggerToast(`Saved Floating preference: ${opt.title} ⚡`);
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer select-none",
                    isSelected
                      ? "bg-orange-50/70 border-orange-200/60 shadow-xs"
                      : "bg-white border-stone-100 hover:border-stone-200 shadow-3xs"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-orange-500 text-white" : "bg-stone-50 text-stone-550 border border-stone-100"
                    )}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <h4 className={cn("text-xs font-black leading-tight", isSelected ? "text-orange-950" : "text-stone-850")}>
                        {opt.title}
                      </h4>
                      <p className="text-[9.5px] text-stone-400 font-semibold mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  // --- Main Settings View ---
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="px-6 mt-8 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        <div className="flex justify-between items-end mb-2 text-left">
          <h2 className="text-[3rem] font-light tracking-tight text-[#1a1a1a] leading-none mb-4">
            Settings
          </h2>
        </div>

        {/* Integrations grid list */}
        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            Integrations & Cloud Sync
          </h3>
          <div className="bg-white rounded-[24px] p-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] divide-y divide-stone-50">
            {/* Custom GPT */}
            <div
              onClick={() => setActiveSubView("gpt")}
              className="flex justify-between items-center p-4 hover:bg-[#fcfcfc] rounded-t-[18px] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Bot className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] text-xs">Custom GPT Connection</div>
                  <div className="text-[9px] text-[#9e9e9e] font-semibold mt-0.5 leading-none">
                    Link ChatGPT as a personalized health companion
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold">
                <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">On</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Floating Button Actions */}
            <div
              onClick={() => setActiveSubView("floating_widget")}
              className="flex justify-between items-center p-4 hover:bg-[#fcfcfc] transition-colors cursor-pointer group border-t border-stone-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-550 shrink-0">
                  <Sliders className="w-4 h-4 text-orange-550" />
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] text-xs">Floating Button Actions</div>
                  <div className="text-[9px] text-[#9e9e9e] font-semibold mt-0.5 leading-none">
                    Configure what happens when you tap the floating action button
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold">
                <span className="text-stone-500 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">
                  {(() => {
                    const act = profileData.agent_config?.floatingWidgetAction || "gpt";
                    return act === "gpt" ? "GPT" :
                           act === "voice" ? "Voice" :
                           act === "camera" ? "Camera" :
                           act === "vitals" ? "Vitals" :
                           "Form";
                  })()}
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Notion Integration commented out for now
            <div
              onClick={() => setActiveSubView("notion")}
              className="flex justify-between items-center p-4 hover:bg-[#fcfcfc] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-950 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm select-none">
                  N
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] text-xs">Notion Database Sync</div>
                  <div className="text-[9px] text-[#9e9e9e] font-semibold mt-0.5 leading-none">
                    Sync food items to Notion database automatically
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold">
                {profileData.notionApiKey && profileData.notionDatabaseId ? (
                  <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Linked</span>
                ) : (
                  <span className="text-stone-400 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Off</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
            */}

            {/* Reminders & Reports */}
            <div
              onClick={() => setActiveSubView("reminders")}
              className="flex justify-between items-center p-4 hover:bg-[#fcfcfc] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                  <Bell className="w-4 h-4 text-orange-550" />
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] text-xs">Reminders & Reports</div>
                  <div className="text-[9px] text-[#9e9e9e] font-semibold mt-0.5 leading-none">
                    Schedule daily reminders, weekly reports, and delivery channels
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold">
                {profileData.telegramReportsEnabled || profileData.telegramRemindersEnabled ? (
                  <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">On</span>
                ) : (
                  <span className="text-stone-400 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Off</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Plus Button Actions */}
            <div
              onClick={() => setActiveSubView("logging")}
              className="flex justify-between items-center p-4 hover:bg-[#fcfcfc] transition-colors cursor-pointer group border-t border-stone-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-550 shrink-0">
                  <Plus className="w-4 h-4 text-orange-550" />
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] text-xs">Plus Button Actions</div>
                  <div className="text-[9px] text-[#9e9e9e] font-semibold mt-0.5 leading-none">
                    Configure what happens when you tap the home Plus button
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold">
                <span className="text-stone-500 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">
                  {(() => {
                    const act = profileData.preferences?.find((p: string) => p.startsWith("plus_button_action:"))?.split(":")[1] || "ai_logger";
                    return act === "ai_logger" ? "AI" :
                           act === "quick_log" ? "Past" :
                           act === "detailed_log" ? "Form" :
                           act === "camera" ? "Camera" :
                           "GPT";
                  })()}
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Google Gemini API */}
            <div
              onClick={() => setActiveSubView("gemini")}
              className="flex justify-between items-center p-4 hover:bg-[#fcfcfc] transition-colors cursor-pointer group border-t border-stone-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-550 shrink-0">
                  <Sparkles className="w-4 h-4 text-orange-550 fill-orange-100" />
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] text-xs">Google Gemini Image API</div>
                  <div className="text-[9px] text-[#9e9e9e] font-semibold mt-0.5 leading-none">
                    Use your Gemini key for premium performance
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold">
                {geminiKey.trim() ? (
                  <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">On</span>
                ) : (
                  <span className="text-stone-400 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Off</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Health Sync (Apple Health & Google Fit) */}
            <div
              onClick={() => setActiveSubView("health_sync")}
              className="flex justify-between items-center p-4 hover:bg-[#fcfcfc] rounded-b-[18px] transition-colors cursor-pointer group border-t border-stone-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-550 shrink-0">
                  <Activity className="w-4 h-4 text-orange-550" />
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] text-xs">Health Sync</div>
                  <div className="text-[9px] text-[#9e9e9e] font-semibold mt-0.5 leading-none">
                    Apple Health & Google Fit (Smartwatches, Noise, Boat, Samsung)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold">
                {(profileData.preferences || []).some((p: string) => p.startsWith("health_sync_")) ? (
                  <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">On</span>
                ) : (
                  <span className="text-stone-400 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Configure</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Legal Policies */}
        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            Privacy & Compliance
          </h3>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-3">
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="w-full flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] text-xs">
                    Privacy Policy & Terms
                  </div>
                  <div className="text-[9px] text-stone-400 font-semibold leading-tight mt-0.5">
                    How FitAI protects your health data and AI meal prompts
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* Account Management */}
        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            Account Management
          </h3>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-bold text-[#1a1a1a] text-xs truncate">
                  {session?.user?.email
                    ? `Signed in as ${session.user.email}`
                    : profileData.name
                    ? `Signed in as ${profileData.name}`
                    : "Signed in"}
                </div>
                <div className="text-[9px] text-stone-400 font-semibold leading-tight mt-1">
                  Sign out of your account on this device
                </div>
              </div>
              <button
                onClick={onLogout}
                className="bg-stone-900 text-white hover:bg-stone-850 text-[9px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                Logout
              </button>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-bold text-red-600 text-xs flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Account & Data
                </div>
                <div className="text-[9px] text-stone-400 font-semibold leading-tight mt-0.5">
                  Permanently purge all meal logs, recipes, and user profile
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Policy Modal */}
        <PrivacyPolicyModal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
        />

        {/* Delete Account Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-6 font-sans">
              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl border border-stone-100 text-left space-y-4"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-stone-900">Delete entire account?</h3>
                    <p className="text-[10px] text-stone-400 font-semibold mt-0.5">This action is permanent and cannot be undone.</p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-2xl p-3.5 text-left text-red-900 text-[11px] leading-relaxed font-medium">
                  This will permanently delete all your logged meals, recipes, macro records, and custom settings from our servers immediately.
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isDeletingAccount}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-black uppercase tracking-wider py-3 rounded-xl cursor-pointer select-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingAccount}
                    onClick={handleDeleteAccount}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider py-3 rounded-xl cursor-pointer select-none shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5"
                  >
                    {isDeletingAccount ? "Deleting..." : "Purge Everything"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};
