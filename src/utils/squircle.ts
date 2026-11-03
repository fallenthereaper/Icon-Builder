/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Superellipse / Apple Squircle mathematical curve calculations.
 * Apple macOS icons use continuous curvature (G2 continuous curve),
 * tightly approximated by a Lamé curve with exponent n between 4.3 and 5.0.
 */

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Generates an SVG path string or samples points for a continuous squircle.
 * @param bounds bounding rectangle
 * @param power superellipse exponent n (e.g. 4.5 for macOS, 3.2 for WinUI)
 * @param samples number of perimeter points to sample (default 64)
 */
export function getSuperellipsePoints(
  bounds: RectBounds,
  power = 4.5,
  samples = 64
): Array<{ x: number; y: number }> {
  const halfW = bounds.width / 2;
  const halfH = bounds.height / 2;
  const centerX = bounds.x + halfW;
  const centerY = bounds.y + halfH;
  const points: Array<{ x: number; y: number }> = [];

  const step = (Math.PI * 2) / samples;
  for (let i = 0; i < samples; i++) {
    const theta = i * step;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // |cos(t)|^(2/n) * sign(cos(t))
    const sCos = Math.sign(cosT);
    const sSin = Math.sign(sinT);

    const x = centerX + halfW * sCos * Math.pow(Math.abs(cosT), 2 / power);
    const y = centerY + halfH * sSin * Math.pow(Math.abs(sinT), 2 / power);

    points.push({ x, y });
  }

  return points;
}

/**
 * Draw a superellipse / squircle onto a CanvasRenderingContext2D.
 */
export function drawSquirclePath(
  ctx: CanvasRenderingContext2D,
  bounds: RectBounds,
  power = 4.5,
  samples = 80
): void {
  const points = getSuperellipsePoints(bounds, power, samples);
  if (points.length === 0) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

/**
 * Draw a smooth WinUI 3 rounded rectangle with smooth continuous corner radius.
 */
export function drawWinUIRoundedRect(
  ctx: CanvasRenderingContext2D,
  bounds: RectBounds,
  radiusRatio = 0.22
): void {
  const r = Math.min(bounds.width, bounds.height) * radiusRatio;
  const { x, y, width: w, height: h } = bounds;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw a polygon (Hexagon / Shield) on canvas.
 */
export function drawHexagonPath(ctx: CanvasRenderingContext2D, bounds: RectBounds): void {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const rx = bounds.width / 2;
  const ry = bounds.height / 2;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = cx + rx * Math.cos(angle);
    const py = cy + ry * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawShieldPath(ctx: CanvasRenderingContext2D, bounds: RectBounds): void {
  const { x, y, width: w, height: h } = bounds;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.15);
  ctx.quadraticCurveTo(x + w * 0.5, y, x + w, y + h * 0.15);
  ctx.lineTo(x + w, y + h * 0.55);
  ctx.bezierCurveTo(x + w, y + h * 0.85, x + w * 0.5, y + h, x + w * 0.5, y + h);
  ctx.bezierCurveTo(x + w * 0.5, y + h, x, y + h * 0.85, x, y + h * 0.55);
  ctx.closePath();
}
