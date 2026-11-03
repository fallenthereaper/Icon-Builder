/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Encodes an array of PNG images into a standard multi-resolution Windows .ico binary.
 */
export interface IcoImageSource {
  size: number; // 16, 24, 32, 48, 64, 128, 256
  pngBuffer: Uint8Array;
}

/**
 * Creates a valid Windows .ico binary buffer from multiple PNG image buffers.
 * Compliant with Windows 11/10/Vista icon standards.
 */
export function generateIcoBinary(images: IcoImageSource[]): Uint8Array {
  if (images.length === 0) {
    throw new Error('At least one image is required to generate an ICO file.');
  }

  // Sort by size ascending or descending
  const sorted = [...images].sort((a, b) => a.size - b.size);
  const count = sorted.length;

  // Header is 6 bytes: [0, 0] [1, 0] [count, 0]
  const headerSize = 6;
  const dirEntrySize = 16;
  const directorySize = count * dirEntrySize;
  const totalMetaSize = headerSize + directorySize;

  let totalDataSize = 0;
  for (const img of sorted) {
    totalDataSize += img.pngBuffer.byteLength;
  }

  const output = new Uint8Array(totalMetaSize + totalDataSize);
  const view = new DataView(output.buffer);

  // 1. Write Header (ICONDIR)
  view.setUint16(0, 0, true);       // Reserved: must be 0
  view.setUint16(2, 1, true);       // Resource Type: 1 for Icon (2 is Cursor)
  view.setUint16(4, count, true);   // Number of images

  // 2. Write Directory Entries (ICONDIRENTRY) & Image Data
  let currentOffset = totalMetaSize;

  for (let i = 0; i < count; i++) {
    const img = sorted[i];
    const entryOffset = headerSize + i * dirEntrySize;

    // Dimensions: 256 is encoded as 0
    const w = img.size >= 256 ? 0 : img.size;
    const h = img.size >= 256 ? 0 : img.size;
    const dataLen = img.pngBuffer.byteLength;

    output[entryOffset + 0] = w;              // bWidth
    output[entryOffset + 1] = h;              // bHeight
    output[entryOffset + 2] = 0;              // bColorCount (0 for >= 8bpp)
    output[entryOffset + 3] = 0;              // bReserved (must be 0)
    view.setUint16(entryOffset + 4, 1, true); // wPlanes (color planes, 1)
    view.setUint16(entryOffset + 6, 32, true);// wBitCount (32 bits per pixel)
    view.setUint32(entryOffset + 8, dataLen, true);        // dwBytesInRes
    view.setUint32(entryOffset + 12, currentOffset, true); // dwImageOffset

    // Copy PNG bytes into output buffer at currentOffset
    output.set(img.pngBuffer, currentOffset);
    currentOffset += dataLen;
  }

  return output;
}

/**
 * Creates a downloadable Blob for the ICO buffer.
 */
export function createIcoBlob(images: IcoImageSource[]): Blob {
  const binary = generateIcoBinary(images);
  return new Blob([binary.buffer as ArrayBuffer], { type: 'image/x-icon' });
}
