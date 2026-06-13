// src/lib/algorithms.ts — SkyRoute Analytics Algorithm Engine
// Dijkstra · A* · Bidirectional Dijkstra · Yen's K-Shortest Paths
// Pure TypeScript, no backend required.

import type {
  AirportNode,
  GraphEdge,
  GraphData,
  NfzZone,
  NfzGeometryPolygon,
  NfzGeometryCircle,
  BlockedEdge,
  RouteResponse,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Extended Types
// ─────────────────────────────────────────────────────────────────────────────

export type AlgoType = "dijkstra" | "astar" | "bidir";

export interface AlgorithmStep {
  type: "explore" | "settle" | "update_dist";
  node: string;
  distanceSoFar: number;
  frontier: string[];
  settled: string[];
}

export interface AlgorithmResult extends RouteResponse {
  steps: AlgorithmStep[];
  nodesExplored: number;
  timeMs: number;
  algo: AlgoType;
}

export interface ComputeRouteParams {
  origin: string;
  destination: string;
  algo: AlgoType;
  graphData: GraphData;
  nfzZones: NfzZone[];
  trackSteps: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Min Heap
// ─────────────────────────────────────────────────────────────────────────────

interface HeapEntry {
  priority: number;
  node: string;
}

class MinHeap {
  private data: HeapEntry[] = [];

  push(item: HeapEntry): void {
    this.data.push(item);
    this.up(this.data.length - 1);
  }

  pop(): HeapEntry | undefined {
    if (!this.data.length) return undefined;
    this.swap(0, this.data.length - 1);
    const item = this.data.pop()!;
    if (this.data.length) this.down(0);
    return item;
  }

  peek(): HeapEntry | undefined {
    return this.data[0];
  }

  get size(): number {
    return this.data.length;
  }

  private up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].priority <= this.data[i].priority) break;
      this.swap(p, i);
      i = p;
    }
  }

  private down(i: number): void {
    const n = this.data.length;
    while (true) {
      let min = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].priority < this.data[min].priority) min = l;
      if (r < n && this.data[r].priority < this.data[min].priority) min = r;
      if (min === i) break;
      this.swap(min, i);
      i = min;
    }
  }

  private swap(a: number, b: number): void {
    [this.data[a], this.data[b]] = [this.data[b], this.data[a]];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Haversine Distance (great-circle, km)
// ─────────────────────────────────────────────────────────────────────────────

export function haversine(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ─────────────────────────────────────────────────────────────────────────────
// NFZ Geometry — pure 2-D in degree space (valid for Indonesia ±10° equator)
// ─────────────────────────────────────────────────────────────────────────────

function pointInPolygon(
  px: number, py: number,
  poly: [number, number][]
): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (
      (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function twoSegmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
): boolean {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-12) return false;
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / cross;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segmentIntersectsPolygon(
  lon1: number, lat1: number,
  lon2: number, lat2: number,
  polyCoords: [number, number][]
): boolean {
  if (
    pointInPolygon(lon1, lat1, polyCoords) ||
    pointInPolygon(lon2, lat2, polyCoords)
  )
    return true;
  const n = polyCoords.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    if (
      twoSegmentsIntersect(
        lon1, lat1, lon2, lat2,
        polyCoords[j][0], polyCoords[j][1],
        polyCoords[i][0], polyCoords[i][1]
      )
    )
      return true;
  }
  return false;
}

function segmentIntersectsCircle(
  lon1: number, lat1: number,
  lon2: number, lat2: number,
  circleLon: number, circleLat: number,
  radiusKm: number
): boolean {
  const rDeg = radiusKm / 111.0;
  const dx = lon2 - lon1, dy = lat2 - lat1;
  const len2 = dx * dx + dy * dy;
  let t =
    len2 < 1e-12
      ? 0
      : ((circleLon - lon1) * dx + (circleLat - lat1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const clx = lon1 + t * dx, cly = lat1 + t * dy;
  return (clx - circleLon) ** 2 + (cly - circleLat) ** 2 <= rDeg ** 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// NFZ Edge Masking
// ─────────────────────────────────────────────────────────────────────────────

export function computeBlockedEdges(
  edges: GraphEdge[],
  nodes: AirportNode[],
  activeNfzZones: NfzZone[]
): { masked: Set<string>; blockedEdges: BlockedEdge[] } {
  const masked = new Set<string>();
  const blockedEdges: BlockedEdge[] = [];

  if (activeNfzZones.length === 0) return { masked, blockedEdges };

  const nodeMap = new Map(nodes.map((n) => [n.iata, n]));

  for (const edge of edges) {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) continue;

    for (const zone of activeNfzZones) {
      let blocked = false;

      if (zone.type === "polygon") {
        const geom = zone.geometry as NfzGeometryPolygon;
        blocked = segmentIntersectsPolygon(
          from.lon, from.lat, to.lon, to.lat,
          geom.coordinates[0]
        );
      } else if (zone.type === "circle") {
        const geom = zone.geometry as NfzGeometryCircle;
        blocked = segmentIntersectsCircle(
          from.lon, from.lat, to.lon, to.lat,
          geom.coordinates[0], geom.coordinates[1], geom.radius_km
        );
      }

      if (blocked) {
        const key = `${edge.from}->${edge.to}`;
        const rev = `${edge.to}->${edge.from}`;
        if (!masked.has(key)) {
          masked.add(key);
          masked.add(rev);
          blockedEdges.push({
            from: edge.from,
            to: edge.to,
            weight: null,
            reason: `Intersects NFZ: ${zone.name}`,
          });
        }
        break;
      }
    }
  }

  return { masked, blockedEdges };
}

// ─────────────────────────────────────────────────────────────────────────────
// Adjacency List Builder
// ─────────────────────────────────────────────────────────────────────────────

type AdjList = Map<string, { to: string; weight: number }[]>;

function buildAdjList(
  edges: GraphEdge[],
  masked: Set<string>,
  excludeEdges: Set<string> = new Set(),
  excludeNodes: Set<string> = new Set()
): AdjList {
  const adj: AdjList = new Map();
  for (const edge of edges) {
    if (excludeNodes.has(edge.from) || excludeNodes.has(edge.to)) continue;
    const key = `${edge.from}->${edge.to}`;
    const rev = `${edge.to}->${edge.from}`;
    if (masked.has(key) || excludeEdges.has(key) || excludeEdges.has(rev))
      continue;
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    if (!adj.has(edge.to)) adj.set(edge.to, []);
    adj.get(edge.from)!.push({ to: edge.to, weight: edge.weight });
    adj.get(edge.to)!.push({ to: edge.from, weight: edge.weight });
  }
  return adj;
}

function reconstructPath(
  prev: Map<string, string | null>,
  origin: string,
  dest: string
): string[] {
  const path: string[] = [];
  let curr: string | null = dest;
  const visited = new Set<string>();
  while (curr !== null && !visited.has(curr)) {
    visited.add(curr);
    path.unshift(curr);
    if (curr === origin) break;
    curr = prev.get(curr) ?? null;
  }
  return path.length > 0 && path[0] === origin ? path : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Dijkstra
// ─────────────────────────────────────────────────────────────────────────────

interface DijkstraResult {
  dist: Map<string, number>;
  prev: Map<string, string | null>;
  steps: AlgorithmStep[];
  settled: number;
}

function runDijkstra(
  nodeIds: string[],
  adj: AdjList,
  origin: string,
  dest: string,
  trackSteps: boolean
): DijkstraResult {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const settledSet = new Set<string>();
  const frontier = new Set<string>();
  const steps: AlgorithmStep[] = [];

  for (const id of nodeIds) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(origin, 0);

  const heap = new MinHeap();
  heap.push({ priority: 0, node: origin });
  frontier.add(origin);

  while (heap.size > 0) {
    const { priority: d, node: u } = heap.pop()!;
    if (settledSet.has(u)) continue;
    settledSet.add(u);
    frontier.delete(u);

    if (trackSteps) {
      steps.push({
        type: "settle",
        node: u,
        distanceSoFar: d,
        frontier: Array.from(frontier),
        settled: Array.from(settledSet),
      });
    }

    if (u === dest) break;

    for (const { to: v, weight } of adj.get(u) ?? []) {
      if (settledSet.has(v)) continue;
      const alt = d + weight;
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
        heap.push({ priority: alt, node: v });
        frontier.add(v);
        if (trackSteps) {
          steps.push({
            type: "update_dist",
            node: v,
            distanceSoFar: alt,
            frontier: Array.from(frontier),
            settled: Array.from(settledSet),
          });
        }
      }
    }
  }

  return { dist, prev, steps, settled: settledSet.size };
}

// ─────────────────────────────────────────────────────────────────────────────
// A* Algorithm
// ─────────────────────────────────────────────────────────────────────────────

function runAStar(
  nodeIds: string[],
  adj: AdjList,
  origin: string,
  dest: string,
  nodeMap: Map<string, AirportNode>,
  trackSteps: boolean
): DijkstraResult {
  const g = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const closedSet = new Set<string>();
  const frontier = new Set<string>();
  const steps: AlgorithmStep[] = [];

  const destNode = nodeMap.get(dest);
  const h = (iata: string): number => {
    if (!destNode) return 0;
    const n = nodeMap.get(iata);
    return n ? haversine(n.lat, n.lon, destNode.lat, destNode.lon) : 0;
  };

  for (const id of nodeIds) {
    g.set(id, Infinity);
    prev.set(id, null);
  }
  g.set(origin, 0);

  const heap = new MinHeap();
  heap.push({ priority: h(origin), node: origin });
  frontier.add(origin);

  while (heap.size > 0) {
    const { node: u } = heap.pop()!;
    if (closedSet.has(u)) continue;
    closedSet.add(u);
    frontier.delete(u);
    const gU = g.get(u)!;

    if (trackSteps) {
      steps.push({
        type: "settle",
        node: u,
        distanceSoFar: gU,
        frontier: Array.from(frontier),
        settled: Array.from(closedSet),
      });
    }

    if (u === dest) break;

    for (const { to: v, weight } of adj.get(u) ?? []) {
      if (closedSet.has(v)) continue;
      const tentativeG = gU + weight;
      if (tentativeG < (g.get(v) ?? Infinity)) {
        g.set(v, tentativeG);
        prev.set(v, u);
        heap.push({ priority: tentativeG + h(v), node: v });
        frontier.add(v);
        if (trackSteps) {
          steps.push({
            type: "update_dist",
            node: v,
            distanceSoFar: tentativeG,
            frontier: Array.from(frontier),
            settled: Array.from(closedSet),
          });
        }
      }
    }
  }

  return { dist: g, prev, steps, settled: closedSet.size };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bidirectional Dijkstra
// ─────────────────────────────────────────────────────────────────────────────

interface BiDirResult {
  path: string[];
  cost: number;
  steps: AlgorithmStep[];
  settled: number;
}

function runBidirectional(
  nodeIds: string[],
  adj: AdjList,
  origin: string,
  dest: string,
  trackSteps: boolean
): BiDirResult {
  const distF = new Map<string, number>();
  const distB = new Map<string, number>();
  const prevF = new Map<string, string | null>();
  const prevB = new Map<string, string | null>();
  const settledF = new Set<string>();
  const settledB = new Set<string>();
  const frontierF = new Set<string>();
  const steps: AlgorithmStep[] = [];

  for (const id of nodeIds) {
    distF.set(id, Infinity);
    distB.set(id, Infinity);
    prevF.set(id, null);
    prevB.set(id, null);
  }
  distF.set(origin, 0);
  distB.set(dest, 0);

  const heapF = new MinHeap();
  const heapB = new MinHeap();
  heapF.push({ priority: 0, node: origin });
  heapB.push({ priority: 0, node: dest });
  frontierF.add(origin);

  let bestDist = Infinity;
  let meetingNode = "";

  while (heapF.size > 0 || heapB.size > 0) {
    // Forward step
    if (heapF.size > 0) {
      const { priority: d, node: u } = heapF.pop()!;
      if (!settledF.has(u)) {
        settledF.add(u);
        frontierF.delete(u);
        if (trackSteps) {
          steps.push({
            type: "settle",
            node: u,
            distanceSoFar: d,
            frontier: Array.from(frontierF),
            settled: Array.from(settledF),
          });
        }
        for (const { to: v, weight } of adj.get(u) ?? []) {
          const alt = d + weight;
          if (alt < (distF.get(v) ?? Infinity)) {
            distF.set(v, alt);
            prevF.set(v, u);
            heapF.push({ priority: alt, node: v });
            frontierF.add(v);
          }
        }
        if (settledB.has(u)) {
          const c = (distF.get(u) ?? Infinity) + (distB.get(u) ?? Infinity);
          if (c < bestDist) { bestDist = c; meetingNode = u; }
        }
      }
    }

    // Backward step
    if (heapB.size > 0) {
      const { priority: d, node: u } = heapB.pop()!;
      if (!settledB.has(u)) {
        settledB.add(u);
        for (const { to: v, weight } of adj.get(u) ?? []) {
          const alt = d + weight;
          if (alt < (distB.get(v) ?? Infinity)) {
            distB.set(v, alt);
            prevB.set(v, u);
            heapB.push({ priority: alt, node: v });
          }
        }
        if (settledF.has(u)) {
          const c = (distF.get(u) ?? Infinity) + (distB.get(u) ?? Infinity);
          if (c < bestDist) { bestDist = c; meetingNode = u; }
        }
      }
    }

    const minF = heapF.peek()?.priority ?? Infinity;
    const minB = heapB.peek()?.priority ?? Infinity;
    if (minF + minB >= bestDist && bestDist < Infinity) break;
  }

  if (!meetingNode)
    return { path: [], cost: Infinity, steps, settled: settledF.size };

  // Reconstruct: forward half + backward half
  const pathF: string[] = [];
  let curr: string | null = meetingNode;
  const visitedF = new Set<string>();
  while (curr && !visitedF.has(curr)) {
    visitedF.add(curr);
    pathF.unshift(curr);
    if (curr === origin) break;
    curr = prevF.get(curr) ?? null;
  }

  const pathB: string[] = [];
  curr = prevB.get(meetingNode) ?? null;
  const visitedB = new Set<string>();
  while (curr && !visitedB.has(curr)) {
    visitedB.add(curr);
    pathB.push(curr);
    if (curr === dest) break;
    curr = prevB.get(curr) ?? null;
  }

  const full =
    pathF.length > 0 && pathF[0] === origin
      ? [...pathF, ...pathB]
      : [];

  return { path: full, cost: bestDist, steps, settled: settledF.size };
}

// ─────────────────────────────────────────────────────────────────────────────
// Yen's K-Shortest Paths
// ─────────────────────────────────────────────────────────────────────────────

function edgeCost(from: string, to: string, edges: GraphEdge[]): number {
  const e = edges.find(
    (x) =>
      (x.from === from && x.to === to) || (x.from === to && x.to === from)
  );
  return e ? e.weight : Infinity;
}

function pathCost(path: string[], edges: GraphEdge[]): number {
  let cost = 0;
  for (let i = 0; i < path.length - 1; i++) {
    cost += edgeCost(path[i], path[i + 1], edges);
  }
  return cost;
}

export function yenKShortest(
  nodes: AirportNode[],
  edges: GraphEdge[],
  masked: Set<string>,
  origin: string,
  dest: string,
  k: number = 3
): Array<{ path: string[]; cost: number }> {
  const nodeIds = nodes.map((n) => n.iata);

  const shortestPath = (
    excludeEdges: Set<string>,
    excludeNodes: Set<string>,
    src: string = origin
  ): string[] | null => {
    const adj = buildAdjList(edges, masked, excludeEdges, excludeNodes);
    const ids = nodeIds.filter((id) => !excludeNodes.has(id));
    const r = runDijkstra(ids, adj, src, dest, false);
    const p = reconstructPath(r.prev, src, dest);
    return p.length > 0 ? p : null;
  };

  const first = shortestPath(new Set(), new Set());
  if (!first) return [];

  const A: { path: string[]; cost: number }[] = [
    { path: first, cost: pathCost(first, edges) },
  ];
  const seen = new Set<string>();
  const candidates: { path: string[]; cost: number }[] = [];

  for (let ki = 1; ki < k; ki++) {
    const prevPath = A[ki - 1].path;

    for (let i = 0; i < prevPath.length - 1; i++) {
      const spurNode = prevPath[i];
      const rootPath = prevPath.slice(0, i + 1);
      const rootKey = JSON.stringify(rootPath);

      const excEdges = new Set<string>();
      const excNodes = new Set<string>();

      for (const a of A) {
        if (
          a.path.length > i + 1 &&
          JSON.stringify(a.path.slice(0, i + 1)) === rootKey
        ) {
          excEdges.add(`${a.path[i]}->${a.path[i + 1]}`);
          excEdges.add(`${a.path[i + 1]}->${a.path[i]}`);
        }
      }
      for (let j = 0; j < rootPath.length - 1; j++) {
        excNodes.add(rootPath[j]);
      }

      const spur = shortestPath(excEdges, excNodes, spurNode);
      if (spur && spur.length > 0) {
        const total = [...rootPath.slice(0, -1), ...spur];
        const key = JSON.stringify(total);
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({ path: total, cost: pathCost(total, edges) });
        }
      }
    }

    if (candidates.length === 0) break;
    candidates.sort((a, b) => a.cost - b.cost);
    A.push(candidates.shift()!);
  }

  return A;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

export function computeRoute(params: ComputeRouteParams): AlgorithmResult {
  const { origin, destination, algo, graphData, nfzZones, trackSteps } = params;
  const t0 = performance.now();

  if (origin === destination) {
    throw new Error("400: Origin and destination cannot be the same.");
  }

  const nodeMap = new Map(graphData.nodes.map((n) => [n.iata, n]));
  const nodeIds = graphData.nodes.map((n) => n.iata);

  if (!nodeMap.has(origin))
    throw new Error(`404: Airport "${origin}" not found in network.`);
  if (!nodeMap.has(destination))
    throw new Error(`404: Airport "${destination}" not found in network.`);

  const activeNfz = nfzZones.filter((z) => z.active);
  const { masked, blockedEdges } = computeBlockedEdges(
    graphData.edges,
    graphData.nodes,
    activeNfz
  );
  const adj = buildAdjList(graphData.edges, masked);

  let path: string[];
  let steps: AlgorithmStep[];
  let nodesExplored: number;

  if (algo === "dijkstra") {
    const r = runDijkstra(nodeIds, adj, origin, destination, trackSteps);
    path = reconstructPath(r.prev, origin, destination);
    steps = r.steps;
    nodesExplored = r.settled;
  } else if (algo === "astar") {
    const r = runAStar(nodeIds, adj, origin, destination, nodeMap, trackSteps);
    path = reconstructPath(r.prev, origin, destination);
    steps = r.steps;
    nodesExplored = r.settled;
  } else {
    const r = runBidirectional(nodeIds, adj, origin, destination, trackSteps);
    path = r.path;
    steps = r.steps;
    nodesExplored = r.settled;
  }

  if (path.length === 0) {
    throw new Error(
      `422: No route found from ${origin} to ${destination}. All paths may be blocked.`
    );
  }

  // Build edges_used + compute total distance
  const edgesUsed: GraphEdge[] = [];
  let totalDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i], to = path[i + 1];
    const edge = graphData.edges.find(
      (e) =>
        (e.from === from && e.to === to) || (e.from === to && e.to === from)
    );
    if (edge) {
      edgesUsed.push({ from, to, weight: edge.weight });
      totalDist += edge.weight;
    }
  }

  const isRecalculated = activeNfz.length > 0 && blockedEdges.length > 0;

  return {
    path,
    total_distance: Math.round(totalDist * 100) / 100,
    edges_used: edgesUsed,
    blocked_edges: blockedEdges,
    recalculated: isRecalculated,
    steps,
    nodesExplored,
    timeMs: Math.round((performance.now() - t0) * 100) / 100,
    algo,
  };
}
