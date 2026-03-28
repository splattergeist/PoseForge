/**
 * @module file-handler
 * Handles drag-and-drop and file/folder input for COLMAP .bin and .txt files.
 */

const COLMAP_BIN = ['cameras.bin', 'images.bin', 'points3D.bin'];
const COLMAP_TXT = ['cameras.txt', 'images.txt', 'points3D.txt'];
const ALL_COLMAP = [...COLMAP_BIN, ...COLMAP_TXT];

function classifyFile(file, map) {
  const name = file.name;
  if (name === 'cameras.bin' || name === 'cameras.txt')  map.cameras  = file;
  else if (name === 'images.bin' || name === 'images.txt')  map.images  = file;
  else if (name === 'points3D.bin' || name === 'points3D.txt') map.points3D = file;
}

/** Check if any key has a file assigned. */
export function hasAllFiles(files) {
  return !!(files.cameras && files.images && files.points3D);
}

/** Detect if a file is text format based on extension. */
export function isTextFile(file) {
  return file.name.endsWith('.txt');
}

async function readDirectoryEntries(dirEntry) {
  const reader = dirEntry.createReader();
  const all = [];
  const readBatch = () => new Promise(resolve => {
    reader.readEntries(entries => {
      if (entries.length === 0) { resolve(); return; }
      for (const e of entries) all.push(e);
      readBatch().then(resolve);
    });
  });
  await readBatch();
  const files = [];
  for (const entry of all) {
    if (entry.isFile) files.push(await new Promise(r => entry.file(r)));
    else if (entry.isDirectory) files.push(...await readDirectoryEntries(entry));
  }
  return files;
}

export async function extractColmapFiles(dataTransfer) {
  const files = {};
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    const entries = [];
    for (const item of dataTransfer.items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    if (entries.length > 0) {
      const allFiles = [];
      for (const entry of entries) {
        if (entry.isDirectory) allFiles.push(...await readDirectoryEntries(entry));
        else if (entry.isFile) allFiles.push(await new Promise(r => entry.file(r)));
      }
      for (const f of allFiles) classifyFile(f, files);
    }
  }
  if (!hasAllFiles(files) && dataTransfer.files) {
    for (const f of dataTransfer.files) classifyFile(f, files);
  }
  return files;
}

export function classifyInputFiles(fileList) {
  const files = {};
  for (const f of fileList) classifyFile(f, files);
  return files;
}

export function setupFileDrop({ onDrop, onError, setStatus }) {
  const overlay = document.getElementById('drop-overlay');
  let dragCounter = 0;
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    document.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); }, false);
  });
  document.addEventListener('dragenter', () => { dragCounter++; if (overlay) overlay.classList.remove('hidden'); });
  document.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; if (overlay) overlay.classList.add('hidden'); }
  });
  document.addEventListener('drop', async e => {
    dragCounter = 0;
    if (overlay) overlay.classList.add('hidden');
    const files = await extractColmapFiles(e.dataTransfer);
    if (hasAllFiles(files)) await onDrop(files);
    else onError('Missing files. Need cameras.bin/txt, images.bin/txt, points3D.bin/txt');
  });
}

export function setupFileInputs({ onFiles, onError }) {
  document.getElementById('folder-input').addEventListener('change', async e => {
    const files = classifyInputFiles(e.target.files);
    if (hasAllFiles(files)) await onFiles(files);
    else onError('Missing files. Need cameras.bin/txt, images.bin/txt, points3D.bin/txt');
    e.target.value = '';
  });
  document.getElementById('file-input').addEventListener('change', async e => {
    const files = classifyInputFiles(e.target.files);
    if (hasAllFiles(files)) await onFiles(files);
    else onError('Missing files. Need cameras.bin/txt, images.bin/txt, points3D.bin/txt');
    e.target.value = '';
  });
}
