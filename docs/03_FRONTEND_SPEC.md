# 03_FRONTEND_SPEC.md — SkyRoute Analytics: Spesifikasi Frontend

> **Status:** Kontrak Teknis v1.0 — Binding antara Ahnaf (frontend) dan Padil (backend).
> **Terakhir diperbarui:** 2026-06-09
> **Penanggung jawab implementasi:** Frontend Developer (Ahnaf)

---

## 1. Stack Frontend

| Komponen | Teknologi | Versi Min |
|----------|-----------|-----------|
| Framework | Next.js (App Router) | 14.x |
| UI Library | React | 18.x |
| Styling | Tailwind CSS | 3.x |
| Peta | Leaflet via `react-leaflet` | 4.x |
| HTTP Client | `fetch` native / `axios` | — |
| Type System | TypeScript | 5.x |

---

## 2. Pohon Komponen

```
app/page.tsx  (Client Component, root orchestrator)
│
├── <MapView>                    ← Kontainer peta utama (Leaflet MapContainer)
│   ├── <AirportMarker>          ← Satu per node bandara
│   ├── <RouteLayer>             ← Polyline rute aktif yang ter-highlight
│   └── <NfzLayer>              ← Polygon/circle merah untuk zona NFZ
│
├── <ControlPanel>               ← Panel kiri/atas: input & kontrol
│   ├── <AirportSelector>        ← Dropdown origin & destination
│   ├── <AlgoSelector>           ← Toggle Dijkstra | A*
│   └── <NfzToggle>             ← Daftar NFZ dengan toggle aktif/nonaktif
│
└── <ResultPanel>                ← Panel kanan/bawah: hasil kalkulasi
    ├── <PathDisplay>            ← Daftar IATA sepanjang rute
    ├── <DistanceInfo>           ← Total jarak & edge count
    ├── <BlockedEdgesInfo>       ← Daftar edge yang di-block NFZ
    └── <RecalcBadge>           ← Badge "Rute Dikalkulasi Ulang" jika recalculated=true
```

### 2.1 Tanggung Jawab Komponen

#### `MapView`
- Inisialisasi `MapContainer` Leaflet dengan bounds Indonesia/Asia Tenggara.
- Menerima props: `nodes`, `activeRoute`, `nfzZones`.
- Tidak memiliki state sendiri — murni presentational terhadap props.
- Tile layer: OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).

#### `AirportMarker`
- Render `CircleMarker` Leaflet untuk setiap node bandara.
- Props: `node: AirportNode`, `isSelected: boolean`, `onSelect: (iata: string) => void`.
- Warna: default abu-abu, ter-highlight kuning saat jadi origin/destination,
  biru jika berada di rute aktif.
- Tooltip: nama bandara + kode IATA saat hover.

#### `RouteLayer`
- Render `Polyline` Leaflet untuk setiap edge di `currentPath`.
- Props: `edges: EdgeResult[]`, `isAnimating: boolean`.
- Saat `isAnimating=true`: animasi dash-offset CSS untuk efek "penerbangan".
- Warna: hijau saat rute normal, oranye saat `recalculated=true`.

#### `NfzLayer`
- Render `Polygon` Leaflet (merah semi-transparan) untuk setiap NFZ aktif.
- Props: `zones: NfzZone[]`.
- Hanya render zona dengan `active=true`.
- Untuk `type="circle"`: konversi `center+radius_km` ke `Circle` Leaflet.

#### `ControlPanel`
- Dropdown bandara: dicari dari state `airports` global.
- Tombol "Cari Rute" → trigger `POST /route`.
- Daftar NFZ: setiap zona punya toggle switch → trigger `POST /nfz` lalu
  refresh data.

#### `ResultPanel`
- Tampil hanya jika `currentPath` tidak null.
- Badge `RUTE DIKALKULASI ULANG` (oranye) muncul jika `recalculated=true`.
- Collapsible section "Edge Terblokir" jika `blocked_edges.length > 0`.

---

## 3. State Management

State dikelola di `app/page.tsx` menggunakan React `useState` dan `useReducer`.
Tidak ada library state eksternal (Zustand/Redux) untuk MVP — prop drilling cukup
karena kedalaman komponen ≤ 3 level.

### 3.1 Daftar State

```typescript
// app/page.tsx

// Data statis (dimuat sekali saat mount)
const [airports, setAirports]       = useState<AirportNode[]>([]);
const [graphEdges, setGraphEdges]   = useState<GraphEdge[]>([]);
const [nfzZones, setNfzZones]       = useState<NfzZone[]>([]);

// Input pengguna
const [selectedOrigin, setSelectedOrigin]   = useState<string | null>(null);
const [selectedDest, setSelectedDest]       = useState<string | null>(null);
const [selectedAlgo, setSelectedAlgo]       = useState<"dijkstra" | "astar">("dijkstra");

// Hasil routing
const [currentPath, setCurrentPath]         = useState<RouteResponse | null>(null);

// UI state
const [isLoading, setIsLoading]             = useState<boolean>(false);
const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
const [error, setError]                     = useState<string | null>(null);
```

