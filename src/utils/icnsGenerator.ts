/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates an Apple macOS .icns binary file.
 * Supports modern PNG-encoded ICNS chunks:
 * - 'icp4' (16x16)
 * - 'icp5' (32x32)
 * - 'icp6' (64x64)
 * - 'ic07' (128x128)
 * - 'ic08' (256x256)
 * - 'ic09' (512x512)
 * - 'ic10' (1024x1024 / 512x512@2x Retina)
 */

export interface IcnsImageSource {
  size: number;
  pngBuffer: Uint8Array;
}

const ICNS_OSTYPE_MAP: Record<number, string> = {
  16: 'icp4',
  32: 'icp5',
  64: 'icp6',
  128: 'ic07',
  256: 'ic08',
  512: 'ic09',
  1024: 'ic10',
};

export function generateIcnsBinary(images: IcnsImageSource[]): Uint8Array {
  const validChunks = images.filter((img) => Boolean(ICNS_OSTYPE_MAP[img.size]));
  if (validChunks.length === 0) {
    throw new Error('At least one supported ICNS resolution (16..1024) is required.');
  }

  // Header is 8 bytes: 'icns' (4 bytes) + total file length (4 bytes big-endian)
  // Each chunk has: OSType (4 bytes) + chunk length (4 bytes big-endian, includes 8-byte header) + png data
  let totalLength = 8;
  for (const chunk of validChunks) {
    totalLength += 8 + chunk.pngBuffer.byteLength;
  }

  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);

  // Write 'icns' magic
  output[0] = 0x69; // 'i'
  output[1] = 0x63; // 'c'
  output[2] = 0x6e; // 'n'
  output[3] = 0x73; // 's'
  view.setUint32(4, totalLength, false); // Big-endian total size

  let offset = 8;
  for (const chunk of validChunks) {
    const osType = ICNS_OSTYPE_MAP[chunk.size];
    const chunkLen = 8 + chunk.pngBuffer.byteLength;

    for (let i = 0; i < 4; i++) {
      output[offset + i] = osType.charCodeAt(i);
    }
    view.setUint32(offset + 4, chunkLen, false); // Big-endian chunk size
    output.set(chunk.pngBuffer, offset + 8);
    offset += chunkLen;
  }

  return output;
}

export function createIcnsBlob(images: IcnsImageSource[]): Blob {
  const bin = generateIcnsBinary(images);
  return new Blob([bin.buffer as ArrayBuffer], { type: 'image/x-icns' });
}
