# Geode Studio

## Communication

- Communicate with the user in Russian. Keep tool names, commands, and code identifiers in their original form.
- Explain changes and validation results briefly and clearly.

## Project

Geode Studio is an interactive procedural geode generator: users choose a mineral, adjust stone and crystal parameters, and rotate and zoom the scene. It is an interpretation of Nodevember's Geode Generator rather than a direct port of Blender Geometry Nodes.

## Stack and structure

- JavaScript, React, Vite, Three.js, React Three Fiber, and Drei.
- Three.js WebGPURenderer with a WebGL 2 fallback when needed.
- `src/geode/generation.js` handles geometry generation and disposal; `src/geode/Geode.jsx` renders the geode.
- `src/Scene.jsx` handles the scene and rendering; `src/App.jsx` handles the UI and state; `src/config.js` defines presets and settings.
- ESLint with React Hooks rules and Prettier check code and formatting.

## Commands

Use only Bun to manage dependencies and run commands. Keep `bun.lock` up to date.

- `bun install` installs dependencies.
- `bun run dev` starts the development server.
- `bun run lint` runs ESLint.
- `bun run format:check` checks formatting; `bun run format` fixes it.
- `bun run build` creates a production build.
