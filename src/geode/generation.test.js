import { describe, expect, test } from "bun:test";
import * as THREE from "three/webgpu";
import { presets, qualityLevels } from "../config";
import { crystalGeometry, crystalInstances, makeRock } from "./generation";

const params = {
  seed: 0,
  shell: 0.34,
  bands: 15,
  stretch: 1.18,
  lumps: 1,
  colors: ["#755d68", "#8994a9", "#ded9e2", "#49306f", "#d1bde2"],
  point: 1.1,
  blade: 0,
  chisel: 0,
  zoning: 0.45,
  crystal: 0.52,
  density: 1.5,
};
const quality = { segments: 32, layers: 24, crystals: 100 };

describe("geode generation", () => {
  test("generates repeatable finite geometry and crystal instances", () => {
    const rock = makeRock(params, quality);
    const crystal = crystalGeometry(params);
    try {
      const first = crystalInstances(params, quality);
      const second = crystalInstances(params, quality);
      expect(first.count).toBeGreaterThan(0);
      expect(rock.groups.map((group) => group.materialIndex)).toEqual([
        0, 1, 2,
      ]);
      expect(rock.groups.reduce((count, group) => count + group.count, 0)).toBe(
        rock.index.count,
      );
      expect(first.matrices).toEqual(second.matrices);
      expect(first.colors).toEqual(second.colors);
      expect(first.matrices.length).toBe(first.count * 16);
      expect(first.colors.length).toBe(first.count * 3);
      for (const values of [
        rock.attributes.position.array,
        rock.attributes.normal.array,
        crystal.attributes.position.array,
        first.matrices,
      ]) {
        expect(Array.from(values).every(Number.isFinite)).toBe(true);
      }
    } finally {
      rock.dispose();
      crystal.dispose();
    }
  });

  test.each(
    Object.entries(presets).flatMap(([name, p]) =>
      Object.entries(qualityLevels).map(([levelName, level]) => [
        name,
        levelName,
        p,
        level,
      ]),
    ),
  )(
    "keeps %s crystals inside the outer rind at %s quality",
    (_name, _levelName, p, level) => {
      const geometry = crystalGeometry(p);
      const instances = crystalInstances(p, level);
      const positions = geometry.attributes.position;
      const matrix = new THREE.Matrix4();
      const vertex = new THREE.Vector3();
      let outside = 0;
      try {
        for (let i = 0; i < instances.count; i++) {
          matrix.fromArray(instances.matrices, i * 16);
          for (let j = 0; j < positions.count; j++) {
            vertex.fromBufferAttribute(positions, j).applyMatrix4(matrix);
            const angle = Math.atan2(vertex.y, vertex.x / p.stretch);
            const outline =
              1 +
              p.lumps *
                (0.075 * Math.sin(3 * angle + p.seed * 0.8) +
                  0.045 * Math.sin(5 * angle - p.seed * 1.4) +
                  0.026 * Math.cos(9 * angle + p.seed) +
                  0.012 * Math.sin(17 * angle));
            const radius = Math.hypot(vertex.x / p.stretch, vertex.y) / outline;
            if (radius ** 2 + (vertex.z / 0.75) ** 2 > 1 || vertex.z > 0.00001)
              outside++;
          }
        }
        if (p.shell < 1) expect(instances.count).toBeGreaterThan(0);
        expect(outside).toBe(0);
      } finally {
        geometry.dispose();
      }
    },
  );

  test.each(Object.entries(qualityLevels))(
    "keeps color and normals continuous at the outer pole at %s quality",
    (_name, level) => {
      const rock = makeRock(presets.Amethyst, level);
      try {
        const { position, normal, color } = rock.attributes;
        let firstColor;
        let count = 0;
        for (let i = 0; i < position.count; i++) {
          if (
            Math.hypot(position.getX(i), position.getY(i)) > 1e-8 ||
            Math.abs(position.getZ(i) + 0.75) > 1e-8
          )
            continue;
          const tint = [color.getX(i), color.getY(i), color.getZ(i)];
          firstColor ??= tint;
          expect(tint).toEqual(firstColor);
          expect([normal.getX(i), normal.getY(i), normal.getZ(i)]).toEqual([
            0, 0, -1,
          ]);
          count++;
        }
        expect(count).toBeGreaterThanOrEqual(level.segments);
      } finally {
        rock.dispose();
      }
    },
  );

  test("does not place crystals when the cavity is closed", () => {
    const result = crystalInstances({ ...params, shell: 1.1 }, quality);
    expect(result.count).toBe(0);
    expect(result.matrices.length).toBe(0);
    expect(result.colors.length).toBe(0);
  });
});
