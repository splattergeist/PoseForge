/**
 * @module trajectory-builder
 * Builds a trajectory line through sorted camera positions.
 */

import * as THREE from 'three';

/**
 * Build a line connecting camera positions sorted by image name.
 * @param {Object} images - COLMAP images dict
 * @param {Function} quaternionFromColmap - converts colmap quat to THREE.Quaternion
 * @returns {THREE.Line|null}
 */
export function buildTrajectory(images, quaternionFromColmap) {
  const imgEntries = Object.values(images);
  if (imgEntries.length === 0) return null;

  const sorted = [...imgEntries].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );

  const positions = sorted.map(img => {
    const q = quaternionFromColmap(img.q);
    const t = new THREE.Vector3(img.t.x, img.t.y, img.t.z);
    const invQ = q.clone().invert();
    return t.clone().applyQuaternion(invQ).negate();
  });

  const geometry = new THREE.BufferGeometry().setFromPoints(positions);
  const material = new THREE.LineBasicMaterial({
    color: 0x22d3ee, opacity: 0.6, transparent: true,
  });

  return new THREE.Line(geometry, material);
}
