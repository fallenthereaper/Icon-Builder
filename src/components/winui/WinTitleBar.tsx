/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  FolderOpen, 
  Eye, 
  Download, 
  Code2, 
  Sun, 
  Moon, 
  Compass,
  ShieldCheck
} from 'lucide-react';

interface WinTitleBarProps {
  appName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenExport: () => void;
  onOpenMockup: () => void;
  onOpenRustStudio: () => void;
  onUploadClick: () => void;
  activePresetName: string;
  showAppleGrid: boolean;
  onToggleAppleGrid: () => void;
}

export const WinTitleBar: React.FC<WinTitleBarProps> = ({
  appName,
  isDark,
  onToggleTheme,
  onOpenExport,
  onOpenMockup,
  onOpenRustStudio,
  onUploadClick,
  activePresetName,
  showAppleGrid,
  onToggleAppleGrid,
}) => {
  return (
    <header className="h-9 bg-[#1e1e21] border-b border-white/[0.08] flex items-center justify-between px-3 select-none text-[12px] text-neutral-300 shrink-0">
      {/* Zone 1: macOS Native Traffic Lights & Document Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Authentic macOS Window Controls */}
        <div className="flex items-center gap-2 mr-1">
          <span
            aria-label="Close Window"
            className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"
          />
          <span
            aria-label="Minimize Window"
            className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"
          />
          <span
            aria-label="Zoom Window"
            className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"
          />
        </div>

        <div className="h-3.5 w-px bg-white/10" />

        <div className="flex items-center gap-1.5 font-medium tracking-tight whitespace-nowrap">
          <span className="text-neutral-100 font-semibold">{appName}</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400 truncate max-w-[180px]">{activePresetName}</span>
          <span className="text-neutral-600">·</span>
          <span className="text-[11px] font-mono text-neutral-400">egui + fastframe</span>
        </div>
      </div>

      {/* Zone 2: Precision Native Segmented Toolbar */}
      <div className="flex items-center gap-1 bg-[#141416] p-0.5 rounded-md border border-white/[0.07]">
        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded text-neutral-300 hover:text-white hover:bg-white/[0.07] transition-colors whitespace-nowrap shrink-0"
          title="Import PNG, ICO, ICNS, or SVG"
        >
          <FolderOpen size={12} />
          <span>Import Source</span>
        </button>

        <button
          onClick={onToggleAppleGrid}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
            showAppleGrid
              ? 'bg-[#2c2c31] text-white shadow-xs'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.07]'
          }`}
          title="Toggle Apple macOS 1024×1024 HIG Keyline & Safe Zone Grid"
        >
          <Compass size={12} />
          <span>HIG Keylines</span>
        </button>

        <button
          onClick={onOpenMockup}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded text-neutral-300 hover:text-white hover:bg-white/[0.07] transition-colors whitespace-nowrap shrink-0"
          title="Test in macOS 27 Dock, Windows 11 Taskbar, and Desktop"
        >
          <Eye size={12} />
          <span>OS Simulator</span>
        </button>

        <button
          onClick={onOpenRustStudio}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded text-neutral-300 hover:text-white hover:bg-white/[0.07] transition-colors whitespace-nowrap shrink-0"
          title="Inspect & Download Native Rust (egui + fastframe.dev) Project"
        >
          <Code2 size={12} />
          <span>Rust / Fastframe</span>
        </button>
      </div>

      {/* Zone 3: Primary Action & Theme */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleTheme}
          aria-label="Toggle Dark / Light theme"
          className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          title={isDark ? 'Switch to Light Appearance' : 'Switch to Dark Appearance'}
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded bg-[#0a84ff] hover:bg-[#1f8fff] text-white transition-colors shadow-xs whitespace-nowrap shrink-0"
          title="Export Working Windows .EXE, .ICO, Apple .ICNS, or Rust Crate"
        >
          <Download size={12} />
          <span>Build & Export</span>
        </button>
      </div>
    </header>
  );
};
