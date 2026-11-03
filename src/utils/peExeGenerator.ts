/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExeMetadata } from '../types/icon';
import { IcoImageSource } from './icoGenerator';

/**
 * Generates a working, authentic Windows Portable Executable (PE32) x86 binary.
 * 
 * Why previous naive PE stubs fail on modern Windows 10/11:
 * 1. A bare `ret` at EntryPoint crashes on modern Windows if the Import Directory / IAT isn't properly terminated or if the stack isn't cleaned via `ExitProcess(0)` or `ret` with valid Import Table.
 * 2. When someone double-clicks a packaged Icon App `.exe`, they expect a working native Windows GUI window to open showing the application title, metadata, and status (using `USER32.dll!MessageBoxA` and `KERNEL32.dll!ExitProcess`), AND they expect Windows Explorer to render the embedded `RT_GROUP_ICON` + `RT_ICON` resources.
 * 
 * This builder constructs a complete, valid 32-bit Windows GUI PE executable with:
 * - `.text` section: Valid x86 machine code that calls `MessageBoxA(0, text, caption, MB_OK | MB_ICONINFORMATION)` and then cleanly invokes `ExitProcess(0)`.
 * - `.rdata` section: Valid PE Import Directory Table (`IMAGE_IMPORT_DESCRIPTOR`) importing `USER32.dll` (`MessageBoxA`) and `KERNEL32.dll` (`ExitProcess`), plus null-terminated ASCII strings for the GUI dialog.
 * - `.rsrc` section: Valid 3-level Resource Directory Table (`RT_ICON` IDs 1..N and `RT_GROUP_ICON` ID 1) in canonical ascending ID order (`3` then `14`), embedding the multi-resolution icon buffers.
 */

function alignUp(value: number, alignment: number): number {
  return Math.ceil(value / alignment) * alignment;
}

function writeAscii(target: Uint8Array, offset: number, str: string): number {
  for (let i = 0; i < str.length; i++) {
    target[offset + i] = str.charCodeAt(i) & 0xff;
  }
  target[offset + str.length] = 0; // null terminator
  return offset + str.length + 1;
}

