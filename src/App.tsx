/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WinTitleBar } from './components/winui/WinTitleBar';
import { WinStatusBar } from './components/winui/WinStatusBar';
import { SidebarControls } from './components/editor/SidebarControls';
import { CanvasWorkspace } from './components/editor/CanvasWorkspace';
import { ResolutionMipmapGrid } from './components/editor/ResolutionMipmapGrid';
import { ExportModal } from './components/editor/ExportModal';
import { ContextMockupModal } from './components/editor/ContextMockupModal';
import { UploadModal } from './components/editor/UploadModal';
import { IconConfig } from './types/icon';
import { DEFAULT_ICON_CONFIG, PresetItem } from './presets/iconPresets';
import { parseIcoBinary } from './utils/icoParser';
import { extractDominantPalette } from './utils/paletteExtractor';

export default function App() {
  const [config, setConfig] = useState<IconConfig>(DEFAULT_ICON_CONFIG);
  const [activePresetName, setActivePresetName] = useState<string>('macOS 27 Pro');

  // Imported custom image state
  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  // Viewport states
  const [targetResolution, setTargetResolution] = useState<number>(512);
  const [zoom, setZoom] = useState<number>(1.0);
  const [showPixelGrid, setShowPixelGrid] = useState<boolean>(false);
  const [showAppleGrid, setShowAppleGrid] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(true);

  // Modals
  const [exportModalState, setExportModalState] = useState<{
    isOpen: boolean;
    initialTab: 'exe' | 'rust' | 'ico' | 'icns' | 'png' | 'zip';
  }>({ isOpen: false, initialTab: 'exe' });
  const [isMockupOpen, setIsMockupOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  const handleApplyPreset = (preset: PresetItem) => {
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
    }));
    setActivePresetName(preset.name);
  };

  const handleSelectImage = (img: HTMLImageElement, fileName: string, dataUrl: string) => {
    setCustomImage(img);
    setOriginalImageSrc(dataUrl);
    setImportedFileName(fileName);
    setConfig((prev) => ({
      ...prev,
      glyphType: 'custom-image',
      name: fileName.replace(/\.[^/.]+$/, ''),
    }));
  };

  const handleApplyAutoPalette = () => {
    if (!customImage) return;
    const palette = extractDominantPalette(customImage);
    setConfig((prev) => ({
      ...prev,
      bgColor1: palette.primary,
      bgColor2: palette.secondary,
      bgColor3: palette.accent,
      glyphColor: palette.glyphTint,
    }));
  };

  const handleClearCustomImage = () => {
    setCustomImage(null);
    setOriginalImageSrc(null);
    setImportedFileName(null);
    setConfig((prev) => ({
      ...prev,
      glyphType: 'preset',
      glyphValue: 'Layers',
    }));
  };

  const handleFileDrop = async (file: File) => {
    try {
      const isIco = file.name.toLowerCase().endsWith('.ico');
      if (isIco) {
        const buffer = await file.arrayBuffer();
        const parsed = parseIcoBinary(buffer);
        if (parsed.length > 0) {
          const largest = parsed[0];
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            handleSelectImage(
              img,
              `${file.name} (${largest.width}×${largest.height})`,
              largest.dataUrl
            );
          };
          img.src = largest.dataUrl;
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          handleSelectImage(img, file.name, dataUrl);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#141416] text-neutral-100 font-sans">
      {/* Unified macOS Pro / Fastframe Native Toolbar */}
      <WinTitleBar
        appName="IconForge Pro"
        activePresetName={activePresetName}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onOpenExport={() => setExportModalState({ isOpen: true, initialTab: 'exe' })}
        onOpenRustStudio={() => setExportModalState({ isOpen: true, initialTab: 'rust' })}
        onOpenMockup={() => setIsMockupOpen(true)}
        onUploadClick={() => setIsUploadOpen(true)}
        showAppleGrid={showAppleGrid}
        onToggleAppleGrid={() => setShowAppleGrid(!showAppleGrid)}
      />

      {/* Main Studio Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        <SidebarControls
          config={config}
          onChange={(newConf) => setConfig(newConf)}
          onApplyPreset={handleApplyPreset}
          onOpenUpload={() => setIsUploadOpen(true)}
          hasCustomImage={Boolean(customImage)}
          onClearCustomImage={handleClearCustomImage}
        />

        <CanvasWorkspace
          config={config}
          customImage={customImage}
          targetResolution={targetResolution}
          onSelectResolution={(res) => setTargetResolution(res)}
          zoom={zoom}
          showPixelGrid={showPixelGrid}
          showAppleGrid={showAppleGrid}
          onToggleAppleGrid={() => setShowAppleGrid(!showAppleGrid)}
          onFileDrop={handleFileDrop}
          originalImageSrc={originalImageSrc}
          onApplyAutoPalette={handleApplyAutoPalette}
        />

        <ResolutionMipmapGrid
          config={config}
          customImage={customImage}
          targetResolution={targetResolution}
          onSelectResolution={(size) => setTargetResolution(size)}
        />
      </main>

      {/* Bottom Technical Status Bar */}
      <WinStatusBar
        zoom={zoom}
        onZoomChange={(newZoom) => setZoom(newZoom)}
        showPixelGrid={showPixelGrid}
        onTogglePixelGrid={() => setShowPixelGrid(!showPixelGrid)}
        config={config}
        targetResolution={targetResolution}
        importedFileName={importedFileName}
      />

      {/* Build & Export Modal */}
      {exportModalState.isOpen && (
        <ExportModal
          isOpen={exportModalState.isOpen}
          initialTab={exportModalState.initialTab}
          onClose={() => setExportModalState({ ...exportModalState, isOpen: false })}
          config={config}
          customImage={customImage}
        />
      )}

      {/* OS Environment Simulator */}
      <ContextMockupModal
        isOpen={isMockupOpen}
        onClose={() => setIsMockupOpen(false)}
        config={config}
        customImage={customImage}
      />

      {/* Import Source Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSelectImage={handleSelectImage}
      />
    </div>
  );
}
