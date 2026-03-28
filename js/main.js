import { PoseForgeViewer } from './viewer.js';
import { PoseForgeUI } from './ui.js';

const container = document.getElementById('viewport');
const viewer = new PoseForgeViewer(container);
const ui = new PoseForgeUI(viewer);

// Folder button
document.getElementById('open-folder-btn').addEventListener('click', () => {
  document.getElementById('folder-input').click();
});
