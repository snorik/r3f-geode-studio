import React, {
  Suspense,
  useEffect,
  useRef,
  useState,
  useReducer,
  useMemo,
} from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Scene } from "./Scene";
import { controls, isMobile, presets, qualityLevels } from "./config";
import { initialQuality, updateQuality } from "./quality";
import { createUpdateScheduler } from "./geode/updateScheduler";

const mobile = isMobile(navigator.userAgent);

class GraphicsBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Graphics initialization failed:", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? (
      <div className="graphics-error" role="alert">
        Не удалось запустить 3D-сцену. Обновите Chrome и проверьте поддержку
        WebGL 2.
      </div>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  const [name, setName] = useState("Amethyst"),
    [p, setP] = useState(presets.Amethyst),
    [show, setShow] = useState(true),
    [busy, setBusy] = useState("initial"),
    [revision, setRevision] = useState(0),
    [qualityState, dispatchQuality] = useReducer(
      updateQuality,
      mobile,
      initialQuality,
    );
  const { name: qualityName, mode, fps } = qualityState;
  const quality = qualityLevels[qualityName];
  const latest = useRef(p);
  const scheduler = useMemo(
    () =>
      createUpdateScheduler({
        schedule: requestAnimationFrame,
        cancel: cancelAnimationFrame,
        onBusy: setBusy,
        onCommit: (params, id) => {
          setP(params);
          setRevision(id);
        },
      }),
    [],
  );
  const update = (next) => {
    latest.current = next;
    scheduler.request(next);
  };
  const onReady = (id) => scheduler.ready(id);
  const select = (n) => {
    setName(n);
    update({ ...presets[n] });
  };
  const onBenchmark = (value) => {
    dispatchQuality({ type: "benchmark", fps: value, mobile });
  };
  const chooseQuality = (value) => {
    dispatchQuality({ type: "select", value, mobile });
  };
  useEffect(() => () => scheduler.cancel(), [scheduler]);
  return (
    <main>
      <header>
        <div className="brand">
          <span className="mark">✳</span>
          <span>
            GEODE <small>STUDIO</small>
          </span>
        </div>
        <span className="header-note">A STUDY IN NATURAL FORMS</span>
        <a
          href="https://github.com/yapitw/nodevember/tree/main/2026/day10-geode-v2-generator/tutorial"
          target="_blank"
          rel="noreferrer"
        >
          THE ORIGINAL ↗
        </a>
      </header>
      <section className="workspace">
        <div className="stage">
          <div className="stage-top">
            <span>SPECIMEN / 01</span>
            <span>PROCEDURAL STUDY</span>
          </div>
          <GraphicsBoundary onError={() => scheduler.fail()}>
            <Suspense fallback={null}>
              <Canvas
                camera={{ position: [0, 0, 6.3], fov: 40 }}
                dpr={[1, quality.dpr]}
                gl={async (props) => {
                  let renderer = new THREE.WebGPURenderer({
                    ...props,
                    antialias: !mobile,
                    forceWebGL: mobile,
                  });
                  try {
                    await renderer.init();
                    return renderer;
                  } catch (error) {
                    renderer.dispose();
                    if (mobile) throw error;
                    renderer = new THREE.WebGPURenderer({
                      ...props,
                      antialias: false,
                      forceWebGL: true,
                    });
                    await renderer.init();
                    return renderer;
                  }
                }}
              >
                <Scene
                  p={p}
                  revision={revision}
                  onReady={onReady}
                  quality={quality}
                  onBenchmark={onBenchmark}
                  auto={mode === "auto"}
                />
              </Canvas>
            </Suspense>
          </GraphicsBoundary>
          {busy && (
            <div className="stage-loader" role="status" aria-live="polite">
              <span className="loader-gem" aria-hidden="true">
                ✳
              </span>
              <span>
                {busy === "initial"
                  ? "Preparing the scene"
                  : "Growing your geode"}
              </span>
              <small>
                {busy === "initial"
                  ? "Loading graphics and generating crystals"
                  : "Updating crystals and stone"}
              </small>
            </div>
          )}
          <div className="stage-bottom">
            <div>
              <span className="eyebrow">CURRENT SPECIMEN</span>
              <h1>{name}</h1>
              <p>Nature, shaped by numbers.</p>
            </div>
            <span className="drag">
              ↻ &nbsp; DRAG TO ROTATE &nbsp; · &nbsp; SCROLL TO ZOOM
            </span>
          </div>
        </div>
        <aside className={show ? "" : "collapsed"}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">THE GENERATOR</span>
              <h2>
                Shape your stone<span>.</span>
              </h2>
              <p>
                Explore the little variations that make each specimen one of a
                kind.
              </p>
            </div>
            <button
              className="toggle"
              onClick={() => setShow(!show)}
              aria-label={show ? "Collapse controls" : "Expand controls"}
            >
              {show ? "−" : "+"}
            </button>
          </div>
          {show && (
            <>
              <div className="section-title">
                <span>00 / GRAPHICS</span>
                <span>{mode === "auto" ? "AUTO" : "MANUAL"}</span>
              </div>
              <div
                className="quality-controls"
                role="group"
                aria-label="Graphics quality"
              >
                {["auto", "low", "medium", "high"].map((level) => (
                  <button
                    key={level}
                    className={
                      (
                        level === "auto"
                          ? mode === "auto"
                          : mode === "manual" && qualityName === level
                      )
                        ? "selected"
                        : ""
                    }
                    onClick={() => chooseQuality(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="quality-note">
                {mode === "auto"
                  ? fps
                    ? `Auto: ${quality.label} · ${fps} fps`
                    : "Testing frame rate…"
                  : `${quality.label} quality`}
              </p>
              <div className="section-title">
                <span>01 / VARIETY</span>
                <span>SELECT A MINERAL</span>
              </div>
              <div className="presets">
                {Object.entries(presets).map(([n, x]) => (
                  <button
                    key={n}
                    className={name === n ? "selected" : ""}
                    onClick={() => select(n)}
                  >
                    <i style={{ "--swatch": x.colors[3] }} />
                    <span>{n}</span>
                  </button>
                ))}
              </div>
              <div className="section-title second">
                <span>02 / FORMATION</span>
                <button onClick={() => update({ ...presets[name] })}>
                  RESET ↺
                </button>
              </div>
              <div className="sliders">
                {controls.map(([key, label, min, max, step]) => (
                  <label key={key}>
                    <span>{label}</span>
                    <output>
                      {Number(p[key]).toFixed(step === 1 ? 0 : 2)}
                    </output>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={p[key]}
                      onChange={(e) =>
                        update({ ...latest.current, [key]: +e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="panel-foot">
                <span>✳</span> EVERY STONE TELLS A DIFFERENT STORY
              </div>
            </>
          )}
        </aside>
      </section>
      <footer>
        <span>AN INTERACTIVE MINERAL EXPERIENCE</span>
        <span>INSPIRED BY NODEVEMBER 2026 / DAY 10</span>
      </footer>
    </main>
  );
}
