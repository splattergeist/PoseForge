# PoseForge

Modern dark-themed web viewer for COLMAP 3D reconstructions.

## Features

- **Interactive 3D visualization** — colored point cloud, camera frustums, trajectory lines
- **Drag & drop** — drop a COLMAP sparse folder (cameras.bin, images.bin, points3D.bin)
- **Click-to-fly** — click any camera in the sidebar or 3D view to jump to its position
- **Toggle controls** — show/hide points, cameras, trajectories
- **No build step** — just open `index.html` in a modern browser

## Usage

1. Open `index.html` (serves from any static server, or just open locally)
2. Click "Choose Folder" and select your COLMAP `sparse/` folder, or drag-and-drop the 3 `.bin` files
3. Explore the reconstruction with orbit controls (left-drag rotate, scroll zoom, right-drag pan)
4. Click cameras in the sidebar to fly to their viewpoints

## Development

No dependencies to install — Three.js is loaded from CDN via importmap.

For a local server:
```bash
python3 -m http.server 8000 -d .
```
Then open `http://localhost:8000`.

## Tech

- Three.js (CDN, ES modules via importmap)
- Vanilla JS, no build tools
- COLMAP binary format parsing
