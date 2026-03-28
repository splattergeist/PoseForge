/**
 * @module ui-controller
 * Wires together viewer, file handling, camera list, and UI controls.
 */

import { readColmapBinaryFile } from './colmap-reader.js';
import { setupFileDrop, setupFileInputs, hasAllFiles } from './file-handler.js';
import { buildCameraList, highlightCameraItem } from './camera-list.js';

class PoseForgeUI {
  constructor(viewer) {
    this.viewer = viewer;
    this.setupFileHandling();
    this.setupToggles();
    this.viewer.onCameraClick = (id) => this.jumpToCamera(id);
  }

  setupFileHandling() {
    const dropCfg = {
      onDrop: (files) => this.loadFiles(files),
      onError: (msg) => this.setStatus(msg, 'error'),
      setStatus: (msg, type) => this.setStatus(msg, type),
    };
    setupFileDrop(dropCfg);
    setupFileInputs({
      onFiles: (files) => this.loadFiles(files),
      onError: (msg) => this.setStatus(msg, 'error'),
    });
  }

  async loadFiles(files) {
    this.setStatus('Loading...', 'info');
    try {
      this.setStatus('Parsing cameras...', 'info');
      const cameras = (await readColmapBinaryFile(files.cameras)).readCameras();
      this.setStatus('Parsing images...', 'info');
      const images = (await readColmapBinaryFile(files.images)).readImages();
      this.setStatus('Parsing points...', 'info');
      const points = (await readColmapBinaryFile(files.points3D)).readPoints3D();

      const nc = Object.keys(cameras).length;
      const ni = Object.keys(images).length;
      const np = Object.keys(points).length;
      this.setStatus(`Loaded ${nc} cameras, ${ni} images, ${np} points`, 'success');

      buildCameraList(images, (id) => this.jumpToCamera(id));
      document.getElementById('drop-zone').classList.add('hidden');
      document.getElementById('controls').classList.remove('hidden');
      this.viewer.loadImageData(cameras, images, points);
    } catch (err) {
      console.error(err);
      this.setStatus('Error: ' + err.message, 'error');
    }
  }

  jumpToCamera(imageId) {
    this.viewer.jumpToCamera(imageId);
    highlightCameraItem(imageId, this.viewer.images);
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
