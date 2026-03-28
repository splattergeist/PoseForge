/**
 * @module colmap-text-reader
 * Parser for COLMAP text format files (cameras.txt, images.txt, points3D.txt).
 */

const MODEL_NAME_TO_ID = {
  SIMPLE_PINHOLE: 0, PINHOLE: 1, SIMPLE_RADIAL: 2, RADIAL: 3, OPENCV: 4,
  OPENCV_FISHEYE: 5, FULL_OPENCV: 6, FOV: 7, SIMPLE_RADIAL_FISHEYE: 8,
  RADIAL_FISHEYE: 9, THIN_PRISM_FISHEYE: 10,
};

const MODEL_PARAMS_COUNT = {
  0: 3, 1: 4, 2: 4, 3: 5, 4: 8, 5: 8, 6: 12, 7: 5, 8: 4, 9: 5, 10: 12,
};

class ColmapTextReader {
  constructor(text) {
    this.lines = text.split('\n');
    this.lineIdx = 0;
  }

  _nextNonComment() {
    while (this.lineIdx < this.lines.length) {
      const line = this.lines[this.lineIdx].trim();
      this.lineIdx++;
      if (line && !line.startsWith('#')) return line;
    }
    return null;
  }

  readCameras() {
    const cameras = {};
    let line;
    while ((line = this._nextNonComment())) {
      const parts = line.split(/\s+/);
      const id = Number(parts[0]);
      const modelId = MODEL_NAME_TO_ID[parts[1]] ?? -1;
      const width = Number(parts[2]);
      const height = Number(parts[3]);
      const numParams = MODEL_PARAMS_COUNT[modelId] ?? (parts.length - 4);
      const params = parts.slice(4, 4 + numParams).map(Number);
      cameras[id] = { id, modelId, modelName: parts[1], width, height, params };
    }
    return cameras;
  }

  readImages() {
    const images = {};
    let header;
    while ((header = this._nextNonComment())) {
      const h = header.split(/\s+/);
      const imageId = Number(h[0]);
      const q = { w: Number(h[1]), x: Number(h[2]), y: Number(h[3]), z: Number(h[4]) };
      const t = { x: Number(h[5]), y: Number(h[6]), z: Number(h[7]) };
      const cameraId = Number(h[8]);
      const name = h[9];

      const points2DLine = this._nextNonComment();
      const points2D = [];
      if (points2DLine) {
        const vals = points2DLine.trim().split(/\s+/);
        for (let i = 0; i < vals.length; i += 3) {
          points2D.push({
            x: Number(vals[i]),
            y: Number(vals[i + 1]),
            point3DId: Number(vals[i + 2]),
          });
        }
      }

      images[imageId] = { id: imageId, q, t, cameraId, name, points2D };
    }
    return images;
  }

  readPoints3D() {
    const points = {};
    let line;
    while ((line = this._nextNonComment())) {
      const parts = line.split(/\s+/);
      const id = Number(parts[0]);
      const x = Number(parts[1]), y = Number(parts[2]), z = Number(parts[3]);
      const r = Number(parts[4]), g = Number(parts[5]), b = Number(parts[6]);
      const error = Number(parts[7]);
      const track = [];
      for (let i = 8; i < parts.length; i++) {
        const [imgId, pt2DIdx] = parts[i].split(':').map(Number);
        if (!isNaN(imgId)) track.push({ imageId: imgId, point2DIdx: pt2DIdx });
      }
      points[id] = { id, x, y, z, r, g, b, error, track };
    }
    return points;
  }
}

async function readColmapTextFile(file) {
  const text = await file.text();
  return new ColmapTextReader(text);
}

export { ColmapTextReader, readColmapTextFile };
