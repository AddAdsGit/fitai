import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Download, Share2, Flame, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { toPng } from "html-to-image";
import { SharedItemPayload, generateShareUrl } from "../utils/shareUtils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { cn } from "../lib/utils";
import { dayCardVariations } from "./sharecards/registry";
import { ObsidianCardComponent } from "./sharecards/ObsidianCardComponent";
import { ChronoCardComponent } from "./sharecards/ChronoCardComponent";
import { SwissMinimalistCardComponent } from "./sharecards/SwissMinimalistCardComponent";

interface DayShareModalProps {
  item: any; // Day summary object
  profileData: any; // User profile
  currentStreak?: number;
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

export const DayShareModal: React.FC<DayShareModalProps> = ({
  item,
  profileData,
  currentStreak = 0,
  onClose,
  triggerToast,
}) => {
  const variations = dayCardVariations;

  const initialIndex = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const varParam = params.get("card");
    if (varParam) {
      const idx = variations.findIndex((v) => v.id === varParam);
      if (idx !== -1) return idx;
    }
    return 0;
  }, [variations]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [copied, setCopied] = useState(false);
  const [canShareFile, setCanShareFile] = useState(false);
  const [previewTab, setPreviewTab] = useState<"card" | "link">("card");
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [mealImages, setMealImages] = useState<Record<string, HTMLImageElement>>({});
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<boolean>(false);
  const [scale, setScale] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const currentVar = variations[currentIndex];
  const cardFormat = currentVar.format;
  const isObsidian = currentVar.id === "obsidian" || currentVar.id === "obsidian_split" || currentVar.id === "obsidian_split_circles" || currentVar.id === "obsidian_creative";
  const isChrono = currentVar.id === "chrono";
  const isSwiss = currentVar.id === "swiss";
  const isDomCard = isObsidian || isChrono || isSwiss;

  const mealsList = item.meals || [];
  
