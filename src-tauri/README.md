# Linux build prerequisites

On Ubuntu, install the native dependencies required to build the Tauri backend:

```bash
sudo apt install build-essential pkg-config libssl-dev libgtk-3-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev libglib2.0-dev libdbus-1-dev
```

Then build from this directory:

```bash
cargo build
```

These packages supply the system libraries discovered by Rust through `pkg-config`, including D-Bus, GLib, and libsoup.
