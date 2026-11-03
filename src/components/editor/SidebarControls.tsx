/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Square, 
  Image as ImageIcon, 
  Paintbrush, 
  Sun, 
  Layers, 
  Tag, 
  SlidersHorizontal, 
  RotateCcw,
  FolderOpen
} from 'lucide-react';
import { BackgroundStyle, IconConfig, IconShape, LightingMode, ShadowMode } from '../../types/icon';
import { ICON_PRESETS, PresetItem } from '../../presets/iconPresets';
import { VECTOR_GLYPHS } from '../../utils/glyphPaths';

interface SidebarControlsProps {
  config: IconConfig;
  onChange: (newConfig: IconConfig) => void;
  onApplyPreset: (preset: PresetItem) => void;
  onOpenUpload: () => void;
  hasCustomImage: boolean;
  onClearCustomImage: () => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  config,
  onChange,
  onApplyPreset,
  onOpenUpload,
  hasCustomImage,
  onClearCustomImage,
}) => {
  const [activeTab, setActiveTab] = useState<
    'presets' | 'shape' | 'glyph' | 'surface' | 'lighting' | 'shadow' | 'badge' | 'adjust'
  >('presets');

  const updateConfig = (updates: Partial<IconConfig>) => {
    onChange({ ...config, ...updates });
  };

  const tabs = [
    { id: 'presets', label: 'Presets' },
    { id: 'shape', label: 'Shape' },
    { id: 'glyph', label: 'Emblem' },
    { id: 'surface', label: 'Material' },
    { id: 'lighting', label: 'Optics' },
    { id: 'shadow', label: 'Shadow' },
    { id: 'badge', label: 'Badge' },
    { id: 'adjust', label: 'Grade' },
  ] as const;

  return (
    <aside className="w-80 bg-[#18181b] border-r border-white/[0.07] flex flex-col h-full text-neutral-200 select-none shrink-0">
      {/* Segmented Inspector Header */}
      <div className="grid grid-cols-4 gap-0.5 p-1.5 bg-[#121214] border-b border-white/[0.07]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-1 px-1.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap text-center ${
                isActive
                  ? 'bg-[#2c2c31] text-white font-semibold shadow-2xs'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* PRESETS TAB */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-200">System HIG Profiles</h3>
              <span className="text-[11px] text-neutral-500 font-mono">8 Profiles</span>
            </div>

            <div className="divide-y divide-white/[0.06] border border-white/[0.07] rounded-lg overflow-hidden bg-[#141416]">
              {ICON_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onApplyPreset(preset)}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/[0.05] transition-colors flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-100 group-hover:text-[#5eb0ff]">
                      <span>{preset.name}</span>
                      <span className="text-neutral-600">·</span>
                      <span className="text-[11px] font-mono text-neutral-400 font-normal">
                        {preset.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                      {preset.subtitle}
                    </p>
                  </div>

                  {/* Color Swatch Preview */}
                  <div
                    className="w-5 h-5 rounded border border-white/20 shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${preset.config.bgColor1 || '#1e2029'}, ${
                        preset.config.bgColor2 || '#13141a'
                      })`,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SHAPE & GEOMETRY TAB */}
        {activeTab === 'shape' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-200">Masking & Superellipse</h3>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'macos-squircle', label: 'macOS 27 Squircle', desc: 'n=4.50 G2' },
                { id: 'winui-rounded', label: 'WinUI 3 Rounded', desc: 'Fluent r=20%' },
                { id: 'ios-squircle', label: 'iOS Full Bleed', desc: '100% Canvas' },
                { id: 'circle', label: 'Circular', desc: 'n=2.00' },
                { id: 'hexagon', label: 'Hexagon', desc: '6-Side Polygon' },
                { id: 'none', label: 'Unmasked', desc: 'Full Raw Bounds' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => updateConfig({ shape: s.id as IconShape })}
                  className={`p-2 rounded text-left border transition-colors ${
                    config.shape === s.id
                      ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-white'
                      : 'bg-[#141416] hover:bg-white/[0.04] border-white/[0.07] text-neutral-300'
                  }`}
                >
                  <div className="text-xs font-medium">{s.label}</div>
                  <div className="text-[10px] font-mono text-neutral-400 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Tile Safe Scale</span>
                  <span className="font-mono text-neutral-400 tabular-nums">
                    {(config.tileScale * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.60"
                  max="1.0"
                  step="0.005"
                  value={config.tileScale}
                  onChange={(e) => updateConfig({ tileScale: Number(e.target.value) })}
                  className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                  <button
                    onClick={() => updateConfig({ tileScale: 0.805 })}
                    className="hover:text-[#5eb0ff]"
                  >
                    Set macOS 80.5% (824px)
                  </button>
                  <button
                    onClick={() => updateConfig({ tileScale: 1.0 })}
                    className="hover:text-[#5eb0ff]"
                  >
                    Set iOS 100%
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Lamé Exponent (n)</span>
                  <span className="font-mono text-neutral-400 tabular-nums">
                    {config.superellipsePower.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="6.0"
                  step="0.05"
                  value={config.superellipsePower}
                  onChange={(e) => updateConfig({ superellipsePower: Number(e.target.value) })}
                  className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* GLYPH & EMBLEM TAB */}
        {activeTab === 'glyph' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-200">Foreground Emblem</h3>

            <div className="p-2.5 rounded bg-[#141416] border border-white/[0.07] flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs font-medium text-neutral-200">
                  {hasCustomImage ? 'Imported Raster/Vector Active' : 'Custom Image / Icon'}
                </div>
                <div className="text-[10px] text-neutral-400">
                  PNG · ICO · ICNS · SVG
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {hasCustomImage && (
                  <button
                    onClick={onClearCustomImage}
                    className="px-2 py-1 text-[11px] rounded bg-white/[0.06] text-neutral-300 hover:text-white transition-colors"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={onOpenUpload}
                  className="px-2.5 py-1 text-[11px] rounded bg-[#0a84ff] hover:bg-[#1f8fff] text-white font-medium transition-colors"
                >
                  {hasCustomImage ? 'Replace' : 'Import'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-400">Vector Symbol Library</label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.keys(VECTOR_GLYPHS).map((key) => {
                  const isSelected = config.glyphType === 'preset' && config.glyphValue === key;
                  return (
                    <button
                      key={key}
                      onClick={() => updateConfig({ glyphType: 'preset', glyphValue: key })}
                      className={`py-1.5 px-2 rounded border text-left transition-colors ${
                        isSelected
                          ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-white'
                          : 'bg-[#141416] hover:bg-white/[0.04] border-white/[0.07] text-neutral-300'
                      }`}
                    >
                      <div className="text-[11px] font-mono truncate">{key}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Symbol Scale</span>
                  <span className="font-mono text-neutral-400 tabular-nums">
                    {Math.round(config.glyphScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="1.10"
                  step="0.02"
                  value={config.glyphScale}
                  onChange={(e) => updateConfig({ glyphScale: Number(e.target.value) })}
                  className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">Offset X</span>
                    <span className="font-mono text-neutral-400 tabular-nums">{config.glyphOffsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={config.glyphOffsetX}
                    onChange={(e) => updateConfig({ glyphOffsetX: Number(e.target.value) })}
                    className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">Offset Y</span>
                    <span className="font-mono text-neutral-400 tabular-nums">{config.glyphOffsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={config.glyphOffsetY}
                    onChange={(e) => updateConfig({ glyphOffsetY: Number(e.target.value) })}
                    className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-neutral-300">Emblem Tint</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.glyphColor}
                    onChange={(e) => updateConfig({ glyphColor: e.target.value })}
                    className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-neutral-400 text-[11px]">{config.glyphColor}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">Optical Drop Shadow</span>
                <input
                  type="checkbox"
                  checked={config.glyphShadow}
                  onChange={(e) => updateConfig({ glyphShadow: e.target.checked })}
                  className="accent-[#0a84ff] w-3.5 h-3.5 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">Chiseled Inner Emboss</span>
                <input
                  type="checkbox"
                  checked={config.glyphEmboss}
                  onChange={(e) => updateConfig({ glyphEmboss: e.target.checked })}
                  className="accent-[#0a84ff] w-3.5 h-3.5 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* MATERIAL & SURFACE TAB */}
        {activeTab === 'surface' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-200">Backplate Material</h3>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'linear-gradient', label: 'Linear Gradient' },
                { id: 'radial-gradient', label: 'Radial Falloff' },
                { id: 'mesh-aurora', label: 'Multi-Orb Mesh' },
                { id: 'acrylic-glass', label: 'Acrylic Frosted' },
                { id: 'dark-obsidian', label: 'Anodized Slate' },
                { id: 'titanium-metallic', label: 'Brushed Titanium' },
                { id: 'solid', label: 'Flat Solid' },
                { id: 'transparent', label: 'Alpha Clear' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => updateConfig({ bgStyle: style.id as BackgroundStyle })}
                  className={`p-2 rounded text-left text-xs border transition-colors ${
                    config.bgStyle === style.id
                      ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-white font-medium'
                      : 'bg-[#141416] hover:bg-white/[0.04] border-white/[0.07] text-neutral-300'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>

            {config.bgStyle !== 'transparent' && (
              <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Primary Stop</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.bgColor1}
                      onChange={(e) => updateConfig({ bgColor1: e.target.value })}
                      className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-neutral-400">{config.bgColor1}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Midtone Stop</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.bgColor2}
                      onChange={(e) => updateConfig({ bgColor2: e.target.value })}
                      className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-neutral-400">{config.bgColor2}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Deep Stop</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.bgColor3}
                      onChange={(e) => updateConfig({ bgColor3: e.target.value })}
                      className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-neutral-400">{config.bgColor3}</span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">Gradient Angle</span>
                    <span className="font-mono text-neutral-400 tabular-nums">{config.bgGradientAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={config.bgGradientAngle}
                    onChange={(e) => updateConfig({ bgGradientAngle: Number(e.target.value) })}
                    className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-neutral-300">Micro-Grain Texture</span>
                  <input
                    type="checkbox"
                    checked={config.bgNoise}
                    onChange={(e) => updateConfig({ bgNoise: e.target.checked })}
                    className="accent-[#0a84ff] w-3.5 h-3.5 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* OPTICS & LIGHTING TAB */}
        {activeTab === 'lighting' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-200">Specular Rim & Bevel</h3>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'macos-specular', label: 'macOS Top Rim' },
                { id: 'glass-reflex', label: 'Optical Reflex' },
                { id: 'chamfer-edge', label: 'Metal Chamfer' },
                { id: 'none', label: 'Disabled' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => updateConfig({ lighting: m.id as LightingMode })}
                  className={`p-2 rounded text-left text-xs border transition-colors ${
                    config.lighting === m.id
                      ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-white font-medium'
                      : 'bg-[#141416] hover:bg-white/[0.04] border-white/[0.07] text-neutral-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Rim Specular Gain</span>
                  <span className="font-mono text-neutral-400 tabular-nums">
                    {Math.round(config.rimLightOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={config.rimLightOpacity}
                  onChange={(e) => updateConfig({ rimLightOpacity: Number(e.target.value) })}
                  className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Bevel Width</span>
                  <span className="font-mono text-neutral-400 tabular-nums">{config.bevelThickness}px</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={config.bevelThickness}
                  onChange={(e) => updateConfig({ bevelThickness: Number(e.target.value) })}
                  className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Surface Refraction</span>
                  <span className="font-mono text-neutral-400 tabular-nums">
                    {Math.round(config.reflexOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={config.reflexOpacity}
                  onChange={(e) => updateConfig({ reflexOpacity: Number(e.target.value) })}
                  className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* SHADOW & ELEVATION TAB */}
        {activeTab === 'shadow' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-200">Ambient & Key Shadow</h3>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'macos-dual', label: 'macOS Dual Pass', desc: 'AO + Key' },
                { id: 'winui-diffuse', label: 'WinUI Ambient', desc: 'Soft Spread' },
                { id: 'elevated-3d', label: 'Deep Studio', desc: 'High Offset' },
                { id: 'none', label: 'No Shadow', desc: 'Zero Bleed' },
              ].map((sh) => (
                <button
                  key={sh.id}
                  onClick={() => updateConfig({ shadow: sh.id as ShadowMode })}
                  className={`p-2 rounded text-left border transition-colors ${
                    config.shadow === sh.id
                      ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-white font-medium'
                      : 'bg-[#141416] hover:bg-white/[0.04] border-white/[0.07] text-neutral-300'
                  }`}
                >
                  <div className="text-xs font-medium">{sh.label}</div>
                  <div className="text-[10px] font-mono text-neutral-400">{sh.desc}</div>
                </button>
              ))}
            </div>

            {config.shadow !== 'none' && (
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">Blur Radius</span>
                    <span className="font-mono text-neutral-400 tabular-nums">{config.shadowBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="60"
                    value={config.shadowBlur}
                    onChange={(e) => updateConfig({ shadowBlur: Number(e.target.value) })}
                    className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">Vertical Offset</span>
                    <span className="font-mono text-neutral-400 tabular-nums">{config.shadowOffsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="40"
                    value={config.shadowOffsetY}
                    onChange={(e) => updateConfig({ shadowOffsetY: Number(e.target.value) })}
                    className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">Density</span>
                    <span className="font-mono text-neutral-400 tabular-nums">
                      {Math.round(config.shadowOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.80"
                    step="0.05"
                    value={config.shadowOpacity}
                    onChange={(e) => updateConfig({ shadowOpacity: Number(e.target.value) })}
                    className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* BADGES TAB */}
        {activeTab === 'badge' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-200">Release Channel Overlay</h3>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'none', label: 'None' },
                { id: 'pro', label: 'PRO Tag' },
                { id: 'beta', label: 'BETA Tag' },
                { id: 'dev', label: 'DEV Tag' },
                { id: 'dot', label: 'Corner Indicator' },
                { id: 'custom', label: 'Custom String' },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => updateConfig({ badge: b.id as any })}
                  className={`p-2 rounded text-left text-xs border transition-colors ${
                    config.badge === b.id
                      ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-white font-medium'
                      : 'bg-[#141416] hover:bg-white/[0.04] border-white/[0.07] text-neutral-300'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {config.badge === 'custom' && (
              <div className="space-y-1">
                <label className="text-xs text-neutral-300">Badge String</label>
                <input
                  type="text"
                  value={config.badgeText}
                  maxLength={8}
                  onChange={(e) => updateConfig({ badgeText: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded bg-[#121214] border border-white/10 text-xs text-white font-mono"
                />
              </div>
            )}

            {config.badge !== 'none' && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-neutral-300">Badge Accent</span>
                <input
                  type="color"
                  value={config.badgeColor}
                  onChange={(e) => updateConfig({ badgeColor: e.target.value })}
                  className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* COLOR GRADING TAB */}
        {activeTab === 'adjust' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-200">Post-Process Color Grade</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Exposure / Brightness</span>
                  <span className="font-mono text-neutral-400 tabular-nums">
                    {Math.round(config.brightness * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={config.brightness}
                  onChange={(e) => updateConfig({ brightness: Number(e.target.value) })}
                  className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Contrast</span>
                  <span className="font-mono text-neutral-400 tabular-nums">
                    {Math.round(config.contrast * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={config.contrast}
                  onChange={(e) => updateConfig({ contrast: Number(e.target.value) })}
                  className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Saturation</span>
                  <span className="font-mono text-neutral-400 tabular-nums">
                    {Math.round(config.saturation * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.05"
                  value={config.saturation}
                  onChange={(e) => updateConfig({ saturation: Number(e.target.value) })}
                  className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Hue Rotation</span>
                  <span className="font-mono text-neutral-400 tabular-nums">{config.hueRotate}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={config.hueRotate}
                  onChange={(e) => updateConfig({ hueRotate: Number(e.target.value) })}
                  className="w-full accent-[#0a84ff] h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <button
                onClick={() => updateConfig({ brightness: 1, contrast: 1, saturation: 1, hueRotate: 0 })}
                className="w-full py-1.5 text-xs text-neutral-300 hover:text-white rounded bg-[#141416] hover:bg-white/[0.06] border border-white/[0.07] transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={11} />
                <span>Reset Grade</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
