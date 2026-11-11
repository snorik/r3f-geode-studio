import { describe, expect, test } from "bun:test";
import { controls, presets } from "./config";
import { packSpecimen, readSharedSpecimen, restoreSpecimen } from "./specimen";

describe("specimen links", () => {
  test.each(Object.keys(presets))(
    "round-trips edited %s parameters",
    (name) => {
      const params = { ...presets[name], seed: 1.23, density: 2.1 };
      const packed = packSpecimen(name, params);
      const hash = `#${new URLSearchParams({ specimen: JSON.stringify(packed) })}`;
      expect(readSharedSpecimen(hash)).toEqual({ name, params });
    },
  );

  test("rejects malformed links, unknown minerals and incomplete parameters", () => {
    for (const hash of ["", "#specimen={", "#specimen=null", "#specimen=[]"]) {
      expect(readSharedSpecimen(hash)).toBeNull();
    }
    expect(restoreSpecimen({ v: 1, name: "__proto__", values: {} })).toBeNull();
    expect(restoreSpecimen({ v: 1, name: "Amethyst", values: {} })).toBeNull();
  });

  test("rejects out-of-range and nonnumeric values before generating geometry", () => {
    for (const [key, , , max] of controls) {
      for (const value of [max + 1, "1", null, Infinity]) {
        const packed = packSpecimen("Amethyst", presets.Amethyst);
        packed.values[key] = value;
        expect(restoreSpecimen(packed)).toBeNull();
      }
    }
  });
});
