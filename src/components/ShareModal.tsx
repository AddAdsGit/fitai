import React, { useState, useEffect, useRef } from "react";
import { X, Copy, Download, Share2, Flame, Check, ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SharedItemPayload, generateShareUrl } from "../utils/shareUtils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

interface ShareModalProps {
  type: "meal" | "recipe";
  item: any; // Meal or Recipe object
  profileData: any; // User profile containing username
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

type ShareTemplate = "obsidian" | "cream" | "emerald" | "sunset";

export const ShareModal: React.FC<ShareModalProps> = ({
  type,
  item,
  profileData,
  onClose,
  triggerToast,
}) => {
  const templates: ShareTemplate[] = ["obsidian", "cream", "emerald", "sunset"];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTemplate = templates[currentIndex];

  const handleStr = profileData?.username
    ? `@${profileData.username}`
    : profileData?.name
    ? `@${profileData.name.toLowerCase().replace(/\s+/g, "")}`
    : "@mk";

  const isMeal = type === "meal";
  const name = item.name || "Unnamed Item";
  const calories = Number(item.calories || 0);
  const protein = Number(item.protein || 0);
  const carbs = Number(item.carbs || 0);
  const fats = Number(item.fats || 0);
  const fiber = Number(item.fiber || 0);
  const time = item.time || (isMeal ? "12:00 PM" : "15 mins");
  const image = item.image || "";

  const payload: SharedItemPayload = {
    n: name,
    c: calories,
    p: protein,
    cb: carbs,
    f: fats,
    fb: fiber,
    t: time,
    img: image || undefined,
  };

  useEffect(() => {
    async function getOrCreateShortLink() {
      if (!isSupabaseConfigured) return;
      setLoadingUrl(true);
      try {
        const { data: existing } = await supabase
          .from("shares")
          .select("id")
          .eq("type", type)
          .eq("data", payload)
          .limit(1)
          .maybeSingle();

        if (existing) {
          setShortUrl(generateShareUrl(type, payload, existing.id));
          return;
        }

        const { data: inserted } = await supabase
          .from("shares")
          .insert({ type, data: payload })
          .select("id")
          .single();

        if (inserted) {
          setShortUrl(generateShareUrl(type, payload, inserted.id));
        }
      } catch (err) {
        console.error("Error creating database share:", err);
      } finally {
        setLoadingUrl(false);
      }
    }
    getOrCreateShortLink();
  }, [type, name]);

  const finalLink = shortUrl || generateShareUrl(type, payload);

  // HTML5 Canvas draw function
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1080;

    const accentColor = "#F97316";

    // Text Wrapping Helper
    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, color: string, font: string) => {
      ctx.fillStyle = color;
      ctx.font = font;
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
      return currentY;
    };

