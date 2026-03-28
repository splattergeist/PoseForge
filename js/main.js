import { PoseForgeViewer } from './viewer.js';
import { PoseForgeUI } from './ui-controller.js';

const container = document.getElementById('viewport');
const viewer = new PoseForgeViewer(container);
const ui = new PoseForgeUI(viewer);

// File/folder buttons
document.getElementById('open-folder-btn').addEventListener('click', () => {
  document.getElementById('folder-input').click();
});
document.getElementById('open-files-btn').addEventListener('click', () => {
  document.getElementById('file-input').click();
});
