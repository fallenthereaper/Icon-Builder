#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod renderer;
mod packaging;
mod pe_exe;

use eframe::egui;
use fastframe_fonts::{FontSetup, Weight};
use renderer::{IconSpec, Shape, render_icon, export_ico, export_png_at_size, IcoEntry, parse_ico_file, load_svg_file};


const RESOLUTIONS: [u32; 11] = [1024, 512, 256, 192, 180, 128, 64, 48, 32, 24, 16];

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct PersistedState {
    spec: IconSpec,
    selected_resolution: u32,
    dark: bool,
    zoom: f32,
    active_preset: String,
    glyph: String,
    glyph_is_text: bool,
    glyph_text: String,
    exe_metadata: pe_exe::ExeMetadata,
}

pub struct IconForgeNativeApp {
    spec: IconSpec,
    selected_resolution: u32,
    show_guides: bool,
    show_pixel_grid: bool,
    dark: bool,
    zoom: f32,
    texture: Option<egui::TextureHandle>,
    source_texture: Option<egui::TextureHandle>,
    compare_mode: bool,
    compare_split: f32,
    mipmap_textures: Vec<(u32, egui::TextureHandle)>,
    needs_rerender: bool,
    status_msg: String,
    active_preset: String,
    imported: Option<image::RgbaImage>,
    imported_name: Option<String>,
    glyph: String,
    glyph_is_text: bool,
    glyph_text: String,
    show_mockup: bool,
    mockup_env: usize,
    ico_entries: Vec<IcoEntry>,
    selected_ico_entry: usize,
    exe_metadata: pe_exe::ExeMetadata,
    backdrop_applied: bool,
    show_export: bool,
    export_tab: usize,
    png_export_size: u32,
}

