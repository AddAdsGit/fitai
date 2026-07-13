import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Copy, Download, Share2, Flame, Check, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { motion } from "motion/react";
import { SharedItemPayload, generateShareUrl, compressRecipe } from "../utils/shareUtils";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { cn } from "../lib/utils";

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

    // Determine colors and styles based on the active variation
    const isObsidian = (currentVar.id as string) === "obsidian";
    const isEditorial = (currentVar.id as string) === "editorial";
    const isSolar = (currentVar.id as string) === "solar";

    let fontFamily = "Inter, system-ui, sans-serif";
    let titleFont = "900 68px Inter, system-ui, sans-serif";
    let labelFont = "700 18px Inter, system-ui, sans-serif";
    let textColor = "#FAF9F6";
    let textMuted = "#A8A29E";
    let accentColor = "#F97316";
    let panelFill = "rgba(18, 17, 16, 0.72)";
    let panelBorder = "rgba(255, 255, 255, 0.15)";
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
          { name: "Protein", val: `${protein}g`, color: "#F97316" },
          { name: "Carbs", val: `${carbs}g`, color: "#0891B2" },
          { name: "Fats", val: `${fats}g`, color: "#EAB308" }
        ];

        const startPad = isObsidian ? 120 : 80;
        const cardW = isObsidian ? 260 : 280;
        const cardGap = isObsidian ? 30 : 40;

        macros.forEach((m, idx) => {
          const startX = startPad + idx * (cardW + cardGap);
          
          ctx.fillStyle = isObsidian 
            ? "rgba(255, 255, 255, 0.05)" 
            : isEditorial 
              ? "#FFFFFF" 
              : "rgba(6,214,160,0.08)";
              
          ctx.beginPath();
          ctx.roundRect(startX, macroY, cardW, 115, 22);
          ctx.fill();

          ctx.strokeStyle = isObsidian 
            ? "rgba(255, 255, 255, 0.12)" 
            : isEditorial 
              ? "#1A1715" 
              : "rgba(6,214,160,0.2)";
              
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(startX, macroY, cardW, 115, 22);
          ctx.stroke();

          // Dot indicator
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(startX + 35, macroY + 58, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = isObsidian 
            ? "#A8A29E" 
            : isEditorial 
              ? "#78716C" 
              : "rgba(255,255,255,0.6)";
              
          ctx.font = `${labelFont}`;
          ctx.fillText(m.name.toUpperCase(), startX + 60, macroY + 40);

          ctx.fillStyle = isObsidian 
            ? "#FAF9F6" 
            : isEditorial 
              ? "#1A1715" 
              : "#FFFFFF";
              
          ctx.font = `900 32px ${fontFamily}`;
          ctx.fillText(m.val, startX + 60, macroY + 84);
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
            : "rgba(255,255,255,0.6)";
            
        ctx.font = `700 22px ${fontFamily}`;
        ctx.fillText("FITAI • CALORIE ENGINE", 80, footerY + 45);
        ctx.textAlign = "right";
        ctx.fillText("fitpush.vercel.app", 1000, footerY + 45);
        ctx.textAlign = "left";
      }
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

      // Border style based on theme
      ctx.strokeStyle = isEditorial ? "#1A1715" : "rgba(255,255,255,0.15)";
      ctx.lineWidth = isEditorial ? 3.5 : 3;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.stroke();
    };

    const runTemplateDraw = (loadedImg: HTMLImageElement | null) => {
      ctx.clearRect(0, 0, 1080, canvas.height);
      
      // Draw Background
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

      ctx.fillStyle = isEditorial ? "#1A1715" : textColor;
      ctx.font = creatorBadgeFont;
      ctx.textAlign = "right";
      ctx.fillText(handleStr, 1000, 116);
      ctx.textAlign = "left";

      // Layout rendering
      if (isObsidian) {
        // Obsidian Glass Overlay Layout (Square 1:1)
        const cardX = 80;
        const cardY = 220;
        const cardW = 920;
        const cardH = 730;

        ctx.fillStyle = panelFill;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 36);
        ctx.fill();

        ctx.strokeStyle = panelBorder;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 36);
        ctx.stroke();

        const finalY = wrapText(name, 130, 320, 440, 80, textColor, "900 68px Inter, system-ui, sans-serif");
        const subtitleY = finalY + 45;
        ctx.fillStyle = accentColor;
        ctx.font = "900 24px Inter, system-ui, sans-serif";
        ctx.fillText(`🍳 ${time.toUpperCase()} PREP`, 130, subtitleY);

        const spaceTop = subtitleY + 20;
        const spaceBottom = canvas.height - 280;
        const calCenterY = spaceTop + (spaceBottom - spaceTop) / 2;

        ctx.fillStyle = textColor;
        ctx.font = "900 96px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(`${calories} kcal`, 130, calCenterY);
        ctx.textBaseline = "alphabetic";

        // Ingredients Checklist Card on the Right inside the Glass Card
        const checklistX = 580;
        const checklistY = 280;
        const checklistW = 340;
        const checklistH = 430;

        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.beginPath();
        ctx.roundRect(checklistX, checklistY, checklistW, checklistH, 24);
        ctx.fill();

        ctx.strokeStyle = panelBorder;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.roundRect(checklistX, checklistY, checklistW, checklistH, 24);
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = "800 22px Inter, system-ui, sans-serif";
        ctx.fillText("INGREDIENTS", checklistX + 40, checklistY + 54);

        ctx.font = "700 20px Inter, system-ui, sans-serif";
        const topIngs = ingredients.slice(0, 5);
        topIngs.forEach((ing: string, idx: number) => {
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.arc(checklistX + 50, checklistY + 110 + idx * 55, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = textColor;
          let ingText = ing;
          if (ingText.length > 20) ingText = ingText.substring(0, 18) + "...";
          ctx.fillText(ingText, checklistX + 75, checklistY + 118 + idx * 55);
        });

        if (ingredients.length > 5) {
          ctx.fillStyle = textMuted;
          ctx.font = "italic 16px Inter, system-ui, sans-serif";
          ctx.fillText(`+ ${ingredients.length - 5} more ingredients`, checklistX + 40, checklistY + checklistH - 25);
        }

        drawMacrosAndFooter(canvas.height - 280);
      } else if (isEditorial) {
        // Editorial Layout (Square 1:1 Light Premium)
        let contentY = 300;
        if (loadedImg) {
          drawStructuredImage(loadedImg, 80, 220, 440, 320, 20);
          contentY = 580;
        }

        // Title on the left side
        const titleSize = loadedImg ? "900 48px Impact, Inter, sans-serif" : "900 68px Impact, Inter Condensed, Inter, sans-serif";
        const finalY = wrapText(name.toUpperCase(), 80, contentY, 440, 65, textColor, titleSize);

        // Prep subtitle
        ctx.fillStyle = "#F97316";
        ctx.font = "900 22px Inter, system-ui, sans-serif";
        ctx.fillText(`🍳 ${time.toUpperCase()} PREP`, 80, finalY + 45);

        // Giant Calories text under title
        const calY = finalY + 120;
        ctx.fillStyle = "#F97316"; // orange calories
        ctx.font = "900 96px Inter, system-ui, sans-serif";
        ctx.fillText(`${calories}`, 80, calY);

        ctx.fillStyle = "#1A1715";
        ctx.font = "900 24px Inter, system-ui, sans-serif";
        ctx.fillText("KCAL", 85 + ctx.measureText(`${calories}`).width, calY);

        // Ingredients Checklist Card on the Right
        const checklistX = 580;
        const checklistY = 220;
        const checklistW = 340;
        const checklistH = 430;

        // Clean white card background
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(checklistX, checklistY, checklistW, checklistH, 24);
        ctx.fill();

        ctx.strokeStyle = "rgba(26, 23, 21, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(checklistX, checklistY, checklistW, checklistH, 24);
        ctx.stroke();

        // Heading: INGREDIENTS
        ctx.fillStyle = "#1A1715";
        ctx.font = "800 22px Inter, system-ui, sans-serif";
        ctx.fillText("INGREDIENTS", checklistX + 40, checklistY + 54);

        ctx.font = "700 20px Inter, system-ui, sans-serif";
        const topIngs = ingredients.slice(0, 5);
        topIngs.forEach((ing: string, idx: number) => {
          ctx.fillStyle = "#F97316"; // orange bullet
          ctx.beginPath();
          ctx.arc(checklistX + 50, checklistY + 110 + idx * 55, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#44403C";
          let ingText = ing;
          if (ingText.length > 20) ingText = ingText.substring(0, 18) + "...";
          ctx.fillText(ingText, checklistX + 75, checklistY + 118 + idx * 55);
        });

        if (ingredients.length > 5) {
          ctx.fillStyle = "#78716C";
          ctx.font = "italic 16px Inter, system-ui, sans-serif";
          ctx.fillText(`+ ${ingredients.length - 5} more ingredients`, checklistX + 40, checklistY + checklistH - 25);
        }

        drawMacrosAndFooter(750);

      } else if (isSolar) {
        // Solar Tech (Symmetric Amber) Layout (Square 1:1)
        const finalY = wrapText(name, 540, 260, 920, 80, textColor, "900 68px Inter, system-ui, sans-serif", "center");

        const subtitleY = finalY + 95;
        ctx.fillStyle = accentColor;
        ctx.font = "900 36px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`🍳 ${time.toUpperCase()} PREP`, 540, subtitleY);

        let belowImgY = subtitleY + 30;

        if (loadedImg) {
          // Orange brand glow behind photo
          const imgCenterX = 540;
          const imgCenterY = subtitleY + 30 + 150;
          const glowGrad = ctx.createRadialGradient(imgCenterX, imgCenterY, 50, imgCenterX, imgCenterY, 200);
          glowGrad.addColorStop(0, "rgba(249, 115, 22, 0.12)");
          glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(imgCenterX, imgCenterY, 200, 0, Math.PI * 2);
          ctx.fill();

          drawStructuredImage(loadedImg, 290, subtitleY + 30, 500, 300, 28);
          belowImgY = subtitleY + 30 + 300;
        } else {
          // Draw Ingredients checklist centered in Solar Tech card since no image is present
          const boxY = subtitleY + 30;
          const boxH = 260;

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
          ctx.fillText("INGREDIENTS LIST", 540, boxY + 54);
          ctx.textAlign = "left";

          ctx.font = "700 28px Inter, system-ui, sans-serif";
          const topIngs = ingredients.slice(0, 3);
          topIngs.forEach((ing: string, idx: number) => {
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            // Use 50px vertical offset
            ctx.arc(130, boxY + 110 + idx * 50, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = textColor;
            ctx.fillText(ing, 165, boxY + 118 + idx * 50);
          });

          if (ingredients.length > 3) {
            ctx.fillStyle = textMuted;
            ctx.font = "italic 24px Inter, system-ui, sans-serif";
            ctx.fillText(`+ ${ingredients.length - 3} more ingredients`, 120, boxY + boxH - 30);
          }

          belowImgY = boxY + boxH;
        }

        ctx.textAlign = "left"; // reset alignment

        // Center Calories text vertically in the space below the photo/checklist and above macros
        const spaceTop = belowImgY + 20;
        const spaceBottom = canvas.height - 280;
        const calCenterY = spaceTop + (spaceBottom - spaceTop) / 2;

        ctx.fillStyle = textColor;
        ctx.font = "900 110px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${calories} kcal`, 540, calCenterY);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic"; // Reset base

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
    document.fonts.ready.then(() => {
      setFontsLoaded(true);
    });
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [currentIndex, fontsLoaded]);

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

            <div className="w-full aspect-video rounded-xl relative overflow-hidden bg-stone-900 flex flex-col justify-end p-3 border border-stone-200/40 shrink-0">
              {payload.img ? (
                <img src={payload.img} className="absolute inset-0 w-full h-full object-cover opacity-60" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <BookOpen className="w-12 h-12 text-white" />
                </div>
              )}
              <div className="relative z-10 space-y-0.5">
                <h4 className="text-white text-xs font-black drop-shadow-xs truncate">{name}</h4>
                <p className="text-[8px] text-white/80 font-bold flex items-center gap-1">
                  <span>⏱️ {time} prep</span>
                  <span>•</span>
                  <span>by {handleStr}</span>
                </p>
              </div>
            </div>

            {ingredients.length > 0 && (
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-2.5 space-y-1">
                <span className="text-[7.5px] text-stone-400 uppercase font-black tracking-wider block">Ingredients</span>
                <div className="flex flex-wrap gap-1">
                  {ingredients.slice(0, 5).map((ing, idx) => (
                    <span key={idx} className="bg-stone-200/60 text-stone-700 text-[8px] font-extrabold px-2 py-0.5 rounded-md">
                      {ing}
                    </span>
                  ))}
                  {ingredients.length > 5 && (
                    <span className="text-stone-400 text-[8px] font-bold self-center">
                      +{ingredients.length - 5} more
                    </span>
                  )}
                </div>
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
