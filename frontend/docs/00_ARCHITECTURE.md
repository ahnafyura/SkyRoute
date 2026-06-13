# 00_ARCHITECTURE.md — SkyRoute Analytics: Arsitektur Sistem

> **Status:** Ground Truth v1.0 — Jangan dikontradiksi oleh dokumen hilir.
> **Terakhir diperbarui:** 2026-06-09

---

## 1. Ringkasan Proyek

**SkyRoute Analytics** adalah aplikasi visualisasi shortest-path berbasis web yang
dibangun sebagai Tugas Akhir Mata Kuliah Matematika Diskrit, Program Studi Teknik
Komputer, Institut Teknologi Sepuluh Nopember (ITS).

Aplikasi ini mendemonstrasikan penerapan teori graf dan algoritma pencarian jalur
terpendek (Dijkstra & A*) pada jaringan penerbangan nyata, diperkaya dengan fitur
**No-Fly Zone (NFZ)** yang memaksa rekalkulasi rute secara dinamis saat zona
terlarang diaktifkan.

### 1.1 Success Criteria

| # | Kriteria | Cara Verifikasi |
|---|----------|-----------------|
| SC-1 | Rekalkulasi rute berjalan mulus (<2 detik) saat NFZ diaktifkan | Demo langsung: aktifkan NFZ → rute berubah tanpa reload halaman |
| SC-2 | Implementasi patuh prinsip graf diskrit (node, edge, bobot haversine) | Inspeksi `graph.json` + unit test algoritma |
| SC-3 | Tidak ada kegagalan logis saat demo (crash, infinite loop, path salah) | Uji seluruh edge case yang terdaftar di `05_TASKS.md` |
| SC-4 | Algoritma Dijkstra dan A* menghasilkan hasil identik untuk input sama | Assertion test: `dijkstra(o,d) == astar(o,d)` pada dataset produksi |
| SC-5 | Antarmuka menampilkan: marker bandara, garis rute, poligon NFZ | Visual QA di browser |

---

## 2. Pipeline Arsitektur 5 Layer

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: DATA SOURCE                                               │
│  OpenFlights (airports.dat + routes.dat) + OurAirports (opsional)  │
│  → subset bandara/rute → graph.json + nfz.json (mock statis)       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ graph.json / nfz.json
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: NFZ ENGINE                                                │
│  Shapely (Python): cek interseksi segmen edge vs poligon NFZ        │
│  → edge yang menembus NFZ dimasking bobot = ∞                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ graf termodifikasi (adjacency)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3: ROUTING ENGINE                                            │
│  NetworkX / heapq (Python): Dijkstra & A*                           │
│  → path [IATA...], total_distance, blocked_edges, recalculated      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ JSON response
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 4: API LAYER                                                 │
│  FastAPI (Python): endpoint REST, validasi Pydantic v2, CORS        │
│  Endpoint: GET /airports  GET /graph  GET /nfz                      │
│            POST /nfz      POST /route  GET /live (opsional)         │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP JSON
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 5: FRONTEND                                                  │
│  Next.js (App Router) + React + Tailwind CSS                        │
│  Peta: Leaflet / MapLibre-GL-JS                                     │
│  → render marker, path, NFZ poligon; animasi rekalkulasi            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Justifikasi Pilihan Teknologi

### 3.1 Python + FastAPI (Backend)

| Alasan | Detail |
|--------|--------|
| **Ekosistem saintifik** | NumPy, NetworkX, Shapely sudah matang di Python; tidak ada padanan setara di TypeScript untuk komputasi graf & geometri |
| **FastAPI vs Flask/Django** | FastAPI: async-native, validasi otomatis via Pydantic v2, auto-generate OpenAPI docs (`/docs`), performa mendekati NodeJS |
| **Kemudahan deploy** | Docker image kecil, mudah di-host di Render / Railway dengan `uvicorn` |

### 3.2 NetworkX

Menyediakan struktur data graf (`nx.Graph`, `nx.DiGraph`) dan algoritma bawaan
sebagai pembanding. Dijkstra & A* diimplementasi *custom* menggunakan `heapq`
untuk keperluan akademis, NetworkX dipakai sebagai fallback validasi.

### 3.3 Shapely