impl Default for IconForgeNativeApp {
    fn default() -> Self {
        Self {
            spec: IconSpec::default(),
            selected_resolution: 512,
            show_guides: false,
            show_pixel_grid: false,
            dark: true,
            zoom: 1.0,
            texture: None,
            source_texture: None,
            compare_mode: false,
            compare_split: 0.5,
            mipmap_textures: Vec::new(),
            needs_rerender: true,
            status_msg: "Ready · Native Rust renderer".into(),
            active_preset: "Liquid Glass 27".into(),
            imported: None,
            imported_name: None,
            glyph: "Layers".into(),
            glyph_is_text: false,
            glyph_text: "Aa".into(),
            show_mockup: false,
            mockup_env: 0,
            ico_entries: Vec::new(),
            selected_ico_entry: 0,
            backdrop_applied: false,
            show_export: false,
            export_tab: 0,
            png_export_size: 1024,
            exe_metadata: pe_exe::ExeMetadata { file_name: "iconforge_app".into(), app_name: "IconForgeApp".into(), company_name: "Native Studio".into(), version: "1.0.0".into(), description: "Native desktop icon application".into(), window_title: "IconForgeApp".into() },
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
        if let Some(storage)=cc.storage {
            if let Some(saved)=eframe::get_value::<PersistedState>(storage,"iconforgeapp-state") {
                app.spec=saved.spec;
                app.selected_resolution=if RESOLUTIONS.contains(&saved.selected_resolution){saved.selected_resolution}else{512};
                app.dark=saved.dark;
                app.zoom=saved.zoom.clamp(0.5,1.5);
                app.active_preset=saved.active_preset;
                app.glyph=saved.glyph;
                app.glyph_is_text=saved.glyph_is_text;
                app.glyph_text=saved.glyph_text;
                app.exe_metadata=saved.exe_metadata;
                app.needs_rerender=true;
            }
        }
        app.apply_theme(&cc.egui_ctx);
        app
    }

    fn glyph_source(&self)->String {
        if self.glyph_is_text { format!("text:{}",self.glyph_text) } else { self.glyph.clone() }
    }

    fn apply_theme(&self, ctx: &egui::Context) {
        ctx.all_styles_mut(|style| {
            style.visuals.dark_mode = self.dark;
            rendering_style(style, self.dark);
            style.spacing.item_spacing = egui::vec2(10.0, 8.0);
            style.visuals.selection.bg_fill = egui::Color32::from_rgb(10, 132, 255);
        });
    }

    fn rebuild_preview_texture(&mut self, ctx: &egui::Context) {
        let size = self.selected_resolution.max(16);
        let image = render_icon(&self.spec, size, self.imported.as_ref(), &self.glyph_source());
        let color = egui::ColorImage::from_rgba_unmultiplied(
            [image.width() as usize, image.height() as usize],
            image.as_raw(),
        );
        self.texture = Some(ctx.load_texture("icon_preview", color, egui::TextureOptions::LINEAR));
        self.source_texture = self.imported.as_ref().map(|source| {
            let source_color = egui::ColorImage::from_rgba_unmultiplied(
                [source.width() as usize, source.height() as usize], source.as_raw());
            ctx.load_texture("icon_source_preview", source_color, egui::TextureOptions::LINEAR)
        });
        self.mipmap_textures.clear();
        let mut rendered_thumbnails:Vec<(u32,egui::TextureHandle)>=Vec::new();
        for mip_size in RESOLUTIONS {
            // The inspector displays every mip at the same 42px size. Reuse
            // the 128px preview texture for all larger output resolutions.
            let preview_size=mip_size.min(128);
            let handle=if let Some((_,cached))=rendered_thumbnails.iter().find(|(size,_)|*size==preview_size) {
                cached.clone()
            } else {
                let mip=render_icon(&self.spec,preview_size,self.imported.as_ref(),&self.glyph_source());
                let color=egui::ColorImage::from_rgba_unmultiplied([preview_size as usize,preview_size as usize],mip.as_raw());
                let texture=ctx.load_texture(format!("mipmap-preview-{preview_size}"),color,egui::TextureOptions::LINEAR);
                rendered_thumbnails.push((preview_size,texture.clone()));
                texture
            };
            self.mipmap_textures.push((mip_size,handle));
        }
        self.needs_rerender = false;
    }

    fn export(&mut self,kind:&str) {
        let extension=if kind=="PNG"{"png"}else{"ico"};
        let Some(path)=rfd::FileDialog::new().set_file_name(format!("{}.{}",self.spec.name,extension)).add_filter(extension,&[extension]).save_file() else{return;};
        let result=if kind=="PNG"{export_png_at_size(&self.spec,&path,self.imported.as_ref(),&self.glyph_source(),self.png_export_size)}else{export_ico(&self.spec,&path,self.imported.as_ref(),&self.glyph_source())};
        self.status_msg=match result{Ok(())=>format!("Exported {} · {}",kind,path.display()),Err(e)=>format!("Export failed: {e}")};
    }

    fn export_exe(&mut self) {
        let Some(path)=rfd::FileDialog::new().set_file_name(format!("{}.exe",self.exe_metadata.file_name)).add_filter("Windows executable",&["exe"]).save_file() else{return;};
        let sizes=[16u32,32,48,64,256];
        let result=(|| -> Result<(),Box<dyn std::error::Error>> { let mut icons=Vec::new();for size in sizes{let image=render_icon(&self.spec,size,self.imported.as_ref(),&self.glyph_source());icons.push(pe_exe::png_icon(size,&image)?);}let binary=pe_exe::generate_windows_ex(&icons,&self.exe_metadata)?;std::fs::write(&path,binary)?;Ok(())})();
        self.status_msg=match result{Ok(())=>format!("Windows PE32 executable exported · {}",path.display()),Err(e)=>format!("EXE export failed: {e}")};
    }

    fn apply_preset(&mut self,name:&str) {
        self.active_preset=name.into();
        match name {
            "Liquid Glass 27" => {
                self.spec=IconSpec::default(); self.spec.shape=Shape::Squircle;
                self.spec.bg_style="acrylic-glass".into(); self.spec.lighting="glass-reflex".into(); self.spec.shadow_mode="soft-dual".into();
                self.spec.bg_primary=[52,104,184]; self.spec.bg_secondary=[22,31,58]; self.spec.bg_accent=[108,160,255];
                self.spec.glyph_color=[245,249,255]; self.spec.reflex_opacity=0.42; self.spec.rim_light_opacity=0.52; self.spec.bevel_thickness=2.0;
            },
            "Liquid Aurora" => {
                self.spec.shape=Shape::Squircle; self.spec.tile_scale=0.82; self.spec.bg_style="mesh-aurora".into();
                self.spec.lighting="glass-reflex".into(); self.spec.bg_primary=[42,112,198]; self.spec.bg_secondary=[108,66,182];
                self.spec.bg_accent=[234,102,174]; self.spec.glyph_color=[255,255,255]; self.spec.reflex_opacity=0.58; self.spec.rim_light_opacity=0.65;
            },
            "Windows 11 Fluent" => {
                self.spec.shape=Shape::WinUi; self.spec.bg_style="acrylic-glass".into(); self.spec.lighting="chamfer-edge".into();
                self.spec.shadow_mode="winui-diffuse".into(); self.spec.tile_scale=0.86; self.spec.bg_primary=[38,91,151];
                self.spec.bg_secondary=[18,38,68]; self.spec.glyph_color=[245,249,255];
            },
            "Windows 11 Mica" => {
                self.spec.shape=Shape::WinUi; self.spec.bg_style="dark-obsidian".into(); self.spec.lighting="subtle".into();
                self.spec.shadow_mode="winui-diffuse".into(); self.spec.bg_primary=[42,48,62]; self.spec.bg_secondary=[24,28,38];
                self.spec.glyph_color=[112,177,255]; self.spec.rim_light_opacity=0.34;
            },
            "Cyber Slate" => {
                self.spec.shape=Shape::Squircle; self.spec.bg_style="dark-obsidian".into(); self.spec.bg_primary=[20,38,55];
                self.spec.bg_secondary=[8,15,26]; self.spec.glyph_color=[49,220,190]; self.spec.rim_light_opacity=0.6; self.spec.shadow_mode="elevated-3d".into();
            },
            "Titanium Matte" => {
                self.spec.shape=Shape::Squircle; self.spec.bg_style="titanium-metallic".into(); self.spec.bg_primary=[105,112,122];
                self.spec.bg_secondary=[32,36,44]; self.spec.glyph_color=[235,240,246]; self.spec.lighting="chamfer-edge".into();
            },
            "Windows 98 Classic" => {
                self.spec.shape=Shape::WinUi; self.spec.tile_scale=0.88; self.spec.corner_radius=0.08; self.spec.bg_style="solid".into();
                self.spec.bg_primary=[192,192,192]; self.spec.bg_secondary=[192,192,192]; self.spec.glyph_color=[0,0,128];
                self.spec.lighting="chamfer-edge".into(); self.spec.rim_light_opacity=0.9; self.spec.shadow_mode="flat".into();
            },
            _=>{self.spec=IconSpec::default();}
        }
        self.needs_rerender=true;
    }

    fn import_image(&mut self) {
        if let Some(path)=rfd::FileDialog::new().add_filter("Images",&["png","jpg","jpeg","webp","bmp","ico","svg"]).pick_file(){
            self.load_image_path(&path);
        }
    }

    fn load_image_path(&mut self,path:&std::path::Path){
        if path.extension().and_then(|x|x.to_str()).is_some_and(|x|x.eq_ignore_ascii_case("svg")){
            match load_svg_file(path){
                Ok(img)=>{self.ico_entries.clear();self.imported=Some(img);self.imported_name=path.file_name().map(|n|n.to_string_lossy().to_string());self.spec.name=path.file_stem().map(|n|n.to_string_lossy().to_string()).unwrap_or_else(||"Imported".into());self.status_msg=format!("Imported SVG · rasterized at up to 1024px · {}",path.display());self.needs_rerender=true;},
                Err(e)=>self.status_msg=format!("Could not render SVG: {e}")
            }
        }else if path.extension().and_then(|x|x.to_str()).is_some_and(|x|x.eq_ignore_ascii_case("ico")){
            match parse_ico_file(path){
                Ok(entries) if !entries.is_empty()=>{self.ico_entries=entries;self.selected_ico_entry=0;self.imported=Some(self.ico_entries[0].image.clone());self.imported_name=path.file_name().map(|n|n.to_string_lossy().to_string());self.spec.name=path.file_stem().map(|n|n.to_string_lossy().to_string()).unwrap_or_else(||"Imported".into());self.status_msg=format!("Imported ICO · {} embedded resolutions",self.ico_entries.len());self.needs_rerender=true;},
                Ok(_)=>self.status_msg="ICO file contains no image entries".into(),
                Err(e)=>self.status_msg=format!("Could not parse ICO: {e}")
            }
        }else{
            match image::open(path){
                Ok(img)=>{self.ico_entries.clear();self.selected_ico_entry=0;self.imported=Some(img.to_rgba8());self.imported_name=path.file_name().map(|n|n.to_string_lossy().to_string());self.spec.name=path.file_stem().map(|n|n.to_string_lossy().to_string()).unwrap_or_else(||"Imported".into());self.status_msg=format!("Imported {}",path.display());self.needs_rerender=true;},
                Err(e)=>self.status_msg=format!("Could not open image: {e}")
            }
        }
    }
}

#[cfg(windows)]
fn enable_windows_backdrop()->bool {
    use std::ffi::c_void;
    use windows_sys::Win32::Graphics::Dwm::DwmSetWindowAttribute;
    use windows_sys::Win32::UI::WindowsAndMessaging::FindWindowW;
    let title:Vec<u16>="IconForge Pro\\0".encode_utf16().collect();
    let hwnd=unsafe{FindWindowW(std::ptr::null(),title.as_ptr())};
    if hwnd.is_null(){return false;}
    let dark_mode:i32=1; let mica:i32=2; let rounded:i32=2;
    unsafe {
        let _=DwmSetWindowAttribute(hwnd,20,&dark_mode as *const _ as *const c_void,4);
        let _=DwmSetWindowAttribute(hwnd,38,&mica as *const _ as *const c_void,4);
        let _=DwmSetWindowAttribute(hwnd,33,&rounded as *const _ as *const c_void,4);
    }
    true
}

fn rendering_style(style: &mut egui::Style, dark: bool) {
    if dark {
        style.visuals.window_fill=egui::Color32::from_rgba_unmultiplied(25,29,40,226);
        style.visuals.panel_fill=egui::Color32::from_rgba_unmultiplied(20,24,34,224);
        style.visuals.widgets.noninteractive.bg_fill=egui::Color32::from_rgba_unmultiplied(30,36,49,210);
        style.visuals.widgets.inactive.bg_fill=egui::Color32::from_rgba_unmultiplied(55,65,84,176);
        style.visuals.widgets.hovered.bg_fill=egui::Color32::from_rgba_unmultiplied(75,112,164,205);
        style.visuals.widgets.active.bg_fill=egui::Color32::from_rgb(44,112,190);
        style.visuals.widgets.noninteractive.bg_stroke=egui::Stroke::new(1.0,egui::Color32::from_rgba_unmultiplied(255,255,255,24));
        style.visuals.widgets.inactive.corner_radius=egui::CornerRadius::same(9);
        style.visuals.widgets.hovered.corner_radius=egui::CornerRadius::same(9);
        style.visuals.widgets.active.corner_radius=egui::CornerRadius::same(9);
        style.spacing.button_padding=egui::vec2(10.0,6.0);
    } else {
        style.visuals.window_fill=egui::Color32::from_rgb(244,245,248);
        style.visuals.panel_fill=egui::Color32::from_rgb(250,250,252);
    }
}

impl eframe::App for IconForgeNativeApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let ctx = ui.ctx().clone();
        let dropped=ctx.input(|i|i.raw.dropped_files.clone());
        if let Some(file)=dropped.into_iter().next(){let path=file.path().to_path_buf();self.load_image_path(&path);}
        #[cfg(windows)]
        if !self.backdrop_applied { self.backdrop_applied=enable_windows_backdrop(); }
        if self.needs_rerender || self.texture.is_none() { self.rebuild_preview_texture(&ctx); }

