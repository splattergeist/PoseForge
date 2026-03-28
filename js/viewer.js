/**
 * @module viewer
 * PoseForgeViewer — Three.js scene setup, animation loop, and camera helpers.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildPointCloud, buildCameraFrustums } from './frustum-builder.js';
import { buildTrajectory } from './trajectory-builder.js';

class PoseForgeViewer {
  constructor(container) {
    this.container = container;
    this.cameras = {};
    this.images = {};
    this.points = {};
    this.cameraMeshes = [];
    this.pointCloud = null;
    this.frustumGroup = new THREE.Group();
    this.pointGroup = new THREE.Group();
    this.trajectoryGroup = new THREE.Group();
    this.onCameraClick = null;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.01, 10000);
    this.camera.position.set(0, 5, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    this.scene.add(new THREE.GridHelper(100, 50, 0x222222, 0x111111));
    this.scene.add(this.frustumGroup);
    this.scene.add(this.pointGroup);
    this.scene.add(this.trajectoryGroup);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cameraMeshes);
    if (intersects.length > 0) {
      const id = intersects[0].object.userData.imageId;
      if (id !== undefined && this.onCameraClick) this.onCameraClick(id);
    }
  }

  /** Convert COLMAP quaternion {w,x,y,z} to THREE.Quaternion. */
  quaternionFromColmap(q) {
    return new THREE.Quaternion(q.x, q.y, q.z, q.w);
  }

  /** Clear all scene data and load new COLMAP data. */
  loadImageData(cameras, images, points) {
    this.cameras = cameras;
    this.images = images;
    this.points = points;
    this.clearScene();

    const pc = buildPointCloud(points);
    if (pc) { this.pointCloud = pc; this.pointGroup.add(pc); }

    const { group, hitboxes } = buildCameraFrustums(cameras, images, this.quaternionFromColmap.bind(this));
    this.frustumGroup.add(group);
    this.cameraMeshes.forEach(m => this.scene.remove(m));
    this.cameraMeshes = hitboxes;
    hitboxes.forEach(m => this.scene.add(m));

    const traj = buildTrajectory(images, this.quaternionFromColmap.bind(this));
    if (traj) this.trajectoryGroup.add(traj);

    this.fitView();
  }

  clearScene() {
    this.frustumGroup.clear();
    this.pointGroup.clear();
    this.trajectoryGroup.clear();
    this.cameraMeshes.forEach(m => this.scene.remove(m));
    this.cameraMeshes = [];
    this.pointCloud = null;
  }

  fitView() {
    const box = new THREE.Box3();
    this.frustumGroup.traverse(c => { if (c.isMesh) box.expandByObject(c); });
    this.pointGroup.traverse(c => { if (c.isPoints) box.expandByObject(c); });
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.5;

    this.camera.position.set(center.x + dist * 0.5, center.y + dist * 0.5, center.z + dist);
    this.controls.target.copy(center);
    this.camera.near = maxDim * 0.001;
    this.camera.far = maxDim * 100;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  jumpToCamera(imageId) {
    const img = this.images[imageId];
    if (!img) return;

    const q = this.quaternionFromColmap(img.q);
    const t = new THREE.Vector3(img.t.x, img.t.y, img.t.z);
    const invQ = q.clone().invert();
    const pos = t.clone().applyQuaternion(invQ).negate();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(invQ);

    this.camera.position.copy(pos);
    this.controls.target.copy(pos.clone().add(forward.clone().multiplyScalar(2)));
    this.controls.update();
  }

  togglePoints(v)   { this.pointGroup.visible = v; }
  toggleCameras(v)  { this.frustumGroup.visible = v; this.cameraMeshes.forEach(m => m.visible = v); }
  toggleTrajectory(v) { this.trajectoryGroup.visible = v; }
  setPointSize(s)   { if (this.pointCloud) this.pointCloud.material.size = s; }
}

window.PoseForgeViewer = PoseForgeViewer;
