/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Extracts dominant / harmonious color palette from an HTMLImageElement
 * so that importing any icon or image can automatically style the macOS / WinUI backplate.
 */
export interface ExtractedPalette {
  primary: string;
  secondary: string;
  accent: string;
  glyphTint: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function extractDominantPalette(img: HTMLImageElement): ExtractedPalette {
  const canvas = document.createElement('canvas');
  const sampleSize = 32;
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      primary: '#1e2029',
      secondary: '#13141a',
      accent: '#0b0c10',
      glyphTint: '#38bdf8',
    };
  }

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  let maxSat = -1;
  let vibrantR = 56;
  let vibrantG = 189;
  let vibrantB = 248;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 64) continue; // skip transparent pixels

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    rSum += r;
    gSum += g;
    bSum += b;
    count++;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat > maxSat && max > 40) {
      maxSat = sat;
      vibrantR = r;
      vibrantG = g;
      vibrantB = b;
    }
  }

  if (count === 0) {
    return {
      primary: '#1e2029',
      secondary: '#13141a',
      accent: '#0b0c10',
      glyphTint: '#38bdf8',
    };
  }

  const avgR = rSum / count;
  const avgG = gSum / count;
  const avgB = bSum / count;

  // Build rich dark-toned backplate and vibrant accent
  const primary = rgbToHex(avgR * 0.45, avgG * 0.45, avgB * 0.5);
  const secondary = rgbToHex(avgR * 0.25, avgG * 0.25, avgB * 0.3);
  const accent = rgbToHex(vibrantR * 0.65, vibrantG * 0.65, vibrantB * 0.7);
  const glyphTint = rgbToHex(
    Math.min(255, vibrantR + 40),
    Math.min(255, vibrantG + 40),
    Math.min(255, vibrantB + 40)
  );

  return { primary, secondary, accent, glyphTint };
}
