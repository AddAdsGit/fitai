import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Camera, Sparkles, Image as ImageIcon, FileText, Share2, Wand2, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { analyzeFoodPhotoWithAI } from "../utils/geminiFoodAnalysis";

export const CameraLogModal = ({
  isOpen,
  onClose,
  onAddMeal,
  profileData,
  showToast,
  onShareMeal,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: (meal: any) => void;
  profileData: any;
  showToast: (msg: string) => void;
  onShareMeal?: (meal: any) => void;
}) => {
  // Flow States: "capture" -> "confirm" -> "preview"
  const [flowStep, setFlowStep] = useState<"capture" | "confirm" | "preview">("capture");
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loggedMealResult, setLoggedMealResult] = useState<any | null>(null);

  // AI Decorator States
  const [selectedStylePreset, setSelectedStylePreset] = useState<string | null>(null);
  const [customStylePrompt, setCustomStylePrompt] = useState("");
  const [isDecoratingImage, setIsDecoratingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Auto-trigger camera/file picker upon opening when in capture mode
  useEffect(() => {
    if (isOpen && flowStep === "capture" && !uploadedImage && fileInputRef.current) {
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, flowStep]);

  // Reset states on modal open
  useEffect(() => {
    if (isOpen) {
      setFlowStep("capture");
      setUploadedImage(null);
      setNotes("");
      setShowNotesInput(false);
      setLoggedMealResult(null);
      setSelectedStylePreset(null);
      setCustomStylePrompt("");
      setErrorMessage("");
    }
  }, [isOpen]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      setFlowStep("confirm");
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeAndLog = async () => {
    if (!uploadedImage) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const aiResult = await analyzeFoodPhotoWithAI({
        imageBase64: uploadedImage,
        notes,
        profileData,
      });

      const mealData = {
        id: `camera_log_${Date.now()}`,
        name: aiResult.name,
        calories: aiResult.calories,
        protein: aiResult.protein,
        carbs: aiResult.carbs,
        fats: aiResult.fats,
        fiber: aiResult.fiber,
        nutrients: aiResult.nutrients,
        type: "Camera Log",
        time: timeStr,
        image: uploadedImage,
        meal_description: aiResult.meal_description,
        tags: aiResult.tags,
      };

      // Log meal to app state & set logged result for visual card preview!
      onAddMeal(mealData);
      setLoggedMealResult(mealData);
      showToast("✨ Photo Meal Logged!");
      setIsProcessing(false);
      setFlowStep("preview");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to analyze photo.");
      setIsProcessing(false);
    }
  };

  const handleApplyDecoratePreset = (presetName: string, promptText: string) => {
    setSelectedStylePreset(presetName);
    setCustomStylePrompt(promptText);
  };

  const handleDecorateImage = async () => {
    if (!loggedMealResult) return;
    setIsDecoratingImage(true);
    showToast("🎨 Applying Aesthetic Decorator...");

    setTimeout(() => {
      const updatedMeal = {
        ...loggedMealResult,
        meal_description: `${loggedMealResult.meal_description} • Style: ${selectedStylePreset || "Gourmet Studio"}`
      };
      setLoggedMealResult(updatedMeal);
      setIsDecoratingImage(false);
      showToast("✨ Aesthetic Food Card Ready!");
    }, 1200);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {/* Outer Dimmed Backdrop (Desktop & Mobile) */}
      <div className="fixed inset-0 z-[9999] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 select-none animate-fade-in">
        {/* Main Responsive Mobile Frame (Full Screen on Mobile, iPhone Frame on Desktop) */}
        <div
          className={cn(
            "w-full h-full sm:h-[92vh] sm:max-w-[430px] sm:rounded-[44px] sm:border sm:border-stone-800/90 shadow-2xl flex flex-col justify-between p-4 sm:p-5 overflow-hidden text-left relative transition-colors duration-300",
            flowStep === "preview" ? "bg-[#FAF7F2] text-stone-900" : "bg-[#0D0D0D] text-white"
          )}
        >
          {/* Hidden Native File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageFileChange}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />

          {/* Top Navigation Header Bar */}
          <div className="flex items-center justify-between z-20 pt-1 sm:pt-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <span className={cn("text-xs font-black uppercase tracking-wider block", flowStep === "preview" ? "text-orange-950" : "text-white")}>
                  {flowStep === "preview" ? "Meal Log Preview" : "FitAI Camera"}
                </span>
                <span className={cn("text-[9.5px] font-bold uppercase tracking-widest block", flowStep === "preview" ? "text-orange-950/60" : "text-stone-400")}>
                  {flowStep === "preview" ? "Aesthetic Food Card" : flowStep === "confirm" ? "Confirm Photo" : "Camera Viewfinder"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border active:scale-90",
                flowStep === "preview"
                  ? "bg-white/80 hover:bg-white border-stone-200 text-stone-700 shadow-sm"
                  : "bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-md"
              )}
              title="Close camera"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="z-20 bg-red-500 text-white p-3 rounded-2xl text-xs font-bold text-center shadow-lg my-2">
              {errorMessage}
            </div>
          )}

          {/* FLOW STEP 1 & 2: RESPONSIVE VIEWFINDER */}
          {(flowStep === "capture" || flowStep === "confirm") && (
            <div className="flex-1 flex flex-col items-center justify-center my-3 relative min-h-0 w-full">
              {uploadedImage ? (
                <div className="relative w-full h-full max-h-[62vh] sm:max-h-[58vh] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-black flex items-center justify-center">
                  <img
                    src={uploadedImage}
                    alt="Captured Meal"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImage(null);
                      setFlowStep("capture");
                    }}
                    className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer backdrop-blur-md border border-white/20 active:scale-90"
                    title="Retake photo"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full max-h-[62vh] sm:max-h-[58vh] rounded-[32px] border-2 border-dashed border-stone-700/80 bg-stone-900/60 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center p-6 text-center space-y-4 cursor-pointer hover:border-orange-500 transition-colors"
                >
                  <div className="w-16 h-16 rounded-3xl bg-orange-500 text-white flex items-center justify-center shadow-xl shadow-orange-500/40 animate-pulse">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-black text-white block uppercase tracking-wider">Tap to Capture Photo</span>
                    <span className="text-xs font-medium text-stone-400 block">Snap a photo of your food or select from gallery</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OPTIONAL NOTES DRAWER OVERLAY */}
          {showNotesInput && (flowStep === "capture" || flowStep === "confirm") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="z-30 w-full mb-3"
            >
              <div className="bg-stone-900/95 backdrop-blur-xl p-3.5 rounded-3xl border border-stone-700/80 shadow-2xl space-y-2 text-left text-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Optional Meal Notes</span>
                  <button
                    type="button"
                    onClick={() => setShowNotesInput(false)}
                    className="text-[10px] font-bold text-stone-400 hover:text-white border-none bg-transparent cursor-pointer"
                  >
                    Close ✕
                  </button>
                </div>
                <textarea
                  placeholder='Add notes (e.g. "2 eggs cooked in olive oil", "sourdough bread")...'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  autoFocus
                  className="w-full bg-stone-800/90 border border-stone-700 focus:border-orange-500 focus:outline-none rounded-2xl p-2.5 text-xs font-bold text-white placeholder:text-stone-500 placeholder:font-normal resize-none shadow-inner"
                />
              </div>
            </motion.div>
          )}

          {/* DESKTOP/MOBILE SHUTTER BAR: [ Gallery (56px) ] ( Orange Shutter 76px ) [ Notes (56px) ] */}
          {(flowStep === "capture" || flowStep === "confirm") && (
            <div className="z-20 w-full flex flex-col items-center gap-3 pb-2 sm:pb-0">
              {flowStep === "confirm" && uploadedImage && (
                <button
                  type="button"
                  onClick={handleAnalyzeAndLog}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider text-center shadow-xl shadow-orange-500/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <span>Calculating Macros...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze & Log Meal</span>
                    </>
                  )}
                </button>
              )}

              {/* Shutter Control Row */}
              <div className="flex items-center justify-between w-full px-4 sm:px-6 py-1">
                {/* Left Side: 52px Gallery Icon Button */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-13 h-13 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer shrink-0"
                  title="Open Photo Gallery"
                >
                  <ImageIcon className="w-5.5 h-5.5 text-white" />
                </button>

                {/* Middle: 76px Prominent FitAI Orange Shutter Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-19 h-19 rounded-full bg-orange-500 hover:bg-orange-600 border-4 border-white shadow-2xl shadow-orange-500/50 flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer shrink-0"
                  title="Take Photo"
                >
                  <Camera className="w-7 h-7 text-white" />
                </button>

                {/* Right Side: 52px Notes Icon Button */}
                <button
                  type="button"
                  onClick={() => setShowNotesInput(!showNotesInput)}
                  className={cn(
                    "w-13 h-13 rounded-full backdrop-blur-md border transition-all flex items-center justify-center active:scale-90 cursor-pointer shadow-lg shrink-0",
                    showNotesInput || notes.trim()
                      ? "bg-orange-500 text-white border-orange-500 shadow-orange-500/30"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                  )}
                  title="Add Notes"
                >
                  <FileText className="w-5.5 h-5.5 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* FLOW STEP 3: LOGGED CARD PREVIEW + AI DECORATOR + SHARE BUTTON */}
          {flowStep === "preview" && loggedMealResult && (
            <div className="flex-1 flex flex-col justify-between my-2 relative min-h-0 space-y-3 overflow-y-auto">
              {/* Logged Meal Visual Card */}
              <div className="bg-white/90 backdrop-blur-md rounded-[32px] border border-white shadow-xl shadow-orange-100/30 p-5 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Logged Today
                    </span>
                    <span className="text-xs font-bold text-stone-400">{loggedMealResult.time}</span>
                  </div>

                  {/* 1-Tap Minimalist Share Icon Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onShareMeal) {
                        onShareMeal(loggedMealResult);
                      } else {
                        showToast("📤 Opening Share Modal...");
                      }
                    }}
                    className="w-9 h-9 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-3xs"
                    title="Share Meal Card"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Photo & Meal Details */}
                <div className="flex gap-3">
                  {loggedMealResult.image && (
                    <img
                      src={loggedMealResult.image}
                      alt={loggedMealResult.name}
                      className="w-20 h-20 rounded-2xl object-cover border border-stone-200/80 shadow-2xs shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-black text-stone-900 truncate mb-1">{loggedMealResult.name}</h4>
                    <div className="flex items-baseline gap-1 text-orange-500 font-black text-lg leading-none">
                      <span>{loggedMealResult.calories}</span>
                      <span className="text-[10px] uppercase text-stone-400 font-bold">kcal</span>
                    </div>
                    <p className="text-[10.5px] font-medium text-stone-500 line-clamp-2 mt-1">
                      {loggedMealResult.meal_description}
                    </p>
                  </div>
                </div>

                {/* Macro Pills Grid */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-stone-100 text-center">
                  <div className="bg-orange-50/80 p-2 rounded-xl border border-orange-100">
                    <span className="text-[8px] font-black uppercase text-orange-600 block">Protein</span>
                    <span className="text-xs font-black text-orange-950">{loggedMealResult.protein}g</span>
                  </div>
                  <div className="bg-sky-50/80 p-2 rounded-xl border border-sky-100">
                    <span className="text-[8px] font-black uppercase text-sky-600 block">Carbs</span>
                    <span className="text-xs font-black text-sky-950">{loggedMealResult.carbs}g</span>
                  </div>
                  <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-100">
                    <span className="text-[8px] font-black uppercase text-amber-600 block">Fats</span>
                    <span className="text-xs font-black text-amber-950">{loggedMealResult.fats}g</span>
                  </div>
                  <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                    <span className="text-[8px] font-black uppercase text-emerald-600 block">Fiber</span>
                    <span className="text-xs font-black text-emerald-950">{loggedMealResult.fiber}g</span>
                  </div>
                </div>
              </div>

              {/* AI Food Decorator & Aesthetic Presets Card */}
              <div className="bg-white/90 backdrop-blur-md rounded-[28px] border border-white shadow-xl shadow-orange-100/20 p-4 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-orange-950">AI Food Decorator</span>
                  </div>
                  <span className="text-[9px] font-bold text-stone-400 uppercase">Pre-Share Aesthetic</span>
                </div>

                {/* Style Presets */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { name: "Studio Pro", prompt: "Professional studio food photography, crisp depth of field, sharp lighting" },
                    { name: "Gourmet Plating", prompt: "Michelin star fine dining plating, artistic garnishes, clean white rim" },
                    { name: "Candid Snap", prompt: "Warm natural lighting, authentic social media food aesthetic" },
                  ].map((preset) => {
                    const isSelected = selectedStylePreset === preset.name;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleApplyDecoratePreset(preset.name, preset.prompt)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shrink-0 cursor-pointer border",
                          isSelected
                            ? "bg-orange-500 text-white border-orange-500 shadow-2xs"
                            : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                        )}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Tweak Prompt Input */}
                <input
                  type="text"
                  placeholder='Or custom prompt (e.g. "Add steam, candle lighting")...'
                  value={customStylePrompt}
                  onChange={(e) => setCustomStylePrompt(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-bold text-stone-900 placeholder:text-stone-400 placeholder:font-normal shadow-3xs"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDecorateImage}
                    disabled={isDecoratingImage || (!selectedStylePreset && !customStylePrompt.trim())}
                    className="flex-1 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider text-center shadow-md shadow-orange-500/20 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    {isDecoratingImage ? "Enhancing..." : "🎨 Decorate Image"}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="py-3 px-5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md active:scale-95 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
