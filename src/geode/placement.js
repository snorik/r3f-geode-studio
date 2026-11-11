import * as THREE from "three/webgpu";

export const groundHeight = -1.4;
export const specimenScale = 0.93;

// Use the actual rotated rind, so changing the outline never buries the stone
// in the surface or leaves either half floating above it.
export function restingHeight(geometry, rotation) {
  const matrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(...rotation),
  );
  const vertex = new THREE.Vector3();
  const positions = geometry.attributes.position;
  let lowest = Infinity;
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i).applyMatrix4(matrix);
    lowest = Math.min(lowest, vertex.y * specimenScale);
  }
  return groundHeight - lowest + 0.005;
}
