# 01_DATA_PIPELINE.md — SkyRoute Analytics: Data Pipeline

> **Status:** Ground Truth v1.0
> **Terakhir diperbarui:** 2026-06-09
> **Penanggung jawab:** Integration Specialist + Algorithm Engineer (Padil)

---

## 1. Sumber Data

| Sumber | File | Isi | Akses |
|--------|------|-----|-------|
| OpenFlights | `airports.dat` | ~7.600 bandara: IATA, nama, kota, negara, lat, lon | Unduh langsung, tanpa API key |
| OpenFlights | `routes.dat` | ~67.000 rute: maskapai, origin IATA, dest IATA | Unduh langsung, tanpa API key |
| OurAirports | `airports.csv` | Alternatif koordinat lebih lengkap | Unduh dari ourairports.com |

**URL unduh resmi OpenFlights:**
- `https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat`
- `https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat`

---

## 2. Langkah Ekstraksi & Build Pipeline

Pipeline dijalankan via skrip `data/scripts/build_graph.py`.

### Langkah 1 — Parsing `airports.dat`

Format CSV (tanpa header), field per baris:
```
AirportID, Name, City, Country, IATA, ICAO, Latitude, Longitude,
Altitude, Timezone, DST, TzDatabase, Type, Source
```

Filter:
- Hanya baris dengan `IATA != "\\N"` dan `IATA` tepat 3 karakter.
- `Type == "airport"` (buang helipad, stasiun, dll.).
- **Filter region** (keputusan tim — lihat pertanyaan terbuka): contoh
  `Country in ["Indonesia", "Malaysia", "Singapore", "Thailand", ...]`.

Output: dict `{iata: {name, lat, lon}}`.

### Langkah 2 — Parsing `routes.dat`

Format CSV (tanpa header), field per baris:
```
Airline, AirlineID, SourceAirport, SourceAirportID,
DestAirport, DestAirportID, Codeshare, Stops, Equipment
```

Filter:
- `Stops == "0"` (penerbangan langsung saja; tidak ada transit implisit di data).
- `SourceAirport` dan `DestAirport` keduanya ada di dict bandara hasil Langkah 1.
- Buang duplikat pasangan `(source, dest)`.

### Langkah 3 — Hitung Bobot Haversine

Untuk setiap pasangan `(source_iata, dest_iata)` yang lolos filter, hitung jarak
great-circle menggunakan rumus haversine (lihat Bagian 4).

Bobot `w = haversine(lat1, lon1, lat2, lon2)` dalam satuan **kilometer**.

### Langkah 4 — Fallback Subset Top-N

Jika jumlah bandara melebihi threshold (default `N=150`):
1. Hitung degree setiap node (jumlah edge terhubung).
2. Ambil top-N bandara berdasarkan degree tertinggi (hub utama).
3. Filter ulang edge: hanya edge di mana *kedua* endpoint masuk top-N.

```python
# Pseudocode fallback
degree = Counter()
for src, dst in edges:
    degree[src] += 1
    degree[dst] += 1
top_airports = {iata for iata, _ in degree.most_common(N)}
nodes = {iata: data for iata, data in all_nodes.items() if iata in top_airports}
edges = [(s, d, w) for s, d, w in all_edges if s in top_airports and d in top_airports]
```

### Langkah 5 — Serialisasi ke `graph.json`

Output ditulis ke `data/processed/graph.json` dan dicopy ke
`frontend/public/data/graph.json`.

---

## 3. Skema `graph.json`

### 3.1 Struktur

```json
{
  "nodes": [
    {
      "iata": "string (3 karakter, unik)",
      "name": "string (nama lengkap bandara)",
      "lat":  "number (desimal, WGS-84)",
      "lon":  "number (desimal, WGS-84)"
    }
  ],
  "edges": [
    {
      "from":   "string (IATA node asal)",
      "to":     "string (IATA node tujuan)",
      "weight": "number (jarak km, presisi 2 desimal)"
    }
  ]
}
```

### 3.2 Contoh Minimal (3 Node, 2 Edge)

```json
{
  "nodes": [
    { "iata": "CGK", "name": "Soekarno-Hatta International Airport", "lat": -6.1256,  "lon": 106.6558 },
    { "iata": "SUB", "name": "Juanda International Airport",         "lat": -7.3798,  "lon": 112.7870 },
    { "iata": "DPS", "name": "Ngurah Rai International Airport",     "lat": -8.7482,  "lon": 115.1670 }
  ],
  "edges": [
    { "from": "CGK", "to": "SUB", "weight": 664.83 },
    { "from": "SUB", "to": "DPS", "weight": 174.41 }
  ]
}
```

### 3.3 Aturan Validasi

- `iata` pada setiap edge **wajib** ada di array `nodes`.
- `weight` selalu positif (> 0).
- Tidak ada edge self-loop (`from != to`).
- Untuk graf undirected: jika edge `(A, B)` ada, edge `(B, A)` **tidak** perlu
  diduplikasi di JSON — backend membangun adjacency undirected dari satu arah saja.

---

## 4. Rumus Haversine

### 4.1 Penurunan Rumus

Haversine formula menghitung jarak terpendek antara dua titik di permukaan bola
berdasarkan selisih lintang dan bujur dalam koordinat sferis.

Diberikan dua titik:
- P₁ = (φ₁, λ₁) — lintang dan bujur titik 1 (dalam radian)
- P₂ = (φ₂, λ₂) — lintang dan bujur titik 2 (dalam radian)

**Definisi fungsi haversine:**
```
hav(θ) = sin²(θ/2)
```

**Langkah penurunan:**

1. Hitung perbedaan koordinat:
   ```
   Δφ = φ₂ − φ₁
   Δλ = λ₂ − λ₁
   ```

