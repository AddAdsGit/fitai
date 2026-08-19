import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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
  const [currentTheme, setCurrentTheme] = useState<"obsidian" | "sunset">("sunset");
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentVar = variations[currentIndex];
  const cardFormat = currentVar.format;

  const getDisplayName = () => {
    const name = profileData?.name?.trim();
    if (name && name !== "John Doe") return name;
    if (profileData?.username) return profileData.username.split("_")[0];
    return "FitAI Member";
  };
  const handleStr = `@${getDisplayName().toLowerCase().replace(/\s+/g, "")}`;

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
  }, [currentIndex, fontsLoaded, loadedImg, currentTheme]);

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
        className="bg-[#FAF7F2] border-t border-x border-stone-200/80 rounded-t-[36px] w-full max-w-md shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-6 pb-[max(20px,env(safe-area-inset-bottom,20px))] flex flex-col items-center gap-4 max-h-[88vh] overflow-y-auto overscroll-contain touch-pan-y relative z-10 text-left"
      >
        {/* Top Drag Indicator Pill */}
        <div className="w-10 h-1 bg-stone-300/70 rounded-full mx-auto -mt-2 mb-1 shrink-0 select-none" />

        {/* Header */}
        <div className="flex justify-between items-center w-full select-none pb-1 border-b border-stone-200/60">
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-950">
            Share Recipe Card
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full flex items-center justify-center cursor-pointer transition-colors border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview Container */}
        <div className="relative w-full flex flex-col items-center justify-center py-1">
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x > 60) handlePrev();
              else if (info.offset.x < -60) handleNext();
            }}
            className="relative w-[280px] h-[280px] rounded-[28px] overflow-hidden shadow-2xl border border-stone-200/90 flex flex-col items-center justify-center select-none bg-white cursor-grab active:cursor-grabbing"
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover block rounded-[28px]"
            />
          </motion.div>
        </div>

        {/* Pagination Row */}
        {variations.length > 1 && (
          <div className="flex items-center gap-6 select-none mt-1 mb-2">
            <button
              onClick={handlePrev}
              className="w-7 h-7 rounded-full bg-white border border-orange-100 text-orange-950/80 hover:bg-orange-50/50 shadow-2xs flex items-center justify-center cursor-pointer transition-colors active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-1.5 justify-center">
              {variations.map((v, idx) => (
                <button
                  key={v.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex ? "w-5 bg-orange-500" : "w-2 bg-orange-200"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-7 h-7 rounded-full bg-white border border-orange-100 text-orange-950/80 hover:bg-orange-50/50 shadow-2xs flex items-center justify-center cursor-pointer transition-colors active:scale-95"
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
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-200 active:scale-98 transition-all border-none"
            >
              <Share2 className="w-4 h-4" />
              <span>Share to Apps (WhatsApp, IG...)</span>
            </button>
          )}

          <div className="flex gap-2 w-full">
            <button
              onClick={handleCopyLink}
              disabled={loadingUrl}
              className="flex-1 bg-white hover:bg-orange-50/50 border border-stone-200 text-orange-950 disabled:opacity-60 text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all shadow-3xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy URL"}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="flex-1 bg-orange-950 hover:bg-orange-900 text-white text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all border-none"
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
