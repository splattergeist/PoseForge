/**
 * @module point-filtering
 * Filters and thins COLMAP point arrays for display.
 */

/**
 * Filter points by track length and reprojection error, then optionally thin.
 * @param {Object[]} pointArray - flat array of COLMAP point objects
 * @param {Object} opts
 * @param {number} opts.minTrack - minimum track length (inclusive)
 * @param {number} opts.maxError - maximum reprojection error (inclusive)
 * @param {number} opts.thinStep - keep every Nth point (1 = all)
 * @returns {Object[]} filtered array
 */
export function filterPoints(pointArray, { minTrack = 0, maxError = Infinity, thinStep = 1 } = {}) {
  const result = [];
  for (let i = 0; i < pointArray.length; i += thinStep) {
    const p = pointArray[i];
    if (p.track.length < minTrack) continue;
    if (p.error > maxError) continue;
    result.push(p);
  }
  return result;
}
