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
import {
  controls,
  isMobile,
  presets,
  qualityLevels,
  mineralNotes,
} from "./config";
import { initialQuality, updateQuality } from "./quality";
import { createUpdateScheduler } from "./geode/updateScheduler";

import {
  packSpecimen,
  readSharedSpecimen,
  readCollection,
  restoreSpecimen,
} from "./specimen";

const initial = readSharedSpecimen(window.location.hash);
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
  const [name, setName] = useState(initial?.name ?? "Amethyst"),
    [p, setP] = useState(initial?.params ?? presets.Amethyst),
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
  const capture = useRef(null);
  const [view, setView] = useState({
    light: "studio",
    separation: 0.65,
    rotate: false,
    camera: 0,
  });
  const [collection, setCollection] = useState(readCollection);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const changeView = (key, value) =>
    setView((current) => ({ ...current, [key]: value }));
  const surprise = () => {
    const names = Object.keys(presets);
    const next = names[Math.floor(Math.random() * names.length)];
    setName(next);
    update({
      ...presets[next],
      seed: Math.round((Math.random() * 5 - 2.5) * 100) / 100,
      lumps: Math.round((0.6 + Math.random() * 1.1) * 20) / 20,
    });
  };
  const save = () => {
    const next = [
      { ...packSpecimen(name, latest.current), id: crypto.randomUUID() },
      ...collection,
    ].slice(0, 12);
    try {
      localStorage.setItem("geode-collection", JSON.stringify(next));
      setCollection(next);
      setNotice("Specimen saved to this browser");
    } catch {
      setNotice("Browser storage is unavailable");
    }
  };
  const remove = (id) => {
    const next = collection.filter((item) => item.id !== id);
    try {
      localStorage.setItem("geode-collection", JSON.stringify(next));
      setCollection(next);
    } catch {
      setNotice("Browser storage is unavailable");
    }
  };
  const share = async () => {
    const url = new URL(window.location.href);
    url.hash = new URLSearchParams({
      specimen: JSON.stringify(packSpecimen(name, latest.current)),
    }).toString();
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice("Specimen link copied");
    } catch {
      window.prompt("Copy your specimen link", url.href);
    }
  };
  const exportImage = () => {
    capture.current = (blob) => {
      if (!blob) {
        setNotice("Could not export the image");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `geode-${name.toLowerCase().replaceAll(" ", "-")}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("PNG exported");
    };
  };
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
    <main style={{ "--accent": p.colors[4] }}>
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
            <span>
              SPECIMEN /{" "}
              {String(Object.keys(presets).indexOf(name) + 1).padStart(2, "0")}
            </span>
            <span>PROCEDURAL STUDY</span>
          </div>
          <GraphicsBoundary onError={() => scheduler.fail()}>
            <Suspense fallback={null}>
              <Canvas
                shadows="percentage"
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
                    renderer.toneMapping = THREE.ACESFilmicToneMapping;
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
                    renderer.toneMapping = THREE.ACESFilmicToneMapping;
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
                  view={view}
                  capture={capture}
                />
              </Canvas>
            </Suspense>
          </GraphicsBoundary>
          <div className="stage-tools" aria-label="Scene controls">
            <button
              onClick={() => changeView("rotate", !view.rotate)}
              aria-pressed={view.rotate}
              title="Auto rotate"
            >
              {view.rotate ? "Ⅱ Pause" : "↻ Orbit"}
            </button>
            <button
              onClick={() => changeView("camera", view.camera + 1)}
              title="Reset camera"
            >
              ⌖ Recenter
            </button>
            <button onClick={exportImage} disabled={!!busy}>
              ↓ PNG
            </button>
          </div>
          {notice && (
            <div className="toast" role="status">
              {notice}
            </div>
          )}
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
              <p>{mineralNotes[name]}</p>
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
              <div className="specimen-actions">
                <button onClick={surprise}>✧ Surprise me</button>
                <button onClick={save}>+ Save</button>
                <button onClick={share}>↗ Share</button>
              </div>
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
                    aria-pressed={
                      level === "auto"
                        ? mode === "auto"
                        : mode === "manual" && qualityName === level
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
                    aria-pressed={name === n}
                    onClick={() => select(n)}
                  >
                    <i style={{ "--swatch": x.colors[3] }} />
                    <span>{n}</span>
                  </button>
                ))}
              </div>
              <div className="section-title">
                <span>02 / LIGHT & COMPOSITION</span>
              </div>
              <div
                className="light-controls"
                role="group"
                aria-label="Lighting"
              >
                {[
                  ["studio", "◐ Studio"],
                  ["warm", "☀ Golden"],
                  ["midnight", "☾ Midnight"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={view.light === id ? "selected" : ""}
                    aria-pressed={view.light === id}
                    onClick={() => changeView("light", id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="sliders composition-slider">
                <label>
                  <span>Separate halves</span>
                  <output>{view.separation.toFixed(2)}</output>
                  <input
                    type="range"
                    min="0.25"
                    max="1.2"
                    step="0.01"
                    value={view.separation}
                    onChange={(event) =>
                      changeView("separation", +event.target.value)
                    }
                  />
                </label>
              </div>
              <div className="section-title second">
                <span>03 / FORMATION</span>
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
              {collection.length > 0 && (
                <section className="collection">
                  <div className="section-title">
                    <span>04 / YOUR COLLECTION</span>
                    <span>{collection.length} / 12</span>
                  </div>
                  <p className="quality-note">
                    Saved in this browser · select to restore
                  </p>
                  <div className="collection-items">
                    {collection.map((item) => (
                      <div className="saved-specimen" key={item.id}>
                        <button
                          onClick={() => {
                            const restored = restoreSpecimen(item);
                            setName(restored.name);
                            update(restored.params);
                          }}
                        >
                          <i
                            style={{ "--swatch": presets[item.name].colors[3] }}
                          />
                          <span>
                            {item.name}
                            <small>Seed {item.values.seed.toFixed(2)}</small>
                          </span>
                        </button>
                        <button
                          onClick={() => remove(item.id)}
                          aria-label={`Remove saved ${item.name}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
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
