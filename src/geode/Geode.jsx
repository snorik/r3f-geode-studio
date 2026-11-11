import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { materialRoughness } from "three/tsl";
import { useGeodeGeometry } from "./useGeodeGeometry";

import { restingHeight, specimenScale } from "./placement";

const rotations = [
  [-0.36, 0.12, -0.13],
  [0.06, -0.17, 0.14],
];

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
      castShadow
      receiveShadow
      args={[geometry, undefined, instances.count]}
      key={instances.count}
    >
      <meshPhysicalMaterial
        vertexColors
        roughness={0.07 + (1 - p.clarity) * 0.25}
        metalness={p.metalness}
        transmission={quality.transmission ? p.clarity * 0.6 : 0}
        envMapIntensity={p.metalness > 0.5 ? 1.3 : 0.95}
        thickness={0.22}
        ior={p.ior}
        clearcoat={1}
        clearcoatRoughness={0.1}
        flatShading
        side={THREE.FrontSide}
      />
    </instancedMesh>
  );
}
export function Geode({ p, quality, separation = 0.65, surface }) {
  const { rock, geometry, instances } = useGeodeGeometry(p, quality);
  const rindRoughness = useMemo(
    () =>
      materialRoughness.mul(surface.roughness.mul(0.3).add(0.85)).clamp(0.1, 1),
    [surface],
  );
  const heights = useMemo(
    () => rotations.map((rotation) => restingHeight(rock, rotation)),
    [rock],
  );
  const half = (position, rotation) => (
    <group position={position} rotation={rotation} scale={specimenScale}>
      <mesh geometry={rock} castShadow receiveShadow>
        <meshPhysicalMaterial
          attach="material-0"
          vertexColors
          roughness={0.3}
          clearcoat={0.45}
          clearcoatRoughness={0.3}
          envMapIntensity={0.6}
          specularIntensity={0.55}
          side={THREE.DoubleSide}
        />
        <meshStandardNodeMaterial
          attach="material-1"
          normalNode={surface.normal}
          roughnessNode={rindRoughness}
          vertexColors
          roughness={p.roughness}
          side={THREE.DoubleSide}
        />
        <meshStandardMaterial
          attach="material-2"
          vertexColors
          roughness={0.75}
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
      {half([-separation, heights[0], 0.46], rotations[0])}
      {half([separation, heights[1], -0.32], rotations[1])}
    </group>
  );
}
