# IconForge — Windows Native Rust Edition

IconForge is a Windows x64 desktop icon studio implemented in Rust. The native application uses egui/eframe for its GPU-backed interface, Fastframe for typography and theme foundations, and a Rust image pipeline for rendering and export.

## Windows-only stack

- Rust 2024 and the MSVC toolchain
- egui / eframe with the Glow renderer
- Fastframe fonts and text foundations
- image for raster decoding and PNG output
- resvg / tiny-skia for SVG rasterization
- ico for multi-resolution Windows icon files
- rfd for native Windows file dialogs
- zip for Windows asset and source bundles
- windows-sys / DWM for Windows 11 system backdrop integration

## Native features

- Three-panel icon studio, canvas and mipmap inspector
- Liquid-glass, Fluent, acrylic and metallic materials
- Squircle, WinUI rounded rectangle, circle, hexagon, shield and square geometry
- Windows-focused presets and desktop/taskbar mockups
- Geometry, glyph, lighting, shadow, badge and colour-grading controls
- Raster, SVG and multi-resolution ICO import
- Automatic palette extraction
- PNG and multi-resolution ICO export
- Windows PE executable generation with editable metadata
- Developer asset ZIP and Rust project ZIP

## Build and test

Install the stable Rust MSVC toolchain and Visual Studio Build Tools (C++ workload), then run in PowerShell:

    cargo run --release
    cargo test --release

GitHub Actions builds and tests Windows x64 only. No macOS or Linux jobs or release artifacts are produced.

## Project structure

    src/
      main.rs       Native egui application
      renderer.rs   Icon rasterizer, ICO pipeline and SVG/ICO import
      packaging.rs  Windows asset ZIP and Rust project packaging
      pe_exe.rs     Windows PE32 executable generator

The original TypeScript source is retained temporarily as a parity reference while remaining editor features are ported to Rust. It is not part of the Windows executable or runtime.
