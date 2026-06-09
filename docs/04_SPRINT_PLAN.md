# 04_SPRINT_PLAN.md — SkyRoute Analytics: Rencana Sprint

> **Status:** v1.0
> **Terakhir diperbarui:** 2026-06-09
> **Acuan:** 00_ARCHITECTURE.md, 01_DATA_PIPELINE.md, 02_BACKEND_SPEC.md, 03_FRONTEND_SPEC.md

---

## 1. Gambaran Umum Sprint (4 Minggu)

```
Minggu 1          Minggu 2          Minggu 3          Minggu 4
─────────────────────────────────────────────────────────────────
[Data Pipeline]   [Core Logic]      [Integration]     [Polish]
[UI Design]       [UI Layout]       [API ↔ UI Sync]   [Edge Cases]
[Repo Init]       [Algo Logic]      [NFZ Dynamic]     [Deploy]
                                    [Cutover Dummy→Live]
```

---

## 2. Minggu 1 — Fondasi

### 2.1 Tujuan

Membangun landasan proyek: data siap, desain ada, infrastruktur berjalan.
Semua anggota tim dapat mulai bekerja secara paralel di Minggu 2.

### 2.2 Deliverable

| ID | Deliverable | Penanggung Jawab |
|----|-------------|-----------------|
| D1-01 | `data/processed/graph.json` final (subset yang disepakati) | Padil / Integration |
| D1-02 | `data/processed/nfz.json` mock (min. 2 zona) | Padil |
| D1-03 | Script `build_graph.py` berjalan tanpa error | Padil |
| D1-04 | Figma mockup halaman utama (peta + panel kontrol) | UI/UX Designer |
| D1-05 | Monorepo GitHub diinisiasi, branch strategy disetujui | DevOps |
| D1-06 | Vercel project terhubung ke `frontend/` | DevOps |
| D1-07 | Render/Railway project terhubung ke `backend/` | DevOps |
| D1-08 | Keputusan terbuka Minggu 1 dicatat (region, directed/undirected, tile) | PM |

### 2.3 Definisi "Selesai"

- [ ] `graph.json` dapat divalidasi: schema benar, tidak ada IATA tak dikenal, bobot > 0.
- [ ] `nfz.json` dapat diparse tanpa error.
- [ ] Frontend dapat load `graph.json` lokal dan menampilkan marker di peta.
- [ ] Akses URL Vercel (preview branch) menghasilkan halaman tidak error.
- [ ] FastAPI dev server (`uvicorn`) berjalan lokal tanpa error.

---

## 3. Minggu 2 — Inti Logika & Layout

### 3.1 Tujuan

Membangun komponen inti: logika algoritma ter-validasi, layout UI terbentuk.
Pada akhir minggu ini, algoritma bisa diuji secara unit dan UI bisa didemonstrasikan
dengan dummy data.

### 3.2 Deliverable

| ID | Deliverable | Penanggung Jawab |
|----|-------------|-----------------|
| D2-01 | Implementasi Dijkstra custom + unit test lulus | Padil |
| D2-02 | Implementasi A* custom + unit test lulus | Padil |
| D2-03 | NFZ engine (Shapely intersect) + unit test | Padil |
| D2-04 | FastAPI endpoint GET /graph, GET /nfz, POST /route (lokal) | Padil |
| D2-05 | Layout komponen Next.js: MapView, ControlPanel, ResultPanel | Ahnaf |
| D2-06 | `api.ts` selesai — dummy mode berjalan untuk GET data | Ahnaf |
| D2-07 | AirportMarker render semua bandara dari `graph.json` lokal | Ahnaf |
| D2-08 | RouteLayer render path mock statis dari dummy response | Ahnaf |

### 3.3 Definisi "Selesai"

- [ ] `pytest backend/tests/` semua test lulus (Dijkstra, A*, NFZ).
- [ ] Dijkstra(CGK, DPS) dan A*(CGK, DPS) menghasilkan path identik (assertion test).
- [ ] UI menampilkan semua marker bandara dari dummy `graph.json`.
- [ ] UI menampilkan path mock (3 titik, 2 edge) dengan warna hijau.
- [ ] Tidak ada TypeScript error (`tsc --noEmit` bersih).

---

## 4. Minggu 3 — Integrasi & Fitur Dinamis

### 4.1 Tujuan

Menghubungkan frontend Ahnaf ke API Padil. Fitur NFZ dinamis berjalan end-to-end.
Ini adalah minggu **paling kritis** — semua jalur kritis bertemu di sini.

### 4.2 Deliverable

| ID | Deliverable | Penanggung Jawab |
|----|-------------|-----------------|
| D3-01 | Backend deploy ke Render/Railway, URL publik tersedia | DevOps + Padil |
| D3-02 | `NEXT_PUBLIC_API_BASE_URL` diset di Vercel env vars | DevOps |
| D3-03 | **CUTOVER**: `NEXT_PUBLIC_USE_LIVE_API=true` di Vercel | Ahnaf + DevOps |
| D3-04 | `POST /route` end-to-end: origin CGK, dest DPS, algo dijkstra | Ahnaf + Padil |
| D3-05 | NFZ toggle: aktifkan NFZ → rute dikalkulasi ulang otomatis | Ahnaf + Padil |
| D3-06 | NfzLayer render poligon/circle merah di peta | Ahnaf |
| D3-07 | RecalcBadge tampil saat `recalculated=true` | Ahnaf |
| D3-08 | Semua edge case SC-3 diuji (origin==dest, no path, all blocked) | Ahnaf + Padil |

