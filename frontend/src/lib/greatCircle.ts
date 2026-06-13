// src/lib/greatCircle.ts — Great Circle Arc via SLERP on the unit sphere

/**
 * Compute intermediate [lat, lon] points along the great circle arc between
 * two geographic coordinates. Uses Spherical Linear Interpolation (SLERP).
 * Returns Leaflet-compatible [lat, lon] tuples.
 */
export function greatCirclePoints(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  numPointsHint?: number
): [number, number][] {
  // Adaptive resolution: more points for longer arcs
  const dLat = Math.abs(lat2 - lat1);
  const dLon = Math.abs(lon2 - lon1);
  const approxDeg = Math.sqrt(dLat * dLat + dLon * dLon);
  const n =
    numPointsHint ??
    (approxDeg < 2 ? 12 : approxDeg < 5 ? 24 : approxDeg < 10 ? 48 : 64);

  // Convert to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const λ1 = (lon1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const λ2 = (lon2 * Math.PI) / 180;

  // Cartesian unit vectors on the unit sphere
  const v1 = [
    Math.cos(φ1) * Math.cos(λ1),
    Math.cos(φ1) * Math.sin(λ1),
    Math.sin(φ1),
  ];
  const v2 = [
    Math.cos(φ2) * Math.cos(λ2),
    Math.cos(φ2) * Math.sin(λ2),
    Math.sin(φ2),
  ];

  // Angle between vectors
  const dot = Math.min(
    1,
    Math.max(-1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2])
  );
  const omega = Math.acos(dot);

  if (omega < 1e-6) {
    // Nearly identical points — return straight segment
    return [[lat1, lon1], [lat2, lon2]];
  }

  const sinOmega = Math.sin(omega);
  const points: [number, number][] = [];

  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.sin((1 - t) * omega) / sinOmega;
    const b = Math.sin(t * omega) / sinOmega;

    const x = a * v1[0] + b * v2[0];
    const y = a * v1[1] + b * v2[1];
    const z = a * v1[2] + b * v2[2];

    const lat = (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI;
    const lon = (Math.atan2(y, x) * 180) / Math.PI;
    points.push([lat, lon]);
  }

  return points;
}

/**
 * Bearing (degrees, 0-360 clockwise from north) from point 1 to point 2.
 */
export function bearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
