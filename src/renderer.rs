// Native Rust icon renderer and multi-format export pipeline.
use image::{Rgba, RgbaImage, ImageFormat};
use std::{path::Path, io::Cursor, sync::OnceLock};
use rayon::prelude::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum Shape { Squircle, WinUi, Circle, Hexagon, Shield, Square }
impl Shape {
    pub fn label(self)->&'static str { match self {Self::Squircle=>"Liquid Squircle",Self::WinUi=>"WinUI Rounded",Self::Circle=>"Circle",Self::Hexagon=>"Hexagon",Self::Shield=>"Shield",Self::Square=>"Square"} }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(default)]
pub struct IconSpec {
    pub name:String, pub shape:Shape, pub superellipse_n:f32, pub tile_scale:f32, pub corner_radius:f32,
    pub bg_primary:[u8;3],pub bg_secondary:[u8;3],pub bg_accent:[u8;3],pub gradient_angle_deg:f32,
    pub rim_light_opacity:f32,pub shadow_blur:f32,pub shadow_offset_y:f32,pub shadow_opacity:f32,
    pub glyph_scale:f32,pub glyph_color:[u8;3],pub glyph_offset_x:f32,pub glyph_offset_y:f32,pub glyph_rotation:f32,pub brightness:f32,pub contrast:f32,pub saturation:f32,pub hue_rotate:f32,
    pub bg_style:String,pub bg_noise:bool,pub bg_noise_opacity:f32,pub lighting:String,pub bevel_thickness:f32,pub reflex_opacity:f32,pub inner_shadow_opacity:f32,pub glyph_shadow:bool,pub glyph_shadow_blur:f32,pub glyph_shadow_opacity:f32,pub glyph_emboss:bool,pub shadow_color:[u8;3],pub shadow_mode:String,pub badge:String,pub badge_color:[u8;3],pub badge_text:String,pub badge_text_color:[u8;3],pub badge_position:String,
}
impl Default for IconSpec {
    fn default()->Self{Self{name:"IconForgeApp".into(),shape:Shape::Squircle,superellipse_n:4.5,tile_scale:0.805,corner_radius:0.224,
        bg_primary:[30,32,41],bg_secondary:[19,20,26],bg_accent:[11,12,16],gradient_angle_deg:145.0,
        rim_light_opacity:0.38,shadow_blur:32.0,shadow_offset_y:22.0,shadow_opacity:0.28,glyph_scale:0.62,glyph_color:[56,189,248],
        glyph_offset_x:0.0,glyph_offset_y:0.0,glyph_rotation:0.0,brightness:1.0,contrast:1.0,saturation:1.0,hue_rotate:0.0,bg_style:"linear-gradient".into(),bg_noise:true,bg_noise_opacity:0.04,lighting:"liquid-specular".into(),bevel_thickness:1.5,reflex_opacity:0.15,inner_shadow_opacity:0.0,glyph_shadow:true,glyph_shadow_blur:14.0,glyph_shadow_opacity:0.45,glyph_emboss:true,shadow_color:[0,0,0],shadow_mode:"soft-dual".into(),badge:"none".into(),badge_color:[245,158,11],badge_text:String::new(),badge_text_color:[255,255,255],badge_position:"top-right".into()}}
}

fn mix(a:f32,b:f32,t:f32)->f32{a+(b-a)*t.clamp(0.0,1.0)}
fn inside(shape:Shape,x:f32,y:f32,n:f32,r:f32,corner:f32)->bool{
    match shape{
        Shape::Circle=>x*x+y*y<=r*r,
        Shape::Hexagon=>y.abs()<=r*0.866 && x.abs()<=r-(y.abs()/0.866)*0.5,
        Shape::Shield=>y<r*0.55 && x.abs()<r*0.88 || y>=r*0.55 && y<=r && x.abs()<(r*(1.0-(y-r*0.55)/(r*0.9))*0.88),
        Shape::Square=>x.abs()<=r&&y.abs()<=r,
        Shape::WinUi=>{let cr=r*corner.clamp(0.02,0.49);let qx=(x.abs()-(r-cr)).max(0.0);let qy=(y.abs()-(r-cr)).max(0.0);qx*qx+qy*qy<=cr*cr},
        _=>(x.abs()/r).powf(n)+(y.abs()/r).powf(n)<=1.0
    }
}
fn glyph_coverage(name:&str,x:f32,y:f32,s:f32)->f32{
    let line=|d:f32| ((0.045-d)/0.02).clamp(0.0,1.0);
    let seg=|x:f32,y:f32,x1:f32,y1:f32,x2:f32,y2:f32|{let dx=x2-x1;let dy=y2-y1;let t=(((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)).clamp(0.0,1.0);let px=x1+t*dx;let py=y1+t*dy;line(((x-px).powi(2)+(y-py).powi(2)).sqrt())};
    let (x,y)=(x/s,y/s);
    let mut v=match name{
        "Layers"=>{let a=seg(x,y,-0.65,-0.30,0.0,0.02).max(seg(x,y,0.0,0.02,0.65,-0.30));let b=seg(x,y,-0.65,0.0,0.0,0.32).max(seg(x,y,0.0,0.32,0.65,0.0));let c=seg(x,y,-0.65,0.30,0.0,0.62).max(seg(x,y,0.0,0.62,0.65,0.30));a.max(b).max(c)},
        "Code2"=>seg(x,y,-0.35,-0.3,-0.65,0.0).max(seg(x,y,-0.65,0.0,-0.35,0.3)).max(seg(x,y,0.35,-0.3,0.65,0.0)).max(seg(x,y,0.65,0.0,0.35,0.3)).max(seg(x,y,0.12,-0.5,-0.12,0.5)),
        "ShieldCheck"=>{let shield: f32=if y>-0.55&&y<0.5&&x.abs()<0.5-y*0.25{1.0}else{0.0};shield.max(seg(x,y,-0.25,0.0,-0.05,0.2)).max(seg(x,y,-0.05,0.2,0.32,-0.24))},
        "Sparkles"=>{let d=(x*x+y*y).sqrt();let a=y.atan2(x);let radius=0.36+0.15*(a*4.0).cos();if (d-radius).abs()<0.07{1.0}else{0.0}},
        "CloudLightning"=>{let cloud: f32=if ((x/0.48).powi(2)+(y/0.27).powi(2)-1.0).abs()<0.16&&y<0.18{1.0}else{0.0};cloud.max(seg(x,y,0.12,0.05,-0.10,0.42)).max(seg(x,y,-0.10,0.42,0.12,0.42))},
        "Gamepad2"=>{let body: f32=if x.abs()<0.62&&y.abs()<0.32{1.0}else{0.0};body.max(seg(x,y,-0.38,0.0,-0.18,0.0)).max(seg(x,y,-0.28,-0.10,-0.28,0.10))},
        "Terminal"=>seg(x,y,-0.55,-0.35,0.0,0.0).max(seg(x,y,0.0,0.0,-0.55,0.35)).max(seg(x,y,-0.05,0.42,0.55,0.42)),
        "Code"=>seg(x,y,-0.35,-0.3,-0.65,0.0).max(seg(x,y,-0.65,0.0,-0.35,0.3)).max(seg(x,y,0.35,-0.3,0.65,0.0)).max(seg(x,y,0.65,0.0,0.35,0.3)).max(seg(x,y,0.12,-0.5,-0.12,0.5)),
        "Cpu"=>if x.abs()<0.38&&y.abs()<0.38&&(x.abs()>0.2||y.abs()>0.2){1.0}else if (x.abs()-0.48).abs()<0.035&&y.abs()<0.65 || (y.abs()-0.48).abs()<0.035&&x.abs()<0.65{1.0}else{0.0},
        "Database"=>if (x*x/0.42f32.powi(2)+y*y/0.15f32.powi(2)-1.0).abs()<0.12&&y<0.25{1.0}else if x.abs()<0.42&&(y.abs()-0.42).abs()<0.035{1.0}else{0.0},
        "Rocket"=>if (x*0.8+y*0.8).abs()<0.07&&(x-y).abs()<0.48{1.0}else if (x*x+y*y-0.38).abs()<0.07{1.0}else{0.0},
        "Shield"=>if y>-0.55&&y<0.5&&x.abs()<0.5-y*0.25{1.0}else{0.0},
        "Star"=>{let a=y.atan2(x);let rr=(a*2.5).cos()*0.18+0.48;if (x*x+y*y).sqrt()<rr && (x*x+y*y).sqrt()>rr-0.10{1.0}else{0.0}},
        "Globe"=>{let d=(x*x+y*y).sqrt();if (d-0.48).abs()<0.04||x.abs()<0.035&&d<0.48||y.abs()<0.035&&d<0.48{1.0}else{0.0}},
        "Box"=>if x.abs()<0.48&&y.abs()<0.48&&(x.abs()>0.42||y.abs()>0.42){1.0}else{0.0},
        _=>{let a=seg(x,y,0.0,-0.55,0.55,0.0);let b=seg(x,y,0.55,0.0,0.0,0.55);let c=seg(x,y,0.0,0.55,-0.55,0.0);let d=seg(x,y,-0.55,0.0,0.0,-0.55);a.max(b).max(c).max(d)}
    };
    v=v.max(0.0);v
}

fn system_ui_font()->Option<&'static fontdue::Font> {
    static FONT:OnceLock<Option<fontdue::Font>>=OnceLock::new();
    FONT.get_or_init(|| {
        #[cfg(windows)]
        let candidates=[r"C:\Windows\Fonts\segoeui.ttf",r"C:\Windows\Fonts\arial.ttf"];
        #[cfg(not(windows))]
        let candidates=[""];
        for path in candidates {
            if let Ok(bytes)=std::fs::read(path) {
                if let Ok(font)=fontdue::Font::from_bytes(bytes,fontdue::FontSettings::default()) {
                    return Some(font);
                }
            }
        }
        None
    }).as_ref()
}

fn rasterize_text_mask(text:&str,size:u32,scale:f32)->Option<Vec<u8>> {
    let font=system_ui_font()?;
    let chars:Vec<char>=text.chars().take(6).collect();
    if chars.is_empty(){return None;}
    let mut px=(size as f32*scale.clamp(0.18,0.9)*0.88).max(6.0);
    let mut width: f32=chars.iter().map(|ch|font.metrics(*ch,px).advance_width).sum();
    let max_width=size as f32*0.82;
    if width>max_width {px*=max_width/width;width=chars.iter().map(|ch|font.metrics(*ch,px).advance_width).sum();}
    let line=font.horizontal_line_metrics(px)?;
    let line_height=line.ascent-line.descent;
    let baseline=(size as f32-line_height)*0.5+line.ascent;
    let mut cursor=(size as f32-width)*0.5;
    let mut mask=vec![0u8;(size*size) as usize];
    for ch in chars {
        let (metrics,bitmap)=font.rasterize(ch,px);
        let left=(cursor+metrics.xmin as f32).round() as i32;
        let top=(baseline-metrics.ymin as f32-metrics.height as f32).round() as i32;
        for gy in 0..metrics.height {
            for gx in 0..metrics.width {
                let x=left+gx as i32;
                let y=top+gy as i32;
                if x>=0&&y>=0&&x<size as i32&&y<size as i32 {
                    let value=bitmap[gy*metrics.width+gx];
                    let index=(y as u32*size+x as u32) as usize;
                    mask[index]=mask[index].max(value);
                }
            }
        }
        cursor+=metrics.advance_width;
    }
    Some(mask)
}

fn draw_centered_text(image:&mut RgbaImage,text:&str,cx:f32,cy:f32,max_width:f32,font_px:f32,color:[u8;3]) {
    let Some(font)=system_ui_font() else{return;};
    let chars:Vec<char>=text.chars().take(12).collect();
    if chars.is_empty(){return;}
    let mut px=font_px.max(5.0);
    let mut width:f32=chars.iter().map(|ch|font.metrics(*ch,px).advance_width).sum();
    if width>max_width {px*=max_width/width;width=chars.iter().map(|ch|font.metrics(*ch,px).advance_width).sum();}
    let Some(line)=font.horizontal_line_metrics(px) else{return;};
    let baseline=cy+(line.ascent+line.descent)*0.5;
    let mut cursor=cx-width*0.5;
    for ch in chars {
        let (metrics,bitmap)=font.rasterize(ch,px);
        let left=(cursor+metrics.xmin as f32).round() as i32;
        let top=(baseline-metrics.ymin as f32-metrics.height as f32).round() as i32;
        for gy in 0..metrics.height {for gx in 0..metrics.width {
            let x=left+gx as i32;let y=top+gy as i32;
            if x<0||y<0||x>=image.width() as i32||y>=image.height() as i32{continue;}
            let alpha=bitmap[gy*metrics.width+gx] as f32/255.0;
            if alpha<=0.0{continue;}
            let dst=image.get_pixel_mut(x as u32,y as u32);
            for channel in 0..3{dst[channel]=mix(dst[channel] as f32,color[channel] as f32,alpha) as u8;}
        }}
        cursor+=metrics.advance_width;
    }
}

fn builtin_glyph_paths(name:&str)->Option<&'static [&'static str]> {
    Some(match name {
        "Layers"=>&["M12 2L2 7l10 5 10-5-10-5z","M2 17l10 5 10-5","M2 12l10 5 10-5"],
        "Terminal"=>&["M4 17l6-6-6-6","M12 19h8"],
        "Code2"=>&["M18 16l4-4-4-4","M6 8l-4 4 4 4","M14.5 4l-5 16"],
        "Cpu"=>&["M4 4h16v16H4z","M9 9h6v6H9z","M9 1v3","M15 1v3","M9 20v3","M15 20v3","M20 9h3","M20 14h3","M1 9h3","M1 14h3"],
        "Database"=>&["M21 5c0 1.66-4 3-9 3s-9-1.34-9-3 4-3 9-3 9 1.34 9 3z","M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5","M3 12c0 1.66 4 3 9 3s9-1.34 9-3"],
        "Rocket"=>&["M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z","M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z","M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0","M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"],
        "ShieldCheck"=>&["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z","M9 12l2 2 4-4"],
        "Sparkles"=>&["M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z","M20 3v4","M22 5h-4","M4 17v2","M5 18H3"],
        "CloudLightning"=>&["M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973","M13 12l-3 5h4l-3 5"],
        "Box"=>&["M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z","M3.27 6.96L12 12.01l8.73-5.05","M12 22.08V12"],
        "Globe"=>&["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M2 12h20","M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"],
        "Gamepad2"=>&["M6 12h4","M8 10v4","M15 13h.01","M18 11h.01","M18 11a4 4 0 0 0-4-4H10a4 4 0 0 0-4 4v2a4 4 0 0 0 2 3.46l1.2.6a2 2 0 0 0 1.8 0l1-.5a2 2 0 0 1 2 0l1 .5a2 2 0 0 0 1.8 0l1.2-.6A4 4 0 0 0 20 13v-2z"],
        _=>return None,
    })
}

