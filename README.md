# IconForge — Native Rust Edition

IconForge is being migrated from its original React/TypeScript implementation to a native desktop application built with Rust, egui/eframe, and Fastframe.

The original TypeScript source is intentionally retained under src/**/*.tsx and src/**/*.ts while the native port is developed and validated.

## Native stack

- Rust 2024
- egui / eframe for the desktop interface and GPU-backed canvas
- Fastframe fonts and text rendering
- image for raster image decoding and PNG output
- resvg for SVG rasterization
- ico for multi-resolution Windows icon encoding and parsing
- native ICNS container encoding
- rfd for native file dialogs
- zip for developer and Rust project bundles

## Current native features

- Three-panel icon studio with inspector, canvas and mipmap previews
- macOS/iOS squircle, WinUI rounded rectangle, circle, hexagon, shield and square shapes
- Presets: macOS 27 Pro, macOS Tahoe Glass, WinUI 3 Fluent, iOS 18 Full-Bleed, Cyber Slate, Titanium Matte, Material You Adaptive and Retro 98
- Geometry, background, glyph, lighting, shadow, badge and colour-grading controls
- Raster image and SVG import
- Multi-resolution ICO import with per-entry selection
- Automatic palette extraction from imported artwork
- PNG, ICO and ICNS export
- Developer asset ZIP and self-contained Rust/Fastframe project ZIP export
- Windows PE32 executable export with embedded icon resources and editable metadata
- macOS Dock, Windows taskbar/desktop and browser favicon mockup previews

Some effects and UI details are still being brought into parity with the original web application. See the open pull request for the current port scope and outstanding work.

## Run locally

Install a current stable Rust toolchain, then run:

    git clone https://github.com/fallenthereaper/Icon-Builder.git
    cd Icon-Builder
    cargo run --release

For tests:

    cargo test

## Build artifacts

GitHub Actions builds Windows, macOS Apple Silicon and Linux binaries. Pull requests are configured to run the build matrix when repository Actions are enabled. Tagged releases and manual workflow dispatch publish release assets.

## Project structure

    src/
      main.rs       Native egui application
      renderer.rs   Icon rasterizer, ICO/ICNS pipeline and SVG/ICO import
      packaging.rs  Developer ZIP and Rust project packaging
      pe_exe.rs     Windows PE32 executable generator
      *.tsx, *.ts   Original React/TypeScript implementation (migration reference)

## License

See the repository license and the individual dependency licenses.