### 3.2 Kapan State Berubah

| State | Berubah Ketika |
|-------|----------------|
| `airports`, `graphEdges`, `nfzZones` | `useEffect` saat komponen pertama mount (load dari API atau dummy JSON) |
| `selectedOrigin` | Pengguna memilih bandara asal di dropdown atau klik marker |
| `selectedDest` | Pengguna memilih bandara tujuan |
| `selectedAlgo` | Pengguna klik toggle Dijkstra/A* |
| `nfzZones` | Setelah `POST /nfz` sukses → update zona yang di-toggle |
| `currentPath` | Setelah `POST /route` sukses → set hasil; saat origin/dest berubah → set `null` |
| `isLoading` | `true` saat request `POST /route` dikirim; `false` saat response tiba |
| `isRecalculating` | `true` saat NFZ di-toggle DAN `currentPath` tidak null (rute perlu dihitung ulang) |
| `error` | Saat API mengembalikan error; `null` saat request baru dimulai |

---

## 4. TypeScript Interfaces

```typescript
// src/types/index.ts

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
```

---

## 5. Dummy-Data Contract & Layer Abstraksi `api.ts`

### 5.1 Konsep

Frontend **tidak boleh hardcode** URL API. Semua akses data melewati satu modul
`src/lib/api.ts`. Modul ini memiliki dua mode:
- **Dummy mode**: membaca file JSON lokal dari `public/data/`.
- **Live mode**: memanggil endpoint FastAPI.

Switchover cukup dengan mengubah satu environment variable: `NEXT_PUBLIC_USE_LIVE_API`.

### 5.2 Implementasi `api.ts`

```typescript
// src/lib/api.ts

const USE_LIVE = process.env.NEXT_PUBLIC_USE_LIVE_API === "true";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const url = USE_LIVE ? `${API_BASE}${path}` : path;
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request gagal.");
  }
  return res.json() as Promise<T>;
}

// --- Fungsi publik ---

export async function fetchGraph(): Promise<GraphData> {
  // Dummy: GET /data/graph.json
  // Live:  GET /graph
  return fetcher<GraphData>(USE_LIVE ? "/graph" : "/data/graph.json");
}

export async function fetchNfz(): Promise<{ nfz_zones: NfzZone[] }> {
  return fetcher(USE_LIVE ? "/nfz" : "/data/nfz.json");
}

export async function fetchAirports(): Promise<{ airports: AirportNode[] }> {
  if (!USE_LIVE) {
    // Derive dari graph.json lokal
    const g = await fetchGraph();
    return { airports: g.nodes };
  }
  return fetcher("/airports");
}

export async function postRoute(req: RouteRequest): Promise<RouteResponse> {
  if (!USE_LIVE) {
    // Dalam dummy mode, tidak ada algoritma real — kembalikan mock statis
    return MOCK_ROUTE_RESPONSE;
  }
  return fetcher<RouteResponse>("/route", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(req),
  });
}

export async function toggleNfz(id: string, active: boolean): Promise<void> {
  if (!USE_LIVE) {
    // Dummy mode: update state lokal saja, tidak ada persistence
    return;
  }
  await fetcher(`/nfz`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ id, active }),
  });
}

// Mock response untuk dummy mode
const MOCK_ROUTE_RESPONSE: RouteResponse = {
  path:           ["CGK", "SUB", "DPS"],
  total_distance: 839.24,
  edges_used:     [
    { from: "CGK", to: "SUB", weight: 664.83 },
    { from: "SUB", to: "DPS", weight: 174.41 },
  ],
  blocked_edges:  [],
  recalculated:   false,
};
```

### 5.3 Environment Variables

```bash
# .env.local (development — dummy mode)
NEXT_PUBLIC_USE_LIVE_API=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# .env.production (setelah API Padil siap)
NEXT_PUBLIC_USE_LIVE_API=true
NEXT_PUBLIC_API_BASE_URL=https://skyroute-api.onrender.com
```

### 5.4 Lokasi Dummy Files

```
frontend/public/data/
├── graph.json   ← Schema IDENTIK dengan GET /graph response
└── nfz.json     ← Schema IDENTIK dengan GET /nfz response
```

> File ini adalah *satu-satunya* sumber kebenaran untuk dummy data.
> Padil cukup copy `data/processed/graph.json` ke sini saat siap.

---

## 6. Cara Render Visual

### 6.1 Marker Bandara

```typescript
// AirportMarker.tsx
<CircleMarker
  center={[node.lat, node.lon]}
  radius={isInPath ? 8 : 5}
  pathOptions={{
    color:     isSelected ? "#FACC15" : isInPath ? "#3B82F6" : "#6B7280",
    fillColor: isSelected ? "#FACC15" : isInPath ? "#3B82F6" : "#374151",
    fillOpacity: 0.9,
    weight: 2,
  }}
>
  <Tooltip>{node.name} ({node.iata})</Tooltip>
</CircleMarker>
```

### 6.2 Garis Rute Ter-highlight

