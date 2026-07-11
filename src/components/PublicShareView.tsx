import React, { useState, useEffect } from "react";
import { Flame, ArrowRight, BookOpen, User, AlertCircle, RefreshCw, Sparkles, Check, CheckSquare, Square, Utensils, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SharedItemPayload, decodeBase64ToPayload, decompressToMeal, decompressToRecipe } from "../utils/shareUtils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

interface PublicShareViewProps {
  shareId: string | null;
  shareTypeParam: string | null;
  shareDataParam: string | null;
  activeProfileId: string | null;
  onImportMeal: (meal: any) => void;
  onImportRecipe: (recipe: any) => Promise<void>;
  onNavigateToDashboard: () => void;
  triggerToast: (msg: string) => void;
  onAuthSuccess: (userId: string) => void;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({
  shareId,
  shareTypeParam,
  shareDataParam,
  activeProfileId,
  onImportMeal,
  onImportRecipe,
  onNavigateToDashboard,
  triggerToast,
  onAuthSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SharedItemPayload | null>(null);
  const [itemType, setItemType] = useState<"meal" | "recipe" | null>(null);
  
  // Interactive cooking checkbox list state for recipes
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  // Auth states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSharedItem() {
      setLoading(true);
      setError(null);

      // 1. Fetch from shares table
      if (shareId && isSupabaseConfigured) {
        try {
          const { data, error: fetchErr } = await supabase
            .from("shares")
            .select("*")
            .eq("id", shareId)
            .maybeSingle();

          if (fetchErr) throw fetchErr;
          if (data) {
            setPayload(data.data);
            setItemType(data.type);
            setLoading(false);
            return;
          }
        } catch (err: any) {
          console.warn("DB Share fetch failed, trying query parameters:", err);
        }
      }

      // 2. Fallback to base64 parameters
      if (shareTypeParam && shareDataParam) {
        const decoded = decodeBase64ToPayload(shareDataParam);
        if (decoded) {
          setPayload(decoded);
          setItemType(shareTypeParam as "meal" | "recipe");
          setLoading(false);
          return;
        }
      }

      setError("We couldn't retrieve this shared item. The link may have expired or is malformed.");
      setLoading(false);
    }

    loadSharedItem();
  }, [shareId, shareTypeParam, shareDataParam]);

  const handleImportAction = async () => {
    if (!payload || !itemType) return;
    try {
      if (itemType === "meal") {
        const meal = decompressToMeal(payload);
        onImportMeal(meal);
        triggerToast(`🎉 Logged "${payload.n}" to your plate!`);
      } else {
        const recipe = decompressToRecipe(payload);
        await onImportRecipe(recipe);
        triggerToast(`🍲 Saved "${payload.n}" to your recipe collection!`);
      }
      onNavigateToDashboard();
    } catch (err: any) {
      triggerToast("❌ Import failed: " + (err.message || "Unknown error"));
    }
  };

  const handleStartImport = async () => {
    if (activeProfileId) {
      await handleImportAction();
    } else {
      document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" });
      triggerToast("🔐 Please sign up or log in to import this shared item!");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === "signup") {
        if (!username.trim()) throw new Error("Please enter a username");
        const { data: authData, error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        if (!authData.user) throw new Error("Signup failed");

        const newKey = "fit_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const { error: profileErr } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            username: username.toLowerCase().replace(/[^a-z0-9]/g, ''),
            display_name: username,
            daily_calories_goal: 2000,
            api_key: newKey,
            preferences: ["onboarded"]
          });

        if (profileErr) throw profileErr;
        onAuthSuccess(authData.user.id);
      } else {
        const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        if (!authData.user) throw new Error("Sign in failed");
        onAuthSuccess(authData.user.id);
      }

      setTimeout(async () => {
        await handleImportAction();
      }, 800);
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
      triggerToast("❌ Auth failed: " + (err.message || "Error"));
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-8 font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
        <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mt-4">
          Loading shared dossier...
        </p>
      </div>
    );
  }

  if (error || !payload || !itemType) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center font-sans">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-black text-stone-850">Shared Dossier Unavailable</h2>
        <p className="text-xs text-stone-500 mt-2 max-w-xs">{error || "No shared item payload found."}</p>
        <button
          onClick={onNavigateToDashboard}
          className="mt-6 bg-stone-900 text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-2xl cursor-pointer"
        >
          Go to FitAI
        </button>
      </div>
    );
  }

  const hasImage = !!payload.img;

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 pb-24 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
      <div>
        {/* Dynamic header for branding */}
        <header className="px-6 pt-8 flex items-center justify-between border-b border-stone-200/40 pb-4 bg-white/40 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
              <Flame className="text-white w-4.5 h-4.5" />
            </div>
            <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-orange-400">
              FitAI Shared
            </h1>
          </div>
          <span className="px-2.5 py-1 bg-stone-100 border border-stone-200 text-stone-600 rounded-full text-[9px] font-black uppercase tracking-wider">
            {itemType === "meal" ? "Meal Card" : "Gourmet Recipe"}
          </span>
        </header>

        {/* ----------------- MEAL SHOWCASE VIEW ----------------- */}
        {itemType === "meal" && (
          <section className="px-6 py-8 flex flex-col items-center gap-6 bg-gradient-to-b from-orange-50/20 to-transparent">
            {/* Infographic Preview Card (High Fidelity full bleed style matching dashboard) */}
            <div
              style={hasImage ? { backgroundImage: `url(${payload.img})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              className="w-full aspect-square rounded-[32px] p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden bg-stone-900 text-stone-100 border border-stone-850"
            >
              {hasImage && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/30 z-0 pointer-events-none" />
              )}
              
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-white text-orange-500 flex items-center justify-center">
                    <Flame className="w-3.5 h-3.5 fill-orange-500" />
                  </div>
                  <span className="text-xs font-black tracking-tight">FitAI</span>
                </div>
                <span className="px-2 py-0.5 bg-white/20 text-white rounded text-[7px] font-black tracking-wider uppercase">
                  MEAL LOGGED
                </span>
              </div>

              <div className="my-auto space-y-4 z-10 text-left">
                <h2 className="text-2xl font-black leading-tight tracking-tight line-clamp-2">
                  {payload.n}
                </h2>
                {payload.t && (
                  <span className="text-xs font-black text-orange-400 block uppercase tracking-wider">
                    ⏱️ LOGGED AT {payload.t}
                  </span>
                )}
                <div>
                  <span className="text-6xl font-black tracking-tighter">{payload.c}</span>
                  <span className="text-[10px] font-bold text-stone-300 block tracking-widest mt-1">
                    TOTAL KCAL
                  </span>
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-3 border-t pt-6 border-white/20 z-10">
                {[
                  { label: "Protein", val: payload.p, col: "bg-orange-500" },
                  { label: "Carbs", val: payload.cb, col: "bg-cyan-500" },
                  { label: "Fats", val: payload.f, col: "bg-yellow-500" }
                ].map((m) => (
                  <div key={m.label} className="p-2.5 rounded-2xl text-center bg-white/10 border border-white/10">
                    <span className="text-[9px] font-black text-stone-300 block uppercase tracking-wider">
                      {m.label}
                    </span>
                    <span className="text-sm font-extrabold mt-1 block">{m.val}g</span>
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-[10px] text-stone-400 font-semibold tracking-wider uppercase mt-1">
              Shareable Infographic Snap
            </p>
          </section>
        )}

        {/* ----------------- RECIPE DOSSIER WEBPAGE VIEW ----------------- */}
        {itemType === "recipe" && (
          <section className="flex flex-col">
            {/* Gourmet Top Banner Image Header */}
            <div className="h-60 w-full relative bg-stone-900">
              {hasImage ? (
                <img
                  src={payload.img}
                  className="w-full h-full object-cover"
                  alt={payload.n}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-stone-850 to-stone-950 flex items-center justify-center">
                  <Utensils className="w-12 h-12 text-white opacity-20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/35 to-black/10 pointer-events-none" />

              {/* Banner Details Overlay */}
              <div className="absolute bottom-5 left-6 right-6 text-left">
                {payload.tags && payload.tags.length > 0 && (
                  <div className="flex gap-1.5 mb-1.5 flex-wrap">
                    {payload.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-orange-500 text-white rounded-md text-[8px] font-black uppercase tracking-widest"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <h2 className="text-white text-2xl font-black leading-tight tracking-tight drop-shadow-sm">
                  {payload.n}
                </h2>
                <p className="text-xs text-white/80 font-bold mt-1 flex items-center gap-1">
                  ⏱️ Prep Time: {payload.t}
                </p>
              </div>
            </div>

            {/* In-app styled Macronutrient Density Dashboard widget */}
            <div className="px-6 mt-8">
              <div className="bg-white border border-stone-200/50 rounded-[32px] p-6 shadow-xs text-left">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                    Macronutrient Density
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-black text-orange-600">
                    <span>🔥 {payload.c} kcal</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: "Protein", v: payload.p, col: "bg-orange-500", rawCol: "orange" },
                    { l: "Carbs", v: payload.cb, col: "bg-blue-500", rawCol: "blue" },
                    { l: "Fats", v: payload.f, col: "bg-yellow-500", rawCol: "yellow" }
                  ].map((m) => (
                    <div key={m.l} className={`p-3 rounded-2xl border bg-stone-50/50 border-stone-100 flex flex-col justify-between`}>
                      <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{m.l}</span>
                      <span className="text-base font-black text-stone-900 mt-2 block">{m.v}g</span>
                      {/* Sub progress indicator */}
                      <div className="w-full h-1 bg-stone-100 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full ${m.col}`} style={{ width: `${Math.min(100, (m.v / 100) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive checkable Cooking Checklist */}
            {payload.ing && payload.ing.length > 0 && (
              <div className="px-6 mt-6">
                <div className="bg-white border border-stone-200/50 rounded-[32px] p-6 shadow-xs text-left space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-orange-500" />
                    <span>Ingredients Checklist</span>
                  </h3>
                  <div className="space-y-2.5">
                    {payload.ing.map((ing, idx) => {
                      const isChecked = !!checkedIngredients[idx];
                      return (
                        <button
                          key={idx}
                          onClick={() => setCheckedIngredients(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          className="w-full flex gap-3 items-center text-left py-2 border-b border-stone-50 hover:bg-stone-50/50 px-2 rounded-xl transition-colors cursor-pointer select-none"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-orange-500 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-stone-300 shrink-0" />
                          )}
                          <span className={`text-xs font-bold transition-all ${
                            isChecked ? "text-stone-400 line-through" : "text-stone-750"
                          }`}>
                            {ing}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Cooking steps details */}
            {payload.ins && (
              <div className="px-6 mt-6">
                <div className="bg-white border border-stone-200/50 rounded-[32px] p-6 shadow-xs text-left">
                  <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-wider mb-3">
                    Preparation Steps
                  </h3>
                  <p className="text-xs font-semibold leading-relaxed text-stone-650 whitespace-pre-line bg-stone-50/30 p-3 rounded-2xl border border-stone-100/50">
                    {payload.ins}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Primary CTA controls for shared views */}
        <section className="px-6 py-6 flex flex-col gap-3">
          {itemType === "recipe" && (
            <button
              onClick={handleStartImport}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-200/50 active:scale-98 transition-all"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Save this Recipe to Collection</span>
            </button>
          )}

          {activeProfileId && (
            <button
              onClick={onNavigateToDashboard}
              className="w-full bg-stone-900 hover:bg-stone-850 text-white text-[10px] font-black uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              <span>Go to My Plate Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </section>

        {/* Extra ratios for meal logs */}
        {itemType === "meal" && (
          <section className="px-6 pb-6">
            <div className="bg-white border border-stone-200/50 rounded-[32px] p-6 shadow-xs text-left">
              <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider mb-2">
                Macro Nutrition Percentages
              </h3>
              <div className="flex items-center gap-3 py-2">
                <span className="text-xs font-black text-stone-850">Ratio:</span>
                <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden flex">
                  <div className="bg-orange-500 h-full" style={{ width: `${(payload.p * 4 / (payload.c || 1)) * 100}%` }} />
                  <div className="bg-cyan-500 h-full" style={{ width: `${(payload.cb * 4 / (payload.c || 1)) * 100}%` }} />
                  <div className="bg-yellow-500 h-full" style={{ width: `${(payload.f * 9 / (payload.c || 1)) * 100}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-stone-400 font-medium mt-1.5">
                Ratios represent calorie distributions of Protein, Carbs, and Fats.
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Guest Authentication / Sign Up Section */}
      {!activeProfileId && (
        <section id="auth-section" className="px-6 pb-12">
          <div className="bg-white border-2 border-orange-500/20 rounded-[32px] p-6 shadow-xl relative z-10">
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-stone-850">Create account to save this {itemType}</h3>
              <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider text-center">
                Log items, save recipes, and track meals in seconds.
              </p>
            </div>

            {authError && (
              <div className="bg-red-50 text-red-600 border border-red-200/50 p-3 rounded-2xl text-[10px] font-black text-left mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-3.5">
              {authMode === "signup" && (
                <input
                  type="text"
                  placeholder="Choose username (e.g. fitnesspro)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  required
                  className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none transition-colors"
                />
              )}
              
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none transition-colors"
              />

              <input
                type="password"
                placeholder="Choose password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none transition-colors"
              />

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-stone-900 hover:bg-stone-850 text-white text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-60 disabled:pointer-events-none active:scale-98 transition-all"
              >
                {authLoading && <RefreshCw className="w-4.5 h-4.5 animate-spin" />}
                <span>{authMode === "signup" ? "Sign Up & Import" : "Log In & Import"}</span>
              </button>
            </form>

            <button
              onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}
              className="text-[9px] text-orange-500 hover:text-orange-655 font-bold uppercase tracking-wider mt-4 cursor-pointer bg-transparent border-0 inline-block text-center w-full"
            >
              {authMode === "signup" ? "Or log in to existing account" : "Or create a new account"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
};
