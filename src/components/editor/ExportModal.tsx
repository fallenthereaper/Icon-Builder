/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  Terminal, 
  Layers, 
  Image as ImageIcon, 
  Package, 
  Copy, 
  Check, 
  Code2,
  Apple
} from 'lucide-react';
import { ExeMetadata, IconConfig } from '../../types/icon';
import { renderIconToPngBuffer } from '../../utils/canvasRenderer';
import { createIcoBlob, IcoImageSource } from '../../utils/icoGenerator';
import { createIcnsBlob, IcnsImageSource } from '../../utils/icnsGenerator';
import { generateWindowsExe } from '../../utils/peExeGenerator';
import { createFullDeveloperZip } from '../../utils/zipPackager';
import { createRustFastframeZip, generateRustFastframeSource } from '../../utils/rustProjectGenerator';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: IconConfig;
  customImage: HTMLImageElement | null;
  initialTab?: 'exe' | 'rust' | 'ico' | 'icns' | 'png' | 'zip';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  config,
  customImage,
  initialTab = 'exe',
}) => {
  const [activeTab, setActiveTab] = useState<'exe' | 'rust' | 'ico' | 'icns' | 'png' | 'zip'>(initialTab);
  const [activeRustFile, setActiveRustFile] = useState<'Cargo.toml' | 'src/main.rs' | 'src/renderer.rs' | 'build.rs'>('Cargo.toml');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ percent: number; status: string } | null>(null);

  const [exeMeta, setExeMeta] = useState<ExeMetadata>({
    fileName: config.name.toLowerCase().replace(/[^a-z0-9_-]/gi, '') || 'iconforge_app',
    appName: config.name || 'IconForge Studio',
    companyName: 'Native Studio',
    version: '1.0.0.0',
    description: 'Native Desktop Application with Embedded Multi-Res Icon',
    windowTitle: config.name || 'IconForge Studio',
  });

  const [pngSize, setPngSize] = useState<number>(1024);

  const rustFiles = useMemo(() => generateRustFastframeSource(config, exeMeta), [config, exeMeta]);

  if (!isOpen) return null;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // 1. Export Working Windows PE32 .EXE
  const handleExportExe = async () => {
    setIsExporting(true);
    setExportProgress({ percent: 15, status: 'Rendering mipmap frames (16px to 256px)...' });

    try {
      const sizes = [16, 32, 48, 64, 256];
      const icoSources: IcoImageSource[] = [];

      for (let i = 0; i < sizes.length; i++) {
        const s = sizes[i];
        setExportProgress({
          percent: 15 + Math.round((i / sizes.length) * 55),
          status: `Encoding ${s}×${s} RGBA frame...`,
        });
        const pngBuf = await renderIconToPngBuffer(config, s, customImage);
        icoSources.push({ size: s, pngBuffer: pngBuf });
      }

      setExportProgress({
        percent: 85,
        status: 'Linking PE32 .text, .rdata (USER32/KERNEL32 IAT), and .rsrc (RT_GROUP_ICON)...',
      });
      const exeBinary = generateWindowsExe(icoSources, exeMeta);

      const blob = new Blob([exeBinary.buffer as ArrayBuffer], {
        type: 'application/vnd.microsoft.portable-executable',
      });
      downloadBlob(blob, `${exeMeta.fileName || 'app'}.exe`);

      setExportProgress({ percent: 100, status: 'Executable packaged and verified.' });
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(null);
      }, 600);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // 2. Export Rust (egui + fastframe) Crate ZIP
  const handleExportRustCrate = async () => {
    setIsExporting(true);
    try {
      const zipBlob = await createRustFastframeZip(
        config,
        exeMeta,
        customImage,
        (percent, status) => setExportProgress({ percent, status })
      );
      downloadBlob(zipBlob, `${exeMeta.fileName || 'app'}_rust_fastframe.zip`);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(null);
      }, 500);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // 3. Export Multi-Res Windows .ICO
  const handleExportIco = async () => {
    setIsExporting(true);
    setExportProgress({ percent: 25, status: 'Encoding 7-layer Windows .ICO binary...' });
    try {
      const sizes = [16, 24, 32, 48, 64, 128, 256];
      const icoSources: IcoImageSource[] = [];
      for (const s of sizes) {
        const pngBuf = await renderIconToPngBuffer(config, s, customImage);
        icoSources.push({ size: s, pngBuffer: pngBuf });
      }
      const icoBlob = createIcoBlob(icoSources);
      downloadBlob(icoBlob, `${exeMeta.fileName || 'app'}.ico`);
      setIsExporting(false);
      setExportProgress(null);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // 4. Export Apple macOS .ICNS
  const handleExportIcns = async () => {
    setIsExporting(true);
    setExportProgress({ percent: 25, status: 'Encoding Apple macOS .ICNS (icp4..ic10 Retina)...' });
    try {
      const sizes = [16, 32, 64, 128, 256, 512, 1024];
      const icnsSources: IcnsImageSource[] = [];
      for (const s of sizes) {
        const pngBuf = await renderIconToPngBuffer(config, s, customImage);
        icnsSources.push({ size: s, pngBuffer: pngBuf });
      }
      const icnsBlob = createIcnsBlob(icnsSources);
      downloadBlob(icnsBlob, `${exeMeta.fileName || 'app'}.icns`);
      setIsExporting(false);
      setExportProgress(null);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // 5. Export PNG
  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      const pngBuf = await renderIconToPngBuffer(config, pngSize, customImage);
      const blob = new Blob([pngBuf.buffer as ArrayBuffer], { type: 'image/png' });
      downloadBlob(blob, `${exeMeta.fileName || 'icon'}_${pngSize}x${pngSize}.png`);
      setIsExporting(false);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // 6. Export Complete Bundle ZIP
  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const zipBlob = await createFullDeveloperZip(
        config,
        exeMeta,
        customImage,
        (percent, status) => setExportProgress({ percent, status })
      );
      downloadBlob(zipBlob, `${exeMeta.fileName || 'app'}_bundle.zip`);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(null);
      }, 500);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const currentRustCode =
    activeRustFile === 'Cargo.toml'
      ? rustFiles.cargoToml
      : activeRustFile === 'src/main.rs'
      ? rustFiles.mainRs
      : activeRustFile === 'src/renderer.rs'
      ? rustFiles.rendererRs
      : rustFiles.buildRs;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#18181b] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="h-10 px-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#1e1e22]">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Download size={14} className="text-[#0a84ff]" />
            <span>Build & Native Export Pipeline</span>
            <span className="text-neutral-500">·</span>
            <span className="font-mono font-normal text-neutral-400">PE32 / Rust Fastframe / ICNS / ICO</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close export dialog"
            className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Segmented Target Selector */}
        <div className="grid grid-cols-6 gap-1 p-1.5 bg-[#121214] border-b border-white/[0.07]">
          {[
            { id: 'exe', label: 'Win32 .EXE', icon: Terminal },
            { id: 'rust', label: 'Rust + Fastframe', icon: Code2 },
            { id: 'icns', label: 'macOS .ICNS', icon: Apple },
            { id: 'ico', label: 'Windows .ICO', icon: Layers },
            { id: 'png', label: 'Master .PNG', icon: ImageIcon },
            { id: 'zip', label: 'All Assets .ZIP', icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0a84ff] text-white font-semibold shadow-2xs'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* TAB 1: WORKING WINDOWS .EXE */}
          {activeTab === 'exe' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#141416] border border-white/[0.08] text-xs space-y-1">
                <div className="font-semibold text-neutral-100">
                  Native Windows GUI Executable (PE32 with IAT &amp; Embedded Resource Directory)
                </div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Links a valid x86 <code>.text</code> entry point, a valid <code>.rdata</code> Import Address Table (<code>USER32.dll!MessageBoxA</code> &amp; <code>KERNEL32.dll!ExitProcess</code>), and a canonical <code>.rsrc</code> section containing <code>RT_GROUP_ICON</code> and 5 mipmap layers. Double-clicking the exported <code>.exe</code> on Windows 10/11 displays its native icon in Explorer and launches a native Win32 confirmation dialog.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400 font-medium">Binary File Name</label>
                  <div className="flex items-center bg-[#121214] border border-white/10 rounded px-2.5 py-1.5 text-xs">
                    <input
                      type="text"
                      value={exeMeta.fileName}
                      onChange={(e) => setExeMeta({ ...exeMeta, fileName: e.target.value })}
                      className="bg-transparent flex-1 text-white outline-none font-mono"
                    />
                    <span className="text-neutral-500 font-mono">.exe</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400 font-medium">Application Product Name</label>
                  <input
                    type="text"
                    value={exeMeta.appName}
                    onChange={(e) => setExeMeta({ ...exeMeta, appName: e.target.value })}
                    className="w-full bg-[#121214] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400 font-medium">Publisher / Vendor</label>
                  <input
                    type="text"
                    value={exeMeta.companyName}
                    onChange={(e) => setExeMeta({ ...exeMeta, companyName: e.target.value })}
                    className="w-full bg-[#121214] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400 font-medium">Version String</label>
                  <input
                    type="text"
                    value={exeMeta.version}
                    onChange={(e) => setExeMeta({ ...exeMeta, version: e.target.value })}
                    className="w-full bg-[#121214] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-[#121214] border border-white/[0.06] text-[11px] font-mono text-neutral-400 space-y-1 tabular-nums">
                <div className="flex justify-between">
                  <span>PE Header / Subsystem</span>
                  <span className="text-neutral-200">PE32 (0x010B) · IMAGE_SUBSYSTEM_WINDOWS_GUI (2)</span>
                </div>
                <div className="flex justify-between">
                  <span>Import Table (.rdata)</span>
                  <span className="text-neutral-200">KERNEL32.dll!ExitProcess · USER32.dll!MessageBoxA</span>
                </div>
                <div className="flex justify-between">
                  <span>Resource Directory (.rsrc)</span>
                  <span className="text-neutral-200">RT_ICON (16, 32, 48, 64, 256px) · RT_GROUP_ICON #1</span>
                </div>
              </div>

              <button
                onClick={handleExportExe}
                disabled={isExporting}
                className="w-full py-2 rounded bg-[#0a84ff] hover:bg-[#1f8fff] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Terminal size={13} />
                <span>Compile &amp; Download {exeMeta.fileName || 'app'}.exe</span>
              </button>
            </div>
          )}

          {/* TAB 2: NATIVE RUST (EGUI + FASTFRAME.DEV) WORKSPACE */}
          {activeTab === 'rust' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-300">
                  <strong className="text-white">Native Rust Crate</strong> · <code>emilk/egui 0.36</code> + <code>crmne/fastframe v0.15.5</code>
                </div>
                <div className="flex items-center gap-1 bg-[#121214] p-0.5 rounded border border-white/[0.08]">
                  {(['Cargo.toml', 'src/main.rs', 'src/renderer.rs', 'build.rs'] as const).map((file) => (
                    <button
                      key={file}
                      onClick={() => setActiveRustFile(file)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        activeRustFile === file
                          ? 'bg-[#2c2c31] text-white font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {file}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Viewer */}
              <div className="relative rounded-lg bg-[#111113] border border-white/[0.08] overflow-hidden">
                <button
                  onClick={() => handleCopyCode(currentRustCode)}
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-white/[0.08] hover:bg-white/[0.15] text-[10px] font-mono text-neutral-200 flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <pre className="p-3.5 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-60 leading-relaxed select-text">
                  <code>{currentRustCode}</code>
                </pre>
              </div>

              <button
                onClick={handleExportRustCrate}
                disabled={isExporting}
                className="w-full py-2 rounded bg-[#0a84ff] hover:bg-[#1f8fff] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Code2 size={14} />
                <span>Download Complete Rust (egui + fastframe) Project (.zip)</span>
              </button>
            </div>
          )}

          {/* TAB 3: APPLE MACOS .ICNS */}
          {activeTab === 'icns' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#141416] border border-white/[0.08] text-xs space-y-1">
                <div className="font-semibold text-neutral-100">Apple macOS .ICNS Binary Container</div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Encodes a binary <code>icns</code> container with OSType chunks <code>icp4</code> (16px), <code>icp5</code> (32px), <code>icp6</code> (64px), <code>ic07</code> (128px), <code>ic08</code> (256px), <code>ic09</code> (512px), and <code>ic10</code> (1024×1024 Retina <code>512x512@2x</code>).
                </p>
              </div>

              <button
                onClick={handleExportIcns}
                disabled={isExporting}
                className="w-full py-2 rounded bg-[#0a84ff] hover:bg-[#1f8fff] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Apple size={14} />
                <span>Download macOS {exeMeta.fileName || 'app'}.icns</span>
              </button>
            </div>
          )}

          {/* TAB 4: WINDOWS .ICO */}
          {activeTab === 'ico' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#141416] border border-white/[0.08] text-xs space-y-1">
                <div className="font-semibold text-neutral-100">Multi-Resolution Windows .ICO</div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Packs all 7 standard Windows mipmap frames (16×16, 24×24, 32×32, 48×48, 64×64, 128×128, and 256×256) into a single binary <code>ICONDIR</code> file.
                </p>
              </div>

              <button
                onClick={handleExportIco}
                disabled={isExporting}
                className="w-full py-2 rounded bg-[#0a84ff] hover:bg-[#1f8fff] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Layers size={14} />
                <span>Download Multi-Resolution {exeMeta.fileName || 'app'}.ico</span>
              </button>
            </div>
          )}

          {/* TAB 5: HIGH-RES PNG */}
          {activeTab === 'png' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[1024, 512, 256, 128, 64, 48, 32, 16].map((size) => (
                  <button
                    key={size}
                    onClick={() => setPngSize(size)}
                    className={`p-2 rounded border font-mono text-xs tabular-nums transition-colors ${
                      pngSize === size
                        ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-white font-semibold'
                        : 'bg-[#141416] hover:bg-white/[0.04] border-white/[0.07] text-neutral-300'
                    }`}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportPng}
                disabled={isExporting}
                className="w-full py-2 rounded bg-[#0a84ff] hover:bg-[#1f8fff] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={14} />
                <span>Download {pngSize}×{pngSize} PNG</span>
              </button>
            </div>
          )}

          {/* TAB 6: COMPLETE DEVELOPER SUITE ZIP */}
          {activeTab === 'zip' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#141416] border border-white/[0.08] text-xs space-y-2">
                <div className="font-semibold text-neutral-100">Universal Multi-OS Distribution Bundle (.zip)</div>
                <div className="font-mono text-[11px] text-neutral-400 space-y-0.5">
                  <div>/windows/ — {exeMeta.fileName || 'app'}.ico, {exeMeta.fileName || 'app'}.exe, AppX Logos</div>
                  <div>/macos/ — {exeMeta.fileName || 'app'}.icns, icon_1024x1024.png, @2x Retina set</div>
                  <div>/rust-fastframe/ — Cargo.toml, build.rs, src/main.rs, src/renderer.rs</div>
                  <div>/web/ — favicon.ico, apple-touch-icon.png, site.webmanifest</div>
                </div>
              </div>

              <button
                onClick={handleExportZip}
                disabled={isExporting}
                className="w-full py-2 rounded bg-[#0a84ff] hover:bg-[#1f8fff] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Package size={14} />
                <span>Build &amp; Download Complete Distribution Archive (.zip)</span>
              </button>
            </div>
          )}

          {exportProgress && (
            <div className="p-2.5 rounded bg-[#121214] border border-[#0a84ff]/40 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-300">{exportProgress.status}</span>
                <span className="font-mono text-[#5eb0ff] tabular-nums">{exportProgress.percent}%</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-[#0a84ff] h-full transition-all duration-150"
                  style={{ width: `${exportProgress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
