import { CardDrawContext } from "./types";
import { drawBrandHeader, wrapText, drawCoverImage } from "./helpers";

export function drawMealObsidianCard(dc: CardDrawContext): void {
  const { ctx, canvas, handleStr, name, time, calories, protein, carbs, fats, fiber, loadedImg, description, tags } = dc;

  const textColor = "#FAF9F6";
  const textMuted = "#A8A29E";

  // === Background ===
  if (loadedImg) {
    drawCoverImage(ctx, loadedImg, 0, 0, 1080, canvas.height, 0);
    ctx.fillStyle = "rgba(14, 13, 12, 0.65)";
    ctx.fillRect(0, 0, 1080, canvas.height);
  } else {
    const bgGrad = ctx.createRadialGradient(540, canvas.height / 2, 100, 540, canvas.height / 2, canvas.height);
    bgGrad.addColorStop(0, "#2E2B28");
    bgGrad.addColorStop(1, "#0E0D0C");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, canvas.height);
  }

  // === Header ===
  drawBrandHeader(ctx, handleStr, {
    logoBoxColor: "#F97316",
    textColor: "#FAF9F6",
    fontFamily: "Inter, system-ui, sans-serif",
    badgeFont: "800 20px Inter, system-ui, sans-serif",
    badgeTextColor: "#FAF9F6"
  });

  // === Content ===
  const finalY = wrapText(ctx, name, 80, 320, 920, 70, textColor, "900 64px Inter, system-ui, sans-serif");

  const mealDesc = description || "";
  let descEndY = finalY;
  if (mealDesc) {
    descEndY = wrapText(ctx, mealDesc, 80, finalY + 60, 920, 34, "rgba(255,255,255,0.7)", "500 22px Inter, system-ui, sans-serif");
  }

  // Draw tag pills
  const activeTags = tags || [];
  if (activeTags.length > 0) {
    ctx.font = "800 16px Inter, system-ui, sans-serif";
    const tagsY = descEndY + 50;
    let currentX = 80;
    activeTags.slice(0, 3).forEach(tag => {
      const textWidth = ctx.measureText(tag.toUpperCase()).width;
      const pillW = textWidth + 30;
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.roundRect(currentX, tagsY, pillW, 36, 10);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(currentX, tagsY, pillW, 36, 10);
      ctx.stroke();

      ctx.fillStyle = "#FAF9F6";
      ctx.fillText(tag.toUpperCase(), currentX + 15, tagsY + 24);
      currentX += pillW + 12;
    });
    descEndY += 60; // Push calorie display down to accommodate tags row
  }

  const calY = Math.max(710, descEndY + 110);
  ctx.fillStyle = textColor;
  ctx.font = "900 130px Inter, system-ui, sans-serif";
  ctx.fillText(`${calories}`, 80, calY);

  ctx.fillStyle = textMuted;
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.fillText("TOTAL KCAL", 85, calY + 55);

  // === Macros Section ===
  const macroY = 820;
  const macros = [
    { label: "PRO", val: `${protein}g` },
    { label: "CARB", val: `${carbs}g` },
    { label: "FAT", val: `${fats}g` },
    { label: "FIBER", val: `${fiber}g` }
  ];

  const colWidth = 215;
  const gap = 20;
  const startX = 80;
  const cardH = 115;

  macros.forEach((m, idx) => {
    const mX = startX + idx * (colWidth + gap);
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.beginPath();
    ctx.roundRect(mX, macroY, colWidth, cardH, 22);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(mX, macroY, colWidth, cardH, 22);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#A8A29E";
    ctx.font = "700 16px Inter, sans-serif";
    ctx.fillText(m.label, mX + colWidth / 2, macroY + 42);

    ctx.fillStyle = "#FAF9F6";
    ctx.font = "900 28px Inter, system-ui, sans-serif";
    ctx.fillText(m.val, mX + colWidth / 2, macroY + 86);
    ctx.textAlign = "left";
  });

  // Footer
  const footerY = canvas.height - 110;
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, footerY);
  ctx.lineTo(1000, footerY);
  ctx.stroke();

  ctx.fillStyle = "#A8A29E";
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  ctx.fillText("FITAI • CALORIE ENGINE", 80, footerY + 45);
  ctx.textAlign = "right";
  ctx.fillText("fitpush.vercel.app", 1000, footerY + 45);
  ctx.textAlign = "left";
}
