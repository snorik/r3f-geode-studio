import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three/webgpu";
import { pass, uv, smoothstep, vec2 } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { Geode } from "./geode/Geode";

function Effects({ quality }) {
  const { gl, scene, camera } = useThree();
  const pipeline = useMemo(() => {
    const result = new THREE.RenderPipeline(gl);
    const scenePass = pass(scene, camera);
    const vignette = smoothstep(
      0.24,
      0.82,
      uv().sub(vec2(0.5)).length(),
    ).oneMinus();
    result.outputNode = scenePass
      .add(bloom(scenePass, quality.bloom, 0.45, 0.82))
      .mul(vignette.mul(0.18).add(0.82));
    return result;
  }, [gl, scene, camera, quality]);
  useEffect(() => () => pipeline.dispose(), [pipeline]);
  useFrame(() => pipeline.render(), 1);
  return null;
}
function RenderReady({ revision, onReady, quality, onBenchmark, auto }) {
  const last = useRef(-1),
    sample = useRef({ start: 0, last: 0, frames: 0, done: false });
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    if (!quality.bloom) gl.render(scene, camera);
    const t = performance.now(),
      s = sample.current;
    if (auto && !s.done) {
      if (!s.start) {
        s.start = t;
        s.last = t;
      } else {
        const delta = t - s.last;
        s.last = t;
        if (delta < 250) s.frames++;
        if ((t - s.start > 3500 && s.frames >= 10) || t - s.start > 8000) {
          s.done = true;
          onBenchmark(s.frames / ((t - s.start) / 1000));
        }
      }
    }
    if (last.current === revision) return;
    last.current = revision;
    requestAnimationFrame(() => onReady(revision));
  }, 2);
  return null;
}
export function Scene({ p, revision, onReady, quality, onBenchmark, auto }) {
  return (
    <>
      <color attach="background" args={["#111015"]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[-4, 6, 7]} intensity={2} />
      <directionalLight position={[4, 2, 2]} intensity={1.3} color="#c7c9ff" />
      <pointLight position={[0, 2, 5]} intensity={10} />
      <pointLight position={[-2, 1, 2]} color="#e8cdff" intensity={7} />
      <pointLight position={[2, -1, 1]} color="#9ebfff" intensity={4} />
      <Geode p={p} quality={quality} />
      {quality.bloom > 0 && <Effects quality={quality} />}
      <RenderReady
        key={String(auto)}
        revision={revision}
        onReady={onReady}
        quality={quality}
        onBenchmark={onBenchmark}
        auto={auto}
      />
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        makeDefault
      />
    </>
  );
}
