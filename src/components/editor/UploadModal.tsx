/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileCode, 
  Layers, 
  Image as ImageIcon,
  Check,
  Sparkles
} from 'lucide-react';
import { parseIcoBinary, ParsedIcoImage } from '../../utils/icoParser';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageElement: HTMLImageElement, fileName: string, dataUrl: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [extractedIcoImages, setExtractedIcoImages] = useState<ParsedIcoImage[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setCurrentFileName(file.name);

    try {
      const isIco = file.name.toLowerCase().endsWith('.ico');

      if (isIco) {
        const buffer = await file.arrayBuffer();
        const parsed = parseIcoBinary(buffer);
        if (parsed.length > 0) {
          setExtractedIcoImages(parsed);
          setIsProcessing(false);
          return;
        }
      }

      // Standard image loading (PNG, SVG, JPG, WebP)
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          onSelectImage(img, file.name, dataUrl);
          setIsProcessing(false);
          onClose();
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Could not parse file: ' + String(err));
      setIsProcessing(false);
    }
  };

  const handleSelectExtractedIco = (item: ParsedIcoImage) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      onSelectImage(img, `${currentFileName} (${item.width}×${item.height})`, item.dataUrl);
      onClose();
    };
    img.src = item.dataUrl;
  };

  // Sample icons for instant testing
  const sampleIcons = [
    {
      name: 'VS Code Blue Ribbon',
      tag: 'Developer',
      svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 2L5 12l12.5 10V2z" fill="#007ACC"/><path d="M17.5 2l4.5 3.5v13L17.5 22V2z" fill="#1F8AD2"/><path d="M2 12l3-3 12.5 10-3 3L2 12z" fill="#0065A9"/></svg>`,
    },
    {
      name: 'Modern Terminal CLI',
      tag: 'CLI Tool',
      svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#0f172a"/><path d="M5 7l5 5-5 5" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/><path d="M12 17h7" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    },
    {
      name: 'Rust Core Gear',
      tag: 'Systems',
      svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#f97316" stroke-width="2.5"/><circle cx="12" cy="12" r="4" fill="#ea580c"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="#f97316" stroke-width="2.5"/></svg>`,
    },
    {
      name: 'Neon AI Spark',
      tag: 'Next-Gen',
      svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" fill="#8b5cf6"/><circle cx="12" cy="12" r="3" fill="#ec4899"/></svg>`,
    },
  ];

  const loadSampleSvg = (sample: typeof sampleIcons[0]) => {
    const blob = new Blob([sample.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      onSelectImage(img, sample.name, url);
      onClose();
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#1c1c22] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Titlebar */}
        <div className="h-12 px-5 border-b border-white/8 flex items-center justify-between shrink-0 bg-[#22222a]">
          <div className="flex items-center gap-2">
            <UploadCloud size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Import Icon or Image</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close upload dialog"
            className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* File Drop / Select Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 rounded-xl border-2 border-dashed border-white/15 hover:border-blue-500/60 bg-white/2 hover:bg-white/4 cursor-pointer transition-all flex flex-col items-center justify-center text-center group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.ico,.svg,.jpg,.jpeg,.webp,.bmp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-blue-600/20 group-hover:bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 transition-colors">
              <UploadCloud size={24} />
            </div>
            <p className="text-xs font-semibold text-neutral-200 mt-3">
              Click to browse or drop an icon file here
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Supports Windows .ICO (multi-res), PNG, SVG, WebP, and JPEG
            </p>
          </div>

          {/* Extracted ICO Sub-Icon Selector (if ICO uploaded) */}
          {extractedIcoImages.length > 0 && (
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-300">
                  Extracted {extractedIcoImages.length} Resolutions from ICO
                </span>
                <span className="text-[10px] text-neutral-400">Click to choose base</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {extractedIcoImages.map((ico, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectExtractedIco(ico)}
                    className="p-2 rounded-lg bg-black/40 hover:bg-blue-600/20 border border-white/10 hover:border-blue-400 flex flex-col items-center gap-1 transition-all"
                  >
                    <img src={ico.dataUrl} alt="ICO frame" className="w-8 h-8 object-contain" />
                    <span className="text-[10px] font-mono text-neutral-300">
                      {ico.width}×{ico.height}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instant Sample Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
              <Sparkles size={12} className="text-amber-400" />
              <span>Or try a sample developer logo:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sampleIcons.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => loadSampleSvg(s)}
                  className="p-2.5 rounded-lg bg-white/3 hover:bg-white/6 border border-white/6 text-left flex items-center gap-2.5 transition-all"
                >
                  <div
                    className="w-8 h-8 rounded shrink-0 flex items-center justify-center p-1 bg-black/30"
                    dangerouslySetInnerHTML={{ __html: s.svg }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-neutral-200 truncate">{s.name}</div>
                    <div className="text-[10px] text-neutral-400">{s.tag}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
