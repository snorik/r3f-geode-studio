import * as THREE from "three/webgpu";

// Broad light cards produce legible reflections instead of tiny white spots.
export function createStudioEnvironment() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#11121a");
  const geometry = new THREE.PlaneGeometry();
  const cards = [
    { position: [-3, 4, 4], size: [3, 5], color: [5, 4.7, 4.4] },
    { position: [4, 1, 2], size: [1.2, 4], color: [3.2, 3.7, 4.5] },
    { position: [0, 4, -3], size: [5, 1.5], color: [4.5, 4.5, 5] },
  ];
  for (const card of cards) {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(...card.color),
        toneMapped: false,
      }),
    );
    mesh.position.set(...card.position);
    mesh.scale.set(...card.size, 1);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  }
  return {
    scene,
    dispose() {
      geometry.dispose();
      for (const mesh of scene.children) mesh.material.dispose();
    },
  };
}
