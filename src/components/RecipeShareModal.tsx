import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Copy, Download, Share2, Flame, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { SharedItemPayload, generateShareUrl, compressRecipe } from "../utils/shareUtils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { cn } from "../lib/utils";
import { recipeCardVariations } from "./sharecards/registry";

interface RecipeShareModalProps {
  item: any; // Recipe object
  profileData: any; // User profile
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

export const RecipeShareModal: React.FC<RecipeShareModalProps> = ({
  item,
  profileData,
  onClose,
  triggerToast,
}) => {
  const variations = recipeCardVariations;

  const initialIndex = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const testVar = params.get("variation");
    if (testVar) {
      const idx = parseInt(testVar, 10);
      return idx >= 0 && idx < variations.length ? idx : 0;
    }
    return 0;
  }, [variations]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [copied, setCopied] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"card" | "webpage">("card");
  const [canShareFile, setCanShareFile] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentVar = variations[currentIndex];
  const cardFormat = currentVar.format;

  const handleStr = profileData.username ? `@${profileData.username}` : "@user";

  const name = item.name || "Healthy Recipe";
  const calories = Number(item.calories || 0);
  const protein = Number(item.protein || 0);
  const carbs = Number(item.carbs || 0);
  const fats = Number(item.fats || 0);
  const fiber = Number(item.fiber || 0);
  const time = item.prep_time || "15 min";
  const image = item.image || "";

  const ingredients: string[] = useMemo(() => {
    if (Array.isArray(item.ingredients)) return item.ingredients;
    if (typeof item.ingredients === "string") {
      try {
        const parsed = JSON.parse(item.ingredients);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return item.ingredients.split(",").map((i: string) => i.trim()).filter(Boolean);
      }
    }
    return [];
  }, [item.ingredients]);

  const payload = useMemo(() => compressRecipe(item), [item]);
  const finalLink = shortUrl || generateShareUrl("recipe", payload);

