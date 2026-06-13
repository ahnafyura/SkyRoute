// src/lib/api.ts — SkyRoute Analytics Data-Fetching Abstraction
// Implements dual-mode: Dummy (local JSON) ↔ Live (FastAPI backend)
// Switchover via NEXT_PUBLIC_USE_LIVE_API env variable.

import type {
  GraphData,
  NfzZone,
  AirportNode,
  RouteRequest,
  RouteResponse,
} from "@/types";

const USE_LIVE = process.env.NEXT_PUBLIC_USE_LIVE_API === "true";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * Unified fetcher — resolves to local JSON paths in dummy mode,
 * or prefixes API_BASE in live mode.
 */
async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const url = USE_LIVE ? `${API_BASE}${path}` : path;
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request gagal.");
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API Functions
// ---------------------------------------------------------------------------

/**
 * Fetch the full graph (nodes + edges).
 * Dummy mode: reads /data/graph.json from public/.
 * Live mode:  GET /graph
 */
export async function fetchGraph(): Promise<GraphData> {
  return fetcher<GraphData>(USE_LIVE ? "/graph" : "/data/graph.json");
}

/**
 * Fetch NFZ zones.
 * Dummy mode: reads /data/nfz.json from public/.
 * Live mode:  GET /nfz
 */
export async function fetchNfz(): Promise<{ nfz_zones: NfzZone[] }> {
  return fetcher<{ nfz_zones: NfzZone[] }>(
    USE_LIVE ? "/nfz" : "/data/nfz.json"
  );
}

/**
 * Fetch airport list.
 * Dummy mode: derived from graph.json nodes.
 * Live mode:  GET /airports
 */
export async function fetchAirports(): Promise<{ airports: AirportNode[] }> {
  if (!USE_LIVE) {
    const g = await fetchGraph();
    return { airports: g.nodes };
  }
  return fetcher<{ airports: AirportNode[] }>("/airports");
}

/**
 * Request a shortest-path route calculation.
 * Dummy mode: returns a static mock response.
 * Live mode:  POST /route with RouteRequest body.
 */
export async function postRoute(req: RouteRequest): Promise<RouteResponse> {
  if (!USE_LIVE) {
    // Throw so handleFindRoute falls back to client-side computeRoute()
    throw new Error("DUMMY_MODE: no backend — using client-side route engine.");
  }

  const payload = {
    origin: req.origin,
    destination: req.destination,
    algorithm: req.algo,
  };

  try {
    const url = `${API_BASE}/api/route`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    return await res.json() as RouteResponse;
  } catch {
    throw new Error("NETWORK ERROR: Failed to communicate with pathfinding backend engine. Check server status.");
  }
}

/**
 * Toggle a single NFZ zone's active status.
 * Dummy mode: no-op (state managed locally on the client).
 * Live mode:  POST /nfz with { id, active }.
 */
export async function toggleNfz(
  id: string,
  active: boolean
): Promise<void> {
  if (!USE_LIVE) {
    return;
  }
  await fetcher<unknown>("/nfz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, active }),
  });
}

