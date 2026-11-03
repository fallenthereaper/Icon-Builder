#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
                name: "IconForgeApp".to_string(),
                superellipse_n: 4.50,
                tile_scale: 0.805,
                corner_radius: 0.224,
                bg_primary: [30, 32, 41],
                bg_secondary: [19, 20, 26],
                bg_accent: [11, 12, 16],
                gradient_angle_deg: 145.0,
                rim_light_opacity: 0.38,
                shadow_blur: 32.0,
                shadow_offset_y: 22.0,
                shadow_opacity: 0.28,
                glyph_scale: 0.62,
                glyph_color: [56, 189, 248],
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
                        egui::RichText::new("IconForgeApp")
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
            .with_title("IconForgeApp"),
        ..Default::default()
    };

    eframe::run_native(
        "IconForgeApp",
        native_options,
        Box::new(|cc| Ok(Box::new(IconForgeNativeApp::new(cc)))),
    )
}
