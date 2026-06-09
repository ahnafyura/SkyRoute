# 02_BACKEND_SPEC.md — SkyRoute Analytics: Spesifikasi Backend

> **Status:** Kontrak Teknis v1.0 — Binding antara Padil (backend) dan Ahnaf (frontend).
> **Terakhir diperbarui:** 2026-06-09
> **Penanggung jawab implementasi:** Algorithm Engineer + API (Padil)

---

## 1. Konfigurasi Dasar FastAPI

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SkyRoute Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

Base URL produksi: `https://skyroute-api.onrender.com` (atau Railway, tergantung DevOps)
Base URL dev: `http://localhost:8000`

---

## 2. Spesifikasi Endpoint

### 2.1 GET /airports

**Deskripsi:** Mengembalikan daftar semua node bandara.

| Field | Detail |
|-------|--------|
| Method | `GET` |
| Path | `/airports` |
| Query params | `region` (opsional, string) — filter negara/region |
| Auth | Tidak ada |

**Response 200 OK:**
```json
{
  "count": 143,
  "airports": [
    { "iata": "CGK", "name": "Soekarno-Hatta International Airport", "lat": -6.1256, "lon": 106.6558 },
    { "iata": "SUB", "name": "Juanda International Airport",         "lat": -7.3798, "lon": 112.7870 }
  ]
}
```

**Response error tidak ada:**
Endpoint ini tidak gagal kecuali server down (500).

---

### 2.2 GET /graph

**Deskripsi:** Mengembalikan seluruh graf (nodes + edges) dalam skema yang
identik dengan `graph.json` lokal frontend.

| Field | Detail |
|-------|--------|
| Method | `GET` |
| Path | `/graph` |
| Query params | Tidak ada |

**Response 200 OK:**
```json
{
  "nodes": [
    { "iata": "CGK", "name": "Soekarno-Hatta International Airport", "lat": -6.1256, "lon": 106.6558 }
  ],
  "edges": [
    { "from": "CGK", "to": "SUB", "weight": 664.83 }
  ]
}
```

---

### 2.3 GET /nfz

**Deskripsi:** Mengembalikan seluruh zona NFZ (termasuk yang tidak aktif).

| Field | Detail |
|-------|--------|
| Method | `GET` |
| Path | `/nfz` |
| Query params | `active_only` (opsional, bool, default `false`) |

**Response 200 OK:** Skema identik dengan `nfz.json` (lihat `01_DATA_PIPELINE.md §5`).

```json
{
  "nfz_zones": [
    {
      "id": "nfz-java-sea",
      "name": "Latihan Militer Laut Jawa",
      "type": "polygon",
      "active": true,
      "geometry": {
        "type": "Polygon",
        "coordinates": [[ [108.0,-4.5],[112.0,-4.5],[112.0,-6.0],[108.0,-6.0],[108.0,-4.5] ]]
      }
    }
  ]
}
```

---

### 2.4 POST /nfz

**Deskripsi:** Toggle status aktif/nonaktif sebuah zona NFZ berdasarkan ID.
Frontend memanggil ini saat pengguna menekan tombol aktivasi NFZ.

| Field | Detail |
|-------|--------|
| Method | `POST` |
| Path | `/nfz` |
| Body | JSON |

**Request Body:**
```json
{
  "id": "nfz-java-sea",
  "active": true
}
```

**Response 200 OK:**
```json
{
  "id": "nfz-java-sea",
  "active": true,
  "message": "NFZ nfz-java-sea diaktifkan."
}
```

**Response 404 Not Found:**
```json
{
  "detail": "NFZ dengan id 'nfz-unknown' tidak ditemukan."
}
```

---

### 2.5 POST /route — Endpoint Utama

**Deskripsi:** Menghitung rute terpendek antara dua bandara menggunakan algoritma
yang dipilih. Jika NFZ aktif, edge yang menembus NFZ di-mask (bobot ∞) sebelum
algoritma dijalankan.

| Field | Detail |
|-------|--------|
| Method | `POST` |
| Path | `/route` |
| Body | JSON |

**Request Body:**
```json
{
  "origin":      "string (IATA 3 karakter)",
  "destination": "string (IATA 3 karakter)",
  "algo":        "dijkstra | astar"
}
```

