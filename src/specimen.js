import { controls, presets } from "./config";

export function restoreSpecimen(value) {
  if (value?.v !== 1 || !Object.hasOwn(presets, value.name)) return null;
  const params = { ...presets[value.name] };
  for (const [key, , min, max] of controls) {
    const number = value.values?.[key];
    if (!Number.isFinite(number) || number < min || number > max) return null;
    params[key] = number;
  }
  return { name: value.name, params };
}

export function packSpecimen(name, params) {
  return {
    v: 1,
    name,
    values: Object.fromEntries(controls.map(([key]) => [key, params[key]])),
  };
}

export function readSharedSpecimen(hash) {
  try {
    return restoreSpecimen(
      JSON.parse(new URLSearchParams(hash.slice(1)).get("specimen")),
    );
  } catch {
    return null;
  }
}

export function readCollection() {
  try {
    const items = JSON.parse(localStorage.getItem("geode-collection") || "[]");
    return Array.isArray(items)
      ? items
          .filter(
            (item) => typeof item?.id === "string" && restoreSpecimen(item),
          )
          .slice(0, 12)
      : [];
  } catch {
    return [];
  }
}
