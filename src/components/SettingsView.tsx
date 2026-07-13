import React, { useState, useMemo } from "react";
import { ChevronRight, ArrowLeft, Bot, Sparkles, Database, Check, Bell, Phone, MessageSquare, Mail, Plus, Camera, Edit2, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { ProUpgradeModal } from "./ProUpgradeModal";
import { ChatGPTIcon } from "./ChatGPTIcon";

const getOpenApiYaml = (edgeFunctionUrl: string) => `openapi: 3.1.0
info:
  title: FitAI GPT Sync Action API
  description: |
    API for synchronizing user profiles, food/nutrition logs, recipes, and memories with the FitAI dashboard.
  version: 1.0.0
servers:
  - url: ${edgeFunctionUrl}
paths:
  /profile:
    get:
      summary: Retrieve the user's profile details
      operationId: getProfile
      responses:
        '200':
          description: Returns profile metadata including goals, agent_config, agent_memory, and knowledge (preferences, health, notes, patterns).
    post:
      summary: Update user profile details
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
                daily_calories_goal:
                  type: integer
                weight_goal:
                  type: number
                preferences:
                  type: array
                  description: Dietary tags (e.g. Keto, Vegan, Gluten Free)
                  items:
                    type: string
                telegram_reminders_enabled:
                  type: boolean
                  description: Enable or disable daily/periodic logging reminder pings.
                telegram_reports_enabled:
                  type: boolean
                  description: Enable or disable the end-of-day summary reports.
                telegram_reminder_times:
                  type: array
                  description: Array of time strings in 24-hour HH:MM format when reminders should be sent (e.g. ["09:00", "20:00"]).
                  items:
                    type: string
                timezone:
                  type: string
                  description: The user's local timezone (e.g. "Asia/Kolkata", "America/New_York").
                knowledge_preferences:
                  type: array
                  description: Factual food likes/dislikes (e.g. "likes eggs")
                  items:
                    type: string
                knowledge_health:
                  type: array
                  description: Medical/allergy facts (e.g. "lactose intolerant")
                  items:
                    type: string
                knowledge_notes:
                  type: array
                  description: General routines or dietary observations (e.g. "usually eats late")
                  items:
                    type: string
                knowledge_patterns:
                  type: array
                  description: Multi-log health correlations (e.g. "biryani from restaurant X causes bloating")
                  items:
                    type: string
                agent_memory:
                  type: array
                  description: Tone and style choices for the agent (e.g. "prefers brief replies")
                  items:
                    type: string
      responses:
        '200':
          description: Profile updated successfully
  /meals:
    get:
      summary: Get logged meals for a specific date
      operationId: getMeals
      parameters:
        - name: date
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Logged meals retrieved successfully
    post:
      summary: Log a new meal
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
                calories:
                  type: integer
                protein:
                  type: integer
                carbs:
                  type: integer
                fats:
                  type: integer
                type:
                  type: string
                time:
                  type: string
                date:
                  type: string
                timezone:
                  type: string
      responses:
        '201':
          description: Meal logged successfully
    delete:
      summary: Delete a logged meal
      operationId: deleteMeal
      parameters:
        - name: id
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Meal deleted successfully
    patch:
      summary: Update a logged meal
      operationId: updateMeal
      parameters:
        - name: id
          in: query
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
                carbs:
                  type: integer
                fats:
                  type: integer
                type:
                  type: string
                time:
                  type: string
                date:
                  type: string
      responses:
        '200':
          description: Meal updated successfully
  /recipes:
    get:
      summary: List user recipes
      operationId: getRecipes
      responses:
        '200':
          description: Recipes retrieved successfully
    post:
      summary: Save a new custom recipe
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
                calories:
                  type: integer
                protein:
                  type: integer
                carbs:
                  type: integer
                fats:
                  type: integer
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
      responses:
        '201':
          description: Recipe saved successfully
  /weight:
    get:
      summary: Get weight history logs
      operationId: getWeightLogs
      responses:
        '200':
          description: Weight logs retrieved successfully
    post:
      summary: Log a weight entry
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
      responses:
        '200':
          description: Weight log saved successfully
  /daily-wellness:
    get:
      summary: Get daily wellness/health notes for a specific date
      operationId: getDailyWellness
      parameters:
        - name: date
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Wellness notes retrieved successfully
    post:
      summary: Save or update daily wellness notes
      operationId: saveDailyWellness
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - notes
              properties:
                date:
                  type: string
                  description: YYYY-MM-DD. Defaults to today.
                notes:
                  type: string
                  description: The text content of the daily wellness or health note.
      responses:
        '200':
          description: Daily wellness notes saved successfully
components:
  schemas: {}
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
security:
  - BearerAuth: []`;

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
  const [activeSubView, setActiveSubView] = useState<"notion" | "reminders" | "gpt" | "logging" | null>(null);

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/gpt-action`;

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
              <li>Start a conversation with the official **[FitAI Telegram Bot](https://t.me/FitAILoggerBot)**.</li>
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
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 animate-pulse" />
            <div>
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">OAuth Connection Ready</p>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5 leading-relaxed">
                Connect FitAI to your ChatGPT account. Once opened, simply log in when prompted to link your profile, logs, and recipes in real-time.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-stone-100 text-[10px] leading-relaxed font-semibold text-stone-550">
            <p className="font-extrabold text-stone-700">Open FitAI on ChatGPT:</p>
            
            <a
              href="https://chatgpt.com/g/g-6a4f69a8803c8191b29bc51494b65b1c-fitai"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider py-3.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-orange-100/50 active:scale-99 text-center select-none border-none"
            >
              <ChatGPTIcon className="w-4 h-4 text-white" />
              <span>Open FitAI Custom GPT ↗</span>
            </a>

            <div className="space-y-5 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-stone-700 block">Show ChatGPT Floating Widget</span>
                  <span className="text-[9px] text-stone-400 font-medium block leading-tight">Display a quick access button on your homepage</span>
                </div>
                <button
                  onClick={() => {
                    const current = profileData.agent_config || {};
                    const isEnabled = current.showGptWidget ?? true;
                    setProfileData({
                      ...profileData,
                      agent_config: { ...current, showGptWidget: !isEnabled }
                    });
                    triggerToast(!isEnabled ? "💬 Floating widget enabled!" : "💬 Floating widget hidden");
                  }}
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative flex items-center cursor-pointer ${
                    (profileData.agent_config?.showGptWidget ?? true) ? "bg-emerald-500" : "bg-stone-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                      (profileData.agent_config?.showGptWidget ?? true) ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

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
                <label className="text-[10px] font-bold text-stone-700 block">Custom Instructions to AI</label>
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

              {/* Disconnect / Reset Section */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <div>
                  <span className="text-[10px] font-bold text-stone-700 block">Disconnect ChatGPT Integration</span>
                  <span className="text-[9px] text-stone-400 font-medium block leading-tight">
                    Revoke ChatGPT's access token immediately. You will need to sign in again from ChatGPT to re-link your profile.
                  </span>
                </div>
                <button
                  onClick={() => {
                    const confirmReset = window.confirm(
                      "Are you sure you want to disconnect ChatGPT? This will rotate your security API key and immediately revoke all existing ChatGPT connections."
                    );
                    if (confirmReset) {
                      const newKey = "fit_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
                      setProfileData({
                        ...profileData,
                        api_key: newKey
                      });
                      triggerToast("🔒 ChatGPT disconnected! Access token revoked.");
                    }
                  }}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider py-3.5 rounded-xl transition-all cursor-pointer text-center active:scale-99 border-none"
                >
                  Disconnect ChatGPT (Rotate Key)
                </button>
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
                  value={localStorage.getItem("fitai_custom_gpt_url") || "https://chatgpt.com/g/g-6a4f69a8803c8191b29bc51494b65b1c-fitai"}
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
                <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Active</span>
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
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
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
                    return act === "ai_logger" ? "AI Logger" :
                           act === "quick_log" ? "Past Foods" :
                           act === "detailed_log" ? "Manual Form" :
                           act === "camera" ? "Camera Direct" :
                           "Custom GPT";
                  })()}
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Google Gemini API */}
            <div
              onClick={() => setActiveSubView("gemini")}
              className="flex justify-between items-center p-4 hover:bg-[#fcfcfc] rounded-b-[18px] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                  <Sparkles className="w-4 h-4 text-orange-500 fill-orange-100" />
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
                  <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Linked</span>
                ) : (
                  <span className="text-stone-400 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Not Linked</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Account Management */}
        <div>
          <h3 className="text-[11px] font-medium text-[#9e9e9e] uppercase tracking-[0.1em] mb-2 px-3">
            Account Management
          </h3>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-bold text-[#1a1a1a] text-xs">
                {profileData.username
                  ? `Logged in as @${profileData.username}`
                  : session?.user?.email
                  ? `Signed in as ${session.user.email}`
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
        </div>
      </motion.div>
    </>
  );
};
