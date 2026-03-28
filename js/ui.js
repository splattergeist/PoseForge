import { readColmapBinaryFile } from './colmap-reader.js';

class PoseForgeUI {
  constructor(viewer) {
    this.viewer = viewer;
    this.setupDropZone();
    this.setupToggles();
    this.viewer.onCameraClick = (id) => this.jumpToCamera(id);
  }

  setupDropZone() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const files = await this.extractColmapFiles(e.dataTransfer);
      if (files && files.cameras && files.images && files.points3D) {
        await this.loadFiles(files);
      } else {
        this.setStatus('Missing files. Need cameras.bin, images.bin, points3D.bin', 'error');
      }
    });

    // Also support folder upload
    document.getElementById('folder-input').addEventListener('change', async e => {
      const files = {};
      for (const file of e.target.files) {
        if (file.name === 'cameras.bin') files.cameras = file;
        else if (file.name === 'images.bin') files.images = file;
        else if (file.name === 'points3D.bin') files.points3D = file;
      }
      if (files.cameras && files.images && files.points3D) {
        await this.loadFiles(files);
      } else {
        this.setStatus('Missing files. Need cameras.bin, images.bin, points3D.bin', 'error');
      }
    });
  }

  async extractColmapFiles(dataTransfer) {
    const files = {};
    if (!dataTransfer.items) return files;

    const entries = [];
    for (const item of dataTransfer.items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    for (const entry of entries) {
      if (entry.isDirectory) {
        const dirFiles = await this.readAllEntries(entry);
        Object.assign(files, dirFiles);
      } else if (entry.isFile) {
        await new Promise(r => entry.file(f => {
          if (f.name === 'cameras.bin') files.cameras = f;
          else if (f.name === 'images.bin') files.images = f;
          else if (f.name === 'points3D.bin') files.points3D = f;
          r();
        }));
      }
    }
    return files;
  }

  async readAllEntries(dirEntry) {
    return new Promise((resolve) => {
      const reader = dirEntry.createReader();
      const allFiles = {};
      
      const readBatch = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(allFiles);
            return;
          }
          for (const entry of entries) {
            if (entry.isFile) {
              await new Promise(r => entry.file(f => {
                if (f.name === 'cameras.bin') allFiles.cameras = f;
                else if (f.name === 'images.bin') allFiles.images = f;
                else if (f.name === 'points3D.bin') allFiles.points3D = f;
                r();
              }));
            }
          }
          readBatch();
        });
      };
      readBatch();
    });
  }

  async loadFiles(files) {
    this.setStatus('Loading...', 'info');
    try {
      this.setStatus('Parsing cameras...', 'info');
      const camReader = await readColmapBinaryFile(files.cameras);
      const cameras = camReader.readCameras();

      this.setStatus('Parsing images...', 'info');
      const imgReader = await readColmapBinaryFile(files.images);
      const images = imgReader.readImages();

      this.setStatus('Parsing points...', 'info');
      const ptsReader = await readColmapBinaryFile(files.points3D);
      const points = ptsReader.readPoints3D();

      const numImages = Object.keys(images).length;
      const numPoints = Object.keys(points).length;
      const numCams = Object.keys(cameras).length;

      this.setStatus(`Loaded ${numCams} cameras, ${numImages} images, ${numPoints} points`, 'success');
      this.buildCameraList(images);
      document.getElementById('drop-zone').classList.add('hidden');
      document.getElementById('controls').classList.remove('hidden');

      this.viewer.loadImageData(cameras, images, points);
    } catch (err) {
      console.error(err);
      this.setStatus('Error: ' + err.message, 'error');
    }
  }

  buildCameraList(images) {
    const list = document.getElementById('camera-list');
    list.innerHTML = '';

    const entries = Object.values(images).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );

    entries.forEach(img => {
      const div = document.createElement('div');
      div.className = 'camera-item';
      div.textContent = img.name;
      div.addEventListener('click', () => this.jumpToCamera(img.id));
      list.appendChild(div);
    });
  }

  jumpToCamera(imageId) {
    this.viewer.jumpToCamera(imageId);
    // Highlight in list
    document.querySelectorAll('.camera-item').forEach(el => el.classList.remove('active'));
    const img = this.viewer.images[imageId];
    if (img) {
      const items = document.querySelectorAll('.camera-item');
      const entries = Object.values(this.viewer.images).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );
      const idx = entries.findIndex(e => e.id === imageId);
      if (idx >= 0 && items[idx]) items[idx].classList.add('active');
    }
  }

  setupToggles() {
    document.getElementById('toggle-points').addEventListener('change', e => {
      this.viewer.togglePoints(e.target.checked);
    });
    document.getElementById('toggle-cameras').addEventListener('change', e => {
      this.viewer.toggleCameras(e.target.checked);
    });
    document.getElementById('toggle-trajectory').addEventListener('change', e => {
      this.viewer.toggleTrajectory(e.target.checked);
    });
    document.getElementById('point-size').addEventListener('input', e => {
      this.viewer.setPointSize(parseFloat(e.target.value));
    });
    document.getElementById('fit-view-btn').addEventListener('click', () => {
      this.viewer.fitView();
    });
    document.getElementById('reload-btn').addEventListener('click', () => {
      document.getElementById('drop-zone').classList.remove('hidden');
      document.getElementById('controls').classList.add('hidden');
    });
  }

  setStatus(msg, type) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className = 'status ' + type;
  }
}

window.PoseForgeUI = PoseForgeUI;
