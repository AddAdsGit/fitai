import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ArrowLeft, Bot, Sparkles, Database, Check, Bell, Phone, MessageSquare, Mail, Plus, Camera, Edit2, Search, X, Trash2, RotateCcw, Sliders, Heart, Mic, ShieldCheck, AlertTriangle, FileText, Activity, RefreshCw, CheckCircle2, XCircle, Clock, Sunrise, Sun, Moon, Droplets, BarChart3, VolumeX, Zap, Apple, Pill, Coffee, Utensils, Bug, BookOpen, HelpCircle, LogOut, User, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { ProUpgradeModal } from "./ProUpgradeModal";
import { ChatGPTIcon } from "./ChatGPTIcon";
import { performHealthSync, requestHealthPermissions, clearHealthSyncLogs, type SyncLogEntry } from "../services/healthSyncService";
import { PrivacyPolicyModal } from "./PrivacyPolicyModal";
import { DEFAULT_CUSTOM_GPT_URL, TELEGRAM_BOT_URL } from "../constants/app";
import { TimePickerModal } from "./TimePickerModal";

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

const GoogleFitIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className}>
    <path fill="#EA4335" d="M33.6 13.4c-2.3-2.3-6-2.3-8.3 0L24 14.7l-1.3-1.3c-2.3-2.3-6-2.3-8.3 0-2.3 2.3-2.3 6 0 8.3l1.3 1.3L24 31.3l8.3-8.3 1.3-1.3c2.3-2.3 2.3-6 0-8.3z" />
    <path fill="#4285F4" d="M12.7 13.4c-2.3 2.3-2.3 6 0 8.3l8.3 8.3 3-3-8.3-8.3-1.3-1.3c-.5-.5-1.1-.7-1.7-.7s-1.2.2-1.7.7z" />
    <path fill="#FBBC05" d="M21 30l3 3 8.3-8.3c2.3-2.3 2.3-6 0-8.3-1.1-1.1-2.6-1.7-4.1-1.7s-3 .6-4.2 1.7l-3 3.6z" />
    <path fill="#34A853" d="M24 33l-3-3-4.3 4.3c-1.2 1.2-1.2 3.1 0 4.3 1.2 1.2 3.1 1.2 4.3 0L24 35.6l3 3c1.2 1.2 3.1 1.2 4.3 0 1.2-1.2 1.2-3.1 0-4.3L24 33z" />
  </svg>
);

const AppleHealthIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="6" fill="#FF2D55" />
    <path
      d="M12 18.2S6 14.1 6 9.8c0-2.1 1.7-3.8 3.8-3.8 1.4 0 2.4.8 2.7 1.6.3-.8 1.3-1.6 2.7-1.6 2.1 0 3.8 1.7 3.8 3.8 0 4.3-6 8.4-6 8.4z"
      fill="white"
    />
  </svg>
);

