import requests
import math
import heapq
from typing import Optional

# ─────────────────────────────────────────
# 1. HAVERSINE DISTANCE (km)
# ─────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371  # radius bumi (km)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


# ─────────────────────────────────────────
# 2. FETCH BANDARA
# ─────────────────────────────────────────
def fetch_airport(iata_code: str) -> Optional[dict]:
    url = f"https://airportsapi.com/api/airports/{iata_code.upper()}"
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
        attr = res.json()["data"]["attributes"]
        return {
            "iata":      attr.get("iata_code"),
            "icao":      attr.get("icao_code"),
            "name":      attr.get("name"),
            "latitude":  attr.get("latitude"),
            "longitude": attr.get("longitude"),
            "elevation": attr.get("elevation"),
        }
    except Exception as e:
        print(f"[ERROR] Gagal fetch {iata_code}: {e}")
        return None


# ─────────────────────────────────────────
# 3. BUILD GRAPH
#    Node  : IATA code
#    Edge  : semua pasangan bandara dalam radius max_range_km
# ─────────────────────────────────────────
def build_graph(airports: list[dict], max_range_km: float = 5000.0) -> dict:
    """
    Kembalikan adjacency list:
    {
        "CGK": [("SUB", 700.2), ("DPS", 940.1), ...],
        ...
    }
    """
    graph = {ap["iata"]: [] for ap in airports}

    for i, a in enumerate(airports):
        for j, b in enumerate(airports):
            if i == j:
                continue
            dist = haversine(a["latitude"], a["longitude"],
                             b["latitude"], b["longitude"])
            if dist <= max_range_km:
                graph[a["iata"]].append((b["iata"], dist))

    return graph


# ─────────────────────────────────────────
# 4. A* PATHFINDING
# ─────────────────────────────────────────
def astar(graph: dict, airports_map: dict, start: str, goal: str) -> Optional[dict]:
    """
    airports_map : { "CGK": {"latitude": ..., "longitude": ...}, ... }
    Kembalikan dict result atau None jika tidak ada rute.
    """
    def heuristic(node: str) -> float:
        a = airports_map[node]
        g = airports_map[goal]
        return haversine(a["latitude"], a["longitude"],
                         g["latitude"], g["longitude"])

    # Priority queue: (f_score, node)
    open_set = [(heuristic(start), start)]
    came_from = {}
    g_score = {start: 0.0}

    while open_set:
        _, current = heapq.heappop(open_set)

        if current == goal:
            # Rekonstruksi path
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            path.reverse()

            total_dist = g_score[goal]
            return {
                "path":           path,
                "total_distance": round(total_dist, 2),
                "hops":           len(path) - 1,
                "legs": [
                    {
                        "from": path[i],
                        "to":   path[i+1],
                        "distance_km": round(
                            haversine(
                                airports_map[path[i]]["latitude"],
                                airports_map[path[i]]["longitude"],
                                airports_map[path[i+1]]["latitude"],
                                airports_map[path[i+1]]["longitude"],
                            ), 2
                        )
                    }
                    for i in range(len(path) - 1)
                ]
            }

        for neighbor, dist in graph.get(current, []):
            tentative_g = g_score[current] + dist
            if tentative_g < g_score.get(neighbor, float("inf")):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f = tentative_g + heuristic(neighbor)
                heapq.heappush(open_set, (f, neighbor))

    return None  # tidak ada rute


# ─────────────────────────────────────────
# 5. MAIN — DEMO
# ─────────────────────────────────────────
if __name__ == "__main__":
    # Bandara Indonesia yang jadi node graph
    INDONESIA_AIRPORTS = ["CGK", "SUB", "DPS", "UPG", "MDC", "BPN",
                          "PLM", "PDG", "BTH", "SRG", "JOG", "MLG"]

    print("Fetching airport data...")
    airports = []
    for iata in INDONESIA_AIRPORTS:
        ap = fetch_airport(iata)
        if ap and ap["latitude"] and ap["longitude"]:
            airports.append(ap)
            print(f"  ✓ {iata} — {ap['name']}")

    airports_map = {ap["iata"]: ap for ap in airports}

    print("\nBuilding graph...")
    graph = build_graph(airports, max_range_km=5000.0)
    for node, edges in graph.items():
        print(f"  {node} → {len(edges)} koneksi")

    print("\n── Cari Rute ──")
    FROM, TO = "CGK", "UPG"
    result = astar(graph, airports_map, FROM, TO)

    if result:
        print(f"\nRute {FROM} → {TO}")
        print(f"Path     : {' → '.join(result['path'])}")
        print(f"Jarak    : {result['total_distance']} km")
        print(f"Hops     : {result['hops']}")
        print("\nDetail legs:")
        for leg in result["legs"]:
            print(f"  {leg['from']} → {leg['to']} : {leg['distance_km']} km")
    else:
        print(f"Tidak ada rute dari {FROM} ke {TO}")