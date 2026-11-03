#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod renderer;
mod packaging;

use eframe::egui;
use fastframe_fonts::{FontSetup, Weight};
use renderer::{IconSpec, Shape, render_icon, export_ico, export_png, export_icns};


const RESOLUTIONS: [u32; 8] = [1024, 512, 256, 128, 64, 48, 32, 16];

pub struct IconForgeNativeApp {
    spec: IconSpec,
    selected_resolution: u32,
    show_apple_grid: bool,
    show_pixel_grid: bool,
    dark: bool,
    zoom: f32,
    texture: Option<egui::TextureHandle>,
    needs_rerender: bool,
    status_msg: String,
    active_preset: String,
    imported: Option<image::RgbaImage>,
    imported_name: Option<String>,
    glyph: String,
    show_mockup: bool,
    mockup_env: usize,
}

impl Default for IconForgeNativeApp {
    fn default() -> Self {
        Self {
            spec: IconSpec::default(),
            selected_resolution: 512,
            show_apple_grid: false,
            show_pixel_grid: false,
            dark: true,
            zoom: 1.0,
            texture: None,
            needs_rerender: true,
            status_msg: "Ready · Native Rust renderer".into(),
            active_preset: "macOS 27 Pro".into(),
            imported: None,
            imported_name: None,
            glyph: "Layers".into(),
            show_mockup: false,
            mockup_env: 0,
        }
    }
}

