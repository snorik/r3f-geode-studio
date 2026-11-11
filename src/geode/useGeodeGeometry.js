import { useEffect, useMemo } from "react";
import { makeRock, crystalGeometry, crystalInstances } from "./generation";

export function useGeodeGeometry(p, quality) {
  const {
    seed,
    shell,
    bands,
    stretch,
    lumps,
    colors,
    point,
    blade,
    chisel,
    zoning,
    crystal,
    density,
  } = p;
  const rock = useMemo(
    () => makeRock({ seed, shell, bands, stretch, lumps, colors }, quality),
    [quality, seed, shell, bands, stretch, lumps, colors],
  );
  const geometry = useMemo(
    () => crystalGeometry({ point, blade, chisel, zoning, colors }),
    [point, blade, chisel, zoning, colors],
  );
  const instances = useMemo(
    () =>
      crystalInstances(
        { seed, shell, crystal, point, stretch, lumps, density },
        quality,
      ),
    [quality, seed, shell, crystal, point, stretch, lumps, density],
  );
  useEffect(() => () => rock.dispose(), [rock]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return { rock, geometry, instances };
}
