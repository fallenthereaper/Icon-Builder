/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { STANDARD_MIPMAPS, IconConfig } from '../../types/icon';
import { renderIconToContext } from '../../utils/canvasRenderer';
import { Layers } from 'lucide-react';

interface ResolutionMipmapGridProps {
  config: IconConfig;
  customImage: HTMLImageElement | null;
  targetResolution: number;
  onSelectResolution: (size: number) => void;
}

export const ResolutionMipmapGrid: React.FC<ResolutionMipmapGridProps> = ({
  config,
  customImage,
  targetResolution,
  onSelectResolution,
}) => {
  const previewMipmaps = [1024, 512, 256, 128, 64, 48, 32, 24, 16];
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});

  useEffect(() => {
    previewMipmaps.forEach((size) => {
      const canvas = canvasRefs.current[size];
      if (!canvas) return;

      const renderDim = Math.min(size, 256);
      canvas.width = renderDim;
      canvas.height = renderDim;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderIconToContext(ctx, config, renderDim, customImage, { includeDropShadow: true });
    });
  }, [config, customImage]);

  return (
    <aside className="w-64 bg-[#18181b] border-l border-white/[0.07] flex flex-col h-full text-neutral-200 select-none shrink-0">
      {/* Header */}
      <div className="h-8 px-3 border-b border-white/[0.07] flex items-center justify-between text-[11px] font-semibold text-neutral-300 bg-[#1b1b1e]">
        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-[#0a84ff]" />
          <span>Mipmap Chain</span>
        </div>
        <span className="text-[10px] font-mono text-neutral-500 font-normal tabular-nums">
          9 mip levels
        </span>
      </div>

      {/* Mipmap Inspector Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.05]">
        {previewMipmaps.map((size) => {
          const mipInfo = STANDARD_MIPMAPS.find((m) => m.size === size);
          const isSelected = targetResolution === size;

          return (
            <button
              key={size}
              onClick={() => onSelectResolution(size)}
              className={`w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors ${
                isSelected
                  ? 'bg-[#0a84ff]/15 text-white'
                  : 'hover:bg-white/[0.04] text-neutral-300'
              }`}
            >
              {/* Thumbnail */}
              <div className="w-11 h-11 rounded bg-[#121214] border border-white/[0.07] flex items-center justify-center shrink-0 bg-transparency-grid overflow-hidden">
                <canvas
                  ref={(el) => {
                    canvasRefs.current[size] = el;
                  }}
                  style={{
                    width: size <= 32 ? `${size}px` : '36px',
                    height: size <= 32 ? `${size}px` : '36px',
                    imageRendering: size <= 32 ? 'pixelated' : 'auto',
                  }}
                  className="object-contain"
                />
              </div>

              {/* Clean unboxed metadata */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-neutral-100 tabular-nums">
                    {size}×{size}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 tabular-nums">
                    {mipInfo?.density || '1x'} · {mipInfo?.platform === 'macos' ? 'macOS' : 'Win/All'}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {mipInfo?.category}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="p-2.5 border-t border-white/[0.07] bg-[#141416] text-[10px] text-neutral-400 font-mono">
        <span>ICO (16–256px) · ICNS (16–1024px)</span>
      </div>
    </aside>
  );
};
