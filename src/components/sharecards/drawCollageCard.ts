import { CardDrawContext } from "./types";
import { drawBrandHeader, wrapText, drawCoverImage } from "./helpers";

export function drawCollageCard(dc: CardDrawContext): void {
  const { ctx, canvas, handleStr, name, calories, protein, carbs, fats, fiber, mealsList, mealImages } = dc;

  const textColor = "#FAF9F6";
  const textMuted = "#A8A29E";

  const bgGrad = ctx.createRadialGradient(540, canvas.height / 2, 100, 540, canvas.height / 2, canvas.height);
  bgGrad.addColorStop(0, "#23211F");
  bgGrad.addColorStop(1, "#0E0D0C");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, canvas.height);

  drawBrandHeader(ctx, handleStr, {
    logoBoxColor: "#F97316",
    textColor: "#FAF9F6",
    fontFamily: "Inter, system-ui, sans-serif",
    badgeFont: "800 20px Inter, system-ui, sans-serif",
    badgeTextColor: "#FAF9F6"
  });

  const finalY = wrapText(ctx, name, 80, 250, 920, 84, textColor, "900 76px Inter, system-ui, sans-serif");
  const subtitleY = finalY + 45;
  
  ctx.fillStyle = textMuted;
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.fillText("TODAY'S FOOD GALLERY", 80, subtitleY);

  const imgs = mealsList
    .map((m: any) => mealImages[m.id || m.name])
    .filter(Boolean);

  const gridY = finalY + 95;
  const gridH = 500;

  if (imgs.length === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.roundRect(80, gridY, 920, gridH, 24);
    ctx.fill();
    
    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = textMuted;
    ctx.font = "500 28px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Log meals with photos to see your daily collage here!", 540, gridY + 260);
    ctx.textAlign = "left";
  } else if (imgs.length === 1) {
    drawCoverImage(ctx, imgs[0], 80, gridY, 920, gridH, 24);
  } else if (imgs.length === 2) {
    const colW = 445;
    drawCoverImage(ctx, imgs[0], 80, gridY, colW, gridH, 24);
    drawCoverImage(ctx, imgs[1], 80 + colW + 30, gridY, colW, gridH, 24);
  } else if (imgs.length === 3) {
    const leftW = 480;
    const rightW = 410;
    const halfH = (gridH - 30) / 2;
    drawCoverImage(ctx, imgs[0], 80, gridY, leftW, gridH, 24);
    drawCoverImage(ctx, imgs[1], 80 + leftW + 30, gridY, rightW, halfH, 20);
    drawCoverImage(ctx, imgs[2], 80 + leftW + 30, gridY + halfH + 30, rightW, halfH, 20);
  } else if (imgs.length === 4) {
    const colW = 445;
    const halfH = (gridH - 30) / 2;
    drawCoverImage(ctx, imgs[0], 80, gridY, colW, halfH, 20);
    drawCoverImage(ctx, imgs[1], 80 + colW + 30, gridY, colW, halfH, 20);
    drawCoverImage(ctx, imgs[2], 80, gridY + halfH + 30, colW, halfH, 20);
    drawCoverImage(ctx, imgs[3], 80 + colW + 30, gridY + halfH + 30, colW, halfH, 20);
  } else if (imgs.length === 5) {
    const halfH = (gridH - 30) / 2;
    const topW = 445;
    const botW = 286;
    
    drawCoverImage(ctx, imgs[0], 80, gridY, topW, halfH, 20);
    drawCoverImage(ctx, imgs[1], 80 + topW + 30, gridY, topW, halfH, 20);
    
    drawCoverImage(ctx, imgs[2], 80, gridY + halfH + 30, botW, halfH, 16);
    drawCoverImage(ctx, imgs[3], 80 + botW + 30, gridY + halfH + 30, botW, halfH, 16);
    drawCoverImage(ctx, imgs[4], 80 + 2 * (botW + 30), gridY + halfH + 30, botW, halfH, 16);
  } else {
    const halfH = (gridH - 30) / 2;
    const colW = 286;

    drawCoverImage(ctx, imgs[0], 80, gridY, colW, halfH, 16);
    drawCoverImage(ctx, imgs[1], 80 + colW + 30, gridY, colW, halfH, 16);
    drawCoverImage(ctx, imgs[2], 80 + 2 * (colW + 30), gridY, colW, halfH, 16);

    drawCoverImage(ctx, imgs[3], 80, gridY + halfH + 30, colW, halfH, 16);
    drawCoverImage(ctx, imgs[4], 80 + colW + 30, gridY + halfH + 30, colW, halfH, 16);
    
    const lastX = 80 + 2 * (colW + 30);
    const lastY = gridY + halfH + 30;
    drawCoverImage(ctx, imgs[5], lastX, lastY, colW, halfH, 16);

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.beginPath();
    ctx.roundRect(lastX, lastY, colW, halfH, 16);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 36px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`+${imgs.length - 5}`, lastX + colW / 2, lastY + halfH / 2);
    ctx.restore();
  }

  const textTopY = gridY + gridH + 110;
  ctx.fillStyle = textColor;
  ctx.font = "900 90px Inter, system-ui, sans-serif";
  ctx.fillText(`${calories} kcal`, 80, textTopY);

  ctx.fillStyle = textMuted;
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.fillText("DAILY TOTAL ENERGY CONSUMED", 85, textTopY + 45);

  const macroY = canvas.height - 280;
  const macros = [
    { label: "PROTEIN", val: `${protein}g`, color: "#F97316" },
    { label: "CARBS", val: `${carbs}g`, color: "#38BDF8" },
    { label: "FAT", val: `${fats}g`, color: "#FBBF24" },
    { label: "FIBER", val: `${fiber}g`, color: "#34D399" }
  ];

  const colWidth = 920 / 4;
  const startX = 80;

  macros.forEach((m, idx) => {
    const centerColX = startX + idx * colWidth + colWidth / 2;
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "800 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(m.label, centerColX, macroY + 25);

    ctx.fillStyle = m.color;
    ctx.font = "900 32px Inter, sans-serif";
    ctx.fillText(m.val, centerColX, macroY + 70);

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
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(80, macroY - 25);
  ctx.lineTo(1000, macroY - 25);
  ctx.stroke();
}