impl IconForgeNativeApp {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        let mut fonts = FontSetup::default().definitions();
        let rendering = fastframe_text::detect();
        rendering.apply_to(&mut fonts);
        cc.egui_ctx.set_fonts(fonts);
        let mut app = Self::default();
        app.apply_theme(&cc.egui_ctx);
        app
    }

    fn apply_theme(&self, ctx: &egui::Context) {
        ctx.all_styles_mut(|style| {
            style.visuals.dark_mode = self.dark;
            rendering_style(style, self.dark);
            style.spacing.item_spacing = egui::vec2(9.0, 7.0);
            style.visuals.selection.bg_fill = egui::Color32::from_rgb(10, 132, 255);
        });
    }

    fn rebuild_preview_texture(&mut self, ctx: &egui::Context) {
        let size = self.selected_resolution.max(16);
        let image = render_icon(&self.spec, size, self.imported.as_ref(), &self.glyph);
        let color = egui::ColorImage::from_rgba_unmultiplied(
            [image.width() as usize, image.height() as usize],
            image.as_raw(),
        );
        self.texture = Some(ctx.load_texture("icon_preview", color, egui::TextureOptions::LINEAR));
        self.needs_rerender = false;
    }

    fn export(&mut self, kind: &str) {
        let (name, extension) = match kind { "PNG" => ("png", "png"), "ICNS" => ("icns", "icns"), _ => ("ico", "ico") };
        let Some(path) = rfd::FileDialog::new()
            .set_file_name(format!("{}.{}", self.spec.name, extension))
            .add_filter(extension, &[extension])
            .save_file() else { return; };
        let result = match kind {
            "PNG" => export_png(&self.spec, &path, self.imported.as_ref(), &self.glyph),
            "ICNS" => export_icns(&self.spec, &path, self.imported.as_ref(), &self.glyph),
            _ => export_ico(&self.spec, &path, self.imported.as_ref(), &self.glyph),
        };
        self.status_msg = match result {
            Ok(()) => format!("Exported {} · {}", kind, path.display()),
            Err(e) => format!("Export failed: {e}"),
        };
    }

    fn apply_preset(&mut self, name: &str) {
        self.active_preset = name.into();
        match name {
            "macOS Tahoe Glass" => {
                self.spec.shape=Shape::Squircle; self.spec.tile_scale=0.805;
                self.spec.bg_style="mesh-aurora".into();
                self.spec.bg_primary=[59,130,246]; self.spec.bg_secondary=[139,92,246]; self.spec.bg_accent=[236,72,153];
                self.spec.lighting="glass-reflex".into(); self.spec.rim_light_opacity=0.55;
                self.spec.glyph_color=[255,255,255]; self.spec.glyph_scale=0.65;
            },
            "WinUI 3 Fluent" => {
                self.spec.shape=Shape::WinUi; self.spec.bg_style="acrylic-glass".into();
                self.spec.lighting="chamfer-edge".into(); self.spec.shadow_mode="winui-diffuse".into();
                self.spec.tile_scale=0.84; self.spec.bg_primary=[36,92,150]; self.spec.bg_secondary=[18,44,78];
                self.spec.glyph_color=[245,248,255]; self.spec.glyph_scale=0.56;
            },
            "iOS 18 Full-Bleed" => {
                self.spec.shape=Shape::IosSquircle; self.spec.tile_scale=0.96;
                self.spec.bg_primary=[115,70,210]; self.spec.bg_secondary=[35,24,90]; self.spec.glyph_color=[255,255,255];
                self.spec.shadow_mode="none".into();
            },
            "Cyber Slate" => {
                self.spec.shape=Shape::Squircle; self.spec.tile_scale=0.82; self.spec.bg_style="dark-obsidian".into();
                self.spec.bg_primary=[20,38,55]; self.spec.bg_secondary=[8,15,26]; self.spec.glyph_color=[49,220,190];
                self.spec.rim_light_opacity=0.6; self.spec.shadow_mode="elevated-3d".into();
            },
            "Titanium Matte" => {
                self.spec.shape=Shape::Squircle; self.spec.bg_style="titanium-metallic".into();
                self.spec.bg_primary=[105,112,122]; self.spec.bg_secondary=[32,36,44]; self.spec.glyph_color=[235,240,246];
                self.spec.lighting="chamfer-edge".into();
            },
            "Material You Adaptive" => {
                self.spec.shape=Shape::Circle; self.spec.tile_scale=0.85; self.spec.bg_primary=[2,132,199];
                self.spec.bg_secondary=[3,105,161]; self.spec.bg_accent=[7,89,133]; self.spec.glyph_color=[255,255,255];
                self.spec.lighting="subtle".into(); self.spec.shadow_mode="winui-diffuse".into();
            },
            "Retro 98" => {
                self.spec.shape=Shape::WinUi; self.spec.tile_scale=0.88; self.spec.corner_radius=0.08;
                self.spec.bg_style="solid".into(); self.spec.bg_primary=[192,192,192]; self.spec.bg_secondary=[192,192,192];
                self.spec.glyph_color=[0,0,128]; self.spec.lighting="chamfer-edge".into(); self.spec.rim_light_opacity=0.9;
                self.spec.shadow_mode="flat".into();
            },
            _ => { self.spec=IconSpec::default(); }
        }
        self.needs_rerender=true;
    }

    fn import_image(&mut self) {
        if let Some(path) = rfd::FileDialog::new()
            .add_filter("Images", &["png","jpg","jpeg","webp","bmp","ico"])
            .pick_file() {
            match image::open(&path) {
                Ok(img) => {
                    self.imported=Some(img.to_rgba8());
                    self.imported_name=path.file_name().map(|n|n.to_string_lossy().to_string());
                    self.spec.name=path.file_stem().map(|n|n.to_string_lossy().to_string()).unwrap_or_else(||"Imported".into());
                    self.status_msg=format!("Imported {}",path.display());
                    self.needs_rerender=true;
                }
                Err(e)=>self.status_msg=format!("Could not open image: {e}"),
            }
        }
    }
}

fn rendering_style(style: &mut egui::Style, dark: bool) {
    if dark {
        style.visuals.window_fill=egui::Color32::from_rgb(24,24,27);
        style.visuals.panel_fill=egui::Color32::from_rgb(29,29,32);
        style.visuals.widgets.noninteractive.bg_fill=egui::Color32::from_rgb(38,38,42);
        style.visuals.widgets.inactive.bg_fill=egui::Color32::from_rgb(48,48,53);
    } else {
        style.visuals.window_fill=egui::Color32::from_rgb(244,245,248);
        style.visuals.panel_fill=egui::Color32::from_rgb(250,250,252);
    }
}

