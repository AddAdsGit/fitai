import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Copy, Download, Share2, Flame, Check, ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import { motion } from "motion/react";
import { SharedItemPayload, generateShareUrl, compressMeal } from "../utils/shareUtils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { cn } from "../lib/utils";

interface MealShareModalProps {
  item: any; // Meal object
  profileData: any; // User profile
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

export const MealShareModal: React.FC<MealShareModalProps> = ({
  item,
  profileData,
  onClose,
  triggerToast,
}) => {
  // Pure Obsidian Branding Variations (1:1 Post and 9:16 Story)
  const variations = [
    { id: "obsidian", name: "Obsidian (Glass Tech)", format: "square" },
    { id: "editorial", name: "Editorial (Light Premium)", format: "square" }
  ] as const;

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentVar = variations[currentIndex];
  const cardFormat = currentVar.format;

  const handleStr = profileData.username ? `@${profileData.username}` : "@user";

  const name = item.name || "Logged Meal";
  const calories = Number(item.calories || 0);
  const protein = Number(item.protein || 0);
  const carbs = Number(item.carbs || 0);
  const fats = Number(item.fats || 0);
  const fiber = Number(item.fiber || 0);
  const time = item.time || "12:00 PM";
  const image = item.image || "";

  const payload = useMemo(() => compressMeal(item), [item]);
  const finalLink = shortUrl || generateShareUrl("meal", payload);

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

    const isObsidian = (currentVar.id as string) === "obsidian";
    const isEditorial = (currentVar.id as string) === "editorial";
    const isSolar = (currentVar.id as string) === "solar";

    let fontFamily = "Inter, system-ui, sans-serif";
    let titleFont = "900 68px Inter, system-ui, sans-serif";
    let labelFont = "700 18px Inter, system-ui, sans-serif";
    let textColor = "#FAF9F6";
    let textMuted = "#A8A29E";
    let accentColor = "#F97316"; // FitAI orange
    let logoBoxColor = "#F97316";

    // Glass panel overlay constants
    const panelFill = "rgba(18, 17, 16, 0.65)";
    const panelBorder = "rgba(255, 255, 255, 0.12)";
    const borderWidth = 1.5;
    const creatorBadgeFont = "800 20px Inter, system-ui, sans-serif";

    if (isEditorial) {
      fontFamily = "Georgia, serif";
      titleFont = "italic 700 68px Georgia, serif";
      labelFont = "700 18px Georgia, serif";
      textColor = "#1A1715";
      textMuted = "#78716C";
      accentColor = "#C2410C";
      logoBoxColor = "#1A1715";
    } else if (isSolar) {
      fontFamily = "Inter, system-ui, sans-serif";
      titleFont = "900 68px Inter, system-ui, sans-serif";
      labelFont = "700 18px Inter, system-ui, sans-serif";
      textColor = "#FAF9F6";
      textMuted = "#A8A29E";
      accentColor = "#F97316"; // Brand orange instead of neon teal
      logoBoxColor = "#F97316";
    }


    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, color: string, font: string, align: "left" | "center" = "left") => {
      ctx.fillStyle = color;
      ctx.font = font;
      ctx.textAlign = align;
      const words = text.split(" ");
      let line = "";
      let currentY = y;
      
      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + " ";
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, x, currentY);
          line = words[n] + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
      ctx.textAlign = "left";
      return currentY;
    };

    const drawCoverImage = (img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      
      const scale = Math.max(w / img.width, h / img.height);
      const imgW = img.width * scale;
      const imgH = img.height * scale;
      const imgX = x + (w - imgW) / 2;
      const imgY = y + (h - imgH) / 2;
      
      ctx.drawImage(img, imgX, imgY, imgW, imgH);
      ctx.restore();
    };

    const drawStructuredImage = (img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.clip();
      
      const scale = Math.max(w / img.width, h / img.height);
      const imgW = img.width * scale;
      const imgH = img.height * scale;
      const imgX = x + (w - imgW) / 2;
      const imgY = y + (h - imgH) / 2;
      
      ctx.drawImage(img, imgX, imgY, imgW, imgH);
      ctx.restore();

      ctx.strokeStyle = isEditorial ? "#1A1715" : "rgba(255,255,255,0.15)";
      ctx.lineWidth = isEditorial ? 3.5 : 3;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.stroke();
    };

    const drawMacrosAndFooter = (macroY: number) => {
      if (isEditorial) {
        // 4 Macros Layout for Light Editorial (Design 2)
        const macros = [
          { label: "PROTEIN", val: `${protein}g` },
          { label: "CARBS", val: `${carbs}g` },
          { label: "FAT", val: `${fats}g` },
          { label: "FIBER", val: `${fiber}g` }
        ];

        const colWidth = 920 / 4; // 230px
        const startX = 80;

        macros.forEach((m, idx) => {
          const centerColX = startX + idx * colWidth + colWidth / 2;
          
          // Draw label: PROTEIN, CARBS, etc.
          ctx.fillStyle = "#78716C";
          ctx.font = "800 16px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(m.label, centerColX, macroY + 25);

          // Draw value: 32g, 64g, etc.
          ctx.fillStyle = "#1A1715";
          ctx.font = "900 32px Inter, sans-serif";
          ctx.fillText(m.val, centerColX, macroY + 70);

          // Draw vertical divider to the right of the column (except last column)
          if (idx < 3) {
            const dividerX = startX + (idx + 1) * colWidth;
            ctx.strokeStyle = "rgba(26, 23, 21, 0.12)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(dividerX, macroY + 10);
            ctx.lineTo(dividerX, macroY + 75);
            ctx.stroke();
          }
        });
        ctx.textAlign = "left"; // reset

        // Draw horizontal line above macros
        ctx.strokeStyle = "rgba(26, 23, 21, 0.12)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(80, macroY - 25);
        ctx.lineTo(1000, macroY - 25);
        ctx.stroke();

        // Footer Drawing for Editorial
        const footerY = canvas.height - 110;
        
        // Hashtag Outline Pill
        ctx.save();
        ctx.strokeStyle = "#F97316";
        ctx.lineWidth = 2;
        ctx.fillStyle = "transparent";
        ctx.beginPath();
        ctx.roundRect(80, footerY + 20, 190, 50, 25);
        ctx.stroke();
        ctx.fill();

        ctx.fillStyle = "#F97316";
        ctx.font = "900 20px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("#FuelYourBest", 175, footerY + 52);
        ctx.restore();

        ctx.fillStyle = "#78716C";
        ctx.font = "700 20px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("fitpush.vercel.app", 1000, footerY + 52);
        ctx.textAlign = "left"; // reset
      } else {
        // Obsidian regular 3-capsule macros layout
        const macros = [
          { name: "Protein", label: "PRO", val: `${protein}g`, color: "#F97316" },
          { name: "Carbs", label: "CARB", val: `${carbs}g`, color: "#0891B2" },
          { name: "Fats", label: "FAT", val: `${fats}g`, color: "#EAB308" }
        ];

        const startPad = 80;
        const cardW = 280;
        const cardGap = 40;
        const cardH = 115;

        macros.forEach((m, idx) => {
          const startX = startPad + idx * (cardW + cardGap);
          
          ctx.fillStyle = isEditorial 
            ? "#FFFFFF" 
            : "rgba(255, 255, 255, 0.05)";
              
          ctx.beginPath();
          ctx.roundRect(startX, macroY, cardW, cardH, 22);
          ctx.fill();

          ctx.strokeStyle = isEditorial 
            ? "#1A1715" 
            : "rgba(255, 255, 255, 0.12)";
              
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(startX, macroY, cardW, cardH, 22);
          ctx.stroke();

          ctx.textAlign = "center";
          
          ctx.fillStyle = isEditorial 
            ? "#78716C" 
            : "#A8A29E";
              
          const useCentered = isObsidian || isSolar;
          ctx.font = useCentered ? "700 16px Inter, sans-serif" : `${labelFont}`;
          
          if (useCentered) {
            ctx.fillText(m.label, startX + cardW / 2, macroY + 42);
          } else {
            // Dot indicator for Editorial
            ctx.save();
            ctx.textAlign = "left";
            ctx.fillStyle = m.color;
            ctx.beginPath();
            ctx.arc(startX + 35, macroY + 58, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = isEditorial ? "#78716C" : "#A8A29E";
            ctx.fillText(m.name.toUpperCase(), startX + 60, macroY + 40);
            ctx.restore();
          }

          ctx.fillStyle = isEditorial 
            ? "#1A1715" 
            : "#FAF9F6";
              
          ctx.font = useCentered ? `900 28px ${fontFamily}` : `900 32px ${fontFamily}`;
          
          if (useCentered) {
            ctx.fillText(m.val, startX + cardW / 2, macroY + 86);
          } else {
            ctx.fillText(m.val, startX + 60, macroY + 84);
          }
          
          ctx.textAlign = "left"; // reset
        });

        const footerY = canvas.height - 110;
        ctx.strokeStyle = isEditorial ? "#1A1715" : "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, footerY);
        ctx.lineTo(1000, footerY);
        ctx.stroke();

        ctx.fillStyle = isObsidian 
          ? "#A8A29E" 
          : isEditorial 
            ? "#78716C" 
            : "#A8A29E";
            
        ctx.font = `700 22px ${fontFamily}`;
        ctx.fillText("FITAI • CALORIE ENGINE", 80, footerY + 45);
        ctx.textAlign = "right";
        ctx.fillText("fitpush.vercel.app", 1000, footerY + 45);
        ctx.textAlign = "left";
      }
    };

    const runTemplateDraw = (loadedImg: HTMLImageElement | null) => {
      ctx.clearRect(0, 0, 1080, canvas.height);
      
      // 1. Draw Background (Cover Photo or Gradient/Solid)
      if (isObsidian) {
        if (loadedImg) {
          drawCoverImage(loadedImg, 0, 0, 1080, canvas.height);
          ctx.fillStyle = "rgba(14, 13, 12, 0.65)";
          ctx.fillRect(0, 0, 1080, canvas.height);
        } else {
          const bgGrad = ctx.createRadialGradient(540, canvas.height / 2, 100, 540, canvas.height / 2, canvas.height);
          bgGrad.addColorStop(0, "#2E2B28");
          bgGrad.addColorStop(1, "#0E0D0C");
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, 1080, canvas.height);
        }
      } else if (isEditorial) {
        ctx.fillStyle = "#FAF6EE";
        ctx.fillRect(0, 0, 1080, canvas.height);
      } else if (isSolar) {
        const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGrad.addColorStop(0, "#292524"); // Stone 800
        bgGrad.addColorStop(0.5, "#1C1917"); // Stone 900
        bgGrad.addColorStop(1, "#0C0A09"); // Stone 950
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1080, canvas.height);

        // Add soft amber light glow
        const glowGrad = ctx.createRadialGradient(540, canvas.height / 2, 50, 540, canvas.height / 2, 600);
        glowGrad.addColorStop(0, "rgba(249, 115, 22, 0.04)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, 1080, canvas.height);
      }

      // 2. Draw Brand Header Logo Box
      ctx.fillStyle = isEditorial ? "#1A1715" : "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(80, 80, 72, 72, 20);
      ctx.fill();

      // SVG Flame Path
      ctx.save();
      ctx.translate(96, 96);
      ctx.scale(1.7, 1.7);
      const flamePath = new Path2D("M8.5 14.5a2.5 2.5 0 0 0 2.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z");
      ctx.fillStyle = isEditorial ? "#FFFFFF" : "#F97316";
      ctx.fill(flamePath);
      ctx.restore();

      ctx.fillStyle = textColor;
      ctx.font = `900 54px ${fontFamily}`;
      ctx.textBaseline = "middle";
      ctx.fillText("FitAI", 172, 116);
      ctx.textBaseline = "alphabetic";

      // Creator Badge
      ctx.fillStyle = isEditorial 
        ? "rgba(26,23,21,0.06)" 
        : "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.roundRect(750, 80, 250, 56, 14);
      ctx.fill();

      ctx.fillStyle = isEditorial ? "#1A1715" : textColor;
      ctx.font = creatorBadgeFont;
      ctx.textAlign = "center";
      ctx.fillText(handleStr, 875, 116);
      ctx.textAlign = "left";

      // 3. Render layouts
      if (isObsidian) {
        // Obsidian Minimal Immersive Layout (Square 1:1)
        const finalY = wrapText(name, 80, 320, 920, 70, textColor, "900 64px Inter, system-ui, sans-serif");
        const subtitleY = finalY + 45;
        
        ctx.fillStyle = textMuted;
        ctx.font = "700 24px Inter, system-ui, sans-serif";
        ctx.fillText(`⏱ LOGGED AT ${time}`, 80, subtitleY);

        ctx.fillStyle = textColor;
        ctx.font = "900 130px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories}`, 80, 560);

        ctx.fillStyle = textMuted;
        ctx.font = "700 24px Inter, system-ui, sans-serif";
        ctx.fillText("TOTAL KCAL", 85, 615);

        drawMacrosAndFooter(820);
      } else if (isEditorial) {
        // Editorial Layout (Square 1:1 Light Premium)
        const finalY = wrapText(name.toUpperCase(), 80, 300, 520, 80, textColor, "900 68px Impact, Inter Condensed, Inter, sans-serif");
        
        // Orange divider line underneath title
        ctx.strokeStyle = "#F97316";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(80, finalY + 40);
        ctx.lineTo(160, finalY + 40);
        ctx.stroke();

        // Description underneath divider line
        const descY = finalY + 95;
        const mealDesc = item.meal_description || "Healthy food logged on FitAI to power daily wellness.";
        wrapText(mealDesc, 80, descY, 520, 38, "#44403C", "500 25px Inter, system-ui, sans-serif");

        // Calories on the right side
        ctx.textAlign = "right";
        ctx.fillStyle = "#F97316"; // orange calories
        ctx.font = "900 140px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories}`, 1000, 480);

        ctx.fillStyle = "#1A1715";
        ctx.font = "900 32px Inter, system-ui, sans-serif";
        ctx.fillText("KCAL", 1000, 550);

        ctx.fillStyle = "#78716C";
        ctx.font = "700 22px Inter, system-ui, sans-serif";
        ctx.fillText("TOTAL KCAL", 1000, 600);
        ctx.textAlign = "left"; // reset

        drawMacrosAndFooter(750);
      } else if (isSolar) {
        // Solar Tech (Symmetric Amber) Layout (Square 1:1)
        const finalY = wrapText(name, 540, 260, 920, 80, textColor, "900 68px Inter, system-ui, sans-serif", "center");
        const subtitleY = finalY + 95;
        ctx.fillStyle = accentColor;
        ctx.font = "900 36px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`⚡ LOGGED AT ${time}`, 540, subtitleY);

        let belowImgY = subtitleY + 30;
        if (loadedImg) {
          const imgCenterX = 540;
          const imgCenterY = subtitleY + 30 + 200;
          const glowGrad = ctx.createRadialGradient(imgCenterX, imgCenterY, 50, imgCenterX, imgCenterY, 250);
          glowGrad.addColorStop(0, "rgba(249, 115, 22, 0.12)"); // Amber ambient glow
          glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(imgCenterX, imgCenterY, 250, 0, Math.PI * 2);
          ctx.fill();

          drawStructuredImage(loadedImg, 290, subtitleY + 30, 500, 400, 28);
          belowImgY = subtitleY + 30 + 400;
        }

        ctx.textAlign = "left";
        const spaceTop = belowImgY + 30;
        const spaceBottom = canvas.height - 280;
        const calCenterY = spaceTop + (spaceBottom - spaceTop) / 2;

        ctx.fillStyle = textColor;
        ctx.font = "900 110px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${calories} kcal`, 540, calCenterY);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";

        drawMacrosAndFooter(canvas.height - 280);
      }
    };

    if (image) {
      const img = new Image();
      img.onload = () => {
        runTemplateDraw(img);
      };
      img.onerror = () => {
        runTemplateDraw(null);
      };
      if (image.startsWith("http")) {
        img.crossOrigin = "anonymous";
      }
      img.src = image;
    } else {
      runTemplateDraw(null);
    }
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
    drawCanvas();
  }, [currentIndex, item, profileData]);

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
    link.download = `${name.replace(/\s+/g, "_").toLowerCase()}_meal.png`;
    link.href = url;
    link.click();
    triggerToast("💾 Meal card downloaded!");
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const file = new File([blob], `${name.replace(/\s+/g, "_").toLowerCase()}_meal.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `FitAI Share: ${name}`,
            text: `Check out my meal log: ${name} on FitAI!`,
            url: finalLink,
          });
        } else {
          await navigator.share({
            title: `FitAI Share: ${name}`,
            text: `Check out my meal log: ${name} on FitAI!`,
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
          .insert({ type: "meal", data: payload })
          .select("id")
          .single();

        if (inserted) {
          setShortUrl(generateShareUrl("meal", payload, inserted.id));
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
            Share Meal Log
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

            <div className="w-full aspect-video rounded-xl relative overflow-hidden bg-stone-900 flex flex-col justify-end p-3 border border-stone-200/40 shrink-0">
              {payload.img ? (
                <img src={payload.img} className="absolute inset-0 w-full h-full object-cover opacity-60" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <Utensils className="w-12 h-12 text-white" />
                </div>
              )}
              <div className="relative z-10 space-y-0.5">
                <h4 className="text-white text-xs font-black drop-shadow-xs truncate">{name}</h4>
                <p className="text-[8px] text-white/80 font-bold flex items-center gap-1">
                  <span>⏱️ {time}</span>
                  <span>•</span>
                  <span>Logged by {handleStr}</span>
                </p>
              </div>
            </div>

            {item.meal_description && (
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-2.5 text-[9.5px] text-stone-600 font-bold leading-relaxed">
                📝 {item.meal_description}
              </div>
            )}

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
