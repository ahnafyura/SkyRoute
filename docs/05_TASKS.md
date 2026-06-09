# 05_TASKS.md — SkyRoute Analytics: Backlog & Tugas Granular

> **Status:** v1.0
> **Terakhir diperbarui:** 2026-06-09
> **Acuan:** 04_SPRINT_PLAN.md

---

## 1. Backlog per Peran

### 1.1 Frontend Developer — Ahnaf

| ID | Judul | Deskripsi | Sprint | Estimasi | Acceptance Criteria |
|----|-------|-----------|--------|----------|---------------------|
| FE-01 | Init Next.js + Tailwind | Buat proyek Next.js 14 App Router, pasang Tailwind CSS, `react-leaflet` | 1 | 2 jam | `npm run dev` berjalan, halaman blank tanpa error |
| FE-02 | Setup `api.ts` dummy mode | Buat `src/lib/api.ts` dengan `fetchGraph()`, `fetchNfz()` mode dummy | 1 | 3 jam | `fetchGraph()` mengembalikan data dari `public/data/graph.json` tanpa error TS |
| FE-03 | Copy dummy data | Copy `graph.json` + `nfz.json` ke `frontend/public/data/` | 1 | 30 mnt | File dapat di-fetch via `fetch('/data/graph.json')` di browser |
| FE-04 | Komponen `MapView` | Init `MapContainer` Leaflet, tile OSM, bounds Asia Tenggara | 2 | 3 jam | Peta tampil di browser, zoom/pan berfungsi |
| FE-05 | Komponen `AirportMarker` | Render `CircleMarker` per node, tooltip nama+IATA, highlight selected | 2 | 4 jam | Semua bandara dari `graph.json` terlihat di peta, tooltip muncul saat hover |
| FE-06 | Komponen `ControlPanel` | Dropdown origin/dest (search by name atau IATA), toggle Dijkstra/A* | 2 | 4 jam | Dapat memilih dua bandara berbeda, reset saat klik ulang |
| FE-07 | Komponen `RouteLayer` | Render `Polyline` untuk edges dalam `currentPath`, warna hijau/oranye | 2 | 3 jam | Path mock statis tampil sebagai garis di antara marker |
| FE-08 | Komponen `NfzLayer` | Render `Polygon` + `Circle` merah dari `nfz.json` | 2 | 3 jam | Poligon NFZ tampil di peta dengan warna merah semi-transparan |
| FE-09 | Komponen `ResultPanel` | Tampilkan path (IATA list), total distance, badge RUTE DIKALKULASI ULANG | 2 | 3 jam | Panel tampil di bawah/samping peta saat `currentPath` tidak null |
| FE-10 | Integrasi `POST /route` live | Update `api.ts` mode live untuk `postRoute()`, handle error 400/404/422 | 3 | 3 jam | Klik "Cari Rute" → request ke backend → path tampil di peta |
| FE-11 | NFZ toggle flow | Toggle NFZ → `POST /nfz` → refresh rute jika aktif → update peta | 3 | 4 jam | Toggle NFZ → loading state → rute berubah → badge oranye jika `recalculated=true` |
| FE-12 | Error handling UI | Tampilkan pesan error dari backend di `ControlPanel` atau toast | 3 | 2 jam | Input origin==dest → pesan error tampil; no path → pesan "Tidak ada jalur" |
| FE-13 | Environment variable setup | `.env.local`, `.env.example`, switch dummy↔live via env var | 3 | 1 jam | Mengubah `NEXT_PUBLIC_USE_LIVE_API=true` → request ke URL API nyata |
| FE-14 | Polish & responsive | Perbaiki layout untuk layar 1280px+, warna konsisten, loading spinner | 4 | 3 jam | Tidak ada elemen overlap di 1280x720; spinner tampil saat loading |
| FE-15 | Final QA frontend | Uji semua edge case di browser (lihat §3 Matriks Pengujian) | 4 | 2 jam | Semua test case di matriks dicentang manual |

---

### 1.2 Algorithm Engineer + API — Padil

