/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedIcoImage {
  width: number;
  height: number;
  colorPlanes: number;
  bitCount: number;
  bytesLength: number;
  dataUrl: string;
  isPng: boolean;
}

/**
 * Parses an uploaded .ico file buffer and extracts all contained icons.
 */
export function parseIcoBinary(buffer: ArrayBuffer): ParsedIcoImage[] {
  if (buffer.byteLength < 6) {
    throw new Error('Invalid ICO file: Buffer too short for header.');
  }

  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const reserved = view.getUint16(0, true);
  const type = view.getUint16(2, true);
  const count = view.getUint16(4, true);

  if (reserved !== 0 || (type !== 1 && type !== 2)) {
    throw new Error('Invalid ICO/CUR format: signature mismatch.');
  }

  const results: ParsedIcoImage[] = [];

  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    if (entryOffset + 16 > buffer.byteLength) break;

    let w = bytes[entryOffset];
    let h = bytes[entryOffset + 1];
    if (w === 0) w = 256;
    if (h === 0) h = 256;

    const colorPlanes = view.getUint16(entryOffset + 4, true);
    const bitCount = view.getUint16(entryOffset + 6, true);
    const bytesInRes = view.getUint32(entryOffset + 8, true);
    const imageOffset = view.getUint32(entryOffset + 12, true);

    if (imageOffset + bytesInRes > buffer.byteLength) {
      continue;
    }

    const imgBytes = bytes.slice(imageOffset, imageOffset + bytesInRes);

    // Check if it's PNG (signature: 0x89, 'P', 'N', 'G')
    const isPng =
      imgBytes.length >= 8 &&
      imgBytes[0] === 0x89 &&
      imgBytes[1] === 0x50 &&
      imgBytes[2] === 0x4e &&
      imgBytes[3] === 0x47;

    let mimeType = 'image/png';
    let dataUrl = '';

    if (isPng) {
      const blob = new Blob([imgBytes], { type: 'image/png' });
      dataUrl = URL.createObjectURL(blob);
    } else {
      // It's a Windows DIB/BMP stream. Construct a BMP file header if needed or convert.
      // A BMP header is 14 bytes: 'BM' + size + reserved + offset to pixel data.
      // For standard ICO DIB, the BITMAPINFOHEADER height is double (XOR + AND mask).
      mimeType = 'image/bmp';
      const dibHeaderSize = view.getUint32(imageOffset, true);
      // Construct a valid BMP blob
      const bmpHeader = new Uint8Array(14);
      bmpHeader[0] = 0x42; // 'B'
      bmpHeader[1] = 0x4d; // 'M'
      const totalBmpSize = 14 + bytesInRes;
      const bmpView = new DataView(bmpHeader.buffer);
      bmpView.setUint32(2, totalBmpSize, true);
      bmpView.setUint32(10, 14 + dibHeaderSize, true); // offset

      const combined = new Uint8Array(totalBmpSize);
      combined.set(bmpHeader, 0);
      combined.set(imgBytes, 14);

      const blob = new Blob([combined], { type: 'image/bmp' });
      dataUrl = URL.createObjectURL(blob);
    }

    results.push({
      width: w,
      height: h,
      colorPlanes,
      bitCount,
      bytesLength: bytesInRes,
      dataUrl,
      isPng,
    });
  }

  return results.sort((a, b) => b.width - a.width);
}
