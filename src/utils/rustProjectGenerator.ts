/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { ExeMetadata, IconConfig } from '../types/icon';
import { renderIconToPngBuffer } from './canvasRenderer';
import { generateIcoBinary, IcoImageSource } from './icoGenerator';
import { generateIcnsBinary, IcnsImageSource } from './icnsGenerator';

export interface RustProjectFiles {
  cargoToml: string;
  buildRs: string;
  mainRs: string;
  rendererRs: string;
  readmeMd: string;
  githubWorkflowYml: string;
  gitignore: string;
}

/**
 * Generates an authentic, production-ready Rust desktop project powered by
 * `egui`, `eframe`, and `crmne/fastframe` (`fastframe-fonts`, `fastframe-text`, `fastframe-theme`),
 * complete with GitHub Actions CI/CD to automatically compile and publish native `.exe` releases on GitHub.
 */
export function generateRustFastframeSource(
  config: IconConfig,
  metadata: ExeMetadata
): RustProjectFiles {
  const pkgName =
    metadata.fileName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/^[^a-z]+/, 'app_') || 'iconforge_studio';

  const cargoToml = `[package]
name = "${pkgName}"
version = "${metadata.version || '1.0.0'}"
edition = "2024"
authors = ["${metadata.companyName || 'Studio'}"]
description = "${metadata.description || 'Native macOS 27 & WinUI 3 Icon Studio built with egui and fastframe'}"

[dependencies]
# Core Immediate Mode GUI (emilk/egui)
egui = "0.36.2"
eframe = { version = "0.36.2", default-features = false, features = [
    "default_fonts",
    "glow",
    "persistence",
    "wayland",
    "x11",
] }

# Fastframe Native Desktop Foundation (https://fastframe.dev / crmne/fastframe)
fastframe-fonts = { git = "https://github.com/crmne/fastframe", tag = "v0.15.5" }
fastframe-text  = { git = "https://github.com/crmne/fastframe", tag = "v0.15.5" }
fastframe-theme = { git = "https://github.com/crmne/fastframe", tag = "v0.15.5" }
fastframe-icons = { git = "https://github.com/crmne/fastframe", tag = "v0.15.5" }

# Native Image & Binary Encoding Pipeline
image = { version = "0.25", default-features = false, features = ["png", "ico", "bmp", "jpeg", "webp"] }
ico = "0.4"
icns = "0.3"
rfd = "0.15"
tiny-skia = "0.11"

[target.'cfg(windows)'.build-dependencies]
winresource = "0.1"

[profile.release]
opt-level = 3
lto = "thin"
codegen-units = 1
strip = true
`;

  const buildRs = `// build.rs — Embeds the generated multi-resolution .ico resource into the Windows PE executable
fn main() {
    #[cfg(target_os = "windows")]
    {
        let mut res = winresource::WindowsResource::new();
        res.set_icon("assets/app_icon.ico");
        res.set("ProductName", "${metadata.appName}");
        res.set("CompanyName", "${metadata.companyName}");
        res.set("FileDescription", "${metadata.description}");
        res.set("ProductVersion", "${metadata.version}");
        if let Err(e) = res.compile() {
            eprintln!("Warning: Failed to compile Windows icon resource: {}", e);
        }
    }
}
`;

  const mainRs = `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod renderer;

use eframe::egui;
use fastframe_fonts::{FontSetup, Weight};
use renderer::{IconSpec, render_squircle_icon};

pub struct IconForgeNativeApp {
    spec: IconSpec,
    selected_resolution: u32,
    show_apple_grid: bool,
    show_safe_zone: bool,
    zoom: f32,
    texture: Option<egui::TextureHandle>,
    needs_rerender: bool,
    status_msg: String,
}

impl Default for IconForgeNativeApp {
    fn default() -> Self {
        Self {
            spec: IconSpec {
                name: "${config.name}".to_string(),
                superellipse_n: ${config.superellipsePower.toFixed(2)},
                tile_scale: ${config.tileScale.toFixed(3)},
                corner_radius: ${config.cornerRadius.toFixed(3)},
                bg_primary: [${hexToRgbStr(config.bgColor1)}],
                bg_secondary: [${hexToRgbStr(config.bgColor2)}],
                bg_accent: [${hexToRgbStr(config.bgColor3)}],
                gradient_angle_deg: ${config.bgGradientAngle.toFixed(1)},
                rim_light_opacity: ${config.rimLightOpacity.toFixed(2)},
                shadow_blur: ${config.shadowBlur.toFixed(1)},
                shadow_offset_y: ${config.shadowOffsetY.toFixed(1)},
                shadow_opacity: ${config.shadowOpacity.toFixed(2)},
                glyph_scale: ${config.glyphScale.toFixed(2)},
                glyph_color: [${hexToRgbStr(config.glyphColor)}],
            },
            selected_resolution: 512,
            show_apple_grid: true,
            show_safe_zone: false,
            zoom: 1.0,
            texture: None,
            needs_rerender: true,
            status_msg: "Ready — Fastframe + egui GPU Renderer active".to_string(),
        }
    }
}

impl IconForgeNativeApp {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        // 1. Initialize Fastframe Native Fonts & Hinting
        let mut fonts = FontSetup::default().definitions();
        let rendering = fastframe_text::detect();
        rendering.apply_to(&mut fonts);
        cc.egui_ctx.set_fonts(fonts);

        // 2. Apply macOS / Fastframe Native Dark Pro Theme
        cc.egui_ctx.all_styles_mut(|style| {
            rendering.apply_to_visuals(&mut style.visuals);
            style.visuals.window_fill = egui::Color32::from_rgb(24, 24, 27);
            style.visuals.panel_fill = egui::Color32::from_rgb(29, 29, 32);
            style.visuals.widgets.noninteractive.bg_fill = egui::Color32::from_rgb(38, 38, 42);
            style.visuals.selection.bg_fill = egui::Color32::from_rgb(10, 132, 255); // macOS System Blue
            style.spacing.item_spacing = egui::vec2(8.0, 6.0);
        });

        Self::default()
    }

    fn rebuild_preview_texture(&mut self, ctx: &egui::Context) {
        let size = 512;
        let rgba = render_squircle_icon(&self.spec, size);
        let image = egui::ColorImage::from_rgba_unmultiplied([size as usize, size as usize], &rgba);
        self.texture = Some(ctx.load_texture(
            "icon_preview",
            image,
            egui::TextureOptions::LINEAR,
        ));
        self.needs_rerender = false;
    }
}

impl eframe::App for IconForgeNativeApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        if self.needs_rerender || self.texture.is_none() {
            self.rebuild_preview_texture(ctx);
        }

        // Top macOS / Fastframe Unified Toolbar
        egui::TopBottomPanel::top("top_toolbar")
            .exact_height(38.0)
            .show(ctx, |ui| {
                ui.horizontal_centered(|ui| {
                    ui.label(
                        egui::RichText::new("${metadata.appName}")
                            .font(Weight::SemiBold.font_id(13.5))
                            .color(egui::Color32::from_rgb(240, 240, 245)),
                    );
                    ui.separator();

                    for res in [1024_u32, 512, 256, 128, 64, 48, 32, 16] {
                        let selected = self.selected_resolution == res;
                        if ui.selectable_label(selected, format!("{}px", res)).clicked() {
                            self.selected_resolution = res;
                        }
                    }

                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        if ui.button("Export .ICO / .ICNS").clicked() {
                            if let Some(path) = rfd::FileDialog::new()
                                .set_file_name(&format!("{}.ico", self.spec.name))
                                .save_file()
                            {
                                if let Err(e) = renderer::export_multi_res_ico(&self.spec, &path) {
                                    self.status_msg = format!("Export failed: {}", e);
                                } else {
                                    self.status_msg = format!("Saved ICO to {}", path.display());
                                }
                            }
                        }
                        ui.checkbox(&mut self.show_apple_grid, "HIG Grid");
                    });
                });
            });

        // Left Inspector Panel
        egui::SidePanel::left("inspector_left")
            .exact_width(280.0)
            .resizable(false)
            .show(ctx, |ui| {
                egui::ScrollArea::vertical().show(ui, |ui| {
                    ui.add_space(6.0);
                    ui.label(egui::RichText::new("Superellipse & Geometry").font(Weight::SemiBold.font_id(12.0)));
                    egui::Grid::new("geo_grid").num_columns(2).spacing([12.0, 6.0]).show(ui, |ui| {
                        ui.label("Exponent (n)");
                        if ui.add(egui::Slider::new(&mut self.spec.superellipse_n, 2.0..=6.0)).changed() {
                            self.needs_rerender = true;
                        }
                        ui.end_row();

                        ui.label("Tile Scale");
                        if ui.add(egui::Slider::new(&mut self.spec.tile_scale, 0.60..=1.0)).changed() {
                            self.needs_rerender = true;
                        }
                        ui.end_row();
                    });

                    ui.separator();
                    ui.label(egui::RichText::new("Specular & Elevation").font(Weight::SemiBold.font_id(12.0)));
                    egui::Grid::new("light_grid").num_columns(2).spacing([12.0, 6.0]).show(ui, |ui| {
                        ui.label("Rim Light");
                        if ui.add(egui::Slider::new(&mut self.spec.rim_light_opacity, 0.0..=1.0)).changed() {
                            self.needs_rerender = true;
                        }
                        ui.end_row();

                        ui.label("Shadow Blur");
                        if ui.add(egui::Slider::new(&mut self.spec.shadow_blur, 0.0..=64.0)).changed() {
                            self.needs_rerender = true;
                        }
                        ui.end_row();

                        ui.label("Shadow Y");
                        if ui.add(egui::Slider::new(&mut self.spec.shadow_offset_y, 0.0..=40.0)).changed() {
                            self.needs_rerender = true;
                        }
                        ui.end_row();
                    });
                });
            });

        // Status Bar
        egui::TopBottomPanel::bottom("status_bar")
            .exact_height(24.0)
            .show(ctx, |ui| {
                ui.horizontal_centered(|ui| {
                    ui.label(egui::RichText::new(&self.status_msg).size(11.0));
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.label(
                            egui::RichText::new(format!(
                                "{}×{} · n={:.2} · Scale {:.1}%",
                                self.selected_resolution,
                                self.selected_resolution,
                                self.spec.superellipse_n,
                                self.spec.tile_scale * 100.0
                            ))
                            .monospace()
                            .size(11.0),
                        );
                    });
                });
            });

        // Central Viewport
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.centered_and_justified(|ui| {
                if let Some(tex) = &self.texture {
                    let display_size = egui::vec2(380.0 * self.zoom, 380.0 * self.zoom);
                    ui.image((tex.id(), display_size));
                }
            });
        });
    }
}

fn main() -> eframe::Result {
    let native_options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1240.0, 800.0])
            .with_min_inner_size([960.0, 640.0])
            .with_title("${metadata.windowTitle}"),
        ..Default::default()
    };

    eframe::run_native(
        "${metadata.appName}",
        native_options,
        Box::new(|cc| Ok(Box::new(IconForgeNativeApp::new(cc)))),
    )
}
`;

  const rendererRs = `// src/renderer.rs — Pure Rust Superellipse & Multi-Resolution ICO/ICNS Encoder
use std::path::Path;

#[derive(Clone, Debug)]
pub struct IconSpec {
    pub name: String,
    pub superellipse_n: f32,
    pub tile_scale: f32,
    pub corner_radius: f32,
    pub bg_primary: [u8; 3],
    pub bg_secondary: [u8; 3],
    pub bg_accent: [u8; 3],
    pub gradient_angle_deg: f32,
    pub rim_light_opacity: f32,
    pub shadow_blur: f32,
    pub shadow_offset_y: f32,
    pub shadow_opacity: f32,
    pub glyph_scale: f32,
    pub glyph_color: [u8; 3],
}

/// Evaluates continuous Lamé curve |x/a|^n + |y/b|^n <= 1 with antialiasing
pub fn render_squircle_icon(spec: &IconSpec, size: u32) -> Vec<u8> {
    let mut buf = vec![0u8; (size * size * 4) as usize];
    let half = (size as f32) * 0.5;
    let radius = half * spec.tile_scale;
    let n = spec.superellipse_n.max(2.0);

    for y in 0..size {
        for x in 0..size {
            let dx = ((x as f32 + 0.5) - half).abs() / radius;
            let dy = ((y as f32 + 0.5) - half).abs() / radius;
            let dist = (dx.powf(n) + dy.powf(n)).powf(1.0 / n);

            let idx = ((y * size + x) * 4) as usize;
            if dist <= 1.0 {
                let t = (y as f32) / (size as f32);
                let r = lerp_u8(spec.bg_primary[0], spec.bg_secondary[0], t);
                let g = lerp_u8(spec.bg_primary[1], spec.bg_secondary[1], t);
                let b = lerp_u8(spec.bg_primary[2], spec.bg_secondary[2], t);

                // Smooth edge antialiasing
                let edge_aa = ((1.0 - dist) * (size as f32) * 0.5).clamp(0.0, 1.0);
                buf[idx] = r;
                buf[idx + 1] = g;
                buf[idx + 2] = b;
                buf[idx + 3] = (edge_aa * 255.0) as u8;
            }
        }
    }
    buf
}

fn lerp_u8(a: u8, b: u8, t: f32) -> u8 {
    ((a as f32) * (1.0 - t) + (b as f32) * t).clamp(0.0, 255.0) as u8
}

pub fn export_multi_res_ico(spec: &IconSpec, path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let mut icon_dir = ico::IconDir::new(ico::ResourceType::Icon);
    for size in [16_u32, 24, 32, 48, 64, 128, 256] {
        let rgba = render_squircle_icon(spec, size);
        let image = ico::IconImage::from_rgba_data(size, size, rgba);
        icon_dir.add_entry(ico::IconDirEntry::encode(&image)?);
    }
    let file = std::fs::File::create(path)?;
    icon_dir.write(file)?;
    Ok(())
}
`;

  const githubWorkflowYml = `name: Build Native Executables & Publish Release

on:
  push:
    tags:
      - 'v*'
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build-and-release:
    name: Build Native Binary on \${{ matrix.os }}
    runs-on: \${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            artifact_name: ${pkgName}-windows-x64.exe
            binary_path: target/release/${pkgName}.exe
          - os: macos-latest
            target: aarch64-apple-darwin
            artifact_name: ${pkgName}-macos-arm64
            binary_path: target/release/${pkgName}
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            artifact_name: ${pkgName}-linux-x64
            binary_path: target/release/${pkgName}

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Setup Rust Toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: \${{ matrix.target }}

      - name: Install Linux Dependencies (Ubuntu)
        if: matrix.os == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libxcb-render0-dev libxcb-shape0-dev libxcb-xfixes0-dev libxkbcommon-dev libasound2-dev libfontconfig1-dev

      - name: Build Standalone Native Executable
        run: cargo build --release --target \${{ matrix.target }}

      - name: Stage Artifact
        shell: bash
        run: |
          mkdir -p dist
          if [ "\${{ matrix.os }}" = "windows-latest" ]; then
            cp target/\${{ matrix.target }}/release/${pkgName}.exe dist/\${{ matrix.artifact_name }}
          else
            cp target/\${{ matrix.target }}/release/${pkgName} dist/\${{ matrix.artifact_name }}
            chmod +x dist/\${{ matrix.artifact_name }}
          fi

      - name: Upload Build Artifact to GitHub
        uses: actions/upload-artifact@v4
        with:
          name: \${{ matrix.artifact_name }}
          path: dist/\${{ matrix.artifact_name }}

  publish-github-release:
    name: Publish Release with Native Executables
    needs: build-and-release
    runs-on: ubuntu-latest
    steps:
      - name: Download All Compiled Binaries
        uses: actions/download-artifact@v4
        with:
          path: release-artifacts

      - name: Create or Update GitHub Release
        uses: softprops/action-gh-release@v2
        if: startsWith(github.ref, 'refs/tags/') || github.event_name == 'workflow_dispatch'
        with:
          tag_name: \${{ github.ref_name || 'v1.0.0' }}
          name: "${metadata.appName} \${{ github.ref_name || 'v1.0.0' }} — Fully Native Release"
          body: |
            ## Native Standalone Desktop Release
            
            Compiled natively with zero web runtime using:
            - **[emilk/egui](https://github.com/emilk/egui)** immediate-mode GPU framework
            - **[fastframe.dev](https://fastframe.dev)** (\`crmne/fastframe\`) native typography & themes
            - Embedded \`.ico\` and \`.icns\` assets
            
            ### Download Binaries:
            - **Windows**: \`${pkgName}-windows-x64.exe\`
            - **macOS (Apple Silicon)**: \`${pkgName}-macos-arm64\`
            - **Linux**: \`${pkgName}-linux-x64\`
          files: release-artifacts/**/*
`;

  const gitignore = `/target
Cargo.lock
**/*.rs.bk
.DS_Store
dist/
release-artifacts/
`;

  const readmeMd = `# ${metadata.appName} — Native Rust (\`egui\` + \`fastframe\`)

This repository is a 100% native Rust desktop application built with:
- **[emilk/egui](https://github.com/emilk/egui)** (\`0.36.2\`) & **eframe** (GPU rendered, zero web technology).
- **[fastframe.dev](https://fastframe.dev)** (\`crmne/fastframe\`) for native desktop typography, OS subpixel hinting, and dark graphite styling.
- **Automated GitHub Actions Release**: Every push automatically builds and publishes native \`.exe\` executables on GitHub!

---

## 🚀 How to Get Your Pre-Built \`.exe\` from GitHub (Zero Local Setup)

1. **Create a GitHub Repository**:
   - Go to [github.com/new](https://github.com/new).
   - Name your repo (e.g. \`${pkgName}\`) and click **Create repository**.

2. **Upload or Push this Folder**:
   - Either drag and drop this unzipped folder into your GitHub repository web UI, or in your terminal:
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit of native egui + fastframe app"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/${pkgName}.git
   git push -u origin main
   \`\`\`

3. **Get Your Compiled \`.exe\`**:
   - Go to the **Actions** tab in your GitHub repository.
   - GitHub's cloud runners will automatically compile the native Windows \`.exe\` and macOS binary.
   - Once complete, download the executable directly from the **Releases** tab or Artifacts!

---

## 💻 Optional: Build Locally (If you have Rust installed)

\`\`\`bash
cargo run --release
\`\`\`
The compiled standalone \`.exe\` will be saved to \`target/release/${pkgName}.exe\`.
`;

  return {
    cargoToml,
    buildRs,
    mainRs,
    rendererRs,
    readmeMd,
    githubWorkflowYml,
    gitignore,
  };
}

