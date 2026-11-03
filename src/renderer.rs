// src/renderer.rs — Pure Rust Superellipse & Multi-Resolution ICO/ICNS Encoder
use std::path::Path;

#[derive(Clone, Debug)]
pub struct IconSpec {
    pub name: String,
    pub superellipse_n: f32,
    pub tile_scale: f32,
    pub corner_radius: f32,
    pub bg_primary: [u8; 3],
    pub bg_secondary: [u8; 3],
    pub bg_accent: [u8; 3],
    pub gradient_angle_deg: f32,
    pub rim_light_opacity: f32,
    pub shadow_blur: f32,
    pub shadow_offset_y: f32,
    pub shadow_opacity: f32,
    pub glyph_scale: f32,
    pub glyph_color: [u8; 3],
}

/// Evaluates continuous Lamé curve |x/a|^n + |y/b|^n <= 1 with antialiasing
pub fn render_squircle_icon(spec: &IconSpec, size: u32) -> Vec<u8> {
    let mut buf = vec![0u8; (size * size * 4) as usize];
    let half = (size as f32) * 0.5;
    let radius = half * spec.tile_scale;
    let n = spec.superellipse_n.max(2.0);

    for y in 0..size {
        for x in 0..size {
            let dx = ((x as f32 + 0.5) - half).abs() / radius;
            let dy = ((y as f32 + 0.5) - half).abs() / radius;
            let dist = (dx.powf(n) + dy.powf(n)).powf(1.0 / n);

            let idx = ((y * size + x) * 4) as usize;
            if dist <= 1.0 {
                let t = (y as f32) / (size as f32);
                let r = lerp_u8(spec.bg_primary[0], spec.bg_secondary[0], t);
                let g = lerp_u8(spec.bg_primary[1], spec.bg_secondary[1], t);
                let b = lerp_u8(spec.bg_primary[2], spec.bg_secondary[2], t);

                // Smooth edge antialiasing
                let edge_aa = ((1.0 - dist) * (size as f32) * 0.5).clamp(0.0, 1.0);
                buf[idx] = r;
                buf[idx + 1] = g;
                buf[idx + 2] = b;
                buf[idx + 3] = (edge_aa * 255.0) as u8;
            }
        }
    }
    buf
}

fn lerp_u8(a: u8, b: u8, t: f32) -> u8 {
    ((a as f32) * (1.0 - t) + (b as f32) * t).clamp(0.0, 255.0) as u8
}

pub fn export_multi_res_ico(spec: &IconSpec, path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let mut icon_dir = ico::IconDir::new(ico::ResourceType::Icon);
    for size in [16_u32, 24, 32, 48, 64, 128, 256] {
        let rgba = render_squircle_icon(spec, size);
        let image = ico::IconImage::from_rgba_data(size, size, rgba);
        icon_dir.add_entry(ico::IconDirEntry::encode(&image)?);
    }
    let file = std::fs::File::create(path)?;
    icon_dir.write(file)?;
    Ok(())
}
