import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class PoseForgeViewer {
  constructor(container) {
    this.container = container;
    this.cameras = {};
    this.images = {};
    this.points = {};
    this.cameraMeshes = [];
    this.pointCloud = null;
    this.trajectoryLine = null;
    this.frustumGroup = new THREE.Group();
    this.pointGroup = new THREE.Group();
    this.trajectoryGroup = new THREE.Group();

    this.init();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    // Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.01, 10000);
    this.camera.position.set(0, 5, 10);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // Grid helper
    const grid = new THREE.GridHelper(100, 50, 0x222222, 0x111111);
    this.scene.add(grid);

    // Groups
    this.scene.add(this.frustumGroup);
    this.scene.add(this.pointGroup);
    this.scene.add(this.trajectoryGroup);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);

    // Raycaster for picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    // Resize
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
      const mesh = intersects[0].object;
      if (mesh.userData.imageId !== undefined) {
        if (this.onCameraClick) this.onCameraClick(mesh.userData.imageId);
      }
    }
  }

  quaternionFromColmap(q) {
    return new THREE.Quaternion(q.x, q.y, q.z, q.w);
  }

  loadImageData(cameras, images, points) {
    this.cameras = cameras;
    this.images = images;
    this.points = points;
    this.clearScene();
    this.buildPointCloud();
    this.buildCameraFrustums();
    this.buildTrajectory();
    this.fitView();
  }

  clearScene() {
    this.frustumGroup.clear();
    this.pointGroup.clear();
    this.trajectoryGroup.clear();
    this.cameraMeshes = [];
  }

  buildPointCloud() {
    const pts = Object.values(this.points);
    if (pts.length === 0) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pts.length * 3);
    const colors = new Float32Array(pts.length * 3);

    pts.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      colors[i * 3] = p.r / 255;
      colors[i * 3 + 1] = p.g / 255;
      colors[i * 3 + 2] = p.b / 255;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.pointCloud = new THREE.Points(geometry, material);
    this.pointGroup.add(this.pointCloud);
  }

  buildCameraFrustums() {
    const imgEntries = Object.values(this.images);
    if (imgEntries.length === 0) return;

    const frustumLen = 0.3;

    imgEntries.forEach(img => {
      const cam = this.cameras[img.cameraId];
      if (!cam) return;

      const focalLength = cam.params[0];
      const scale = frustumLen / focalLength;
      const w = cam.width * scale;
      const h = cam.height * scale;

      // Frustum geometry
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
        color: 0x6366f1,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geom, mat);

      // Build edges
      const edges = new THREE.EdgesGeometry(geom);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x818cf8 });
      const wireframe = new THREE.LineSegments(edges, lineMat);

      const group = new THREE.Group();
      group.add(mesh);
      group.add(wireframe);

      // Pose: COLMAP quaternion maps world-to-camera, we need camera-to-world
      const q = this.quaternionFromColmap(img.q);
      const t = new THREE.Vector3(img.t.x, img.t.y, img.t.z);

      // R is world-to-camera, so camera-to-world is R^T
      const invQ = q.clone().invert();
      // Position in world = -R^T * t
      const pos = t.clone().applyQuaternion(invQ).negate();

      group.position.copy(pos);
      group.quaternion.copy(invQ);

      // Raycasting
      const hitbox = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.8, h * 0.8, frustumLen * 0.8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitbox.position.copy(pos);
      hitbox.quaternion.copy(invQ);
      hitbox.userData.imageId = img.id;
      this.cameraMeshes.push(hitbox);
      this.scene.add(hitbox);

      group.userData.imageId = img.id;
      group.userData.imageName = img.name;
      this.frustumGroup.add(group);
    });
  }

  buildTrajectory() {
    const imgEntries = Object.values(this.images);
    if (imgEntries.length === 0) return;

    const positions = imgEntries.map(img => {
      const q = this.quaternionFromColmap(img.q);
      const t = new THREE.Vector3(img.t.x, img.t.y, img.t.z);
      const invQ = q.clone().invert();
      const pos = t.clone().applyQuaternion(invQ).negate();
      return pos;
    });

    // Sort by image name for a clean path
    imgEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const sortedPos = imgEntries.map(img => {
      const q = this.quaternionFromColmap(img.q);
      const t = new THREE.Vector3(img.t.x, img.t.y, img.t.z);
      const invQ = q.clone().invert();
      return t.clone().applyQuaternion(invQ).negate();
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(sortedPos);
    const material = new THREE.LineBasicMaterial({ color: 0x22d3ee, opacity: 0.6, transparent: true });
    this.trajectoryLine = new THREE.Line(geometry, material);
    this.trajectoryGroup.add(this.trajectoryLine);
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

    // Look along the camera's forward direction (negative Z in camera space)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(invQ);
    const target = pos.clone().add(forward.clone().multiplyScalar(2));

    this.camera.position.copy(pos);
    this.controls.target.copy(target);
    this.controls.update();
  }

  togglePoints(visible) {
    this.pointGroup.visible = visible;
  }

  toggleCameras(visible) {
    this.frustumGroup.visible = visible;
    this.cameraMeshes.forEach(m => m.visible = visible);
  }

  toggleTrajectory(visible) {
    this.trajectoryGroup.visible = visible;
  }

  setPointSize(size) {
    if (this.pointCloud) {
      this.pointCloud.material.size = size;
    }
  }
}

window.PoseForgeViewer = PoseForgeViewer;
