import { CardDrawContext } from "./types";
import { drawBrandHeader, wrapText, drawStructuredImage } from "./helpers";

export function drawRecipeEditorialCard(dc: CardDrawContext): void {
  const { ctx, canvas, handleStr, name, time, calories, protein, carbs, fats, fiber, ingredients = [], loadedImg } = dc;

  const textColor = "#1A1715";
  const textMuted = "#78716C";
  const accentColor = "#F97316";

  ctx.fillStyle = "#FAF6EE";
  ctx.fillRect(0, 0, 1080, canvas.height);

  drawBrandHeader(ctx, handleStr, {
    logoBoxColor: "#1A1715",
    textColor: "#1A1715",
    fontFamily: "Georgia, serif",
    isEditorial: true,
    badgeFont: "700 20px Georgia, serif",
    badgeTextColor: "#1A1715"
  });

  let contentY = 300;
  if (loadedImg) {
    drawStructuredImage(ctx, loadedImg, 80, 220, 440, 320, 20, true);
    contentY = 580;
  }

  const titleSize = loadedImg ? "900 48px Impact, Inter, sans-serif" : "900 68px Impact, Inter Condensed, Inter, sans-serif";
  const finalY = wrapText(ctx, name.toUpperCase(), 80, contentY, 440, 65, textColor, titleSize);

  const activePrepTime = time || "15 min";
  ctx.fillStyle = "#F97316";
  ctx.font = "900 22px Inter, system-ui, sans-serif";
  ctx.fillText(`${activePrepTime.toUpperCase()} PREP`, 80, finalY + 60);

  const calY = finalY + 120;
  ctx.fillStyle = "#F97316";
  ctx.font = "900 96px Inter, system-ui, sans-serif";
  ctx.fillText(`${calories}`, 80, calY);

  ctx.fillStyle = "#1A1715";
  ctx.font = "900 24px Inter, system-ui, sans-serif";
  ctx.fillText("KCAL", 85 + ctx.measureText(`${calories}`).width, calY);

  const checklistX = 580;
  const checklistY = 220;
  const checklistW = 340;
  const checklistH = 430;

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(checklistX, checklistY, checklistW, checklistH, 24);
  ctx.fill();

  ctx.strokeStyle = "rgba(26, 23, 21, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(checklistX, checklistY, checklistW, checklistH, 24);
  ctx.stroke();

  ctx.fillStyle = "#1A1715";
  ctx.font = "800 22px Inter, system-ui, sans-serif";
  ctx.fillText("INGREDIENTS", checklistX + 40, checklistY + 54);

  ctx.font = "700 20px Inter, system-ui, sans-serif";
  const topIngs = ingredients.slice(0, 5);
  topIngs.forEach((ing: string, idx: number) => {
    ctx.fillStyle = "#F97316";
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

  // === Macros Section ===
  const macroY = 750;
  const macros = [
    { label: "PROTEIN", val: `${protein}g` },
    { label: "CARBS", val: `${carbs}g` },
    { label: "FAT", val: `${fats}g` },
    { label: "FIBER", val: `${fiber}g` }
  ];

  const colWidth = 920 / 4;
  const startX = 80;

  macros.forEach((m, idx) => {
    const centerColX = startX + idx * colWidth + colWidth / 2;
    
    ctx.fillStyle = "#78716C";
    ctx.font = "800 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(m.label, centerColX, macroY + 25);

    ctx.fillStyle = "#1A1715";
    ctx.font = "900 32px Inter, sans-serif";
    ctx.fillText(m.val, centerColX, macroY + 70);

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
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(26, 23, 21, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(80, macroY - 25);
  ctx.lineTo(1000, macroY - 25);
  ctx.stroke();

  const footerY = canvas.height - 110;
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
  ctx.textAlign = "left";
}