impl eframe::App for IconForgeNativeApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        if self.needs_rerender || self.texture.is_none() { self.rebuild_preview_texture(ctx); }

        egui::TopBottomPanel::top("toolbar").exact_height(44.0).show(ctx, |ui| {
            ui.horizontal_centered(|ui| {
                ui.label(egui::RichText::new("◈  IconForge Pro").font(Weight::SemiBold.font_id(15.0)));
                ui.separator();
                ui.label(egui::RichText::new(&self.active_preset).weak().size(11.0));
                ui.separator();
                if ui.button("＋ Import").clicked(){self.import_image();}
                if ui.button("Mockup").clicked(){self.show_mockup=true;}
                ui.checkbox(&mut self.show_apple_grid,"Apple HIG");
                ui.checkbox(&mut self.show_pixel_grid,"Pixel grid");
                ui.separator();
                for res in RESOLUTIONS { if ui.selectable_label(self.selected_resolution==res,format!("{res}")).clicked(){self.selected_resolution=res;self.needs_rerender=true;} }
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center),|ui|{
                    if ui.button("ZIP pack").clicked(){if let Some(path)=rfd::FileDialog::new().set_file_name(format!("{}_developer_pack.zip",self.spec.name)).add_filter("ZIP archive",&["zip"]).save_file(){match packaging::export_developer_zip(&self.spec,self.imported.as_ref(),&self.glyph,&path){Ok(())=>self.status_msg=format!("Developer pack saved · {}",path.display()),Err(e)=>self.status_msg=format!("ZIP export failed: {e}")}}}
                    if ui.button("Export ▾").clicked(){self.export("ICO");}
                    if ui.button("ICNS").clicked(){self.export("ICNS");}
                    if ui.button("PNG").clicked(){self.export("PNG");}
                    if ui.button(if self.dark{"☼"}else{"☾"}).clicked(){self.dark=!self.dark;self.apply_theme(ctx);}
                });
            });
        });

        egui::SidePanel::left("inspector").exact_width(292.0).resizable(false).show(ctx,|ui|{
            egui::ScrollArea::vertical().show(ui,|ui|{
                ui.add_space(8.0);
                ui.label(egui::RichText::new("ICON STUDIO").size(10.0).strong().weak());
                ui.add_space(5.0);
                ui.label("Name"); if ui.text_edit_singleline(&mut self.spec.name).changed(){self.needs_rerender=true;}
                ui.label("Presets");
                egui::ComboBox::from_id_salt("preset").selected_text(&self.active_preset).show_ui(ui,|ui|{
                    for p in ["macOS 27 Pro","macOS Tahoe Glass","WinUI 3 Fluent","iOS 18 Full-Bleed","Cyber Slate","Titanium Matte","Material You Adaptive","Retro 98"] {
                        if ui.selectable_label(self.active_preset==p,p).clicked(){self.apply_preset(p);}
                    }
                });
                ui.separator();
                ui.label(egui::RichText::new("SHAPE & GEOMETRY").strong());
                egui::ComboBox::from_id_salt("shape").selected_text(self.spec.shape.label()).show_ui(ui,|ui|{
                    for s in [Shape::Squircle,Shape::IosSquircle,Shape::WinUi,Shape::Circle,Shape::Hexagon,Shape::Shield,Shape::Square] {
                        if ui.selectable_value(&mut self.spec.shape,s,s.label()).changed(){self.needs_rerender=true;}
                    }
                });
                slider(ui,"Tile scale",&mut self.spec.tile_scale,0.55..=1.0,&mut self.needs_rerender);
                slider(ui,"Superellipse power",&mut self.spec.superellipse_n,2.0..=7.0,&mut self.needs_rerender);
                slider(ui,"Corner radius",&mut self.spec.corner_radius,0.05..=0.48,&mut self.needs_rerender);
                ui.separator();
                ui.label(egui::RichText::new("BACKGROUND").strong());
                egui::ComboBox::from_id_salt("background-style").selected_text(&self.spec.bg_style).show_ui(ui,|ui|{for style in ["linear-gradient","radial-gradient","acrylic-glass","dark-obsidian","titanium-metallic","mesh-aurora","matte-ceramic","carbon-fiber","solid"]{if ui.selectable_value(&mut self.spec.bg_style,style.into(),style).changed(){self.needs_rerender=true;}}});
                color_row(ui,"Primary",&mut self.spec.bg_primary,&mut self.needs_rerender);
                color_row(ui,"Secondary",&mut self.spec.bg_secondary,&mut self.needs_rerender);
                color_row(ui,"Accent",&mut self.spec.bg_accent,&mut self.needs_rerender);
                slider(ui,"Gradient angle",&mut self.spec.gradient_angle_deg,0.0..=360.0,&mut self.needs_rerender);
                if let Some(source)=&self.imported{if ui.button("Auto-match palette from source").clicked(){let(a,b,c,d)=packaging::extract_palette(source);self.spec.bg_primary=a;self.spec.bg_secondary=b;self.spec.bg_accent=c;self.spec.glyph_color=d;self.needs_rerender=true;}}
                ui.separator();
                ui.label(egui::RichText::new("GLYPH").strong());
                egui::ComboBox::from_id_salt("glyph").selected_text(&self.glyph).show_ui(ui,|ui|{
                    for g in ["Layers","Terminal","Code2","Cpu","Database","Rocket","ShieldCheck","Sparkles","CloudLightning","Box","Globe","Gamepad2"] {
                        if ui.selectable_label(self.glyph==g,g).clicked(){self.glyph=g.into();self.needs_rerender=true;}
                    }
                });
                slider(ui,"Glyph scale",&mut self.spec.glyph_scale,0.15..=0.9,&mut self.needs_rerender);
                slider(ui,"Glyph X offset",&mut self.spec.glyph_offset_x,-80.0..=80.0,&mut self.needs_rerender);
                slider(ui,"Glyph Y offset",&mut self.spec.glyph_offset_y,-80.0..=80.0,&mut self.needs_rerender);
                slider(ui,"Glyph rotation",&mut self.spec.glyph_rotation,-180.0..=180.0,&mut self.needs_rerender);
                color_row(ui,"Glyph colour",&mut self.spec.glyph_color,&mut self.needs_rerender);
                if self.imported.is_some() && ui.button("Remove imported image").clicked(){self.imported=None;self.imported_name=None;self.needs_rerender=true;}
                ui.separator();
                ui.label(egui::RichText::new("LIGHTING & SHADOWS").strong());
                egui::ComboBox::from_id_salt("lighting-mode").selected_text(&self.spec.lighting).show_ui(ui,|ui|{for mode in ["macos-specular","glass-reflex","chamfer-edge","subtle","none"]{if ui.selectable_value(&mut self.spec.lighting,mode.into(),mode).changed(){self.needs_rerender=true;}}});
                slider(ui,"Rim light",&mut self.spec.rim_light_opacity,0.0..=1.0,&mut self.needs_rerender);
                egui::ComboBox::from_id_salt("shadow-mode").selected_text(&self.spec.shadow_mode).show_ui(ui,|ui|{for mode in ["macos-dual","winui-diffuse","elevated-3d","flat","none"]{if ui.selectable_value(&mut self.spec.shadow_mode,mode.into(),mode).changed(){self.needs_rerender=true;}}});
                slider(ui,"Shadow blur",&mut self.spec.shadow_blur,0.0..=64.0,&mut self.needs_rerender);
                slider(ui,"Shadow offset",&mut self.spec.shadow_offset_y,0.0..=48.0,&mut self.needs_rerender);
                slider(ui,"Shadow opacity",&mut self.spec.shadow_opacity,0.0..=1.0,&mut self.needs_rerender);
                ui.separator();
                ui.label(egui::RichText::new("BADGE / OVERLAY").strong());
                egui::ComboBox::from_id_salt("badge-type").selected_text(&self.spec.badge).show_ui(ui,|ui|{for badge in ["none","beta","dev","pro","dot","windows","apple","linux","custom"]{if ui.selectable_value(&mut self.spec.badge,badge.into(),badge).changed(){self.needs_rerender=true;}}});
                egui::ComboBox::from_id_salt("badge-position").selected_text(&self.spec.badge_position).show_ui(ui,|ui|{for pos in ["top-right","top-left","bottom-right","bottom-left"]{if ui.selectable_value(&mut self.spec.badge_position,pos.into(),pos).changed(){self.needs_rerender=true;}}});
                color_row(ui,"Badge colour",&mut self.spec.badge_color,&mut self.needs_rerender);
                ui.separator();
                ui.label(egui::RichText::new("IMAGE GRADING").strong());
                slider(ui,"Brightness",&mut self.spec.brightness,0.2..=2.0,&mut self.needs_rerender);
                slider(ui,"Contrast",&mut self.spec.contrast,0.2..=2.0,&mut self.needs_rerender);
                slider(ui,"Saturation",&mut self.spec.saturation,0.0..=2.0,&mut self.needs_rerender);
                slider(ui,"Hue rotation",&mut self.spec.hue_rotate,-180.0..=180.0,&mut self.needs_rerender);
            });
        });

        egui::SidePanel::right("mipmaps").exact_width(174.0).resizable(false).show(ctx,|ui|{
            ui.label(egui::RichText::new("MIPMAP PREVIEW").strong().size(11.0));
            ui.separator();
            egui::ScrollArea::vertical().show(ui,|ui|{
                for res in [256_u32,128,64,48,32,16] {
                    let img=render_icon(&self.spec,res,self.imported.as_ref(),&self.glyph);
                    let ci=egui::ColorImage::from_rgba_unmultiplied([res as usize,res as usize],img.as_raw());
                    let tex=ctx.load_texture(format!("mipmap-{res}"),ci,egui::TextureOptions::LINEAR);
                    ui.horizontal(|ui|{
                        ui.image((tex.id(),egui::vec2(42.0,42.0)));
                        ui.vertical(|ui|{
                            ui.label(format!("{res} × {res}"));
                            if ui.small_button(if self.selected_resolution==res{"Selected"}else{"Preview"}).clicked(){self.selected_resolution=res;self.needs_rerender=true;}
                        });
                    });
                    ui.add_space(6.0);
                }
            });
        });

        egui::TopBottomPanel::bottom("status").exact_height(26.0).show(ctx,|ui|{
            ui.horizontal_centered(|ui|{
                ui.label(egui::RichText::new(&self.status_msg).size(10.5));
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center),|ui|{
                    ui.add(egui::Slider::new(&mut self.zoom,0.5..=1.5).show_value(false).text("Zoom"));
                    ui.label(format!("{}×{} · RGBA8 · n={:.2}",self.selected_resolution,self.selected_resolution,self.spec.superellipse_n));
                });
            });
        });

        if self.show_mockup{egui::Window::new("Context Mockup Simulator").open(&mut self.show_mockup).default_width(620.0).show(ctx,|ui|{
            ui.horizontal(|ui|{for(i,label)in ["macOS 27 Dock","Windows 11 Taskbar","Windows Desktop","Browser Tab"].iter().enumerate(){if ui.selectable_label(self.mockup_env==i,*label).clicked(){self.mockup_env=i;}}});ui.separator();
            let(rect,_)=ui.allocate_exact_size(egui::vec2(560.0,300.0),egui::Sense::hover());let painter=ui.painter();painter.rect_filled(rect,12.0,match self.mockup_env{0=>egui::Color32::from_rgb(35,42,55),1=>egui::Color32::from_rgb(24,35,53),2=>egui::Color32::from_rgb(18,32,55),_=>egui::Color32::from_rgb(238,240,244)});
            if let Some(tex)=&self.texture{let side=match self.mockup_env{0=>74.0,1=>48.0,2=>92.0,_=>24.0};let count=if self.mockup_env==0{6}else if self.mockup_env==1{8}else{1};let start=rect.center().x-(count as f32*side*1.25)*0.5;for i in 0..count{let x=start+i as f32*side*1.25;let y=if self.mockup_env==0||self.mockup_env==1{rect.bottom()-side-15.0}else{rect.center().y-side*0.5};let r=egui::Rect::from_min_size(egui::pos2(x,y),egui::vec2(side,side));painter.image(tex.id(),r,egui::Rect::from_min_max(egui::pos2(0.0,0.0),egui::pos2(1.0,1.0)),egui::Color32::WHITE);}}
            ui.label(match self.mockup_env{0=>"macOS Dock scale and silhouette preview",1=>"Windows 11 centered taskbar preview",2=>"Windows desktop icon preview",_=>"Browser tab / favicon preview"});
        });}

        egui::CentralPanel::default().show(ctx,|ui|{
            ui.vertical_centered(|ui|{
                ui.add_space(12.0);
                ui.label(egui::RichText::new("CANVAS WORKSPACE").weak().size(10.0));
                ui.add_space(10.0);
                if let Some(tex)=&self.texture {
                    let available=ui.available_size();
                    let side=(available.x.min(available.y)*0.72*self.zoom).clamp(120.0,560.0);
                    let (rect,_)=ui.allocate_exact_size(egui::vec2(side,side),egui::Sense::hover());
                    ui.painter().rect_filled(rect,12.0,egui::Color32::from_rgb(20,21,25));
                    ui.painter().image(tex.id(),rect,egui::Rect::from_min_max(egui::pos2(0.0,0.0),egui::pos2(1.0,1.0)),egui::Color32::WHITE);
                    if self.show_apple_grid {
                        let center=rect.center(); let r=side*0.39;
                        ui.painter().circle_stroke(center,r,egui::Stroke::new(1.0,egui::Color32::from_rgba_unmultiplied(255,255,255,90)));
                        ui.painter().line_segment([egui::pos2(center.x-r,center.y),egui::pos2(center.x+r,center.y)],egui::Stroke::new(1.0,egui::Color32::from_rgba_unmultiplied(255,255,255,55)));
                        ui.painter().line_segment([egui::pos2(center.x,center.y-r),egui::pos2(center.x,center.y+r)],egui::Stroke::new(1.0,egui::Color32::from_rgba_unmultiplied(255,255,255,55)));
                    }
                    if self.show_pixel_grid && self.selected_resolution<=64 {
                        let n=self.selected_resolution as usize; let step=side/n as f32;
                        for i in 1..n {let p=rect.left()+i as f32*step;ui.painter().line_segment([egui::pos2(p,rect.top()),egui::pos2(p,rect.bottom())],egui::Stroke::new(0.35,egui::Color32::from_rgba_unmultiplied(255,255,255,35)));let p=rect.top()+i as f32*step;ui.painter().line_segment([egui::pos2(rect.left(),p),egui::pos2(rect.right(),p)],egui::Stroke::new(0.35,egui::Color32::from_rgba_unmultiplied(255,255,255,35)));}
                    }
                }
                if let Some(name)=&self.imported_name {ui.label(format!("Source: {name}"));}
            });
        });
    }
}

fn slider(ui:&mut egui::Ui,label:&str,value:&mut f32,range:std::ops::RangeInclusive<f32>,dirty:&mut bool){
    ui.horizontal(|ui|{ui.label(label);if ui.add(egui::Slider::new(value,range).show_value(true)).changed(){*dirty=true;}});
}
fn color_row(ui:&mut egui::Ui,label:&str,color:&mut [u8;3],dirty:&mut bool){
    ui.horizontal(|ui|{
        ui.label(label);
        let mut c=egui::Color32::from_rgb(color[0],color[1],color[2]);
        if ui.color_edit_button_srgba(&mut c).changed(){*color=[c.r(),c.g(),c.b()];*dirty=true;}
    });
}

fn main() -> eframe::Result {
    let native_options=eframe::NativeOptions{
        viewport:egui::ViewportBuilder::default().with_inner_size([1440.0,900.0]).with_min_inner_size([1120.0,700.0]).with_title("IconForge Pro"),
        ..Default::default()
    };
    eframe::run_native("IconForge Pro",native_options,Box::new(|cc|Ok(Box::new(IconForgeNativeApp::new(cc)))))
}
