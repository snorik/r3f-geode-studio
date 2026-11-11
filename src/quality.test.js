import { describe, expect, test } from "bun:test";
import { createFrameSampler, initialQuality, updateQuality } from "./quality";

describe("graphics quality", () => {
  test.each([
    [27.9, false, "low"],
    [28, false, "medium"],
    [47.9, false, "medium"],
    [48, false, "high"],
    [60, true, "medium"],
  ])("selects quality for %s FPS (mobile: %s)", (fps, mobile, name) => {
    expect(
      updateQuality(initialQuality(mobile), { type: "benchmark", fps, mobile })
        .name,
    ).toBe(name);
  });

  test("ignores a late benchmark in manual mode and resets on auto", () => {
    const manual = updateQuality(initialQuality(false), {
      type: "select",
      value: "high",
      mobile: false,
    });
    expect(
      updateQuality(manual, { type: "benchmark", fps: 10, mobile: false }),
    ).toEqual(manual);
    expect(
      updateQuality(manual, { type: "select", value: "auto", mobile: false }),
    ).toEqual(initialQuality(false));
  });

  test("samples frames once and excludes long pauses", () => {
    const sample = createFrameSampler();
    expect(sample(0)).toBeNull();
    for (let time = 100; time <= 3500; time += 100)
      expect(sample(time)).toBeNull();
    expect(sample(3600)).toBe(10);
    expect(sample(3700)).toBeNull();
    const slow = createFrameSampler();
    slow(0);
    expect(slow(8001)).toBe(0);
  });
});
