/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  SplitSquareVertical, 
  UploadCloud, 
  Pipette,
  Compass
} from 'lucide-react';
import { IconConfig } from '../../types/icon';
import { renderIconToContext } from '../../utils/canvasRenderer';

interface CanvasWorkspaceProps {
  config: IconConfig;
  customImage: HTMLImageElement | null;
  targetResolution: number;
  onSelectResolution: (res: number) => void;
  zoom: number;
  showPixelGrid: boolean;
  showAppleGrid: boolean;
  onToggleAppleGrid: () => void;
  onFileDrop: (file: File) => void;
  originalImageSrc: string | null;
  onApplyAutoPalette?: () => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  config,
  customImage,
  targetResolution,
  onSelectResolution,
  zoom,
  showPixelGrid,
  showAppleGrid,
  onToggleAppleGrid,
  onFileDrop,
  originalImageSrc,
  onApplyAutoPalette,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSliderPos, setCompareSliderPos] = useState(50);

  const resolutions = [1024, 512, 256, 128, 64, 48, 32, 16];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const internalDim = Math.max(targetResolution, 512);
    canvas.width = internalDim;
    canvas.height = internalDim;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    renderIconToContext(ctx, config, internalDim, customImage, { includeDropShadow: true });
  }, [config, targetResolution, customImage]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-[#141416] relative overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Sub-Toolbar: Mip Resolution Segmented Control & Inspector Tools */}
      <div className="h-8 bg-[#1b1b1e] border-b border-white/[0.07] px-3 flex items-center justify-between text-[11px] text-neutral-300 z-10 shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-neutral-500 mr-1.5 font-medium">Mip Target</span>
          <div className="flex items-center bg-[#121214] p-0.5 rounded border border-white/[0.06]">
            {resolutions.map((res) => (
              <button
                key={res}
                onClick={() => onSelectResolution(res)}
                className={`px-2 py-0.5 rounded-xs text-[11px] font-mono tabular-nums transition-colors ${
                  targetResolution === res
                    ? 'bg-[#2c2c31] text-white font-semibold shadow-2xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {res}px
              </button>
            ))}
          </div>
        </div>

        {/* Right Stage Controls */}
        <div className="flex items-center gap-2">
          {customImage && onApplyAutoPalette && (
            <button
              onClick={onApplyAutoPalette}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 border border-white/[0.08] transition-colors"
              title="Extract dominant color palette from imported icon and apply to backplate"
            >
              <Pipette size={11} className="text-[#0a84ff]" />
              <span>Match Palette</span>
            </button>
          )}

          {originalImageSrc && (
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                compareMode
                  ? 'bg-[#0a84ff]/25 text-[#5eb0ff] border border-[#0a84ff]/40'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05]'
              }`}
            >
              <SplitSquareVertical size={11} />
              <span>Split Compare</span>
            </button>
          )}
        </div>
      </div>

      {/* Central Stage */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-auto bg-transparency-grid">
        {/* Subtle studio vignette */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#141416]/75 to-[#141416]" />

        <div
          className="relative transition-transform duration-100 ease-out flex items-center justify-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Precision 1024-unit Stage Frame */}
          <div className="relative rounded-xl p-4 bg-[#18181b]/90 border border-white/[0.08] shadow-2xl">
            <div className="relative w-[384px] h-[384px]">
              <canvas
                ref={canvasRef}
                className="w-[384px] h-[384px] object-contain block"
                style={{
                  imageRendering: targetResolution <= 48 ? 'pixelated' : 'auto',
                }}
              />

              {/* Apple macOS 1024×1024 HIG Keyline & Safe Zone Overlay */}
              {showAppleGrid && (
                <svg
                  viewBox="0 0 1024 1024"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  {/* Outer 1024x1024 boundary */}
                  <rect
                    x="1"
                    y="1"
                    width="1022"
                    height="1022"
                    fill="none"
                    stroke="rgba(10, 132, 255, 0.35)"
                    strokeWidth="2"
                  />
                  {/* Standard Apple 824×824 (80.5%) Squircle Safe Zone Box */}
                  <rect
                    x="100"
                    y="100"
                    width="824"
                    height="824"
                    rx="185"
                    fill="none"
                    stroke="rgba(10, 132, 255, 0.65)"
                    strokeWidth="2"
                    strokeDasharray="8 6"
                  />
                  {/* Inner 512px Circle & Crosshairs */}
                  <circle
                    cx="512"
                    cy="512"
                    r="412"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.22)"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="512"
                    cy="512"
                    r="276"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.18)"
                    strokeWidth="1.5"
                  />
                  {/* Center Axes & Diagonals */}
                  <line
                    x1="512"
                    y1="0"
                    x2="512"
                    y2="1024"
                    stroke="rgba(10, 132, 255, 0.3)"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="0"
                    y1="512"
                    x2="1024"
                    y2="512"
                    stroke="rgba(10, 132, 255, 0.3)"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="100"
                    y1="100"
                    x2="924"
                    y2="924"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="924"
                    y1="100"
                    x2="100"
                    y2="924"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1.5"
                  />
                  {/* Dimension readouts */}
                  <text
                    x="114"
                    y="124"
                    fill="#5eb0ff"
                    fontSize="22"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    824×824 Safe Tile (80.5%)
                  </text>
                </svg>
              )}

              {/* Split Comparison Overlay */}
              {compareMode && originalImageSrc && (
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none border-r border-[#0a84ff]"
                  style={{ width: `${compareSliderPos}%` }}
                >
                  <div className="w-[384px] h-[384px] relative bg-[#121214] flex items-center justify-center">
                    <img
                      src={originalImageSrc}
                      alt="Original Input"
                      className="w-[260px] h-[260px] object-contain"
                    />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 text-neutral-300 text-[10px] font-mono">
                      SOURCE
                    </div>
                  </div>
                </div>
              )}

              {/* Subpixel Grid Overlay */}
              {showPixelGrid && (
                <div
                  className="absolute inset-0 pointer-events-none border border-[#0a84ff]/20"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
                    backgroundSize: `${384 / (targetResolution <= 64 ? targetResolution : 32)}px ${
                      384 / (targetResolution <= 64 ? targetResolution : 32)
                    }px`,
                  }}
                />
              )}
            </div>

            {/* Bottom Stage Dimension Readout Bar */}
            <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between gap-4 text-[10px] font-mono text-neutral-400 tabular-nums">
              <span>1024×1024 MASTER</span>
              <span className="text-neutral-600">·</span>
              <span>G2 SUPERELLIPSE</span>
              <span className="text-neutral-600">·</span>
              <span>TARGET {targetResolution}×{targetResolution}</span>
            </div>
          </div>

          {compareMode && (
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-52 flex items-center gap-2 bg-[#1c1c1f] px-3 py-1 rounded-md border border-white/10 shadow-lg">
              <span className="text-[10px] text-neutral-400 font-mono">Source</span>
              <input
                type="range"
                min="0"
                max="100"
                value={compareSliderPos}
                onChange={(e) => setCompareSliderPos(Number(e.target.value))}
                className="flex-1 accent-[#0a84ff] h-1 bg-white/20 rounded cursor-pointer"
              />
              <span className="text-[10px] text-[#5eb0ff] font-mono">Output</span>
            </div>
          )}
        </div>

        {/* Drag & Drop Target */}
        {isDraggingOver && (
          <div className="absolute inset-4 rounded-xl border-2 border-dashed border-[#0a84ff] bg-[#141416]/90 backdrop-blur-md flex flex-col items-center justify-center gap-2 text-white z-50">
            <UploadCloud size={28} className="text-[#0a84ff]" />
            <p className="text-sm font-semibold">Drop Icon or Image to Transform</p>
            <p className="text-xs text-neutral-400">PNG, ICO, ICNS, SVG, WebP, or BMP</p>
          </div>
        )}
      </div>
    </div>
  );
};
