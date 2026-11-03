/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IconShape = 
  | 'macos-squircle'   // macOS 27 / Sequoia continuous superellipse
  | 'winui-rounded'    // WinUI 3 Fluent smooth rounded rectangle
  | 'circle'           // Android Material You / Circular
  | 'ios-squircle'     // Full bleed iOS superellipse
  | 'hexagon'          // Modern tech hexagon
  | 'shield'           // Security / Developer shield
  | 'none';            // Unmasked transparent original

export type BackgroundStyle = 
  | 'linear-gradient'
  | 'radial-gradient'
  | 'acrylic-glass'
  | 'matte-ceramic'
  | 'dark-obsidian'
  | 'titanium-metallic'
  | 'mesh-aurora'
  | 'carbon-fiber'
  | 'solid'
  | 'transparent';

export type ShadowMode = 
  | 'macos-dual'       // Accurate macOS dual ambient + key shadow
  | 'winui-diffuse'    // Windows 11 Fluent ambient shadow
  | 'elevated-3d'      // Deep 3D drop shadow
  | 'flat'             // Flat minimal shadow
  | 'none';

export type LightingMode = 
  | 'macos-specular'   // Top 1px specular rim light + soft ambient bevel
  | 'glass-reflex'     // Diagonal optical glass shine
  | 'chamfer-edge'     // 3D chamfered edge bevel
  | 'subtle'           // Minimal rim
  | 'none';

export type BadgeType = 
  | 'none'
  | 'beta'
  | 'dev'
  | 'pro'
  | 'dot'
  | 'windows'
  | 'apple'
  | 'linux'
  | 'custom';

export interface IconConfig {
  name: string;
  shape: IconShape;
  
  // Glyph / Emblem settings
  glyphType: 'preset' | 'custom-image' | 'svg' | 'text';
  glyphValue: string;          // Icon name (lucide), image URL / base64, SVG markup, or text glyph
  glyphScale: number;          // 40% to 120% (default: 62%)
  glyphOffsetX: number;        // -50 to +50 px
  glyphOffsetY: number;        // -50 to +50 px
  glyphRotation: number;       // -180 to +180 deg
  glyphColor: string;          // Color if vector/preset
  glyphShadow: boolean;
  glyphShadowBlur: number;
  glyphShadowOpacity: number;
  glyphEmboss: boolean;

  // Background / Backplate
  bgStyle: BackgroundStyle;
  bgColor1: string;
  bgColor2: string;
  bgColor3: string;
  bgGradientAngle: number;     // 0 to 360 deg
  bgNoise: boolean;
  bgNoiseOpacity: number;
  acrylicBlur: number;

  // Sizing & Apple / WinUI Canvas Bounds
  tileScale: number;           // 60% to 100% (Apple macOS default is 80.5% to allow shadow)
  cornerRadius: number;        // 0 to 50% (or superellipse power)
  superellipsePower: number;   // 4.5 for macOS, 3.2 for WinUI, 2.0 for standard circle

  // Lighting & Bevel
  lighting: LightingMode;
  rimLightOpacity: number;     // 0 to 1.0 (default 0.38)
  bevelThickness: number;      // 1 to 8 px
  reflexOpacity: number;       // 0 to 1.0
  innerShadowOpacity?: number; // 0 to 1.0 for deep inset depth

  // Shadow Engine
  shadow: ShadowMode;
  shadowBlur: number;
  shadowOffsetY: number;
  shadowOpacity: number;
  shadowColor: string;

  // Badges & Ribbons
  badge: BadgeType;
  badgeText: string;
  badgeColor: string;
  badgeTextColor: string;
  badgePosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

  // Adjustments
  brightness: number;          // 0.5 to 1.5 (default 1.0)
  contrast: number;            // 0.5 to 1.5 (default 1.0)
  saturation: number;          // 0 to 2.0 (default 1.0)
  hueRotate: number;           // 0 to 360 deg
}

export interface MipmapResolution {
  size: number;
  label: string;
  density?: string;
  platform: 'windows' | 'macos' | 'web' | 'android' | 'all';
  category: string;
}

export const STANDARD_MIPMAPS: MipmapResolution[] = [
  { size: 16, label: '16×16', density: '1x', platform: 'windows', category: 'Taskbar / Details / Favicon' },
  { size: 24, label: '24×24', density: '1.5x', platform: 'windows', category: 'Small Taskbar / Toolbars' },
  { size: 32, label: '32×32', density: '1x', platform: 'windows', category: 'File Explorer / Browser Tab' },
  { size: 48, label: '48×48', density: '1x', platform: 'windows', category: 'Desktop Medium Icons' },
  { size: 64, label: '64×64', density: '2x', platform: 'windows', category: 'Taskbar 200% / App Tiles' },
  { size: 128, label: '128×128', density: '1x', platform: 'all', category: 'Large Icons / Start Tiles' },
  { size: 256, label: '256×256', density: '1x', platform: 'all', category: 'Windows Vista-11 Jumbo / Store' },
  { size: 512, label: '512×512', density: '1x', platform: 'macos', category: 'macOS Standard App Store' },
  { size: 1024, label: '1024×1024', density: '2x', platform: 'macos', category: 'macOS Retina Master / App Store' },
];

export interface ExeMetadata {
  fileName: string;
  appName: string;
  companyName: string;
  version: string;
  description: string;
  windowTitle: string;
}