| ID | Judul | Deskripsi | Sprint | Estimasi | Acceptance Criteria |
|----|-------|-----------|--------|----------|---------------------|
| BE-01 | Init FastAPI project | Struktur folder backend, `requirements.txt`, `main.py` dengan CORS | 1 | 2 jam | `uvicorn app.main:app` berjalan, `/docs` bisa diakses |
| BE-02 | Fungsi `haversine.py` | Implementasi fungsi haversine dengan contoh perhitungan | 1 | 1 jam | `haversine(-6.1256, 106.6558, -7.3798, 112.7870)` ≈ 664.83 |
| BE-03 | Script `build_graph.py` | Pipeline ekstraksi OpenFlights → filter → haversine → `graph.json` | 1 | 5 jam | `graph.json` punya node valid, edge dengan bobot > 0, 1 connected component |
| BE-04 | Mock `nfz.json` | Buat 2 zona NFZ: 1 poligon Laut Jawa, 1 lingkaran Selat Bali | 1 | 1 jam | File valid JSON, dapat di-load oleh Python tanpa error |
| BE-05 | Pydantic models | `RouteRequest`, `RouteResponse`, `NfzToggleRequest` (lihat §6 BACKEND_SPEC) | 2 | 2 jam | Validasi otomatis menolak IATA < 3 karakter, algo tidak valid |
| BE-06 | Implementasi Dijkstra | Custom Dijkstra dengan `heapq`, rekonstruksi path | 2 | 4 jam | Unit test: `dijkstra(CGK, DPS)` menghasilkan path valid, semua assertion lulus |
| BE-07 | Implementasi A* | Custom A* dengan heuristik haversine ke destination | 2 | 4 jam | Unit test: `astar(CGK, DPS) == dijkstra(CGK, DPS)` pada 5 pasang berbeda |
| BE-08 | NFZ engine (Shapely) | `edge_intersects_nfz()` + `build_masked_graph()` dengan Shapely | 2 | 5 jam | Edge yang menembus poligon NFZ Laut Jawa di-mask; path menghindari zona |
| BE-09 | Endpoint `GET /airports` | Return daftar node dari `graph.json` | 2 | 1 jam | Response 200, field `iata/name/lat/lon` ada semua |
| BE-10 | Endpoint `GET /graph` | Return `graph.json` lengkap | 2 | 1 jam | Response identik dengan file `graph.json` |
| BE-11 | Endpoint `GET /nfz` | Return `nfz.json`, support param `active_only` | 2 | 1 jam | `?active_only=true` hanya mengembalikan zona `active=true` |
| BE-12 | Endpoint `POST /nfz` | Toggle `active` state suatu zona by ID | 2 | 2 jam | Toggle ID valid → 200; ID tidak ada → 404 |
| BE-13 | Endpoint `POST /route` | Integrasi full: mask NFZ → Dijkstra/A* → response | 2 | 4 jam | CGK→DPS tanpa NFZ: `recalculated=false`; dengan NFZ Laut Jawa: `recalculated=true` |
| BE-14 | Edge case handling | Implementasi semua penanganan di §5 BACKEND_SPEC | 3 | 2 jam | HTTP 400 untuk origin==dest, 404 untuk IATA tidak ada, 422 untuk no path |
| BE-15 | Deploy ke Render | Dockerfile atau `requirements.txt` + `start.sh`, env var PORT | 3 | 2 jam | URL publik Render mengembalikan `{"status":"ok"}` dari GET / |
| BE-16 | Final QA backend | Uji semua endpoint via curl + pytest full suite | 4 | 2 jam | `pytest -v` semua test lulus, manual curl ke URL produksi OK |

---

### 1.3 UI/UX Designer

| ID | Judul | Deskripsi | Sprint | Estimasi | Acceptance Criteria |
|----|-------|-----------|--------|----------|---------------------|
| UI-01 | Wireframe halaman utama | Wireframe low-fi: posisi peta, panel kontrol, panel hasil | 1 | 3 jam | Semua komponen dari §2 FRONTEND_SPEC ada di wireframe |
| UI-02 | Mockup high-fidelity | Desain warna, tipografi, ikon bandara, warna NFZ merah | 1 | 5 jam | Mockup disetujui PM sebelum hari ke-7 |
| UI-03 | Spesifikasi komponen | Ukuran font, padding, warna per state (default/hover/active/error) | 2 | 3 jam | Ahnaf bisa langsung implementasi tanpa ambiguitas |
| UI-04 | Review implementasi | Bandingkan UI implementasi Ahnaf vs mockup, beri feedback | 3 | 2 jam | Checklist visual QA disetujui |

---

### 1.4 Integration Specialist

