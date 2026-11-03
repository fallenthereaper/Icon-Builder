/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Standard vector glyph paths for developer & app icon generation.
 * All paths are normalized in a 24x24 viewBox.
 */
export interface GlyphDefinition {
  name: string;
  category: string;
  paths: string[];
}

export const VECTOR_GLYPHS: Record<string, GlyphDefinition> = {
  Layers: {
    name: 'Layers / Architecture',
    category: 'Development',
    paths: [
      'M12 2L2 7l10 5 10-5-10-5z',
      'M2 17l10 5 10-5',
      'M2 12l10 5 10-5',
    ],
  },
  Terminal: {
    name: 'Terminal / CLI',
    category: 'Development',
    paths: [
      'M4 17l6-6-6-6',
      'M12 19h8',
    ],
  },
  Code2: {
    name: 'Code / Brackets',
    category: 'Development',
    paths: [
      'M18 16l4-4-4-4',
      'M6 8l-4 4 4 4',
      'M14.5 4l-5 16',
    ],
  },
  Cpu: {
    name: 'Processor / Core',
    category: 'System',
    paths: [
      'M4 4h16v16H4z',
      'M9 9h6v6H9z',
      'M9 1v3', 'M15 1v3',
      'M9 20v3', 'M15 20v3',
      'M20 9h3', 'M20 14h3',
      'M1 9h3', 'M1 14h3',
    ],
  },
  Database: {
    name: 'Database / SQL',
    category: 'Backend',
    paths: [
      'M21 5c0 1.66-4 3-9 3s-9-1.34-9-3 4-3 9-3 9 1.34 9 3z',
      'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5',
      'M3 12c0 1.66 4 3 9 3s9-1.34 9-3',
    ],
  },
  Rocket: {
    name: 'Rocket / Deploy',
    category: 'Workflow',
    paths: [
      'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z',
      'M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z',
      'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0',
      'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5',
    ],
  },
  ShieldCheck: {
    name: 'Security Shield',
    category: 'Security',
    paths: [
      'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      'M9 12l2 2 4-4',
    ],
  },
  Sparkles: {
    name: 'AI Intelligence',
    category: 'Modern',
    paths: [
      'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
      'M20 3v4', 'M22 5h-4',
      'M4 17v2', 'M5 18H3',
    ],
  },
  CloudLightning: {
    name: 'Cloud / Serverless',
    category: 'Cloud',
    paths: [
      'M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973',
      'M13 12l-3 5h4l-3 5',
    ],
  },
  Box: {
    name: 'Package / Module',
    category: 'Development',
    paths: [
      'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
      'M3.27 6.96L12 12.01l8.73-5.05',
      'M12 22.08V12',
    ],
  },
  Globe: {
    name: 'Web / Browser',
    category: 'Networking',
    paths: [
      'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
      'M2 12h20',
      'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
    ],
  },
  Gamepad2: {
    name: 'Game / Engine',
    category: 'Media',
    paths: [
      'M6 12h4', 'M8 10v4',
      'M15 13h.01', 'M18 11h.01',
      'M18 11a4 4 0 0 0-4-4H10a4 4 0 0 0-4 4v2a4 4 0 0 0 2 3.46l1.2.6a2 2 0 0 0 1.8 0l1-.5a2 2 0 0 1 2 0l1 .5a2 2 0 0 0 1.8 0l1.2-.6A4 4 0 0 0 20 13v-2z',
    ],
  },
};
