use std::{fs::File, io::Write, path::Path};
use image::RgbaImage;
use crate::renderer::{IconSpec, render_icon, export_ico};
use crate::pe_exe::{ExeMetadata, PngIcon, png_icon, generate_windows_ex};

pub fn export_developer_zip(spec:&IconSpec,custom:Option<&RgbaImage>,glyph:&str,destination:&Path)->Result<(),Box<dyn std::error::Error>>{
 let file=File::create(destination)?;
 let mut zip=zip::ZipWriter::new(file);
 let options=zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated).unix_permissions(0o644);
 for size in [16u32,24,32,48,64,128,180,192,256,512,1024]{
  let image=render_icon(spec,size,custom,glyph);let mut png=std::io::Cursor::new(Vec::new());
  image::DynamicImage::ImageRgba8(image).write_to(&mut png,image::ImageFormat::Png)?;
  zip.start_file(format!("assets/png/{size}x{size}.png"),options.clone())?;zip.write_all(png.get_ref())?;
 }
 let temp=std::env::temp_dir().join(format!("{}_bundle.ico",safe_name(&spec.name)));
 export_ico(spec,&temp,custom,glyph)?;zip.start_file(format!("windows/{}.ico",safe_name(&spec.name)),options.clone())?;zip.write_all(&std::fs::read(&temp)?)?;let _=std::fs::remove_file(&temp);
 let mut exe_icons:Vec<PngIcon>=Vec::new();
 for size in [16u32,32,48,64,256] {
  let image=render_icon(spec,size,custom,glyph);
  exe_icons.push(png_icon(size,&image)?);
 }
 let metadata=ExeMetadata{file_name:safe_name(&spec.name),app_name:spec.name.clone(),company_name:"Native Studio".into(),version:"1.0.0".into(),description:"IconForge generated Windows icon application".into(),window_title:spec.name.clone()};
 let exe=generate_windows_ex(&exe_icons,&metadata)?;
 zip.start_file(format!("windows/{}.exe",safe_name(&spec.name)),options.clone())?;
 zip.write_all(&exe)?;
 let manifest=format!("{{\n  \"name\": \"{}\",\n  \"shape\": \"{}\",\n  \"glyph\": \"{}\",\n  \"master_size\": 1024,\n  \"formats\": [\"png\", \"ico\", \"exe\"]\n}}\n",json_escape(&spec.name),spec.shape.label(),json_escape(glyph));
 zip.start_file("iconforge-manifest.json",options.clone())?;zip.write_all(manifest.as_bytes())?;
 zip.start_file("README.md",options.clone())?;zip.write_all(readme.as_bytes())?;zip.finish()?;Ok(())
}
fn safe_name(name:&str)->String{let value:String=name.chars().map(|c|if c.is_ascii_alphanumeric()||c=='-'||c=='_'{c}else{'_'}).collect();if value.is_empty(){"icon".into()}else{value}}
fn json_escape(value:&str)->String{value.replace('\\',"\\\\").replace('"',"\\\"").replace('\n',"\\n")}

pub fn extract_palette(image:&RgbaImage)->([u8;3],[u8;3],[u8;3],[u8;3]){
 let(mut sums,mut count)=([0u64;3],0u64);let(mut vivid,best0)=([56u8,189,248],-1.0f32);let mut best=best0;
 let sx=(image.width()/96).max(1);let sy=(image.height()/96).max(1);
 for y in (0..image.height()).step_by(sy as usize){for x in (0..image.width()).step_by(sx as usize){let p=image.get_pixel(x,y);if p[3]<32{continue;}for c in 0..3{sums[c]+=p[c] as u64;}count+=1;let hi=p[0].max(p[1]).max(p[2]) as f32;let lo=p[0].min(p[1]).min(p[2]) as f32;let score=(hi-lo)*(hi/255.0);if score>best{best=score;vivid=[p[0],p[1],p[2]];}}}
 if count==0{return([30,32,41],[19,20,26],[11,12,16],[56,189,248]);}
 let avg=[(sums[0]/count)as u8,(sums[1]/count)as u8,(sums[2]/count)as u8];
 ([((avg[0]as f32)*0.45)as u8,((avg[1]as f32)*0.45)as u8,((avg[2]as f32)*0.50)as u8],
 [((avg[0]as f32)*0.25)as u8,((avg[1]as f32)*0.25)as u8,((avg[2]as f32)*0.30)as u8],
 [((vivid[0]as f32)*0.65)as u8,((vivid[1]as f32)*0.65)as u8,((vivid[2]as f32)*0.70)as u8],
 [vivid[0].saturating_add(40),vivid[1].saturating_add(40),vivid[2].saturating_add(40)])
}


pub fn export_rust_project_zip(spec:&IconSpec,custom:Option<&RgbaImage>,glyph:&str,destination:&Path)->Result<(),Box<dyn std::error::Error>>{
    let file=File::create(destination)?;
    let mut zip=zip::ZipWriter::new(file);
    let options=zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    macro_rules! add_source { ($path:expr,$source:expr) => {{zip.start_file($path,options.clone())?;zip.write_all($source.as_bytes())?;}}; }
    add_source!("Cargo.toml",include_str!("../Cargo.toml"));
    add_source!("build.rs",include_str!("../build.rs"));
    add_source!("README.md",include_str!("../README.md"));
    add_source!("src/main.rs",include_str!("main.rs"));
    add_source!("src/renderer.rs",include_str!("renderer.rs"));
    add_source!("src/packaging.rs",include_str!("packaging.rs"));
    add_source!("src/pe_exe.rs",include_str!("pe_exe.rs"));
    add_source!(".github/workflows/release.yml",include_str!("../.github/workflows/release.yml"));
    let png=render_icon(spec,1024,custom,glyph);
    let mut png_bytes=std::io::Cursor::new(Vec::new());
    image::DynamicImage::ImageRgba8(png).write_to(&mut png_bytes,image::ImageFormat::Png)?;
    zip.start_file("assets/icon_1024x1024.png",options.clone())?;zip.write_all(png_bytes.get_ref())?;
    let temp=std::env::temp_dir().join(format!("{}_project.ico",safe_name(&spec.name)));
    export_ico(spec,&temp,custom,glyph)?;
    zip.start_file("assets/app_icon.ico",options.clone())?;zip.write_all(&std::fs::read(&temp)?)?;let _=std::fs::remove_file(temp);
    zip.finish()?;Ok(())
}
