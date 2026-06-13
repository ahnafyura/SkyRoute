from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import uvicorn
import math
import heapq
import pandas as pd
import json
import os
from typing import Optional
from shapely.geometry import LineString, Polygon
from shapely.strtree import STRtree

# ─────────────────────────────────────────
# KONSTANTA BOEING 737-800
# ─────────────────────────────────────────
MAX_RANGE_KM   = 5765   
SAFE_RANGE_KM  = MAX_RANGE_KM * 0.80   

app = FastAPI(title="Flight Routing API")

# Global state
airports_map = {}
nfz_raw_data = []
unrestricted_graph = {}
safe_graph = {}

# Pydantic Models
class RouteRequest(BaseModel):
    origin: str
    destination: str

class NFZToggleRequest(BaseModel):
    id: str

# ─────────────────────────────────────────
# FUNGSI ALGORITMA & DATA
# ─────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat/2)**2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon/2)**2)
    return R * 2 * math.asin(math.sqrt(a))

def load_airports_from_csv(csv_path: str) -> dict:
    df = pd.read_csv(csv_path, low_memory=False)
    df = df[
        (df["iata_code"].notna()) & (df["iata_code"] != "") &
        (df["type"].isin(["large_airport", "medium_airport"])) &
        (df["latitude_deg"].notna()) & (df["longitude_deg"].notna())
    ]
    airports = {}
    for _, row in df.iterrows():
        iata = str(row["iata_code"]).strip()
        airports[iata] = {
            "iata":      iata,
            "name":      row.get("name", ""),
            "latitude":  float(row["latitude_deg"]),
            "longitude": float(row["longitude_deg"]),
            "type":      row.get("type", ""),
            "country":   row.get("iso_country", "")
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
                    "polygon": Polygon(coords)
                })
    return nfz_polygons

def build_nfz_spatial_index(nfz_list: list):
    if not nfz_list: return None, []
    geometries = [nfz["polygon"] for nfz in nfz_list]
    tree = STRtree(geometries)
    return tree, geometries

def is_route_safe_optimized(lat1, lon1, lat2, lon2, tree: Optional[STRtree], geometries: list) -> bool:
    if tree is None or not geometries: return True 
    route_line = LineString([(lon1, lat1), (lon2, lat2)])
    candidate_indices = tree.query(route_line)
    if len(candidate_indices) == 0: return True
    for idx in candidate_indices:
        if route_line.intersects(geometries[idx]): return False 
    return True

def build_graph(airports_map: dict, nfz_list: list, safe_range_km: float = SAFE_RANGE_KM) -> dict:
    graph = {iata: [] for iata in airports_map}
    airport_list = list(airports_map.values())
    tree, geometries = build_nfz_spatial_index(nfz_list)
    
    for i, a in enumerate(airport_list):
        for j in range(i + 1, len(airport_list)):  
            b = airport_list[j]
            dist = haversine(a["latitude"], a["longitude"], b["latitude"], b["longitude"])
            if dist <= safe_range_km:
                if is_route_safe_optimized(a["latitude"], a["longitude"], b["latitude"], b["longitude"], tree, geometries):
                    graph[a["iata"]].append((b["iata"], dist))
                    graph[b["iata"]].append((a["iata"], dist))
    return graph

def astar(graph: dict, airports_map: dict, start: str, goal: str) -> Optional[dict]:
    if start not in airports_map or goal not in airports_map: return None

    def heuristic(node: str) -> float:
        a, g = airports_map[node], airports_map[goal]
        return haversine(a["latitude"], a["longitude"], g["latitude"], g["longitude"])

    open_set  = [(heuristic(start), 0.0, start)]  
    came_from, g_score, visited = {}, {start: 0.0}, set()

    while open_set:
        f, g, current = heapq.heappop(open_set)
        if current in visited: continue
        visited.add(current)

        if current == goal:
            path, node = [], goal
            while node in came_from:
                path.append(node)
                node = came_from[node]
            path.append(start)
            path.reverse()

            legs = []
            for i in range(len(path) - 1):
                src, dst = airports_map[path[i]], airports_map[path[i+1]]
                dist = haversine(src["latitude"], src["longitude"], dst["latitude"], dst["longitude"])
                legs.append({
                    "from": path[i], "from_name": src["name"], "from_country": src["country"],
                    "to": path[i+1], "to_name": dst["name"], "to_country": dst["country"],
                    "distance_km": round(dist, 2),
                })
            return {
                "path": path, "total_distance": round(g_score[goal], 2),
                "hops": len(path) - 1, "transits": len(path) - 2, "legs": legs,
            }

        for neighbor, dist in graph.get(current, []):
            if neighbor in visited: continue
            tentative_g = g_score[current] + dist
            if tentative_g < g_score.get(neighbor, float("inf")):
                came_from[neighbor] = current
                g_score[neighbor]   = tentative_g
                heapq.heappush(open_set, (tentative_g + heuristic(neighbor), tentative_g, neighbor))
    return None

# ─────────────────────────────────────────
# FASTAPI LIFESPAN & ENDPOINTS
# ─────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    global airports_map, nfz_raw_data, unrestricted_graph, safe_graph
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    csv_path  = os.path.join(BASE_DIR, "data", "airports.csv")
    json_path = os.path.join(BASE_DIR, "data", "nfz.json")
    
    if os.path.exists(csv_path):
        airports_map = load_airports_from_csv(csv_path)
    else:
        print(f"\n[ERROR KRITIS] ❌ File CSV tidak ditemukan di: {csv_path}\n")
    
    if os.path.exists(json_path):
        with open(json_path, 'r') as f:
            nfz_raw_data = json.load(f)
    else:
        print(f"\n[ERROR KRITIS] ❌ File JSON tidak ditemukan di: {json_path}\n")
            
    print("[Startup] Membangun Unrestricted Graph...")
    unrestricted_graph = build_graph(airports_map, [])
    
    print("[Startup] Membangun Safe Graph...")
    active_polys = extract_active_nfz_polygons(nfz_raw_data)
    safe_graph = build_graph(airports_map, active_polys)

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.get("/airports")
def get_airports():
    return [
        {
            "iata": v["iata"],
            "name": v["name"],
            "lat": v["latitude"],
            "lon": v["longitude"]
        } for v in airports_map.values()
    ]

@app.get("/graph")
def get_graph():
    return safe_graph

@app.get("/nfz")
def get_nfz(active_only: bool = Query(False)):
    if active_only:
        return [z for z in nfz_raw_data if z.get("active")]
    return nfz_raw_data

@app.post("/nfz")
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

@app.post("/route")
def calculate_route(req: RouteRequest):
    orig, dest = req.origin.upper(), req.destination.upper()
    
    if orig == dest:
        raise HTTPException(status_code=400, detail="Origin dan destination tidak boleh sama")
    if orig not in airports_map or dest not in airports_map:
        raise HTTPException(status_code=404, detail="IATA code tidak ditemukan")
        
    path_safe = astar(safe_graph, airports_map, orig, dest)
    if not path_safe:
        raise HTTPException(status_code=422, detail="Tidak ada rute yang tersedia (terhalang NFZ / jarak)")
        
    path_unrestricted = astar(unrestricted_graph, airports_map, orig, dest)
    
    is_recalculated = False
    if path_unrestricted and path_safe["path"] != path_unrestricted["path"]:
        is_recalculated = True
        
    return {
        "origin": orig,
        "destination": dest,
        "recalculated": is_recalculated,
        "route": path_safe
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)