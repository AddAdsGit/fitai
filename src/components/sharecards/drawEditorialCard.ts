import { CardDrawContext } from "./types";
import { drawBrandHeader, wrapText } from "./helpers";

export function drawEditorialCard(dc: CardDrawContext): void {
  const { ctx, canvas, handleStr, name, calories, protein, carbs, fats, fiber, mealsList, weight } = dc;

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

  const finalY = wrapText(ctx, name.toUpperCase(), 80, 250, 920, 84, textColor, "800 68px Georgia, serif");

  const subtitleY = finalY + 45;
  ctx.fillStyle = "#F97316";
  ctx.font = "800 22px Inter, system-ui, sans-serif";
  ctx.fillText("TODAY'S PROGRESS", 80, subtitleY);

  // If weight is available, draw weight label right-aligned
  if (weight && weight > 0) {
    ctx.fillStyle = textMuted;
    ctx.font = "800 20px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`WEIGHT: ${weight} kg`, 1000, subtitleY);
    ctx.textAlign = "left"; // reset
  }

  const boxY = finalY + 95;
  const topMeals = mealsList.slice(0, 6);
  const rowOffset = 60;
  const rowsCount = topMeals.length + (mealsList.length > topMeals.length ? 1 : 0);
  const boxH = Math.max(160, 100 + rowsCount * rowOffset);

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

  if (topMeals.length > 1) {
    ctx.strokeStyle = "rgba(26, 23, 21, 0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(130, boxY + 115);
    ctx.lineTo(130, boxY + 115 + (topMeals.length - 1) * rowOffset);
    ctx.stroke();
  }

  ctx.font = "600 24px Inter, system-ui, sans-serif";
  if (topMeals.length === 0) {
    ctx.fillStyle = "#78716C";
    ctx.fillText("No meals logged on this day.", 120, boxY + 120);
  } else {
    topMeals.forEach((meal: any, idx: number) => {
      ctx.fillStyle = "#F97316";
      ctx.beginPath();
      ctx.arc(130, boxY + 115 + idx * rowOffset, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1A1715";
      let mealLabel = meal.name || "Logged Meal";
      if (meal.time) {
        mealLabel = `[${meal.time}] ${mealLabel}`;
      }
      if (mealLabel.length > 36) mealLabel = mealLabel.substring(0, 33) + "...";
      ctx.fillText(mealLabel, 165, boxY + 123 + idx * rowOffset);

      ctx.fillStyle = "#78716C";
      ctx.font = "600 24px Inter, system-ui, sans-serif";
      ctx.fillText(`+${meal.calories || 0} kcal`, 820, boxY + 123 + idx * rowOffset);
    });
    
    if (mealsList.length > topMeals.length) {
      ctx.fillStyle = "#78716C";
      ctx.font = "italic 20px Inter, system-ui, sans-serif";
      ctx.fillText(`+ ${mealsList.length - topMeals.length} more meals logged`, 120, boxY + 115 + topMeals.length * rowOffset);
    }
  }

  const spaceTop = boxY + boxH;
  const spaceBottom = canvas.height - 280;
  const calCenterY = spaceTop + (spaceBottom - spaceTop) / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = "#F97316";
  ctx.font = "800 110px Inter, system-ui, sans-serif";
  ctx.fillText(`${calories}`, 540, calCenterY - 15);

  ctx.fillStyle = "#1A1715";
  ctx.font = "800 24px Inter, system-ui, sans-serif";
  ctx.fillText("KCAL", 540, calCenterY + 55);

  ctx.fillStyle = "#78716C";
  ctx.font = "600 18px Inter, system-ui, sans-serif";
  ctx.fillText("DAILY TOTAL", 540, calCenterY + 90);
  ctx.textAlign = "left";

  const macroY = canvas.height - 280;
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
  ctx.fillText("FITAI", 175, footerY + 52);
  ctx.restore();

  ctx.fillStyle = "#78716C";
  ctx.font = "700 20px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("fitpush.vercel.app", 1000, footerY + 52);
  ctx.textAlign = "left";
}
