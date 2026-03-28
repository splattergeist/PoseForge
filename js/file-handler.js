/**
 * @module file-handler
 * Handles drag-and-drop (full-page) and file/folder input for COLMAP .bin files.
 * Shows a drop overlay on drag, extracts cameras.bin/images.bin/points3D.bin.
 */

/** Expected COLMAP file basenames */
const COLMAP_FILES = ['cameras.bin', 'images.bin', 'points3D.bin'];

/** Map a file by name into a { cameras, images, points3D } dict (or partial). */
function classifyFile(file, map) {
  const name = file.name;
  if (name === 'cameras.bin')  map.cameras  = file;
  else if (name === 'images.bin')  map.images  = file;
  else if (name === 'points3D.bin') map.points3D = file;
}

/** Check if we have all three required files. */
export function hasAllFiles(files) {
  return !!(files.cameras && files.images && files.points3D);
}

/**
 * Recursively read all file entries from a directory.
 * @param {FileSystemDirectoryEntry} dirEntry
 * @returns {Promise<File[]>}
 */
async function readDirectoryEntries(dirEntry) {
  const reader = dirEntry.createReader();
  const all = [];

  // readEntries may return batches
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
    if (entry.isFile) {
      files.push(await new Promise(r => entry.file(r)));
    } else if (entry.isDirectory) {
      files.push(...await readDirectoryEntries(entry));
    }
  }
  return files;
}

/**
 * Extract COLMAP files from a DataTransfer object.
 * Handles both webkitGetAsEntry (folder drops) and direct .bin file drops.
 * @param {DataTransfer} dataTransfer
 * @returns {Promise<Object>} { cameras, images, points3D } or partial
 */
export async function extractColmapFiles(dataTransfer) {
  const files = {};

  // Strategy 1: webkitGetAsEntry for folder drops
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    const entries = [];
    for (const item of dataTransfer.items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    if (entries.length > 0) {
      const allFiles = [];
      for (const entry of entries) {
        if (entry.isDirectory) {
          allFiles.push(...await readDirectoryEntries(entry));
        } else if (entry.isFile) {
          allFiles.push(await new Promise(r => entry.file(r)));
        }
      }
      for (const f of allFiles) classifyFile(f, files);
    }
  }

  // Strategy 2: direct file list (individual .bin drops or fallback)
  if (!hasAllFiles(files) && dataTransfer.files) {
    for (const f of dataTransfer.files) classifyFile(f, files);
  }

  return files;
}

/**
 * Classify a list of files (from file/folder input) into COLMAP map.
 * @param {FileList|File[]} fileList
 * @returns {Object} { cameras, images, points3D } or partial
 */
export function classifyInputFiles(fileList) {
  const files = {};
  for (const f of fileList) classifyFile(f, files);
  return files;
}

/**
 * Set up full-page drag-and-drop with overlay.
 * @param {Function} onDrop - async callback(files) called when all 3 files are found
 * @param {Function} onError - callback(message) on missing files
 * @param {Function} setStatus - callback(msg, type) for status updates
 */
export function setupFileDrop({ onDrop, onError, setStatus }) {
  const overlay = document.getElementById('drop-overlay');
  let dragCounter = 0;

  // Prevent default browser behavior for all drag events on the document
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    document.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); }, false);
  });

  document.addEventListener('dragenter', e => {
    dragCounter++;
    if (overlay) overlay.classList.remove('hidden');
  });

  document.addEventListener('dragleave', e => {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (overlay) overlay.classList.add('hidden');
    }
  });

  document.addEventListener('drop', async e => {
    dragCounter = 0;
    if (overlay) overlay.classList.add('hidden');

    const files = await extractColmapFiles(e.dataTransfer);
    if (hasAllFiles(files)) {
      await onDrop(files);
    } else {
      onError('Missing files. Need cameras.bin, images.bin, points3D.bin');
    }
  });
}

/**
 * Set up file/folder input buttons.
 * @param {Function} onFiles - async callback(files) on success
 * @param {Function} onError - callback(message) on missing files
 */
export function setupFileInputs({ onFiles, onError }) {
  // Folder input (webkitdirectory)
  document.getElementById('folder-input').addEventListener('change', async e => {
    const files = classifyInputFiles(e.target.files);
    if (hasAllFiles(files)) {
      await onFiles(files);
    } else {
      onError('Missing files. Need cameras.bin, images.bin, points3D.bin');
    }
    e.target.value = '';
  });

  // Individual file input
  document.getElementById('file-input').addEventListener('change', async e => {
    const files = classifyInputFiles(e.target.files);
    if (hasAllFiles(files)) {
      await onFiles(files);
    } else {
      onError('Missing files. Need cameras.bin, images.bin, points3D.bin');
    }
    e.target.value = '';
  });
}