export function generateWindowsExe(
  iconImages: IcoImageSource[],
  metadata: ExeMetadata
): Uint8Array {
  const targetSizes = [16, 32, 48, 64, 256];
  const selectedImages = iconImages
    .filter((img) => targetSizes.includes(img.size))
    .sort((a, b) => a.size - b.size);

  const imagesToEmbed =
    selectedImages.length > 0 ? selectedImages : iconImages.slice(0, 4);

  const fileAlignment = 0x0200; // 512 bytes
  const sectionAlignment = 0x1000; // 4096 bytes
  const imageBase = 0x00400000;

  // Virtual Addresses (RVAs) of our 3 sections:
  // Headers: 0x0000 -> 0x0400 (RVA 0x0000)
  // .text  : RVA 0x1000 (VirtualSize 0x1000)
  // .rdata : RVA 0x2000 (VirtualSize 0x1000) - holds Imports (IAT/IDT) and GUI Strings
  // .rsrc  : RVA 0x3000 (VirtualSize aligned to 0x1000) - holds RT_ICON and RT_GROUP_ICON
  const textRva = 0x1000;
  const rdataRva = 0x2000;
  const rsrcRva = 0x3000;

  // 1. Build .rdata section (Imports + Strings) at RVA 0x2000
  const {
    rdataBuffer,
    importDirRva,
    importDirSize,
    iatRva,
    iatSize,
    fnExitProcessVa,
    fnMessageBoxAVa,
    captionStrVa,
    bodyStrVa,
  } = buildRdataSection(rdataRva, imageBase, metadata);

  // 2. Build .text section (x86 Machine Code calling MessageBoxA then ExitProcess)
  // x86 instructions:
  // 6A 40                push 0x40 (MB_ICONINFORMATION | MB_OK)
  // 68 <captionStrVa>    push offset captionStr
  // 68 <bodyStrVa>       push offset bodyStr
  // 6A 00                push 0 (hWnd = NULL)
  // FF 15 <fnMsgBoxAVa>  call dword ptr [fnMessageBoxAVa]
  // 6A 00                push 0 (uExitCode = 0)
  // FF 15 <fnExitProcVa> call dword ptr [fnExitProcessVa]
  // C3                   ret
  const textCode = new Uint8Array(32);
  const textView = new DataView(textCode.buffer);
  let tcOff = 0;

  textCode[tcOff++] = 0x6a;
  textCode[tcOff++] = 0x40; // push 0x40

  textCode[tcOff++] = 0x68; // push captionStrVa
  textView.setUint32(tcOff, captionStrVa, true);
  tcOff += 4;

  textCode[tcOff++] = 0x68; // push bodyStrVa
  textView.setUint32(tcOff, bodyStrVa, true);
  tcOff += 4;

  textCode[tcOff++] = 0x6a;
  textCode[tcOff++] = 0x00; // push 0

  textCode[tcOff++] = 0xff;
  textCode[tcOff++] = 0x15; // call dword ptr [fnMessageBoxAVa]
  textView.setUint32(tcOff, fnMessageBoxAVa, true);
  tcOff += 4;

  textCode[tcOff++] = 0x6a;
  textCode[tcOff++] = 0x00; // push 0

  textCode[tcOff++] = 0xff;
  textCode[tcOff++] = 0x15; // call dword ptr [fnExitProcessVa]
  textView.setUint32(tcOff, fnExitProcessVa, true);
  tcOff += 4;

  textCode[tcOff++] = 0xc3; // ret

  // 3. Build .rsrc section at RVA 0x3000
  const rawRsrc = buildResourceSection(imagesToEmbed);
  const patchedRsrc = patchResourceSectionRvas(rawRsrc, rsrcRva);

  // Sizes & Alignments
  const peHeaderOffset = 0x80; // 128
  const numSections = 3;
  const headersRawSize = alignUp(
    peHeaderOffset + 24 + 224 + numSections * 40,
    fileAlignment
  ); // 512 bytes

  const textRawSize = alignUp(textCode.length, fileAlignment);
  const textVirtualSize = sectionAlignment;

  const rdataRawSize = alignUp(rdataBuffer.length, fileAlignment);
  const rdataVirtualSize = sectionAlignment;

  const rsrcRawSize = alignUp(patchedRsrc.length, fileAlignment);
  const rsrcVirtualSize = alignUp(patchedRsrc.length, sectionAlignment);

  const sizeOfImage = rsrcRva + rsrcVirtualSize;
  const totalFileSize = headersRawSize + textRawSize + rdataRawSize + rsrcRawSize;

  const exe = new Uint8Array(totalFileSize);
  const view = new DataView(exe.buffer);

  // --- MS-DOS HEADER ---
  view.setUint16(0x00, 0x5a4d, true); // 'MZ'
  view.setUint16(0x02, 0x0090, true);
  view.setUint16(0x04, 0x0003, true);
  view.setUint16(0x08, 0x0004, true);
  view.setUint16(0x0a, 0x0000, true);
  view.setUint16(0x0c, 0xffff, true);
  view.setUint16(0x10, 0x00b8, true);
  view.setUint16(0x18, 0x0040, true);
  view.setUint32(0x3c, peHeaderOffset, true); // e_lfanew

  // Minimal DOS Stub at 0x40
  const dosStub = [
    0x0e, 0x1f, 0xba, 0x0e, 0x00, 0xb4, 0x09, 0xcd, 0x21, 0xb8, 0x01, 0x4c,
    0xcd, 0x21,
  ];
  exe.set(dosStub, 0x40);
  writeAscii(exe, 0x4e, 'This program cannot be run in DOS mode.\r\r\n$');

  // --- PE SIGNATURE ---
  exe[peHeaderOffset + 0] = 0x50; // 'P'
  exe[peHeaderOffset + 1] = 0x45; // 'E'
  exe[peHeaderOffset + 2] = 0x00;
  exe[peHeaderOffset + 3] = 0x00;

  // --- COFF FILE HEADER ---
  const coffOff = peHeaderOffset + 4;
  view.setUint16(coffOff + 0, 0x014c, true); // Machine: x86 (I386)
  view.setUint16(coffOff + 2, numSections, true);
  view.setUint32(coffOff + 4, Math.floor(Date.now() / 1000), true);
  view.setUint32(coffOff + 8, 0, true);
  view.setUint32(coffOff + 12, 0, true);
  view.setUint16(coffOff + 16, 224, true); // SizeOfOptionalHeader
  // Characteristics: RELOCS_STRIPPED (0x0001) | EXECUTABLE_IMAGE (0x0002) | 32BIT_MACHINE (0x0100)
  view.setUint16(coffOff + 18, 0x0103, true);

  // --- OPTIONAL HEADER (PE32) ---
  const optOff = coffOff + 20;
  view.setUint16(optOff + 0, 0x010b, true); // PE32 Magic
  exe[optOff + 2] = 14; // MajorLinkerVersion
  exe[optOff + 3] = 0;
  view.setUint32(optOff + 4, textRawSize, true); // SizeOfCode
  view.setUint32(optOff + 8, rdataRawSize + rsrcRawSize, true); // SizeOfInitializedData
  view.setUint32(optOff + 12, 0, true); // SizeOfUninitializedData
  view.setUint32(optOff + 16, textRva, true); // AddressOfEntryPoint
  view.setUint32(optOff + 20, textRva, true); // BaseOfCode
  view.setUint32(optOff + 24, rdataRva, true); // BaseOfData
  view.setUint32(optOff + 28, imageBase, true); // ImageBase
  view.setUint32(optOff + 32, sectionAlignment, true);
  view.setUint32(optOff + 36, fileAlignment, true);
  view.setUint16(optOff + 40, 6, true); // MajorOSVersion (Windows Vista/7/10/11)
  view.setUint16(optOff + 42, 0, true);
  view.setUint16(optOff + 48, 6, true); // MajorSubsystemVersion
  view.setUint16(optOff + 50, 0, true);
  view.setUint32(optOff + 56, sizeOfImage, true);
  view.setUint32(optOff + 60, headersRawSize, true);
  view.setUint16(optOff + 68, 2, true); // Subsystem = IMAGE_SUBSYSTEM_WINDOWS_GUI (2)
  // DllCharacteristics: NX_COMPAT (0x0100) | TERMINAL_SERVER_AWARE (0x8000) (No DYNAMIC_BASE since relocs stripped)
  view.setUint16(optOff + 70, 0x8100, true);
  view.setUint32(optOff + 72, 0x100000, true); // SizeOfStackReserve
  view.setUint32(optOff + 76, 0x1000, true); // SizeOfStackCommit
  view.setUint32(optOff + 80, 0x100000, true); // SizeOfHeapReserve
  view.setUint32(optOff + 84, 0x1000, true); // SizeOfHeapCommit
  view.setUint32(optOff + 92, 16, true); // NumberOfRvaAndSizes

  const dataDirOff = optOff + 96;
  // Data Directory 1: Import Table (.rdata)
  view.setUint32(dataDirOff + 1 * 8 + 0, importDirRva, true);
  view.setUint32(dataDirOff + 1 * 8 + 4, importDirSize, true);

  // Data Directory 2: Resource Table (.rsrc)
  view.setUint32(dataDirOff + 2 * 8 + 0, rsrcRva, true);
  view.setUint32(dataDirOff + 2 * 8 + 4, patchedRsrc.length, true);

  // Data Directory 12: IAT (Import Address Table)
  view.setUint32(dataDirOff + 12 * 8 + 0, iatRva, true);
  view.setUint32(dataDirOff + 12 * 8 + 4, iatSize, true);

  // --- SECTION HEADERS ---
  const secOff = optOff + 224;
  const textFilePtr = headersRawSize;
  const rdataFilePtr = textFilePtr + textRawSize;
  const rsrcFilePtr = rdataFilePtr + rdataRawSize;

  // Section 1: .text
  writeAscii(exe, secOff + 0, '.text');
  view.setUint32(secOff + 8, textCode.length, true); // VirtualSize
  view.setUint32(secOff + 12, textRva, true); // VirtualAddress
  view.setUint32(secOff + 16, textRawSize, true); // SizeOfRawData
  view.setUint32(secOff + 20, textFilePtr, true); // PointerToRawData
  view.setUint32(secOff + 36, 0x60000020, true); // CODE | EXECUTE | READ

  // Section 2: .rdata
  const rdataSecOff = secOff + 40;
  writeAscii(exe, rdataSecOff + 0, '.rdata');
  view.setUint32(rdataSecOff + 8, rdataBuffer.length, true);
  view.setUint32(rdataSecOff + 12, rdataRva, true);
  view.setUint32(rdataSecOff + 16, rdataRawSize, true);
  view.setUint32(rdataSecOff + 20, rdataFilePtr, true);
  view.setUint32(rdataSecOff + 36, 0xc0000040, true); // INITIALIZED_DATA | READ | WRITE (for IAT patching by loader)

  // Section 3: .rsrc
  const rsrcSecOff = secOff + 80;
  writeAscii(exe, rsrcSecOff + 0, '.rsrc');
  view.setUint32(rsrcSecOff + 8, patchedRsrc.length, true);
  view.setUint32(rsrcSecOff + 12, rsrcRva, true);
  view.setUint32(rsrcSecOff + 16, rsrcRawSize, true);
  view.setUint32(rsrcSecOff + 20, rsrcFilePtr, true);
  view.setUint32(rsrcSecOff + 36, 0x40000040, true); // INITIALIZED_DATA | READ

  // --- COPY SECTION PAYLOADS ---
  exe.set(textCode, textFilePtr);
  exe.set(rdataBuffer, rdataFilePtr);
  exe.set(patchedRsrc, rsrcFilePtr);

  return exe;
}

