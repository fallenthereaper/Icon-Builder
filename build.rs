#[cfg(windows)]
use std::{fs::File, path::Path};

#[cfg(windows)]
fn write_default_icon(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let size = 256u32;
    let mut rgba = vec![0u8; (size * size * 4) as usize];
    let distance_to_segment = |x:f32,y:f32,x1:f32,y1:f32,x2:f32,y2:f32| {
        let dx=x2-x1;
        let dy=y2-y1;
        let t=(((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)).clamp(0.0,1.0);
        let px=x1+t*dx;
        let py=y1+t*dy;
        ((x-px).powi(2)+(y-py).powi(2)).sqrt()
    };
    for y in 0..size {
        for x in 0..size {
            let nx=(x as f32+0.5-size as f32*0.5)/(size as f32*0.46);
            let ny=(y as f32+0.5-size as f32*0.5)/(size as f32*0.46);
            if nx.abs().powf(4.2)+ny.abs().powf(4.2)>1.0 { continue; }
            let t=((x as f32*0.45+y as f32*0.55)/size as f32).clamp(0.0,1.0);
            let a=[35.0,119.0,226.0];
            let b=[112.0,73.0,196.0];
            let gloss=(1.0-(((x as f32-75.0)/190.0).powi(2)+((y as f32-8.0)/145.0).powi(2)).sqrt()).clamp(0.0,1.0)*0.18;
            let mut color=[0u8;3];
            for c in 0..3 {
                let base=a[c]*(1.0-t)+b[c]*t;
                color[c]=(base+(255.0-base)*gloss).clamp(0.0,255.0) as u8;
            }
            let strokes=[
                (-0.48f32,-0.25f32,0.0f32,0.02f32),(0.0,-0.25,0.48,-0.25),
                (0.48,-0.25,0.0,0.02),(0.0,0.02,-0.48,-0.25),
                (-0.48,0.02,0.0,0.29),(0.0,0.29,0.48,0.02),
                (-0.48,0.29,0.0,0.56),(0.0,0.56,0.48,0.29),
            ];
            let mut coverage=0.0f32;
            for (x1,y1,x2,y2) in strokes {
                coverage=coverage.max(((0.035-distance_to_segment(nx,ny,x1,y1,x2,y2))/0.012).clamp(0.0,1.0));
            }
            let offset=((y*size+x)*4) as usize;
            for c in 0..3 { rgba[offset+c]=(color[c] as f32*(1.0-coverage)+248.0*coverage).clamp(0.0,255.0) as u8; }
            rgba[offset+3]=255;
        }
    }
    let image=ico::IconImage::from_rgba_data(size,size,rgba);
    let mut directory=ico::IconDir::new(ico::ResourceType::Icon);
    directory.add_entry(ico::IconDirEntry::encode(&image)?);
    directory.write(File::create(path)?)?;
    Ok(())
}

fn main() {
    let output=std::env::var_os("OUT_DIR").expect("OUT_DIR is set by Cargo");
    let icon_path=Path::new(&output).join("iconforge-default.ico");
    if let Err(error)=write_default_icon(&icon_path) {
        eprintln!("Warning: could not generate application icon: {error}");
    }
    let mut resource=winresource::WindowsResource::new();
    if icon_path.exists() { resource.set_icon(icon_path.to_string_lossy().as_ref()); }
    resource.set("ProductName","IconForge");
    resource.set("CompanyName","Native Studio");
    resource.set("FileDescription","Windows-native liquid glass icon studio");
    resource.set("ProductVersion","1.1.0.0");
    if let Err(error)=resource.compile() { eprintln!("Warning: could not embed Windows resources: {error}"); }
}

#[cfg(not(windows))]
fn main() {}
