import { CardDrawContext } from "./types";
import { drawBrandHeader, wrapText } from "./helpers";

export function drawRecipeObsidianCard(dc: CardDrawContext): void {
  const { ctx, canvas, handleStr, name, time, calories, protein, carbs, fats, fiber, ingredients = [] } = dc;

  const textColor = "#FAF9F6";
  const textMuted = "#A8A29E";
  const accentColor = "#F97316";
  const panelFill = "rgba(18, 17, 16, 0.72)";
  const panelBorder = "rgba(255, 255, 255, 0.15)";
  const borderWidth = 1.5;
  const fontFamily = "Inter, system-ui, sans-serif";

  // === Background ===
  const bgGrad = ctx.createRadialGradient(540, canvas.height / 2, 100, 540, canvas.height / 2, canvas.height);
  bgGrad.addColorStop(0, "#2E2B28");
  bgGrad.addColorStop(1, "#0E0D0C");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, canvas.height);

  // === Header ===
  drawBrandHeader(ctx, handleStr, {
    logoBoxColor: "#F97316",
    textColor: "#FAF9F6",
    fontFamily: "Inter, system-ui, sans-serif",
    badgeFont: "800 20px Inter, system-ui, sans-serif",
    badgeTextColor: "#FAF9F6"
  });

  // === Glass Overlay Box ===
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

  // Recipe Name
  const finalY = wrapText(ctx, name, 130, 320, 440, 80, textColor, "900 68px Inter, system-ui, sans-serif");
  
  // Prep time
  const activePrepTime = time || "15 min";
  const subtitleY = finalY + 60;
  ctx.fillStyle = accentColor;
  ctx.font = "900 24px Inter, system-ui, sans-serif";
  ctx.fillText(`${activePrepTime.toUpperCase()} PREP`, 130, subtitleY);

  // Calories (centered vertically in left column space)
  const spaceTop = subtitleY + 20;
  const spaceBottom = canvas.height - 280;
  const calCenterY = spaceTop + (spaceBottom - spaceTop) / 2;

  ctx.fillStyle = textColor;
  ctx.font = "900 96px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(`${calories} kcal`, 130, calCenterY);
  ctx.textBaseline = "alphabetic";

  // === Ingredients Checklist Card (on right) ===
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

  // === Macros Section ===
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

  // Footer
  const footerY = canvas.height - 110;
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, footerY);
  ctx.lineTo(1000, footerY);
  ctx.stroke();

  ctx.fillStyle = textMuted;
  ctx.font = `700 22px ${fontFamily}`;
  ctx.fillText("FITAI • RECIPE ENGINE", 80, footerY + 45);
  ctx.textAlign = "right";
  ctx.fillText("fitpush.vercel.app", 1000, footerY + 45);
  ctx.textAlign = "left";
}