### 4.3 Definisi "Selesai"

- [ ] `POST /route` dari browser menghasilkan path tampil di peta (rute hijau).
- [ ] Toggle NFZ → `isRecalculating=true` → path berubah → badge oranye muncul.
- [ ] Input origin==destination ditolak dengan pesan error di UI.
- [ ] Semua unit test tetap lulus setelah integrasi.
- [ ] Tidak ada error di browser console (network errors, rendering errors).

### 4.4 Rencana Cutover Dummy → Live API

```
FASE A (Minggu 2 — sampai hari ke-14):
  NEXT_PUBLIC_USE_LIVE_API=false
  → Frontend pakai graph.json & nfz.json lokal
  → Ahnaf tidak tergantung Padil

TRANSISI (Minggu 3, hari ke-15):
  Kondisi: D3-01 selesai (API publik tersedia)
  Langkah:
    1. Padil kirim URL API ke Ahnaf (Slack/WA)
    2. Ahnaf set NEXT_PUBLIC_API_BASE_URL di .env.local
    3. Test lokal: NEXT_PUBLIC_USE_LIVE_API=true
    4. Verifikasi semua endpoint (checklist §7 di 03_FRONTEND_SPEC.md)
    5. Jika OK: DevOps update Vercel env vars
    6. Vercel redeploy → CUTOVER SELESAI

FALLBACK:
  Jika API Padil belum siap di hari ke-15:
  → Ahnaf tetap pakai dummy mode
  → Target cutover digeser ke hari ke-17
  → PM mencatat ke risiko aktif
```

---

## 5. Minggu 4 — Penyelesaian & Deploy Final

### 5.1 Tujuan

Bug hunting, validasi edge case, polish UI, deploy final, dan persiapan demo.

### 5.2 Deliverable

| ID | Deliverable | Penanggung Jawab |
|----|-------------|-----------------|
| D4-01 | Bug yang ditemukan di Minggu 3 sudah diperbaiki | Semua |
| D4-02 | Semua 5 success criteria SC-1 s.d. SC-5 ter-verifikasi | PM + Ahnaf + Padil |
| D4-03 | Skenario demo end-to-end dilatih (lihat `05_TASKS.md`) | PM + Semua |
| D4-04 | `README.md` diperbarui dengan instruksi setup & run | DevOps |
| D4-05 | Vercel production URL final dikonfirmasi | DevOps |
| D4-06 | Render/Railway production URL final dikonfirmasi | DevOps |
| D4-07 | Environment variables `.env.example` didokumentasikan | DevOps |

### 5.3 Definisi "Selesai"

- [ ] Demo script (Bagian 3 di `05_TASKS.md`) berjalan mulus tanpa hambatan.
- [ ] Semua 5 success criteria dicentang oleh PM.
- [ ] Tidak ada known bug yang belum di-triage.
- [ ] Aplikasi bisa diakses dari URL Vercel di browser fresh (incognito).

---

## 6. Diagram Dependensi Antar-Tugas

```
[D1-01 graph.json] ──────────────────────────────────→ [D2-07 AirportMarker]
[D1-02 nfz.json] ────────────────────────────────────→ [D2-08 RouteLayer mock]
[D1-05 Repo init] ──→ [D2-05 Layout UI] ─────────────→ [D3-04 POST /route E2E]
[D2-01 Dijkstra] ─┐                                         ↑
[D2-02 A*] ───────┤→ [D2-04 FastAPI /route] → [D3-01 Deploy Backend] ─┘
[D2-03 NFZ engine]┘                                         ↑
                                                    [D3-02 Env vars]
[D1-06 Vercel] ──→ [D2-05 Layout UI] ──→ [D3-03 CUTOVER] ──┘
[D1-07 Render] ──→ [D3-01 Deploy Backend] ─────────────────┘
```

### 6.1 Jalur Kritis

**Jalur kritis** adalah jalur terpanjang — keterlambatan di sini langsung
menggeser tanggal selesai proyek:

```
D1-01 graph.json
  → D2-04 FastAPI /route (local)
    → D3-01 Deploy Backend (public URL)
      → D3-03 CUTOVER (live API)
        → D3-05 NFZ dynamic end-to-end
          → D4-02 SC verification
            → D4-03 Demo rehearsal
```

**Tugas paling berisiko:** D3-01 (deploy backend) dan D3-05 (NFZ dynamic) —
keduanya melibatkan dua anggota tim dan dependency eksternal (layanan cloud).

---

## 7. Kalender Eksekusi

| Hari | Milestone |
|------|-----------|
| H+1–3 | Region dataset diputuskan; `build_graph.py` selesai draft |
| H+5 | `graph.json` + `nfz.json` dikunci (tidak berubah lagi) |
| H+7 | End of Sprint 1 — semua D1-xx selesai |
| H+10 | Dijkstra + A* unit test lulus; Layout UI visible di Vercel preview |
| H+14 | End of Sprint 2 — semua D2-xx selesai |
| **H+15** | **Target cutover dummy → live API** |
| H+17 | NFZ toggle end-to-end berjalan |
| H+21 | End of Sprint 3 — semua D3-xx selesai |
| H+24 | Bug fix selesai |
| H+26 | Demo rehearsal pertama |
| H+28 | **End of Sprint 4 — Demo siap** |