**Response 200 OK (sukses):**
```json
{
  "path":           ["CGK", "SUB", "DPS"],
  "total_distance": 839.24,
  "edges_used": [
    { "from": "CGK", "to": "SUB", "weight": 664.83 },
    { "from": "SUB", "to": "DPS", "weight": 174.41 }
  ],
  "blocked_edges": [
    { "from": "CGK", "to": "DPS", "weight": null, "reason": "intersects nfz-java-sea" }
  ],
  "recalculated": true
}
```

> `recalculated: true` berarti ada edge yang di-block sehingga path berbeda dari
> kondisi tanpa NFZ. `recalculated: false` jika tidak ada edge yang di-block.

**Response Error:**

| Kondisi | Status | Body |
|---------|--------|------|
| `origin == destination` | 400 | `{"detail": "Origin dan destination tidak boleh sama."}` |
| IATA tidak ada di graf | 404 | `{"detail": "Bandara 'XYZ' tidak ditemukan dalam graf."}` |
| Tidak ada path (disconnected) | 422 | `{"detail": "Tidak ada jalur yang tersedia antara CGK dan KNO."}` |
| Semua rute terblokir NFZ | 422 | `{"detail": "Semua jalur antara CGK dan DPS terblokir oleh NFZ aktif."}` |
| `algo` tidak valid | 422 | Pydantic auto-validate |

---

### 2.6 GET /live (Opsional)

**Deskripsi:** Proxy ke OpenSky Network API untuk data posisi pesawat real-time.
Fitur opsional — tidak masuk MVP.

| Field | Detail |
|-------|--------|
| Method | `GET` |
| Path | `/live` |
| Query params | `bbox` (string, format: `lat_min,lon_min,lat_max,lon_max`) |

**Response 200 OK:**
```json
{
  "states": [
    {
      "icao24": "8a1234",
      "callsign": "GIA405",
      "lat": -6.2,
      "lon": 106.8,
      "altitude": 11000,
      "velocity": 245
    }
  ]
}
```

---

## 3. Algoritma Routing

### 3.1 Pseudocode Dijkstra

```
DIJKSTRA(graf G, origin s, destination t):
  dist[v] ← ∞  untuk semua v ∈ V(G)
  dist[s] ← 0
  prev[v] ← None untuk semua v ∈ V(G)
  Q ← priority_queue()
  Q.push( (0, s) )

  WHILE Q tidak kosong:
    (d, u) ← Q.pop_min()

    IF d > dist[u]: CONTINUE  // node sudah diproses

    IF u == t: BREAK           // tujuan tercapai

    FOR setiap tetangga v dari u dengan bobot w(u,v):
      alt ← dist[u] + w(u, v)
      IF alt < dist[v]:
        dist[v] ← alt
        prev[v] ← u
        Q.push( (alt, v) )

  RETURN rekonstruksi_path(prev, s, t), dist[t]
```

**Kompleksitas Waktu Dijkstra:**
- Dengan binary heap (Python `heapq`): **O((V + E) log V)**
- V = jumlah node, E = jumlah edge
- Untuk dataset kita (V≈150, E≈800): sangat cepat, <1ms

### 3.2 Pseudocode A*

```
ASTAR(graf G, origin s, destination t, h = haversine_ke_tujuan):
  g[v] ← ∞  untuk semua v ∈ V(G)
  g[s] ← 0
  f[s] ← h(s, t)
  prev[v] ← None
  Q ← priority_queue()
  Q.push( (f[s], s) )
  closed ← set()

  WHILE Q tidak kosong:
    (f_val, u) ← Q.pop_min()

    IF u ∈ closed: CONTINUE
    closed.add(u)

    IF u == t: BREAK

    FOR setiap tetangga v dari u dengan bobot w(u,v):
      IF v ∈ closed: CONTINUE
      g_tentative ← g[u] + w(u, v)
      IF g_tentative < g[v]:
        g[v] ← g_tentative
        prev[v] ← u
        f[v] ← g[v] + h(v, t)
        Q.push( (f[v], v) )

  RETURN rekonstruksi_path(prev, s, t), g[t]
```

