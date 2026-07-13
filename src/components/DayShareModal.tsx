import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Copy, Download, Share2, Flame, Check, ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import { motion } from "motion/react";
import { SharedItemPayload, generateShareUrl } from "../utils/shareUtils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { cn } from "../lib/utils";

interface DayShareModalProps {
  item: any; // Day summary object
  profileData: any; // User profile
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

export const DayShareModal: React.FC<DayShareModalProps> = ({
  item,
  profileData,
  onClose,
  triggerToast,
}) => {
  // Variations for Daily Summary Card (Portrait 3:4)
  const variations = [
    { id: "minimal", name: "Minimal Slate (Premium)", format: "portrait" },
    { id: "collage", name: "Photo Collage (Visual Gallery)", format: "portrait" },
    { id: "obsidian", name: "Obsidian (Metrics Tech)", format: "portrait" },
    { id: "editorial", name: "Editorial (Light Premium)", format: "portrait" }
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
  const [mealImages, setMealImages] = useState<Record<string, HTMLImageElement>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentVar = variations[currentIndex];
  const cardFormat = currentVar.format;

  // Load and cache meal images for Collage layout
  const mealsList = item.meals || [];
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

  const handleStr = profileData.username ? `@${profileData.username}` : "@user";

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

    // Determine colors and styles based on active variation
    const isMinimal = (currentVar.id as string) === "minimal";
    const isCollage = (currentVar.id as string) === "collage";
    const isObsidian = (currentVar.id as string) === "obsidian";
    const isEditorial = (currentVar.id as string) === "editorial";
    const isSolar = (currentVar.id as string) === "solar";

    let fontFamily = "Inter, system-ui, sans-serif";
    let titleFont = "900 68px Inter, system-ui, sans-serif";
    let labelFont = "700 18px Inter, system-ui, sans-serif";
    let textColor = "#FAF9F6";
    let textMuted = "#A8A29E";
    let accentColor = "#F97316";
    let panelFill = "rgba(255,255,255,0.06)";
    let panelBorder = "rgba(255,255,255,0.09)";
    let borderWidth = 1.5;
    let logoBoxColor = "#F97316";
    let creatorBadgeFill = "rgba(255,255,255,0.12)";
    let creatorBadgeTextColor = "#FAF9F6";
    let creatorBadgeFont = "800 20px Inter, system-ui, sans-serif";

    if (isEditorial) {
      fontFamily = "Georgia, serif";
      titleFont = "italic 700 68px Georgia, serif";
      labelFont = "700 18px Georgia, serif";
      textColor = "#1A1715";
      textMuted = "#78716C";
      accentColor = "#C2410C";
      panelFill = "#FFFFFF";
      panelBorder = "#1A1715";
      borderWidth = 1.5;
      logoBoxColor = "#1A1715";
      creatorBadgeFill = "rgba(26,23,21,0.06)";
      creatorBadgeTextColor = "#1A1715";
      creatorBadgeFont = "700 20px Georgia, serif";
    } else if (isSolar) {
      fontFamily = "Inter, system-ui, sans-serif";
      titleFont = "900 68px Inter, system-ui, sans-serif";
      labelFont = "700 18px Inter, system-ui, sans-serif";
      textColor = "#FAF9F6";
      textMuted = "#A8A29E";
      accentColor = "#F97316";
      panelFill = "rgba(255,255,255,0.06)";
      panelBorder = "rgba(255,255,255,0.09)";
      borderWidth = 1.5;
      logoBoxColor = "#F97316";
      creatorBadgeFill = "rgba(255,255,255,0.12)";
      creatorBadgeTextColor = "#FAF9F6";
      creatorBadgeFont = "800 20px Inter, system-ui, sans-serif";
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

    const runTemplateDraw = () => {
      ctx.clearRect(0, 0, 1080, canvas.height);
      
      // Draw Background
      if (isObsidian || isMinimal || isCollage) {
        const bgGrad = ctx.createRadialGradient(540, canvas.height / 2, 100, 540, canvas.height / 2, canvas.height);
        bgGrad.addColorStop(0, "#23211F");
        bgGrad.addColorStop(1, "#0E0D0C");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1080, canvas.height);
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

      // 1. Draw Brand Header Logo Box
      ctx.fillStyle = logoBoxColor;
      ctx.beginPath();
      ctx.roundRect(80, 80, 72, 72, 20);
      ctx.fill();

      // SVG Flame Path
      ctx.save();
      ctx.translate(96, 96);
      ctx.scale(1.7, 1.7);
      const flamePath = new Path2D("M8.5 14.5a2.5 2.5 0 0 0 2.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z");
      ctx.fillStyle = "#FFFFFF";
      ctx.fill(flamePath);
      ctx.restore();

      ctx.fillStyle = textColor;
      ctx.font = `900 54px ${fontFamily}`;
      if (isEditorial) {
        ctx.font = `italic 700 54px ${fontFamily}`;
      }
      ctx.textBaseline = "middle";
      ctx.fillText("FitAI", 172, 116);
      ctx.textBaseline = "alphabetic";

      ctx.fillStyle = creatorBadgeTextColor;
      ctx.font = creatorBadgeFont;
      ctx.textAlign = "right";
      ctx.fillText(handleStr, 1000, 116);
      ctx.textAlign = "left";

      // Helper to draw crop-centered cover image with rounded corners
      const drawCoverImage = (imgCtx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, radius = 16) => {
        imgCtx.save();
        imgCtx.beginPath();
        imgCtx.roundRect(x, y, w, h, radius);
        imgCtx.clip();

        const imgRatio = img.width / img.height;
        const boxRatio = w / h;
        let sWidth, sHeight, sx, sy;

        if (imgRatio > boxRatio) {
          sHeight = img.height;
          sWidth = img.height * boxRatio;
          sx = (img.width - sWidth) / 2;
          sy = 0;
        } else {
          sWidth = img.width;
          sHeight = img.width / boxRatio;
          sx = 0;
          sy = (img.height - sHeight) / 2;
        }

        imgCtx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
        imgCtx.restore();
      };

      // Layout rendering
      if (isMinimal) {
        // ================= MINIMALIST SLATE PORTRAIT (3:4) =================
        const finalY = wrapText(name, 80, 250, 920, 84, textColor, "900 76px Inter, system-ui, sans-serif");
        
        const subtitleY = finalY + 45;
        ctx.fillStyle = accentColor;
        ctx.font = "900 24px Inter, system-ui, sans-serif";
        ctx.fillText("⚡ DAILY LOG & MACRO DYNAMICS", 80, subtitleY);

        // Render clean timeline list without terminal container box
        const logStartY = finalY + 110;
        const rowH = 65;
        const maxLogs = 5;
        const displayedMeals = mealsList.slice(0, maxLogs);

        displayedMeals.forEach((meal: any, idx: number) => {
          const currentY = logStartY + idx * rowH;
          
          // Subtle circular indicator dot
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.arc(90, currentY, 5, 0, Math.PI * 2);
          ctx.fill();

          // Time + Name text
          ctx.fillStyle = textColor;
          ctx.font = "500 26px Inter, system-ui, sans-serif";
          let mealLabel = meal.name || "Logged Meal";
          if (meal.time) {
            mealLabel = `${meal.time}   •   ${mealLabel}`;
          }
          if (mealLabel.length > 42) mealLabel = mealLabel.substring(0, 39) + "...";
          ctx.fillText(mealLabel, 120, currentY + 8);

          // Calorie count
          ctx.fillStyle = textMuted;
          ctx.font = "800 26px Inter, system-ui, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(`+${meal.calories || 0} kcal`, 1000, currentY + 8);
          ctx.textAlign = "left"; // reset

          // Subtle divider line (except last row)
          if (idx < displayedMeals.length - 1) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(80, currentY + 30);
            ctx.lineTo(1000, currentY + 30);
            ctx.stroke();
          }
        });

        if (mealsList.length > maxLogs) {
          ctx.fillStyle = textMuted;
          ctx.font = "italic 22px Inter, system-ui, sans-serif";
          ctx.fillText(`+ ${mealsList.length - maxLogs} additional logs tracked today`, 90, logStartY + maxLogs * rowH - 10);
        }

        // Spacious elegant Calories Display
        const calY = canvas.height - 400;
        ctx.fillStyle = textColor;
        ctx.font = "900 120px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories}`, 80, calY);

        ctx.fillStyle = textMuted;
        ctx.font = "800 24px Inter, system-ui, sans-serif";
        ctx.fillText("TOTAL KCAL LOGGED", 85, calY + 50);

      } else if (isCollage) {
        // ================= PHOTO COLLAGE PORTRAIT (3:4) =================
        const finalY = wrapText(name, 80, 250, 920, 84, textColor, "900 76px Inter, system-ui, sans-serif");
        const subtitleY = finalY + 45;
        
        ctx.fillStyle = textMuted;
        ctx.font = "700 24px Inter, system-ui, sans-serif";
        ctx.fillText("📷 TODAY'S FOOD GALLERY", 80, subtitleY);

        // Gather all pre-loaded meal images
        const imgs = mealsList
          .map((m: any) => mealImages[m.id || m.name])
          .filter(Boolean);

        const gridY = finalY + 95;
        const gridH = 500; // fixed height for photo section

        if (imgs.length === 0) {
          // Fallback if no images are logged or loaded yet
          ctx.fillStyle = panelFill;
          ctx.beginPath();
          ctx.roundRect(80, gridY, 920, gridH, 24);
          ctx.fill();
          
          ctx.strokeStyle = panelBorder;
          ctx.lineWidth = borderWidth;
          ctx.stroke();

          ctx.fillStyle = textMuted;
          ctx.font = "500 28px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Log meals with photos to see your daily collage here!", 540, gridY + 260);
          ctx.textAlign = "left"; // reset
        } else if (imgs.length === 1) {
          // 1 Large image
          drawCoverImage(ctx, imgs[0], 80, gridY, 920, gridH, 24);
        } else if (imgs.length === 2) {
          // 2 Columns side-by-side
          const colW = 445;
          drawCoverImage(ctx, imgs[0], 80, gridY, colW, gridH, 24);
          drawCoverImage(ctx, imgs[1], 80 + colW + 30, gridY, colW, gridH, 24);
        } else if (imgs.length === 3) {
          // 1 Left large, 2 Right stacked
          const leftW = 480;
          const rightW = 410;
          const halfH = (gridH - 30) / 2;
          drawCoverImage(ctx, imgs[0], 80, gridY, leftW, gridH, 24);
          drawCoverImage(ctx, imgs[1], 80 + leftW + 30, gridY, rightW, halfH, 20);
          drawCoverImage(ctx, imgs[2], 80 + leftW + 30, gridY + halfH + 30, rightW, halfH, 20);
        } else {
          // 4 Grid layout
          const colW = 445;
          const halfH = (gridH - 30) / 2;
          drawCoverImage(ctx, imgs[0], 80, gridY, colW, halfH, 20);
          drawCoverImage(ctx, imgs[1], 80 + colW + 30, gridY, colW, halfH, 20);
          drawCoverImage(ctx, imgs[2], 80, gridY + halfH + 30, colW, halfH, 20);
          drawCoverImage(ctx, imgs[3], 80 + colW + 30, gridY + halfH + 30, colW, halfH, 20);
        }

        // Under the collage: show clean minimalist totals summary
        const textTopY = gridY + gridH + 80;
        ctx.fillStyle = textColor;
        ctx.font = "900 90px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories} kcal`, 80, textTopY);

        ctx.fillStyle = textMuted;
        ctx.font = "700 24px Inter, system-ui, sans-serif";
        ctx.fillText("DAILY TOTAL ENERGY CONSUMED", 85, textTopY + 45);

      } else if (isObsidian) {
        // ================= OBSIDIAN PORTRAIT (3:4) =================
        const finalY = wrapText(name, 80, 250, 920, 84, textColor, "900 76px Inter, system-ui, sans-serif");

        const subtitleY = finalY + 95;
        ctx.fillStyle = accentColor;
        ctx.font = "900 36px Inter, system-ui, sans-serif";
        ctx.fillText("📅 DAILY PROGRESS TIMELINE", 80, subtitleY);

        // Timeline Log Container
        const boxY = finalY + 155;
        const topMeals = mealsList.slice(0, 4);
        const boxH = 320;
        const rowOffset = 50;

        ctx.fillStyle = panelFill;
        ctx.beginPath();
        ctx.roundRect(80, boxY, 920, boxH, 24);
        ctx.fill();

        ctx.strokeStyle = panelBorder;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.roundRect(80, boxY, 920, boxH, 24);
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = "800 30px Inter, system-ui, sans-serif";
        ctx.fillText("DAILY FOOD TIMELINE", 120, boxY + 54);

        ctx.font = "700 28px Inter, system-ui, sans-serif";
        if (topMeals.length === 0) {
          ctx.fillStyle = textMuted;
          ctx.fillText("No meals logged on this day.", 120, boxY + 120);
        } else {
          topMeals.forEach((meal: any, idx: number) => {
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(130, boxY + 115 + idx * rowOffset, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = textColor;
            let mealLabel = meal.name || "Logged Meal";
            if (meal.time) {
              mealLabel = `[${meal.time}] ${mealLabel}`;
            }
            if (mealLabel.length > 36) mealLabel = mealLabel.substring(0, 33) + "...";
            ctx.fillText(mealLabel, 165, boxY + 123 + idx * rowOffset);

            ctx.fillStyle = textMuted;
            ctx.font = "900 28px Inter, system-ui, sans-serif";
            ctx.fillText(`+${meal.calories || 0} kcal`, 820, boxY + 123 + idx * rowOffset);
          });
          if (mealsList.length > topMeals.length) {
            ctx.fillStyle = textMuted;
            ctx.font = "italic 26px Inter, system-ui, sans-serif";
            ctx.fillText(`+ ${mealsList.length - topMeals.length} more meals logged`, 120, boxY + 115 + topMeals.length * rowOffset);
          }
        }

        // Center Calories text vertically in space below box and above macros
        const spaceTop = boxY + boxH;
        const spaceBottom = canvas.height - 280;
        const calCenterY = spaceTop + (spaceBottom - spaceTop) / 2;

        ctx.fillStyle = textColor;
        ctx.font = "900 110px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(`${calories} kcal`, 80, calCenterY);
        ctx.textBaseline = "alphabetic";

      } else if (isEditorial) {
        // Editorial Layout (Portrait 3:4 Light Premium)
        const finalY = wrapText(name.toUpperCase(), 80, 250, 920, 84, textColor, "900 76px Impact, Inter Condensed, Inter, sans-serif");

        const subtitleY = finalY + 45;
        ctx.fillStyle = "#F97316";
        ctx.font = "900 24px Inter, system-ui, sans-serif";
        ctx.fillText("📅 DAILY PROGRESS TIMELINE", 80, subtitleY);

        // Timeline Log Container
        const boxY = finalY + 95;
        const topMeals = mealsList.slice(0, 6);
        const boxH = 480;
        const rowOffset = 60;

        // Clean white card background
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(80, boxY, 920, boxH, 24);
        ctx.fill();

        ctx.strokeStyle = "rgba(26, 23, 21, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(80, boxY, 920, boxH, 24);
        ctx.stroke();

        ctx.fillStyle = "#1A1715";
        ctx.font = "800 24px Inter, system-ui, sans-serif";
        ctx.fillText("DAILY FOOD TIMELINE", 120, boxY + 54);

        // Draw vertical connecting line for the timeline
        if (topMeals.length > 1) {
          ctx.strokeStyle = "rgba(26, 23, 21, 0.1)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(130, boxY + 115);
          ctx.lineTo(130, boxY + 115 + (topMeals.length - 1) * rowOffset);
          ctx.stroke();
        }

        ctx.font = "700 22px Inter, system-ui, sans-serif";
        if (topMeals.length === 0) {
          ctx.fillStyle = "#78716C";
          ctx.fillText("No meals logged on this day.", 120, boxY + 120);
        } else {
          topMeals.forEach((meal: any, idx: number) => {
            // Draw orange timeline node arc
            ctx.fillStyle = "#F97316";
            ctx.beginPath();
            ctx.arc(130, boxY + 115 + idx * rowOffset, 6, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = "#1A1715";
            let mealLabel = meal.name || "Logged Meal";
            if (meal.time) {
              mealLabel = `[${meal.time}] ${mealLabel}`;
            }
            if (mealLabel.length > 36) mealLabel = mealLabel.substring(0, 33) + "...";
            ctx.fillText(mealLabel, 165, boxY + 123 + idx * rowOffset);

            // Kcal value
            ctx.fillStyle = "#78716C";
            ctx.font = "900 22px Inter, system-ui, sans-serif";
            ctx.fillText(`+${meal.calories || 0} kcal`, 820, boxY + 123 + idx * rowOffset);
          });
          
          if (mealsList.length > topMeals.length) {
            ctx.fillStyle = "#78716C";
            ctx.font = "italic 20px Inter, system-ui, sans-serif";
            ctx.fillText(`+ ${mealsList.length - topMeals.length} more meals logged`, 120, boxY + 115 + topMeals.length * rowOffset);
          }
        }

        // Calories Summary below the timeline box
        const spaceTop = boxY + boxH;
        const spaceBottom = canvas.height - 280;
        const calCenterY = spaceTop + (spaceBottom - spaceTop) / 2;

        ctx.textAlign = "center";
        ctx.fillStyle = "#F97316"; // orange calories
        ctx.font = "900 110px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories}`, 540, calCenterY - 15);

        ctx.fillStyle = "#1A1715";
        ctx.font = "900 24px Inter, system-ui, sans-serif";
        ctx.fillText("KCAL", 540, calCenterY + 55);

        ctx.fillStyle = "#78716C";
        ctx.font = "700 18px Inter, system-ui, sans-serif";
        ctx.fillText("DAILY TOTAL", 540, calCenterY + 90);
        ctx.textAlign = "left"; // reset

      } else if (isSolar) {
        // ================= AURORA SQUARE ASPECT RATIO (1:1) =================
        // Symmetrical Centered Layout
        const finalY = wrapText(name, 540, 260, 920, 80, textColor, "900 68px Inter, system-ui, sans-serif", "center");

        const subtitleY = finalY + 95;
        ctx.fillStyle = accentColor;
        ctx.font = "900 36px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("📅 DAILY PROGRESS TIMELINE", 540, subtitleY);

        // Timeline Log Container
        const boxY = subtitleY + 30;
        const topMeals = mealsList.slice(0, 4);
        const boxH = 320;
        const rowOffset = 50;

        ctx.fillStyle = panelFill;
        ctx.beginPath();
        ctx.roundRect(80, boxY, 920, boxH, 24);
        ctx.fill();

        ctx.strokeStyle = panelBorder;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.roundRect(80, boxY, 920, boxH, 24);
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = "800 30px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DAILY FOOD TIMELINE", 540, boxY + 54);
        ctx.textAlign = "left"; // reset

        ctx.font = "700 28px Inter, system-ui, sans-serif";
        if (topMeals.length === 0) {
          ctx.fillStyle = textMuted;
          ctx.fillText("No meals logged on this day.", 120, boxY + 120);
        } else {
          topMeals.forEach((meal: any, idx: number) => {
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(130, boxY + 115 + idx * rowOffset, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = textColor;
            let mealLabel = meal.name || "Logged Meal";
            if (meal.time) {
              mealLabel = `[${meal.time}] ${mealLabel}`;
            }
            if (mealLabel.length > 36) mealLabel = mealLabel.substring(0, 33) + "...";
            ctx.fillText(mealLabel, 165, boxY + 123 + idx * rowOffset);

            ctx.fillStyle = textMuted;
            ctx.font = "900 28px Inter, system-ui, sans-serif";
            ctx.fillText(`+${meal.calories || 0} kcal`, 820, boxY + 123 + idx * rowOffset);
          });
          if (mealsList.length > topMeals.length) {
            ctx.fillStyle = textMuted;
            ctx.font = "italic 26px Inter, system-ui, sans-serif";
            ctx.fillText(`+ ${mealsList.length - topMeals.length} more meals logged`, 120, boxY + 115 + topMeals.length * rowOffset);
          }
        }

        // Center Calories text vertically in space below box and above macros
        const spaceTop = boxY + boxH;
        const spaceBottom = canvas.height - 280;
        const calCenterY = spaceTop + (spaceBottom - spaceTop) / 2;

        ctx.fillStyle = textColor;
        ctx.font = "900 110px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${calories} kcal`, 540, calCenterY);
        ctx.textAlign = "left"; // reset
        ctx.textBaseline = "alphabetic";
      }

      // Draw Macros capsule row (rendered inline)
      const macroY = canvas.height - 280;
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
      } else if (isMinimal || isCollage) {
        // Clean box-less macros for dark minimalist/collage themes
        const macros = [
          { label: "PROTEIN", val: `${protein}g`, color: "#F97316" },
          { label: "CARBS", val: `${carbs}g`, color: "#38BDF8" },
          { label: "FAT", val: `${fats}g`, color: "#FBBF24" },
          { label: "FIBER", val: `${fiber}g`, color: "#34D399" }
        ];

        const colWidth = 920 / 4; // 230px
        const startX = 80;

        macros.forEach((m, idx) => {
          const centerColX = startX + idx * colWidth + colWidth / 2;
          
          // Draw label: PROTEIN, CARBS, etc.
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.font = "800 16px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(m.label, centerColX, macroY + 25);

          // Draw value: 32g, 64g, etc.
          ctx.fillStyle = m.color; // colorized macro values look gorgeous!
          ctx.font = "900 32px Inter, sans-serif";
          ctx.fillText(m.val, centerColX, macroY + 70);

          // Draw vertical divider (except last column)
          if (idx < 3) {
            const dividerX = startX + (idx + 1) * colWidth;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(dividerX, macroY + 10);
            ctx.lineTo(dividerX, macroY + 75);
            ctx.stroke();
          }
        });
        ctx.textAlign = "left"; // reset

        // Draw horizontal line above macros
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(80, macroY - 25);
        ctx.lineTo(1000, macroY - 25);
        ctx.stroke();
      } else {
        const macros = [
          { name: "Protein", val: `${protein}g`, color: "#F97316" },
          { name: "Carbs", val: `${carbs}g`, color: "#0891B2" },
          { name: "Fats", val: `${fats}g`, color: "#EAB308" }
        ];

        macros.forEach((m, idx) => {
          const startX = 80 + idx * 320;
          
          ctx.fillStyle = panelFill;
          ctx.beginPath();
          ctx.roundRect(startX, macroY, 280, 115, 22);
          ctx.fill();

          ctx.strokeStyle = panelBorder;
          ctx.lineWidth = borderWidth;
          ctx.beginPath();
          ctx.roundRect(startX, macroY, 280, 115, 22);
          ctx.stroke();

          // Dot indicator
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(startX + 35, macroY + 58, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = textMuted;
          ctx.font = `${labelFont}`;
          ctx.fillText(m.name.toUpperCase(), startX + 60, macroY + 40);

          ctx.fillStyle = textColor;
          ctx.font = `900 32px ${fontFamily}`;
          ctx.fillText(m.val, startX + 60, macroY + 84);
        });

        // Draw Footer
        const footerY = canvas.height - 110;
        ctx.strokeStyle = isEditorial ? "#1A1715" : "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, footerY);
        ctx.lineTo(1000, footerY);
        ctx.stroke();

        ctx.fillStyle = textMuted;
        ctx.font = `700 22px ${fontFamily}`;
        ctx.fillText("FITAI • DAILY REPORT ENGINE", 80, footerY + 45);
        ctx.textAlign = "right";
        ctx.fillText("fitpush.vercel.app", 1000, footerY + 45);
        ctx.textAlign = "left";
      }
    };

    runTemplateDraw();
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

  const handleDownloadImage = () => {
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
            Share Daily Progress
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
              <span>📅 {name}</span>
              <span className="text-orange-600">{calories} kcal total</span>
            </div>

            <div className="space-y-1">
              <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block font-sans">Timeline summary</span>
              <div className="bg-white border border-stone-150 rounded-xl p-3.5 space-y-2.5">
                {mealsList.map((meal: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-[9.5px] font-semibold text-stone-700 border-b border-stone-50 pb-1.5 last:border-0 last:pb-0">
                    <span className="truncate">
                      {meal.time ? `[${meal.time}] ` : ""}
                      {meal.name}
                    </span>
                    <span className="text-stone-400 shrink-0 font-bold">+{meal.calories} kcal</span>
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
