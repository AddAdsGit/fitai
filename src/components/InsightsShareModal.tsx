import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Download, Share2, Flame, Check, Sparkles, TrendingUp, Trophy, Scale } from "lucide-react";
import { motion } from "motion/react";
import { toPng } from "html-to-image";
import { SharedItemPayload, generateShareUrl } from "../utils/shareUtils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { cn } from "../lib/utils";

export interface InsightsShareData {
  type: "period" | "milestone" | "day";
  title: string;
  subtitle?: string;
  timeRange?: "7D" | "30D" | "60D" | "90D";
  date?: string;
  avgCalories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  streak?: number;
  bestStreak?: number;
  weightChange?: number;
  currentWeight?: number;
  goalWeight?: number;
  compliancePct?: number;
  chartData?: { day: string; calories: number; goal: number }[];
  milestoneIcon?: string;
}

interface InsightsShareModalProps {
  data: InsightsShareData;
  profileData: any;
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

export const InsightsShareModal: React.FC<InsightsShareModalProps> = ({
  data,
  profileData,
  onClose,
  triggerToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"card" | "webpage">("card");
  const [theme, setTheme] = useState<"obsidian" | "warm" | "cyber">("warm");

  const containerRef = useRef<HTMLDivElement | null>(null);

  const getDisplayName = () => {
    const name = profileData?.name?.trim();
    if (name && name !== "John Doe") return name;
    if (profileData?.username) return profileData.username.split("_")[0];
    return "FitAI Member";
  };
  const handleStr = `@${getDisplayName().toLowerCase().replace(/\s+/g, "")}`;
  const displayName = getDisplayName();

  const payload: SharedItemPayload = useMemo(() => ({
    n: data.title,
    c: data.avgCalories,
    p: data.protein,
    cb: data.carbs,
    f: data.fats,
    fb: data.fiber,
    t: data.timeRange || data.date || "7D",
    streak: data.streak,
    bestStreak: data.bestStreak,
    weightChange: data.weightChange,
    weightCurrent: data.currentWeight,
    compliancePct: data.compliancePct,
    milestoneTitle: data.title,
    milestoneSub: data.subtitle,
  }), [data]);

  const finalLink = shortUrl || generateShareUrl(data.type === "period" ? "period" : data.type === "milestone" ? "milestone" : "day", payload);

  useEffect(() => {
    async function getOrCreateShortLink() {
      if (!isSupabaseConfigured) return;
      setLoadingUrl(true);
      try {
        const { data: inserted } = await supabase
          .from("shares")
          .insert({ type: data.type, data: payload })
          .select("id")
          .single();

        if (inserted) {
          setShortUrl(generateShareUrl(data.type === "period" ? "period" : data.type === "milestone" ? "milestone" : "day", payload, inserted.id));
        }
      } catch (err) {
        console.error("Error creating database share:", err);
      } finally {
        setLoadingUrl(false);
      }
    }

    getOrCreateShortLink();
  }, [payload, data.type]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(finalLink);
    setCopied(true);
    triggerToast("🔗 Share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = async () => {
    const node = document.getElementById("insights-card-capture");
    if (!node) return;
    triggerToast("⏳ Preparing high-res card...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const dataUrl = await toPng(node, {
        cacheBust: true,
        width: 1080,
        height: 1440,
        style: {
          transform: "scale(2.76923)",
          transformOrigin: "top left",
          width: "390px",
          height: "520px",
        },
      });

      const link = document.createElement("a");
      link.download = `${data.title.replace(/\s+/g, "_").toLowerCase()}_card.png`;
      link.href = dataUrl;
      link.click();
      triggerToast("💾 Share card downloaded successfully!");
    } catch (err) {
      console.error("Error generating card image:", err);
      triggerToast("❌ Failed to generate card image.");
    }
  };

  const handleNativeShare = async () => {
    const node = document.getElementById("insights-card-capture");
    if (!node) return;
    triggerToast("⏳ Preparing share card...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const dataUrl = await toPng(node, {
        cacheBust: true,
        width: 1080,
        height: 1440,
        style: {
          transform: "scale(2.76923)",
          transformOrigin: "top left",
          width: "390px",
          height: "520px",
        },
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${data.title.replace(/\s+/g, "_").toLowerCase()}_card.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `FitAI Insights: ${data.title}`,
          text: `Check out my fitness progress on FitAI: ${data.title}!`,
          url: finalLink,
        });
      } else if (navigator.share) {
        await navigator.share({ files: [file], title: "FitAI", text: data.title, url: finalLink });
      } else {
        handleCopyLink();
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") handleCopyLink();
    }
  };

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm cursor-pointer touch-none"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="bg-stone-900 border-t border-x border-stone-800 rounded-t-[36px] w-full max-w-md shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-6 pb-[max(20px,env(safe-area-inset-bottom,20px))] flex flex-col items-center gap-4 max-h-[88vh] overflow-y-auto overscroll-contain touch-pan-y text-white relative z-10 text-left"
      >
        <div className="w-10 h-1 bg-stone-700 rounded-full mx-auto -mt-2 mb-1 shrink-0 select-none" />

        <div className="flex justify-between items-center w-full select-none pb-1 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-stone-200">
              Share Insights
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-full flex items-center justify-center cursor-pointer transition-colors border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between w-full gap-2 select-none">
          <div className="flex bg-stone-800 p-1 rounded-xl gap-1 flex-1 font-sans">
            <button
              type="button"
              onClick={() => setPreviewTab("card")}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer border-none",
                previewTab === "card" ? "bg-orange-500 text-white shadow-xs" : "text-stone-400 hover:text-stone-200 bg-transparent"
              )}
            >
              Share Card
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("report")}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer border-none",
                previewTab === "report" ? "bg-orange-500 text-white shadow-xs" : "text-stone-400 hover:text-stone-200 bg-transparent"
              )}
            >
              Report View
            </button>
          </div>

          <div className="flex bg-stone-800 p-1 rounded-xl gap-1 font-sans">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer border-none",
                  theme === t ? "bg-stone-700 text-white shadow-xs" : "text-stone-400 hover:text-stone-200 bg-transparent"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Area */}
        {previewTab === "card" ? (
          <div
            ref={containerRef}
            className="relative w-full aspect-[3/4] max-w-[390px] rounded-[28px] overflow-hidden shadow-2xl border border-stone-800/80 bg-stone-950 flex items-center justify-center"
          >
            {/* Capture Target for html-to-image */}
            <div
              id="insights-card-capture"
              className={cn(
                "w-[390px] h-[520px] p-6 flex flex-col justify-between select-none relative font-sans text-white transition-colors duration-300",
                theme === "obsidian"
                  ? "bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-stone-800"
                  : theme === "warm"
                  ? "bg-gradient-to-br from-orange-950 via-stone-900 to-stone-950 border border-orange-900/40"
                  : "bg-gradient-to-br from-slate-950 via-stone-950 to-emerald-950 border border-emerald-900/40"
              )}
            >
              {/* Card Ambient Glow */}
              <div
                className={cn(
                  "absolute -top-20 -left-20 w-60 h-60 rounded-full blur-3xl pointer-events-none opacity-30",
                  theme === "obsidian" ? "bg-orange-500" : theme === "warm" ? "bg-amber-500" : "bg-emerald-500"
                )}
              />

              {/* Top Bar: Brand & Date/Range */}
              <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Flame className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div>
                    <span className="text-sm font-black tracking-tight block leading-none">FitAI</span>
                    <span className="text-[9px] font-bold text-stone-400 tracking-wider uppercase">Insights</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
                    {data.timeRange || "Summary"}
                  </span>
                </div>
              </div>

              {/* Center Content: Title & Stats Overview */}
              <div className="my-auto z-10 space-y-4 pt-2">
                <div>
                  <h3 className="text-2xl font-black tracking-tight leading-tight text-stone-100">
                    {data.title}
                  </h3>
                  {data.subtitle && (
                    <p className="text-xs font-semibold text-stone-400 mt-0.5">
                      {data.subtitle}
                    </p>
                  )}
                </div>

                {/* Main Highlight Metric */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 block mb-0.5">
                      {data.type === "period" ? "Daily Calorie Avg" : "Energy Logged"}
                    </span>
                    <div className="text-3xl font-black text-white font-mono tracking-tight">
                      {data.avgCalories.toLocaleString()}
                      <span className="text-xs font-bold text-stone-400 font-sans ml-1">kcal/d</span>
                    </div>
                  </div>

                  {data.streak !== undefined && data.streak > 0 && (
                    <div className="bg-orange-500/20 border border-orange-500/40 rounded-xl px-3 py-2 text-center">
                      <span className="text-xs">🔥</span>
                      <span className="text-sm font-black text-orange-400 block leading-tight">
                        {data.streak} Days
                      </span>
                      <span className="text-[8px] font-bold uppercase text-orange-300/80">Streak</span>
                    </div>
                  )}
                </div>

                {/* 4 Core Macros Grid (Protein #F97316, Carbs #38BDF8, Fats #FBBF24, Fiber #34D399) */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-stone-900/80 border border-orange-500/30 p-2.5 rounded-xl text-center">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-stone-400 block">Protein</span>
                    <span className="text-sm font-black text-[#F97316] font-mono mt-0.5 block">{data.protein}g</span>
                  </div>
                  <div className="bg-stone-900/80 border border-sky-500/30 p-2.5 rounded-xl text-center">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-stone-400 block">Carbs</span>
                    <span className="text-sm font-black text-[#38BDF8] font-mono mt-0.5 block">{data.carbs}g</span>
                  </div>
                  <div className="bg-stone-900/80 border border-amber-500/30 p-2.5 rounded-xl text-center">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-stone-400 block">Fats</span>
                    <span className="text-sm font-black text-[#FBBF24] font-mono mt-0.5 block">{data.fats}g</span>
                  </div>
                  <div className="bg-stone-900/80 border border-emerald-500/30 p-2.5 rounded-xl text-center">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-stone-400 block">Fiber</span>
                    <span className="text-sm font-black text-[#34D399] font-mono mt-0.5 block">{data.fiber}g</span>
                  </div>
                </div>

                {/* Additional Insight Badges (Weight Change / Compliance) */}
                {(data.weightChange !== undefined || data.compliancePct !== undefined) && (
                  <div className="flex gap-2 text-xs">
                    {data.weightChange !== undefined && data.weightChange !== 0 && (
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-stone-400 uppercase">Weight Progress</span>
                        <span className={cn(
                          "font-black font-mono text-xs",
                          data.weightChange < 0 ? "text-emerald-400" : "text-orange-400"
                        )}>
                          {data.weightChange > 0 ? `+${data.weightChange.toFixed(1)}` : data.weightChange.toFixed(1)} kg
                        </span>
                      </div>
                    )}
                    {data.compliancePct !== undefined && (
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-stone-400 uppercase">Goal Compliance</span>
                        <span className="font-black font-mono text-xs text-sky-400">
                          {data.compliancePct}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Footer: User Handle & App Tag */}
              <div className="pt-3 border-t border-white/10 flex justify-between items-center z-10 text-[10px]">
                <div className="flex items-center gap-1.5 text-stone-300 font-bold">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-black flex items-center justify-center text-[9px]">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span>{displayName}</span>
                  <span className="text-stone-500 font-normal">{handleStr}</span>
                </div>
                <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-stone-500 font-mono">
                  FITAI.APP
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Web Link View Mockup */
          <div className="w-full aspect-[3/4] max-w-[390px] bg-stone-950 rounded-[28px] border border-stone-800 p-5 text-left font-sans flex flex-col gap-4 no-scrollbar">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center shadow-xs">
                  <Flame className="text-white w-3.5 h-3.5 fill-white" />
                </div>
                <span className="text-xs font-black text-stone-200">Public Insights Link</span>
              </div>
              <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full">
                Interactive View
              </span>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[9px] font-black text-orange-400 uppercase tracking-wider block">Insight Report</span>
              <h4 className="text-lg font-black text-white">{data.title}</h4>
              {data.subtitle && <p className="text-xs text-stone-400 font-medium">{data.subtitle}</p>}
            </div>

            <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-stone-400">Calorie Average</span>
                <span className="text-lg font-black text-white font-mono">{data.avgCalories} kcal/d</span>
              </div>
              <div className="h-px bg-stone-800" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-500 block text-[9px] font-bold uppercase">Protein</span>
                  <span className="text-stone-200 font-black font-mono">{data.protein}g</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[9px] font-bold uppercase">Carbs</span>
                  <span className="text-stone-200 font-black font-mono">{data.carbs}g</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[9px] font-bold uppercase">Fats</span>
                  <span className="text-stone-200 font-black font-mono">{data.fats}g</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[9px] font-bold uppercase">Fiber</span>
                  <span className="text-emerald-400 font-black font-mono">{data.fiber}g</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-stone-500 text-center font-medium mt-auto">
              Anyone with this link can view this progress summary.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full pt-1">
          <button
            onClick={handleNativeShare}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-950/50 active:scale-98 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Insight Card (Instagram / WhatsApp)</span>
          </button>

          <div className="flex gap-2 w-full">
            <button
              onClick={handleCopyLink}
              disabled={loadingUrl}
              className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-200 disabled:opacity-60 text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Web Link"}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="flex-1 bg-stone-100 hover:bg-white text-stone-900 text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
