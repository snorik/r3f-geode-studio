import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three/webgpu";
import { pass, uv, smoothstep, vec2 } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";
import { createStudioEnvironment } from "./rendering/environment";
import { createSurfaceTexture, surfaceDetail } from "./rendering/surfaces";
import { groundHeight } from "./geode/placement";
import { Geode } from "./geode/Geode";
import { createFrameSampler } from "./quality";

function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const environment = createStudioEnvironment();
    const generator = new THREE.PMREMGenerator(gl);
    const target = generator.fromScene(environment.scene, 0.05);
    const previous = scene.environment;
    scene.environment = target.texture;
    scene.environmentIntensity = 0.65;
    return () => {
      scene.environment = previous;
      target.dispose();
      environment.dispose();
      generator.dispose();
    };
  }, [gl, scene]);
  return null;
}

function CameraHome({ revision }) {
  const { camera, size, controls } = useThree();
  useEffect(() => {
    controls?.target.set(0, -0.35, 0);
    const distance = Math.max(
      6.3,
      2.1 /
        (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          (size.width / size.height)),
    );
    camera.position.set(0, 1.15, distance);
    camera.lookAt(0, -0.35, 0);
    camera.updateProjectionMatrix();
  }, [camera, controls, revision, size.width, size.height]);
  return null;
}

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
    const glow = bloom(scenePass, quality.bloom, 0.25, 1.5);
    let image = scenePass;
    let occlusion, filteredAO;
    if (quality.occlusion) {
      const depth = scenePass.getTextureNode("depth");
      occlusion = ao(depth, null, camera);
      occlusion.resolutionScale = 0.5;
      occlusion.radius.value = 0.18;
      occlusion.thickness.value = 0.35;
      occlusion.samples.value = 8;
      filteredAO = denoise(occlusion.getTextureNode(), depth, null, camera);
      filteredAO.radius.value = 3;
      image = image.mul(filteredAO.r.mul(0.45).add(0.55));
    }
    result.outputNode = image.add(glow).mul(vignette.mul(0.12).add(0.88));
    return {
      render: () => result.render(),
      dispose: () => {
        result.dispose();
        scenePass.dispose();
        glow.dispose();
        filteredAO?.dispose();
        occlusion?.dispose();
      },
    };
  }, [gl, scene, camera, quality]);
  useEffect(() => () => pipeline.dispose(), [pipeline]);
  useFrame(() => pipeline.render(), 1);
  return null;
}
function RenderReady({
  revision,
  onReady,
  quality,
  onBenchmark,
  auto,
  capture,
}) {
  const last = useRef(-1),
    sample = useRef(null);
  if (!sample.current) sample.current = createFrameSampler();
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    if (!quality.bloom) gl.render(scene, camera);
    if (auto) {
      const fps = sample.current(performance.now());
      if (fps !== null) onBenchmark(fps);
    }
    if (capture.current) {
      const callback = capture.current;
      capture.current = null;
      gl.domElement.toBlob(callback, "image/png");
    }
    if (last.current === revision) return;
    last.current = revision;
    requestAnimationFrame(() => onReady(revision));
  }, 2);
  return null;
}
export function Scene({
  p,
  revision,
  onReady,
  quality,
  onBenchmark,
  auto,
  view,
  capture,
}) {
  const keyLight = useRef();
  const surfaces = useMemo(() => {
    const source = createSurfaceTexture();
    const floor = surfaceDetail(source, 0.65, 0.006);
    return {
      source,
      rind: surfaceDetail(source, 2.4, 0.004),
      floor: {
        normal: floor.normal,
        roughness: floor.roughness.mul(0.16).add(0.82),
      },
    };
  }, []);
  useEffect(() => () => surfaces.source.dispose(), [surfaces]);
  useLayoutEffect(() => {
    // Camera orbit does not change the stones or their lighting. Reuse the
    // shadow map until the geometry, placement or resolution changes.
    keyLight.current.shadow.needsUpdate = true;
  }, [p, quality, view.separation]);
  const background = view.light === "midnight" ? "#090d18" : "#19151f";
  return (
    <>
      <StudioEnvironment />
      <CameraHome revision={view.camera} />
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 8, 26]} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, groundHeight, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardNodeMaterial
          normalNode={surfaces.floor.normal}
          roughnessNode={surfaces.floor.roughness}
          color={view.light === "midnight" ? "#202635" : "#302b36"}
          roughness={1}
          metalness={0}
        />
      </mesh>
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={keyLight}
        position={[-3, 7, 5]}
        shadow-autoUpdate={false}
        castShadow
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-normalBias={0.025}
        shadow-bias={-0.00015}
        shadow-radius={quality.shadowMapSize / 90}
        intensity={view.light === "warm" ? 2.4 : 1.4}
        color={view.light === "warm" ? "#ffe0ad" : "#ffffff"}
      />
      <directionalLight
        position={[4, 2, 2]}
        intensity={view.light === "midnight" ? 2.5 : 0.8}
        color="#b4cbff"
      />
      <directionalLight
        position={[-2, 3, -4]}
        intensity={1.8}
        color="#d7c6f2"
      />
      <pointLight position={[0, 2, 5]} intensity={4} />
      <pointLight position={[-2, 1, 2]} color="#e8cdff" intensity={3} />
      <pointLight position={[3, 2, 1]} color="#9ebfff" intensity={4} />
      <Geode
        p={p}
        quality={quality}
        separation={view.separation}
        surface={surfaces.rind}
      />
      {quality.bloom > 0 && <Effects quality={quality} />}
      <RenderReady
        key={String(auto)}
        revision={revision}
        onReady={onReady}
        quality={quality}
        onBenchmark={onBenchmark}
        auto={auto}
        capture={capture}
      />
      <OrbitControls
        enablePan={false}
        autoRotate={view.rotate}
        autoRotateSpeed={0.65}
        enableDamping
        dampingFactor={0.06}
        maxPolarAngle={Math.PI / 2 - 0.04}
        minDistance={3}
        maxDistance={12}
        makeDefault
      />
    </>
  );
}
