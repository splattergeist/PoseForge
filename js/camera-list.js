/**
 * @module camera-list
 * Builds and manages the camera list UI in the sidebar.
 */

/**
 * Populate the camera list sidebar from COLMAP images.
 * @param {Object} images - COLMAP images dict
 * @param {Function} onJump - callback(imageId)
 */
export function buildCameraList(images, onJump) {
  const list = document.getElementById('camera-list');
  list.innerHTML = '';

  const entries = Object.values(images).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );

  for (const img of entries) {
    const div = document.createElement('div');
    div.className = 'camera-item';
    div.textContent = img.name;
    div.addEventListener('click', () => onJump(img.id));
    list.appendChild(div);
  }
}

/**
 * Highlight the active camera item in the sidebar list.
 * @param {number} imageId
 * @param {Object} images - COLMAP images dict
 */
export function highlightCameraItem(imageId, images) {
  document.querySelectorAll('.camera-item').forEach(el => el.classList.remove('active'));

  const sorted = Object.values(images).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
  const idx = sorted.findIndex(e => e.id === imageId);
  const items = document.querySelectorAll('.camera-item');
  if (idx >= 0 && items[idx]) items[idx].classList.add('active');
}