2. Terapkan identitas haversine pada segitiga sferis:
   ```
   a = hav(Δφ) + cos(φ₁) · cos(φ₂) · hav(Δλ)
     = sin²(Δφ/2) + cos(φ₁) · cos(φ₂) · sin²(Δλ/2)
   ```

3. Hitung sudut pusat (central angle) c:
   ```
   c = 2 · arcsin(√a)
   ```

4. Hitung jarak d dengan jari-jari bumi R = 6371 km:
   ```
   d = R · c
   ```

**Rumus lengkap dalam satu ekspresi:**
```
d = 2R · arcsin( √[ sin²((φ₂−φ₁)/2) + cos(φ₁)·cos(φ₂)·sin²((λ₂−λ₁)/2) ] )
```

### 4.2 Implementasi Python

```python
import math

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return round(R * c, 2)
```

### 4.3 Contoh Perhitungan: CGK → SUB

| Parameter | Nilai |
|-----------|-------|
| CGK lat/lon | −6.1256°, 106.6558° |
| SUB lat/lon | −7.3798°, 112.7870° |
| φ₁ (rad) | −0.10692 |
| φ₂ (rad) | −0.12880 |
| Δφ (rad) | −0.02188 |
| Δλ (rad) | 0.10712 |
| sin²(Δφ/2) | 0.00012 |
| cos(φ₁)·cos(φ₂)·sin²(Δλ/2) | 0.00287 |
| a | 0.00299 |
| c (rad) | 0.10916 |
| **d (km)** | **664.83** |

---

## 5. Skema `nfz.json`

NFZ (No-Fly Zone) direpresentasikan sebagai array zona. Setiap zona dapat berupa:
- **Poligon GeoJSON** — bentuk bebas (direkomendasikan).
- **Lingkaran** — center + radius (alternatif sederhana).

### 5.1 Struktur Skema

```json
{
  "nfz_zones": [
    {
      "id":   "string (unik, slug)",
      "name": "string (label tampil di UI)",
      "type": "polygon | circle",
      "active": "boolean",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [ [lon, lat], [lon, lat], ... ]
        ]
      }
    },
    {
      "id":   "string",
      "name": "string",
      "type": "circle",
      "active": "boolean",
      "geometry": {
        "type": "Point",
        "coordinates": [lon, lat],
        "radius_km": "number"
      }
    }
  ]
}
```

> **Catatan urutan koordinat GeoJSON:** `[longitude, latitude]` (bukan lat/lon).
> Ini standar GeoJSON RFC 7946. Shapely dan Leaflet mengikuti standar ini.

### 5.2 Contoh `nfz.json`

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
        "coordinates": [[
          [108.0, -4.5],
          [112.0, -4.5],
          [112.0, -6.0],
          [108.0, -6.0],
          [108.0, -4.5]
        ]]
      }
    },
    {
      "id": "nfz-bali-strait",
      "name": "Latihan Udara Selat Bali",
      "type": "circle",
      "active": false,
      "geometry": {
        "type": "Point",
        "coordinates": [114.5, -8.2],
        "radius_km": 80
      }
    }
  ]
}
```

---

## 6. Strategi Fallback Data Berlebihan

### 6.1 Threshold & Parameter

| Parameter | Nilai Default | Keterangan |
|-----------|---------------|------------|
| `MAX_NODES` | 150 | Batas bandara agar rendering peta nyaman |
| `MAX_EDGES` | 800 | Batas edge agar algoritma <2 detik |
| Metrik seleksi | Degree (jumlah koneksi) | Hub utama lebih representatif |

### 6.2 Strategi Bertingkat

```
1. Filter region (hardcoded, mis. Asia Tenggara)
        ↓ jika masih > MAX_NODES
2. Top-N berdasarkan degree tertinggi
        ↓ jika masih > MAX_EDGES
3. Prune edge: hapus edge bobot terbesar (rute sangat panjang) hingga batas
        ↓ verifikasi
4. Pastikan graf connected (BFS dari CGK) — jika tidak, tambah bandara hub
   sampai seluruh komponen terhubung
```

### 6.3 Validasi Akhir Pipeline

Sebelum menulis `graph.json` final, skrip wajib mencetak ringkasan:
```
[BUILD] Nodes : 143
[BUILD] Edges : 712
[BUILD] Connected components: 1   ← harus 1
[BUILD] Avg degree: 9.96
[BUILD] Output: data/processed/graph.json  ✓
```

---

## 7. Pertanyaan Terbuka untuk Tim

> Harus dijawab sebelum Langkah 1 pipeline dieksekusi.

1. **Region subset final**: Domestik Indonesia saja, atau Asia Tenggara?
   Rekomendasi: mulai dengan Indonesia + Singapore + Malaysia untuk keseimbangan
   ukuran dan keterbacaan peta.

2. **Directed atau Undirected?**: Apakah `routes.dat` diperlakukan sebagai graf
   berarah (sesuai arah penerbangan asli) atau tidak berarah? Implikasi:
   - Undirected → lebih sederhana, bobot simetris.
   - Directed → lebih akurat tapi perlu verifikasi jalur pulang.

3. **Threshold N**: Apakah `MAX_NODES=150` sudah disetujui, atau perlu disesuaikan
   setelah melihat performa browser?

4. **Format lingkaran NFZ**: Backend Shapely perlu mengkonversi `circle` menjadi
   poligon aproksimasi. Berapa segmen aproksimasi yang cukup? (Default: 64 titik.)

5. **Sinkronisasi `graph.json`**: Kapan Padil mengunci versi `graph.json` final
   agar Ahnaf bisa mulai coding frontend dengan data stabil?
