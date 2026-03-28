/**
 * @module frustum-builder
 * Builds point cloud and camera frustum meshes for the PoseForge viewer.
 */

import * as THREE from 'three';

/** Build a Three.js Points object from COLMAP 3D points. */
export function buildPointCloud(points, size = 0.02) {
  const pts = Object.values(points);
  if (pts.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(pts.length * 3);
  const colors = new Float32Array(pts.length * 3);

  pts.forEach((p, i) => {
    positions[i * 3]     = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    colors[i * 3]     = p.r / 255;
    colors[i * 3 + 1] = p.g / 255;
    colors[i * 3 + 2] = p.b / 255;
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size, vertexColors: true, sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

/**
 * Build camera frustum meshes from COLMAP cameras and images.
 * @returns {{ group: THREE.Group, hitboxes: THREE.Mesh[] }}
 */
export function buildCameraFrustums(cameras, images, quaternionFromColmap) {
  const group = new THREE.Group();
  const hitboxes = [];
  const imgEntries = Object.values(images);
  if (imgEntries.length === 0) return { group, hitboxes };

  const frustumLen = 0.3;

  for (const img of imgEntries) {
    const cam = cameras[img.cameraId];
    if (!cam) continue;

    const focalLength = cam.params[0];
    const scale = frustumLen / focalLength;
    const w = cam.width * scale;
    const h = cam.height * scale;

    const verts = new Float32Array([
      0, 0, 0,
      -w/2, -h/2, frustumLen,
       w/2, -h/2, frustumLen,
       w/2,  h/2, frustumLen,
      -w/2,  h/2, frustumLen,
    ]);
    const indices = [0,1,2, 0,2,3, 0,3,4, 0,4,1, 1,2,3, 1,3,4];

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: 0x6366f1, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);

    const edges = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x818cf8 });
    const wireframe = new THREE.LineSegments(edges, lineMat);

    const fg = new THREE.Group();
    fg.add(mesh);
    fg.add(wireframe);

    // Pose: COLMAP quat = world-to-camera → invert for camera-to-world
    const q = quaternionFromColmap(img.q);
    const t = new THREE.Vector3(img.t.x, img.t.y, img.t.z);
    const invQ = q.clone().invert();
    const pos = t.clone().applyQuaternion(invQ).negate();

    fg.position.copy(pos);
    fg.quaternion.copy(invQ);
    fg.userData = { imageId: img.id, imageName: img.name };
    group.add(fg);

    // Hitbox for raycasting
    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.8, h * 0.8, frustumLen * 0.8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitbox.position.copy(pos);
    hitbox.quaternion.copy(invQ);
    hitbox.userData.imageId = img.id;
    hitboxes.push(hitbox);
  }

  return { group, hitboxes };
}
