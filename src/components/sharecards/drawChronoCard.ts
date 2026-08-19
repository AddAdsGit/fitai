import { CardDrawContext } from "./types";
import { drawCoverImage } from "./helpers";
import { BRAND_FLAME_SVG_PATH } from "../../constants/brand";

/**
 * FitAI Dual-Track (Protein + Calories Only) Chrono Story Card (9:16)
 * Canvas drawer matching ChronoCardComponent.tsx with 1080x1920 fidelity.
 */
export function drawChronoCard(dc: CardDrawContext): void {
  const { ctx, canvas, handleStr, calories, protein, targetProtein = 150, mealsList = [], mealImages = {}, date } = dc;

  const W = 1080;
  const H = canvas.height;

  // 1. Background #0A0B0D
  ctx.fillStyle = "#0A0B0D";
  ctx.fillRect(0, 0, W, H);

  // 2. Header Row (Y: 100 to 180)
  // Logo Box: White square with orange Flame
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(80, 100, 72, 72, 20);
  ctx.fill();

  ctx.save();
  ctx.translate(96, 116);
  ctx.scale(1.7, 1.7);
  const flamePath = new Path2D(BRAND_FLAME_SVG_PATH);
  ctx.fillStyle = "#000000";
  ctx.fill(flamePath);
  ctx.restore();

  // FitAI text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 48px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("FitAI", 172, 152);

  // Monospace username right
  const userTag = handleStr.startsWith("@") ? handleStr.toUpperCase() : `@${handleStr.toUpperCase()}`;
  ctx.fillStyle = "#A1A1AA";
  ctx.font = "700 28px Courier, monospace";
  ctx.textAlign = "right";
  ctx.fillText(userTag, 1000, 150);

  // 3. Date & Subtitle (Y: 260 to 350)
  let dateTitle = "TODAY";
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      dateTitle = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase();
    }
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 64px Inter, system-ui, sans-serif";
  ctx.fillText(dateTitle, 80, 280);

  const totalMealsCount = mealsList.length;
  const maxDisplay = totalMealsCount >= 6 ? 5 : totalMealsCount;
  const topMeals = mealsList.slice(0, maxDisplay);
  const remainingMeals = totalMealsCount - maxDisplay;

  ctx.fillStyle = "#34D399";
  ctx.font = "800 26px Inter, system-ui, sans-serif";
  ctx.letterSpacing = "0.08em";
  ctx.fillText(`DAILY TIMELINE • ${totalMealsCount} ${totalMealsCount === 1 ? "MEAL" : "MEALS"}`, 80, 340);

  // 4. Meal Cards Stack (Adaptive dynamic height based on count)
  let cardY = 390;
  const isCompact = totalMealsCount >= 5;
  const cardH = isCompact ? 175 : 215;
  const gap = isCompact ? 20 : 30;
  const thumbS = isCompact ? 120 : 140;

  topMeals.forEach((meal: any, idx: number) => {
    // Card Container (bg-zinc-900/40 border border-white/5)
    ctx.fillStyle = "rgba(24, 24, 27, 0.65)";
    ctx.beginPath();
    ctx.roundRect(80, cardY, 920, cardH, 28);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, cardY, 920, cardH, 28);
    ctx.stroke();

    // Food Thumbnail
    const thumbX = 110;
    const thumbY = cardY + (cardH - thumbS) / 2;

    const imgElement = mealImages?.[meal.id || meal.name];
    if (imgElement && typeof imgElement !== "string") {
      drawCoverImage(ctx, imgElement, thumbX, thumbY, thumbS, thumbS, 20);
    } else {
      ctx.fillStyle = "rgba(39, 39, 42, 0.9)";
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbS, thumbS, 20);
      ctx.fill();

      ctx.fillStyle = "rgba(244, 244, 245, 0.85)";
      ctx.font = isCompact ? "900 44px Inter, system-ui, sans-serif" : "900 52px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      const initial = meal.name ? meal.name[0].toUpperCase() : "M";
      ctx.fillText(initial, thumbX + thumbS / 2, thumbY + (isCompact ? 75 : 88));
    }

    // Meal Title & Number
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = isCompact ? "900 32px Inter, system-ui, sans-serif" : "900 36px Inter, system-ui, sans-serif";
    let mealLabel = meal.name || "Logged Meal";
    if (mealLabel.length > 22) mealLabel = mealLabel.substring(0, 19) + "...";
    ctx.fillText(mealLabel, thumbX + thumbS + 30, cardY + (isCompact ? 75 : 90));

    ctx.fillStyle = "#71717A";
    ctx.font = isCompact ? "700 20px Courier, monospace" : "700 24px Courier, monospace";
    ctx.fillText(`MEAL ${idx + 1}`, thumbX + thumbS + 30, cardY + (isCompact ? 125 : 150));

    // Right Side Dual Metrics: Calories (Orange) + Protein (Emerald)
    ctx.textAlign = "right";
    ctx.fillStyle = "#FB923C";
    ctx.font = isCompact ? "900 32px Inter, system-ui, sans-serif" : "900 36px Inter, system-ui, sans-serif";
    ctx.fillText(`+${meal.calories || 0} kcal`, 960, cardY + (isCompact ? 75 : 90));

    ctx.fillStyle = "#34D399";
    ctx.font = isCompact ? "900 28px Inter, system-ui, sans-serif" : "900 32px Inter, system-ui, sans-serif";
    ctx.fillText(`+${meal.protein || 0}g Pro`, 960, cardY + (isCompact ? 125 : 150));

    cardY += cardH + gap;
  });

  if (remainingMeals > 0) {
    ctx.fillStyle = "rgba(24, 24, 27, 0.4)";
    ctx.beginPath();
    ctx.roundRect(80, cardY, 920, 54, 18);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "#A1A1AA";
    ctx.font = "800 22px Inter, system-ui, sans-serif";
    ctx.fillText(`+ ${remainingMeals} MORE ${remainingMeals === 1 ? "MEAL" : "MEALS"} LOGGED TODAY`, 540, cardY + 35);
  }

  // 5. Dual Bottom Summary Box (Y: 1520 to 1780)
  // Separator Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 1470);
  ctx.lineTo(1000, 1470);
  ctx.stroke();

  const boxW = 445;
  const boxH = 240;
  const by = 1520;

  // Left Box: Energy (bg-white/5)
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.beginPath();
  ctx.roundRect(80, by, boxW, boxH, 32);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(80, by, boxW, boxH, 32);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "800 24px Inter, system-ui, sans-serif";
  ctx.fillText("ENERGY", 120, by + 65);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 88px Inter, system-ui, sans-serif";
  ctx.fillText(calories.toLocaleString(), 120, by + 165);

  const calValW = ctx.measureText(calories.toLocaleString()).width;
  ctx.fillStyle = "#FB923C";
  ctx.font = "900 28px Inter, system-ui, sans-serif";
  ctx.fillText("KCAL", 120 + calValW + 15, by + 165);

  // Right Box: Protein (bg-emerald-500/10)
  ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
  ctx.beginPath();
  ctx.roundRect(555, by, boxW, boxH, 32);
  ctx.fill();

  ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(555, by, boxW, boxH, 32);
  ctx.stroke();

  ctx.fillStyle = "rgba(52, 211, 153, 0.8)";
  ctx.font = "800 24px Inter, system-ui, sans-serif";
  ctx.fillText("PROTEIN", 595, by + 65);

  ctx.fillStyle = "#34D399";
  ctx.font = "900 88px Inter, system-ui, sans-serif";
  ctx.fillText(`${protein}g`, 595, by + 165);
}
