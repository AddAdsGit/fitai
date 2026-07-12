import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Copy, Download, Share2, Flame, Check, ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SharedItemPayload, generateShareUrl, compressMeal, compressRecipe } from "../utils/shareUtils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { cn } from "../lib/utils";

interface ShareModalProps {
  type: "meal" | "recipe" | "day";
  item: any; // Meal, Recipe, or Day object
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
  const variations = [
    { id: "obsidian_1_1", name: "Obsidian Teaser (1:1)", theme: "obsidian", format: "square" },
    { id: "cream_1_1", name: "Cream Menu (1:1)", theme: "cream", format: "square" },
    { id: "emerald_1_1", name: "Emerald Sport (1:1)", theme: "emerald", format: "square" },
    { id: "sunset_3_4", name: "Sunset Post (3:4)", theme: "sunset", format: "portrait" },
    { id: "obsidian_3_4", name: "Obsidian Full (3:4)", theme: "obsidian", format: "portrait" },
    { id: "cream_3_4", name: "Cream Full (3:4)", theme: "cream", format: "portrait" },
    { id: "sunset_9_16", name: "Sunset Story (9:16)", theme: "sunset", format: "story" },
    { id: "emerald_9_16", name: "Emerald Story (9:16)", theme: "emerald", format: "story" }
  ] as const;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"card" | "webpage">("card");
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentVar = variations[currentIndex];
  const currentTemplate = currentVar.theme;
  const cardFormat = currentVar.format;

  const handleStr = profileData.username ? `@${profileData.username}` : "@user";

  const isMeal = type === "meal";
  const isRecipe = type === "recipe";
  const isDay = type === "day";

