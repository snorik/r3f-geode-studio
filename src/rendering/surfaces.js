import { extend } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import {
  Fn,
  faceDirection,
  normalLocal,
  normalView,
  positionLocal,
  positionView,
  texture,
} from "three/tsl";

extend({ MeshStandardNodeMaterial: THREE.MeshStandardNodeMaterial });

// A small, periodic height/roughness tile. Mipmaps filter the grain when the
// camera pulls back; the tile is generated locally and never downloads assets.
export function createSurfaceTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const hash = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + 17.3) * 43758.5453;
    return n - Math.floor(n);
  };
  const noise = (x, y, cells) => {
    const u = (x / size) * cells;
    const v = (y / size) * cells;
    const ix = Math.floor(u),
      iy = Math.floor(v);
    const fx = u - ix,
      fy = v - iy;
    const sx = fx * fx * (3 - 2 * fx),
      sy = fy * fy * (3 - 2 * fy);
    const a = THREE.MathUtils.lerp(
      hash(ix % cells, iy % cells),
      hash((ix + 1) % cells, iy % cells),
      sx,
    );
    const b = THREE.MathUtils.lerp(
      hash(ix % cells, (iy + 1) % cells),
      hash((ix + 1) % cells, (iy + 1) % cells),
      sx,
    );
    return THREE.MathUtils.lerp(a, b, sy);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain =
        noise(x, y, 8) * 0.5 + noise(x, y, 32) * 0.32 + noise(x, y, 64) * 0.18;
      const index = (y * size + x) * 4;
      data[index] = Math.round(grain * 255);
      data[index + 1] = Math.round((0.5 + noise(x, y, 16) * 0.5) * 255);
      data[index + 2] = 0;
      data[index + 3] = 255;
    }
  }
  const result = new THREE.DataTexture(data, size, size);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.magFilter = THREE.LinearFilter;
  result.minFilter = THREE.LinearMipmapLinearFilter;
  result.generateMipmaps = true;
  result.anisotropy = 4;
  result.needsUpdate = true;
  return result;
}

export function surfaceDetail(source, frequency, strength) {
  // Triplanar projection keeps the rind continuous around its curved surface.
  const point = positionLocal.mul(frequency);
  const weights = normalLocal.abs().pow(4);
  const total = weights.x.add(weights.y).add(weights.z).max(0.0001);
  const grain = texture(source, point.yz)
    .mul(weights.x)
    .add(texture(source, point.zx).mul(weights.y))
    .add(texture(source, point.xy).mul(weights.z))
    .div(total);
  const normal = Fn(() => {
    const dx = positionView.dFdx();
    const dy = positionView.dFdy();
    const r1 = dy.cross(normalView);
    const r2 = normalView.cross(dx);
    const determinant = dx.dot(r1).mul(faceDirection);
    const height = grain.r;
    const gradient = r1.mul(height.dFdx()).add(r2.mul(height.dFdy()));
    return normalView
      .mul(determinant.abs())
      .sub(gradient.mul(determinant.sign()).mul(strength))
      .normalize();
  })();
  return { normal, roughness: grain.g };
}