Library geometri 2D Python standar de-facto. Dipakai untuk:
- Membangun poligon NFZ dari koordinat GeoJSON.
- Mendeteksi apakah segmen garis (edge rute) berpotongan dengan poligon NFZ.
- Tidak perlu server GIS penuh (PostGIS) karena dataset kecil.

### 3.4 Leaflet / MapLibre-GL-JS (Frontend)

| | Leaflet | MapLibre-GL-JS |
|-|---------|----------------|
| **Bobot bundle** | ~42 KB | ~220 KB |
| **Rendering** | Canvas/SVG raster tiles | WebGL vector tiles |
| **Kemudahan** | Sangat mudah, banyak plugin React (`react-leaflet`) | Lebih kompleks |
| **Pilihan** | **Default**: Leaflet via `react-leaflet` | Fallback jika perlu 3D/vector |

Keputusan final: **Leaflet** (`react-leaflet`) sebagai pilihan utama karena
dokumentasi melimpah, setup cepat, dan cukup untuk kebutuhan demo.

### 3.5 OpenFlights, bukan OpenSky, sebagai Sumber Graf

**OpenSky Network** hanya menyediakan *state vector* ADS-B: posisi pesawat
real-time (lat, lon, altitude, velocity). Tidak ada data rute, bandara, atau
konektivitas jaringan. **Tidak bisa dijadikan sumber graf.**

**OpenFlights** (`airports.dat` + `routes.dat`) menyediakan:
- ~7.600 bandara dengan koordinat lat/lon dan kode IATA.
- ~67.000 rute antar-bandara dari data historis maskapai global.
- Format CSV statis → mudah diproses offline tanpa API key.

OpenSky **boleh dipakai secara opsional** sebagai layer "pesawat hidup" di peta
(viz tambahan), bukan sebagai sumber graf.

### 3.6 Next.js (App Router)

- Server Components untuk SSR cepat pada halaman awal.
- Client Components untuk interaksi peta real-time.
- Deploy ke Vercel tanpa konfigurasi tambahan.

---

## 4. Struktur Monorepo

```
SkyRoute/
├── backend/                    # Python — Padil (Algorithm Engineer + API)
│   ├── app/
│   │   ├── main.py             # FastAPI app, router mount
│   │   ├── routers/
│   │   │   ├── airports.py     # GET /airports
│   │   │   ├── graph.py        # GET /graph
│   │   │   ├── nfz.py          # GET /nfz, POST /nfz
│   │   │   ├── route.py        # POST /route
│   │   │   └── live.py         # GET /live (opsional)
│   │   ├── services/
│   │   │   ├── graph_builder.py    # Membangun NetworkX graph dari graph.json
│   │   │   ├── dijkstra.py         # Implementasi custom Dijkstra
│   │   │   ├── astar.py            # Implementasi custom A*
│   │   │   ├── nfz_engine.py       # Shapely: masking edge menembus NFZ
│   │   │   └── haversine.py        # Fungsi haversine
│   │   └── schemas/
│   │       └── models.py       # Pydantic v2 models
│   ├── data/                   # Symlink atau copy dari /data
│   ├── tests/
│   │   ├── test_dijkstra.py
│   │   ├── test_astar.py
│   │   └── test_nfz.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                   # Next.js — Ahnaf (Frontend Developer)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Halaman utama
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── MapView.tsx
│   │   │   ├── AirportMarker.tsx
│   │   │   ├── RouteLayer.tsx
│   │   │   ├── NfzLayer.tsx
│   │   │   ├── ControlPanel.tsx
│   │   │   └── ResultPanel.tsx
│   │   ├── lib/
│   │   │   └── api.ts          # Abstraksi data-fetching (dummy ↔ live)
│   │   └── types/
│   │       └── index.ts        # TypeScript interfaces
│   ├── public/
│   │   └── data/               # Dummy data lokal
│   │       ├── graph.json
│   │       └── nfz.json
│   ├── package.json
│   └── next.config.ts
│
├── data/                       # Sumber data mentah & hasil olah — Padil + PM
│   ├── raw/
│   │   ├── airports.dat        # OpenFlights raw
│   │   └── routes.dat          # OpenFlights raw
│   ├── processed/
│   │   ├── graph.json          # Output pipeline (master)
│   │   └── nfz.json            # NFZ mock statis (master)
│   └── scripts/
│       └── build_graph.py      # Pipeline ekstraksi & filter
│
└── docs/                       # Dokumentasi — semua peran
    ├── 00_ARCHITECTURE.md      # File ini
    ├── 01_DATA_PIPELINE.md
    ├── 02_BACKEND_SPEC.md
    ├── 03_FRONTEND_SPEC.md
    ├── 04_SPRINT_PLAN.md
    └── 05_TASKS.md
```