    const runTemplateDraw = (loadedImg: HTMLImageElement | null) => {
      ctx.clearRect(0, 0, 1080, 1080);
      
      if (currentTemplate === "obsidian") {
        // ================= TEMPLATE 1: OBSIDIAN DARK (PHOTO OR DARK SOLID) =================
        if (loadedImg) {
          ctx.drawImage(loadedImg, 0, 0, 1080, 1080);
          const overlay = ctx.createLinearGradient(0, 0, 0, 1080);
          overlay.addColorStop(0, "rgba(0,0,0,0.3)");
          overlay.addColorStop(0.5, "rgba(0,0,0,0.45)");
          overlay.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = overlay;
          ctx.fillRect(0, 0, 1080, 1080);
        } else {
          ctx.fillStyle = "#1C1917";
          ctx.fillRect(0, 0, 1080, 1080);
        }

        // Draw FitAI Logo Left
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(80, 80, 72, 72, 20);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(116, 96);
        ctx.bezierCurveTo(110, 105, 106, 114, 106, 122);
        ctx.bezierCurveTo(106, 131, 112, 138, 120, 138);
        ctx.bezierCurveTo(128, 138, 134, 131, 134, 122);
        ctx.bezierCurveTo(134, 110, 120, 102, 116, 96);
        ctx.fill();

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "black 54px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("FitAI", 172, 116);

        // Draw User Handle Tag Right
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.roundRect(750, 80, 250, 56, 14);
        ctx.fill();

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "extrabold 20px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(handleStr, 875, 108);
        ctx.textAlign = "left";

        // Title Food Name
        const finalY = wrapText(name, 80, 260, 920, 84, "#FAF9F6", "black 68px Inter, system-ui, sans-serif");

        // Calories
        ctx.fillStyle = accentColor;
        ctx.font = "black 28px Inter, system-ui, sans-serif";
        ctx.fillText(`⏱️ TRACKED AT ${time}`, 80, finalY + 70);

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "black 170px Inter, system-ui, sans-serif";
        const calY = finalY + 235;
        ctx.fillText(`${calories}`, 80, calY);

        ctx.fillStyle = "#A8A29E";
        ctx.font = "bold 32px Inter, system-ui, sans-serif";
        ctx.fillText("TOTAL KCAL", 85, calY + 60);

        // Macros Row
        const macroY = 820;
        const macros = [
          { name: "Protein", val: `${protein}g`, color: "#F97316" },
          { name: "Carbs", val: `${carbs}g`, color: "#0891B2" },
          { name: "Fats", val: `${fats}g`, color: "#EAB308" }
        ];

        macros.forEach((m, idx) => {
          const startX = 80 + idx * 320;
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.beginPath();
          ctx.roundRect(startX, macroY, 280, 110, 20);
          ctx.fill();

          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(startX + 35, macroY + 55, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#A8A29E";
          ctx.font = "bold 18px Inter, system-ui, sans-serif";
          ctx.fillText(m.name.toUpperCase(), startX + 60, macroY + 38);

          ctx.fillStyle = "#FAF9F6";
          ctx.font = "black 30px Inter, system-ui, sans-serif";
          ctx.fillText(m.val, startX + 60, macroY + 80);
        });

        // Footer
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, 970);
        ctx.lineTo(1000, 970);
        ctx.stroke();

        ctx.fillStyle = "#A8A29E";
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillText("FITAI • CALORIE ENGINE", 80, 1015);
        ctx.textAlign = "right";
        ctx.fillText("fitpush.vercel.app", 1000, 1015);
        ctx.textAlign = "left";

      } else if (currentTemplate === "cream") {
        // ================= TEMPLATE 2: CREAM LIGHT (MENU CARD SOLID) =================
        ctx.fillStyle = "#FAF9F6";
        ctx.fillRect(0, 0, 1080, 1080);

        // Logo Left
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(80, 80, 72, 72, 20);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(116, 96);
        ctx.bezierCurveTo(110, 105, 106, 114, 106, 122);
        ctx.bezierCurveTo(106, 131, 112, 138, 120, 138);
        ctx.bezierCurveTo(128, 138, 134, 131, 134, 122);
        ctx.bezierCurveTo(134, 110, 120, 102, 116, 96);
        ctx.fill();

        ctx.fillStyle = "#1C1917";
        ctx.font = "black 54px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("FitAI", 172, 116);

        // User Handle Right
        ctx.fillStyle = "#E7E5E4";
        ctx.beginPath();
        ctx.roundRect(750, 80, 250, 56, 14);
        ctx.fill();

        ctx.fillStyle = "#1C1917";
        ctx.font = "extrabold 20px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(handleStr, 875, 108);
        ctx.textAlign = "left";

        const circleX = 540;
        const circleY = 440;

        if (loadedImg) {
          // Circular Image Polaroid
          ctx.save();
          ctx.beginPath();
          ctx.arc(circleX, circleY, 170, 0, Math.PI * 2);
          ctx.clip();
          // Draw Image scaled & centered
          const scale = Math.max(340 / loadedImg.width, 340 / loadedImg.height);
          const xOffset = circleX - (loadedImg.width * scale) / 2;
          const yOffset = circleY - (loadedImg.height * scale) / 2;
          ctx.drawImage(loadedImg, xOffset, yOffset, loadedImg.width * scale, loadedImg.height * scale);
          ctx.restore();

          // Border Ring
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.arc(circleX, circleY, 170, 0, Math.PI * 2);
          ctx.stroke();

          // Calorie Badge overlapping bottom
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.roundRect(circleX - 90, circleY + 130, 180, 56, 16);
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "black 26px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${calories} KCAL`, circleX, circleY + 167);
          ctx.textAlign = "left";
        } else {
          // Centered Circular Calorie Ring
          ctx.strokeStyle = "#E7E5E4";
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.arc(circleX, circleY, 150, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.arc(circleX, circleY, 150, -Math.PI / 2, Math.PI * 1.2);
          ctx.stroke();

          ctx.fillStyle = "#1C1917";
          ctx.font = "black 72px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${calories}`, circleX, circleY - 10);
          ctx.fillStyle = "#78716C";
          ctx.font = "bold 20px Inter, system-ui, sans-serif";
          ctx.fillText("KCAL", circleX, circleY + 50);
          ctx.textAlign = "left";
        }

        // Food Title below ring
        const titleY = loadedImg ? 735 : 715;
        wrapText(name, 80, titleY, 920, 68, "#1C1917", "black 48px Inter, system-ui, sans-serif");

        // Macros text Row
        const macroY = 880;
        ctx.fillStyle = "#1C1917";
        ctx.font = "extrabold 28px Inter, system-ui, sans-serif";
        ctx.fillText(`PROTEIN: ${protein}g  •  CARBS: ${carbs}g  •  FATS: ${fats}g`, 80, macroY);

        // Footer
        ctx.strokeStyle = "#E7E5E4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, 970);
        ctx.lineTo(1000, 970);
        ctx.stroke();

        ctx.fillStyle = "#78716C";
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillText("FITAI • MINIMALIST CALORIE ENGINE", 80, 1015);
        ctx.textAlign = "right";
        ctx.fillText("fitpush.vercel.app", 1000, 1015);
        ctx.textAlign = "left";

      } else if (currentTemplate === "emerald") {
        // ================= TEMPLATE 3: EMERALD SOLID GREEN (NUTRITION FOCUS) =================
        ctx.fillStyle = "#064E3B"; // Rich solid green
        ctx.fillRect(0, 0, 1080, 1080);

        if (loadedImg) {
          // Left Split Image Column
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, 480, 1080);
          ctx.clip();
          // Draw Image
          const scale = Math.max(480 / loadedImg.width, 1080 / loadedImg.height);
          const xOffset = 240 - (loadedImg.width * scale) / 2;
          const yOffset = 540 - (loadedImg.height * scale) / 2;
          ctx.drawImage(loadedImg, xOffset, yOffset, loadedImg.width * scale, loadedImg.height * scale);
          ctx.restore();

          // Split division line
          ctx.strokeStyle = "rgba(250,249,246,0.15)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(480, 0);
          ctx.lineTo(480, 1080);
          ctx.stroke();
        }

        // Adjust text positioning depending on split layout
        const textOffset = loadedImg ? 540 : 80;
        const textMaxW = loadedImg ? 460 : 500;
        const statsOffset = loadedImg ? 540 : 640;

        // Logo
        ctx.fillStyle = "#FAF9F6";
        ctx.beginPath();
        ctx.roundRect(textOffset, 80, 72, 72, 20);
        ctx.fill();

        ctx.fillStyle = "#064E3B";
        ctx.beginPath();
        ctx.moveTo(textOffset + 36, 96);
        ctx.bezierCurveTo(textOffset + 30, 105, textOffset + 26, 114, textOffset + 26, 122);
        ctx.bezierCurveTo(textOffset + 26, 131, textOffset + 32, 138, textOffset + 40, 138);
        ctx.bezierCurveTo(textOffset + 48, 138, textOffset + 54, 131, textOffset + 54, 122);
        ctx.bezierCurveTo(textOffset + 54, 110, textOffset + 40, 102, textOffset + 36, 96);
        ctx.fill();

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "black 54px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("FitAI", textOffset + 92, 116);

        // User Handle Right
        ctx.fillStyle = "rgba(250,249,246,0.15)";
        ctx.beginPath();
        ctx.roundRect(750, 80, 250, 56, 14);
        ctx.fill();

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "extrabold 20px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(handleStr, 875, 108);
        ctx.textAlign = "left";

        // Food Name Wrap
        const nameY = wrapText(name, textOffset, 240, textMaxW + 80, 68, "#FAF9F6", "black 50px Inter, system-ui, sans-serif");

        // Calorie Output
        ctx.fillStyle = "#10B981";
        ctx.font = "black 120px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories}`, textOffset, nameY + 130);
        ctx.fillStyle = "#A7F3D0";
        ctx.font = "bold 24px Inter, system-ui, sans-serif";
        ctx.fillText("DAILY CALORIES LOGGED", textOffset, nameY + 180);

        // Macros stats
        const mStats = [
          { label: "PROTEIN", val: `${protein}g`, bar: protein / 150 },
          { label: "CARBS", val: `${carbs}g`, bar: carbs / 200 },
          { label: "FATS", val: `${fats}g`, bar: fats / 70 }
        ];

        const barWidth = loadedImg ? 460 : 360;

        mStats.forEach((stat, i) => {
          const itemY = 560 + i * 130;
          ctx.fillStyle = "#A7F3D0";
          ctx.font = "bold 16px Inter, system-ui, sans-serif";
          ctx.fillText(stat.label, statsOffset, itemY);

          ctx.fillStyle = "#FAF9F6";
          ctx.font = "black 36px Inter, system-ui, sans-serif";
          ctx.fillText(stat.val, statsOffset, itemY + 36);

          // Progress bar background
          ctx.fillStyle = "rgba(250,249,246,0.1)";
          ctx.beginPath();
          ctx.roundRect(statsOffset, itemY + 54, barWidth, 10, 5);
          ctx.fill();

          // Progress bar value
          ctx.fillStyle = "#10B981";
          ctx.beginPath();
          ctx.roundRect(statsOffset, itemY + 54, Math.min(barWidth, Math.max(10, barWidth * stat.bar)), 10, 5);
          ctx.fill();
        });

        // Footer
        ctx.strokeStyle = "rgba(250,249,246,0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(textOffset, 970);
        ctx.lineTo(1000, 970);
        ctx.stroke();

        ctx.fillStyle = "#A7F3D0";
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillText("FITAI • FRESH LOG SYSTEM", textOffset, 1015);
        ctx.textAlign = "right";
        ctx.fillText("fitpush.vercel.app", 1000, 1015);
        ctx.textAlign = "left";

      } else if (currentTemplate === "sunset") {
        // ================= TEMPLATE 4: SUNSET GLOW (GRADIENT + PHOTO OVERLAY) =================
        if (loadedImg) {
          ctx.drawImage(loadedImg, 0, 0, 1080, 1080);
          const sunsetGradOverlay = ctx.createLinearGradient(0, 0, 1080, 1080);
          sunsetGradOverlay.addColorStop(0, "rgba(255, 78, 80, 0.45)");
          sunsetGradOverlay.addColorStop(1, "rgba(249, 212, 35, 0.45)");
          ctx.fillStyle = sunsetGradOverlay;
          ctx.fillRect(0, 0, 1080, 1080);
        } else {
          const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
          grad.addColorStop(0, "#FF4E50");
          grad.addColorStop(1, "#F9D423");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1080, 1080);
        }

        // Logo Left
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(80, 80, 72, 72, 20);
        ctx.fill();

        ctx.fillStyle = "#FF4E50";
        ctx.beginPath();
        ctx.moveTo(116, 96);
        ctx.bezierCurveTo(110, 105, 106, 114, 106, 122);
        ctx.bezierCurveTo(106, 131, 112, 138, 120, 138);
        ctx.bezierCurveTo(128, 138, 134, 131, 134, 122);
        ctx.bezierCurveTo(134, 110, 120, 102, 116, 96);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "black 54px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("FitAI", 172, 116);

        // User Handle Right
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.roundRect(750, 80, 250, 56, 14);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "extrabold 20px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(handleStr, 875, 108);
        ctx.textAlign = "left";

        // Central Glassmorphic Card Panel
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.roundRect(80, 220, 920, 710, 32);
        ctx.fill();

        wrapText(name, 130, 310, 820, 76, "#FFFFFF", "black 60px Inter, system-ui, sans-serif");

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "black 160px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories}`, 130, 580);
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = "bold 26px Inter, system-ui, sans-serif";
        ctx.fillText("TOTAL CALORIES INGESTED", 135, 630);

        // Macros
        const macroY = 740;
        const macros = [
          { name: "Protein", val: `${protein}g` },
          { name: "Carbs", val: `${carbs}g` },
          { name: "Fats", val: `${fats}g` }
        ];

        macros.forEach((m, idx) => {
          const startX = 130 + idx * 280;
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.beginPath();
          ctx.roundRect(startX, macroY, 240, 110, 16);
          ctx.fill();

          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = "bold 16px Inter, system-ui, sans-serif";
          ctx.fillText(m.name.toUpperCase(), startX + 30, macroY + 38);

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "black 28px Inter, system-ui, sans-serif";
          ctx.fillText(m.val, startX + 30, macroY + 80);
        });

        // Footer
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, 970);
        ctx.lineTo(1000, 970);
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillText("FITAI • ENERGY STREAM", 80, 1015);
        ctx.textAlign = "right";
        ctx.fillText("fitpush.vercel.app", 1000, 1015);
        ctx.textAlign = "left";
      }
    };

    if (hasImage) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = payload.img || "";
      img.onload = () => {
        runTemplateDraw(img);
      };
      img.onerror = () => {
        runTemplateDraw(null);
      };
    } else {
      runTemplateDraw(null);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % templates.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + templates.length) % templates.length);
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
    link.download = `${name.replace(/\s+/g, "_").toLowerCase()}_card.png`;
    link.href = url;
    link.click();
    triggerToast("💾 Infographic card downloaded!");
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${name.replace(/\s+/g, "_").toLowerCase()}_card.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `FitAI Share: ${name}`,
            text: `Check out this ${type === "meal" ? "meal log" : "recipe"} on FitAI!`,
            url: finalLink,
          });
        } else {
          await navigator.share({
            title: `FitAI Share: ${name}`,
            text: `Check out this ${type === "meal" ? "meal log" : "recipe"} on FitAI!`,
            url: finalLink,
          });
        }
      });
    } catch (err) {
      handleCopyLink();
    }
  };

  const hasImage = !!payload.img;

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
        className="bg-stone-50 border border-white rounded-[32px] w-full max-w-[400px] shadow-2xl p-6 flex flex-col items-center gap-6"
      >
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
            Swipe Templates
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-stone-200/50 hover:bg-stone-200 text-stone-500 rounded-full flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Carousel Container */}
        <div className="relative w-full aspect-square flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTemplate}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) handlePrev();
                else if (info.offset.x < -80) handleNext();
              }}
              style={
                (currentTemplate === "obsidian" || currentTemplate === "sunset") && hasImage
                  ? { backgroundImage: `url(${payload.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : {}
              }
              className={`w-full h-full rounded-[28px] p-6 flex flex-col justify-between shadow-xl relative overflow-hidden select-none cursor-grab active:cursor-grabbing border ${
                (currentTemplate === "obsidian" || currentTemplate === "sunset") && hasImage
                  ? "text-white border-transparent"
                  : currentTemplate === "obsidian"
                  ? "bg-stone-900 text-stone-100 border-stone-850"
                  : currentTemplate === "cream"
                  ? "bg-[#FAF9F6] text-stone-950 border-stone-200"
                  : currentTemplate === "emerald" && hasImage
                  ? "bg-[#064E3B] text-[#FAF9F6] border-transparent p-0 flex-col overflow-hidden"
                  : currentTemplate === "emerald"
                  ? "bg-[#064E3B] text-[#FAF9F6] border-transparent"
                  : "bg-gradient-to-br from-[#FF4E50] to-[#F9D423] text-white border-transparent"
              }`}
            >
              {/* Obsidian/Sunset Image Overlay */}
              {((currentTemplate === "obsidian" || currentTemplate === "sunset") && hasImage) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/30 z-0 pointer-events-none" />
              )}

              {/* Logo block (Only rendered for non-split template views; split view has its own logo inside) */}
              {!(currentTemplate === "emerald" && hasImage) && (
                <div className="flex justify-between items-center z-10">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shadow-md ${
                      currentTemplate === "sunset" || (currentTemplate === "obsidian" && hasImage) ? "bg-white text-orange-500" : "bg-orange-500 text-white"
                    }`}>
                      <Flame className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-black tracking-tight">FitAI</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider ${
                    currentTemplate === "sunset" || (currentTemplate === "obsidian" && hasImage)
                      ? "bg-white/20 text-white"
                      : currentTemplate === "obsidian"
                      ? "bg-stone-800 text-stone-300"
                      : currentTemplate === "emerald"
                      ? "bg-[#10B981]/25 text-[#A7F3D0]"
                      : "bg-stone-200 text-stone-750"
                  }`}>
                    {handleStr}
                  </span>
                </div>
              )}

              {/* Layout Content Rendering based on template */}
              {currentTemplate === "cream" ? (
                // ================= CREAM LAYOUT (CENTERED RING OR POLAROID BADGE) =================
                <div className="my-auto flex flex-col items-center gap-4 z-10 text-center">
                  {hasImage ? (
                    <div className="w-32 h-32 rounded-full border-[5px] border-orange-500 overflow-hidden relative shadow-md bg-stone-100 flex items-center justify-center shrink-0">
                      <img src={payload.img} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 bg-orange-500 text-white text-[8px] font-black px-2.5 py-1 rounded-full shadow-2xs">
                        {calories} KCAL
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-orange-500 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-stone-900">{calories}</span>
                      <span className="text-[8px] font-bold text-stone-500">KCAL</span>
                    </div>
                  )}
                  <h3 className="text-base font-black leading-tight tracking-tight mt-1 text-stone-950 line-clamp-2">
                    {name}
                  </h3>
                  <div className="text-[10px] font-extrabold text-stone-600">
                    PROTEIN: {protein}g  •  CARBS: {carbs}g  •  FATS: {fats}g
                  </div>
                </div>
              ) : currentTemplate === "emerald" && hasImage ? (
                // ================= EMERALD LAYOUT (SPLIT WITH IMAGE) =================
                <div className="w-full h-full flex flex-col text-left">
                  <div className="w-full h-[42%] relative overflow-hidden border-b border-white/10 shrink-0">
                    <img src={payload.img} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#064E3B]/80 to-transparent" />
                    {/* Logo block inside image */}
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 text-white">
                      <div className="w-5 h-5 rounded bg-orange-500 text-white flex items-center justify-center shadow-md">
                        <Flame className="w-3 h-3" />
                      </div>
                      <span className="text-[10px] font-black tracking-tight">FitAI</span>
                    </div>
                    {/* Handle inside image */}
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider text-white">
                      {handleStr}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between bg-[#064E3B]">
                    <div>
                      <h3 className="text-xs font-black leading-tight tracking-tight text-white line-clamp-2">
                        {name}
                      </h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[#10B981]">{calories}</span>
                        <span className="text-[7.5px] font-bold text-[#A7F3D0] tracking-wider uppercase">KCAL LOGGED</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 mt-2">
                      {[
                        { label: "Protein", val: `${protein}g`, bar: protein / 150 },
                        { label: "Carbs", val: `${carbs}g`, bar: carbs / 200 },
                        { label: "Fats", val: `${fats}g`, bar: fats / 70 }
                      ].map((macro) => (
                        <div key={macro.label} className="text-left">
                          <div className="flex justify-between items-center text-[7.5px] font-bold text-[#A7F3D0] uppercase tracking-wider">
                            <span>{macro.label}</span>
                            <span className="text-white">{macro.val}</span>
                          </div>
                          <div className="w-full h-1 bg-white/10 rounded-full mt-0.5 overflow-hidden">
                            <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${Math.min(100, Math.max(5, macro.bar * 100))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : currentTemplate === "emerald" ? (
                // ================= EMERALD LAYOUT (SPLIT SOLID GREEN) =================
                <div className="my-auto grid grid-cols-2 gap-4 text-left z-10">
                  <div className="space-y-3">
                    <h3 className="text-sm font-black leading-tight tracking-tight line-clamp-3">
                      {name}
                    </h3>
                    <div>
                      <span className="text-4xl font-black text-[#10B981]">{calories}</span>
                      <span className="text-[8px] font-bold text-[#A7F3D0] block tracking-wider mt-0.5">KCAL LOGGED</span>
                    </div>
                  </div>
                  <div className="space-y-2 border-l border-emerald-800/40 pl-3">
                    {[
                      { label: "Protein", val: `${protein}g` },
                      { label: "Carbs", val: `${carbs}g` },
                      { label: "Fats", val: `${fats}g` }
                    ].map((macro) => (
                      <div key={macro.label}>
                        <span className="text-[7.5px] font-bold text-[#A7F3D0] uppercase tracking-wider block">{macro.label}</span>
                        <span className="text-sm font-black text-white">{macro.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : currentTemplate === "sunset" ? (
                // ================= SUNSET GLASS PANELS =================
                <div className="my-auto p-4 rounded-2xl bg-white/10 backdrop-blur-md text-left z-10 space-y-3">
                  <h3 className="text-base font-black leading-tight tracking-tight line-clamp-2">
                    {name}
                  </h3>
                  <div>
                    <span className="text-5xl font-black tracking-tight">{calories}</span>
                    <span className="text-[8px] font-bold text-white/70 block tracking-widest mt-0.5">TOTAL KCAL</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
                    {[
                      { l: "Pro", v: `${protein}g` },
                      { l: "Carb", v: `${carbs}g` },
                      { l: "Fat", v: `${fats}g` }
                    ].map((m) => (
                      <div key={m.l} className="bg-white/10 rounded-lg p-1.5 text-center">
                        <span className="text-[7px] text-white/70 block uppercase tracking-wider">{m.l}</span>
                        <span className="text-xs font-extrabold">{m.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // ================= OBSIDIAN ATHLETIC LAYOUT =================
                <div className="my-auto space-y-3.5 text-left z-10">
                  <h3 className="text-lg font-black leading-tight tracking-tight mt-2 line-clamp-2">
                    {name}
                  </h3>
                  <span className={`text-[10px] font-black uppercase tracking-wider block ${
                    hasImage ? "text-white" : "text-orange-500"
                  }`}>
                    ⏱️ LOGGED AT {time}
                  </span>
                  <div className="py-1">
                    <span className="text-4xl font-black tracking-tight">{calories}</span>
                    <span className="text-[8px] font-bold text-stone-400 block tracking-widest mt-0.5">
                      TOTAL KCAL
                    </span>
                  </div>
                </div>
              )}

              {/* Obsidian/Default Bottom Macros Grid */}
              {currentTemplate !== "cream" && !(currentTemplate === "emerald" && hasImage) && currentTemplate !== "emerald" && currentTemplate !== "sunset" && (
                <div className={`grid grid-cols-3 gap-2 border-t pt-4 z-10 ${
                  hasImage ? "border-white/15" : "border-stone-200/20"
                }`}>
                  {[
                    { label: "Pro", val: protein },
                    { label: "Carb", val: carbs },
                    { label: "Fat", val: fats }
                  ].map((m) => (
                    <div
                      key={m.label}
                      className={`p-2 rounded-xl text-center border ${
                        hasImage
                          ? "bg-white/10 border-transparent text-white"
                          : "bg-stone-850 border-stone-800 text-stone-200"
                      }`}
                    >
                      <span className="text-[7.5px] font-black text-stone-400 block uppercase tracking-wider">
                        {m.label}
                      </span>
                      <span className="text-xs font-extrabold mt-0.5 block">{m.val}g</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pagination & Navigation Row */}
        <div className="flex items-center gap-6 select-none mt-1">
          <button
            onClick={handlePrev}
            className="w-7 h-7 rounded-full bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 shadow-2xs flex items-center justify-center cursor-pointer transition-colors active:scale-95"
            title="Previous template"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex gap-1.5">
            {templates.map((t, idx) => (
              <button
                key={t}
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
            title="Next template"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={handleCopyLink}
            disabled={loadingUrl}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-100 active:scale-98 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied!" : "Copy Shareable Link"}</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5 w-full">
            <button
              onClick={handleDownloadImage}
              className="flex-1 bg-stone-900 hover:bg-stone-850 text-white text-[10px] font-black uppercase tracking-wider py-3 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
            <button
              onClick={handleNativeShare}
              className="flex-1 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-[10px] font-black uppercase tracking-wider py-3 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Card</span>
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </motion.div>
    </motion.div>
  );
};
