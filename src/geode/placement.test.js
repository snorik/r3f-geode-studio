import { expect, test } from "bun:test";
import * as THREE from "three/webgpu";
import { presets } from "../config";
import { makeRock } from "./generation";
import { groundHeight, restingHeight, specimenScale } from "./placement";

test.each(Object.entries(presets))(
  "%s rests on the surface for either half and an irregular outline",
  (_name, preset) => {
    const rock = makeRock(
      { ...preset, lumps: 2 },
      { segments: 96, layers: 24 },
    );
    try {
      for (const angles of [
        [-0.36, 0.12, -0.13],
        [0.06, -0.17, 0.14],
      ]) {
        const height = restingHeight(rock, angles);
        const matrix = new THREE.Matrix4().compose(
          new THREE.Vector3(0, height, 0),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(...angles)),
          new THREE.Vector3().setScalar(specimenScale),
        );
        const placed = rock.clone().applyMatrix4(matrix);
        placed.computeBoundingBox();
        expect(placed.boundingBox.min.y).toBeCloseTo(groundHeight + 0.005, 5);
        placed.dispose();
      }
    } finally {
      rock.dispose();
    }
  },
);