---

## 5. Pemetaan Peran Tim ke Layer

| Peran | Layer / Komponen | Tanggung Jawab Utama |
|-------|------------------|----------------------|
| **Project Manager** | Semua layer (koordinasi) | Brief, timeline, review PR, pastikan SC terpenuhi |
| **UI/UX Designer** | Layer 5 (desain) | Figma mockup, design system, spesifikasi visual NFZ |
| **Frontend Dev (Ahnaf)** | Layer 5 (implementasi) | Next.js, komponen peta, state management, api.ts |
| **Algorithm Engineer + API (Padil)** | Layer 2, 3, 4 | Dijkstra/A*, NFZ engine, FastAPI endpoint |
| **Integration Specialist** | Layer 1, 4 | Ekstraksi data OpenFlights, schema graph.json/nfz.json, sinkronisasi API |
| **DevOps** | Semua layer (infrastruktur) | GitHub repo, Vercel deploy, Render deploy, env vars, CORS |

---

## 6. Asumsi & Batasan Ruang Lingkup

### 6.1 Asumsi

1. **Data rute historis cukup**: Rute dari `routes.dat` OpenFlights bersifat
   historis (bukan live), tapi memadai untuk demonstrasi akademis.
2. **Graf tidak berarah (undirected)**: Jika A→B ada, diasumsikan B→A juga ada
   (untuk menyederhanakan). Jika perlu directed, Padil menginformasikan.
3. **Bobot = jarak great-circle**: Tidak memodelkan faktor lain (angin, biaya,
   kapasitas). Cukup untuk konteks Matematika Diskrit.
4. **NFZ statis saat demo**: NFZ diaktifkan/dinonaktifkan manual via UI, tidak
   berubah secara otomatis dari feed eksternal.
5. **Koordinat dalam WGS-84**: Semua lat/lon menggunakan sistem koordinat bumi
   standar yang kompatibel dengan Leaflet.

### 6.2 Batasan Ruang Lingkup

| Batasan | Deskripsi |
|---------|-----------|
| **Subset graf** | Maksimum ~200 bandara, ~1.000 edge agar rendering peta tidak berat dan algoritma selesai <2 detik |
| **NFZ mock** | Hanya 2–5 poligon NFZ statis untuk demo; tidak ada integrasi live ke Mission Planner / NOTAM resmi |
| **OpenSky** | Layer "pesawat hidup" adalah fitur opsional; tidak masuk MVP |
| **Autentikasi** | Tidak ada login/user management; aplikasi publik read-only |
| **Mobile** | Desain responsif diusahakan tetapi bukan prioritas; target utama desktop browser |
| **Multi-hop constraint** | Tidak ada batasan jumlah transit; path mungkin melalui banyak bandara |

---

## 7. Pertanyaan Terbuka untuk Tim

> Harus diputuskan sebelum coding dimulai (Minggu 1).

1. **Subset region**: Apakah graf terbatas pada penerbangan domestik Indonesia,
   atau mencakup Asia Tenggara? (Implikasi ke ukuran graf.)
2. **Directed vs Undirected**: Apakah rute A→B tidak otomatis berarti B→A?
   (Pengaruh pada algoritma dan ukuran adjacency list.)
3. **Leaflet vs MapLibre**: Konfirmasi final library peta sebelum Ahnaf setup
   proyek frontend.
4. **Tile provider**: OpenStreetMap tiles (gratis, no API key) atau Mapbox
   (butuh token)? OSM direkomendasikan untuk demo akademis.
5. **Deploy URL**: Apakah backend Render/Railway URL sudah ditetapkan? Ahnaf
   perlu URL ini untuk variabel `NEXT_PUBLIC_API_BASE_URL`.
6. **Format NFZ toggle**: Apakah NFZ di-toggle per-poligon individual, atau
   semua sekaligus (on/off global)?
