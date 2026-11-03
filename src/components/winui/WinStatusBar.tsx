/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Grid } from 'lucide-react';
import { IconConfig } from '../../types/icon';

interface WinStatusBarProps {
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  showPixelGrid: boolean;
  onTogglePixelGrid: () => void;
  config: IconConfig;
  targetResolution: number;
  importedFileName: string | null;
}

export const WinStatusBar: React.FC<WinStatusBarProps> = ({
  zoom,
  onZoomChange,
  showPixelGrid,
  onTogglePixelGrid,
  config,
  targetResolution,
  importedFileName,
}) => {
  return (
    <footer className="h-6 bg-[#18181b] border-t border-white/[0.07] px-3 flex items-center justify-between text-[11px] text-neutral-400 select-none shrink-0 font-mono tabular-nums">
      {/* Left: Clean unboxed technical metadata */}
      <div className="flex items-center gap-2.5">
        <span className="text-neutral-200 font-medium">
          {targetResolution}×{targetResolution} px
        </span>
        <span className="text-neutral-600">·</span>
        <span>RGBA8 Unmultiplied</span>
        <span className="text-neutral-600">·</span>
        <span>
          Mask: <strong className="text-neutral-200 font-normal">{config.shape}</strong>
        </span>
        <span className="text-neutral-600">·</span>
        <span>
          n={config.superellipsePower.toFixed(2)}
        </span>
        <span className="text-neutral-600">·</span>
        <span>
          Tile {(config.tileScale * 100).toFixed(1)}% ({Math.round(1024 * config.tileScale)}px / 1024px)
        </span>

        {importedFileName && (
          <>
            <span className="text-neutral-600">·</span>
            <span className="text-[#0a84ff] truncate max-w-[200px]">
              Asset: {importedFileName}
            </span>
          </>
        )}
      </div>

      {/* Right: Pixel Grid & Zoom */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePixelGrid}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
            showPixelGrid
              ? 'bg-[#0a84ff]/25 text-[#5eb0ff]'
              : 'hover:text-neutral-200 hover:bg-white/5'
          }`}
          title="Toggle Subpixel Alignment Grid"
        >
          <Grid size={10} />
          <span>Subpixel Grid</span>
        </button>

        <span className="text-neutral-600">·</span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={11} />
          </button>

          <button
            onClick={() => onZoomChange(1.0)}
            className="w-11 text-center hover:text-white transition-colors tabular-nums"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={() => onZoomChange(Math.min(4.0, zoom + 0.25))}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={11} />
          </button>

          <button
            onClick={() => onZoomChange(1.0)}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
            title="Fit to Stage"
          >
            <Maximize2 size={10} />
          </button>
        </div>
      </div>
    </footer>
  );
};