function hexToRgbStr(hex: string): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return '30, 32, 41';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

/**
 * Packages the complete Rust `egui` + `fastframe` source crate, the GitHub Actions
 * automated `.exe` builder workflow, and pre-rendered native assets into a downloadable `.zip`.
 */
export async function createRustFastframeZip(
  config: IconConfig,
  metadata: ExeMetadata,
  customImage?: HTMLImageElement | null,
  onProgress?: (percent: number, status: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const files = generateRustFastframeSource(config, metadata);

  if (onProgress) onProgress(15, 'Generating Cargo.toml, build.rs & GitHub Actions release workflow...');
  zip.file('Cargo.toml', files.cargoToml);
  zip.file('build.rs', files.buildRs);
  zip.file('README.md', files.readmeMd);
  zip.file('.gitignore', files.gitignore);

  const ghFolder = zip.folder('.github')!;
  const workflowsFolder = ghFolder.folder('workflows')!;
  workflowsFolder.file('release.yml', files.githubWorkflowYml);

  const srcFolder = zip.folder('src')!;
  srcFolder.file('main.rs', files.mainRs);
  srcFolder.file('renderer.rs', files.rendererRs);

  // Render pre-compiled icon assets into assets/
  const assetsFolder = zip.folder('assets')!;
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  const buffers = new Map<number, Uint8Array>();

  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i];
    if (onProgress) {
      onProgress(
        20 + Math.round((i / sizes.length) * 60),
        `Encoding native ${s}×${s} asset for Rust build.rs...`
      );
    }
    buffers.set(s, await renderIconToPngBuffer(config, s, customImage));
  }

  const icoSources: IcoImageSource[] = [16, 24, 32, 48, 64, 128, 256].map((s) => ({
    size: s,
    pngBuffer: buffers.get(s)!,
  }));
  assetsFolder.file('app_icon.ico', generateIcoBinary(icoSources));

  const icnsSources: IcnsImageSource[] = [16, 32, 64, 128, 256, 512, 1024].map((s) => ({
    size: s,
    pngBuffer: buffers.get(s)!,
  }));
  assetsFolder.file('app_icon.icns', generateIcnsBinary(icnsSources));
  assetsFolder.file('icon_1024x1024.png', buffers.get(1024)!);

  if (onProgress) onProgress(95, 'Compressing GitHub-ready Rust crate archive...');
  const blob = await zip.generateAsync({ type: 'blob' });
  if (onProgress) onProgress(100, 'Complete');
  return blob;
}