fn rasterize_builtin_glyph_mask(name:&str,size:u32,scale:f32)->Option<Vec<u8>> {
    let paths=builtin_glyph_paths(name)?;
    let mut svg=String::from("<svg xmlns='http://www.w3.org/2000/svg' width='");
    svg.push_str(&size.to_string());
    svg.push_str("' height='");
    svg.push_str(&size.to_string());
    svg.push_str("' viewBox='0 0 24 24'><g fill='none' stroke='white' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' transform='translate(12 12) scale(");
    svg.push_str(&format!("{:.5}",scale.clamp(0.25,1.2)));
    svg.push_str(") translate(-12 -12)'>");
    for path in paths {svg.push_str("<path d='");svg.push_str(path);svg.push_str("'/>");}
    svg.push_str("</g></svg>");
    let mut options=resvg::usvg::Options::default();
    options.fontdb_mut().load_system_fonts();
    let tree=resvg::usvg::Tree::from_data(svg.as_bytes(),&options).ok()?;
    let mut pixmap=resvg::tiny_skia::Pixmap::new(size,size)?;
    resvg::render(&tree,resvg::tiny_skia::Transform::identity(),&mut pixmap.as_mut());
    let rgba=pixmap.take();
    Some(rgba.chunks_exact(4).map(|pixel|pixel[3]).collect())
}