  // Load and cache image
  useEffect(() => {
    if (!image) {
      setLoadedImg(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setLoadedImg(img);
    };
    img.onerror = () => {
      setLoadedImg(null);
    };
    if (image.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.src = image;
  }, [image]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1080;
    if ((cardFormat as string) === "story") {
      canvas.height = 1920;
    } else {
      canvas.height = 1080;
    }

    ctx.clearRect(0, 0, 1080, canvas.height);

    // Delegate canvas drawing to active variation
    currentVar.draw({
      ctx,
      canvas,
      handleStr,
      name,
      date: "",
      calories,
      protein,
      carbs,
      fats,
      fiber,
      mealsList: [],
      mealImages: {},
      time,
      description: item.description || "",
      ingredients,
      loadedImg,
    });
  };

  useEffect(() => {
    if (navigator.canShare) {
      const dummyBlob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 11, 73, 68, 65, 84, 120, 156, 99, 96, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])], { type: "image/png" });
      const testFile = new File([dummyBlob], "t.png", { type: "image/png" });
      try {
        if (navigator.canShare({ files: [testFile] })) {
          setCanShareFile(true);
        }
      } catch {
        setCanShareFile(false);
      }
    }
  }, []);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setFontsLoaded(true);
    });
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [currentIndex, fontsLoaded, loadedImg]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % variations.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + variations.length) % variations.length);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(finalLink);
    setCopied(true);
    triggerToast("🔗 Share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${name.replace(/\s+/g, "_").toLowerCase()}_recipe.png`;
    link.href = url;
    link.click();
    triggerToast("💾 Recipe card downloaded!");
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const file = new File([blob], `${name.replace(/\s+/g, "_").toLowerCase()}_recipe.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `FitAI Share: ${name}`,
            text: `Check out my custom recipe: ${name} on FitAI!`,
            url: finalLink,
          });
        } else {
          await navigator.share({
            title: `FitAI Share: ${name}`,
            text: `Check out my custom recipe: ${name} on FitAI!`,
            url: finalLink,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          handleCopyLink();
        }
      }
    });
  };

  useEffect(() => {
    async function getOrCreateShortLink() {
      if (!isSupabaseConfigured) return;
      setLoadingUrl(true);
      try {
        const { data: inserted } = await supabase
          .from("shares")
          .insert({ type: "recipe", data: payload })
          .select("id")
          .single();

        if (inserted) {
          setShortUrl(generateShareUrl("recipe", payload, inserted.id));
        }
      } catch (err) {
        console.error("Error creating database share:", err);
      } finally {
        setLoadingUrl(false);
      }
    }

    getOrCreateShortLink();
  }, [payload]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-6 font-sans"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="bg-stone-50 border border-white rounded-[32px] w-full max-w-[400px] shadow-2xl p-6 flex flex-col items-center gap-5 max-h-[90vh] overflow-y-auto no-scrollbar scroll-smooth"
      >
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
            Share Recipe Card
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-stone-200/50 hover:bg-stone-200 text-stone-500 rounded-full flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview tabs */}
        <div className="flex items-center justify-between w-full gap-2 select-none shrink-0">
          <div className="flex bg-stone-100 p-1 rounded-xl gap-1 flex-1 font-sans">
            <button
              type="button"
              onClick={() => setPreviewTab("card")}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                previewTab === "card" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500 hover:text-stone-700"
              )}
            >
              🖼️ Image Card
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("webpage")}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                previewTab === "webpage" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500 hover:text-stone-700"
              )}
            >
              🌐 Web Link
            </button>
          </div>
        </div>

        {/* Preview Container */}
        {previewTab === "card" ? (
          <div className="relative w-full aspect-square flex flex-col items-center justify-center">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) handlePrev();
                else if (info.offset.x < -80) handleNext();
              }}
              className="w-full h-full rounded-[28px] overflow-hidden shadow-xl border border-stone-200/50 flex items-center justify-center relative select-none cursor-grab active:cursor-grabbing bg-[#151413]"
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
              />
            </motion.div>
          </div>
        ) : (
          /* Web Link View Mockup */
          <div className="w-full aspect-square bg-[#FAF9F6] rounded-[28px] border border-stone-200 shadow-xl overflow-y-auto p-4.5 text-left font-sans flex flex-col gap-3.5 no-scrollbar">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5.5 h-5.5 rounded-lg bg-orange-500 flex items-center justify-center shadow-xs">
                  <Flame className="text-white w-3 h-3 fill-white" />
                </div>
                <span className="text-[10px] font-black text-stone-700 tracking-tight">FitAI Link View</span>
              </div>
              <span className="text-[7.5px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full select-none">
                Guest View
              </span>
            </div>

            <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 text-[10px] text-stone-700 font-extrabold flex justify-between items-center">
              <span>🍳 {name}</span>
              <span className="text-orange-600">{calories} kcal</span>
            </div>

            <div className="space-y-1">
              <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block font-sans">Ingredients list</span>
              <div className="bg-white border border-stone-150 rounded-xl p-3.5 space-y-2.5 max-h-[140px] overflow-y-auto no-scrollbar">
                {ingredients.map((ing: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[9.5px] font-semibold text-stone-700 border-b border-stone-50 pb-1.5 last:border-0 last:pb-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    <span className="truncate">{ing}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 shrink-0">
              {[
                { label: "Kcal", val: calories, color: "text-orange-600" },
                { label: "Protein", val: `${protein}g`, color: "text-stone-700" },
                { label: "Carbs", val: `${carbs}g`, color: "text-stone-700" },
                { label: "Fats", val: `${fats}g`, color: "text-stone-700" }
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-stone-100/70 p-1.5 rounded-xl text-center shadow-3xs">
                  <span className="text-[6.5px] text-stone-400 block uppercase font-black">{stat.label}</span>
                  <span className={cn("text-[9.5px] font-black mt-0.5 block", stat.color)}>{stat.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination Row */}
        {previewTab === "card" && variations.length > 1 && (
          <div className="flex items-center gap-6 select-none mt-1 mb-2">
            <button
              onClick={handlePrev}
              className="w-7 h-7 rounded-full bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 shadow-2xs flex items-center justify-center cursor-pointer transition-colors active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-1.5 justify-center">
              {variations.map((v, idx) => (
                <button
                  key={v.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex ? "w-5 bg-orange-500" : "w-2 bg-stone-300"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-7 h-7 rounded-full bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 shadow-2xs flex items-center justify-center cursor-pointer transition-colors active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-100 active:scale-98 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share to Apps (WhatsApp, IG...)</span>
            </button>
          )}

          <div className="flex gap-2 w-full">
            <button
              onClick={handleCopyLink}
              disabled={loadingUrl}
              className="flex-1 bg-stone-100 hover:bg-stone-205 text-stone-800 disabled:opacity-60 text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy URL Link"}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="flex-1 bg-stone-900 hover:bg-stone-850 text-white text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