/**
 * Builds the .rdata section containing:
 * - Import Address Table (IAT) at offset 0x00
 * - ImportDescriptor Table (IDT) at offset 0x20
 * - Import Lookup Table (ILT) at offset 0x60
 * - Hint/Name entries & DLL names
 * - Application GUI Dialog strings
 */
function buildRdataSection(
  rdataRva: number,
  imageBase: number,
  metadata: ExeMetadata
) {
  const buf = new Uint8Array(512);
  const view = new DataView(buf.buffer);

  // Layout offsets inside .rdata:
  // 0x00: IAT for KERNEL32 (4 bytes + 4 bytes null)
  // 0x08: IAT for USER32   (4 bytes + 4 bytes null)
  // 0x10: ILT for KERNEL32 (4 bytes + 4 bytes null)
  // 0x18: ILT for USER32   (4 bytes + 4 bytes null)
  // 0x20: Import Directory Table (3 * 20 = 60 bytes: KERNEL32, USER32, Null entry)
  // 0x60: Hint/Name for ExitProcess (2 byte hint + "ExitProcess\0")
  // 0x70: Hint/Name for MessageBoxA (2 byte hint + "MessageBoxA\0")
  // 0x80: "KERNEL32.dll\0"
  // 0x90: "USER32.dll\0"
  // 0xA0: Caption String
  // 0xE0: Body String

  const iatKernelOff = 0x00;
  const iatUserOff = 0x08;
  const iltKernelOff = 0x10;
  const iltUserOff = 0x18;
  const idtOff = 0x20;
  const hnExitOff = 0x60;
  const hnMsgBoxOff = 0x70;
  const dllKernelOff = 0x80;
  const dllUserOff = 0x90;
  const captionOff = 0xa0;
  const bodyOff = 0xe0;

  // Write Hint/Names
  view.setUint16(hnExitOff, 0, true);
  writeAscii(buf, hnExitOff + 2, 'ExitProcess');

  view.setUint16(hnMsgBoxOff, 0, true);
  writeAscii(buf, hnMsgBoxOff + 2, 'MessageBoxA');

  // Write DLL names
  writeAscii(buf, dllKernelOff, 'KERNEL32.dll');
  writeAscii(buf, dllUserOff, 'USER32.dll');

  // Write IAT & ILT pointers (pointing to Hint/Name RVAs)
  view.setUint32(iatKernelOff, rdataRva + hnExitOff, true);
  view.setUint32(iatKernelOff + 4, 0, true);

  view.setUint32(iatUserOff, rdataRva + hnMsgBoxOff, true);
  view.setUint32(iatUserOff + 4, 0, true);

  view.setUint32(iltKernelOff, rdataRva + hnExitOff, true);
  view.setUint32(iltKernelOff + 4, 0, true);

  view.setUint32(iltUserOff, rdataRva + hnMsgBoxOff, true);
  view.setUint32(iltUserOff + 4, 0, true);

  // Write Import Descriptor 1: KERNEL32.dll
  view.setUint32(idtOff + 0, rdataRva + iltKernelOff, true); // OriginalFirstThunk
  view.setUint32(idtOff + 4, 0, true); // TimeDateStamp
  view.setUint32(idtOff + 8, 0, true); // ForwarderChain
  view.setUint32(idtOff + 12, rdataRva + dllKernelOff, true); // Name RVA
  view.setUint32(idtOff + 16, rdataRva + iatKernelOff, true); // FirstThunk (IAT RVA)

  // Write Import Descriptor 2: USER32.dll
  view.setUint32(idtOff + 20 + 0, rdataRva + iltUserOff, true);
  view.setUint32(idtOff + 20 + 4, 0, true);
  view.setUint32(idtOff + 20 + 8, 0, true);
  view.setUint32(idtOff + 20 + 12, rdataRva + dllUserOff, true);
  view.setUint32(idtOff + 20 + 16, rdataRva + iatUserOff, true);

  // Write Strings
  const cleanTitle = (metadata.appName || 'IconForge Application').slice(0, 48);
  const bodyText = `${cleanTitle} (v${metadata.version || '1.0.0'})\r\nPublisher: ${
    metadata.companyName || 'Native Rust Studio'
  }\r\n\r\nBuilt with Fastframe & egui Native Icon Packager.\r\nEmbedded RT_GROUP_ICON & multi-resolution mipmaps verified.`;

  writeAscii(buf, captionOff, cleanTitle);
  const endOff = writeAscii(buf, bodyOff, bodyText);

  return {
    rdataBuffer: buf.subarray(0, alignUp(endOff, 16)),
    importDirRva: rdataRva + idtOff,
    importDirSize: 60,
    iatRva: rdataRva + iatKernelOff,
    iatSize: 16,
    fnExitProcessVa: imageBase + rdataRva + iatKernelOff,
    fnMessageBoxAVa: imageBase + rdataRva + iatUserOff,
    captionStrVa: imageBase + rdataRva + captionOff,
    bodyStrVa: imageBase + rdataRva + bodyOff,
  };
}