fn text_mask_coverage(mask:&[u8],size:u32,x:f32,y:f32)->f32 {
    let px=((x+1.0)*0.5*size as f32).floor() as i32;
    let py=((y+1.0)*0.5*size as f32).floor() as i32;
    if px<0||py<0||px>=size as i32||py>=size as i32 {return 0.0;}
    mask[(py as u32*size+px as u32) as usize] as f32/255.0
}

pub fn render_icon(spec:&IconSpec,size:u32,custom:Option<&RgbaImage>,glyph:&str)->RgbaImage{
    let glyph_mask=glyph.strip_prefix("text:").and_then(|text|rasterize_text_mask(text,size,spec.glyph_scale)).or_else(||rasterize_builtin_glyph_mask(glyph,size,spec.glyph_scale));
    let mut out=RgbaImage::new(size,size);let half=size as f32*0.5;let radius=half*spec.tile_scale;let angle=spec.gradient_angle_deg.to_radians();
    let max_t=(angle.cos().abs()+angle.sin().abs()).max(0.001);
    out.as_mut().par_chunks_mut(size as usize * 4).enumerate().for_each(|(row_index, row)| { let y = row_index as u32; for x in 0..size {
        let nx=(x as f32+0.5-half)/radius;let ny=(y as f32+0.5-half)/radius;
        let offsets=[(-0.25f32,-0.25f32),(0.25,-0.25),(-0.25,0.25),(0.25,0.25)];
        let coverage=offsets.iter().filter(|(ox,oy)|inside(spec.shape,(nx+*ox/radius)*radius,(ny+*oy/radius)*radius,spec.superellipse_n,radius,spec.corner_radius)).count() as f32/4.0;
        let idx=if coverage<=0.0{Rgba([0,0,0,0])}else{
            let t=(((nx*angle.cos()+ny*angle.sin())/max_t)+1.0)*0.5;
            let radial=(nx*nx+ny*ny).sqrt();
            let t=match spec.bg_style.as_str(){"radial-gradient"=>1.0-radial.clamp(0.0,1.0),"solid"=>0.0,"dark-obsidian"=>t*0.65,"titanium-metallic"=>((t*3.0).sin()*0.5+0.5),"acrylic-glass"=>t*0.72+radial*0.28,"carbon-fiber"=>t*0.55+if ((nx*radius/5.0).floor() as i32+(ny*radius/5.0).floor() as i32)%2==0{0.10}else{0.0},"mesh-aurora"=>((nx*2.2).sin()+(ny*2.0).cos()+2.0)*0.25,"matte-ceramic"=>t*0.35+0.32,_=>t};
            let mut rgb=[0u8;3];
            for c in 0..3{let mid=mix(spec.bg_primary[c] as f32,spec.bg_secondary[c] as f32,t);rgb[c]=(mid*spec.brightness).clamp(0.0,255.0) as u8;}
            let edge=(1.0-(nx.abs().max(ny.abs()))).clamp(0.0,1.0);
            for c in 0..3{rgb[c]=(rgb[c] as f32+spec.bg_accent[c] as f32*(1.0-edge)*0.12).clamp(0.0,255.0) as u8;}
            if spec.bg_noise {let hash=((x.wrapping_mul(374761393)^y.wrapping_mul(668265263)^((x*y+17).wrapping_mul(1442695041)))&255) as f32/255.0;let noise=(hash-0.5)*spec.bg_noise_opacity*255.0;for c in 0..3{rgb[c]=(rgb[c] as f32+noise).clamp(0.0,255.0) as u8;}}
            let mut pixel=Rgba([rgb[0],rgb[1],rgb[2],if spec.bg_style=="transparent"{0}else{255}]);
            if let Some(src)=custom{let (sw,sh)=src.dimensions();let u=((nx/spec.glyph_scale+1.0)*0.5).clamp(0.0,1.0);let v=((ny/spec.glyph_scale+1.0)*0.5).clamp(0.0,1.0);let sx=(u*(sw.saturating_sub(1)) as f32) as u32;let sy=(v*(sh.saturating_sub(1)) as f32) as u32;let p=src.get_pixel(sx,sy);if p[3]>0{pixel=*p;}}
            else {
                let rot=spec.glyph_rotation.to_radians();
                let gx=nx-spec.glyph_offset_x/(size as f32);
                let gy=ny-spec.glyph_offset_y/(size as f32);
                let rx=gx*rot.cos()-gy*rot.sin();
                let ry=gx*rot.sin()+gy*rot.cos();
                let cov=if let Some(mask)=&glyph_mask{text_mask_coverage(mask,size,rx,ry)}else{glyph_coverage(glyph,rx,ry,spec.glyph_scale)};
                if spec.glyph_shadow {
                    let off=(spec.glyph_shadow_blur/size as f32).clamp(0.006,0.08);
                    let shadow=if let Some(mask)=&glyph_mask{text_mask_coverage(mask,size,rx,ry-off)}else{glyph_coverage(glyph,rx,ry-off,spec.glyph_scale)};
                    if shadow>0.0 { for c in 0..3 { pixel[c]=mix(pixel[c] as f32,spec.shadow_color[c] as f32,shadow*spec.glyph_shadow_opacity) as u8; } }
                }
                if spec.glyph_emboss {
                    let highlight=if let Some(mask)=&glyph_mask{text_mask_coverage(mask,size,rx-0.012,ry-0.012)}else{glyph_coverage(glyph,rx-0.012,ry-0.012,spec.glyph_scale)};
                    if highlight>cov { for c in 0..3 { pixel[c]=(pixel[c] as f32+highlight*18.0).clamp(0.0,255.0) as u8; } }
                }
                if cov>0.0 { if pixel[3]==0 { pixel=Rgba([spec.glyph_color[0],spec.glyph_color[1],spec.glyph_color[2],(cov*255.0) as u8]); } else { for c in 0..3 { pixel[c]=mix(pixel[c] as f32,spec.glyph_color[c] as f32,cov) as u8; } } }
            }
            let rim=((1.0-(nx*nx+ny*ny).sqrt())*7.0).clamp(0.0,1.0)*spec.rim_light_opacity;
            let band=(nx+ny+0.65).abs();let glass=if spec.lighting=="glass-reflex"{(1.0-band*1.8).clamp(0.0,1.0)*spec.reflex_opacity}else{0.0};
            let inner=((1.0-nx.abs().max(ny.abs()))*spec.bevel_thickness*0.35).clamp(0.0,1.0)*spec.inner_shadow_opacity;
            for c in 0..3{pixel[c]=(pixel[c] as f32+rim*34.0+glass*220.0-inner*42.0).clamp(0.0,255.0) as u8;}
            pixel[3]=(pixel[3] as f32*coverage).clamp(0.0,255.0) as u8;
            pixel
        };
        let offset = x as usize * 4; row[offset..offset + 4].copy_from_slice(&idx.0);
    }});
    // Soft drop shadow outside tile, approximated with a smooth distance falloff.
    if spec.shadow_mode!="none"&&spec.shadow_opacity>0.0&&spec.tile_scale<0.99{
        let original=out.clone();
        let shadow_factor=match spec.shadow_mode.as_str(){"elevated-3d"=>1.55,"winui-diffuse"=>0.85,"flat"=>0.18,_=>1.0};
        let spread=(spec.shadow_blur/size as f32*0.22*shadow_factor).max(0.006);
        let shadow_gain=spec.shadow_opacity*0.28*if spec.shadow_mode=="elevated-3d"{1.45}else{1.0};
        out.as_mut().par_chunks_mut(size as usize * 4).enumerate().for_each(|(row_index,row)| {
            let y=row_index as u32;
            for x in 0..size {
                let offset=x as usize*4;
                if original.as_raw()[row_index*size as usize*4+offset+3]==0 {
                    let dx=(x as f32+0.5-half)/half;
                    let dy=(y as f32+0.5-half-spec.shadow_offset_y/size as f32*2.0)/half;
                    let d=(dx*dx+dy*dy).sqrt();
                    let edge=1.0-spec.tile_scale;
                    let alpha=((edge+spread-d)/spread).clamp(0.0,1.0)*shadow_gain;
                    if alpha>0.0 { row[offset..offset+4].copy_from_slice(&[spec.shadow_color[0],spec.shadow_color[1],spec.shadow_color[2],(alpha*255.0) as u8]); }
                }
            }
        });
    }
    // Contrast, saturation and hue grading.
    for p in out.pixels_mut() {
        if p[3] == 0 { continue; }
        let mut rgb = [p[0] as f32 / 255.0, p[1] as f32 / 255.0, p[2] as f32 / 255.0];
        for c in 0..3 { rgb[c] = ((rgb[c] - 0.5) * spec.contrast + 0.5).clamp(0.0, 1.0); }
        let lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
        for c in 0..3 { rgb[c] = (lum + (rgb[c] - lum) * spec.saturation).clamp(0.0, 1.0); }
        let (h, sat, val) = rgb_to_hsv(rgb);
        let shifted = hsv_to_rgb((h + spec.hue_rotate / 360.0).rem_euclid(1.0), sat, val);
        for c in 0..3 { p[c] = (shifted[c] * 255.0).clamp(0.0, 255.0) as u8; }
    }
    // Badge is rendered after the clipped tile, matching the original overlay layer.
    if spec.badge != "none" {
        let (cx,cy)=match spec.badge_position.as_str(){
            "top-left"=>(size as f32*0.19,size as f32*0.19),
            "bottom-left"=>(size as f32*0.19,size as f32*0.81),
            "bottom-right"=>(size as f32*0.81,size as f32*0.81),
            _=>(size as f32*0.81,size as f32*0.19),
        };
        if spec.badge=="dot" {
            let radius=(size as f32*0.105).max(2.0);
            for y in 0..size {for x in 0..size {
                let d=((x as f32+0.5-cx).powi(2)+(y as f32+0.5-cy).powi(2)).sqrt();
                if d<=radius {out.put_pixel(x,y,Rgba([spec.badge_color[0],spec.badge_color[1],spec.badge_color[2],255]));}
            }}
        } else {
            let label=if !spec.badge_text.trim().is_empty(){spec.badge_text.trim()}else{match spec.badge.as_str(){"beta"=>"BETA","dev"=>"DEV","pro"=>"PRO","windows"=>"WIN","custom"=>"CUSTOM",_=>"NEW"}};
            let height=(size as f32*0.16).max(8.0);
            let width=(label.chars().count() as f32*height*0.58+height*0.82).clamp(height*1.35,size as f32*0.48);
            let radius=height*0.5;
            for y in 0..size {for x in 0..size {
                let dx=(x as f32+0.5-cx).abs();
                let dy=(y as f32+0.5-cy).abs();
                let inside=if dx<=width*0.5-radius {dy<=radius}else{(dx-(width*0.5-radius)).powi(2)+dy*dy<=radius*radius};
                if inside {out.put_pixel(x,y,Rgba([spec.badge_color[0],spec.badge_color[1],spec.badge_color[2],255]));}
            }}
            draw_centered_text(&mut out,label,cx,cy,width*0.82,height*0.58,spec.badge_text_color);
        }
    }
    out
}
fn rgb_to_hsv(c: [f32; 3]) -> (f32, f32, f32) {
    let max = c[0].max(c[1]).max(c[2]);
    let min = c[0].min(c[1]).min(c[2]);
    let d = max - min;
    let h = if d == 0.0 { 0.0 }
        else if max == c[0] { ((c[1] - c[2]) / d).rem_euclid(6.0) / 6.0 }
        else if max == c[1] { ((c[2] - c[0]) / d + 2.0) / 6.0 }
        else { ((c[0] - c[1]) / d + 4.0) / 6.0 };
    (h, if max == 0.0 { 0.0 } else { d / max }, max)
}
fn hsv_to_rgb(h: f32, s: f32, v: f32) -> [f32; 3] {
    let c = v * s;
    let x = c * (1.0 - ((h * 6.0).rem_euclid(2.0) - 1.0).abs());
    let m = v - c;
    let rgb = match (h * 6.0).floor() as i32 {
        0 => [c, x, 0.0], 1 => [x, c, 0.0], 2 => [0.0, c, x],
        3 => [0.0, x, c], 4 => [x, 0.0, c], _ => [c, 0.0, x],
    };
    [rgb[0] + m, rgb[1] + m, rgb[2] + m]
}
fn png_bytes(img:&RgbaImage)->Result<Vec<u8>,Box<dyn std::error::Error>>{let mut bytes=Cursor::new(Vec::new());image::DynamicImage::ImageRgba8(img.clone()).write_to(&mut bytes,ImageFormat::Png)?;Ok(bytes.into_inner())}
pub fn export_png_at_size(spec:&IconSpec,path:&Path,custom:Option<&RgbaImage>,glyph:&str,size:u32)->Result<(),Box<dyn std::error::Error>>{render_icon(spec,size.clamp(16,1024),custom,glyph).save_with_format(path,ImageFormat::Png)?;Ok(())}
pub fn export_png(spec:&IconSpec,path:&Path,custom:Option<&RgbaImage>,glyph:&str)->Result<(),Box<dyn std::error::Error>>{export_png_at_size(spec,path,custom,glyph,1024)}
pub fn export_ico(spec:&IconSpec,path:&Path,custom:Option<&RgbaImage>,glyph:&str)->Result<(),Box<dyn std::error::Error>>{
    let mut dir=ico::IconDir::new(ico::ResourceType::Icon);
    for size in [16u32,24,32,48,64,128,256]{let image=render_icon(spec,size,custom,glyph);dir.add_entry(ico::IconDirEntry::encode(&ico::IconImage::from_rgba_data(size,size,image.into_raw()))?);}
    dir.write(std::fs::File::create(path)?)?;Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_original_vector_glyph_renders_from_its_svg_path() {
        for name in ["Layers","Terminal","Code2","Cpu","Database","Rocket","ShieldCheck","Sparkles","CloudLightning","Box","Globe","Gamepad2"] {
            let mask=rasterize_builtin_glyph_mask(name,128,0.62).expect("known glyph should rasterize");
            let visible=mask.iter().filter(|alpha|**alpha>16).count();
            assert!(visible>20,"{name} should produce visible vector coverage");
        }
    }

    #[test]
    fn unknown_glyph_names_keep_the_fallback_renderer() {
        assert!(builtin_glyph_paths("not-a-real-glyph").is_none());
    }

    #[test]
    fn in_memory_svg_import_rasterizes_to_rgba() {
        let svg=br##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#336699"/></svg>"##;
        let image=load_svg_data(svg).expect("sample SVG should render");
        assert_eq!(image.dimensions(),(24,24));
        assert_eq!(image.get_pixel(12,12)[3],255);
    }

    #[test]
    fn renders_requested_dimensions() {
        let image = render_icon(&IconSpec::default(), 128, None, "Layers");
        assert_eq!(image.dimensions(), (128, 128));
    }

    #[test]
    fn transparent_canvas_corners_remain_transparent() {
        let image = render_icon(&IconSpec::default(), 128, None, "Layers");
        assert_eq!(image.get_pixel(0, 0)[3], 0);
        assert_eq!(image.get_pixel(127, 127)[3], 0);
    }

    #[test]
    fn centre_of_icon_is_visible() {
        let image = render_icon(&IconSpec::default(), 128, None, "Layers");
        assert_eq!(image.get_pixel(64, 64)[3], 255);
    }

    #[test]
    fn hue_and_saturation_are_applied_without_changing_alpha() {
        let mut spec = IconSpec::default();
        spec.hue_rotate = 120.0;
        spec.saturation = 1.8;
        let image = render_icon(&spec, 64, None, "Terminal");
        assert_eq!(image.get_pixel(32, 32)[3], 255);
    }

    #[test]
    fn transparent_background_keeps_glyph_alpha() {
        let mut spec=IconSpec::default();
        spec.bg_style="transparent".into();
        let image=render_icon(&spec,128,None,"Terminal");
        let visible=image.pixels().filter(|p|p[3]>0).count();
        assert!(visible>0);
        assert!(visible<(128*128) as usize);
    }

}

