import { CardDrawContext } from "./types";
import { wrapText } from "./helpers";
import { BRAND_FLAME_SVG_PATH } from "../../constants/brand";

/**
 * FitAI Dual-Track Swiss Minimalist Day Card (3:4)
 * Canvas drawer matching SwissMinimalistCardComponent.tsx with 1080x1440 fidelity.
 */
export function drawSwissMinimalistCard(dc: CardDrawContext): void {
  const { ctx, canvas, handleStr, calories, protein, mealsList = [], date } = dc;

  const W = 1080;
  const H = canvas.height;

  // 1. Background #080809
  ctx.fillStyle = "#080809";
  ctx.fillRect(0, 0, W, H);

  // 2. Header Row (Y: 90 to 160)
  // Logo Box: Crisp White square with black Flame
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(80, 90, 60, 60, 16);
  ctx.fill();

  ctx.save();
  ctx.translate(93, 103);
  ctx.scale(1.4, 1.4);
  const flamePath = new Path2D(BRAND_FLAME_SVG_PATH);
  ctx.fillStyle = "#000000";
  ctx.fill(flamePath);
  ctx.restore();

  let dateTitle = "TODAY";
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      dateTitle = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase();
    }
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#A1A1AA";
  ctx.font = "700 28px Courier, monospace";
  ctx.fillText(dateTitle, 160, 130);

  const userTag = handleStr.startsWith("@") ? handleStr.toUpperCase() : `@${handleStr.toUpperCase()}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "#71717A";
  ctx.fillText(userTag, 1000, 130);

  // 3. Dual Big Numbers (Center Y: ~520 to 880)
  const leftX = 80;
  const rightX = 555;
  const numY = 560;

  // Energy Intake (Left)
  ctx.textAlign = "left";
  ctx.fillStyle = "#71717A";
  ctx.font = "900 26px Inter, system-ui, sans-serif";
  ctx.fillText("ENERGY", leftX, numY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 135px Inter, system-ui, sans-serif";
  ctx.fillText(calories.toLocaleString(), leftX, numY + 140);

  ctx.fillStyle = "#FB923C";
  ctx.font = "800 28px Inter, system-ui, sans-serif";
  ctx.fillText("kcal", leftX, numY + 195);

  // Protein (Right)
  ctx.fillStyle = "#10B981";
  ctx.font = "900 26px Inter, system-ui, sans-serif";
  ctx.fillText("PROTEIN", rightX, numY);

  ctx.fillStyle = "#34D399";
  ctx.font = "900 135px Inter, system-ui, sans-serif";
  ctx.fillText(`${protein}g`, rightX, numY + 140);

  ctx.fillStyle = "rgba(52, 211, 153, 0.7)";
  ctx.font = "800 28px Inter, system-ui, sans-serif";
  ctx.fillText("total", rightX, numY + 195);

  // 4. Logged List (Bottom Y: 1100 to 1340)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 1100);
  ctx.lineTo(1000, 1100);
  ctx.stroke();

  ctx.fillStyle = "#71717A";
  ctx.font = "800 24px Inter, system-ui, sans-serif";
  ctx.fillText(`DAY SUMMARY • ${mealsList.length} ${mealsList.length === 1 ? "MEAL" : "MEALS"}`, 80, 1150);

  const mealSummaryStr = mealsList.length > 0
    ? mealsList.map((m: any) => `${m.name || "Meal"} (${m.protein || 0}g P)`).join(", ")
    : "No meals logged today";

  wrapText(ctx, mealSummaryStr, 80, 1200, 920, 42, "#A1A1AA", "500 28px Inter, system-ui, sans-serif", "left");
}
