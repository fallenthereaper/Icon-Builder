/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Monitor, 
  Compass, 
  Terminal, 
  Folder, 
  Globe, 
  AppWindow, 
  Search, 
  Sliders,
  Settings,
  Shield,
  Trash2
} from 'lucide-react';
import { IconConfig } from '../../types/icon';
import { renderIconToContext } from '../../utils/canvasRenderer';

interface ContextMockupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: IconConfig;
  customImage: HTMLImageElement | null;
}

export const ContextMockupModal: React.FC<ContextMockupModalProps> = ({
  isOpen,
  onClose,
  config,
  customImage,
}) => {
  const [activeEnv, setActiveEnv] = useState<'macos-dock' | 'win11-taskbar' | 'win11-desktop' | 'browser-tab'>('macos-dock');
  const [hoveredDockIndex, setHoveredDockIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderIconToContext(ctx, config, 512, customImage, { includeDropShadow: true });
  }, [isOpen, config, customImage, activeEnv]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#1c1c22] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Titlebar */}
        <div className="h-12 px-5 border-b border-white/8 flex items-center justify-between shrink-0 bg-[#22222a]">
          <div className="flex items-center gap-2">
            <Monitor size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Context Mockup Simulator</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 font-mono">
              Live Environment Preview
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close mockup simulator"
            className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Environment Picker Tabs */}
        <div className="flex border-b border-white/8 bg-black/20 p-2 gap-2">
          {[
            { id: 'macos-dock', label: 'macOS 27 Dock' },
            { id: 'win11-taskbar', label: 'Windows 11 Taskbar' },
            { id: 'win11-desktop', label: 'Windows Desktop' },
            { id: 'browser-tab', label: 'Browser Tab & Favicon' },
          ].map((env) => (
            <button
              key={env.id}
              onClick={() => setActiveEnv(env.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeEnv === env.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {env.label}
            </button>
          ))}
        </div>

        {/* Mockup Stage */}
        <div className="p-8 min-h-[420px] flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#172033] to-[#0b101c]">
          {/* Subtle wallpaper gradient mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-transparent to-black pointer-events-none" />

          {/* 1. MACOS DOCK MOCKUP */}
          {activeEnv === 'macos-dock' && (
            <div className="w-full flex flex-col items-center justify-end h-72">
              <div className="text-center mb-6">
                <span className="text-xs text-neutral-300 font-medium">macOS 27 Glass Dock</span>
                <p className="text-[11px] text-neutral-400">Verifies superellipse curvature, specular rim light, and ambient reflection.</p>
              </div>

              {/* Glass Dock Shelf */}
              <div 
                className="px-4 py-2.5 rounded-2xl bg-white/10 dark:bg-black/35 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-end gap-3.5"
                onMouseLeave={() => setHoveredDockIndex(null)}
              >
                {/* Neighbor Mac App 1: Finder */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Compass size={24} />
                </div>

                {/* Neighbor Mac App 2: Safari */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <Globe size={24} />
                </div>

                {/* Neighbor Mac App 3: Terminal */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/10 flex items-center justify-center text-emerald-400 shadow-lg">
                  <Terminal size={22} />
                </div>

                {/* YOUR APP ICON (Featured in Dock) */}
                <div 
                  className="relative group cursor-pointer transition-transform duration-150 hover:-translate-y-2 hover:scale-110 flex flex-col items-center"
                >
                  <canvas
                    ref={canvasRef}
                    className="w-14 h-14 object-contain filter drop-shadow-xl"
                  />
                  {/* Active running dot */}
                  <span className="w-1 h-1 rounded-full bg-white/80 mt-1" />

                  {/* Tooltip */}
                  <div className="absolute -top-7 px-2 py-0.5 rounded bg-black/80 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
                    {config.name || 'Your App'}
                  </div>
                </div>

                {/* Separator */}
                <div className="w-px h-10 bg-white/15 my-auto" />

                {/* Neighbor Mac App 4: Settings */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-neutral-600 to-neutral-700 flex items-center justify-center text-neutral-200 shadow-lg">
                  <Settings size={22} />
                </div>

                {/* Neighbor Mac App 5: Trash */}
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 shadow-lg">
                  <Trash2 size={22} />
                </div>
              </div>
            </div>
          )}

          {/* 2. WINDOWS 11 TASKBAR MOCKUP */}
          {activeEnv === 'win11-taskbar' && (
            <div className="w-full flex flex-col items-center justify-end h-72">
              <div className="text-center mb-10">
                <span className="text-xs text-neutral-300 font-medium">Windows 11 Centered Taskbar</span>
                <p className="text-[11px] text-neutral-400">Verifies taskbar scale (32px to 48px) and running app accent indicator.</p>
              </div>

              {/* Taskbar Bar */}
              <div className="w-full max-w-2xl h-12 bg-[#202024]/90 backdrop-blur-xl border border-white/10 rounded-xl px-4 flex items-center justify-between shadow-2xl">
                {/* Left: Weather/Widgets */}
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <span>☁️ 21°C</span>
                  <span className="text-neutral-600">·</span>
                  <span>Sunny</span>
                </div>

                {/* Center: Windows 11 App Icons */}
                <div className="flex items-center gap-2">
                  {/* Windows Start Button */}
                  <div className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="w-1.5 h-1.5 bg-[#00adef] rounded-xs" />
                      <div className="w-1.5 h-1.5 bg-[#00adef] rounded-xs" />
                      <div className="w-1.5 h-1.5 bg-[#00adef] rounded-xs" />
                      <div className="w-1.5 h-1.5 bg-[#00adef] rounded-xs" />
                    </div>
                  </div>

                  {/* Search */}
                  <div className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-neutral-300">
                    <Search size={16} />
                  </div>

                  {/* Explorer */}
                  <div className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-amber-400">
                    <Folder size={18} />
                  </div>

                  {/* Edge */}
                  <div className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-sky-400">
                    <Globe size={18} />
                  </div>

                  {/* YOUR APP ICON */}
                  <div className="relative w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                    <canvas
                      ref={canvasRef}
                      className="w-6 h-6 object-contain"
                    />
                    {/* Windows 11 active pill indicator */}
                    <div className="absolute -bottom-1 w-4 h-0.5 bg-blue-500 rounded-full" />
                  </div>
                </div>

                {/* Right: System Tray & Clock */}
                <div className="text-[11px] text-neutral-300 font-mono flex items-center gap-2">
                  <span>11:52 AM</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. WINDOWS 11 DESKTOP MOCKUP */}
          {activeEnv === 'win11-desktop' && (
            <div className="w-full flex items-center justify-center h-72">
              <div className="flex flex-col items-center p-3 rounded-lg bg-blue-500/20 border border-blue-400/40 shadow-xl w-28 text-center cursor-pointer">
                <canvas
                  ref={canvasRef}
                  className="w-16 h-16 object-contain filter drop-shadow-lg"
                />
                <span className="text-xs text-white mt-1.5 font-medium truncate max-w-full drop-shadow">
                  {config.name || 'YourApp'}.exe
                </span>
              </div>
            </div>
          )}

          {/* 4. BROWSER TAB MOCKUP */}
          {activeEnv === 'browser-tab' && (
            <div className="w-full max-w-xl bg-[#2b2b30] rounded-xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Browser Window Bar */}
              <div className="h-9 bg-[#202024] px-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>

                {/* Tab */}
                <div className="h-7 bg-[#2b2b30] px-3 rounded-t-lg flex items-center gap-2 text-xs text-neutral-200">
                  <canvas
                    ref={canvasRef}
                    className="w-4 h-4 object-contain"
                  />
                  <span className="font-medium truncate max-w-[140px]">
                    {config.name || 'App'} - Dashboard
                  </span>
                  <X size={11} className="text-neutral-500 hover:text-white cursor-pointer ml-1" />
                </div>

                <div className="w-10" />
              </div>

              {/* URL Bar */}
              <div className="h-8 bg-[#2b2b30] px-3 border-t border-white/6 flex items-center">
                <div className="w-full bg-[#1e1e22] rounded px-2.5 py-0.5 text-[11px] text-neutral-400 font-mono flex items-center gap-1.5">
                  <span className="text-emerald-400">🔒</span>
                  <span>https://app.yourdomain.dev/dashboard</span>
                </div>
              </div>

              <div className="h-28 bg-[#18181c] flex items-center justify-center text-xs text-neutral-400">
                <span>Tab Favicon Preview (16×16 and 32×32)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
