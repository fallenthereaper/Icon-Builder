// Native Rust icon renderer and multi-format export pipeline.
use image::{Rgba, RgbaImage, ImageFormat};
use std::{io::Cursor, path::Path};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Shape { Squircle, IosSquircle, WinUi, Circle, Hexagon, Shield, Square }
impl Shape {
    pub fn label(self)->&'static str { match self {Self::Squircle=>"macOS Squircle",Self::IosSquircle=>"iOS Squircle",Self::WinUi=>"WinUI Rounded",Self::Circle=>"Circle",Self::Hexagon=>"Hexagon",Self::Shield=>"Shield",Self::Square=>"Square"} }
}

#[derive(Clone, Debug)]
pub struct IconSpec {
    pub name:String, pub shape:Shape, pub superellipse_n:f32, pub tile_scale:f32, pub corner_radius:f32,
    pub bg_primary:[u8;3],pub bg_secondary:[u8;3],pub bg_accent:[u8;3],pub gradient_angle_deg:f32,
    pub rim_light_opacity:f32,pub shadow_blur:f32,pub shadow_offset_y:f32,pub shadow_opacity:f32,
    pub glyph_scale:f32,pub glyph_color:[u8;3],pub brightness:f32,pub contrast:f32,pub saturation:f32,pub hue_rotate:f32,
}
impl Default for IconSpec {
    fn default()->Self{Self{name:"IconForgeApp".into(),shape:Shape::Squircle,superellipse_n:4.5,tile_scale:0.805,corner_radius:0.224,
        bg_primary:[30,32,41],bg_secondary:[19,20,26],bg_accent:[11,12,16],gradient_angle_deg:145.0,
        rim_light_opacity:0.38,shadow_blur:32.0,shadow_offset_y:22.0,shadow_opacity:0.28,glyph_scale:0.62,glyph_color:[56,189,248],
        brightness:1.0,contrast:1.0,saturation:1.0,hue_rotate:0.0}}
}