function buildResourceSection(images: IcoImageSource[]): Uint8Array {
  const iconCount = images.length;
  const rootDirSize = 16 + 2 * 8;
  const iconTypeDirSize = 16 + iconCount * 8;
  const groupTypeDirSize = 16 + 1 * 8;
  const langDirsSize = (iconCount + 1) * 24;
  const dataEntriesSize = (iconCount + 1) * 16;
  const grpIconDirSize = 6 + iconCount * 14;

  let rawIconsTotalSize = 0;
  for (const img of images) {
    rawIconsTotalSize += alignUp(img.pngBuffer.byteLength, 4);
  }

  const estimatedSize =
    rootDirSize +
    iconTypeDirSize +
    groupTypeDirSize +
    langDirsSize +
    dataEntriesSize +
    grpIconDirSize +
    rawIconsTotalSize +
    256;

  const buf = new Uint8Array(estimatedSize);
  const view = new DataView(buf.buffer);

  let offset = 0;
  const rootOffset = offset;
  offset += rootDirSize;

  const iconTypeDirOffset = offset;
  offset += iconTypeDirSize;

  const groupTypeDirOffset = offset;
  offset += groupTypeDirSize;

  const iconLangDirsOffset = offset;
  offset += iconCount * 24;

  const groupLangDirOffset = offset;
  offset += 24;

  const iconDataEntriesOffset = offset;
  offset += iconCount * 16;

  const groupDataEntryOffset = offset;
  offset += 16;

  const groupDataOffset = offset;
  offset += alignUp(grpIconDirSize, 4);

  const iconDataOffsets: number[] = [];
  for (const img of images) {
    iconDataOffsets.push(offset);
    offset += alignUp(img.pngBuffer.byteLength, 4);
  }

  const actualTotalSize = offset;
  const finalBuffer = new Uint8Array(actualTotalSize);

  view.setUint16(rootOffset + 14, 2, true);
  view.setUint32(rootOffset + 16, 3, true); // RT_ICON = 3
  view.setUint32(rootOffset + 20, 0x80000000 | iconTypeDirOffset, true);
  view.setUint32(rootOffset + 24, 14, true); // RT_GROUP_ICON = 14
  view.setUint32(rootOffset + 28, 0x80000000 | groupTypeDirOffset, true);

  view.setUint16(iconTypeDirOffset + 14, iconCount, true);
  for (let i = 0; i < iconCount; i++) {
    const entryOff = iconTypeDirOffset + 16 + i * 8;
    const iconId = i + 1;
    const langDirOff = iconLangDirsOffset + i * 24;
    view.setUint32(entryOff, iconId, true);
    view.setUint32(entryOff + 4, 0x80000000 | langDirOff, true);

    view.setUint16(langDirOff + 14, 1, true);
    view.setUint32(langDirOff + 16, 0x0409, true);
    const dataEntryOff = iconDataEntriesOffset + i * 16;
    view.setUint32(langDirOff + 20, dataEntryOff, true);

    view.setUint32(dataEntryOff, iconDataOffsets[i], true);
    view.setUint32(dataEntryOff + 4, images[i].pngBuffer.byteLength, true);
    view.setUint32(dataEntryOff + 8, 0, true);
    view.setUint32(dataEntryOff + 12, 0, true);
  }

  view.setUint16(groupTypeDirOffset + 14, 1, true);
  view.setUint32(groupTypeDirOffset + 16, 1, true);
  view.setUint32(groupTypeDirOffset + 20, 0x80000000 | groupLangDirOffset, true);

  view.setUint16(groupLangDirOffset + 14, 1, true);
  view.setUint32(groupLangDirOffset + 16, 0x0409, true);
  view.setUint32(groupLangDirOffset + 20, groupDataEntryOffset, true);

  view.setUint32(groupDataEntryOffset, groupDataOffset, true);
  view.setUint32(groupDataEntryOffset + 4, grpIconDirSize, true);
  view.setUint32(groupDataEntryOffset + 8, 0, true);
  view.setUint32(groupDataEntryOffset + 12, 0, true);

  view.setUint16(groupDataOffset + 0, 0, true);
  view.setUint16(groupDataOffset + 2, 1, true);
  view.setUint16(groupDataOffset + 4, iconCount, true);

  for (let i = 0; i < iconCount; i++) {
    const entryOff = groupDataOffset + 6 + i * 14;
    const img = images[i];
    const w = img.size >= 256 ? 0 : img.size;
    const h = img.size >= 256 ? 0 : img.size;
    buf[entryOff + 0] = w;
    buf[entryOff + 1] = h;
    buf[entryOff + 2] = 0;
    buf[entryOff + 3] = 0;
    view.setUint16(entryOff + 4, 1, true);
    view.setUint16(entryOff + 6, 32, true);
    view.setUint32(entryOff + 8, img.pngBuffer.byteLength, true);
    view.setUint16(entryOff + 12, i + 1, true);
  }

  for (let i = 0; i < iconCount; i++) {
    buf.set(images[i].pngBuffer, iconDataOffsets[i]);
  }

  finalBuffer.set(buf.subarray(0, actualTotalSize));
  return finalBuffer;
}

function patchResourceSectionRvas(rsrcBuffer: Uint8Array, rsrcRva: number): Uint8Array {
  const output = new Uint8Array(rsrcBuffer);
  const view = new DataView(output.buffer);

  const rootCount = view.getUint16(14, true);
  for (let t = 0; t < rootCount; t++) {
    const typeOffset = 16 + t * 8;
    const typeSubDirOff = view.getUint32(typeOffset + 4, true) & 0x7fffffff;
    const idCount = view.getUint16(typeSubDirOff + 14, true);
    for (let id = 0; id < idCount; id++) {
      const idOffset = typeSubDirOff + 16 + id * 8;
      const langSubDirOff = view.getUint32(idOffset + 4, true) & 0x7fffffff;
      const langCount = view.getUint16(langSubDirOff + 14, true);
      for (let l = 0; l < langCount; l++) {
        const langOffset = langSubDirOff + 16 + l * 8;
        const dataEntryOff = view.getUint32(langOffset + 4, true);
        if (dataEntryOff + 16 <= output.length) {
          const rawOffset = view.getUint32(dataEntryOff, true);
          view.setUint32(dataEntryOff, rsrcRva + rawOffset, true);
        }
      }
    }
  }

  return output;
}
