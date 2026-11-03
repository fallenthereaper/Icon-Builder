// build.rs — Embeds the generated multi-resolution .ico resource into the Windows PE executable
fn main() {
    #[cfg(target_os = "windows")]
    {
        let mut res = winresource::WindowsResource::new();
        res.set_icon("assets/app_icon.ico");
        res.set("ProductName", "IconForgeApp");
        res.set("CompanyName", "Native Studio");
        res.set("FileDescription", "Native Desktop Application with Embedded Multi-Res Icon");
        res.set("ProductVersion", "1.0.0.0");
        if let Err(e) = res.compile() {
            eprintln!("Warning: Failed to compile Windows icon resource: {}", e);
        }
    }
}