  // Date formatting helper for day titles
  const formatDateTitle = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
    } catch (_) {
      return dateStr;
    }
  };

  const name = isDay ? formatDateTitle(item.date) : item.name || "Unnamed Item";
  const calories = Number(item.calories || 0);
  const protein = Number(item.protein || 0);
  const carbs = Number(item.carbs || 0);
  const fats = Number(item.fats || 0);
  const fiber = Number(item.fiber || 0);
  
  const time = isDay ? "" : item.time || (isMeal ? "12:00 PM" : "15 mins");
  const image = isDay ? "" : item.image || "";
  const ingredients = isDay ? [] : item.ingredients || [];
  const mealsList = isDay ? item.meals || [] : [];

  const payload: SharedItemPayload = useMemo(() => {
    if (type === "recipe") {
      return compressRecipe(item);
    } else if (type === "meal") {
      return compressMeal(item);
    } else {
      return {
        n: name,
        c: calories,
        p: protein,
        cb: carbs,
        f: fats,
        fb: fiber,
        mls: mealsList.map((m: any) => ({ n: m.name, c: m.calories }))
      };
    }
  }, [type, item, name, calories, protein, carbs, fats, fiber, mealsList]);

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
    if (cardFormat === "story") {
      canvas.height = 1920;
    } else if (cardFormat === "portrait") {
      canvas.height = 1440;
    } else {
      canvas.height = 1080;
    }

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
      ctx.clearRect(0, 0, 1080, canvas.height);
      
      const isDark = currentTemplate === "obsidian";
      const isSunset = currentTemplate === "sunset";
      let bgColor = isDark ? "#1C1917" : "#FAF9F6";
      let txtColor = isDark ? "#FAF9F6" : "#1C1917";
      let subTxtColor = isDark ? "#A8A29E" : "#78716C";

      if (currentTemplate === "obsidian") {
        // ================= TEMPLATE 1: OBSIDIAN DARK (PHOTO OR DARK SOLID) =================
        if (loadedImg) {
          const scale = Math.max(1080 / loadedImg.width, canvas.height / loadedImg.height);
          const xOffset = 540 - (loadedImg.width * scale) / 2;
          const yOffset = (canvas.height / 2) - (loadedImg.height * scale) / 2;
          ctx.drawImage(loadedImg, xOffset, yOffset, loadedImg.width * scale, loadedImg.height * scale);
          const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
          overlay.addColorStop(0, "rgba(0,0,0,0.3)");
          overlay.addColorStop(0.5, "rgba(0,0,0,0.45)");
          overlay.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = overlay;
          ctx.fillRect(0, 0, 1080, canvas.height);
        } else {
          ctx.fillStyle = "#1C1917";
          ctx.fillRect(0, 0, 1080, canvas.height);
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

        // Title Name / Date
        const finalY = wrapText(name, 80, 260, 920, 84, "#FAF9F6", "black 68px Inter, system-ui, sans-serif");

        // Subtitle & List Block
        if (isDay) {
          ctx.fillStyle = accentColor;
          ctx.font = "black 28px Inter, system-ui, sans-serif";
          ctx.fillText("📅 ALL MEALS RECORDED", 80, finalY + 70);

          const boxY = finalY + 100;
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.beginPath();
          ctx.roundRect(80, boxY, 920, 280, 24);
          ctx.fill();

          ctx.fillStyle = "#FAF9F6";
          ctx.font = "extrabold 26px Inter, system-ui, sans-serif";
          ctx.fillText("DAILY FOOD TIMELINE", 120, boxY + 50);

          ctx.font = "bold 24px Inter, system-ui, sans-serif";
          const topMeals = mealsList.slice(0, 3);
          
          if (topMeals.length === 0) {
            ctx.fillStyle = "#A8A29E";
            ctx.fillText("No meals logged on this day.", 120, boxY + 130);
          } else {
            topMeals.forEach((meal: any, idx: number) => {
              ctx.fillStyle = accentColor;
              ctx.beginPath();
              ctx.arc(130, boxY + 110 + idx * 55, 6, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = "#FAF9F6";
              ctx.fillText(meal.name || "Logged Meal", 160, boxY + 118 + idx * 55);

              ctx.fillStyle = "#A8A29E";
              ctx.font = "black 24px Inter, system-ui, sans-serif";
              ctx.fillText(`+${meal.calories} kcal`, 820, boxY + 118 + idx * 55);
            });
            if (mealsList.length > 3) {
              ctx.fillStyle = "#A8A29E";
              ctx.font = "italic 20px Inter, system-ui, sans-serif";
              ctx.fillText(`+ ${mealsList.length - 3} more meals logged`, 120, boxY + 245);
            }
          }

          ctx.fillStyle = "#FAF9F6";
          ctx.font = "black 76px Inter, system-ui, sans-serif";
          ctx.fillText(`${calories} kcal`, 80, boxY + 415);

        } else if (isRecipe) {
          ctx.fillStyle = accentColor;
          ctx.font = "black 28px Inter, system-ui, sans-serif";
          ctx.fillText(`🍳 ${time} PREP • LOGGED ${item.log_count || 0} TIMES BY ${handleStr.toUpperCase()}`, 80, finalY + 60);

          let boxY = finalY + 90;
          let boxH = 280;
          let ingOffset = 55;
          let calOffset = 415;

          if (cardFormat !== "square") {
            const descText = item.description || "A custom recipe generated and tracked on FitAI.";
            const descY = wrapText(descText, 80, finalY + 115, 920, 36, "#FAF9F6", "medium 23px Inter, system-ui, sans-serif");
            boxY = descY + 45;
            boxH = 240;
            ingOffset = 48;
            calOffset = 360;
          }

          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.beginPath();
          ctx.roundRect(80, boxY, 920, boxH, 24);
          ctx.fill();

          ctx.fillStyle = "#FAF9F6";
          ctx.font = "extrabold 26px Inter, system-ui, sans-serif";
          ctx.fillText("INGREDIENTS CHECKLIST", 120, boxY + 50);

          ctx.font = "bold 24px Inter, system-ui, sans-serif";
          const topIngredients = ingredients.slice(0, 3);
          topIngredients.forEach((ing: string, idx: number) => {
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(130, boxY + 100 + idx * ingOffset, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#FAF9F6";
            ctx.fillText(ing, 160, boxY + 107 + idx * ingOffset);
          });

          if (ingredients.length > 3) {
            ctx.fillStyle = "#A8A29E";
            ctx.font = "italic 20px Inter, system-ui, sans-serif";
            ctx.fillText(`+ ${ingredients.length - 3} more ingredients`, 120, boxY + boxH - 35);
          }

          ctx.fillStyle = "#FAF9F6";
          ctx.font = "black 76px Inter, system-ui, sans-serif";
          ctx.fillText(`${calories} kcal`, 80, boxY + calOffset);

          if (cardFormat !== "square") {
            const instructionsY = boxY + 270;
            const instructionsBoxH = cardFormat === "story" ? 640 : 250;
            ctx.fillStyle = "rgba(255,255,255,0.06)";
            ctx.beginPath();
            ctx.roundRect(80, instructionsY, 920, instructionsBoxH, 24);
            ctx.fill();

            ctx.fillStyle = "#FAF9F6";
            ctx.font = "extrabold 26px Inter, system-ui, sans-serif";
            ctx.fillText("PREPARATION STEPS", 120, instructionsY + 50);

            const instructionsText = item.instructions || "Enjoy this healthy custom portion immediately!";
            wrapText(
              instructionsText,
              120,
              instructionsY + 95,
              840,
              34,
              "#FAF9F6",
              "medium 21px Inter, system-ui, sans-serif"
            );
          }

        } else {
          // Standard Meal Log
          ctx.fillStyle = accentColor;
          ctx.font = "black 28px Inter, system-ui, sans-serif";
          ctx.fillText(`⚡ LOGGED AT ${time} BY ${handleStr.toUpperCase()}`, 80, finalY + 70);

          ctx.fillStyle = "#FAF9F6";
          ctx.font = "black 170px Inter, system-ui, sans-serif";
          const calY = finalY + 235;
          ctx.fillText(`${calories}`, 80, calY);

          ctx.fillStyle = "#A8A29E";
          ctx.font = "bold 32px Inter, system-ui, sans-serif";
          ctx.fillText("TOTAL KCAL", 85, calY + 60);
        }

        // Macros Row
        const macroY = canvas.height - 260;
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

        // Footer line
        const footerY = canvas.height - 110;
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

      } else if (currentTemplate === "cream") {
        // ================= TEMPLATE 2: CREAM LIGHT (MENU CARD SOLID) =================
        ctx.fillStyle = "#FAF9F6";
        ctx.fillRect(0, 0, 1080, canvas.height);

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

        if (loadedImg && !isDay) {
          // Circular Image Polaroid
          ctx.save();
          ctx.beginPath();
          ctx.arc(circleX, circleY, 170, 0, Math.PI * 2);
          ctx.clip();
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

          // Calorie Badge
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

        // Title below ring
        const titleY = (loadedImg && !isDay) ? 735 : 715;
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
        ctx.fillStyle = "#064E3B";
        ctx.fillRect(0, 0, 1080, canvas.height);

        if (loadedImg && !isDay) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, 480, canvas.height);
          ctx.clip();
          const scale = Math.max(480 / loadedImg.width, canvas.height / loadedImg.height);
          const xOffset = 240 - (loadedImg.width * scale) / 2;
          const yOffset = (canvas.height / 2) - (loadedImg.height * scale) / 2;
          ctx.drawImage(loadedImg, xOffset, yOffset, loadedImg.width * scale, loadedImg.height * scale);
          ctx.restore();

          ctx.strokeStyle = "rgba(250,249,246,0.15)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(480, 0);
          ctx.lineTo(480, canvas.height);
          ctx.stroke();
        }

        const textOffset = (loadedImg && !isDay) ? 540 : 80;
        const textMaxW = (loadedImg && !isDay) ? 460 : 500;
        const statsOffset = (loadedImg && !isDay) ? 540 : 640;

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

        const nameY = wrapText(name, textOffset, 240, textMaxW + 80, 68, "#FAF9F6", "black 50px Inter, system-ui, sans-serif");

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

        const barWidth = (loadedImg && !isDay) ? 460 : 360;

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
        if (loadedImg && !isDay) {
          const scale = Math.max(1080 / loadedImg.width, canvas.height / loadedImg.height);
          const xOffset = 540 - (loadedImg.width * scale) / 2;
          const yOffset = (canvas.height / 2) - (loadedImg.height * scale) / 2;
          ctx.drawImage(loadedImg, xOffset, yOffset, loadedImg.width * scale, loadedImg.height * scale);
          const sunsetGradOverlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
          sunsetGradOverlay.addColorStop(0, "rgba(255, 78, 80, 0.45)");
          sunsetGradOverlay.addColorStop(1, "rgba(249, 212, 35, 0.45)");
          ctx.fillStyle = sunsetGradOverlay;
          ctx.fillRect(0, 0, 1080, canvas.height);
        } else {
          const grad = ctx.createLinearGradient(0, 0, 1080, canvas.height);
          grad.addColorStop(0, "#FF4E50");
          grad.addColorStop(1, "#F9D423");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1080, canvas.height);
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

    if (hasImage && !isDay) {
      const imageUrl = payload.img || "";
      const img = new Image();
      
      const tryLoad = (useCors: boolean) => {
        img.onload = () => {
          runTemplateDraw(img);
        };
        img.onerror = () => {
          if (useCors) {
            // Fallback: Try loading without crossOrigin property
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
  }, [currentIndex]);

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

        {/* Preview toggle tabs */}
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
            <div className="relative w-full h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentVar.id}
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
                  className="w-full h-full rounded-[28px] overflow-hidden shadow-xl border border-stone-200/50 flex items-center justify-center relative select-none cursor-grab active:cursor-grabbing bg-[#1C1917]"
                >
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain block"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* Web Link View Mockup */
          <div className="w-full aspect-square bg-[#FAF9F6] rounded-[28px] border border-stone-200 shadow-xl overflow-y-auto p-4.5 text-left font-sans flex flex-col gap-3.5 no-scrollbar">
            {/* Simulate PublicShareView Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5.5 h-5.5 rounded-lg bg-orange-500 flex items-center justify-center shadow-xs">
                  <Flame className="text-white w-3 h-3 fill-white" />
                </div>
                <span className="text-[10px] font-black text-stone-700 tracking-tight">FitAI Shared View</span>
              </div>
              <span className="text-[7.5px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full select-none">
                Webpage Link
              </span>
            </div>

            {/* Cover Card */}
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
                  <span>⏱️ {time || "15 mins"}</span>
                  {type === "recipe" && (
                    <>
                      <span>•</span>
                      <span>🔥 Logged {item.log_count || 0} times by {handleStr}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-2.5 text-[9.5px] text-stone-600 font-bold leading-relaxed">
                📝 {item.description}
              </div>
            )}

            {/* Macros Ring summary */}
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

            {/* Ingredients Checklist */}
            {type === "recipe" && ingredients.length > 0 && (
              <div className="space-y-1">
                <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block">Ingredients checklist</span>
                <div className="bg-white border border-stone-150 rounded-xl p-3 space-y-1.5">
                  {ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px] font-semibold text-stone-700">
                      <input type="checkbox" defaultChecked className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-2.5 h-2.5 cursor-pointer" />
                      <span className="truncate">{ing}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {type === "recipe" && item.instructions && (
              <div className="space-y-1">
                <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block">Preparation Steps</span>
                <div className="bg-white border border-stone-150 rounded-xl p-3 text-[9px] font-semibold text-stone-600 leading-relaxed whitespace-pre-line">
                  {item.instructions}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Variation Name Display */}
        {previewTab === "card" && (
          <span className="text-[9.5px] font-extrabold uppercase text-orange-600 bg-orange-50 px-3 py-1 rounded-full select-none">
            Preset: {currentVar.name}
          </span>
        )}

        {/* Pagination & Navigation Row */}
        {previewTab === "card" && (
          <div className="flex items-center gap-6 select-none mt-1">
          <button
            onClick={handlePrev}
            className="w-7 h-7 rounded-full bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 shadow-2xs flex items-center justify-center cursor-pointer transition-colors active:scale-95"
            title="Previous template"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex gap-1.5 flex-wrap justify-center max-w-[120px]">
            {variations.map((v, idx) => (
              <button
                key={v.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex ? "w-5 bg-orange-500" : "w-2 bg-stone-300"
                }`}
                title={v.name}
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

        {/* Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={handleCopyLink}
            disabled={loadingUrl}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-100 active:scale-98 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied!" : isDay ? "Copy Day Share Link" : "Copy Shareable Link"}</span>
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
