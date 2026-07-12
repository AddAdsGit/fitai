import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Copy, Download, Share2, Flame, Check, ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
  const templates = ["obsidian", "cream", "emerald", "sunset"] as const;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"card" | "webpage">("card");

  // Meal customization toggles
  const [showMealTime, setShowMealTime] = useState(true);
  const [showMealPhoto, setShowMealPhoto] = useState(true);
  const [showMealDesc, setShowMealDesc] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTemplate = templates[currentIndex];

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
    canvas.height = 1080;

    const accentColor = "#F97316";

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
      
      const isDark = currentTemplate === "obsidian";
      const isSunset = currentTemplate === "sunset";
      let bgColor = isDark ? "#1C1917" : "#FAF9F6";
      let txtColor = isDark ? "#FAF9F6" : "#1C1917";
      let subTxtColor = isDark ? "#A8A29E" : "#78716C";

      if (currentTemplate === "obsidian") {
        if (loadedImg && showMealPhoto) {
          const scale = Math.max(1080 / loadedImg.width, 1080 / loadedImg.height);
          const xOffset = 540 - (loadedImg.width * scale) / 2;
          const yOffset = 540 - (loadedImg.height * scale) / 2;
          ctx.drawImage(loadedImg, xOffset, yOffset, loadedImg.width * scale, loadedImg.height * scale);
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

        // FitAI Flame Logo
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(80, 80, 72, 72, 20);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(116, 92);
        ctx.bezierCurveTo(104, 106, 98, 116, 98, 126);
        ctx.bezierCurveTo(98, 137, 106, 144, 116, 144);
        ctx.bezierCurveTo(126, 144, 134, 137, 134, 126);
        ctx.bezierCurveTo(134, 112, 120, 100, 116, 92);
        ctx.fill();
        
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(116, 112);
        ctx.bezierCurveTo(110, 120, 106, 126, 106, 132);
        ctx.bezierCurveTo(106, 138, 110, 141, 116, 141);
        ctx.bezierCurveTo(122, 141, 126, 138, 126, 132);
        ctx.bezierCurveTo(126, 124, 118, 117, 116, 112);
        ctx.fill();

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "black 54px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("FitAI", 172, 116);

        // Creator Badge
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.roundRect(750, 80, 250, 56, 14);
        ctx.fill();

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "extrabold 20px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(handleStr, 875, 108);
        ctx.textAlign = "left";

        const finalY = wrapText(name, 80, 260, 920, 84, "#FAF9F6", "black 68px Inter, system-ui, sans-serif");

        // Header/Time text
        let headerText = "";
        if (showMealTime) {
          headerText = `⚡ LOGGED AT ${time}`;
        }
        if (headerText) {
          headerText += ` BY ${handleStr.toUpperCase()}`;
        } else {
          headerText = `BY ${handleStr.toUpperCase()}`;
        }

        ctx.fillStyle = accentColor;
        ctx.font = "black 28px Inter, system-ui, sans-serif";
        ctx.fillText(headerText, 80, finalY + 70);

        let calY = finalY + 235;
        if (showMealDesc && item.meal_description) {
          const descY = wrapText(item.meal_description, 80, finalY + 115, 920, 36, "#FAF9F6", "medium 23px Inter, system-ui, sans-serif");
          calY = descY + 140;
        }

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "black 170px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories}`, 80, calY);

        ctx.fillStyle = "#A8A29E";
        ctx.font = "bold 32px Inter, system-ui, sans-serif";
        ctx.fillText("TOTAL KCAL", 85, calY + 60);

      } else if (currentTemplate === "cream") {
        ctx.fillStyle = "#FAF9F6";
        ctx.fillRect(0, 0, 1080, 1080);

        // Logo Box (Flame)
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(80, 80, 72, 72, 20);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(116, 92);
        ctx.bezierCurveTo(104, 106, 98, 116, 98, 126);
        ctx.bezierCurveTo(98, 137, 106, 144, 116, 144);
        ctx.bezierCurveTo(126, 144, 134, 137, 134, 126);
        ctx.bezierCurveTo(134, 112, 120, 100, 116, 92);
        ctx.fill();
        
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(116, 112);
        ctx.bezierCurveTo(110, 120, 106, 126, 106, 132);
        ctx.bezierCurveTo(106, 138, 110, 141, 116, 141);
        ctx.bezierCurveTo(122, 141, 126, 138, 126, 132);
        ctx.bezierCurveTo(126, 124, 118, 117, 116, 112);
        ctx.fill();

        ctx.fillStyle = "#1C1917";
        ctx.font = "black 54px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("FitAI", 172, 116);

        // Creator Badge
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

        if (loadedImg && showMealPhoto) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(circleX, circleY, 170, 0, Math.PI * 2);
          ctx.clip();
          const scale = Math.max(340 / loadedImg.width, 340 / loadedImg.height);
          const xOffset = circleX - (loadedImg.width * scale) / 2;
          const yOffset = circleY - (loadedImg.height * scale) / 2;
          ctx.drawImage(loadedImg, xOffset, yOffset, loadedImg.width * scale, loadedImg.height * scale);
          ctx.restore();

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.arc(circleX, circleY, 170, 0, Math.PI * 2);
          ctx.stroke();

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

        const titleY = (loadedImg && showMealPhoto) ? 735 : 715;
        const nameY = wrapText(name, 80, titleY, 920, 68, "#1C1917", "black 48px Inter, system-ui, sans-serif");

        // Subtext / time
        let subText = `Logged by ${handleStr}`;
        if (showMealTime) {
          subText += ` • ⏱️ ${time}`;
        }
        ctx.fillStyle = "#78716C";
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillText(subText, 80, nameY + 50);

      } else if (currentTemplate === "emerald") {
        ctx.fillStyle = "#064E3B";
        ctx.fillRect(0, 0, 1080, 1080);

        if (loadedImg && showMealPhoto) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, 480, 1080);
          ctx.clip();
          const scale = Math.max(480 / loadedImg.width, 1080 / loadedImg.height);
          const xOffset = 240 - (loadedImg.width * scale) / 2;
          const yOffset = 540 - (loadedImg.height * scale) / 2;
          ctx.drawImage(loadedImg, xOffset, yOffset, loadedImg.width * scale, loadedImg.height * scale);
          ctx.restore();

          ctx.strokeStyle = "rgba(250,249,246,0.15)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(480, 0);
          ctx.lineTo(480, 1080);
          ctx.stroke();
        }

        const textOffset = (loadedImg && showMealPhoto) ? 540 : 80;
        const textMaxW = (loadedImg && showMealPhoto) ? 460 : 500;
        const statsOffset = (loadedImg && showMealPhoto) ? 540 : 640;

        ctx.fillStyle = "#FAF9F6";
        ctx.beginPath();
        ctx.roundRect(textOffset, 80, 72, 72, 20);
        ctx.fill();

        ctx.fillStyle = "#064E3B";
        ctx.beginPath();
        ctx.moveTo(textOffset + 36, 92);
        ctx.bezierCurveTo(textOffset + 24, 106, textOffset + 18, 116, textOffset + 18, 126);
        ctx.bezierCurveTo(textOffset + 18, 137, textOffset + 26, 144, textOffset + 36, 144);
        ctx.bezierCurveTo(textOffset + 46, 144, textOffset + 54, 137, textOffset + 54, 126);
        ctx.bezierCurveTo(textOffset + 54, 112, textOffset + 40, 100, textOffset + 36, 92);
        ctx.fill();
        
        ctx.fillStyle = "#FAF9F6";
        ctx.beginPath();
        ctx.moveTo(textOffset + 36, 112);
        ctx.bezierCurveTo(textOffset + 30, 120, textOffset + 26, 126, textOffset + 26, 132);
        ctx.bezierCurveTo(textOffset + 26, 138, textOffset + 30, 141, textOffset + 36, 141);
        ctx.bezierCurveTo(textOffset + 42, 141, textOffset + 46, 138, textOffset + 46, 132);
        ctx.bezierCurveTo(textOffset + 46, 124, textOffset + 38, 117, textOffset + 36, 112);
        ctx.fill();

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "black 54px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("FitAI", textOffset + 92, 116);

        ctx.fillStyle = "rgba(250,249,246,0.15)";
        ctx.beginPath();
        ctx.roundRect(750, 80, 250, 56, 14);
        ctx.fill();

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "extrabold 20px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(handleStr, 875, 108);
        ctx.textAlign = "left";

        const nameY = wrapText(name, textOffset, 240, textMaxW + 80, 68, "#FAF9F6", "black 50px Inter, system-ui, sans-serif");

        ctx.fillStyle = "#10B981";
        ctx.font = "black 120px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories}`, textOffset, nameY + 130);
        ctx.fillStyle = "#A7F3D0";
        ctx.font = "bold 24px Inter, system-ui, sans-serif";
        ctx.fillText("DAILY CALORIES LOGGED", textOffset, nameY + 180);

        const mStats = [
          { label: "PROTEIN", val: `${protein}g`, bar: protein / 150 },
          { label: "CARBS", val: `${carbs}g`, bar: carbs / 200 },
          { label: "FATS", val: `${fats}g`, bar: fats / 70 }
        ];

        const barWidth = (loadedImg && showMealPhoto) ? 460 : 360;

        mStats.forEach((stat, i) => {
          const itemY = 560 + i * 130;
          ctx.fillStyle = "#A7F3D0";
          ctx.font = "bold 16px Inter, system-ui, sans-serif";
          ctx.fillText(stat.label, statsOffset, itemY);

          ctx.fillStyle = "#FAF9F6";
          ctx.font = "black 36px Inter, system-ui, sans-serif";
          ctx.fillText(stat.val, statsOffset, itemY + 36);

          ctx.fillStyle = "rgba(250,249,246,0.1)";
          ctx.beginPath();
          ctx.roundRect(statsOffset, itemY + 54, barWidth, 10, 5);
          ctx.fill();

          ctx.fillStyle = "#10B981";
          ctx.beginPath();
          ctx.roundRect(statsOffset, itemY + 54, Math.min(barWidth, Math.max(10, barWidth * stat.bar)), 10, 5);
          ctx.fill();
        });

      } else if (currentTemplate === "sunset") {
        if (loadedImg && showMealPhoto) {
          const scale = Math.max(1080 / loadedImg.width, 1080 / loadedImg.height);
          const xOffset = 540 - (loadedImg.width * scale) / 2;
          const yOffset = 540 - (loadedImg.height * scale) / 2;
          ctx.drawImage(loadedImg, xOffset, yOffset, loadedImg.width * scale, loadedImg.height * scale);
          const sunsetGradOverlay = ctx.createLinearGradient(0, 0, 0, 1080);
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

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(80, 80, 72, 72, 20);
        ctx.fill();

        ctx.fillStyle = "#FF4E50";
        ctx.beginPath();
        ctx.moveTo(116, 92);
        ctx.bezierCurveTo(104, 106, 98, 116, 98, 126);
        ctx.bezierCurveTo(98, 137, 106, 144, 116, 144);
        ctx.bezierCurveTo(126, 144, 134, 137, 134, 126);
        ctx.bezierCurveTo(134, 112, 120, 100, 116, 92);
        ctx.fill();
        
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(116, 112);
        ctx.bezierCurveTo(110, 120, 106, 126, 106, 132);
        ctx.bezierCurveTo(106, 138, 110, 141, 116, 141);
        ctx.bezierCurveTo(122, 141, 126, 138, 126, 132);
        ctx.bezierCurveTo(126, 124, 118, 117, 116, 112);
        ctx.fill();

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "black 54px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("FitAI", 172, 116);

        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.roundRect(750, 80, 250, 56, 14);
        ctx.fill();

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "extrabold 20px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(handleStr, 875, 108);
        ctx.textAlign = "left";

        const nameY = wrapText(name, 80, 260, 920, 84, "#FAF9F6", "black 68px Inter, system-ui, sans-serif");

        let subText = `Logged by ${handleStr}`;
        if (showMealTime) {
          subText += ` • ⏱️ ${time}`;
        }
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillText(subText, 80, nameY + 50);

        ctx.fillStyle = "#FAF9F6";
        ctx.font = "black 120px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories}`, 80, nameY + 175);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "bold 20px Inter, system-ui, sans-serif";
        ctx.fillText("KCAL", 85, nameY + 225);
      }

      // Draw bottom macros Row
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
      const footerY = 970;
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, footerY);
      ctx.lineTo(1000, footerY);
      ctx.stroke();

      ctx.fillStyle = "#A8A29E";
      ctx.font = "bold 22px Inter, system-ui, sans-serif";
      ctx.fillText("FITAI • CALORIE ENGINE", 80, footerY + 45);
      ctx.textAlign = "right";
      ctx.fillText("fitpush.vercel.app", 1000, footerY + 45);
      ctx.textAlign = "left";
    };

    if (image && showMealPhoto) {
      const img = new Image();
      const imageUrl = image;
      
      const tryLoad = (useCors: boolean) => {
        img.onload = () => {
          runTemplateDraw(img);
        };
        img.onerror = () => {
          if (useCors) {
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              runTemplateDraw(fallbackImg);
            };
            fallbackImg.onerror = () => {
              runTemplateDraw(null);
            };
            fallbackImg.src = imageUrl;
          } else {
            runTemplateDraw(null);
          }
        };
        if (useCors && imageUrl.startsWith("http")) {
          img.crossOrigin = "anonymous";
        }
        img.src = imageUrl;
      };

      tryLoad(true);
    } else {
      runTemplateDraw(null);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [currentIndex, showMealTime, showMealPhoto, showMealDesc]);

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
        className="bg-stone-50 border border-white rounded-[32px] w-full max-w-[400px] shadow-2xl p-6 flex flex-col items-center gap-5"
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

        {/* Toggle controls panel */}
        <div className="bg-stone-100/60 border border-stone-200/50 p-4 rounded-2xl w-full flex flex-col gap-3 text-[10px] font-bold text-stone-600 shadow-2xs shrink-0">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-stone-400">⏱️</span>
              <span className="tracking-wide">Include Timestamp</span>
            </span>
            <button
              type="button"
              onClick={() => setShowMealTime(!showMealTime)}
              className={cn(
                "w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer",
                showMealTime ? "bg-orange-500" : "bg-stone-250"
              )}
            >
              <motion.div
                layout
                className="w-4 h-4 rounded-full bg-white shadow-xs"
                animate={{ x: showMealTime ? 16 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
          {image && (
            <div className="flex items-center justify-between border-t border-stone-200/30 pt-2.5">
              <span className="flex items-center gap-2">
                <span className="text-stone-400">📷</span>
                <span className="tracking-wide">Include Meal Photo</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMealPhoto(!showMealPhoto)}
                className={cn(
                  "w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer",
                  showMealPhoto ? "bg-orange-500" : "bg-stone-250"
                )}
              >
                <motion.div
                  layout
                  className="w-4 h-4 rounded-full bg-white shadow-xs"
                  animate={{ x: showMealPhoto ? 16 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          )}
          {item.meal_description && (
            <div className="flex items-center justify-between border-t border-stone-200/30 pt-2.5">
              <span className="flex items-center gap-2">
                <span className="text-stone-400">📝</span>
                <span className="tracking-wide">Include Description</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMealDesc(!showMealDesc)}
                className={cn(
                  "w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer",
                  showMealDesc ? "bg-orange-500" : "bg-stone-250"
                )}
              >
                <motion.div
                  layout
                  className="w-4 h-4 rounded-full bg-white shadow-xs"
                  animate={{ x: showMealDesc ? 16 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          )}
        </div>

        {/* Preview tabs */}
        <div className="flex bg-stone-100 p-1 rounded-xl gap-1 w-full select-none font-sans shrink-0">
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
              className="w-full h-full rounded-[28px] overflow-hidden shadow-xl border border-stone-200/50 flex items-center justify-center relative select-none cursor-grab active:cursor-grabbing bg-[#1C1917]"
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

        {/* Preset Name Display */}
        {previewTab === "card" && (
          <span className="text-[9.5px] font-extrabold uppercase text-orange-600 bg-orange-50 px-3 py-1 rounded-full select-none">
            Style: {currentTemplate.toUpperCase()}
          </span>
        )}

        {/* Pagination Row */}
        {previewTab === "card" && (
          <div className="flex items-center gap-6 select-none mt-1">
            <button
              onClick={handlePrev}
              className="w-7 h-7 rounded-full bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 shadow-2xs flex items-center justify-center cursor-pointer transition-colors active:scale-95"
              title="Previous template"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-1.5 justify-center">
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
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={handleCopyLink}
            disabled={loadingUrl}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-100 active:scale-98 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied!" : "Copy Share Link"}</span>
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
      </motion.div>
    </motion.div>
  );
};
