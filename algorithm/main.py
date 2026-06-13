from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import math
import heapq
import time
import pandas as pd
import json
import os
from typing import Optional
from shapely.geometry import LineString, Polygon
from shapely.strtree import STRtree

# ─────────────────────────────────────────
# KONSTANTA BOEING 737-800
# ─────────────────────────────────────────
MAX_RANGE_KM  = 5765
SAFE_RANGE_KM = MAX_RANGE_KM * 0.80

app = FastAPI(title="SkyRoute Algorithm API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
airports_map: dict = {}
nfz_raw_data: list = []
unrestricted_graph: dict = {}
safe_graph: dict = {}


# ─────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────
class RouteRequest(BaseModel):
    origin: str
    destination: str
    algorithm: str = "astar"   # "dijkstra" | "astar" | "bidir"


class NFZToggleRequest(BaseModel):
    id: str


# ─────────────────────────────────────────
# DATA LOADING
# ─────────────────────────────────────────
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def load_airports_from_csv(csv_path: str) -> dict:
    df = pd.read_csv(csv_path, low_memory=False)
    df = df[
        (df["iata_code"].notna()) & (df["iata_code"] != "") &
        (df["type"].isin(["large_airport", "medium_airport"])) &
        (df["latitude_deg"].notna()) & (df["longitude_deg"].notna())
    ]
    airports: dict = {}
    for _, row in df.iterrows():
        iata = str(row["iata_code"]).strip()
        airports[iata] = {
            "iata":      iata,
            "name":      row.get("name", ""),
            "latitude":  float(row["latitude_deg"]),
            "longitude": float(row["longitude_deg"]),
            "type":      row.get("type", ""),
            "country":   row.get("iso_country", ""),
        }
    return airports


def extract_active_nfz_polygons(raw_data: list) -> list:
    nfz_polygons = []
    for zona in raw_data:
        if zona.get("active") is True:
            coords = [(pt[1], pt[0]) for pt in zona.get("polygon", [])]
            if len(coords) >= 3:
                nfz_polygons.append({
                    "id": zona.get("id"),
                    "name": zona.get("name"),
                    "polygon": Polygon(coords),
                })
    return nfz_polygons


def build_nfz_spatial_index(nfz_list: list):
    if not nfz_list:
        return None, []
    geometries = [nfz["polygon"] for nfz in nfz_list]
    tree = STRtree(geometries)
    return tree, geometries


def is_route_safe(lat1, lon1, lat2, lon2, tree: Optional[STRtree], geometries: list) -> bool:
    if tree is None or not geometries:
        return True
    route_line = LineString([(lon1, lat1), (lon2, lat2)])
    candidate_indices = tree.query(route_line)
    if len(candidate_indices) == 0:
        return True
    for idx in candidate_indices:
        if route_line.intersects(geometries[idx]):
            return False
    return True


def build_graph(ap_map: dict, nfz_list: list, safe_range_km: float = SAFE_RANGE_KM) -> dict:
    graph: dict = {iata: [] for iata in ap_map}
    airport_list = list(ap_map.values())
    tree, geometries = build_nfz_spatial_index(nfz_list)

    for i, a in enumerate(airport_list):
        for j in range(i + 1, len(airport_list)):
            b = airport_list[j]
            dist = haversine(a["latitude"], a["longitude"], b["latitude"], b["longitude"])
            if dist <= safe_range_km:
                if is_route_safe(a["latitude"], a["longitude"], b["latitude"], b["longitude"], tree, geometries):
                    graph[a["iata"]].append((b["iata"], dist))
                    graph[b["iata"]].append((a["iata"], dist))
    return graph


# ─────────────────────────────────────────
# PATH RECONSTRUCTION HELPER
# ─────────────────────────────────────────
def _build_result(path: list[str], ap_map: dict) -> dict:
    legs = []
    for i in range(len(path) - 1):
        src = ap_map[path[i]]
        dst = ap_map[path[i + 1]]
        dist = haversine(src["latitude"], src["longitude"], dst["latitude"], dst["longitude"])
        legs.append({
            "from":         path[i],
            "from_name":    src["name"],
            "from_country": src["country"],
            "to":           path[i + 1],
            "to_name":      dst["name"],
            "to_country":   dst["country"],
            "distance_km":  round(dist, 2),
        })
    return {
        "path":           path,
        "total_distance": round(sum(l["distance_km"] for l in legs), 2),
        "hops":           len(path) - 1,
        "transits":       len(path) - 2,
        "legs":           legs,
    }


def _reconstruct(came_from: dict, start: str, goal: str, ap_map: dict) -> Optional[dict]:
    if goal not in came_from and start != goal:
        return None
    node = goal
    path: list[str] = []
    while node in came_from:
        path.append(node)
        node = came_from[node]
    path.append(start)
    path.reverse()
    return _build_result(path, ap_map)


# ─────────────────────────────────────────
# ALGORITHMS
# ─────────────────────────────────────────
def dijkstra(graph: dict, ap_map: dict, start: str, goal: str) -> tuple[Optional[dict], int]:
    dist: dict = {start: 0.0}
    came_from: dict = {}
    heap = [(0.0, start)]
    visited: set = set()

    while heap:
        d, u = heapq.heappop(heap)
        if u in visited:
            continue
        visited.add(u)
        if u == goal:
            break
        for v, w in graph.get(u, []):
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                came_from[v] = u
                heapq.heappush(heap, (nd, v))

    if goal not in visited:
        return None, len(visited)
    return _reconstruct(came_from, start, goal, ap_map), len(visited)


def astar(graph: dict, ap_map: dict, start: str, goal: str) -> tuple[Optional[dict], int]:
    if start not in ap_map or goal not in ap_map:
        return None, 0

    def h(node: str) -> float:
        a = ap_map[node]
        g = ap_map[goal]
        return haversine(a["latitude"], a["longitude"], g["latitude"], g["longitude"])

    g_score: dict = {start: 0.0}
    came_from: dict = {}
    heap = [(h(start), 0.0, start)]
    visited: set = set()

    while heap:
        _, g, current = heapq.heappop(heap)
        if current in visited:
            continue
        visited.add(current)
        if current == goal:
            return _reconstruct(came_from, start, goal, ap_map), len(visited)
        for neighbor, w in graph.get(current, []):
            if neighbor in visited:
                continue
            tg = g_score[current] + w
            if tg < g_score.get(neighbor, float("inf")):
                came_from[neighbor] = current
                g_score[neighbor] = tg
                heapq.heappush(heap, (tg + h(neighbor), tg, neighbor))

    return None, len(visited)


def bidir_dijkstra(graph: dict, ap_map: dict, start: str, goal: str) -> tuple[Optional[dict], int]:
    # Since graph is undirected, reverse graph == forward graph
    dist_f: dict = {start: 0.0}
    prev_f: dict = {}
    heap_f = [(0.0, start)]
    settled_f: set = set()

    dist_b: dict = {goal: 0.0}
    prev_b: dict = {}
    heap_b = [(0.0, goal)]
    settled_b: set = set()

    mu = float("inf")
    meeting: Optional[str] = None
    explored = 0

    while heap_f or heap_b:
        # Forward step
        if heap_f:
            df, uf = heapq.heappop(heap_f)
            if uf not in settled_f:
                settled_f.add(uf)
                explored += 1
                for v, w in graph.get(uf, []):
                    nd = df + w
                    if nd < dist_f.get(v, float("inf")):
                        dist_f[v] = nd
                        prev_f[v] = uf
                        heapq.heappush(heap_f, (nd, v))
                    if v in settled_b:
                        candidate = dist_f.get(v, float("inf")) + dist_b.get(v, float("inf"))
                        if candidate < mu:
                            mu = candidate
                            meeting = v

        # Backward step
        if heap_b:
            db, ub = heapq.heappop(heap_b)
            if ub not in settled_b:
                settled_b.add(ub)
                explored += 1
                for v, w in graph.get(ub, []):
                    nd = db + w
                    if nd < dist_b.get(v, float("inf")):
                        dist_b[v] = nd
                        prev_b[v] = ub
                        heapq.heappush(heap_b, (nd, v))
                    if v in settled_f:
                        candidate = dist_f.get(v, float("inf")) + dist_b.get(v, float("inf"))
                        if candidate < mu:
                            mu = candidate
                            meeting = v

        # Termination condition
        min_f = heap_f[0][0] if heap_f else float("inf")
        min_b = heap_b[0][0] if heap_b else float("inf")
        if min_f + min_b >= mu:
            break

    if meeting is None or mu == float("inf"):
        return None, explored

    # Reconstruct forward path: start → meeting
    path_f: list[str] = []
    node = meeting
    while node in prev_f:
        path_f.append(node)
        node = prev_f[node]
    path_f.append(start)
    path_f.reverse()

    # Reconstruct backward path: meeting → goal
    path_b: list[str] = []
    node = meeting
    while node in prev_b:
        node = prev_b[node]
        path_b.append(node)

    full_path = path_f + path_b
    return _build_result(full_path, ap_map), explored


# ─────────────────────────────────────────
# FASTAPI STARTUP
# ─────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    global airports_map, nfz_raw_data, unrestricted_graph, safe_graph

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    csv_path  = os.path.join(BASE_DIR, "data", "airports.csv")
    json_path = os.path.join(BASE_DIR, "data", "nfz.json")

    if os.path.exists(csv_path):
        airports_map = load_airports_from_csv(csv_path)
        print(f"[Startup] Loaded {len(airports_map)} airports from CSV")
    else:
        print(f"[ERROR] File CSV tidak ditemukan: {csv_path}")

    if os.path.exists(json_path):
        with open(json_path, "r") as f:
            nfz_raw_data = json.load(f)
        print(f"[Startup] Loaded {len(nfz_raw_data)} NFZ zones")
    else:
        print(f"[ERROR] File JSON tidak ditemukan: {json_path}")

    print("[Startup] Building unrestricted graph...")
    unrestricted_graph = build_graph(airports_map, [])

    print("[Startup] Building safe graph (NFZ-aware)...")
    active_polys = extract_active_nfz_polygons(nfz_raw_data)
    safe_graph = build_graph(airports_map, active_polys)
    print("[Startup] Ready.")


# ─────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────
@app.get("/")
def health_check():
    return {"status": "ok", "airports": len(airports_map)}


@app.get("/api/airports")
def get_airports():
    return [
        {"iata": v["iata"], "name": v["name"], "lat": v["latitude"], "lon": v["longitude"]}
        for v in airports_map.values()
    ]


@app.get("/api/graph")
def get_graph_endpoint():
    return safe_graph


@app.get("/api/nfz")
def get_nfz(active_only: bool = Query(False)):
    if active_only:
        return [z for z in nfz_raw_data if z.get("active")]
    return nfz_raw_data


@app.post("/api/nfz")
def toggle_nfz(req: NFZToggleRequest):
    global safe_graph

    found = False
    for z in nfz_raw_data:
        if z.get("id") == req.id:
            z["active"] = not z.get("active", False)
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="NFZ ID tidak ditemukan")

    active_polys = extract_active_nfz_polygons(nfz_raw_data)
    safe_graph = build_graph(airports_map, active_polys)

    return {"message": "Toggled successfully", "id": req.id}


