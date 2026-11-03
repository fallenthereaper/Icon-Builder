/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IconConfig } from '../types/icon';
import { VECTOR_GLYPHS } from './glyphPaths';
import {
  drawHexagonPath,
  drawShieldPath,
  drawSquirclePath,
  drawWinUIRoundedRect,
  RectBounds,
} from './squircle';

/**
 * Calculates tile bounds within the target canvas dimensions.
 * macOS standard icon guidelines use ~80.5% scale to leave space for ambient shadows.
 */
export function calculateTileBounds(size: number, tileScale: number): RectBounds {
  const scaledSize = size * tileScale;
  const offset = (size - scaledSize) / 2;
  return {
    x: Math.round(offset),
    y: Math.round(offset),
    width: Math.round(scaledSize),
    height: Math.round(scaledSize),
  };
}

/**
 * Clips the canvas to the selected icon shape geometry.
 */
export function applyShapePath(
  ctx: CanvasRenderingContext2D,
  bounds: RectBounds,
  config: IconConfig
): void {
  switch (config.shape) {
    case 'macos-squircle':
      drawSquirclePath(ctx, bounds, config.superellipsePower || 4.5, 96);
      break;
    case 'winui-rounded':
      drawWinUIRoundedRect(ctx, bounds, config.cornerRadius || 0.20);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.width / 2,
        0,
        Math.PI * 2
      );
      ctx.closePath();
      break;
    case 'ios-squircle':
      drawSquirclePath(ctx, bounds, 4.3, 80);
      break;
    case 'hexagon':
      drawHexagonPath(ctx, bounds);
      break;
    case 'shield':
      drawShieldPath(ctx, bounds);
      break;
    case 'none':
    default:
      ctx.beginPath();
      ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.closePath();
      break;
  }
}

/**
 * Main render function that draws the entire icon onto a canvas context.
 */
