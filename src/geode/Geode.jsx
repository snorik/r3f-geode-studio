import { useLayoutEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import { useGeodeGeometry } from "./useGeodeGeometry";

function Crystals({ geometry, instances, p, quality }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.instanceMatrix.array.set(instances.matrices);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(
      instances.colors,
      3,
    );
    mesh.computeBoundingSphere();
  }, [instances]);
  if (!instances.count) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, instances.count]}
      key={instances.count}
    >
      <meshPhysicalMaterial
        vertexColors
        roughness={0.07 + (1 - p.clarity) * 0.25}
        metalness={0}
        transmission={quality.transmission ? p.clarity : 0}
        thickness={0.3}
        ior={p.ior}
        clearcoat={1}
        clearcoatRoughness={0.1}
        flatShading
        side={THREE.FrontSide}
      />
    </instancedMesh>
  );
}
export function Geode({ p, quality }) {
  const { rock, geometry, instances } = useGeodeGeometry(p, quality);
  const half = (position, rotation) => (
    <group position={position} rotation={rotation} scale={0.93}>
      <mesh geometry={rock}>
        <meshStandardMaterial
          vertexColors
          roughness={p.roughness}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Crystals
        geometry={geometry}
        instances={instances}
        p={p}
        quality={quality}
      />
    </group>
  );
  return (
    <group>
      {half([-0.65, -0.28, 0.46], [-0.36, 0.12, -0.13])}
      {half([0.62, 0.28, -0.32], [0.06, -0.17, 0.14])}
    </group>
  );
}