        egui::Panel::top("toolbar").exact_size(44.0).show(ui, |ui| {
            ui.horizontal_centered(|ui| {
                ui.label(egui::RichText::new("◈  IconForge Pro").font(Weight::SemiBold.font_id(15.0)));
                ui.separator();
                ui.label(egui::RichText::new(&self.active_preset).weak().size(11.0));
                ui.separator();
                if ui.button("＋ Import").clicked(){self.import_image();}
                if self.imported.is_some() && ui.selectable_label(self.compare_mode, "Split compare").clicked(){self.compare_mode=!self.compare_mode;}
                if ui.button("Mockup").clicked(){self.show_mockup=true;}
                if self.compare_mode { ui.add(egui::Slider::new(&mut self.compare_split,0.1..=0.9).show_value(false).text("Split")); }
                ui.checkbox(&mut self.show_guides,"Optical guides");
                ui.checkbox(&mut self.show_pixel_grid,"Pixel grid");
                ui.separator();
                for res in RESOLUTIONS { if ui.selectable_label(self.selected_resolution==res,format!("{res}")).clicked(){self.selected_resolution=res;self.needs_rerender=true;} }
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center),|ui|{
                    if ui.button("Export").clicked(){self.show_export=true;}
                    if ui.button(if self.dark{"☼"}else{"☾"}).clicked(){self.dark=!self.dark;self.apply_theme(&ctx);}
                });
            });
        });

        egui::Panel::left("inspector").exact_size(292.0).resizable(false).show(ui,|ui|{
            egui::ScrollArea::vertical().show(ui,|ui|{
                ui.add_space(8.0);
                ui.label(egui::RichText::new("ICON STUDIO").size(10.0).strong().weak());
                ui.add_space(5.0);
                ui.label("Name"); if ui.text_edit_singleline(&mut self.spec.name).changed(){self.needs_rerender=true;}
                ui.label("Presets");
                egui::ComboBox::from_id_salt("preset").selected_text(&self.active_preset).show_ui(ui,|ui|{
                    for p in ["Liquid Glass 27","Liquid Aurora","Windows 11 Fluent","Windows 11 Mica","Cyber Slate","Titanium Matte","Windows 98 Classic"] {
                        if ui.selectable_label(self.active_preset==p,p).clicked(){self.apply_preset(p);}
                    }
                });
                egui::CollapsingHeader::new("WINDOWS EXE METADATA").default_open(false).show(ui,|ui|{
                    ui.label("File name");ui.text_edit_singleline(&mut self.exe_metadata.file_name);
                    ui.label("Application name");ui.text_edit_singleline(&mut self.exe_metadata.app_name);
                    ui.label("Publisher");ui.text_edit_singleline(&mut self.exe_metadata.company_name);
                    ui.label("Version");ui.text_edit_singleline(&mut self.exe_metadata.version);
                    ui.label("Description");ui.text_edit_singleline(&mut self.exe_metadata.description);
                    ui.label("Window title");ui.text_edit_singleline(&mut self.exe_metadata.window_title);
                });
                ui.separator();
                ui.label(egui::RichText::new("SHAPE & GEOMETRY").strong());
                egui::ComboBox::from_id_salt("shape").selected_text(self.spec.shape.label()).show_ui(ui,|ui|{
                    for s in [Shape::Squircle,Shape::WinUi,Shape::Circle,Shape::Hexagon,Shape::Shield,Shape::Square] {
                        if ui.selectable_value(&mut self.spec.shape,s,s.label()).changed(){self.needs_rerender=true;}
                    }
                });
                slider(ui,"Tile scale",&mut self.spec.tile_scale,0.55..=1.0,&mut self.needs_rerender);
                slider(ui,"Superellipse power",&mut self.spec.superellipse_n,2.0..=7.0,&mut self.needs_rerender);
                slider(ui,"Corner radius",&mut self.spec.corner_radius,0.05..=0.48,&mut self.needs_rerender);
                ui.separator();
                ui.label(egui::RichText::new("BACKGROUND").strong());
                egui::ComboBox::from_id_salt("background-style").selected_text(&self.spec.bg_style).show_ui(ui,|ui|{for style in ["linear-gradient","radial-gradient","acrylic-glass","dark-obsidian","titanium-metallic","mesh-aurora","matte-ceramic","carbon-fiber","solid","transparent"]{if ui.selectable_value(&mut self.spec.bg_style,style.into(),style).changed(){self.needs_rerender=true;}}});
                color_row(ui,"Primary",&mut self.spec.bg_primary,&mut self.needs_rerender);
                color_row(ui,"Secondary",&mut self.spec.bg_secondary,&mut self.needs_rerender);
                color_row(ui,"Accent",&mut self.spec.bg_accent,&mut self.needs_rerender);
                slider(ui,"Gradient angle",&mut self.spec.gradient_angle_deg,0.0..=360.0,&mut self.needs_rerender);
                if ui.checkbox(&mut self.spec.bg_noise,"Surface noise").changed(){self.needs_rerender=true;}
                slider(ui,"Noise opacity",&mut self.spec.bg_noise_opacity,0.0..=0.2,&mut self.needs_rerender);
                if !self.ico_entries.is_empty(){
                    ui.label("ICO source entries");
                    egui::ComboBox::from_id_salt("ico-entry-picker").selected_text(format!("{} × {}",self.ico_entries[self.selected_ico_entry].width,self.ico_entries[self.selected_ico_entry].height)).show_ui(ui,|ui|{
                        for (index,entry) in self.ico_entries.iter().enumerate(){let label=format!("{} × {} · {} bit · {}",entry.width,entry.height,entry.bit_depth,if entry.is_png{"PNG"}else{"DIB"});if ui.selectable_value(&mut self.selected_ico_entry,index,label).changed(){self.imported=Some(self.ico_entries[index].image.clone());self.needs_rerender=true;}}
                    });
                }
                if let Some(source)=&self.imported{if ui.button("Auto-match palette from source").clicked(){let(a,b,c,d)=packaging::extract_palette(source);self.spec.bg_primary=a;self.spec.bg_secondary=b;self.spec.bg_accent=c;self.spec.glyph_color=d;self.needs_rerender=true;}}
                ui.separator();
                ui.label(egui::RichText::new("GLYPH").strong());
                if ui.checkbox(&mut self.glyph_is_text,"Use text emblem").changed(){self.needs_rerender=true;}
                if self.glyph_is_text {
                    if ui.text_edit_singleline(&mut self.glyph_text).changed(){self.needs_rerender=true;}
                    ui.label("Uses the Windows Segoe UI font and inherits glyph scale, rotation, colour and shadow settings.");
                } else {
                    egui::ComboBox::from_id_salt("glyph").selected_text(&self.glyph).show_ui(ui,|ui|{
                        for g in ["Layers","Terminal","Code2","Cpu","Database","Rocket","ShieldCheck","Sparkles","CloudLightning","Box","Globe","Gamepad2"] {
                            if ui.selectable_label(self.glyph==g,g).clicked(){self.glyph=g.into();self.needs_rerender=true;}
                        }
                    });
                }
                slider(ui,"Glyph scale",&mut self.spec.glyph_scale,0.15..=0.9,&mut self.needs_rerender);
                slider(ui,"Glyph X offset",&mut self.spec.glyph_offset_x,-80.0..=80.0,&mut self.needs_rerender);
                slider(ui,"Glyph Y offset",&mut self.spec.glyph_offset_y,-80.0..=80.0,&mut self.needs_rerender);
                slider(ui,"Glyph rotation",&mut self.spec.glyph_rotation,-180.0..=180.0,&mut self.needs_rerender);
                if ui.checkbox(&mut self.spec.glyph_shadow,"Glyph shadow").changed(){self.needs_rerender=true;}
                slider(ui,"Glyph shadow blur",&mut self.spec.glyph_shadow_blur,0.0..=32.0,&mut self.needs_rerender);
                slider(ui,"Glyph shadow opacity",&mut self.spec.glyph_shadow_opacity,0.0..=1.0,&mut self.needs_rerender);
                if ui.checkbox(&mut self.spec.glyph_emboss,"Glyph emboss").changed(){self.needs_rerender=true;}
                color_row(ui,"Glyph colour",&mut self.spec.glyph_color,&mut self.needs_rerender);
                if self.imported.is_some() && ui.button("Remove imported image").clicked(){self.imported=None;self.imported_name=None;self.ico_entries.clear();self.selected_ico_entry=0;self.needs_rerender=true;}
                ui.separator();
                ui.label(egui::RichText::new("LIGHTING & SHADOWS").strong());
                egui::ComboBox::from_id_salt("lighting-mode").selected_text(&self.spec.lighting).show_ui(ui,|ui|{for mode in ["liquid-specular","glass-reflex","chamfer-edge","subtle","none"]{if ui.selectable_value(&mut self.spec.lighting,mode.into(),mode).changed(){self.needs_rerender=true;}}});
                slider(ui,"Rim light",&mut self.spec.rim_light_opacity,0.0..=1.0,&mut self.needs_rerender);
                slider(ui,"Bevel thickness",&mut self.spec.bevel_thickness,0.0..=8.0,&mut self.needs_rerender);
                slider(ui,"Glass reflex",&mut self.spec.reflex_opacity,0.0..=1.0,&mut self.needs_rerender);
                slider(ui,"Inner shadow",&mut self.spec.inner_shadow_opacity,0.0..=1.0,&mut self.needs_rerender);
                color_row(ui,"Shadow colour",&mut self.spec.shadow_color,&mut self.needs_rerender);
                egui::ComboBox::from_id_salt("shadow-mode").selected_text(&self.spec.shadow_mode).show_ui(ui,|ui|{for mode in ["soft-dual","winui-diffuse","elevated-3d","flat","none"]{if ui.selectable_value(&mut self.spec.shadow_mode,mode.into(),mode).changed(){self.needs_rerender=true;}}});
                slider(ui,"Shadow blur",&mut self.spec.shadow_blur,0.0..=64.0,&mut self.needs_rerender);
                slider(ui,"Shadow offset",&mut self.spec.shadow_offset_y,0.0..=48.0,&mut self.needs_rerender);
                slider(ui,"Shadow opacity",&mut self.spec.shadow_opacity,0.0..=1.0,&mut self.needs_rerender);
                ui.separator();
                ui.label(egui::RichText::new("BADGE / OVERLAY").strong());
                egui::ComboBox::from_id_salt("badge-type").selected_text(&self.spec.badge).show_ui(ui,|ui|{for badge in ["none","beta","dev","pro","dot","windows","custom"]{if ui.selectable_value(&mut self.spec.badge,badge.into(),badge).changed(){self.needs_rerender=true;}}});
                egui::ComboBox::from_id_salt("badge-position").selected_text(&self.spec.badge_position).show_ui(ui,|ui|{for pos in ["top-right","top-left","bottom-right","bottom-left"]{if ui.selectable_value(&mut self.spec.badge_position,pos.into(),pos).changed(){self.needs_rerender=true;}}});
                if self.spec.badge!="none"&&self.spec.badge!="dot" {
                    if ui.text_edit_singleline(&mut self.spec.badge_text).changed(){self.needs_rerender=true;}
                    color_row(ui,"Badge text colour",&mut self.spec.badge_text_color,&mut self.needs_rerender);
                }
                color_row(ui,"Badge colour",&mut self.spec.badge_color,&mut self.needs_rerender);
                ui.separator();
                ui.label(egui::RichText::new("IMAGE GRADING").strong());
                slider(ui,"Brightness",&mut self.spec.brightness,0.2..=2.0,&mut self.needs_rerender);
                slider(ui,"Contrast",&mut self.spec.contrast,0.2..=2.0,&mut self.needs_rerender);
                slider(ui,"Saturation",&mut self.spec.saturation,0.0..=2.0,&mut self.needs_rerender);
                slider(ui,"Hue rotation",&mut self.spec.hue_rotate,-180.0..=180.0,&mut self.needs_rerender);
            });
        });

        egui::Panel::right("mipmaps").exact_size(174.0).resizable(false).show(ui,|ui|{
            ui.label(egui::RichText::new("MIPMAP PREVIEW").strong().size(11.0));
            ui.separator();
            egui::ScrollArea::vertical().show(ui,|ui|{
                for (res,tex) in &self.mipmap_textures {
                    ui.horizontal(|ui|{
                        ui.image((tex.id(),egui::vec2(42.0,42.0)));
                        ui.vertical(|ui|{
                            ui.label(format!("{res} × {res}"));
                            if ui.small_button(if self.selected_resolution==*res{"Selected"}else{"Preview"}).clicked(){self.selected_resolution=*res;self.needs_rerender=true;}
                        });
                    });
                    ui.add_space(6.0);
                }
            });
        });

        egui::Panel::bottom("status").exact_size(26.0).show(ui,|ui|{
            ui.horizontal_centered(|ui|{
                ui.label(egui::RichText::new(&self.status_msg).size(10.5));
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center),|ui|{
                    ui.add(egui::Slider::new(&mut self.zoom,0.5..=1.5).show_value(false).text("Zoom"));
                    ui.label(format!("{}×{} · RGBA8 · n={:.2}",self.selected_resolution,self.selected_resolution,self.spec.superellipse_n));
                });
            });
        });

        if self.show_export {
            let mut export_window_open=self.show_export;
            egui::Window::new("Export Studio")
                .open(&mut export_window_open)
                .collapsible(false)
                .resizable(false)
                .default_width(560.0)
                .show(&ctx,|ui| {
                    ui.horizontal_wrapped(|ui| {
                        for (index,label) in ["PNG","Windows ICO","Windows EXE","Developer ZIP","Rust Project"].iter().enumerate() {
                            ui.selectable_value(&mut self.export_tab,index,*label);
                        }
                    });
                    ui.separator();
                    match self.export_tab {
                        0 => {
                            ui.label("Export a transparent PNG at a chosen resolution.");
                            egui::ComboBox::from_id_salt("png-export-size")
                                .selected_text(format!("{} × {}",self.png_export_size,self.png_export_size))
                                .show_ui(ui,|ui|for size in RESOLUTIONS {ui.selectable_value(&mut self.png_export_size,size,format!("{size} × {size}"));});
                            if ui.button("Save PNG…").clicked(){self.export("PNG");}
                        },
                        1 => {
                            ui.label("Create a multi-resolution Windows .ico containing all standard icon sizes.");
                            ui.label("Included: 16, 24, 32, 48, 64, 128 and 256 pixels.");
                            if ui.button("Save Windows ICO…").clicked(){self.export("ICO");}
                        },
                        2 => {
                            ui.label("Generate a Windows PE executable with embedded icon resources and editable version metadata.");
                            egui::Grid::new("exe-export-metadata").num_columns(2).show(ui,|ui|{
                                ui.label("File name");ui.text_edit_singleline(&mut self.exe_metadata.file_name);ui.end_row();
                                ui.label("Application");ui.text_edit_singleline(&mut self.exe_metadata.app_name);ui.end_row();
                                ui.label("Publisher");ui.text_edit_singleline(&mut self.exe_metadata.company_name);ui.end_row();
                                ui.label("Version");ui.text_edit_singleline(&mut self.exe_metadata.version);ui.end_row();
                                ui.label("Description");ui.text_edit_singleline(&mut self.exe_metadata.description);ui.end_row();
                                ui.label("Window title");ui.text_edit_singleline(&mut self.exe_metadata.window_title);ui.end_row();
                            });
                            if ui.button("Build Windows EXE…").clicked(){self.export_exe();}
                        },
                        3 => {
                            ui.label("Package PNG mipmaps, ICO, generated EXE, manifest and usage notes into one ZIP.");
                            if ui.button("Create Developer ZIP…").clicked(){
                                if let Some(path)=rfd::FileDialog::new().set_file_name(format!("{}_developer_pack.zip",self.spec.name)).add_filter("ZIP archive",&["zip"]).save_file(){
                                    match packaging::export_developer_zip(&self.spec,self.imported.as_ref(),&self.glyph_source(),&path){
                                        Ok(())=>self.status_msg=format!("Developer pack saved · {}",path.display()),
                                        Err(e)=>self.status_msg=format!("ZIP export failed: {e}")
                                    }
                                }
                            }
                        },
                        _ => {
                            ui.label("Export a standalone Rust / egui / Fastframe project with your current icon as its starter asset.");
                            if ui.button("Create Rust Project ZIP…").clicked(){
                                if let Some(path)=rfd::FileDialog::new().set_file_name(format!("{}_rust_project.zip",self.spec.name)).add_filter("ZIP archive",&["zip"]).save_file(){
                                    match packaging::export_rust_project_zip(&self.spec,self.imported.as_ref(),&self.glyph_source(),&path){
                                        Ok(())=>self.status_msg=format!("Rust project exported · {}",path.display()),
                                        Err(e)=>self.status_msg=format!("Rust project export failed: {e}")
                                    }
                                }
                            }
                        }
                    }
                    ui.separator();
                    ui.label(egui::RichText::new(&self.status_msg).weak().size(10.0));
                });
            self.show_export=export_window_open;
        }

        if self.show_mockup{egui::Window::new("Context Mockup Simulator").open(&mut self.show_mockup).default_width(620.0).show(&ctx,|ui|{
            ui.horizontal(|ui|{for(i,label)in ["Windows 11 Desktop","Windows 11 Taskbar","Windows 11 Start","File Explorer"].iter().enumerate(){if ui.selectable_label(self.mockup_env==i,*label).clicked(){self.mockup_env=i;}}});ui.separator();
            let(rect,_)=ui.allocate_exact_size(egui::vec2(560.0,300.0),egui::Sense::hover());let painter=ui.painter();painter.rect_filled(rect,12.0,match self.mockup_env{0=>egui::Color32::from_rgb(18,28,46),1=>egui::Color32::from_rgb(24,35,53),2=>egui::Color32::from_rgb(18,32,55),_=>egui::Color32::from_rgb(238,240,244)});
            if let Some(tex)=&self.texture{let side=match self.mockup_env{0=>92.0,1=>48.0,2=>72.0,_=>24.0};let count=if self.mockup_env==0{6}else if self.mockup_env==1{8}else{1};let start=rect.center().x-(count as f32*side*1.25)*0.5;for i in 0..count{let x=start+i as f32*side*1.25;let y=if self.mockup_env==0||self.mockup_env==1{rect.bottom()-side-15.0}else{rect.center().y-side*0.5};let r=egui::Rect::from_min_size(egui::pos2(x,y),egui::vec2(side,side));painter.image(tex.id(),r,egui::Rect::from_min_max(egui::pos2(0.0,0.0),egui::pos2(1.0,1.0)),egui::Color32::WHITE);}}
            ui.label(match self.mockup_env{0=>"Windows 11 desktop icon scale preview",1=>"Windows 11 centered taskbar preview",2=>"Windows 11 Start menu preview",_=>"File Explorer icon preview"});
        });}

        egui::CentralPanel::default().show(ui,|ui|{
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
                    if self.compare_mode {
                        if let Some(source) = &self.source_texture {
                            let split_x = egui::lerp(rect.left()..=rect.right(), self.compare_split);
                            let left_clip = egui::Rect::from_min_max(rect.min, egui::pos2(split_x, rect.bottom()));
                            let source_painter = ui.painter().with_clip_rect(left_clip);
                            source_painter.image(source.id(), rect, egui::Rect::from_min_max(egui::pos2(0.0,0.0),egui::pos2(1.0,1.0)), egui::Color32::WHITE);
                            ui.painter().line_segment([egui::pos2(split_x,rect.top()),egui::pos2(split_x,rect.bottom())],egui::Stroke::new(2.0,egui::Color32::from_rgb(10,132,255)));
                            ui.painter().circle_filled(egui::pos2(split_x,rect.center().y),7.0,egui::Color32::from_rgb(10,132,255));
                        }
                    }
                    if self.show_guides {
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
    fn save(&mut self,storage:&mut dyn eframe::Storage) {
        let state=PersistedState {
            spec:self.spec.clone(),
            selected_resolution:self.selected_resolution,
            dark:self.dark,
            zoom:self.zoom,
            active_preset:self.active_preset.clone(),
            glyph:self.glyph.clone(),
            glyph_is_text:self.glyph_is_text,
            glyph_text:self.glyph_text.clone(),
            exe_metadata:self.exe_metadata.clone(),
        };
        eframe::set_value(storage,"iconforgeapp-state",&state);
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
        viewport:egui::ViewportBuilder::default().with_inner_size([1440.0,900.0]).with_min_inner_size([1120.0,700.0]).with_title("IconForge Pro").with_transparent(true),
        ..Default::default()
    };
    eframe::run_native("IconForge Pro",native_options,Box::new(|cc|Ok(Box::new(IconForgeNativeApp::new(cc)))))
}