**Heuristik A* dan Sifat Admissible:**

Heuristik `h(v, t) = haversine(lat_v, lon_v, lat_t, lon_t)` adalah **jarak
udara langsung** dari node v ke tujuan t.

Heuristik ini **admissible** karena:
> h(v, t) ≤ jarak rute sesungguhnya dari v ke t

Jarak udara langsung (great-circle) adalah batas bawah mutlak dari setiap jalur
melalui jaringan edge. Tidak ada edge yang lebih pendek dari garis lurus di
permukaan bumi (bobot edge kita adalah haversine itu sendiri). Oleh karena itu,
A* dengan heuristik ini **dijamin menemukan jalur optimal**.

Selain itu, heuristik juga **consistent (monotone)**:
> h(u, t) ≤ w(u, v) + h(v, t)   (triangle inequality pada jarak great-circle)

Sehingga A* tidak perlu me-reopen node, persis seperti Dijkstra namun dengan
ekspansi node lebih terarah (lebih sedikit node diproses).

**Kompleksitas Waktu A*:**
- Kasus terbaik (heuristik sempurna): **O(E)** — hanya node di jalur optimal
- Kasus terburuk (heuristik = 0, degenerasi ke Dijkstra): **O((V + E) log V)**
- Pada praktiknya, A* 2–5x lebih cepat dari Dijkstra untuk graf geospasial

---

## 4. Logika Edge-Masking NFZ

### 4.1 Alur Kerja

```
POST /route dipanggil
        │
        ▼
1. Load graph.json → bangun adjacency list
        │
        ▼
2. Load nfz.json → filter zona dengan active=true
        │
        ▼
3. Untuk setiap edge (u, v):
   Bangun LineString( (lat_u, lon_u), (lat_v, lon_v) )
   Untuk setiap polygon NFZ aktif:
     IF LineString.intersects(Polygon):
       w(u,v) ← ∞  (edge di-mask)
       catat ke blocked_edges
        │
        ▼
4. Jalankan Dijkstra/A* di atas graf termodifikasi
        │
        ▼
5. Jika path ditemukan: return sukses
   Jika tidak ada path: return 422
```

### 4.2 Deteksi Interseksi Segmen-Poligon (Shapely)

```python
from shapely.geometry import LineString, Polygon, Point
from shapely.ops import transform

def edge_intersects_nfz(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
    nfz_zone: dict
) -> bool:
    # Shapely pakai (x=lon, y=lat) — sesuai GeoJSON
    segment = LineString([(lon1, lat1), (lon2, lat2)])

    if nfz_zone["type"] == "polygon":
        coords = nfz_zone["geometry"]["coordinates"][0]
        polygon = Polygon(coords)
        return segment.intersects(polygon)

    elif nfz_zone["type"] == "circle":
        center_lon, center_lat = nfz_zone["geometry"]["coordinates"]
        radius_km = nfz_zone["geometry"]["radius_km"]
        # Aproksimasi lingkaran sebagai poligon 64-sisi
        center = Point(center_lon, center_lat)
        # Konversi radius km → derajat (aproksimasi): 1° ≈ 111 km
        radius_deg = radius_km / 111.0
        circle_polygon = center.buffer(radius_deg, resolution=64)
        return segment.intersects(circle_polygon)

    return False
```

> **Catatan presisi**: Konversi km→derajat hanya aproksimasi valid di lintang
> rendah (dekat ekuator). Untuk produksi, gunakan proyeksi UTM via `pyproj`.
> Untuk demo akademis, aproksimasi ini cukup.

### 4.3 Membangun Graf Termodifikasi

```python
import math
import networkx as nx

def build_masked_graph(graph_data: dict, active_nfz_zones: list) -> nx.Graph:
    G = nx.Graph()

    for node in graph_data["nodes"]:
        G.add_node(node["iata"], lat=node["lat"], lon=node["lon"], name=node["name"])

    blocked = []
    for edge in graph_data["edges"]:
        src, dst, w = edge["from"], edge["to"], edge["weight"]
        lat1 = G.nodes[src]["lat"]; lon1 = G.nodes[src]["lon"]
        lat2 = G.nodes[dst]["lat"]; lon2 = G.nodes[dst]["lon"]

        blocked_by = None
        for zone in active_nfz_zones:
            if edge_intersects_nfz(lat1, lon1, lat2, lon2, zone):
                blocked_by = zone["id"]
                break

        if blocked_by:
            blocked.append({"from": src, "to": dst, "weight": None, "reason": f"intersects {blocked_by}"})
            # Tidak tambahkan edge ke graf (bobot ∞ = tidak ada edge)
        else:
            G.add_edge(src, dst, weight=w)

    return G, blocked
```

