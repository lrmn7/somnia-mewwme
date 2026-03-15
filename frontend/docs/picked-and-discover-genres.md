# picked for you & discover genres — dokumentasi fitur

> dokumen ini menjelaskan cara kerja fitur **"picked for you"** dan **"discover genres"** pada dashboard frontend mewwme, termasuk sumber data, logika pencarian, alur data, dan pseudocode ilustratif.

---

## daftar isi

1. [penjelasan sederhana](#1-penjelasan-sederhana)
2. [sumber data lagu](#2-sumber-data-lagu)
3. [logika pencarian & pemeringkatan (langkah demi langkah)](#3-logika-pencarian--pemeringkatan)
4. [alur data (dataflow)](#4-alur-data-dataflow)
5. [pseudocode & contoh query](#5-pseudocode--contoh-query)
6. [daftar file & endpoint untuk verifikasi](#6-daftar-file--endpoint-untuk-verifikasi)
7. [fitur tambahan: top tracks today](#7-fitur-tambahan-top-tracks-today)
8. [asumsi yang dibuat](#8-asumsi-yang-dibuat)

---

## 1. penjelasan sederhana

### picked for you

bayangkan kamu sedang mendengarkan lagu "blinding lights" dari the weeknd. fitur ini otomatis bertanya ke layanan musik: *"lagu apa yang mirip dengan blinding lights? artis apa yang mirip dengan the weeknd?"* lalu menampilkan daftar lagu yang cocok untukmu.

secara singkat:
- fitur ini **hanya muncul saat kamu sedang memutar lagu**
- lagu yang ditampilkan **berubah** setiap kali kamu ganti lagu yang sedang diputar
- semakin populer lagumu, semakin banyak rekomendasi yang muncul
- kamu bisa klik lagu rekomendasi untuk langsung menambahkannya ke antrian

### discover genres

fitur ini menampilkan tombol-tombol genre musik (contoh: rock, pop, hip-hop, electronic, jazz, dll). ketika kamu klik salah satu genre, sistem menampilkan lagu-lagu terpopuler dari genre tersebut.

secara singkat:
- menampilkan **30 genre teratas** yang sedang tren di seluruh dunia
- setiap genre ditampilkan sebagai tombol berwarna-warni
- klik genre → muncul daftar **25 lagu terpopuler** dari genre itu
- kamu bisa klik lagu untuk langsung memutarnya

---

## 2. sumber data lagu

### picked for you

| sumber | kegunaan | tipe |
|--------|----------|------|
| **last.fm api** (`track.getSimilar`) | mendapatkan lagu-lagu mirip berdasarkan judul & artis yang sedang diputar | api publik (butuh api key) |
| **last.fm api** (`artist.getSimilar`) | mendapatkan artis-artis yang mirip | api publik (butuh api key) |
| **last.fm api** (`artist.getTopTracks`) | mendapatkan lagu terpopuler dari artis mirip (pelengkap) | api publik (butuh api key) |
| **itunes search api** | mencari gambar sampul album (artwork) | api publik (gratis, tanpa key) |
| **deezer search api** | cadangan pencarian gambar sampul album jika itunes gagal | api publik (gratis, tanpa key) |

### discover genres

| sumber | kegunaan | tipe |
|--------|----------|------|
| **last.fm api** (`chart.getTopTags`) | mendapatkan 30 genre/tag musik teratas | api publik (butuh api key) |
| **last.fm api** (`tag.getTopTracks`) | mendapatkan 30 lagu terpopuler per genre | api publik (butuh api key) |
| **itunes search api** | mencari gambar sampul album | api publik (gratis, tanpa key) |
| **deezer search api** | cadangan pencarian gambar sampul album | api publik (gratis, tanpa key) |

### catatan penting
- **last.fm** adalah sumber utama untuk kedua fitur — menyediakan data tentang kemiripan lagu, artis, dan genre
- **itunes & deezer** hanya digunakan untuk mengambil gambar cover album (bukan lagu itu sendiri)
- ketika pengguna klik lagu untuk diputar, lagu diputar melalui **lavalink** (server pemutar musik) yang bisa mencari di youtube, spotify, soundcloud, dll

---

## 3. logika pencarian & pemeringkatan

### picked for you — langkah demi langkah

```
langkah 1: ambil info lagu yang sedang diputar
    → judul: "blinding lights"
    → artis: "the weeknd"

langkah 2: bersihkan judul dari kata yang tidak perlu
    → hapus teks seperti "(official video)", "[lyrics]", "(audio)", "VEVO", "- topic"
    → contoh: "The Weeknd - Blinding Lights (Official Video)" → judul: "Blinding Lights", artis: "The Weeknd"
    → jika judul youtube memiliki format "artis - judul", pisahkan keduanya

langkah 3: kirim permintaan ke backend
    → GET /api/recommendations?track=Blinding Lights&artist=The Weeknd

langkah 4: backend cek cache (memori sementara)
    → jika data masih segar (< 10 menit), langsung kembalikan
    → jika tidak, lanjut ke langkah 5

langkah 5: backend minta data ke last.fm secara paralel (bersamaan)
    → permintaan 1: track.getSimilar (15 lagu mirip)
    → permintaan 2: artist.getSimilar (8 artis mirip)

langkah 6: kumpulkan lagu dari hasil track.getSimilar
    → setiap lagu mirip langsung masuk daftar
    → duplikat dibuang (berdasarkan kombinasi judul + artis, huruf kecil)

langkah 7: jika daftar belum 25, ambil lagu populer dari artis mirip
    → untuk setiap artis mirip (maksimal 6 artis):
        → panggil artist.getTopTracks
        → tambahkan lagu ke daftar (buang duplikat)
    → berhenti saat daftar mencapai 25 lagu

langkah 8: cari gambar sampul album untuk setiap lagu
    → untuk setiap lagu (maks 25, secara paralel):
        → coba itunes search: "{artis} {judul}" → ambil artwork 600x600
        → jika gagal, coba deezer search: "{artis} {judul}"
        → jika masih gagal, coba lagi dengan judul saja
        → jika tetap gagal, biarkan tanpa gambar

langkah 9: simpan ke cache (berlaku 10 menit)

langkah 10: kirim hasilnya ke frontend
    → format: [{title, artist, thumbnail, searchQuery}, ...]
```

### discover genres — langkah demi langkah

#### mengambil daftar genre:

```
langkah 1: saat halaman player dimuat, frontend otomatis minta daftar genre
    → GET /api/top-tags

langkah 2: backend cek cache
    → jika cache masih segar (< 1 jam), langsung kembalikan
    → jika tidak, lanjut ke langkah 3

langkah 3: backend minta data ke last.fm
    → chart.getTopTags → ambil 30 tag teratas
    → setiap tag berisi: nama genre + reach (seberapa populer)

langkah 4: simpan ke cache (berlaku 1 jam)

langkah 5: kirim ke frontend
    → format: [{name: "rock", reach: 123456}, {name: "pop", reach: 98765}, ...]
```

#### mengambil lagu per genre (saat pengguna klik genre):

```
langkah 1: pengguna klik tombol genre, misal "rock"
    → GET /api/tag-tracks?tag=rock

langkah 2: backend cek cache
    → jika cache untuk "rock" masih segar (< 30 menit), langsung kembalikan
    → jika tidak, lanjut ke langkah 3

langkah 3: backend minta data ke last.fm
    → tag.getTopTracks (tag: "rock", limit: 30)
    → filter hanya lagu yang punya nama & artis

langkah 4: cari gambar sampul album (sama seperti picked for you)
    → itunes search → deezer search → fallback judul saja
    → proses ini berjalan paralel untuk 25 lagu sekaligus

langkah 5: simpan ke cache (berlaku 30 menit)

langkah 6: kirim ke frontend
    → format: [{title, artist, thumbnail, searchQuery}, ...]
```

### pemeringkatan (ranking)

- **picked for you**: urutan ditentukan oleh **last.fm** — lagu yang paling mirip secara musikal (berdasarkan data pendengar last.fm) muncul lebih dulu. lagu dari `track.getSimilar` diprioritaskan, baru kemudian lagu populer dari artis mirip.
- **discover genres**: urutan ditentukan oleh **last.fm** — genre diurutkan berdasarkan `reach` (popularitas global). lagu per genre diurutkan berdasarkan popularitas di last.fm.

---

## 4. alur data (dataflow)

### picked for you

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (browser)                       │
│                                                                 │
│  PlayerPage                                                     │
│    └─ PersonalRecommendations                                   │
│         │                                                       │
│         │ 1. deteksi lagu yang sedang diputar                   │
│         │ 2. bersihkan judul & artis dari teks youtube           │
│         │ 3. GET /api/recommendations?track=...&artist=...      │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │ (http request via axios)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (fastify server)                   │
│                                                                 │
│  DashboardPlugin.ts → route: /api/recommendations               │
│         │                                                       │
│         ├─ cek cache (10 menit)                                 │
│         │   └─ jika ada & masih segar → langsung kembalikan     │
│         │                                                       │
│         ├─ panggil last.fm (paralel):                           │
│         │   ├─ track.getSimilar(track, artist, limit=15)        │
│         │   └─ artist.getSimilar(artist, limit=8)               │
│         │                                                       │
│         ├─ kumpulkan lagu mirip (maks 25, buang duplikat)       │
│         │                                                       │
│         ├─ jika kurang dari 25:                                 │
│         │   └─ artist.getTopTracks untuk setiap artis mirip     │
│         │                                                       │
│         ├─ cari artwork (paralel):                              │
│         │   ├─ itunes search api                                │
│         │   └─ deezer search api (fallback)                     │
│         │                                                       │
│         └─ simpan cache, kirim response                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  EXTERNAL APIS                                                  │
│                                                                 │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   last.fm api   │  │  itunes api  │  │  deezer api  │        │
│  │ (data lagu &    │  │ (gambar      │  │ (gambar      │        │
│  │  kemiripan)     │  │  sampul)     │  │  sampul)     │        │
│  └────────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (browser)                       │
│                                                                 │
│  PersonalRecommendations                                        │
│    └─ tampilkan carousel horizontal                             │
│         ├─ gambar sampul album (dari itunes/deezer)             │
│         ├─ judul lagu                                           │
│         ├─ nama artis                                           │
│         └─ klik → putar lagu (searchQuery dikirim ke backend)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### discover genres

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (browser)                       │
│                                                                 │
│  PlayerPage                                                     │
│    └─ GenreCharts                                               │
│         │                                                       │
│         │ 1. saat halaman dimuat:                               │
│         │    GET /api/top-tags                                  │
│         │    → tampilkan tombol-tombol genre                    │
│         │                                                       │
│         │ 2. saat klik genre:                                   │
│         │    GET /api/tag-tracks?tag={genre}                    │
│         │    → tampilkan carousel lagu                          │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (fastify server)                   │
│                                                                 │
│  DashboardPlugin.ts                                             │
│         │                                                       │
│         ├─ /api/top-tags:                                       │
│         │   ├─ cek cache (1 jam)                                │
│         │   └─ last.fm chart.getTopTags → 30 genre              │
│         │                                                       │
│         ├─ /api/tag-tracks?tag=rock:                            │
│         │   ├─ cek cache (30 menit)                             │
│         │   ├─ last.fm tag.getTopTracks (limit: 30)             │
│         │   ├─ cari artwork (itunes → deezer)                   │
│         │   └─ kembalikan 25 lagu                               │
│         │                                                       │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  EXTERNAL APIS                                                  │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   last.fm api   │  │  itunes api  │  │  deezer api  │        │
│  └────────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. pseudocode & contoh query

### picked for you — pseudocode

```
fungsi dapatkanRekomendasi(judulLagu, namaArtis):
    // cek cache dulu
    kunciCache = hurufKecil(judulLagu) + "::" + hurufKecil(namaArtis)
    jika cache[kunciCache] ada DAN belum kadaluarsa (< 10 menit):
        kembalikan cache[kunciCache]

    // minta data ke last.fm secara paralel
    laguMirip = last.fm.track.getSimilar(
        track = judulLagu,
        artist = namaArtis,
        limit = 15
    )

    artisMirip = last.fm.artist.getSimilar(
        artist = namaArtis,
        limit = 8
    )

    // kumpulkan hasil, buang duplikat
    daftarLagu = []
    sudahAda = set()

    untuk setiap lagu di laguMirip:
        kunci = hurufKecil(lagu.judul + "::" + lagu.artis)
        jika kunci belum ada di sudahAda:
            tambah lagu ke daftarLagu
            tandai kunci di sudahAda

    // lengkapi dari top tracks artis mirip
    jika jumlah(daftarLagu) < 25:
        untuk setiap artis di artisMirip (maks 6):
            topLagu = last.fm.artist.getTopTracks(artist = artis.nama)
            untuk setiap lagu di topLagu:
                jika jumlah(daftarLagu) >= 25: berhenti
                jika belum ada di sudahAda:
                    tambah ke daftarLagu

    // cari gambar sampul album (paralel)
    untuk setiap lagu di daftarLagu (maks 25, paralel):
        lagu.gambar = cariArtwork(lagu.artis, lagu.judul)

    // simpan ke cache
    cache[kunciCache] = {data: daftarLagu, kadaluarsa: sekarang + 10 menit}

    kembalikan daftarLagu


fungsi cariArtwork(artis, judul):
    coba:
        hasil = itunes.search(artis + " " + judul)
        jika hasil ada: kembalikan hasil.artwork (ukuran 600x600)
    tangkap error: lewati

    coba:
        hasil = deezer.search(artis + " " + judul)
        jika hasil ada: kembalikan hasil.album.cover_big
    tangkap error: lewati

    coba:
        hasil = itunes.search(judul)  // coba judul saja
        jika hasil ada: kembalikan hasil.artwork
    tangkap error: lewati

    coba:
        hasil = deezer.search(judul)
        jika hasil ada: kembalikan hasil.album.cover_big
    tangkap error: lewati

    kembalikan null  // tidak ada gambar
```

### discover genres — pseudocode

```
fungsi dapatkanGenre():
    jika cache.topTags ada DAN belum kadaluarsa (< 1 jam):
        kembalikan cache.topTags

    tags = last.fm.chart.getTopTags()
    ambil 30 pertama
    cache.topTags = {data: tags, kadaluarsa: sekarang + 1 jam}
    kembalikan tags


fungsi dapatkanLaguGenre(namaGenre):
    kunci = hurufKecil(namaGenre)
    jika cache[kunci] ada DAN belum kadaluarsa (< 30 menit):
        kembalikan cache[kunci]

    lagu = last.fm.tag.getTopTracks(tag = namaGenre, limit = 30)
    filter hanya yang punya nama dan artis

    untuk setiap lagu (maks 25, paralel):
        lagu.gambar = cariArtwork(lagu.artis, lagu.judul)

    cache[kunci] = {data: lagu[:25], kadaluarsa: sekarang + 30 menit}
    kembalikan lagu[:25]
```

### contoh query last.fm api

```
# mendapatkan lagu mirip
GET https://ws.audioscrobbler.com/2.0/
    ?method=track.getSimilar
    &track=Blinding Lights
    &artist=The Weeknd
    &limit=15
    &api_key=YOUR_API_KEY
    &format=json
    &autocorrect=1

# mendapatkan artis mirip
GET https://ws.audioscrobbler.com/2.0/
    ?method=artist.getSimilar
    &artist=The Weeknd
    &limit=8
    &api_key=YOUR_API_KEY
    &format=json
    &autocorrect=1

# mendapatkan genre teratas
GET https://ws.audioscrobbler.com/2.0/
    ?method=chart.getTopTags
    &api_key=YOUR_API_KEY
    &format=json

# mendapatkan lagu terpopuler per genre
GET https://ws.audioscrobbler.com/2.0/
    ?method=tag.getTopTracks
    &tag=rock
    &limit=30
    &api_key=YOUR_API_KEY
    &format=json

# mendapatkan lagu terpopuler dari artis
GET https://ws.audioscrobbler.com/2.0/
    ?method=artist.getTopTracks
    &artist=Dua Lipa
    &limit=5
    &api_key=YOUR_API_KEY
    &format=json
```

### contoh query artwork

```
# itunes search
GET https://itunes.apple.com/search
    ?term=The Weeknd Blinding Lights
    &media=music
    &limit=1
→ ambil results[0].artworkUrl100, ganti "100x100" → "600x600"

# deezer search (fallback)
GET https://api.deezer.com/search
    ?q=The Weeknd Blinding Lights
    &limit=1
→ ambil data[0].album.cover_big
```

---

## 6. daftar file & endpoint untuk verifikasi

### file frontend

| file | fungsi |
|------|--------|
| `frontend/src/components/dashboard/PersonalRecommendations.tsx` | komponen "picked for you" — ui, pembersihan judul, pemanggilan api |
| `frontend/src/components/dashboard/GenreCharts.tsx` | komponen "discover genres" — ui, daftar genre, lagu per genre |
| `frontend/src/components/dashboard/RecommendedSection.tsx` | komponen "top tracks today" — chart harian (terkait tapi berbeda) |
| `frontend/src/pages/PlayerPage.tsx` | halaman utama player — menampung ketiga komponen di atas |
| `frontend/src/types/player.ts` | definisi tipe `ChartTrack`, `Track`, `SearchResult`, dll |
| `frontend/src/lib/api.ts` | konfigurasi axios (base url, credentials) |
| `frontend/src/lib/config.ts` | variabel environment (BACKEND_URL) |
| `frontend/src/hooks/usePlayer.ts` | hook player — mengontrol play, queue, dll |

### file backend

| file | fungsi |
|------|--------|
| `backend/src/web/dashboard/DashboardPlugin.ts` | **file utama** — semua route `/api/*` termasuk recommendations, top-tags, tag-tracks, top-chart |
| `backend/src/services/SpotifyTopChartService.ts` | service untuk mengambil data chart dari chartguru (digunakan oleh top-chart) |
| `backend/src/web/RestAPI.ts` | inisialisasi server fastify dan registrasi dashboard plugin |
| `backend/config.yml` | konfigurasi api key last.fm (`features.WebServer.LAST_FM_SCROBBLED.ApiKey`) |
| `backend/config.example.yml` | contoh konfigurasi |

### endpoint backend

| endpoint | method | fungsi |
|----------|--------|--------|
| `/api/recommendations?track=...&artist=...` | GET | rekomendasi personal (picked for you) |
| `/api/top-tags` | GET | daftar 30 genre teratas (discover genres) |
| `/api/tag-tracks?tag=...` | GET | lagu terpopuler per genre (discover genres) |
| `/api/top-chart?country=...` | GET | chart lagu harian per negara (top tracks today) |
| `/api/recommended` | GET | chart lagu berdasarkan accept-language header |
| `/api/search?query=...&source=...` | GET | pencarian lagu (digunakan saat user klik lagu rekomendasi) |
| `/api/player/:guildId` | PATCH | menambahkan lagu ke antrian (action: addTrack) |

---

## 7. fitur tambahan: top tracks today

selain "picked for you" dan "discover genres", ada satu fitur terkait yaitu **"top tracks today"** (`RecommendedSection.tsx`).

- menampilkan **50 lagu terpopuler** dari chart spotify untuk negara pengguna
- sumber data: **chartguru api** (`chartguru.vercel.app`) → mengambil data chart spotify
- cache: **6 jam**
- deteksi negara: berdasarkan timezone browser (contoh: `Asia/Jakarta` → Indonesia)
- jika negara tidak tersedia, fallback ke chart "global"
- setiap lagu menampilkan badge ranking (#1, #2, #3, ...)

---

## 8. asumsi yang dibuat

1. **last.fm api key**: diasumsikan bahwa api key last.fm sudah dikonfigurasi di `config.yml` pada path `features.WebServer.LAST_FM_SCROBBLED.ApiKey`. jika key tidak ada, semua fitur "picked for you" dan "discover genres" akan mengembalikan array kosong (tidak error, tapi tidak menampilkan data).

2. **chartguru api**: diasumsikan bahwa layanan `chartguru.vercel.app` adalah api publik/third-party yang menyediakan data chart spotify. tidak ditemukan konfigurasi api key untuk layanan ini di backend — kemungkinan api ini gratis dan publik.

3. **cara lagu diputar**: ketika pengguna klik lagu dari rekomendasi atau genre, frontend mengirimkan `searchQuery` (format: `"artis - judul"`) atau `spotify_url` ke fungsi `onAddToQueue()`. diasumsikan fungsi ini memanggil endpoint backend yang kemudian meneruskan pencarian ke lavalink (server pemutar musik) untuk menemukan dan memutar lagu dari sumber yang tersedia (youtube, spotify, dll).

4. **endpoint internal**: route `/api/*` di `DashboardPlugin.ts` beberapa berfungsi sebagai proxy ke route `/v1/*` di `RestAPI.ts`. contoh: `/api/search` meneruskan ke `/v1/search` → `getSearch.ts`. diasumsikan ini adalah pola arsitektur untuk memisahkan autentikasi session (dashboard) dari autentikasi token (api internal).

5. **caching**: semua cache bersifat **in-memory** (disimpan di variabel/map dalam proses node.js). diasumsikan cache akan hilang saat server di-restart. tidak ditemukan penggunaan redis atau mekanisme cache persisten untuk fitur-fitur ini.

6. **itunes & deezer api**: diasumsikan kedua api ini gratis, tanpa batas rate yang ketat, dan tidak memerlukan api key. digunakan murni untuk mendapatkan gambar sampul album.

7. **urutan prioritas rekomendasi**: tidak ditemukan logika pemeringkatan khusus di backend — urutan sepenuhnya bergantung pada urutan kembalian dari api last.fm. diasumsikan last.fm sudah mengurutkan berdasarkan relevansi/kemiripan.

8. **pembersihan judul youtube**: logika pembersihan judul (menghapus "[official video]", "VEVO", dll) hanya terjadi di **frontend** (`PersonalRecommendations.tsx`), bukan di backend. diasumsikan ini cukup untuk menghasilkan query yang akurat ke last.fm.

---

## ringkasan singkat

| fitur | sumber utama | jumlah item | cache | trigger |
|-------|-------------|-------------|-------|---------|
| picked for you | last.fm (similar tracks + artists) | maks 25 lagu | 10 menit | otomatis saat lagu berubah |
| discover genres (daftar genre) | last.fm (top tags chart) | 30 genre | 1 jam | otomatis saat halaman dimuat |
| discover genres (lagu per genre) | last.fm (top tracks per tag) | maks 25 lagu | 30 menit | saat user klik genre |
| top tracks today | chartguru/spotify | maks 50 lagu | 6 jam | otomatis saat halaman dimuat |