  // Calculate scale dynamically to fit container
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      setScale(containerWidth / 390);
    }
  }, [currentIndex, previewTab]);

  useEffect(() => {
    const imagesToLoad = mealsList.filter((m: any) => m.image);
    const loadedMap: Record<string, HTMLImageElement> = {};
    let loadedCount = 0;
    if (imagesToLoad.length === 0) {
      setMealImages({});
      return;
    }

    imagesToLoad.forEach((meal: any) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        loadedMap[meal.id || meal.name] = img;
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          setMealImages({ ...loadedMap });
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          setMealImages({ ...loadedMap });
        }
      };
      img.src = meal.image;
    });
  }, [mealsList]);

  const getDisplayName = () => {
    const name = profileData?.name?.trim();
    if (name && name !== "John Doe") return name;
    if (profileData?.username) return profileData.username.split("_")[0];
    return "FitAI Member";
  };
  const handleStr = `@${getDisplayName().toLowerCase().replace(/\s+/g, "")}`;

  const name = item.name || "Daily Summary";
  const calories = Number(item.calories || 0);
  const protein = Number(item.protein || 0);
  const carbs = Number(item.carbs || 0);
  const fats = Number(item.fats || 0);
  const fiber = Number(item.fiber || 0);

  const payload: SharedItemPayload = useMemo(() => ({
    n: name,
    c: calories,
    p: protein,
    cb: carbs,
    f: fats,
    fb: fiber,
    mls: mealsList.map((m: any) => ({ n: m.name, c: m.calories }))
  }), [name, calories, protein, carbs, fats, fiber, mealsList]);

  const finalLink = shortUrl || generateShareUrl("day", payload);

  const drawCanvas = () => {
    // Only draw canvas for standard variations, skip DOM-rendered cards
    if (isDomCard) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1080;
    if ((cardFormat as string) === "story") {
      canvas.height = 1920;
    } else if ((cardFormat as string) === "portrait") {
      canvas.height = 1440;
    } else {
      canvas.height = 1080;
    }

    ctx.clearRect(0, 0, 1080, canvas.height);

    // Delegate canvas drawing to the active card variation
    currentVar.draw({
      ctx,
      canvas,
      handleStr,
      name,
      date: item.date,
      calories,
      protein,
      carbs,
      fats,
      fiber,
      mealsList,
      mealImages,
      weight: Number(profileData.weight || 0),
      targetCalories: Number(profileData.goals?.dailyCalories || 2000),
      targetProtein: Number(profileData.macros?.protein || 140),
      targetCarbs: Number(profileData.macros?.carbs || 210),
      targetFats: Number(profileData.macros?.fats || 65),
      targetFiber: Number(profileData.macros?.fiber || 35),
      currentStreak,
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
  }, [currentIndex, fontsLoaded, mealImages]);

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

  const handleDownloadImage = async () => {
    if (isDomCard) {
      const node = document.getElementById("dom-card-capture");
      if (!node) return;
      triggerToast("⏳ Preparing high-res card...");
      
      try {
        // Wait for rendering elements & fonts to settle
        await new Promise((resolve) => setTimeout(resolve, 250));
        const exportWidth = 1080;
        const exportHeight = isSwiss ? 1440 : 1920;
        const nodeWidth = isSwiss ? 360 : 390;
        const nodeHeight = isSwiss ? 480 : 693.3;
        const scaleFactor = exportWidth / nodeWidth;

        const dataUrl = await toPng(node, {
          cacheBust: true,
          width: exportWidth,
          height: exportHeight,
          style: {
            transform: `scale(${scaleFactor})`,
            transformOrigin: "top left",
            width: `${nodeWidth}px`,
            height: `${nodeHeight}px`,
          },
        });
        
        const link = document.createElement("a");
        link.download = `${name.replace(/\s+/g, "_").toLowerCase()}_report.png`;
        link.href = dataUrl;
        link.click();
        triggerToast("💾 Daily progress card downloaded!");
      } catch (err) {
        console.error("Error creating image:", err);
        triggerToast("❌ Failed to generate card image.");
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${name.replace(/\s+/g, "_").toLowerCase()}_report.png`;
    link.href = url;
    link.click();
    triggerToast("💾 Daily progress card downloaded!");
  };

  const handleNativeShare = async () => {
    if (isDomCard) {
      const node = document.getElementById("dom-card-capture");
      if (!node) return;
      triggerToast("⏳ Preparing share card...");
      
      try {
        // Wait for rendering elements & fonts to settle
        await new Promise((resolve) => setTimeout(resolve, 250));
        const exportWidth = 1080;
        const exportHeight = isSwiss ? 1440 : 1920;
        const nodeWidth = isSwiss ? 360 : 390;
        const nodeHeight = isSwiss ? 480 : 693.3;
        const scaleFactor = exportWidth / nodeWidth;

        const dataUrl = await toPng(node, {
          cacheBust: true,
          width: exportWidth,
          height: exportHeight,
          style: {
            transform: `scale(${scaleFactor})`,
            transformOrigin: "top left",
            width: `${nodeWidth}px`,
            height: `${nodeHeight}px`,
          },
        });
        
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `${name.replace(/\s+/g, "_").toLowerCase()}_report.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `FitAI Share: ${name}`,
            text: `Check out my daily progress: ${name} on FitAI!`,
            url: finalLink,
          });
        } else {
          await navigator.share({
            title: `FitAI Share: ${name}`,
            text: `Check out my daily progress: ${name} on FitAI!`,
            url: finalLink,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          handleCopyLink();
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const file = new File([blob], `${name.replace(/\s+/g, "_").toLowerCase()}_report.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `FitAI Share: ${name}`,
            text: `Check out my daily progress: ${name} on FitAI!`,
            url: finalLink,
          });
        } else {
          await navigator.share({
            title: `FitAI Share: ${name}`,
            text: `Check out my daily progress: ${name} on FitAI!`,
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
          .insert({ type: "day", data: payload })
          .select("id")
          .single();

        if (inserted) {
          setShortUrl(generateShareUrl("day", payload, inserted.id));
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
            Share Daily Progress
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
            className={cn(
              "relative rounded-[28px] overflow-hidden shadow-2xl border border-stone-200/90 select-none bg-white cursor-grab active:cursor-grabbing flex items-center justify-center",
              isSwiss ? "w-[260px] h-[347px]" : isDomCard ? "w-[246px] h-[437px]" : "w-[260px] h-[347px]"
            )}
          >
            {isDomCard ? (
              /* Dynamic HTML Rendering with CSS scaling for the DOM Cards (Obsidian, Chrono, Swiss) */
              <div 
                id="dom-card-capture"
                style={
                  isSwiss
                    ? {
                        width: "360px",
                        height: "480px",
                        transform: "scale(0.7222)",
                        transformOrigin: "top left",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        flexShrink: 0,
                      }
                    : {
                        width: "390px",
                        height: "693.3px",
                        transform: "scale(0.630769)",
                        transformOrigin: "top left",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        flexShrink: 0,
                      }
                }
              >
                {isSwiss ? (
                  <SwissMinimalistCardComponent
                    date={item.date}
                    calories={calories}
                    protein={protein}
                    targetCalories={Number(profileData.goals?.dailyCalories || 2000)}
                    targetProtein={Number(profileData.macros?.protein || 150)}
                    mealsList={mealsList}
                    handleStr={handleStr}
                  />
                ) : isChrono ? (
                  <ChronoCardComponent
                    date={item.date}
                    calories={calories}
                    protein={protein}
                    targetProtein={Number(profileData.macros?.protein || 150)}
                    mealsList={mealsList}
                    mealImages={mealImages}
                    handleStr={handleStr}
                  />
                ) : (
                  <ObsidianCardComponent
                    layout={
                      currentVar.id === "obsidian_split_circles"
                        ? "split_circles"
                        : "original"
                    }
                    name={name}
                    date={item.date}
                    calories={calories}
                    protein={protein}
                    carbs={carbs}
                    fats={fats}
                    fiber={fiber}
                    mealsList={mealsList}
                    weight={Number(profileData.weight || 0)}
                    targetCalories={Number(profileData.goals?.dailyCalories || 2000)}
                    targetProtein={Number(profileData.macros?.protein || 140)}
                    targetCarbs={Number(profileData.macros?.carbs || 210)}
                    targetFats={Number(profileData.macros?.fats || 65)}
                    targetFiber={Number(profileData.macros?.fiber || 35)}
                    currentStreak={currentStreak}
                    mealImages={mealImages}
                    handleStr={handleStr}
                  />
                )}
              </div>
            ) : (
              /* Canvas fallback for standard styles */
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover block rounded-[28px]"
              />
            )}
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
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-200 active:scale-98 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share to Apps (WhatsApp, IG...)</span>
            </button>
          )}

          <div className="flex gap-2 w-full">
            <button
              onClick={handleCopyLink}
              disabled={loadingUrl}
              className="flex-1 bg-white hover:bg-orange-50/50 border border-orange-100 text-orange-950 disabled:opacity-60 text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy URL"}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="flex-1 bg-orange-950 hover:bg-orange-900 text-white text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
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