@app.post("/api/route")
def calculate_route(req: RouteRequest):
    t0 = time.perf_counter()
    orig = req.origin.upper()
    dest = req.destination.upper()

    if orig == dest:
        raise HTTPException(status_code=400, detail="Origin dan destination tidak boleh sama")
    if orig not in airports_map or dest not in airports_map:
        raise HTTPException(status_code=404, detail=f"IATA code tidak ditemukan: {orig} / {dest}")

    algo = req.algorithm.lower()
    if algo == "dijkstra":
        path_safe, explored = dijkstra(safe_graph, airports_map, orig, dest)
    elif algo == "bidir":
        path_safe, explored = bidir_dijkstra(safe_graph, airports_map, orig, dest)
    else:
        path_safe, explored = astar(safe_graph, airports_map, orig, dest)
        algo = "astar"

    if not path_safe:
        raise HTTPException(status_code=422, detail="Tidak ada rute tersedia (terhalang NFZ / jarak melebihi range)")

    # Detect recalculated by comparing with unrestricted graph
    path_unrestricted, _ = astar(unrestricted_graph, airports_map, orig, dest)
    is_recalculated = bool(
        path_unrestricted and path_safe["path"] != path_unrestricted["path"]
    )

    time_ms = int((time.perf_counter() - t0) * 1000)

    return {
        "path":           path_safe["path"],
        "total_distance": path_safe["total_distance"],
        "edges_used": [
            {"from": leg["from"], "to": leg["to"], "weight": leg["distance_km"]}
            for leg in path_safe["legs"]
        ],
        "blocked_edges":  [],
        "recalculated":   is_recalculated,
        "nodesExplored":  explored,
        "timeMs":         time_ms,
        "algo":           algo,
        "steps":          [],
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
