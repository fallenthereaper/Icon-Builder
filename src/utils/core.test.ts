/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getSuperellipsePoints } from './squircle';
import { generateIcoBinary } from './icoGenerator';
import { generateIcnsBinary } from './icnsGenerator';
import { generateWindowsExe } from './peExeGenerator';
import { generateRustFastframeSource } from './rustProjectGenerator';
import { DEFAULT_ICON_CONFIG } from '../presets/iconPresets';

test('Squircle: generates valid superellipse points array', () => {
  const points = getSuperellipsePoints({ x: 0, y: 0, width: 100, height: 100 }, 4.5, 32);
  assert.equal(points.length, 32);
  for (const pt of points) {
    assert.ok(pt.x >= -0.01 && pt.x <= 100.01);
    assert.ok(pt.y >= -0.01 && pt.y <= 100.01);
  }
});

test('ICO Generator: produces valid ICONDIR header and directory entries', () => {
  const fakePng16 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
  const fakePng32 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x02, 0x03]);

  const images = [
    { size: 16, pngBuffer: fakePng16 },
    { size: 32, pngBuffer: fakePng32 },
  ];

  const ico = generateIcoBinary(images);
  const view = new DataView(ico.buffer);

  assert.equal(view.getUint16(0, true), 0);
  assert.equal(view.getUint16(2, true), 1);
  assert.equal(view.getUint16(4, true), 2);
  assert.equal(ico[6], 16);
  assert.equal(ico[7], 16);
  assert.equal(ico[22], 32);
  assert.equal(ico[23], 32);
});

test('ICNS Generator: produces valid Apple icns magic header and big-endian OSType chunks', () => {
  const fakePng32 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const fakePng1024 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff]);

  const icns = generateIcnsBinary([
    { size: 32, pngBuffer: fakePng32 },
    { size: 1024, pngBuffer: fakePng1024 },
  ]);
  const view = new DataView(icns.buffer);

  const magic = String.fromCharCode(icns[0], icns[1], icns[2], icns[3]);
  assert.equal(magic, 'icns');
  assert.equal(view.getUint32(4, false), icns.byteLength);

  // First chunk should be 'icp5' (32x32)
  const chunk1Type = String.fromCharCode(icns[8], icns[9], icns[10], icns[11]);
  assert.equal(chunk1Type, 'icp5');
  assert.equal(view.getUint32(12, false), 8 + fakePng32.length);
});

test('PE EXE Generator: builds valid 3-section PE32 binary (.text, .rdata IAT, .rsrc)', () => {
  const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
  const images = [{ size: 32, pngBuffer: fakePng }];
  const metadata = {
    fileName: 'testapp',
    appName: 'Test Application',
    companyName: 'Native Corp',
    version: '1.0.0.0',
    description: 'Test Exe',
    windowTitle: 'Test Window',
  };

  const exe = generateWindowsExe(images, metadata);
  const view = new DataView(exe.buffer);

  // Check DOS header: 'MZ' (0x5A4D)
  assert.equal(view.getUint16(0, true), 0x5a4d);

  // Check e_lfanew offset (offset 0x3c)
  const peOffset = view.getUint32(0x3c, true);
  assert.equal(peOffset, 128);

  // Check PE Signature: 'PE\0\0'
  const sig = String.fromCharCode(exe[peOffset], exe[peOffset + 1], exe[peOffset + 2], exe[peOffset + 3]);
  assert.equal(sig, 'PE\0\0');

  // Check Machine: 0x014c (x86) and 3 sections (.text, .rdata, .rsrc)
  assert.equal(view.getUint16(peOffset + 4, true), 0x014c);
  assert.equal(view.getUint16(peOffset + 6, true), 3);

  // Check Subsystem: 2 (Windows GUI)
  assert.equal(view.getUint16(peOffset + 24 + 68, true), 2);

  // Verify Import Directory RVA is populated in DataDirectory[1]
  const importDirRva = view.getUint32(peOffset + 24 + 96 + 8, true);
  assert.ok(importDirRva > 0x2000);
});

test('Rust Fastframe Generator: outputs valid Cargo.toml with egui and crmne/fastframe dependencies', () => {
  const metadata = {
    fileName: 'iconforge_pro',
    appName: 'IconForge Pro',
    companyName: 'Fastframe Studio',
    version: '1.2.0',
    description: 'Native Rust Icon Tool',
    windowTitle: 'IconForge Pro',
  };
  const project = generateRustFastframeSource(DEFAULT_ICON_CONFIG, metadata);
  assert.ok(project.cargoToml.includes('egui = "0.36.2"'));
  assert.ok(project.cargoToml.includes('https://github.com/crmne/fastframe'));
  assert.ok(project.mainRs.includes('use fastframe_fonts::{FontSetup, Weight};'));
});
