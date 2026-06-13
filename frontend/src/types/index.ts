// src/types/index.ts — SkyRoute Analytics TypeScript Interfaces
// Derived from 03_FRONTEND_SPEC.md Section 4

export interface AirportNode {
  iata: string;
  name: string;
  lat:  number;
  lon:  number;
}

export interface GraphEdge {
  from:   string;
  to:     string;
  weight: number;
}

export interface GraphData {
  nodes: AirportNode[];
  edges: GraphEdge[];
}

export interface NfzGeometryPolygon {
  type:        "Polygon";
  coordinates: [number, number][][];
}

export interface NfzGeometryCircle {
  type:        "Point";
  coordinates: [number, number];
  radius_km:   number;
}

export interface NfzZone {
  id:       string;
  name:     string;
  type:     "polygon" | "circle";
  active:   boolean;
  geometry: NfzGeometryPolygon | NfzGeometryCircle;
}

export interface BlockedEdge {
  from:   string;
  to:     string;
  weight: null;
  reason: string;
}

export interface RouteResponse {
  path:           string[];
  total_distance: number;
  edges_used:     GraphEdge[];
  blocked_edges:  BlockedEdge[];
  recalculated:   boolean;
}

export interface RouteRequest {
  origin:      string;
  destination: string;
  algo:        "dijkstra" | "astar";
}
