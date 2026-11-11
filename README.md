# Geode Studio

Интерактивная процедурная интерпретация [Geode Generator](https://github.com/yapitw/nodevember/tree/main/2026/day10-geode-v2-generator/tutorial) из Nodevember. Шесть вариантов камня, параметры формы и кристаллов, вращение и масштабирование сцены. Исходные Blender-файлы генератора не опубликованы; геометрия и материалы здесь являются приближением по описанию tutorial, а не прямым портом Geometry Nodes.

## Запуск

```sh
bun install
bun run dev
```

Для production-сборки: `bun run build`. Используются React Three Fiber, Three.js WebGPURenderer и его автоматический WebGL 2 fallback. Нужен современный браузер с поддержкой WebGPU или WebGL 2.

## Проверки кода

После установки зависимостей через `bun install`:

- `bun run lint` — ESLint и правила React Hooks.
- `bun run format:check` — проверка форматирования Prettier.
- `bun run format` — автоматическое форматирование.
- `bun run build` — проверка production-сборки.

Генерация геометрии и управление её ресурсами находятся в `src/geode/generation.js`, отображение жеоды — в `src/geode/Geode.jsx`, сцена — в `src/Scene.jsx`, а интерфейс управления — в `src/App.jsx`.