| ID | Judul | Deskripsi | Sprint | Estimasi | Acceptance Criteria |
|----|-------|-----------|--------|----------|---------------------|
| INT-01 | Unduh OpenFlights | Unduh `airports.dat` + `routes.dat` ke `data/raw/` | 1 | 30 mnt | File ada di repo (atau git-ignored, dengan instruksi unduh) |
| INT-02 | Verifikasi schema kontrak | Pastikan `graph.json` output dari BE-03 sesuai skema di DATA_PIPELINE §3 | 1 | 1 jam | Validasi JSON Schema otomatis lulus |
| INT-03 | Sinkronisasi dummy ke frontend | Copy `graph.json` dan `nfz.json` ke `frontend/public/data/` | 1 | 30 mnt | Frontend dapat load data tanpa modifikasi apapun |
| INT-04 | Dokumentasi API contract | Verifikasi §7 FRONTEND_SPEC Interface Contract Checklist setelah cutover | 3 | 2 jam | Semua field di checklist dicentang; tidak ada mismatch |

---

### 1.5 DevOps

| ID | Judul | Deskripsi | Sprint | Estimasi | Acceptance Criteria |
|----|-------|-----------|--------|----------|---------------------|
| OPS-01 | Init GitHub repo + branching | Buat `main`, `dev`, `feature/*` policy; protect main | 1 | 1 jam | PR ke main butuh 1 approval; direct push ke main diblokir |
| OPS-02 | Connect Vercel | Link repo `frontend/` ke Vercel, auto-deploy on push ke main | 1 | 1 jam | Push ke `main` → Vercel build → URL preview tersedia |
| OPS-03 | Setup Render/Railway | Setup backend deployment, env var PORT, health check endpoint | 1 | 2 jam | Service berstatus "Running" di dashboard Render |
| OPS-04 | Set env vars Vercel | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_USE_LIVE_API` | 3 | 30 mnt | Vercel environment variables tersimpan dan ter-deploy |
| OPS-05 | CORS verifikasi | Pastikan Render URL ada di allowlist CORS FastAPI | 3 | 30 mnt | Fetch dari Vercel URL ke Render URL tidak kena CORS error |
| OPS-06 | `.env.example` | Dokumentasikan semua env vars yang dibutuhkan | 4 | 30 mnt | File `.env.example` ada di root `/frontend` dan `/backend` |

---

### 1.6 Project Manager

| ID | Judul | Deskripsi | Sprint | Estimasi | Acceptance Criteria |
|----|-------|-----------|--------|----------|---------------------|
| PM-01 | Putuskan pertanyaan terbuka | Jawab semua pertanyaan terbuka di DATA_PIPELINE §7 | 1 | 2 jam | Keputusan tertulis di DECISIONS.md atau GitHub Discussion |
| PM-02 | Review `graph.json` final | Approve graph sebelum Ahnaf pakai sebagai dummy data | 1 | 1 jam | Persetujuan tercatat di PR review |
| PM-03 | Midpoint review Sprint 2 | Cek progress semua anggota, blokir risiko | 2 | 1 jam | Semua D2-xx on track; risiko dicatat |
| PM-04 | Verifikasi success criteria | Uji SC-1 s.d. SC-5 sesuai tabel di ARCHITECTURE §1.1 | 4 | 2 jam | Semua SC dicentang dengan bukti (screenshot/video) |
| PM-05 | Persiapan demo presentasi | Latih urutan demo, siapkan backup plan (mock data) | 4 | 3 jam | Demo berjalan tanpa hambatan dalam 2 kali rehearsal |

---

## 2. Matriks Pengujian

### 2.1 Success Criteria → Cara Verifikasi

| SC | Pernyataan | Cara Verifikasi | Siapa | Kapan |
|----|------------|-----------------|-------|-------|
| SC-1 | Rekalkulasi rute <2 detik saat NFZ aktif | Stopwatch manual: aktifkan NFZ → hitung waktu hingga rute baru tampil | PM + Ahnaf | Sprint 3 |
| SC-2 | Graf patuh prinsip diskrit | Jalankan validator script: cek tidak ada negative weight, self-loop, IATA invalid | Padil | Sprint 1 (saat build) |
| SC-3 | Tidak ada kegagalan logis saat demo | Jalankan semua test case §2.2 di bawah ini | Semua | Sprint 4 |
| SC-4 | Dijkstra == A* untuk input sama | `pytest test_astar.py::test_same_result_as_dijkstra` | Padil | Sprint 2 |
| SC-5 | Visual: marker, path, NFZ poligon | Visual QA di browser: screenshot setiap elemen | Ahnaf + UI | Sprint 3 |

### 2.2 Edge Case → Cara Verifikasi

| # | Kondisi | Input | Expected Output | Status |
|---|---------|-------|-----------------|--------|
| EC-01 | Origin == Destination | `{origin:"CGK", destination:"CGK", algo:"dijkstra"}` | HTTP 400, pesan "Origin dan destination tidak boleh sama" | — |
| EC-02 | IATA origin tidak ada | `{origin:"ZZZ", destination:"DPS", algo:"dijkstra"}` | HTTP 404, pesan "Bandara 'ZZZ' tidak ditemukan" | — |
| EC-03 | IATA dest tidak ada | `{origin:"CGK", destination:"ZZZ", algo:"astar"}` | HTTP 404 | — |
| EC-04 | Tidak ada path (disconnected) | Tambah node terisolasi lalu route ke sana | HTTP 422, "Tidak ada jalur tersedia" | — |
| EC-05 | Semua rute terblokir NFZ | Aktifkan NFZ yang memblokir semua edge keluar dari origin | HTTP 422, "Semua jalur terblokir" | — |
| EC-06 | `algo` bukan dijkstra/astar | `{algo:"bellman-ford"}` | HTTP 422, Pydantic validation error | — |
| EC-07 | IATA 2 karakter | `{origin:"CG", destination:"DPS"}` | HTTP 422, "IATA harus tepat 3 huruf" | — |
| EC-08 | `POST /nfz` ID tidak ada | `{id:"nfz-nonexistent", active:true}` | HTTP 404 | — |
| EC-09 | A* hasil identik Dijkstra | 5 pasang random bandara yang terhubung | `astar_path == dijkstra_path` untuk semua 5 | — |
| EC-10 | `recalculated=false` tanpa NFZ | Route dengan semua NFZ `active:false` | `recalculated=false` dalam response | — |
| EC-11 | `recalculated=true` dengan NFZ aktif | Route yang melewati area NFZ | `recalculated=true`, `blocked_edges` tidak kosong | — |
| EC-12 | NFZ lingkaran (circle) | Toggle NFZ type=circle lalu route | Edge yang menembus circle ter-mask | — |

---

## 3. Checklist Deployment

### 3.1 Backend (FastAPI → Render/Railway)

- [ ] `requirements.txt` sudah include semua dependency (fastapi, uvicorn, pydantic, networkx, shapely)
- [ ] Variabel `PORT` dibaca dari environment: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] `data/processed/graph.json` dan `nfz.json` ter-include dalam deployment (bukan di `.gitignore`)
- [ ] Health check endpoint `GET /` mengembalikan `{"status": "ok"}`
- [ ] CORS `allow_origins` sudah include URL Vercel produksi
- [ ] Render service sudah set ke "Auto Deploy" on push ke `main`
- [ ] URL Render dicatat dan dibagikan ke DevOps + Ahnaf

### 3.2 Frontend (Next.js → Vercel)

- [ ] `next.config.ts` tidak ada konfigurasi yang berbenturan dengan Vercel
- [ ] Environment variable di Vercel dashboard:
  - [ ] `NEXT_PUBLIC_API_BASE_URL` = URL Render/Railway
  - [ ] `NEXT_PUBLIC_USE_LIVE_API` = `true`
- [ ] `public/data/graph.json` dan `nfz.json` ada (sebagai fallback & dummy)
- [ ] Build Vercel lulus tanpa error TypeScript (`tsc --noEmit` bersih)
- [ ] Vercel production URL diakses dari browser fresh (incognito) — tidak error
- [ ] Vercel project root directory diset ke `frontend/` (bukan root repo)

### 3.3 Verifikasi Post-Deploy

- [ ] Buka URL Vercel → peta tampil dengan marker bandara
- [ ] Pilih origin & destination → klik "Cari Rute" → path tampil
- [ ] Aktifkan NFZ → rute dikalkulasi ulang
- [ ] Buka browser console: tidak ada error merah
- [ ] Buka Network tab: request ke API Render mengembalikan 200

---

## 4. Skenario Demo Presentasi (Langkah-demi-Langkah)

> Durasi estimasi demo: **5–7 menit**

### Langkah 1 — Perkenalan (30 detik)
Tunjukkan halaman utama: peta Asia Tenggara/Indonesia dengan marker bandara.
"Ini adalah SkyRoute Analytics — visualisasi shortest-path di jaringan penerbangan."

### Langkah 2 — Pilih Rute Normal (1 menit)
1. Pilih **Origin**: CGK (Jakarta)
2. Pilih **Destination**: DPS (Bali)
3. Pilih **Algoritma**: Dijkstra
4. Klik **"Cari Rute"**
5. → Path hijau tampil di peta, panel hasil muncul
6. Tunjukkan: daftar IATA, total jarak, badge `recalculated=false`

### Langkah 3 — Bandingkan Dijkstra vs A* (30 detik)
1. Ganti algoritma ke **A***
2. Klik **"Cari Rute"**
3. → Path identik (atau sangat mirip) — jelaskan: "A* menggunakan heuristik
   haversine yang admissible, sehingga hasilnya optimal seperti Dijkstra, namun
   lebih efisien."

### Langkah 4 — Aktifkan NFZ (2 menit) ← **Momen Utama Demo**
1. Di panel kontrol, temukan daftar NFZ
2. **Toggle ON**: "Latihan Militer Laut Jawa"
3. → Animasi "Menghitung ulang rute..."
4. → Path berubah (menghindari Laut Jawa), warna oranye
5. → Badge **"RUTE DIKALKULASI ULANG"** muncul
6. → Panel "Edge Terblokir" muncul — tunjukkan edge mana yang di-blokir
7. Jelaskan: "Backend mendeteksi bahwa edge CGK→SUB menembus poligon NFZ,
   sehingga bobot edge diset ke tak-terhingga dan algoritma menemukan jalur
   alternatif."

### Langkah 5 — Edge Case (1 menit)
1. Set origin dan destination ke **CGK** (sama)
2. Klik "Cari Rute"
3. → Pesan error: "Origin dan destination tidak boleh sama"
4. Jelaskan penanganan edge case sudah diimplementasi di backend & frontend.

### Langkah 6 — Penutup (30 detik)
"Sistem ini membuktikan penerapan teori graf Matematika Diskrit — node, edge,
bobot haversine — dalam konteks nyata jaringan penerbangan, dengan dinamika NFZ
yang merepresentasikan constraint real-world."

### Backup Plan Demo
Jika API Render down saat demo:
- Immediately switch: `NEXT_PUBLIC_USE_LIVE_API=false` di `.env.local`
- Gunakan dummy mode dengan mock route response
- Jelaskan: "Ini adalah mekanisme fallback yang kami siapkan — data dummy
  identik dengan schema API produksi."

---

## 5. Daftar Risiko & Mitigasi

| # | Risiko | Severity | Kemungkinan | Mitigasi |
|---|--------|----------|-------------|----------|
| R-01 | **API Render/Railway down** saat demo | Kritis | Sedang | Siapkan dummy mode (`NEXT_PUBLIC_USE_LIVE_API=false`); latih backup flow |
| R-02 | **Konflik schema** backend ↔ frontend | Tinggi | Sedang | Interface Contract Checklist (§7 FRONTEND_SPEC) wajib diverifikasi sebelum cutover |
| R-03 | **Rendering peta berat** / browser lag | Sedang | Rendah | Batasi MAX_NODES=150; fallback ke `react-simple-maps` (2D non-geo) jika perlu |
| R-04 | **NFZ engine salah masking** edge | Tinggi | Rendah | Unit test khusus (`test_nfz.py`): edge yang jelas menembus poligon harus ter-block |
| R-05 | **Data OpenFlights corrupt/hilang** | Sedang | Rendah | Simpan `graph.json` bersih di repo; jangan bergantung live download saat demo |
| R-06 | **A* menghasilkan hasil berbeda** dari Dijkstra | Tinggi | Rendah | Assertion test `test_same_result_as_dijkstra` wajib lulus sebelum deploy |
| R-07 | **Vercel build gagal** | Sedang | Rendah | `tsc --noEmit` wajib lulus di CI sebelum merge ke main |
| R-08 | **CORS error** di browser | Sedang | Sedang | Verifikasi CORS lokal sebelum cutover; DevOps pastikan allow_origins benar |
| R-09 | **Cutover terlambat** (API Padil belum siap di H+15) | Tinggi | Sedang | Buffer 2 hari (cutover bisa geser ke H+17); Ahnaf tetap bisa kerja di dummy mode |
| R-10 | **Graf tidak connected** setelah filter | Sedang | Rendah | Validasi di `build_graph.py`: assert `connected_components == 1` sebelum output |

### 5.1 Prosedur Aktivasi Fallback

```
Jika R-01 terjadi saat demo:
  1. Tunjukkan UI tetap berjalan dengan dummy data (backend tidak diperlukan untuk tampilan)
  2. Jelaskan arsitektur: "Dalam kondisi normal, algoritma berjalan di Python backend"
  3. Jika memungkinkan: run backend lokal di laptop cadangan
  4. JANGAN panik — backup plan ini sudah dilatih

Jika R-02 terjadi (mismatch field):
  1. Buka Interface Contract Checklist, temukan field yang mismatch
  2. Fix di backend (jika alias/naming): tambah `alias_generator` di Pydantic
  3. Fix di frontend (jika parsing): update TypeScript interface
  4. Target fix time: <2 jam jika ditemukan sebelum H+21
```
