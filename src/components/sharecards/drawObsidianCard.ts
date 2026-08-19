import { CardDrawContext } from "./types";
import { drawBrandHeader, wrapText, drawCoverImage } from "./helpers";

export function drawObsidianCard(dc: CardDrawContext): void {
  const {
    ctx, canvas, handleStr, calories, protein, carbs, fats, fiber, mealsList, weight,
    targetCalories, targetProtein, targetCarbs, targetFats, targetFiber, currentStreak = 0, mealImages, date
  } = dc;

  const W = 1080;
  const H = canvas.height;

  // =================================================================
  // BACKGROUND — Deep Obsidian with Top-Center Ambient Spotlight Glow
  // =================================================================
  // Base Obsidian #0A0908
  ctx.fillStyle = "#0A0908";
  ctx.fillRect(0, 0, W, H);

  // Top-center ambient spotlight glow (Warm ember radiating downwards)
  const topGlow = ctx.createRadialGradient(W / 2, 280, 50, W / 2, 280, 750);
  topGlow.addColorStop(0, "rgba(249, 115, 22, 0.22)");
  topGlow.addColorStop(0.45, "rgba(249, 115, 22, 0.08)");
  topGlow.addColorStop(1, "transparent");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  // Bottom subtle secondary glow
  const bottomGlow = ctx.createRadialGradient(W / 2, H - 200, 50, W / 2, H - 200, 600);
  bottomGlow.addColorStop(0, "rgba(234, 179, 8, 0.06)");
  bottomGlow.addColorStop(1, "transparent");
  // =================================================================
  // HEADER — Brand logo + username badge (Dark Obsidian)
  // =================================================================
  drawBrandHeader(ctx, handleStr, {
    logoBoxColor: "#F97316",
    textColor: "#FFFFFF",
    fontFamily: "Inter, system-ui, sans-serif",
    badgeFont: "800 22px Inter, system-ui, sans-serif",
    badgeTextColor: "#FAF9F6"
  });

  // Streak counter badge if active
  if (currentStreak > 0) {
    const streakStr = `${currentStreak}`;
    ctx.font = "700 24px Inter, system-ui, sans-serif";
    const tw = ctx.measureText(streakStr).width;
    const pillW = 68 + tw;
    const pillX = 920 - pillW;
    const pillY = 86;
    const pillH = 58;

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 29);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 29);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = "28px Arial, sans-serif";
    ctx.fillText("🔥", pillX + 14, pillY + 40);

    ctx.fillStyle = "#F97316";
    ctx.font = "800 24px Inter, system-ui, sans-serif";
    ctx.fillText(streakStr, pillX + 48, pillY + 40);
  }

  // =================================================================
  // DATE ROW — "JULY 13, 2026" (Uppercase tracking-widest)
  // =================================================================
  let dateLabel = "TODAY";
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      dateLabel = d.toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric"
      }).toUpperCase();
    }
  }

  const dateRowY = 185;
  ctx.textAlign = "left";
  ctx.fillStyle = "#A8A29E"; // text-stone-400
  ctx.font = "900 22px Inter, system-ui, sans-serif";
  ctx.fillText(dateLabel, 80, dateRowY);

  // Weight indicator on right side
  if (weight && weight > 0) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#D6D3D1";
    ctx.font = "800 20px Inter, system-ui, sans-serif";
    ctx.fillText(`${weight} kg`, 1000, dateRowY);
    ctx.textAlign = "left";
  }

  // =================================================================
  // CALORIE RING — THE HERO WITH DUAL AMBIENT HALO
  // =================================================================
  const ringCenterX = W / 2;
  const ringCenterY = dateRowY + 310;
  const ringRadius = 205;
  const strokeW = 36;

  // Dual ambient halo behind ring
  const haloGrad1 = ctx.createRadialGradient(ringCenterX, ringCenterY, 50, ringCenterX, ringCenterY, ringRadius * 1.5);
  haloGrad1.addColorStop(0, "rgba(249, 115, 22, 0.16)");
  haloGrad1.addColorStop(1, "transparent");
  ctx.fillStyle = haloGrad1;
  ctx.fillRect(ringCenterX - ringRadius * 2, ringCenterY - ringRadius * 2, ringRadius * 4, ringRadius * 4);

  // Background Track
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = strokeW;
  ctx.beginPath();
  ctx.arc(ringCenterX, ringCenterY, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Active Progress Arc
  const goalCal = targetCalories || 2000;
  const pct = Math.min(1, calories / goalCal);

  if (pct > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(249, 115, 22, 0.4)";
    ctx.shadowBlur = 24;
    ctx.strokeStyle = "#F97316";
    ctx.lineWidth = strokeW;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(ringCenterX, ringCenterY, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.stroke();
    ctx.restore();
  }

  // Inner Number Display
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(249, 115, 22, 0.9)";
  ctx.font = "900 18px Inter, system-ui, sans-serif";
  ctx.fillText("ENERGY LOGGED", ringCenterX, ringCenterY - 75);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 88px Inter, system-ui, sans-serif";
  ctx.fillText(calories.toLocaleString(), ringCenterX, ringCenterY - 2);

  // Orange Accent Dash
  ctx.fillStyle = "#F97316";
  ctx.beginPath();
  ctx.roundRect(ringCenterX - 24, ringCenterY + 44, 48, 6, 3);
  ctx.fill();

  // Target Calorie Text
  ctx.fillStyle = "#A8A29E";
  ctx.font = "900 18px Inter, system-ui, sans-serif";
  ctx.fillText(`TARGET: ${goalCal.toLocaleString()} KCAL`, ringCenterX, ringCenterY + 80);

  // =================================================================
  // 4-MACRO CAPSULES GRID (Dark Frosted Glass)
  // =================================================================
  const macroGridY = ringCenterY + ringRadius + 65;
  const cardW = 212;
  const cardGap = 20;
  const cardH = 175;
  const gridStartX = 80;

  const macros = [
    { name: "PROTEIN", val: `${protein}g`, goal: `Goal ${targetProtein || 140}g`, color: "#F97316" },
    { name: "CARBS",   val: `${carbs}g`,   goal: `Goal ${targetCarbs || 210}g`,   color: "#38BDF8" },
    { name: "FATS",    val: `${fats}g`,    goal: `Goal ${targetFats || 65}g`,     color: "#FBBF24" },
    { name: "FIBER",   val: `${fiber}g`,   goal: `Goal ${targetFiber || 35}g`,    color: "#34D399" }
  ];

  macros.forEach((m, i) => {
    const bx = gridStartX + i * (cardW + cardGap);
    
    // Frosted dark glass container
    ctx.fillStyle = "rgba(24, 21, 19, 0.92)";
    ctx.beginPath();
    ctx.roundRect(bx, macroGridY, cardW, cardH, 26);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, macroGridY, cardW, cardH, 26);
    ctx.stroke();

    // Tag
    ctx.textAlign = "center";
    ctx.fillStyle = m.color;
    ctx.font = "900 20px Inter, system-ui, sans-serif";
    ctx.fillText(m.name, bx + cardW / 2, macroGridY + 34);

    // Value
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 38px Inter, system-ui, sans-serif";
    ctx.fillText(m.val, bx + cardW / 2, macroGridY + 92);

    // Goal
    ctx.fillStyle = "#A8A29E";
    ctx.font = "700 18px Inter, system-ui, sans-serif";
    ctx.fillText(m.goal, bx + cardW / 2, macroGridY + 140);
  });

  // =================================================================
  // MEALS TIMELINE CONTAINER (Dark Frosted Glass with Glowing Dots)
  // =================================================================
  const timelineY = macroGridY + cardH + 30;
  const timelineH = H - timelineY - 140;

  ctx.fillStyle = "rgba(24, 21, 19, 0.92)";
  ctx.beginPath();
  ctx.roundRect(80, timelineY, 920, timelineH, 32);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(80, timelineY, 920, timelineH, 32);
  ctx.stroke();

  // Header Title
  ctx.textAlign = "left";
  ctx.fillStyle = "#A8A29E";
  ctx.font = "900 20px Inter, system-ui, sans-serif";
  ctx.fillText("TIMELINE SUMMARY", 120, timelineY + 46);

  // Compliance Pill
  ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
  ctx.beginPath();
  ctx.roundRect(710, timelineY + 22, 250, 48, 24);
  ctx.fill();

  ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(710, timelineY + 22, 250, 48, 24);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#34D399";
  ctx.font = "900 19px Inter, system-ui, sans-serif";
  ctx.fillText("🔥 92% ON TARGET", 835, timelineY + 52);

  // Separator Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(120, timelineY + 92);
  ctx.lineTo(960, timelineY + 92);
  ctx.stroke();

  // Timeline Items
  const topMeals = mealsList.slice(0, 4);
  let itemY = timelineY + 120;
  const rowSpacing = (timelineH - 140) / Math.max(topMeals.length, 1);

  topMeals.forEach((meal: any, idx: number) => {
    // Glowing bullet dot
    ctx.fillStyle = "rgba(249, 115, 22, 0.25)";
    ctx.beginPath();
    ctx.arc(126, itemY + 14, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#F97316";
    ctx.beginPath();
    ctx.arc(126, itemY + 14, 5, 0, Math.PI * 2);
    ctx.fill();

    // Meal Title
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 24px Inter, system-ui, sans-serif";
    let mealLabel = meal.name || "Logged Meal";
    if (mealLabel.length > 32) mealLabel = mealLabel.substring(0, 29) + "...";
    ctx.fillText(mealLabel, 155, itemY + 14);

    // Calorie Tag
    ctx.textAlign = "right";
    ctx.fillStyle = "#F97316";
    ctx.font = "900 24px Inter, system-ui, sans-serif";
    ctx.fillText(`${meal.calories || 0} kcal`, 960, itemY + 14);

    // Subtitle (Time + Protein)
    ctx.textAlign = "left";
    ctx.fillStyle = "#A8A29E";
    ctx.font = "700 18px Inter, system-ui, sans-serif";
    const subStr = `${meal.time || "Logged"}  •  ${meal.protein || 0}g Protein`;
    ctx.fillText(subStr, 155, itemY + 44);

    // Row Divider
    if (idx < topMeals.length - 1) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(155, itemY + 68);
      ctx.lineTo(960, itemY + 68);
      ctx.stroke();
    }

    itemY += Math.min(rowSpacing, 110);
  });

  // =================================================================
  // FOOTER — Clean Branding
  // =================================================================
  const footerY = H - 85;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(80, footerY);
  ctx.lineTo(1000, footerY);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#A8A29E";
  ctx.font = "800 20px Inter, system-ui, sans-serif";
  ctx.fillText("FITAI • PROGRESS ENGINE", 80, footerY + 38);

  ctx.textAlign = "right";
  ctx.fillText("fitpush.vercel.app", 1000, footerY + 38);
  ctx.textAlign = "left";
}