#[derive(Clone)]
pub struct IcoEntry {
    pub width:u32,
    pub height:u32,
    pub bit_depth:u16,
    pub is_png:bool,
    pub byte_length:usize,
    pub image:RgbaImage,
}

pub fn parse_ico_file(path:&Path)->Result<Vec<IcoEntry>,Box<dyn std::error::Error>>{
    let directory=ico::IconDir::read(std::fs::File::open(path)?)?;
    let mut entries=Vec::new();
    for entry in directory.entries(){
        let decoded=entry.decode()?;
        let width=decoded.width();
        let height=decoded.height();
        let pixels=decoded.rgba_data().to_vec();
        let image=RgbaImage::from_raw(width,height,pixels).ok_or("ICO entry had an invalid RGBA buffer")?;
        entries.push(IcoEntry{width,height,bit_depth:entry.bits_per_pixel(),is_png:entry.is_png(),byte_length:entry.data().len(),image});
    }
    entries.sort_by(|a,b|b.width.cmp(&a.width).then(b.bit_depth.cmp(&a.bit_depth)));
    Ok(entries)
}


pub fn load_svg_data(data:&[u8])->Result<RgbaImage,Box<dyn std::error::Error>>{
    let mut options=resvg::usvg::Options::default();
    options.fontdb_mut().load_system_fonts();
    let tree=resvg::usvg::Tree::from_data(data,&options)?;
    let source_size=tree.size();
    let scale=(1024.0/source_size.width().max(source_size.height())).min(1.0);
    let width=(source_size.width()*scale).ceil().max(1.0) as u32;
    let height=(source_size.height()*scale).ceil().max(1.0) as u32;
    let mut pixmap=resvg::tiny_skia::Pixmap::new(width,height).ok_or("Could not allocate SVG render surface")?;
    resvg::render(&tree,resvg::tiny_skia::Transform::from_scale(scale,scale),&mut pixmap.as_mut());
    RgbaImage::from_raw(width,height,pixmap.take()).ok_or_else(||"SVG renderer returned an invalid pixel buffer".into())
}

pub fn load_svg_file(path:&Path)->Result<RgbaImage,Box<dyn std::error::Error>>{
    let mut options=resvg::usvg::Options::default();
    options.resources_dir=path.parent().map(|p|p.to_path_buf());
    options.fontdb_mut().load_system_fonts();
    let data=std::fs::read(path)?;
    let tree=resvg::usvg::Tree::from_data(&data,&options)?;
    let source_size=tree.size();
    let scale=(1024.0/source_size.width().max(source_size.height())).min(1.0);
    let width=(source_size.width()*scale).ceil().max(1.0) as u32;
    let height=(source_size.height()*scale).ceil().max(1.0) as u32;
    let mut pixmap=resvg::tiny_skia::Pixmap::new(width,height).ok_or("Could not allocate SVG render surface")?;
    resvg::render(&tree,resvg::tiny_skia::Transform::from_scale(scale,scale),&mut pixmap.as_mut());
    RgbaImage::from_raw(width,height,pixmap.take()).ok_or_else(||"SVG renderer returned an invalid pixel buffer".into())
}