export const SettingsView = ({
  profileData,
  setProfileData,
  triggerToast,
  onLogout,
  onEditProfile,
  setActiveTab,
  session,
}: {
  key?: string;
  profileData: any;
  setProfileData: any;
  triggerToast: (msg: string) => void;
  onLogout: () => void;
  onEditProfile?: () => void;
  setActiveTab?: (tab: string) => void;
  session: any;
}) => {
  const [showPro, setShowPro] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [activeSubView, setActiveSubView] = useState<"notion" | "reminders" | "gpt" | "telegram" | "logging" | "floating_widget" | "health_sync" | null>(null);

  // Android / Mobile browser popstate handler for Settings subviews & modals
  useEffect(() => {
    if (activeSubView !== null || showPrivacyModal || showDeleteConfirm) {
      if (!window.history.state?.fitaiSettingsSub) {
        window.history.pushState({ fitaiSettingsSub: true }, "");
      }
    }
  }, [activeSubView, showPrivacyModal, showDeleteConfirm]);

  useEffect(() => {
    const handleSubPopState = () => {
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
      } else if (showPrivacyModal) {
        setShowPrivacyModal(false);
      } else if (activeSubView !== null) {
        setActiveSubView(null);
      }
    };
    window.addEventListener("popstate", handleSubPopState);
    return () => window.removeEventListener("popstate", handleSubPopState);
  }, [activeSubView, showPrivacyModal, showDeleteConfirm]);

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

  // --- Telegram & Reminder States ---
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => {
    return (profileData.preferences || []).some((p: string) => p === "push_notifications:true");
  });
  const [isTelegramChannelOn, setIsTelegramChannelOn] = useState<boolean>(() => {
    return !!profileData.telegramChatId || !!profileData.telegramReportsEnabled || !!profileData.telegramRemindersEnabled;
  });
  const [tgBotToken, setTgBotToken] = useState(profileData.telegramBotToken || "");
  const [tgChatId, setTgChatId] = useState(profileData.telegramChatId || "");

  // Dynamic Reminder Slots (Breakfast, Lunch, Dinner, Custom times)
  const [reminderSlots, setReminderSlots] = useState<{ id: string; label: string; time: string; enabled: boolean; icon?: string }[]>(() => {
    const pref = (profileData.preferences || []).find((p: string) => p.startsWith("reminder_slots:"));
    if (pref) {
      try {
        const parsed = JSON.parse(pref.substring("reminder_slots:".length));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }

    const legacyTimes = profileData.telegramReminderTimes || ["08:30", "13:00", "20:00"];
    return [
      { id: "breakfast", label: "Breakfast", time: legacyTimes[0] || "08:30", enabled: profileData.telegramRemindersEnabled !== false, icon: "sunrise" },
      { id: "lunch", label: "Lunch", time: legacyTimes[1] || "13:00", enabled: profileData.telegramRemindersEnabled !== false, icon: "sun" },
      { id: "dinner", label: "Dinner", time: legacyTimes[2] || "20:00", enabled: profileData.telegramRemindersEnabled !== false, icon: "moon" },
      { id: "hydration", label: "Hydration & Water", time: "16:00", enabled: false, icon: "droplets" },
    ];
  });

  const [isAddingCustomSlot, setIsAddingCustomSlot] = useState(false);
  const [customSlotLabel, setCustomSlotLabel] = useState("");
  const [customSlotTime, setCustomSlotTime] = useState("10:30");
  const [customSlotIcon, setCustomSlotIcon] = useState("zap");

  const [editingTimeTarget, setEditingTimeTarget] = useState<{
    id: string;
    time: string;
    title: string;
    onConfirm: (newTime: string) => void;
  } | null>(null);

  const [macroGapAlert, setMacroGapAlert] = useState<boolean>(() => {
    const pref = (profileData.preferences || []).find((p: string) => p.startsWith("reminder_macro_gap:"));
    return pref ? pref.split(":")[1] === "true" : true;
  });

  // Daily Summary Wrap-Up
  const [dailyWrapUpEnabled, setDailyWrapUpEnabled] = useState<boolean>(() => {
    const pref = (profileData.preferences || []).find((p: string) => p.startsWith("reminder_wrapup:"));
    return pref ? pref.split(":")[1] === "true" : (profileData.telegramReportsEnabled !== false);
  });
  const [dailyWrapUpTime, setDailyWrapUpTime] = useState<string>(() => {
    const pref = (profileData.preferences || []).find((p: string) => p.startsWith("reminder_wrapup:"));
    return (pref && pref.split(":")[2]) || "21:30";
  });

  // Weekly Progress Review
  const [weeklyReviewEnabled, setWeeklyReviewEnabled] = useState<boolean>(() => {
    const pref = (profileData.preferences || []).find((p: string) => p.startsWith("reminder_weekly:"));
    return pref ? pref.split(":")[1] === "true" : true;
  });

  // Quiet Hours
  const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(() => {
    const pref = (profileData.preferences || []).find((p: string) => p.startsWith("reminder_quiet_hours:"));
    return pref ? pref.split(":")[1] === "true" : true;
  });

  const [userTimezone, setUserTimezone] = useState<string>(() => {
    return profileData.timezone || Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || "UTC";
  });
  const [isTestingTg, setIsTestingTg] = useState(false);
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);

  const formatTime12h = (time24: string) => {
    if (!time24) return "8:00 AM";
    const parts = time24.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    if (isNaN(h)) return time24;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  };

  const updateReminderSlotTime = (id: string, newTime: string) => {
    setReminderSlots(prev => prev.map(s => s.id === id ? { ...s, time: newTime } : s));
  };

  const toggleReminderSlot = (id: string) => {
    setReminderSlots(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const deleteReminderSlot = (id: string) => {
    setReminderSlots(prev => prev.filter(s => s.id !== id));
    triggerToast("Reminder removed");
  };

  const handleAddCustomReminderSlot = () => {
    if (!customSlotLabel.trim()) {
      triggerToast("Please enter a reminder name");
      return;
    }
    const newSlot = {
      id: `custom_${Date.now()}`,
      label: customSlotLabel.trim(),
      time: customSlotTime || "12:00",
      enabled: true,
      icon: customSlotIcon || "zap"
    };
    setReminderSlots(prev => [...prev, newSlot]);
    setCustomSlotLabel("");
    setCustomSlotIcon("zap");
    setIsAddingCustomSlot(false);
    triggerToast(`Added "${newSlot.label}" reminder!`);
  };

  const togglePushNotifications = async () => {
    const nextVal = !isPushEnabled;
    setIsPushEnabled(nextVal);
    const filtered = (profileData.preferences || []).filter((p: string) => !p.startsWith("push_notifications:"));
    if (nextVal) {
      filtered.push("push_notifications:true");
      if (typeof window !== "undefined" && "Notification" in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            triggerToast("Device notifications enabled!");
          } else {
            triggerToast("Please enable notifications in device settings");
          }
        } catch (_) {}
      }
    } else {
      filtered.push("push_notifications:false");
      triggerToast("Push notifications disabled");
    }
    setProfileData({ ...profileData, preferences: filtered });
  };

  const handleSendTestPush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      triggerToast("Push notifications not supported in this browser.");
      return;
    }
    if (Notification.permission !== "granted") {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          triggerToast("Please allow notifications in browser settings.");
          return;
        }
      } catch (_) {
        triggerToast("Please check browser notification settings.");
        return;
      }
    }
    try {
      new Notification("FitAI Meal Reminder", {
        body: "🌅 Reminder! Did you log your recent meal or vitals?",
        icon: "/favicon.ico",
      });
      triggerToast("⚡ Test notification sent!");
    } catch (_) {
      triggerToast("Notification active!");
    }
  };

  const openApiYaml = useMemo(() => getOpenApiYaml(edgeFunctionUrl), [edgeFunctionUrl]);

  // Notion Validations & Save
  const handleSaveNotion = () => {
    setProfileData({
      ...profileData,
      notionApiKey: notionEnabled ? notionKey : "",
      notionDatabaseId: notionEnabled ? notionDb : "",
    });
    triggerToast(notionEnabled ? "💾 Saved Notion Connection!" : "💾 Notion sync disabled");
    setActiveSubView(null);
  };

  // Reminders & Telegram Save
  const handleSaveReminders = () => {
    const filtered = (profileData.preferences || []).filter(
      (p: string) =>
        !p.startsWith("push_notifications:") &&
        !p.startsWith("reminder_slots:") &&
        !p.startsWith("reminder_only_if_unlogged:") &&
        !p.startsWith("reminder_macro_gap:") &&
        !p.startsWith("reminder_wrapup:") &&
        !p.startsWith("reminder_weekly:") &&
        !p.startsWith("reminder_quiet_hours:") &&
        !p.startsWith("reminder_breakfast:") &&
        !p.startsWith("reminder_lunch:") &&
        !p.startsWith("reminder_dinner:") &&
        !p.startsWith("reminder_hydration:")
    );

    filtered.push(`push_notifications:${isPushEnabled}`);
    filtered.push(`reminder_slots:${JSON.stringify(reminderSlots)}`);
    filtered.push(`reminder_only_if_unlogged:true`);
    filtered.push(`reminder_macro_gap:${macroGapAlert}`);
    filtered.push(`reminder_wrapup:${dailyWrapUpEnabled}:${dailyWrapUpTime}`);
    filtered.push(`reminder_weekly:${weeklyReviewEnabled}`);
    filtered.push(`reminder_quiet_hours:${quietHoursEnabled}`);

    const activeTimes = reminderSlots.filter(s => s.enabled).map(s => s.time);

    setProfileData({
      ...profileData,
      preferences: filtered,
      telegramReportsEnabled: dailyWrapUpEnabled,
      telegramRemindersEnabled: activeTimes.length > 0,
      telegramReminderTimes: activeTimes.length > 0 ? activeTimes : ["08:30", "13:00", "20:00"],
      timezone: userTimezone,
    });
    triggerToast("Saved Reminder preferences!");
    setActiveSubView(null);
  };

  const handleSaveTelegram = () => {
    setProfileData({
      ...profileData,
      telegramBotToken: tgBotToken.trim(),
      telegramChatId: isTelegramChannelOn ? tgChatId.trim() : "",
      telegramReportsEnabled: isTelegramChannelOn,
      telegramRemindersEnabled: isTelegramChannelOn,
    });
    triggerToast("Telegram settings saved!");
    setActiveSubView(null);
  };

  const handleTestTelegram = async () => {
    if (!tgChatId.trim()) {
      triggerToast("⚠️ Please enter a Telegram Chat ID first!");
      return;
    }
    setIsTestingTg(true);
    try {
      const res = await fetch(`${edgeFunctionUrl}/telegram/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: tgChatId.trim(),
          botToken: tgBotToken.trim() || undefined,
        }),
      });
      if (res.ok) {
        triggerToast("⚡ Test message sent successfully!");
      } else {
        triggerToast("❌ Failed to send message. Please check bot settings.");
      }
    } catch (_) {
      triggerToast("❌ Error contacting Telegram test server.");
    } finally {
      setIsTestingTg(false);
    }
  };

  // Render Sub-Views

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
        className="px-4 sm:px-6 mt-6 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/70 shadow-3xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block">
              Settings
            </span>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">Health Sync</h2>
          </div>
        </div>

        {/* Platform Overview Banner */}
        <div className="bg-orange-50/50 border border-orange-100/70 rounded-[28px] p-4.5 space-y-1.5 text-left shadow-3xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-orange-500" />
              <span className="text-xs font-black uppercase text-orange-950 tracking-wider">
                Smartwatches & Wearables
              </span>
            </div>
            {lastSyncedAt && (
              <span className="text-[9px] font-mono font-bold text-orange-800/80 bg-orange-100/70 px-2 py-0.5 rounded-full">
                Synced {new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <p className="text-[11px] font-medium text-stone-600 leading-relaxed">
            Automatically sync active calories burned, daily step counts, and body weight logs from your connected apps.
          </p>
        </div>

        {/* Unified Platform Connection Card */}
        <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-sm p-1.5 divide-y divide-stone-100/80">
          {/* Google Fit & Health Connect */}
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-white border border-stone-200/70 flex items-center justify-center shrink-0 shadow-3xs p-2">
                  <GoogleFitIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-stone-900">Google Fit</h4>
                    {isGfitOn && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                        Linked
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-stone-400 truncate">Android, Noise, Boat, Samsung, Fitbit</p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleGfit}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0 ml-2",
                  isGfitOn ? "bg-orange-500" : "bg-stone-200"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                    isGfitOn ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {isGfitOn && (
              <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100/80 text-[10px] font-medium text-stone-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Syncs active burn, steps, and weight data automatically</span>
              </div>
            )}
          </div>

          {/* Apple Health (HealthKit) */}
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-white border border-stone-200/70 flex items-center justify-center shrink-0 shadow-3xs p-2">
                  <AppleHealthIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-stone-900">Apple Health</h4>
                    {isAfitOn && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                        Linked
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-stone-400 truncate">Apple Watch, iPhone Health, HealthKit</p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleAfit}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0 ml-2",
                  isAfitOn ? "bg-orange-500" : "bg-stone-200"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                    isAfitOn ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {isAfitOn && (
              <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100/80 text-[10px] font-medium text-stone-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Syncs Apple Watch workouts, steps, and weight logs</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Connect & Sync Button */}
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={isHealthSyncing}
          className={cn(
            "w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all border-none",
            isHealthSyncing && "opacity-80 cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", isHealthSyncing && "animate-spin")} />
          <span>{isHealthSyncing ? "Syncing Health Data..." : "Connect & Sync Now"}</span>
        </button>

        {/* Sync & Error Logs Showcase */}
        <div className="bg-white p-4.5 rounded-[28px] border border-stone-200/80 shadow-sm space-y-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-stone-600" />
              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">Sync & Error Logs</h4>
              {logs.length > 0 && (
                <span className="text-[9px] font-mono font-black bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">
                  {logs.length}
                </span>
              )}
            </div>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="text-[10px] font-bold text-stone-400 hover:text-red-500 flex items-center gap-1 cursor-pointer transition-colors bg-transparent border-none"
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
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl border bg-stone-50/70 border-stone-100 space-y-1 shadow-3xs"
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
        className="px-4 sm:px-6 mt-6 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/70 shadow-3xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block">
              Settings
            </span>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">Notion Integration</h2>
          </div>
        </div>

        {/* Setup Guide */}
        <div className="bg-white rounded-[28px] p-5 border border-stone-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-950 flex items-center justify-center text-white font-black text-sm select-none shadow-3xs">
              N
            </div>
            <div>
              <div className="font-bold text-stone-900 text-xs">Notion database Sync</div>
              <div className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                Auto-syncs meal logs into a Notion database table
              </div>
            </div>
          </div>

          <div className="text-xs font-medium text-stone-600 space-y-2 pt-3 border-t border-stone-100 leading-relaxed">
            <p className="font-bold text-stone-900">How to Connect:</p>
            <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-stone-600 font-medium">
              <li>Go to <a href="https://notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-orange-600 hover:underline font-bold">notion.so/my-integrations ↗</a> and create a new internal integration. Copy your token.</li>
              <li>Open your Notion workspace and create a table database.</li>
              <li>Share the database page with your integration (click the three dots in Notion top-right → Add Connections).</li>
              <li>Copy the database ID from the URL (the 32-character string between the workspace name and the query mark).</li>
            </ol>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-900">Enable Syncing</span>
            <button
              onClick={() => setNotionEnabled(!notionEnabled)}
              className={cn(
                "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center",
                notionEnabled ? "bg-orange-500" : "bg-stone-200"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                  notionEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {notionEnabled && (
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1 px-1">
                  Internal Integration Token
                </label>
                <input
                  type="password"
                  placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={notionKey}
                  onChange={(e) => setNotionKey(e.target.value)}
                  className="w-full bg-stone-50 focus:bg-white border border-stone-200 focus:border-orange-400 rounded-2xl px-4 py-3 text-xs font-bold text-stone-900 outline-none transition-all placeholder:text-stone-300"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1 px-1">
                  Database UUID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8d39c0c8be034ff99971936c53e81d24"
                  value={notionDb}
                  onChange={(e) => setNotionDb(e.target.value)}
                  className="w-full bg-stone-50 focus:bg-white border border-stone-200 focus:border-orange-400 rounded-2xl px-4 py-3 text-xs font-bold text-stone-900 outline-none transition-all placeholder:text-stone-300"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSaveNotion}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider h-12 rounded-2xl cursor-pointer active:scale-[0.98] transition-all shadow-md shadow-orange-500/20 flex items-center justify-center mt-4"
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
        className="px-4 sm:px-6 mt-6 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/70 shadow-3xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block">
              Settings
            </span>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">Reminders & Alerts</h2>
          </div>
        </div>

        {/* 1. Push Notifications Toggle Card */}
        <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-sm p-4 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-3">
            <h4 className="text-xs font-black text-stone-900">Device Push Notifications</h4>
            <p className="text-[10px] font-semibold text-stone-400 truncate">Receive meal reminders on your device lock screen</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPushEnabled && (
              <button
                type="button"
                onClick={handleSendTestPush}
                className="text-[10px] font-black uppercase tracking-wider text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-3xs"
              >
                <span>Test</span>
              </button>
            )}

            <button
              type="button"
              onClick={togglePushNotifications}
              className={cn(
                "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0",
                isPushEnabled ? "bg-orange-500" : "bg-stone-200"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                  isPushEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        {/* 2. Scheduled Reminders (Customizable & Expandable) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">
              Scheduled Reminders
            </span>
            <span className="text-[9px] font-bold text-stone-400">
              {reminderSlots.filter(s => s.enabled).length} Active
            </span>
          </div>

          <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-sm p-1.5 divide-y divide-stone-100/80">
            {reminderSlots.map((slot) => (
              <div key={slot.id} className="p-3.5 flex items-center justify-between group">
                <div className="min-w-0 flex-1 pr-2">
                  <h4 className="text-xs font-black text-stone-900 truncate">{slot.label}</h4>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {/* Time Picker Button (Opens TimePickerModal) */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTimeTarget({
                        id: slot.id,
                        time: slot.time,
                        title: `Set ${slot.label} Time`,
                        onConfirm: (newTime) => updateReminderSlotTime(slot.id, newTime),
                      });
                    }}
                    className="text-[11px] font-black text-stone-700 bg-stone-100/90 hover:bg-stone-200/80 active:scale-95 px-2.5 py-1.5 rounded-xl border border-stone-200/70 shadow-3xs flex items-center gap-1.5 transition-all cursor-pointer border-none select-none"
                  >
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>{formatTime12h(slot.time)}</span>
                  </button>

                  {/* ON / OFF Switch */}
                  <button
                    type="button"
                    onClick={() => toggleReminderSlot(slot.id)}
                    className={cn(
                      "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0",
                      slot.enabled ? "bg-orange-500" : "bg-stone-200"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                        slot.enabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => deleteReminderSlot(slot.id)}
                    className="w-7 h-7 rounded-lg text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center cursor-pointer border-none bg-transparent"
                    title="Delete reminder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add Custom Reminder Slot */}
            <div className="p-3">
              {!isAddingCustomSlot ? (
                <button
                  type="button"
                  onClick={() => setIsAddingCustomSlot(true)}
                  className="w-full py-2.5 border border-dashed border-stone-200 hover:border-orange-300 hover:bg-orange-50/50 rounded-2xl text-[11px] font-black uppercase tracking-wider text-orange-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-transparent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Reminder</span>
                </button>
              ) : (
                <div className="p-4 bg-stone-50/90 rounded-2xl border border-stone-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                      New Reminder
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustomSlot(false);
                        setCustomSlotLabel("");
                      }}
                      className="text-stone-400 hover:text-stone-600 text-xs font-bold cursor-pointer bg-transparent border-none"
                    >
                      Cancel
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Reminder Name (e.g. Afternoon Snack, Fast-Break)"
                    value={customSlotLabel}
                    onChange={(e) => setCustomSlotLabel(e.target.value)}
                    className="w-full bg-white border border-stone-200 focus:border-orange-400 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 outline-none"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-stone-500">Time:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTimeTarget({
                            id: "custom_new",
                            time: customSlotTime,
                            title: "Set Reminder Time",
                            onConfirm: (newTime) => setCustomSlotTime(newTime),
                          });
                        }}
                        className="text-[11px] font-black text-stone-700 bg-white hover:bg-stone-50 active:scale-95 px-3 py-1.5 rounded-xl border border-stone-200 shadow-3xs flex items-center gap-1.5 transition-all cursor-pointer border-none"
                      >
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>{formatTime12h(customSlotTime)}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCustomReminderSlot}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl cursor-pointer shadow-3xs active:scale-95 transition-all border-none"
                    >
                      Save Reminder
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Advanced Smart Digests */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider px-1 block">
            Insights & Digests
          </span>
          <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-sm p-1.5 divide-y divide-stone-100/80">
            {/* Macro Gap Alert */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h4 className="text-xs font-black text-stone-900">Macro Gap Alert</h4>
                <p className="text-[10px] font-semibold text-stone-400 truncate">Evening prompt if &gt;20g protein remaining</p>
              </div>

              <button
                type="button"
                onClick={() => setMacroGapAlert(!macroGapAlert)}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0 ml-2",
                  macroGapAlert ? "bg-orange-500" : "bg-stone-200"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                    macroGapAlert ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Daily Report Summaries */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h4 className="text-xs font-black text-stone-900">Daily Progress Summary</h4>
                <p className="text-[10px] font-semibold text-stone-400 truncate">End-of-day calorie & macro milestone recap</p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTimeTarget({
                      id: "daily_wrapup",
                      time: dailyWrapUpTime,
                      title: "Daily Summary Time",
                      onConfirm: (newTime) => setDailyWrapUpTime(newTime),
                    });
                  }}
                  className="text-[11px] font-black text-stone-700 bg-stone-100/90 hover:bg-stone-200/80 active:scale-95 px-2.5 py-1.5 rounded-xl border border-stone-200/70 shadow-3xs flex items-center gap-1.5 transition-all cursor-pointer border-none select-none"
                >
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>{formatTime12h(dailyWrapUpTime)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDailyWrapUpEnabled(!dailyWrapUpEnabled)}
                  className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0",
                    dailyWrapUpEnabled ? "bg-orange-500" : "bg-stone-200"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                      dailyWrapUpEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Weekly Progress Review */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h4 className="text-xs font-black text-stone-900">Weekly Progress Review</h4>
                <p className="text-[10px] font-semibold text-stone-400 truncate">Sunday evening average & adherence review</p>
              </div>

              <button
                type="button"
                onClick={() => setWeeklyReviewEnabled(!weeklyReviewEnabled)}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0 ml-2",
                  weeklyReviewEnabled ? "bg-orange-500" : "bg-stone-200"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                    weeklyReviewEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Preferences & Quiet Hours */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider px-1 block">
            Preferences & Timing
          </span>
          <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-sm p-4 space-y-4">
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1 px-1">
                Timezone
              </label>
              <select
                value={userTimezone}
                onChange={(e) => setUserTimezone(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-400 cursor-pointer"
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

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h4 className="text-xs font-black text-stone-900">Quiet Hours (Auto-Mute)</h4>
                <p className="text-[10px] font-semibold text-stone-400 truncate">Silence alerts from 10:30 PM – 7:00 AM</p>
              </div>

              <button
                type="button"
                onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0 ml-2",
                  quietHoursEnabled ? "bg-orange-500" : "bg-stone-200"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                    quietHoursEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSaveReminders}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl cursor-pointer active:scale-[0.98] transition-all shadow-md shadow-orange-500/20 flex items-center justify-center border-none"
        >
          Save Reminders
        </button>

        {/* TimePicker Bottom Sheet Modal */}
        {editingTimeTarget && (
          <TimePickerModal
            isOpen={!!editingTimeTarget}
            onClose={() => setEditingTimeTarget(null)}
            initialTime={editingTimeTarget.time}
            title={editingTimeTarget.title}
            onSave={(newTime) => {
              editingTimeTarget.onConfirm(newTime);
              setEditingTimeTarget(null);
            }}
          />
        )}
      </motion.div>
    );
  }

  if (activeSubView === "telegram") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-4 sm:px-6 mt-6 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/70 shadow-3xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block">
              Integrations & Sync
            </span>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">Telegram Weekly Digest</h2>
          </div>
        </div>

        {/* Enable Switch Card */}
        <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-sm p-4 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-3">
            <h4 className="text-xs font-black text-stone-900">Sunday Weekly Digest</h4>
            <p className="text-[10px] font-semibold text-stone-400 truncate">7-day average calories, macro score & wellness recap</p>
          </div>

          <button
            type="button"
            onClick={() => setIsTelegramChannelOn(!isTelegramChannelOn)}
            className={cn(
              "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0",
              isTelegramChannelOn ? "bg-orange-500" : "bg-stone-200"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                isTelegramChannelOn ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Telegram Chat Configuration */}
        {isTelegramChannelOn && (
          <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-sm p-5 space-y-4">
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1 px-1">
                Setup Instructions
              </label>
              <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                1. Open <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer" className="text-orange-600 font-bold underline">@FitAIBot</a> in Telegram.
                <br />
                2. Send <code className="bg-stone-100 text-stone-800 px-1 py-0.5 rounded text-[10px] font-mono">/id</code> to get your Chat ID.
                <br />
                3. Paste your Chat ID below:
              </p>
            </div>

            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1 px-1">
                Telegram Chat ID
              </label>
              <input
                type="text"
                placeholder="e.g. 987654321"
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
                className="w-full bg-stone-50 focus:bg-white border border-stone-200 focus:border-orange-400 rounded-2xl px-4 py-3 text-xs font-bold text-stone-900 outline-none transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={isTestingTg}
              className="w-full border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-black uppercase tracking-wider py-3 rounded-2xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isTestingTg ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isTestingTg ? "Sending Digest..." : "Send Sample Weekly Digest"}</span>
            </button>
          </div>
        )}

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSaveTelegram}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl cursor-pointer active:scale-[0.98] transition-all shadow-md shadow-orange-500/20 flex items-center justify-center border-none"
        >
          Save Digest Settings
        </button>
      </motion.div>
    );
  }

  if (activeSubView === "gpt") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-4 sm:px-6 mt-6 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/70 shadow-3xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block">
              Settings
            </span>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">Custom GPT</h2>
          </div>
        </div>

        {/* Status card */}
        <div className="bg-white rounded-[28px] p-5 border border-stone-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 select-none">
            <div className="flex items-center gap-2">
              <ChatGPTIcon className="w-5 h-5 text-stone-800" />
              <span className="text-xs font-black text-stone-900 uppercase tracking-wider">ChatGPT Connection</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100/60">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-wider">Linked</span>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={DEFAULT_CUSTOM_GPT_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider h-12 rounded-2xl transition-all cursor-pointer shadow-md shadow-orange-500/20 active:scale-[0.98] text-center select-none border-none"
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
                className="text-[10px] font-bold text-stone-400 hover:text-red-500 transition-colors bg-transparent border-none p-0 cursor-pointer underline hover:no-underline"
              >
                Unlink Connection
              </button>
            </div>

            <div className="space-y-5 pt-3 border-t border-stone-100">

              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Generate Food Images</span>
                  <span className="text-[10px] text-stone-400 font-medium block leading-tight mt-0.5">Create AI/Stock food photos automatically for text-only logs</span>
                </div>
                <button
                  onClick={() => {
                    const current = profileData.agent_config || {};
                    const isEnabled = current.generateImages ?? true;
                    setProfileData({
                      ...profileData,
                      agent_config: { ...current, generateImages: !isEnabled }
                    });
                    triggerToast(!isEnabled ? "Image generation enabled!" : "Image generation disabled");
                  }}
                  className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0",
                    (profileData.agent_config?.generateImages ?? true) ? "bg-orange-500" : "bg-stone-200"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                      (profileData.agent_config?.generateImages ?? true) ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Require Log Confirmation</span>
                  <span className="text-[10px] text-stone-400 font-medium block leading-tight mt-0.5">Always ask for confirmation before saving logged meals</span>
                </div>
                <button
                  onClick={() => {
                    const current = profileData.agent_config || {};
                    const isEnabled = current.requireConfirmation ?? false;
                    setProfileData({
                      ...profileData,
                      agent_config: { ...current, requireConfirmation: !isEnabled }
                    });
                    triggerToast(!isEnabled ? "Log confirmation required!" : "Log confirmation optional");
                  }}
                  className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0",
                    (profileData.agent_config?.requireConfirmation ?? false) ? "bg-orange-500" : "bg-stone-200"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                      (profileData.agent_config?.requireConfirmation ?? false) ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">Refine Uploaded Photos with AI</span>
                    <span className="text-[10px] text-stone-400 font-medium block leading-tight mt-0.5">Replace uploaded food photos with styled AI versions</span>
                  </div>
                  <button
                    onClick={() => {
                      const current = profileData.agent_config || {};
                      const isEnabled = current.refinePhotos ?? false;
                      setProfileData({
                        ...profileData,
                        agent_config: { ...current, refinePhotos: !isEnabled }
                      });
                      triggerToast(!isEnabled ? "AI Photo Refinement enabled!" : "AI Photo Refinement disabled");
                    }}
                    className={cn(
                      "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border border-black/5 flex items-center shrink-0",
                      (profileData.agent_config?.refinePhotos ?? false) ? "bg-orange-500" : "bg-stone-200"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                        (profileData.agent_config?.refinePhotos ?? false) ? "translate-x-5" : "translate-x-0"
                      )}
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
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1">Visual Art Style</label>
                      <select
                        value={profileData.agent_config?.artStyle || "gourmet"}
                        onChange={(e) => {
                          const current = profileData.agent_config || {};
                          setProfileData({
                            ...profileData,
                            agent_config: { ...current, artStyle: e.target.value }
                          });
                        }}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none cursor-pointer"
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
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1">Custom Style Prompt</label>
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
                          className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-400"
                        />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Custom Instructions Textarea */}
              <div className="flex flex-col gap-1.5 pt-3 border-t border-stone-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-900">Custom Instructions to AI</label>
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
                      triggerToast("Reset to default instructions!");
                    }}
                    className="text-[10px] font-bold text-stone-400 hover:text-orange-500 transition-colors bg-transparent border-none p-0 cursor-pointer underline hover:no-underline"
                  >
                    Restore Default
                  </button>
                </div>
                <span className="text-[10px] text-stone-400 font-medium block leading-tight mb-2">Write strict behavioral rules for the agent (e.g. 'be brief', 'no greetings')</span>
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
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-400 min-h-[90px]"
                />
              </div>

              <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-3.5 text-[10px] text-orange-950 font-semibold leading-relaxed flex items-start gap-2 select-none shadow-3xs">
                <Sliders className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
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

    const ACTION_OPTIONS = [
      { id: "ai_logger", title: "AI Meal Logger", icon: Sparkles },
      { id: "camera", title: "Camera Scanner", icon: Camera },
      { id: "quick_log", title: "Past Foods", icon: Search },
      { id: "detailed_log", title: "Manual Form", icon: Edit2 },
      { id: "vitals", title: "Daily Vitals", icon: Heart },
      { id: "gpt_redirect", title: "Custom GPT", icon: Bot },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-4 sm:px-6 mt-6 relative z-10 space-y-4 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/70 shadow-3xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block">
              Quick Actions
            </span>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">Plus Button</h2>
          </div>
        </div>

        <div className="space-y-3">
          {ACTION_OPTIONS.map((opt) => {
            const isSelected = currentAction === opt.id;
            const IconComp = opt.icon;

            return (
              <div
                key={opt.id}
                onClick={() => {
                  const filteredPrefs = (profileData.preferences || []).filter((p: string) => !p.startsWith("plus_button_action:"));
                  filteredPrefs.push(`plus_button_action:${opt.id}`);
                  setProfileData({
                    ...profileData,
                    preferences: filteredPrefs
                  });
                  triggerToast(`Plus Button: ${opt.title}`);
                }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-[24px] border transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-orange-50/70 border-orange-200/80 shadow-xs"
                    : "bg-white border-stone-200/80 hover:border-stone-300 shadow-3xs"
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "bg-stone-50 text-stone-600 border border-stone-100"
                  )}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <h4 className={cn("text-xs font-black leading-tight", isSelected ? "text-orange-950" : "text-stone-900")}>
                    {opt.title}
                  </h4>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {currentAction === "gpt_redirect" && (
          <div className="mt-4 bg-white rounded-[28px] p-5 border border-stone-200/80 shadow-sm space-y-2 text-left">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block px-1">
              Custom GPT URL
            </label>
            <input
              type="text"
              placeholder="https://chatgpt.com/g/g-..."
              value={localStorage.getItem("fitai_custom_gpt_url") || DEFAULT_CUSTOM_GPT_URL}
              onChange={(e) => {
                localStorage.setItem("fitai_custom_gpt_url", e.target.value);
              }}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-400"
            />
          </div>
        )}
      </motion.div>
    );
  }

  if (activeSubView === "floating_widget") {
    const isWidgetDisabled = (profileData.agent_config?.showGptWidget === false) || (profileData.agent_config?.floatingWidgetAction === "none");
    const currentAction = isWidgetDisabled ? "none" : (profileData.agent_config?.floatingWidgetAction || "gpt");

    const FLOATING_ACTION_OPTIONS = [
      { id: "ai_logger", title: "AI Meal Logger", icon: Sparkles },
      { id: "camera", title: "Camera Scanner", icon: Camera },
      { id: "quick_log", title: "Past Foods", icon: Search },
      { id: "detailed_log", title: "Manual Form", icon: Edit2 },
      { id: "vitals", title: "Daily Vitals", icon: Heart },
      { id: "gpt", title: "Custom GPT", icon: Bot },
      { id: "none", title: "None (Hidden)", icon: EyeOff },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-4 sm:px-6 mt-6 relative z-10 space-y-4 pb-32 font-sans text-left"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer border border-stone-200/70 shadow-3xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block">
              Quick Actions
            </span>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">Floating Button</h2>
          </div>
        </div>

        <div className="space-y-3">
          {FLOATING_ACTION_OPTIONS.map((opt) => {
            const isSelected = currentAction === opt.id || (opt.id === "gpt" && currentAction === "gpt_redirect");
            const IconComp = opt.icon;

            return (
              <div
                key={opt.id}
                onClick={() => {
                  const current = profileData.agent_config || {};
                  if (opt.id === "none") {
                    setProfileData({
                      ...profileData,
                      agent_config: { ...current, showGptWidget: false, floatingWidgetAction: "none" }
                    });
                    triggerToast("Floating button hidden");
                  } else {
                    setProfileData({
                      ...profileData,
                      agent_config: { ...current, showGptWidget: true, floatingWidgetAction: opt.id }
                    });
                    triggerToast(`Floating Button: ${opt.title}`);
                  }
                }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-[24px] border transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-orange-50/70 border-orange-200/80 shadow-xs"
                    : "bg-white border-stone-200/80 hover:border-stone-300 shadow-3xs"
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "bg-stone-50 text-stone-600 border border-stone-100"
                  )}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <h4 className={cn("text-xs font-black leading-tight", isSelected ? "text-orange-950" : "text-stone-900")}>
                    {opt.title}
                  </h4>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(currentAction === "gpt" || currentAction === "gpt_redirect") && (
          <div className="mt-4 bg-white rounded-[28px] p-5 border border-stone-200/80 shadow-sm space-y-2 text-left">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block px-1">
              Custom GPT URL
            </label>
            <input
              type="text"
              placeholder="https://chatgpt.com/g/g-..."
              value={localStorage.getItem("fitai_custom_gpt_url") || DEFAULT_CUSTOM_GPT_URL}
              onChange={(e) => {
                localStorage.setItem("fitai_custom_gpt_url", e.target.value);
              }}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-400"
            />
          </div>
        )}
      </motion.div>
    );
  }

  // User Identity Helpers
  const userDisplayName = profileData?.name?.trim() || (session?.user?.email ? session.user.email.split("@")[0] : "FitAI Member");
  const userDisplayEmail = session?.user?.email || profileData?.name || "Active Member";
  const userInitials = (userDisplayName.split(" ").map((n: string) => n[0]).join("") || "F").toUpperCase().slice(0, 2);

  // --- Main Settings View ---
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="px-4 sm:px-6 pt-6 sm:pt-8 relative z-10 space-y-6 pb-32 font-sans text-left"
      >
        {/* Header Title with Back Button */}
        <div className="flex items-center gap-3">
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="w-9 h-9 rounded-2xl bg-white/80 hover:bg-white text-stone-600 flex items-center justify-center transition-all cursor-pointer border border-stone-200/70 shadow-3xs active:scale-95 shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-stone-700" />
            </button>
          )}
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase">
              Preferences & Tools
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-950">
              Settings
            </h2>
          </div>
        </div>

        {/* 1. Account & Goals Preview Card */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider px-1 block">
            Profile & Goals
          </span>
          <div
            onClick={() => {
              if (onEditProfile) {
                onEditProfile();
              } else if (setActiveTab) {
                setActiveTab("edit-profile");
              }
            }}
            className="bg-white/80 backdrop-blur-md rounded-[28px] border border-white/90 shadow-sm p-4 space-y-3.5 text-left cursor-pointer group hover:bg-white transition-all active:scale-[0.99]"
          >
            {/* User Info Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-orange-500/20 ring-2 ring-orange-100 shrink-0 select-none overflow-hidden">
                  {profileData?.imageUrl ? (
                    <img src={profileData.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    userInitials
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-stone-900 text-sm truncate">{userDisplayName}</h4>
                  <p className="text-[11px] font-semibold text-stone-400 truncate mt-0.5">{userDisplayEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-orange-600 font-bold shrink-0">
                <span className="text-orange-600 bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">Edit</span>
                <ChevronRight className="w-4 h-4 text-stone-400 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Quick Goals & Targets Preview Grid (Universal: Calorie Goal & Weight Goal) */}
            <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-stone-100/80">
              <div className="bg-stone-50/80 rounded-2xl p-2.5 text-center">
                <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">Calorie Goal</span>
                <span className="text-xs font-black text-stone-900 mt-0.5 block truncate">
                  {profileData.goals?.dailyCalories ? `${Number(profileData.goals.dailyCalories).toLocaleString()} kcal / day` : "2,000 kcal / day"}
                </span>
              </div>
              <div className="bg-stone-50/80 rounded-2xl p-2.5 text-center">
                <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">Weight Goal</span>
                <span className="text-xs font-black text-stone-900 mt-0.5 block truncate">
                  {profileData.goals?.weightGoal ? `${profileData.goals.weightGoal} kg target` : profileData.weight ? `${profileData.weight} kg current` : "Set Goal"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Quick Workflows & Logging Section */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider px-1 block">
            Workflows & Actions
          </span>
          <div className="bg-white/80 backdrop-blur-md rounded-[28px] border border-white/90 shadow-sm p-1.5 divide-y divide-stone-100/80 text-left">
            {/* Floating Button Actions */}
            <div
              onClick={() => setActiveSubView("floating_widget")}
              className="flex justify-between items-center px-3.5 py-3 hover:bg-orange-50/40 rounded-2xl transition-colors cursor-pointer group"
            >
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="font-bold text-stone-900 text-xs">Floating Button</h4>
                <p className="text-[10px] font-semibold text-stone-400 truncate">Quick logging shortcut overlay</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold shrink-0">
                <span className="text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                  {(() => {
                    const isOff = (profileData.agent_config?.showGptWidget === false) || (profileData.agent_config?.floatingWidgetAction === "none");
                    if (isOff) return "None";
                    const act = profileData.agent_config?.floatingWidgetAction || "gpt";
                    return act === "ai_logger" ? "AI" :
                           act === "camera" ? "Camera" :
                           act === "quick_log" ? "Past" :
                           act === "detailed_log" ? "Manual" :
                           act === "vitals" ? "Vitals" :
                           "GPT";
                  })()}
                </span>
                <ChevronRight className="w-4 h-4 text-stone-400 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Plus Button Actions */}
            <div
              onClick={() => setActiveSubView("logging")}
              className="flex justify-between items-center px-3.5 py-3 hover:bg-orange-50/40 rounded-2xl transition-colors cursor-pointer group"
            >
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="font-bold text-stone-900 text-xs">Plus Button Action</h4>
                <p className="text-[10px] font-semibold text-stone-400 truncate">Bottom navigation action menu</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold shrink-0">
                <span className="text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                  {(() => {
                    const act = profileData.preferences?.find((p: string) => p.startsWith("plus_button_action:"))?.split(":")[1] || "ai_logger";
                    return act === "ai_logger" ? "AI" :
                           act === "camera" ? "Camera" :
                           act === "quick_log" ? "Past" :
                           act === "detailed_log" ? "Manual" :
                           act === "vitals" ? "Vitals" :
                           "GPT";
                  })()}
                </span>
                <ChevronRight className="w-4 h-4 text-stone-400 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Notifications & Sync */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider px-1 block">
            Alerts & Sync
          </span>
          <div className="bg-white/80 backdrop-blur-md rounded-[28px] border border-white/90 shadow-sm p-1.5 divide-y divide-stone-100/80 text-left">
            {/* Reminders & Alerts */}
            <div
              onClick={() => setActiveSubView("reminders")}
              className="flex justify-between items-center px-3.5 py-3 hover:bg-orange-50/40 rounded-2xl transition-colors cursor-pointer group"
            >
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="font-bold text-stone-900 text-xs">Reminders & Alerts</h4>
                <p className="text-[10px] font-semibold text-stone-400 truncate">Meal schedules, digests & smart timing</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold shrink-0">
                {isPushEnabled || profileData.telegramReportsEnabled || profileData.telegramRemindersEnabled ? (
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">On</span>
                ) : (
                  <span className="text-stone-500 bg-stone-100 border border-stone-200/60 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">Off</span>
                )}
                <ChevronRight className="w-4 h-4 text-stone-400 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Health Sync (Apple Health & Google Fit) */}
            <div
              onClick={() => setActiveSubView("health_sync")}
              className="flex justify-between items-center px-3.5 py-3 hover:bg-orange-50/40 rounded-2xl transition-colors cursor-pointer group"
            >
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="font-bold text-stone-900 text-xs">Health Sync (Wearables)</h4>
                <p className="text-[10px] font-semibold text-stone-400 truncate">Apple Health, Google Fit & step tracking</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold shrink-0">
                {(profileData.preferences || []).some((p: string) => p.startsWith("health_sync_")) ? (
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">On</span>
                ) : (
                  <span className="text-stone-500 bg-stone-100 border border-stone-200/60 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">Setup</span>
                )}
                <ChevronRight className="w-4 h-4 text-stone-400 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. AI & External Integrations */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider px-1 block">
            AI & Integrations
          </span>
          <div className="bg-white/80 backdrop-blur-md rounded-[28px] border border-white/90 shadow-sm p-1.5 divide-y divide-stone-100/80 text-left">
            {/* Custom GPT */}
            <div
              onClick={() => setActiveSubView("gpt")}
              className="flex justify-between items-center px-3.5 py-3 hover:bg-orange-50/40 rounded-2xl transition-colors cursor-pointer group"
            >
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="font-bold text-stone-900 text-xs">Custom GPT</h4>
                <p className="text-[10px] font-semibold text-stone-400 truncate">ChatGPT logging action endpoint</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold shrink-0">
                <span className="text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">On</span>
                <ChevronRight className="w-4 h-4 text-stone-400 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Telegram Reports */}
            <div
              onClick={() => setActiveSubView("telegram")}
              className="flex justify-between items-center px-3.5 py-3 hover:bg-orange-50/40 rounded-2xl transition-colors cursor-pointer group"
            >
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="font-bold text-stone-900 text-xs">Telegram Weekly Digest</h4>
                <p className="text-[10px] font-semibold text-stone-400 truncate">Sunday macro & wellness progress summary</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold shrink-0">
                {profileData.telegramChatId ? (
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">Connected</span>
                ) : (
                  <span className="text-stone-500 bg-stone-100 border border-stone-200/60 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">Off</span>
                )}
                <ChevronRight className="w-4 h-4 text-stone-400 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Minimalist Utility Icons Bar (Bug Report, Docs, Privacy, Delete Account) */}
        <div className="pt-4 flex flex-col items-center gap-4">
          {/* Clean Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer py-1 px-3.5 rounded-xl hover:bg-stone-200/50 border border-stone-200/60 bg-white/60 shadow-3xs flex items-center gap-1.5 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-stone-400" />
              <span>Log out as <span className="text-stone-800 font-black">{userDisplayEmail}</span></span>
            </button>
          )}

          <div className="flex items-center justify-center gap-3">
            {/* 1. Bug Report */}
            <button
              type="button"
              onClick={() => triggerToast("Bug reporting opened")}
              className="w-10 h-10 rounded-2xl bg-white/80 hover:bg-white border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-500 hover:text-stone-800 transition-all active:scale-95 cursor-pointer"
              title="Report a Bug"
            >
              <Bug className="w-4 h-4" />
            </button>

            {/* 2. Documentation */}
            <button
              type="button"
              onClick={() => triggerToast("Documentation coming soon!")}
              className="w-10 h-10 rounded-2xl bg-white/80 hover:bg-white border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-500 hover:text-stone-800 transition-all active:scale-95 cursor-pointer"
              title="Documentation & Guides"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* 3. Privacy & Legal (Opens Bottom Sheet Modal) */}
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="w-10 h-10 rounded-2xl bg-white/80 hover:bg-white border border-stone-200/80 shadow-3xs flex items-center justify-center text-stone-500 hover:text-stone-800 transition-all active:scale-95 cursor-pointer"
              title="Privacy Policy & Terms"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            {/* 4. Delete Account (Opens Bottom Sheet Modal) */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-10 h-10 rounded-2xl bg-white/80 hover:bg-rose-50 border border-stone-200/80 hover:border-rose-200 shadow-3xs flex items-center justify-center text-rose-500 hover:text-rose-600 transition-all active:scale-95 cursor-pointer"
              title="Delete Account"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] font-semibold text-stone-400">
            FitAI • Mindful Nutrition & Analytics
          </p>
        </div>

        {/* Privacy Policy Modal */}
        <PrivacyPolicyModal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
        />

        {/* Delete Account Confirmation Modal */}
        {createPortal(
          <AnimatePresence>
            {showDeleteConfirm && (
              <div
                className="fixed inset-0 z-[99999] flex items-end justify-center font-sans"
                onClick={(e) => {
                  if (e.target === e.currentTarget && !isDeletingAccount) setShowDeleteConfirm(false);
                }}
              >
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isDeletingAccount && setShowDeleteConfirm(false)}
                  className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm cursor-pointer touch-none"
                />

                {/* Bottom Sheet Card */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 280 }}
                  className="bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-6 pb-[max(20px,env(safe-area-inset-bottom,20px))] text-left space-y-4 overscroll-contain touch-pan-y"
                >
                  {/* Top Drag Indicator Pill */}
                  <div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-2 shrink-0 select-none" />

                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-3xs">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-black text-stone-900 tracking-tight">Delete entire account?</h3>
                      <p className="text-xs text-stone-400 font-medium mt-0.5">This action is permanent and cannot be undone.</p>
                    </div>
                  </div>

                  <div className="bg-white border border-red-200/80 rounded-2xl p-4 text-left text-red-950 text-xs leading-relaxed font-medium shadow-3xs">
                    This will permanently delete all your logged meals, recipes, macro records, and custom settings from our servers immediately.
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 select-none">
                    <button
                      type="button"
                      disabled={isDeletingAccount}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="h-12 bg-stone-200/80 hover:bg-stone-300 text-stone-700 text-xs font-black uppercase tracking-wider rounded-2xl cursor-pointer select-none transition-all active:scale-[0.98] border-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingAccount}
                      onClick={handleDeleteAccount}
                      className="h-12 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl cursor-pointer select-none shadow-md shadow-red-500/20 active:scale-[0.98] border-none flex items-center justify-center gap-1.5"
                    >
                      {isDeletingAccount ? "Deleting..." : "Purge Everything"}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </motion.div>
    </>
  );
};
