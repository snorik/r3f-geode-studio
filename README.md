# Geode Studio

An interactive procedural interpretation of Nodevember's [Geode Generator](https://github.com/yapitw/nodevember/tree/main/2026/day10-geode-v2-generator/tutorial). Explore twelve mineral presets, adjust the stone's shape and crystals, and rotate and zoom the scene. The original Blender files have not been published; the geometry and materials here approximate the tutorial's description rather than directly porting Geometry Nodes.

## Features

- Amethyst, citrine, celestite, calcite, druzy, agate, rose and smoky quartz, fluorite, pyrite, aquamarine, and malachite. These are artistic procedural interpretations, with square prisms for fluorite and pyrite, metallic reflections, and color zoning.
- A local environment with three broad light panels for reflections and a rim light, plus separate materials for the polished cut and outer rind. Refraction on High and subtle bloom on Medium/High preserve detail in bright bands. No external HDRIs are loaded.
- Procedural surface detail and roughness variation on the rind and floor: a shared 128×128 texture with mipmaps and triplanar projection avoids UV seams. Rind coloring is continuous at the poles and independent of mesh resolution.
- High enables half-resolution GTAO with depth-aware filtering for additional shading between crystals and at floor contact points. The effect is disabled on Low/Medium.
- A matte floor with soft PCF shadows. Both halves rest on the floor according to their shape; the shadow map updates when the specimen changes and is reused while orbiting the camera. Shadow resolution depends on quality.
- Three lighting setups: Studio, Golden, and Midnight. Separate the halves, enable automatic rotation, and reset the camera with Recenter.
- Surprise me creates a new variation. Seed affects both the outline and crystal distribution.
- Save stores up to 12 specimens in the browser's localStorage; the collection persists across reloads. Share copies a link with the specimen's parameters, excluding lighting and camera position.
- PNG exports the current scene without the interface at the canvas resolution.

## Getting started

```sh
bun install
bun run dev
```

Run `bun run build` to create a production build. The project uses React Three Fiber, Three.js WebGPURenderer, and its automatic WebGL 2 fallback. A modern browser with WebGPU or WebGL 2 support is required.

## Code checks

After installing dependencies with `bun install`:

- `bun run lint` checks ESLint and React Hooks rules.
- `bun run format:check` checks Prettier formatting.
- `bun run format` formats the code automatically.
- `bun run build` verifies the production build.
- `bun test` checks generation determinism, crystal bounds across all presets, the update scheduler, quality settings, and shared-link validation.

Geometry generation and resource disposal live in `src/geode/generation.js`, geode rendering in `src/geode/Geode.jsx`, the scene in `src/Scene.jsx`, and the controls in `src/App.jsx`.
