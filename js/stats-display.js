/**
 * @module stats-display
 * Computes and displays scene statistics in the sidebar.
 */

/**
 * Update statistics display.
 * @param {Object} params
 * @param {number} params.totalPoints
 * @param {number} params.visiblePoints
 * @param {number} params.totalCameras
 * @param {Object} params.bboxSize - { x, y, z }
 */
export function updateStats({ totalPoints, visiblePoints, totalCameras, bboxSize }) {
  const el = document.getElementById('stats-display');
  if (!el) return;

  el.innerHTML = `
    <div class="stat-row"><span>Points</span><span>${visiblePoints.toLocaleString()} / ${totalPoints.toLocaleString()}</span></div>
    <div class="stat-row"><span>Cameras</span><span>${totalCameras}</span></div>
    <div class="stat-row"><span>BBox</span><span>${bboxSize.x.toFixed(1)} × ${bboxSize.y.toFixed(1)} × ${bboxSize.z.toFixed(1)}</span></div>
  `;
}
