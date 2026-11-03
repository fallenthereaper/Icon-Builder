# IconForge — Windows Native Rust Edition

IconForge is a Windows x64 desktop icon studio written entirely in Rust. It uses egui/eframe for its native GPU-backed interface, Fastframe typography, and a parallel Rust image pipeline. There is no browser, JavaScript, Node.js, Electron, or web runtime.

## Windows-only stack

- Rust 2024 with the MSVC toolchain
- egui / eframe with the Glow renderer
- Fastframe fonts and text foundations
- image for raster decoding and PNG output
- resvg / tiny-skia for SVG rasterization
- ico for multi-resolution Windows icon files
- rfd for native Windows file dialogs
- zip for Windows asset and Rust source bundles
- windows-sys / DWM for Windows 11 Mica, dark title-bar and rounded-corner integration

## Features

### Icon editor
- Three-panel native studio with canvas, inspector and mipmap preview
- Liquid-glass-inspired surfaces, Fluent/Mica styles, acrylic, aurora, obsidian, titanium and matte materials
- Squircle, WinUI rounded rectangle, circle, hexagon, shield and square geometry
- Windows-oriented presets, plus a one-click reset to defaults
- Original 12 vector glyphs rasterized from their SVG path definitions
- Text emblems and imported raster/vector images
- Geometry, glyph scale/offset/rotation, shadow, emboss, lighting, badge and colour-grading controls
- Editable badge labels, badge text colour, badge colour and badge position
- Surface noise and automatic palette extraction
- Optical guides and low-resolution pixel grid

### Import and preview
- PNG, JPEG, WebP, BMP, SVG and multi-resolution Windows ICO import
- ICO entry inspector to select the source resolution
- Built-in sample gallery: VS Code, Terminal, Rust Core and Neon AI
- Drag-and-drop image import
- Adjustable split comparison between imported source and generated icon
- Bounded source preview textures and mipmap texture reuse

### Windows mockups and export
- Windows 11 desktop, taskbar, Start menu and File Explorer mockups
- PNG export at selectable resolutions
- Multi-resolution Windows ICO export
- Windows PE executable generation with editable version metadata and embedded icon resources
- Developer ZIP with PNG sizes, ICO, EXE, manifest and notes
- Standalone Rust/egui project ZIP

## Build and test

Install the stable Rust MSVC toolchain and Visual Studio Build Tools with the C++ workload. In PowerShell, run:

    cargo run --release
    cargo test --release

The supported target is **x86_64-pc-windows-msvc**. GitHub Actions builds, tests and packages Windows x64 only. macOS and Linux application targets, packaging and release artifacts are intentionally unsupported.

## Project structure

    src/
      main.rs       Native egui application and Windows integration
      renderer.rs   Parallel icon renderer, SVG/ICO import and PNG/ICO export
      packaging.rs  Windows asset ZIP and Rust project packaging
      pe_exe.rs     Windows PE executable generator
    build.rs        Generated Windows application icon and version resources

The repository contains only the native Rust application and its Windows build pipeline.
