import * as THREE from "three/webgpu";

const cavityRadius = (p) => Math.max(0, 1 - Math.min(p.shell, 1) * 0.92);
const rand = (n) => {
  const x = Math.sin(n * 127.1 + 91.7) * 43758.5453;
  return x - Math.floor(x);
};
function outline(a, p) {
  return (
    1 +
    p.lumps *
      (0.075 * Math.sin(3 * a + p.seed * 0.8) +
        0.045 * Math.sin(5 * a - p.seed * 1.4) +
        0.026 * Math.cos(9 * a + p.seed) +
        0.012 * Math.sin(17 * a))
  );
}
function geo(vertices, colors, indices) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function makeRock(p, quality) {
  const N = quality.segments,
    layers = quality.layers,
    inner = Math.max(0.025, cavityRadius(p)),
    v = [],
    c = [],
    idx = [];
  const palette = p.colors.map((x) => new THREE.Color(x));
  const put = (x, y, z, col) => {
    v.push(x, y, z);
    c.push(col.r, col.g, col.b);
  };
  // Polished cut: depth is shared by all rings, so bands follow the outside contour.
  for (let j = 0; j <= layers; j++) {
    let t = j / layers,
      r = 1 - (1 - inner) * t;
    for (let i = 0; i <= N; i++) {
      let a = (i / N) * Math.PI * 2,
        wobble = outline(a, p),
        wave =
          t +
          0.014 * Math.sin(a * 7 + t * 12) +
          0.006 * Math.sin(a * 17) +
          0.0025 * Math.sin(a * 37 + t * 23);
      let warped =
        wave + 0.032 * Math.sin(wave * 11) + 0.018 * Math.sin(wave * 25 + 1.2);
      let band = Math.sin(warped * p.bands * Math.PI * 2);
      let col;
      if (t < 0.045) col = palette[0].clone().lerp(palette[2], 0.25);
      else if (t > 0.87) col = palette[2].clone();
      else {
        col = palette[1]
          .clone()
          .lerp(
            palette[2],
            THREE.MathUtils.smoothstep(band, -0.8, 0.85) * 0.52,
          );
        if (Math.sin(warped * p.bands * Math.PI * 6) > 0.88)
          col.lerp(palette[2], 0.12);
        col.multiplyScalar(0.92 + 0.08 * rand(i * 351 + j * 7));
        if (
          Math.sin(wave * p.bands * Math.PI * 2 + 0.5 * Math.sin(t * 7.3)) >
            0.95 &&
          rand(j * 9) > 0.7
        )
          col.lerp(palette[0], 0.17);
      }
      put(
        Math.cos(a) * r * wobble * p.stretch,
        Math.sin(a) * r * wobble,
        0,
        col,
      );
    }
  }
  for (let j = 0; j < layers; j++)
    for (let i = 0; i < N; i++) {
      let a = j * (N + 1) + i,
        b = a + N + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  // Outer rind and inner cavity, continuous with the polished rim.
  const cutEnd = idx.length;
  const poles = [];
  const ring = (innerSide) => {
    const start = v.length / 3,
      steps = Math.round(quality.segments / 5.33);
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      for (let i = 0; i <= N; i++) {
        let a = (i / N) * Math.PI * 2,
          wobble = outline(a, p),
          r = innerSide
            ? inner * Math.sqrt(Math.max(0, 1 - t * t))
            : Math.sqrt(Math.max(0, 1 - t * t));
        const x = Math.cos(a) * r * wobble * p.stretch;
        const y = Math.sin(a) * r * wobble;
        const z = -t * (innerSide ? inner * 0.8 : 0.75);
        // Sample in space rather than by vertex index. This keeps the pole
        // continuous and the stone's texture stable across quality levels.
        const noise =
          Math.sin(x * 31 + z * 19 + p.seed) *
          Math.cos(y * 27 - z * 23) *
          Math.sin((x + y) * 17 + 1.2);
        const grain = innerSide ? 1 : 1 + Math.sin(Math.PI * t) * noise * 0.008;
        const color = (innerSide ? palette[2] : palette[0])
          .clone()
          .multiplyScalar(innerSide ? 0.24 + noise * 0.025 : 0.9 + noise * 0.1);
        if (j === steps) poles.push([v.length / 3, innerSide ? 1 : -1]);
        put(x * grain, y * grain, z, color);
      }
    }
    for (let j = 0; j < steps; j++)
      for (let i = 0; i < N; i++) {
        let a = start + j * (N + 1) + i,
          b = a + N + 1;
        if (innerSide) idx.push(a, a + 1, b, b, a + 1, b + 1);
        else idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
  };
  ring(false);
  const rindEnd = idx.length;
  if (inner > 0.04) ring(true);
  const result = geo(v, c, idx);
  for (const [index, direction] of poles) {
    result.attributes.normal.setXYZ(index, 0, 0, direction);
  }
  result.addGroup(0, cutEnd, 0);
  result.addGroup(cutEnd, rindEnd - cutEnd, 1);
  result.addGroup(rindEnd, idx.length - rindEnd, 2);
  return result;
}
// Every crystal shares one faceted prism. Instance matrices carry its position,
// orientation and dimensions; instance colors retain stable variation by site.
export function crystalGeometry(p) {
  const vertices = [],
    colors = [],
    base = new THREE.Color(p.colors[4]),
    tip = new THREE.Color(p.colors[3]);
  const shoulder = Math.max(0.22, 1 - p.point / (p.point + 2)),
    rings = [[], [], []],
    facets = p.facets ?? 6;
  const rootColor = base.clone(),
    shoulderColor = base
      .clone()
      .lerp(
        tip,
        THREE.MathUtils.smoothstep(shoulder, p.zoning - 0.18, p.zoning + 0.18),
      );
  for (let ring = 0; ring < 3; ring++)
    for (let k = 0; k < facets; k++) {
      const a = (k * Math.PI * 2) / facets,
        width = ring === 2 ? p.chisel : 1;
      rings[ring].push([
        Math.cos(a) * width,
        ring === 0 ? -0.28 : ring === 1 ? shoulder : 1,
        Math.sin(a) *
          (1 - 0.78 * p.blade) *
          (ring === 2 ? (facets === 4 ? p.chisel : 0) : 1),
      ]);
    }
  const triangle = (a, b, c, ca, cb, cc, shade) => {
    for (const [point, color] of [
      [a, ca],
      [c, cc],
      [b, cb],
    ]) {
      vertices.push(...point);
      colors.push(color.r * shade, color.g * shade, color.b * shade);
    }
  };
  for (let k = 0; k < facets; k++) {
    const n = (k + 1) % facets,
      shade = 0.78 + 0.22 * rand(k * 13);
    triangle(
      rings[0][k],
      rings[1][n],
      rings[1][k],
      rootColor,
      shoulderColor,
      shoulderColor,
      shade,
    );
    triangle(
      rings[0][k],
      rings[0][n],
      rings[1][n],
      rootColor,
      rootColor,
      shoulderColor,
      shade,
    );
    triangle(
      rings[1][k],
      rings[1][n],
      rings[2][k],
      shoulderColor,
      shoulderColor,
      tip,
      shade,
    );
    if (p.chisel > 0.001)
      triangle(
        rings[2][k],
        rings[1][n],
        rings[2][n],
        tip,
        shoulderColor,
        tip,
        shade,
      );
  }
  if (facets === 4 && p.chisel > 0) {
    triangle(rings[2][0], rings[2][1], rings[2][2], tip, tip, tip, 1);
    triangle(rings[2][0], rings[2][2], rings[2][3], tip, tip, tip, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
export function crystalInstances(p, quality) {
  const inner = cavityRadius(p),
    matrices = [],
    colors = [];
  if (inner < 0.09)
    return {
      matrices: new Float32Array(),
      colors: new Float32Array(),
      count: 0,
    };
  const up = new THREE.Vector3(0, 1, 0),
    axis = new THREE.Vector3(),
    position = new THREE.Vector3(),
    scale = new THREE.Vector3(),
    vertex = new THREE.Vector3();
  const rotation = new THREE.Quaternion(),
    spin = new THREE.Quaternion(),
    matrix = new THREE.Matrix4();
  const random = (n) => rand(n + p.seed * 73.31);
  for (let id = 0; id < quality.crystals; id++) {
    if (random(id * 11 + 19) > Math.min(1, p.density / 2.5)) continue;
    const depth = (id + 0.5) / quality.crystals,
      angle = id * 2.3999632297 + (random(id * 17) - 0.5) * 0.04;
    const radial = Math.sqrt(1 - depth * depth),
      shape = outline(angle, p);
    const x = Math.cos(angle) * radial * inner * shape * p.stretch,
      y = Math.sin(angle) * radial * inner * shape,
      z = -depth * inner * 0.8;
    axis
      .set(
        -x / (p.stretch * p.stretch) + (random(id * 23) - 0.5) * inner * 0.13,
        -y + (random(id * 23 + 1) - 0.5) * inner * 0.13,
        (depth * inner) / 0.8,
      )
      .normalize();
    const big = random(id * 9 + 5) > 0.86;
    const radius =
      inner *
      (big ? 0.035 + 0.07 * p.crystal : 0.014 + 0.021 * p.crystal) *
      (0.7 + 0.6 * random(id * 2 + 3));
    let length =
      radius *
      (big
        ? 1.6 + 1.8 * random(id * 3 + 8) + p.point
        : 1.1 + 0.7 * random(id * 3 + 8) + p.point * 0.5);
    rotation
      .setFromUnitVectors(up, axis)
      .multiply(spin.setFromAxisAngle(up, random(id * 29) * Math.PI * 2));
    // Keep every ring inside a conservative approximation of the outer rind.
    // The margin accounts for the rind grain and its polygonal tessellation.
    const shoulder = Math.max(0.22, 1 - p.point / (p.point + 2));
    let fits = false;
    for (let attempt = 0; attempt <= 30; attempt++) {
      const inset = attempt * inner * 0.01;
      position.set(x, y, z).addScaledVector(axis, inset);
      const clearance =
        -position.z - radius * Math.sqrt(Math.max(0, 1 - axis.z * axis.z));
      const safeLength = Math.min(length, clearance / Math.max(axis.z, 0.001));
      if (safeLength < radius * 0.12) break;
      matrix.compose(position, rotation, scale.set(radius, safeLength, radius));
      fits = true;
      for (const height of [-0.28, shoulder, 1]) {
        for (let k = 0; k < 6; k++) {
          const angle = (k * Math.PI) / 3;
          vertex
            .set(Math.cos(angle), height, Math.sin(angle))
            .applyMatrix4(matrix);
          const a = Math.atan2(vertex.y, vertex.x / p.stretch);
          const r =
            Math.hypot(vertex.x / p.stretch, vertex.y) /
            (outline(a, p) * 0.975);
          if (r * r + (vertex.z / 0.745) ** 2 > 1) {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }
      if (fits) break;
    }
    if (!fits) continue;
    matrices.push(...matrix.elements);
    const tint = 0.48 + 0.52 * random(id * 31);
    colors.push(tint, tint, tint);
  }
  return {
    matrices: new Float32Array(matrices),
    colors: new Float32Array(colors),
    count: colors.length / 3,
  };
}
