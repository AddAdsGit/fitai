import { CardDrawContext } from "./types";
import { drawBrandHeader, wrapText } from "./helpers";

export function drawMealEditorialCard(dc: CardDrawContext): void {
  const { ctx, canvas, handleStr, name, calories, protein, carbs, fats, fiber, description } = dc;

  const textColor = "#1A1715";
  const textMuted = "#78716C";

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

  const finalY = wrapText(ctx, name.toUpperCase(), 80, 300, 520, 80, textColor, "900 68px Impact, Inter Condensed, Inter, sans-serif");
  
  ctx.strokeStyle = "#F97316";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(80, finalY + 40);
  ctx.lineTo(160, finalY + 40);
  ctx.stroke();

  const descY = finalY + 95;
  const mealDesc = description || "Healthy food logged on FitAI to power daily wellness.";
  wrapText(ctx, mealDesc, 80, descY, 520, 38, "#44403C", "500 25px Inter, system-ui, sans-serif");

  ctx.textAlign = "right";
  ctx.fillStyle = "#F97316";
  ctx.font = "900 140px Inter, system-ui, sans-serif";
  ctx.fillText(`${calories}`, 1000, 480);

  ctx.fillStyle = "#1A1715";
  ctx.font = "900 32px Inter, system-ui, sans-serif";
  ctx.fillText("KCAL", 1000, 550);

  ctx.fillStyle = "#78716C";
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  ctx.fillText("TOTAL KCAL", 1000, 600);
  ctx.textAlign = "left";

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
