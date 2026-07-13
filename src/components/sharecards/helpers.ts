export function formatDateLabel(isoDate: string): string {
  const dateObj = new Date(isoDate + "T00:00:00");
  const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${dayNames[dateObj.getDay()]}, ${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color: string,
  font: string,
  align: "left" | "center" = "left"
): number {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = align;
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  ctx.textAlign = "left";
  return currentY;
}

export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 16
): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();

  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sWidth: number, sHeight: number, sx: number, sy: number;

  if (imgRatio > boxRatio) {
    sHeight = img.height;
    sWidth = img.height * boxRatio;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = img.width;
    sHeight = img.width / boxRatio;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
  ctx.restore();
}

export function drawStructuredImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  isEditorial = false
): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  
  const scale = Math.max(w / img.width, h / img.height);
  const imgW = img.width * scale;
  const imgH = img.height * scale;
  const imgX = x + (w - imgW) / 2;
  const imgY = y + (h - imgH) / 2;
  
  ctx.drawImage(img, imgX, imgY, imgW, imgH);
  ctx.restore();

  ctx.strokeStyle = isEditorial ? "#1A1715" : "rgba(255,255,255,0.15)";
  ctx.lineWidth = isEditorial ? 3.5 : 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
}

export function drawBrandHeader(
  ctx: CanvasRenderingContext2D,
  handleStr: string,
  opts: {
    logoBoxColor: string;
    textColor: string;
    fontFamily: string;
    isEditorial?: boolean;
    badgeFont: string;
    badgeTextColor: string;
  }
): void {
  ctx.fillStyle = opts.logoBoxColor;
  ctx.beginPath();
  ctx.roundRect(80, 80, 72, 72, 20);
  ctx.fill();

  ctx.save();
  ctx.translate(96, 96);
  ctx.scale(1.7, 1.7);
  const flamePath = new Path2D(
    "M8.5 14.5a2.5 2.5 0 0 0 2.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
  );
  ctx.fillStyle = "#FFFFFF";
  ctx.fill(flamePath);
  ctx.restore();

  ctx.fillStyle = opts.textColor;
  ctx.font = opts.isEditorial
    ? `italic 700 54px ${opts.fontFamily}`
    : `900 54px ${opts.fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.fillText("FitAI", 172, 116);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = opts.badgeTextColor;
  ctx.font = opts.badgeFont;
  ctx.textAlign = "right";
  ctx.fillText(handleStr, 1000, 116);
  ctx.textAlign = "left";
}

export function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  let t = text;
  while (ctx.measureText(t).width > maxWidth && t.length > 3) {
    t = t.substring(0, t.length - 4) + "...";
  }
  return t;
}