```typescript
// RouteLayer.tsx
<Polyline
  positions={pathCoords}         // [[lat,lon], [lat,lon], ...]
  pathOptions={{
    color:     recalculated ? "#F97316" : "#22C55E",  // oranye vs hijau
    weight:    4,
    opacity:   0.85,
    dashArray: isAnimating ? "10 5" : undefined,
  }}
/>
```

### 6.3 Poligon NFZ

```typescript
// NfzLayer.tsx — untuk type="polygon"
<Polygon
  positions={zone.geometry.coordinates[0].map(([lon, lat]) => [lat, lon])}
  pathOptions={{
    color:       "#EF4444",
    fillColor:   "#EF4444",
    fillOpacity: 0.25,
    weight:      2,
    dashArray:   "5 5",
  }}
>
  <Tooltip sticky>{zone.name}</Tooltip>
</Polygon>

// Untuk type="circle"
<Circle
  center={[lat, lon]}
  radius={zone.geometry.radius_km * 1000}  // meter
  pathOptions={{ color: "#EF4444", fillColor: "#EF4444", fillOpacity: 0.25 }}
/>
```

### 6.4 Animasi & Feedback Rekalkulasi

```typescript
// Saat POST /route dipanggil:
setIsLoading(true);
setError(null);

// Saat NFZ di-toggle dengan rute aktif:
setIsRecalculating(true);
await toggleNfz(id, active);
const newRoute = await postRoute({ origin, destination, algo });
setCurrentPath(newRoute);
setIsRecalculating(false);

// Di ResultPanel:
{isRecalculating && (
  <div className="animate-pulse text-orange-400">
    Menghitung ulang rute...
  </div>
)}
{currentPath?.recalculated && !isRecalculating && (
  <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs">
    RUTE DIKALKULASI ULANG
  </span>
)}
```

---

## 7. Interface Contract Checklist

> Daftar ini adalah **wajib diverifikasi** sebelum cutover dari dummy ke live API.
> Setiap field yang tidak cocok antara backend dan frontend akan menyebabkan bug
> runtime yang sulit dilacak.

### 7.1 Kontrak `GET /graph` ↔ `graph.json` lokal

| Field | Tipe Backend | Tipe Frontend | Wajib Sama |
|-------|-------------|---------------|------------|
| `nodes[].iata` | `str` | `string` | ✓ |
| `nodes[].name` | `str` | `string` | ✓ |
| `nodes[].lat` | `float` | `number` | ✓ |
| `nodes[].lon` | `float` | `number` | ✓ |
| `edges[].from` | `str` (alias) | `string` | ✓ kritis |
| `edges[].to` | `str` | `string` | ✓ |
| `edges[].weight` | `float` | `number` | ✓ |

### 7.2 Kontrak `GET /nfz` ↔ `nfz.json` lokal

| Field | Tipe Backend | Tipe Frontend | Wajib Sama |
|-------|-------------|---------------|------------|
| `nfz_zones[].id` | `str` | `string` | ✓ |
| `nfz_zones[].type` | `"polygon"\|"circle"` | `"polygon"\|"circle"` | ✓ kritis |
| `nfz_zones[].active` | `bool` | `boolean` | ✓ |
| `nfz_zones[].geometry.coordinates` | `[lon,lat][]` | `[number,number][]` | ✓ kritis (urutan lon,lat) |
| `nfz_zones[].geometry.radius_km` | `float` | `number` | ✓ (hanya type=circle) |

### 7.3 Kontrak `POST /route` response

| Field | Tipe Backend | Tipe Frontend | Wajib Sama |
|-------|-------------|---------------|------------|
| `path` | `list[str]` | `string[]` | ✓ |
| `total_distance` | `float` | `number` | ✓ |
| `edges_used[].from` | `str` | `string` | ✓ kritis |
| `edges_used[].to` | `str` | `string` | ✓ |
| `edges_used[].weight` | `float` | `number` | ✓ |
| `blocked_edges[].from` | `str` | `string` | ✓ |
| `blocked_edges[].to` | `str` | `string` | ✓ |
| `blocked_edges[].weight` | `null` | `null` | ✓ kritis |
| `blocked_edges[].reason` | `str` | `string` | ✓ |
| `recalculated` | `bool` | `boolean` | ✓ kritis |

### 7.4 Kontrak `POST /nfz` request/response

| Field | Tipe Backend | Tipe Frontend | Wajib Sama |
|-------|-------------|---------------|------------|
| request `id` | `str` | `string` | ✓ |
| request `active` | `bool` | `boolean` | ✓ |
| response `id` | `str` | — (tidak dipakai) | — |
| response `active` | `bool` | — | — |
| response `message` | `str` | — | — |

### 7.5 HTTP Status Code Contract

| Kondisi | Backend Kirim | Frontend Handle |
|---------|---------------|-----------------|
| Sukses | 200 | Parse JSON, update state |
| Bad request | 400 | Tampilkan `error.detail` ke pengguna |
| Not found | 404 | Tampilkan pesan "Bandara tidak ditemukan" |
| Unprocessable | 422 | Tampilkan `error.detail` — bisa "no path" atau "all blocked" |
| Server error | 500 | Tampilkan pesan generik "Terjadi kesalahan server" |