export function renderIconToContext(
  ctx: CanvasRenderingContext2D,
  config: IconConfig,
  targetSize: number,
  customImage?: HTMLImageElement | null,
  options: { includeDropShadow?: boolean } = { includeDropShadow: true }
): void {
  const size = targetSize;
  const tileBounds = calculateTileBounds(size, config.tileScale);

  ctx.save();
  ctx.clearRect(0, 0, size, size);

  // Apply global image filters (brightness, contrast, saturation, hue)
  const filters: string[] = [];
  if (config.brightness !== 1) filters.push(`brightness(${config.brightness})`);
  if (config.contrast !== 1) filters.push(`contrast(${config.contrast})`);
  if (config.saturation !== 1) filters.push(`saturate(${config.saturation})`);
  if (config.hueRotate !== 0) filters.push(`hue-rotate(${config.hueRotate}deg)`);
  if (filters.length > 0) {
    ctx.filter = filters.join(' ');
  }

  // 1. SHADOW LAYER (Drawn outside the clipped shape)
  if (options.includeDropShadow && config.shadow !== 'none' && config.tileScale < 0.98) {
    ctx.save();
    const scaleFactor = size / 512;

    if (config.shadow === 'macos-dual') {
      // macOS Layer 1: Ambient Occlusion
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${config.shadowOpacity * 0.45})`;
      ctx.shadowBlur = Math.max(2, config.shadowBlur * 0.5 * scaleFactor);
      ctx.shadowOffsetY = Math.max(1, (config.shadowOffsetY * 0.3) * scaleFactor);
      ctx.fillStyle = '#000000';
      applyShapePath(ctx, tileBounds, config);
      ctx.fill();
      ctx.restore();

      // macOS Layer 2: Directional Key Shadow
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${config.shadowOpacity * 0.75})`;
      ctx.shadowBlur = Math.max(4, config.shadowBlur * scaleFactor);
      ctx.shadowOffsetY = Math.max(2, config.shadowOffsetY * scaleFactor);
      ctx.fillStyle = '#000000';
      applyShapePath(ctx, tileBounds, config);
      ctx.fill();
      ctx.restore();
    } else if (config.shadow === 'winui-diffuse') {
      // Windows 11 Fluent soft diffused shadow
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${config.shadowOpacity * 0.5})`;
      ctx.shadowBlur = Math.max(3, (config.shadowBlur * 0.8) * scaleFactor);
      ctx.shadowOffsetY = Math.max(2, (config.shadowOffsetY * 0.6) * scaleFactor);
      ctx.fillStyle = '#000000';
      applyShapePath(ctx, tileBounds, config);
      ctx.fill();
      ctx.restore();
    } else if (config.shadow === 'elevated-3d') {
      // Deep 3D Shadow
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${config.shadowOpacity})`;
      ctx.shadowBlur = Math.max(4, config.shadowBlur * 1.2 * scaleFactor);
      ctx.shadowOffsetY = Math.max(3, config.shadowOffsetY * 1.3 * scaleFactor);
      ctx.fillStyle = '#000000';
      applyShapePath(ctx, tileBounds, config);
      ctx.fill();
      ctx.restore();
    } else if (config.shadow === 'flat') {
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${config.shadowOpacity})`;
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 3 * scaleFactor;
      ctx.shadowOffsetY = 3 * scaleFactor;
      ctx.fillStyle = '#000000';
      applyShapePath(ctx, tileBounds, config);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 2. CLIPPED TILE BACKPLATE
  ctx.save();
  applyShapePath(ctx, tileBounds, config);
  ctx.clip();

  // Render Background
  renderBackground(ctx, tileBounds, config);

  // Lighting: Glass Reflex Shine
  if (config.lighting === 'glass-reflex' || config.reflexOpacity > 0.05) {
    renderGlassReflex(ctx, tileBounds, config.reflexOpacity);
  }

  // Render Glyph / Emblem
  renderGlyph(ctx, tileBounds, config, customImage);

  // Lighting: Top Specular Rim & Bevel Highlights
  if (config.lighting === 'macos-specular' || config.rimLightOpacity > 0.05) {
    renderMacOSRimLight(ctx, tileBounds, config);
  } else if (config.lighting === 'chamfer-edge') {
    renderChamferEdge(ctx, tileBounds, config);
  }

  ctx.restore(); // restore shape clipping

  // 3. BADGES & OVERLAYS (Rendered on top, outside clipping if requested)
  if (config.badge !== 'none') {
    renderBadge(ctx, tileBounds, config);
  }

  ctx.restore(); // restore global filters and canvas state
}

/**
 * Background surface generator.
 */
function renderBackground(ctx: CanvasRenderingContext2D, bounds: RectBounds, config: IconConfig): void {
  const { x, y, width: w, height: h } = bounds;

  if (config.bgStyle === 'transparent') {
    return;
  }

  if (config.bgStyle === 'solid') {
    ctx.fillStyle = config.bgColor1;
    ctx.fillRect(x, y, w, h);
    return;
  }

  if (config.bgStyle === 'linear-gradient' || config.bgStyle === 'dark-obsidian' || config.bgStyle === 'titanium-metallic') {
    const rad = (config.bgGradientAngle * Math.PI) / 180;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const len = Math.max(w, h);
    const x0 = cx - (Math.cos(rad) * len) / 2;
    const y0 = cy - (Math.sin(rad) * len) / 2;
    const x1 = cx + (Math.cos(rad) * len) / 2;
    const y1 = cy + (Math.sin(rad) * len) / 2;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, config.bgColor1);
    grad.addColorStop(0.5, config.bgColor2);
    grad.addColorStop(1, config.bgColor3);

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Subtle metallic satin streaks
    if (config.bgStyle === 'titanium-metallic') {
      const metalGrad = ctx.createLinearGradient(x, y, x + w, y + h);
      metalGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
      metalGrad.addColorStop(0.3, 'rgba(255,255,255,0.0)');
      metalGrad.addColorStop(0.6, 'rgba(255,255,255,0.08)');
      metalGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = metalGrad;
      ctx.fillRect(x, y, w, h);
    }
  } else if (config.bgStyle === 'radial-gradient') {
    const cx = x + w * 0.45;
    const cy = y + h * 0.4;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.75);
    grad.addColorStop(0, config.bgColor1);
    grad.addColorStop(0.6, config.bgColor2);
    grad.addColorStop(1, config.bgColor3);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  } else if (config.bgStyle === 'mesh-aurora') {
    // Multi-orb soft aurora blend
    ctx.fillStyle = config.bgColor1;
    ctx.fillRect(x, y, w, h);

    const grad1 = ctx.createRadialGradient(x + w * 0.8, y + h * 0.2, 0, x + w * 0.8, y + h * 0.2, w * 0.65);
    grad1.addColorStop(0, config.bgColor2);
    grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1;
    ctx.fillRect(x, y, w, h);

    const grad2 = ctx.createRadialGradient(x + w * 0.2, y + h * 0.8, 0, x + w * 0.2, y + h * 0.8, w * 0.7);
    grad2.addColorStop(0, config.bgColor3);
    grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2;
    ctx.fillRect(x, y, w, h);
  } else if (config.bgStyle === 'acrylic-glass') {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.fillStyle = config.bgColor1;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }

  // Micro Noise Texture simulation
  if (config.bgNoise && config.bgNoiseOpacity > 0.01) {
    drawSubtleNoise(ctx, bounds, config.bgNoiseOpacity);
  }
}

/**
 * Fast procedural noise pattern for subtle matte/acrylic texture.
 */
function drawSubtleNoise(ctx: CanvasRenderingContext2D, bounds: RectBounds, opacity: number): void {
  const { x, y, width: w, height: h } = bounds;
  const step = Math.max(2, Math.round(w / 64));
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (let px = x; px < x + w; px += step * 2) {
    for (let py = y; py < y + h; py += step * 2) {
      if ((px * 13 + py * 7) % 5 === 0) {
        ctx.globalAlpha = opacity * 0.8;
        ctx.fillRect(px, py, step, step);
      }
    }
  }
  ctx.restore();
}

/**
 * Apple macOS Top 1px Specular Rim Light.
 * Creates an exact optical chamfer highlight along the top perimeter.
 */
function renderMacOSRimLight(ctx: CanvasRenderingContext2D, bounds: RectBounds, config: IconConfig): void {
  const { x, y, width: w, height: h } = bounds;
  ctx.save();

  // Top highlight stroke
  const rimGrad = ctx.createLinearGradient(x, y, x, y + h);
  rimGrad.addColorStop(0, `rgba(255, 255, 255, ${config.rimLightOpacity * 1.1})`);
  rimGrad.addColorStop(0.35, `rgba(255, 255, 255, ${config.rimLightOpacity * 0.3})`);
  rimGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.02)');
  rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');

  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = Math.max(1, (config.bevelThickness || 1.5) * (w / 512));
  applyShapePath(ctx, bounds, config);
  ctx.stroke();

  // Subtle inner top specular glow
  const topGlow = ctx.createLinearGradient(x, y, x, y + h * 0.3);
  topGlow.addColorStop(0, `rgba(255, 255, 255, ${config.rimLightOpacity * 0.2})`);
  topGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = topGlow;
  applyShapePath(ctx, bounds, config);
  ctx.fill();

  ctx.restore();
}

function renderChamferEdge(ctx: CanvasRenderingContext2D, bounds: RectBounds, config: IconConfig): void {
  const { x, y, width: w, height: h } = bounds;
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, `rgba(255, 255, 255, ${config.rimLightOpacity})`);
  grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.1)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');

  ctx.strokeStyle = grad;
  ctx.lineWidth = Math.max(1, (config.bevelThickness || 2) * (w / 512));
  applyShapePath(ctx, bounds, config);
  ctx.stroke();
  ctx.restore();
}

/**
 * Optical diagonal glass reflex slice.
 */
function renderGlassReflex(ctx: CanvasRenderingContext2D, bounds: RectBounds, opacity: number): void {
  const { x, y, width: w, height: h } = bounds;
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x + w * 0.7, y + h * 0.7);
  grad.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.8})`);
  grad.addColorStop(0.4, `rgba(255, 255, 255, ${opacity * 0.25})`);
  grad.addColorStop(0.41, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

/**
 * Renders the central glyph or imported custom icon/image.
 */
function renderGlyph(
  ctx: CanvasRenderingContext2D,
  bounds: RectBounds,
  config: IconConfig,
  customImage?: HTMLImageElement | null
): void {
  const { x, y, width: w, height: h } = bounds;
  const cx = x + w / 2 + (config.glyphOffsetX * w) / 512;
  const cy = y + h / 2 + (config.glyphOffsetY * h) / 512;
  const glyphSize = Math.round(Math.min(w, h) * config.glyphScale);

  ctx.save();
  ctx.translate(cx, cy);
  if (config.glyphRotation !== 0) {
    ctx.rotate((config.glyphRotation * Math.PI) / 180);
  }

  // 1. Custom Image / Uploaded Icon
  if (config.glyphType === 'custom-image' && customImage && customImage.complete && customImage.naturalWidth > 0) {
    const half = glyphSize / 2;

    if (config.glyphShadow) {
      ctx.shadowColor = `rgba(0, 0, 0, ${config.glyphShadowOpacity})`;
      ctx.shadowBlur = Math.max(1, (config.glyphShadowBlur * w) / 512);
      ctx.shadowOffsetY = Math.max(1, (6 * h) / 512);
    }

    ctx.drawImage(customImage, -half, -half, glyphSize, glyphSize);
    ctx.restore();
    return;
  }

  // 2. Vector Glyph
  const glyphDef = VECTOR_GLYPHS[config.glyphValue] || VECTOR_GLYPHS.Layers;
  const scale = glyphSize / 24;

  ctx.translate(-glyphSize / 2, -glyphSize / 2);
  ctx.scale(scale, scale);

  // Glyph Emboss / Lower Highlight (tactile Apple depth)
  if (config.glyphEmboss) {
    ctx.save();
    ctx.translate(0, 0.6);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const p of glyphDef.paths) {
      const path2d = new Path2D(p);
      ctx.stroke(path2d);
    }
    ctx.restore();
  }

  // Glyph Drop Shadow
  if (config.glyphShadow) {
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${config.glyphShadowOpacity})`;
    ctx.shadowBlur = Math.max(1, (config.glyphShadowBlur * 24) / glyphSize);
    ctx.shadowOffsetY = 1.2;
    ctx.fillStyle = config.glyphColor;
    ctx.strokeStyle = config.glyphColor;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const p of glyphDef.paths) {
      const path2d = new Path2D(p);
      ctx.stroke(path2d);
    }
    ctx.restore();
  }

  // Main Glyph Stroke / Fill
  ctx.strokeStyle = config.glyphColor;
  ctx.fillStyle = config.glyphColor;
  ctx.lineWidth = 2.0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const p of glyphDef.paths) {
    const path2d = new Path2D(p);
    ctx.stroke(path2d);
  }

  ctx.restore();
}

/**
 * Renders badges (BETA, PRO, DEV, or status dot).
 */
function renderBadge(ctx: CanvasRenderingContext2D, bounds: RectBounds, config: IconConfig): void {
  const { x, y, width: w, height: h } = bounds;
  const scale = w / 512;

  if (config.badge === 'dot') {
    const dotRadius = Math.max(3, 16 * scale);
    const dotX = x + w - dotRadius * 1.5;
    const dotY = y + dotRadius * 1.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = config.badgeColor || '#22c55e';
    ctx.fill();
    ctx.lineWidth = Math.max(1, 3 * scale);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (config.badge === 'beta' || config.badge === 'dev' || config.badge === 'pro' || config.badge === 'custom') {
    const text = config.badge === 'custom' ? config.badgeText : config.badge.toUpperCase();
    const ribbonW = Math.max(30, 110 * scale);
    const ribbonH = Math.max(12, 34 * scale);

    ctx.save();
    // Position at top-right
    const bx = x + w - ribbonW - 12 * scale;
    const by = y + 16 * scale;

    ctx.fillStyle = config.badgeColor || '#3b82f6';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = Math.max(2, 8 * scale);
    ctx.shadowOffsetY = Math.max(1, 3 * scale);

    // Rounded pill badge
    const r = ribbonH / 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, ribbonW, ribbonH, r);
    ctx.fill();

    // Border
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();

    // Text
    ctx.fillStyle = config.badgeTextColor || '#ffffff';
    ctx.font = `bold ${Math.max(8, Math.round(14 * scale))}px "JetBrains Mono", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + ribbonW / 2, by + ribbonH / 2);

    ctx.restore();
  }
}

/**
 * Asynchronously renders an icon to a PNG Uint8Array buffer at any resolution.
 */
export async function renderIconToPngBuffer(
  config: IconConfig,
  targetSize: number,
  customImage?: HTMLImageElement | null
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  renderIconToContext(ctx, config, targetSize, customImage, { includeDropShadow: true });

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });

  if (!blob) {
    throw new Error(`Failed to encode PNG at ${targetSize}x${targetSize}`);
  }

  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