fn mix(a:f32,b:f32,t:f32)->f32{a+(b-a)*t.clamp(0.0,1.0)}
fn inside(shape:Shape,x:f32,y:f32,n:f32,r:f32)->bool{
    match shape{
        Shape::Circle=>x*x+y*y<=r*r,
        Shape::Hexagon=>y.abs()<=r*0.866 && x.abs()<=r-(y.abs()/0.866)*0.5,
        Shape::Shield=>y<r*0.55 && x.abs()<r*0.88 || y>=r*0.55 && y<=r && x.abs()<(r*(1.0-(y-r*0.55)/(r*0.9))*0.88),
        Shape::Square=>x.abs()<=r&&y.abs()<=r,
        Shape::WinUi=>{let cr=r*0.32;let qx=(x.abs()-(r-cr)).max(0.0);let qy=(y.abs()-(r-cr)).max(0.0);qx*qx+qy*qy<=cr*cr},
        _=>(x.abs()/r).powf(n)+(y.abs()/r).powf(n)<=1.0
    }
}
fn glyph_coverage(name:&str,x:f32,y:f32,s:f32)->f32{
    let line=|d:f32| if d<0.035 {1.0}else{0.0};
    let seg=|x:f32,y:f32,x1:f32,y1:f32,x2:f32,y2:f32|{let dx=x2-x1;let dy=y2-y1;let t=(((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)).clamp(0.0,1.0);let px=x1+t*dx;let py=y1+t*dy;line(((x-px).powi(2)+(y-py).powi(2)).sqrt())};
    let (x,y)=(x/s,y/s);
    let mut v=match name{
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

pub fn render_icon(spec:&IconSpec,size:u32,custom:Option<&RgbaImage>,glyph:&str)->RgbaImage{
    let mut out=RgbaImage::new(size,size);let half=size as f32*0.5;let radius=half*spec.tile_scale;let angle=spec.gradient_angle_deg.to_radians();
    let max_t=(angle.cos().abs()+angle.sin().abs()).max(0.001);
    for y in 0..size{for x in 0..size{
        let nx=(x as f32+0.5-half)/radius;let ny=(y as f32+0.5-half)/radius;
        let inside_tile=inside(spec.shape,nx*radius,ny*radius,spec.superellipse_n,radius);
        let idx=if !inside_tile{Rgba([0,0,0,0])}else{
            let t=(((nx*angle.cos()+ny*angle.sin())/max_t)+1.0)*0.5;
            let mut rgb=[0u8;3];
            for c in 0..3{let mid=mix(spec.bg_primary[c] as f32,spec.bg_secondary[c] as f32,t);rgb[c]=(mid*spec.brightness).clamp(0.0,255.0) as u8;}
            let edge=(1.0-(nx.abs().max(ny.abs()))).clamp(0.0,1.0);
            for c in 0..3{rgb[c]=(rgb[c] as f32+spec.bg_accent[c] as f32*(1.0-edge)*0.12).clamp(0.0,255.0) as u8;}
            let mut pixel=Rgba([rgb[0],rgb[1],rgb[2],255]);
            if let Some(src)=custom{let (sw,sh)=src.dimensions();let u=((nx/spec.glyph_scale+1.0)*0.5).clamp(0.0,1.0);let v=((ny/spec.glyph_scale+1.0)*0.5).clamp(0.0,1.0);let sx=(u*(sw.saturating_sub(1)) as f32) as u32;let sy=(v*(sh.saturating_sub(1)) as f32) as u32;let p=src.get_pixel(sx,sy);if p[3]>0{pixel=*p;}}
            else{let cov=glyph_coverage(glyph,nx,ny,spec.glyph_scale);if cov>0.0{for c in 0..3{pixel[c]=mix(pixel[c] as f32,spec.glyph_color[c] as f32,cov) as u8;}}}
            let rim=((1.0-(nx*nx+ny*ny).sqrt())*7.0).clamp(0.0,1.0)*spec.rim_light_opacity;
            for c in 0..3{pixel[c]=(pixel[c] as f32+rim*34.0).clamp(0.0,255.0) as u8;}
            pixel
        };
        out.put_pixel(x,y,idx);
    }}
    // Soft drop shadow outside tile, approximated with a smooth distance falloff.
    if spec.shadow_opacity>0.0&&spec.tile_scale<0.99{
        let original=out.clone();
        for y in 0..size{for x in 0..size{if original.get_pixel(x,y)[3]==0{
            let dx=(x as f32+0.5-half)/half;let dy=(y as f32+0.5-half-spec.shadow_offset_y/size as f32*2.0)/half;
            let d=(dx*dx+dy*dy).sqrt();let edge=1.0-spec.tile_scale;let spread=(spec.shadow_blur/size as f32*0.22).max(0.006);
            let alpha=((edge+spread-d)/spread).clamp(0.0,1.0)*spec.shadow_opacity*0.28;
            if alpha>0.0{out.put_pixel(x,y,Rgba([0,0,0,(alpha*255.0) as u8]));}
        }}}
    }
    // Contrast/saturation grading.
    for p in out.pixels_mut(){if p[3]==0{continue;}for c in 0..3{p[c]=(((p[c] as f32/255.0-0.5)*spec.contrast+0.5)*255.0).clamp(0.0,255.0) as u8;}}
    out
}
fn png_bytes(img:&RgbaImage)->Result<Vec<u8>,Box<dyn std::error::Error>>{let mut bytes=Cursor::new(Vec::new());image::DynamicImage::ImageRgba8(img.clone()).write_to(&mut bytes,ImageFormat::Png)?;Ok(bytes.into_inner())}
pub fn export_png(spec:&IconSpec,path:&Path,custom:Option<&RgbaImage>,glyph:&str)->Result<(),Box<dyn std::error::Error>>{render_icon(spec,1024,custom,glyph).save_with_format(path,ImageFormat::Png)?;Ok(())}
pub fn export_ico(spec:&IconSpec,path:&Path,custom:Option<&RgbaImage>,glyph:&str)->Result<(),Box<dyn std::error::Error>>{
    let mut dir=ico::IconDir::new(ico::ResourceType::Icon);
    for size in [16u32,24,32,48,64,128,256]{let image=render_icon(spec,size,custom,glyph);dir.add_entry(ico::IconDirEntry::encode(&ico::IconImage::from_rgba_data(size,size,image.into_raw()))?);}
    dir.write(std::fs::File::create(path)?)?;Ok(())
}
pub fn export_icns(spec:&IconSpec,path:&Path,custom:Option<&RgbaImage>,glyph:&str)->Result<(),Box<dyn std::error::Error>>{
    let mut chunks=Vec::<(u32,[u8;4],Vec<u8>)>::new();
    for (size,tag) in [(16,*b"icp4"),(32,*b"icp5"),(64,*b"icp6"),(128,*b"ic07"),(256,*b"ic08"),(512,*b"ic09"),(1024,*b"ic10")]{
        let png=png_bytes(&render_icon(spec,size,custom,glyph))?;chunks.push((size,tag,png));
    }
    let total=8+chunks.iter().map(|(_,_,b)|8+b.len()).sum::<usize>();let mut out=Vec::with_capacity(total);out.extend_from_slice(b"icns");out.extend_from_slice(&(total as u32).to_be_bytes());
    for (_,tag,data) in chunks{out.extend_from_slice(&tag);out.extend_from_slice(&((data.len()+8) as u32).to_be_bytes());out.extend_from_slice(&data);}
    std::fs::write(path,out)?;Ok(())
}