---

## 5. Penanganan Edge Case Eksplisit

| Kondisi | Deteksi | Response |
|---------|---------|----------|
| `origin == destination` | Sebelum masuk algoritma: `if origin == destination` | HTTP 400: `"Origin dan destination tidak boleh sama."` |
| IATA tidak ada di graf | `if origin not in G.nodes or destination not in G.nodes` | HTTP 404: `"Bandara 'XYZ' tidak ditemukan dalam graf."` |
| Tidak ada path (disconnected) | `nx.has_path(G, origin, destination)` atau catch `NetworkXNoPath` | HTTP 422: `"Tidak ada jalur tersedia antara X dan Y."` |
| Semua rute terblokir NFZ | Sama seperti disconnected, tapi `blocked_edges` tidak kosong | HTTP 422: `"Semua jalur antara X dan Y terblokir oleh NFZ aktif."` — dibedakan dari disconnected dengan memeriksa `len(blocked_edges) > 0` |
| `algo` bukan `"dijkstra"` atau `"astar"` | Pydantic `Literal["dijkstra", "astar"]` | HTTP 422: Pydantic validation error otomatis |
| Graf kosong / file tidak ada | Startup check di `lifespan` FastAPI | HTTP 500: `"Internal server error: graph data not loaded."` |

---

## 6. Pydantic v2 Models

```python
# backend/app/schemas/models.py
from pydantic import BaseModel, field_validator
from typing import Literal, Optional
from enum import Enum

class RouteRequest(BaseModel):
    origin:      str
    destination: str
    algo:        Literal["dijkstra", "astar"]

    @field_validator("origin", "destination")
    @classmethod
    def validate_iata(cls, v: str) -> str:
        if len(v) != 3 or not v.isalpha():
            raise ValueError("IATA harus tepat 3 huruf alfabet.")
        return v.upper()

class EdgeResult(BaseModel):
    from_:   str  # alias "from" (reserved keyword)
    to:      str
    weight:  Optional[float]
    reason:  Optional[str] = None

    model_config = {"populate_by_name": True}

class RouteResponse(BaseModel):
    path:           list[str]
    total_distance: float
    edges_used:     list[dict]
    blocked_edges:  list[dict]
    recalculated:   bool

class NfzToggleRequest(BaseModel):
    id:     str
    active: bool
```

---

## 7. Library yang Dipakai

| Library | Versi Min | Fungsi |
|---------|-----------|--------|
| `fastapi` | 0.111 | Framework API |
| `uvicorn[standard]` | 0.30 | ASGI server |
| `pydantic` | 2.7 | Validasi request/response |
| `networkx` | 3.3 | Struktur data graf, fallback BFS/DFS |
| `shapely` | 2.0 | Geometri 2D: interseksi edge-NFZ |
| `httpx` | 0.27 | HTTP client untuk proxy OpenSky (opsional) |
| `pytest` | 8.0 | Unit testing |

---

## 8. Pertanyaan Terbuka

1. **State NFZ di server**: Apakah status `active` NFZ disimpan di memori
   proses (in-memory dict) atau file `nfz.json` yang ditulis ulang? In-memory
   lebih cepat tapi reset saat server restart. Rekomendasi: in-memory untuk MVP.

2. **Concurrent requests**: Jika beberapa pengguna mengubah NFZ bersamaan,
   apakah ada race condition? Untuk demo 1-pengguna, ini tidak masalah.

3. **Response `"from"` field**: Karena `from` adalah reserved keyword Python,
   backend menggunakan alias. Pastikan response JSON tetap mengirim `"from"`,
   bukan `"from_"`. Konfigurasi `model_config` Pydantic v2.
