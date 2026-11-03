# IconForgeApp — Native Rust (`egui` + `fastframe`)

This repository is a 100% native Rust desktop application built with:
- **[emilk/egui](https://github.com/emilk/egui)** (`0.36.2`) & **eframe** (GPU rendered, zero web technology).
- **[fastframe.dev](https://fastframe.dev)** (`crmne/fastframe`) for native desktop typography, OS subpixel hinting, and dark graphite styling.
- **Automated GitHub Actions Release**: Every push automatically builds and publishes native `.exe` executables on GitHub!

---

## 🚀 How to Get Your Pre-Built `.exe` from GitHub (Zero Local Setup)

1. **Create a GitHub Repository**:
   - Go to [github.com/new](https://github.com/new).
   - Name your repo (e.g. `iconforgeapp`) and click **Create repository**.

2. **Upload or Push this Folder**:
   - Either drag and drop this unzipped folder into your GitHub repository web UI, or in your terminal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of native egui + fastframe app"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/iconforgeapp.git
   git push -u origin main
   ```

3. **Get Your Compiled `.exe`**:
   - Go to the **Actions** tab in your GitHub repository.
   - GitHub's cloud runners will automatically compile the native Windows `.exe` and macOS binary.
   - Once complete, download the executable directly from the **Releases** tab or Artifacts!

---

## 💻 Optional: Build Locally (If you have Rust installed)

```bash
cargo run --release
```
The compiled standalone `.exe` will be saved to `target/release/iconforgeapp.exe`.
