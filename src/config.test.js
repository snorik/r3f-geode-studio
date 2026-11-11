import { describe, expect, test } from "bun:test";
import { controls, isMobile, presets } from "./config";

describe("mineral presets", () => {
  test("provide valid values for every control", () => {
    expect(Object.keys(presets).length).toBeGreaterThan(0);
    expect(new Set(controls.map(([key]) => key)).size).toBe(controls.length);
    for (const preset of Object.values(presets)) {
      expect(preset.colors).toHaveLength(5);
      for (const [key, , min, max] of controls) {
        expect(Number.isFinite(preset[key])).toBe(true);
        expect(preset[key]).toBeGreaterThanOrEqual(min);
        expect(preset[key]).toBeLessThanOrEqual(max);
      }
    }
  });

  test("keeps Celestine's chisel override without changing other presets", () => {
    expect(presets.Celestine.chisel).toBe(1);
    expect(presets.Amethyst.chisel).toBe(0);
  });

  test("detects mobile devices from the supplied user agent", () => {
    expect(isMobile("Mozilla/5.0 (iPhone)")).toBe(true);
    expect(isMobile("Mozilla/5.0 (X11; Linux x86_64)")).toBe(false);
  });
});
