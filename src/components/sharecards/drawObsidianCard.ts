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
  // BACKGROUND — Two overlapping radial gradients (exact dashboard)
  // bg-[radial-gradient(circle_at_top_right,...)] from-orange-100/40
  // bg-[radial-gradient(circle_at_bottom_left,...)] from-orange-50/30
  // =================================================================
  // Base warm cream
  ctx.fillStyle = "#FAF8F5";
  ctx.fillRect(0, 0, W, H);

  // Radial glow: top-right warm peach (orange-100/40 = rgba(255,237,213,0.4))
  const grad1 = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.65);
  grad1.addColorStop(0, "rgba(255, 237, 213, 0.45)");
  grad1.addColorStop(1, "transparent");
  ctx.fillStyle = grad1;
  ctx.fillRect(0, 0, W, H);

  // Radial glow: bottom-left soft peach (orange-50/30 = rgba(255,247,237,0.3))
  const grad2 = ctx.createRadialGradient(0, H, 0, 0, H, W * 0.65);
  grad2.addColorStop(0, "rgba(255, 247, 237, 0.35)");
  grad2.addColorStop(1, "transparent");
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, W, H);

  // =================================================================
  // HEADER — Brand logo + streak badge (exact dashboard layout)
  // =================================================================
  // Logo: w-9 h-9 rounded-xl bg-orange-500 shadow-lg shadow-orange-200
  drawBrandHeader(ctx, handleStr, {
    logoBoxColor: "#FF7008",
    textColor: "#2A1810",
    fontFamily: "Inter, system-ui, sans-serif",
    badgeFont: "800 20px Inter, system-ui, sans-serif",
    badgeTextColor: "#FAF8F5"
  });

  // FitAI text as gradient (bg-clip-text from-orange-600 to-orange-400)
  // Canvas can't do text gradients natively, so we draw orange-600 solid
  // (the brand header already draws "FitAI" at x=172, y=116 — that's handled)

  // Streak counter: bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-orange-100/50
  if (currentStreak > 0) {
    const streakStr = `${currentStreak}`;
    ctx.font = "700 28px Inter, system-ui, sans-serif";
    const tw = ctx.measureText(streakStr).width;
    const pillW = 72 + tw;
    const pillX = 920 - pillW;
    const pillY = 82;
    const pillH = 64;

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 32);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 237, 213, 0.5)"; // border-orange-100/50
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 32);
    ctx.stroke();

    // 🔥 emoji (text-orange-500 text-lg)
    ctx.textAlign = "left";
    ctx.font = "32px Arial, sans-serif";
    ctx.fillText("🔥", pillX + 16, pillY + 43);

    // streak count (font-bold text-orange-900)
    ctx.fillStyle = "#7C2D12"; // orange-900
    ctx.font = "700 28px Inter, system-ui, sans-serif";
    ctx.fillText(streakStr, pillX + 52, pillY + 43);
  }

  // Profile avatar circle: w-10 h-10 rounded-full border-2 border-orange-500
  const avatarX = 960;
  const avatarY = 84;
  const avatarR = 30;

  ctx.strokeStyle = "#FF7008";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#F5F5F4"; // bg-stone-100
  ctx.beginPath();
  ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR - 3, 0, Math.PI * 2);
  ctx.fill();

  // Default avatar silhouette inside
  ctx.fillStyle = "rgba(42, 24, 16, 0.2)";
  ctx.beginPath();
  ctx.arc(avatarX + avatarR, avatarY + avatarR - 6, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(avatarX + avatarR, avatarY + avatarR + 18, 18, Math.PI + 0.6, -0.6);
  ctx.fill();

  // =================================================================
  // DATE ROW — "JULY 13, 2026" (text-xs font-black uppercase tracking-widest text-stone-500)
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

  const dateRowY = 190;
  ctx.textAlign = "left";
  ctx.fillStyle = "#78716C"; // text-stone-500
  ctx.font = "900 22px Inter, system-ui, sans-serif";
  ctx.letterSpacing = "0.1em";
  ctx.fillText(dateLabel, 80, dateRowY);

  // Weight indicator on right side of date row
  if (weight && weight > 0) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#78716C";
    ctx.font = "800 20px Inter, system-ui, sans-serif";
    ctx.fillText(`${weight} kg`, 1000, dateRowY);
    ctx.textAlign = "left";
  }

  // =================================================================
  // CALORIE RING — THE HERO (exact dashboard: max-w-[280px], r=104, strokeWidth=20)
  // Canvas scale: dashboard is 280px wide → on 1080 canvas we scale to ~540px
  // =================================================================
  const ringCenterX = W / 2;
  const ringCenterY = dateRowY + 320;
  const ringRadius = 210; // Dominant hero ring
  const strokeW = 40;    // strokeWidth=20 scaled 2x for canvas density

  // --- Warm halo glow behind ring (the signature dashboard look) ---
  const haloGrad = ctx.createRadialGradient(
    ringCenterX, ringCenterY, ringRadius * 0.5,
    ringCenterX, ringCenterY, ringRadius * 1.6
  );
  haloGrad.addColorStop(0, "rgba(255, 180, 100, 0.12)");
  haloGrad.addColorStop(0.5, "rgba(255, 200, 140, 0.06)");
  haloGrad.addColorStop(1, "transparent");
  ctx.fillStyle = haloGrad;
  ctx.fillRect(ringCenterX - ringRadius * 2, ringCenterY - ringRadius * 2, ringRadius * 4, ringRadius * 4);

  // --- Drop shadow under ring (drop-shadow-xl) ---
  ctx.save();
  ctx.shadowColor = "rgba(255, 140, 50, 0.15)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 20;

  // Background track: stroke-orange-100/50 = rgba(255,237,213,0.5)
  ctx.strokeStyle = "rgba(255, 237, 213, 0.5)";
  ctx.lineWidth = strokeW;
  ctx.beginPath();
  ctx.arc(ringCenterX, ringCenterY, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Active progress arc: stroke-orange-500 = #F97316, strokeLinecap=round
  const goalCal = targetCalories || 2000;
  const pct = Math.min(1, calories / goalCal);

  if (pct > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(255, 112, 8, 0.25)";
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "#F97316"; // stroke-orange-500
    ctx.lineWidth = strokeW;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(ringCenterX, ringCenterY, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.stroke();
    ctx.restore();
  }

  // --- Inner circle card: bg-white/40 backdrop-blur-md w-40 h-40 rounded-full shadow-inner border border-white/50 ---
  const innerR = 155; // w-40 h-40 = 160px → scaled

  // Inner shadow effect (shadow-inner simulation)
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.06)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; // bg-white/40
  ctx.beginPath();
  ctx.arc(ringCenterX, ringCenterY, innerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Border: border-white/50
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(ringCenterX, ringCenterY, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // --- Calorie number: text-5xl font-black text-orange-950 ---
  ctx.textAlign = "center";
  ctx.fillStyle = "#431407"; // text-orange-950
  ctx.font = "900 96px Inter, system-ui, sans-serif";
  ctx.fillText(calories.toLocaleString(), ringCenterX, ringCenterY - 10);

  // Orange divider bar: h-1.5 w-8 bg-orange-500 rounded-full
  ctx.fillStyle = "#F97316";
  ctx.beginPath();
  ctx.roundRect(ringCenterX - 20, ringCenterY + 16, 40, 7, 4);
  ctx.fill();

  // Goal text: text-orange-900/50 font-black tracking-[0.1em] text-[10px]
  ctx.fillStyle = "rgba(124, 45, 18, 0.5)"; // text-orange-900/50
  ctx.font = "900 20px Inter, system-ui, sans-serif";
  ctx.fillText(`/ ${goalCal.toLocaleString()} KCAL`, ringCenterX, ringCenterY + 56);

  // =================================================================
  // MACRO PROGRESS BARS — Frosted glass panel (exact dashboard)
  // bg-white/60 backdrop-blur-md p-6 rounded-[32px] border border-white/80
  // shadow-xl shadow-orange-100/20 grid grid-cols-2 gap-x-6 gap-y-6
  // =================================================================
  const macroPanelY = ringCenterY + ringRadius + 70;
  const macroPanelH = 250;

  // Panel shadow: shadow-xl shadow-orange-100/20
  ctx.save();
  ctx.shadowColor = "rgba(255, 237, 213, 0.2)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 12;

  // bg-white/60
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.roundRect(80, macroPanelY, 920, macroPanelH, 32);
  ctx.fill();
  ctx.restore();

  // border-white/80
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(80, macroPanelY, 920, macroPanelH, 32);
  ctx.stroke();

  // Macro data (exact dashboard colors: Protein #FF7008, Carbs #006B7D, Fats #FFB800, Fiber #10B981)
  const macros = [
    { label: "PROTEIN", val: protein, goal: targetProtein || 140, color: "#FF7008" },
    { label: "CARBS",   val: carbs,   goal: targetCarbs || 210,   color: "#006B7D" },
    { label: "FATS",    val: fats,    goal: targetFats || 65,     color: "#FFB800" },
    { label: "FIBER",   val: fiber,   goal: targetFiber || 35,    color: "#10B981" }
  ];

  const colW = 380;
  const colGap = 60;
  const gridStartX = 120;
  const gridStartY = macroPanelY + 40;
  const rowGap = 105;

  macros.forEach((m, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const mX = gridStartX + col * (colW + colGap);
    const mY = gridStartY + row * rowGap;

    // Label (left-aligned)
    ctx.textAlign = "left";
    ctx.fillStyle = "#2A1810";
    ctx.font = "900 20px Inter, system-ui, sans-serif";
    ctx.fillText(m.label, mX, mY + 20);

    // Value (colored) + / goal (muted) — right-aligned
    ctx.textAlign = "right";
    ctx.fillStyle = m.color;
    ctx.font = "900 20px Inter, system-ui, sans-serif";
    const valStr = `${m.val}`;
    const valW = ctx.measureText(valStr).width;

    ctx.fillStyle = "rgba(42, 24, 16, 0.35)";
    ctx.font = "700 18px Inter, system-ui, sans-serif";
    const goalStr = ` / ${m.goal}`;
    const goalW = ctx.measureText(goalStr).width;
    ctx.fillText(goalStr, mX + colW, mY + 20);

    ctx.fillStyle = m.color;
    ctx.font = "900 20px Inter, system-ui, sans-serif";
    ctx.fillText(valStr, mX + colW - goalW, mY + 20);

    // Progress bar track: bg-stone-200/60 → light gray
    const barY = mY + 38;
    const barH = 10;
    ctx.fillStyle = "rgba(214, 211, 209, 0.6)"; // stone-300/60
    ctx.beginPath();
    ctx.roundRect(mX, barY, colW, barH, 5);
    ctx.fill();

    // Progress bar fill (colored)
    const fillPct = Math.min(1, m.val / m.goal);
    if (fillPct > 0) {
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.roundRect(mX, barY, colW * fillPct, barH, 5);
      ctx.fill();
    }
  });

  ctx.textAlign = "left";

  // =================================================================
  // MEAL TIMELINE — Frosted glass cards (exact dashboard style)
  // bg-white/80 backdrop-blur-md rounded-2xl border border-white/90 p-4 shadow-3xs
  // =================================================================
  const mealsStartY = macroPanelY + macroPanelH + 40;
  const topMeals = mealsList.slice(0, 4);
  const cardH = 115;
  const cardGap = 14;

  topMeals.forEach((meal: any, idx: number) => {
    const itemY = mealsStartY + idx * (cardH + cardGap);

    // Card shadow (shadow-3xs → very subtle)
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.03)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // bg-white/80
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.roundRect(80, itemY, 920, cardH, 24);
    ctx.fill();
    ctx.restore();

    // border border-white/90
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, itemY, 920, cardH, 24);
    ctx.stroke();

    // Thumbnail: w-9 h-9 rounded-xl (scaled 2x = 72x72 rounded-xl)
    const thumbX = 102;
    const thumbY = itemY + (cardH - 72) / 2;
    const thumbSize = 72;

    const imgElement = mealImages?.[meal.id || meal.name];
    if (imgElement) {
      drawCoverImage(ctx, imgElement, thumbX, thumbY, thumbSize, thumbSize, 14);
    } else {
      // bg-stone-100/60 border border-stone-200/20
      ctx.fillStyle = "rgba(245, 245, 244, 0.6)";
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 14);
      ctx.fill();

      ctx.strokeStyle = "rgba(214, 211, 209, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 14);
      ctx.stroke();

      const getMealEmoji = (typeStr: string) => {
        const t = typeStr?.toLowerCase() || "";
        if (t.includes("breakfast") || t.includes("morning")) return "🥞";
        if (t.includes("lunch") || t.includes("afternoon")) return "🥗";
        if (t.includes("dinner") || t.includes("night") || t.includes("evening")) return "🥩";
        if (t.includes("snack") || t.includes("bite") || t.includes("tea")) return "🍎";
        return "🍽️";
      };
      ctx.textAlign = "center";
      ctx.font = "32px Arial, sans-serif";
      ctx.fillText(getMealEmoji(meal.type || "meal"), thumbX + thumbSize / 2, thumbY + 48);
    }

    // Title: text-xs font-black text-stone-850 truncate
    ctx.textAlign = "left";
    ctx.fillStyle = "#1C1917"; // stone-850/900
    ctx.font = "900 22px Inter, system-ui, sans-serif";
    let mealLabel = meal.name || "Logged Meal";
    if (mealLabel.length > 30) mealLabel = mealLabel.substring(0, 27) + "...";
    ctx.fillText(mealLabel, thumbX + thumbSize + 20, thumbY + 28);

    // Macros micro line: P: Xg • C: Yg • F: Zg • Fiber: Wg
    // text-[8px] font-extrabold text-stone-500 uppercase tracking-wide
    ctx.fillStyle = "#78716C"; // stone-500
    ctx.font = "800 16px Inter, system-ui, sans-serif";
    const macroLine = `P: ${meal.protein || 0}g  •  C: ${meal.carbs || 0}g  •  F: ${meal.fats || 0}g  •  Fiber: ${meal.fiber || 0}g`;
    ctx.fillText(macroLine, thumbX + thumbSize + 20, thumbY + 58);

    // Calories: text-sm font-black text-orange-600 → +Xkcal on right
    ctx.textAlign = "right";
    ctx.fillStyle = "#EA580C"; // orange-600
    ctx.font = "900 22px Inter, system-ui, sans-serif";
    ctx.fillText(`+${meal.calories || 0} kcal`, 970, itemY + cardH / 2 + 7);
    ctx.textAlign = "left";
  });

  // "More meals" indicator
  if (mealsList.length > topMeals.length) {
    const moreY = mealsStartY + topMeals.length * (cardH + cardGap) + 5;
    ctx.fillStyle = "#A8A29E"; // stone-400
    ctx.font = "700 18px Inter, system-ui, sans-serif";
    ctx.fillText(`+ ${mealsList.length - topMeals.length} more meals logged`, 100, moreY + 14);
  }

  // =================================================================
  // FOOTER — Clean branding
  // =================================================================
  const footerY = H - 100;

  // Subtle divider line
  ctx.strokeStyle = "rgba(42, 24, 16, 0.06)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(80, footerY);
  ctx.lineTo(1000, footerY);
  ctx.stroke();

  ctx.fillStyle = "#A8A29E"; // stone-400
  ctx.font = "700 20px Inter, system-ui, sans-serif";
  ctx.fillText("FITAI • DAILY REPORT", 80, footerY + 42);
  ctx.textAlign = "right";
  ctx.fillText("fitpush.vercel.app", 1000, footerY + 42);
  ctx.textAlign = "left";
}
