/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { ExeMetadata, IconConfig } from '../types/icon';
import { renderIconToPngBuffer } from './canvasRenderer';
import { generateIcoBinary, IcoImageSource } from './icoGenerator';
import { generateIcnsBinary, IcnsImageSource } from './icnsGenerator';
import { generateWindowsExe } from './peExeGenerator';
import { generateRustFastframeSource } from './rustProjectGenerator';

export async function createFullDeveloperZip(
  config: IconConfig,
  metadata: ExeMetadata,
  customImage?: HTMLImageElement | null,
  onProgress?: (percent: number, status: string) => void
): Promise<Blob> {
  const zip = new JSZip();

  const sizesToRender = [16, 24, 32, 48, 64, 128, 180, 192, 256, 512, 1024];
  const renderedBuffers: Map<number, Uint8Array> = new Map();

  for (let i = 0; i < sizesToRender.length; i++) {
    const s = sizesToRender[i];
    if (onProgress) {
      onProgress(
        Math.round((i / (sizesToRender.length + 4)) * 75),
        `Rendering ${s}×${s} master mipmap...`
      );
    }
    const buf = await renderIconToPngBuffer(config, s, customImage);
    renderedBuffers.set(s, buf);
  }

  if (onProgress) onProgress(80, 'Encoding multi-resolution Windows ICO & Apple ICNS...');
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoSources: IcoImageSource[] = icoSizes.map((s) => ({
    size: s,
    pngBuffer: renderedBuffers.get(s)!,
  }));
  const icoBinary = generateIcoBinary(icoSources);

  const icnsSizes = [16, 32, 64, 128, 256, 512, 1024];
  const icnsSources: IcnsImageSource[] = icnsSizes.map((s) => ({
    size: s,
    pngBuffer: renderedBuffers.get(s)!,
  }));
  const icnsBinary = generateIcnsBinary(icnsSources);

  if (onProgress) onProgress(88, 'Linking Windows PE32 executable (.exe) with IAT & RT_GROUP_ICON...');
  const exeBinary = generateWindowsExe(icoSources, metadata);

  // 1. Windows folder
  const winFolder = zip.folder('windows')!;
  winFolder.file(`${metadata.fileName || 'app'}.ico`, icoBinary);
  winFolder.file(`${metadata.fileName || 'app'}.exe`, exeBinary);
  winFolder.file('Square44x44Logo.png', renderedBuffers.get(48)!);
  winFolder.file('Square150x150Logo.png', renderedBuffers.get(128)!);
  winFolder.file('Square310x310Logo.png', renderedBuffers.get(256)!);

  // 2. macOS folder
  const macFolder = zip.folder('macos')!;
  macFolder.file(`${metadata.fileName || 'app'}.icns`, icnsBinary);
  macFolder.file('icon_1024x1024.png', renderedBuffers.get(1024)!);
  macFolder.file('icon_512x512@2x.png', renderedBuffers.get(1024)!);
  macFolder.file('icon_512x512.png', renderedBuffers.get(512)!);
  macFolder.file('icon_256x256@2x.png', renderedBuffers.get(512)!);
  macFolder.file('icon_256x256.png', renderedBuffers.get(256)!);
  macFolder.file('icon_128x128.png', renderedBuffers.get(128)!);

  // 3. Rust + Fastframe folder
  if (onProgress) onProgress(93, 'Generating Native Rust (egui + fastframe.dev) crate...');
  const rustFiles = generateRustFastframeSource(config, metadata);
  const rustFolder = zip.folder('rust-fastframe')!;
  rustFolder.file('Cargo.toml', rustFiles.cargoToml);
  rustFolder.file('build.rs', rustFiles.buildRs);
  rustFolder.file('README.md', rustFiles.readmeMd);
  const rustSrc = rustFolder.folder('src')!;
  rustSrc.file('main.rs', rustFiles.mainRs);
  rustSrc.file('renderer.rs', rustFiles.rendererRs);
  const rustAssets = rustFolder.folder('assets')!;
  rustAssets.file('app_icon.ico', icoBinary);
  rustAssets.file('app_icon.icns', icnsBinary);

  // 4. Web folder
  const webFolder = zip.folder('web')!;
  webFolder.file('favicon.ico', icoBinary);
  webFolder.file('favicon-16x16.png', renderedBuffers.get(16)!);
  webFolder.file('favicon-32x32.png', renderedBuffers.get(32)!);
  webFolder.file('apple-touch-icon.png', renderedBuffers.get(180)!);
  webFolder.file('android-chrome-192x192.png', renderedBuffers.get(192)!);
  webFolder.file('android-chrome-512x512.png', renderedBuffers.get(512)!);

  if (onProgress) onProgress(98, 'Compressing archive...');
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  if (onProgress) onProgress(100, 'Complete');

  return blob;
}
