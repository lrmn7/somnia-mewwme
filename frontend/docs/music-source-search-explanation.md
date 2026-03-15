# penjelasan proses pencarian & pemutaran lagu dari "picked for you" dan "discover genres"

> dokumen ini menjelaskan secara detail apa yang terjadi di balik layar ketika pengguna menekan tombol **play** pada lagu dari menu **"picked for you"** dan **"discover genres"** di dashboard mewwme.

---

## daftar isi

1. [ringkasan singkat untuk orang awam](#1-ringkasan-singkat-untuk-orang-awam)
2. [alur lengkap dari klik sampai lagu diputar](#2-alur-lengkap-dari-klik-sampai-lagu-diputar)
3. [apakah backend mencari ke satu sumber atau banyak sumber?](#3-apakah-backend-mencari-ke-satu-sumber-atau-banyak-sumber)
4. [perbedaan antara jalur "add to queue" dan jalur "search bar"](#4-perbedaan-antara-jalur-add-to-queue-dan-jalur-search-bar)
5. [proses resolusi lagu saat diputar (playback resolution)](#5-proses-resolusi-lagu-saat-diputar-playback-resolution)
6. [diagram alur lengkap](#6-diagram-alur-lengkap)
7. [daftar file penting dan perannya](#7-daftar-file-penting-dan-perannya)
8. [catatan teknis tambahan](#8-catatan-teknis-tambahan)

---

## 1. ringkasan singkat untuk orang awam

bayangkan kamu sedang melihat lagu rekomendasi di dashboard, lalu kamu klik salah satu lagu. ini yang terjadi:

1. **frontend** (halaman web) mengirim nama lagu ke **backend** (server bot)
2. **backend** mengambil nama lagu itu dan bertanya ke **spotify**: *"cari lagu ini dong"*
3. spotify menemukan lagunya → informasi lagu dikirim balik → lagu ditambahkan ke antrian
4. saat tiba giliran lagu diputar, server musik (**lavalink**) mencari **stream yang bisa diputar** — di sini baru terjadi pencarian ke sumber lain jika perlu

**kesimpulan:** pencarian awal hanya dilakukan ke **satu sumber (spotify)**. pencarian ke sumber lain (youtube, dll.) baru terjadi saat lagu benar-benar diputar, sebagai cadangan.

---

## 2. alur lengkap dari klik sampai lagu diputar

### langkah 1: pengguna klik lagu di frontend

#### dari "picked for you" (`PersonalRecommendations.tsx`)

ketika pengguna klik lagu rekomendasi, yang dikirim adalah **teks pencarian** dalam format:

```
"The Weeknd - Blinding Lights"
```

kode yang menjalankan ini:
```
handlePlay(track) → onAddToQueue([track.searchQuery])
```

di mana `track.searchQuery` berisi `"artis - judul lagu"` (dikirim dari backend sebelumnya saat mengambil rekomendasi).

#### dari "discover genres" (`GenreCharts.tsx`)

sama persis — yang dikirim juga **teks pencarian**:

```
"Nirvana - Smells Like Teen Spirit"
```

#### dari "top tracks today" (`RecommendedSection.tsx`)

yang dikirim sedikit berbeda — berupa **url spotify**:

```
"https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b"
```

### langkah 2: frontend memanggil `handleSearchAdd()`

fungsi `handleSearchAdd()` di `PlayerPage.tsx` melakukan:

1. cek apakah pengguna sudah di voice channel → jika belum, tampilkan error
2. jika belum ada player aktif → buat player baru (`POST /api/player`)
3. kirim lagu ke antrian → `controls.addToQueue(uris)`

### langkah 3: `addToQueue()` mengirim PATCH ke backend

```
PATCH /api/player/{guildId}
body: { add: ["The Weeknd - Blinding Lights"] }
```

ini yang terjadi di `usePlayer.ts`:
```
addToQueue(uris) → guardedPatch({ add: uris })
                 → api.patch(`/api/player/${guildId}`, { add: uris })
```

### langkah 4: dashboard plugin meneruskan ke api internal

`DashboardPlugin.ts` menerima `PATCH /api/player/:guildId` dan meneruskannya ke api internal bot:

```
PATCH http://127.0.0.1:{port}/v1/players/{guildId}
body: { add: ["The Weeknd - Blinding Lights"] }
header: user-id: {discord user id}
```

### langkah 5: `patchControl.ts` menangani permintaan "add"

ini adalah file utama yang menjalankan logika pencarian lagu. berikut yang terjadi:

#### a. validasi input
- cek apakah `add` berisi array
- cek setiap item tidak kosong, bukan "null"/"undefined", minimal 3 karakter

#### b. cek akses sumber (hanya untuk url)
- jika input berupa **url** (misal `https://open.spotify.com/...`):
  - deteksi sumber dari hostname (spotify.com → spotify, youtube.com → youtube, dll)
  - cek apakah sumber tersebut diizinkan di server (berdasarkan level akses)
  - contoh: youtube/youtube music membutuhkan **premium**, sedangkan spotify/deezer/soundcloud **gratis** untuk semua
- jika input berupa **teks biasa** (misal `"The Weeknd - Blinding Lights"`):
  - **tidak ada pengecekan akses sumber** — langsung lanjut

#### c. normalisasi url spotify
- jika input adalah url spotify → diubah ke format internal:
  - `https://open.spotify.com/track/abc123` → `spotify:track:abc123`
- jika input bukan url spotify → tidak diubah

#### d. tentukan search engine
- jika input adalah spotify uri/search → gunakan engine `"spotify"` secara eksplisit
- jika input adalah **teks biasa** → **tidak ada engine yang ditentukan** → engine = `undefined`

#### e. jalankan pencarian (`searchWithRetry`)
- panggil `mewslink.search(query, options)`
- jika gagal karena masalah jaringan → coba lagi sampai **3 kali** (jeda 600ms, 1200ms)
- jika gagal karena alasan lain → langsung berhenti

### langkah 6: `mewslink.search()` — inti pencarian

ini adalah bagian terpenting. ada **2 lapisan** yang bekerja:

#### lapisan 1: spotify plugin (pembungkus)

spotify plugin mengganti fungsi `search()` asli mewslink dengan versinya sendiri:

```
search(query, options):
    hasil = panggil search asli(query, options)    ← kirim ke lavalink
    jika hasil kosong:
        coba searchDirect(query, options)           ← cari di spotify api langsung
    kembalikan hasil
```

#### lapisan 2: search asli mewslink

karena tidak ada engine yang ditentukan → ambil engine default → **"spotify"**

```
source = searchEngines.get("spotify") → "sp"
finalQuery = "spsearch:The Weeknd - Blinding Lights"
```

kirim ke lavalink: `GET /v4/loadtracks?identifier=spsearch:The Weeknd - Blinding Lights`

lavalink memiliki plugin **lavasrc** yang mengerti prefix `spsearch:` dan akan mencari di **spotify api**.

### langkah 7: hasil pencarian dikembalikan

- jika lagu ditemukan → ambil lagu pertama dari hasil → tambahkan ke antrian player
- jika player sedang idle (tidak ada lagu) → otomatis mulai pemutaran
- kirim response ke frontend dan update state via websocket

---

## 3. apakah backend mencari ke satu sumber atau banyak sumber?

### jawaban: **satu sumber saja (spotify)** pada saat pencarian awal

berdasarkan kode di `patchControl.ts`, ketika lagu dari "picked for you" atau "discover genres" ditambahkan ke antrian:

| input | sumber yang dicari | alasan |
|---|---|---|
| teks biasa: `"artis - judul"` | **spotify saja** | engine = undefined → default = "spotify" → prefix `spsearch:` |
| url spotify: `https://open.spotify.com/track/...` | **spotify saja** | engine = "spotify" secara eksplisit |

**tidak ada fallback ke sumber lain** pada tahap ini. jika spotify tidak menemukan lagu, backend mengembalikan error 404 `"Track not found"`.

### kenapa bisa begitu?

kode di `patchControl.ts` **tidak memiliki** mekanisme fallback chain seperti yang ada di `getSearch.ts`. ini perbedaan penting:

| fitur | `patchControl.ts` (add to queue) | `getSearch.ts` (search bar) |
|---|---|---|
| sumber pencarian | spotify (default engine) | spotify (atau guild default) |
| fallback ke sumber lain | **tidak ada** | **ada**: spotify → deezer → apple → soundcloud |
| retry saat error jaringan | ya (3x) | tidak (1x saja) |
| pengecekan akses sumber | ya (untuk url saja) | ya (untuk url dan teks) |

### tetapi... ada tahap kedua!

saat lagu **benar-benar diputar** (bukan saat ditambahkan ke antrian), ada mekanisme resolusi yang lebih canggih. lihat bagian 5 di bawah.

---

## 4. perbedaan antara jalur "add to queue" dan jalur "search bar"

ini penting untuk dipahami: **ada dua jalur pencarian berbeda** di dashboard.

### jalur 1: add to queue (dari picked for you / discover genres / top tracks)

```
klik lagu → PATCH /api/player/:guildId { add: [query] }
          → patchControl.ts → mewslink.search()
          → HANYA SPOTIFY
```

### jalur 2: search bar (pengguna ketik manual di search bar)

```
ketik query → GET /api/search?identifier=query&source=...&guildId=...
            → getSearch.ts → mewslink.search()
            → SPOTIFY → jika gagal → DEEZER → APPLE → SOUNDCLOUD
```

**jalur search bar lebih canggih** karena memiliki `FALLBACK_CHAIN`:

```
jika sumber utama = spotify, coba berurutan:
  1. spotify
  2. deezer (fallback)
  3. apple music (fallback)
  4. soundcloud (fallback)

jika sumber utama = soundcloud, coba berurutan:
  1. soundcloud
  2. spotify (fallback)
  3. deezer (fallback)
  4. apple music (fallback)
```

pencarian ini dilakukan **secara berurutan (sequential/fallback)**, bukan paralel. begitu satu sumber menemukan hasil, pencarian langsung berhenti.

---

## 5. proses resolusi lagu saat diputar (playback resolution)

setelah lagu masuk ke antrian dan tiba giliran diputar, ada proses **resolusi** yang terpisah. proses ini terjadi di dalam mewslink (`MewslinkTrack.ts`) dan **bisa mencari di beberapa sumber**.

### 3 fase resolusi (berurutan/fallback):

```
fase 1: coba putar langsung dari uri asli
  → misal: spotify:track:abc123
  → kirim ke lavalink: "directSearch=spotify:track:abc123"
  → jika berhasil → selesai

fase 2: cari ulang menggunakan engine asal lagu
  → format: "directSearch=spsearch:The Weeknd - Blinding Lights"
  → kirim ke lavalink untuk cari di spotify
  → jika berhasil → selesai

fase 3 (fallback): cari di engine cadangan (youtube)
  → format: "directSearch=ytsearch:The Weeknd - Blinding Lights"
  → kirim ke lavalink untuk cari di youtube
  → jika berhasil → selesai

jika semua fase gagal → error, lagu tidak bisa diputar
```

**konfigurasi fallback ini ada di `Mewslink.ts` (structures):**

```
defaultSearchEngine: "spotify"
searchFallback: {
    enable: true,
    engine: "youtube"
}
```

### jadi youtube tetap digunakan?

**ya, tapi hanya sebagai cadangan terakhir saat pemutaran**, bukan saat pencarian awal. alurnya:

1. **pencarian** (saat klik play): hanya spotify ✓
2. **resolusi** (saat lagu benar-benar diputar): spotify → youtube (fallback) ✓

### pemilihan lagu terbaik saat resolusi

`getTrack()` di `MewslinkTrack.ts` tidak asal ambil lagu pertama. ada logika pemilihan:

1. **prioritas 1**: cari lagu yang artisnya persis sama (termasuk format "artis - topic")
2. **prioritas 2**: cari lagu yang durasinya mendekati (selisih ±2 detik)
3. **prioritas 3**: ambil hasil pertama jika tidak ada yang cocok

---

## 6. diagram alur lengkap

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND — pengguna klik lagu dari picked for you              │
│                                                                 │
│  PersonalRecommendations.tsx                                    │
│    handlePlay(track)                                            │
│      → onAddToQueue(["The Weeknd - Blinding Lights"])           │
│                                                                 │
│  PlayerPage.tsx                                                 │
│    handleSearchAdd(["The Weeknd - Blinding Lights"])            │
│      → controls.addToQueue(["The Weeknd - Blinding Lights"])    │
│                                                                 │
│  usePlayer.ts                                                   │
│    guardedPatch({ add: ["The Weeknd - Blinding Lights"] })      │
│      → PATCH /api/player/{guildId}                              │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — DashboardPlugin.ts                                   │
│                                                                 │
│  PATCH /api/player/:guildId                                     │
│    → verifikasi session pengguna                                │
│    → teruskan ke api internal:                                  │
│      PATCH http://127.0.0.1:{port}/v1/players/{guildId}        │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — player.ts → patchControl.ts                          │
│                                                                 │
│  add(["The Weeknd - Blinding Lights"]):                         │
│    1. validasi input ✓                                          │
│    2. bukan url → skip cek akses sumber                         │
│    3. bukan spotify uri → engine = undefined                    │
│    4. searchWithRetry(query, {requester})                       │
│       → maks 3 percobaan jika gagal jaringan                   │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  MEWSLINK — spotify plugin (pembungkus search)                  │
│                                                                 │
│  search("The Weeknd - Blinding Lights", {requester}):           │
│    → panggil search asli                                        │
│                                                                 │
│  search asli (Mewslink.ts):                                     │
│    → engine = undefined → default = "spotify"                   │
│    → source = searchEngines.get("spotify") → "sp"               │
│    → finalQuery = "spsearch:The Weeknd - Blinding Lights"       │
│    → kirim ke lavalink node                                     │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAVALINK SERVER (lavalink1.meww.me:2333)                       │
│                                                                 │
│  GET /v4/loadtracks?identifier=spsearch:The Weeknd...           │
│    → plugin lavasrc mengenali prefix "spsearch:"                │
│    → cari di spotify api                                        │
│    → kembalikan hasil pencarian                                 │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  KEMBALI KE MEWSLINK                                            │
│                                                                 │
│  jika hasil > 0 lagu:                                           │
│    → kembalikan hasil                                           │
│  jika hasil = 0:                                                │
│    → spotify plugin coba searchDirect (spotify web api)         │
│    → jika masih 0 → kembalikan kosong                           │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  KEMBALI KE patchControl.ts                                     │
│                                                                 │
│  jika lagu ditemukan:                                           │
│    → ambil tracks[0]                                            │
│    → player.queue.add(song)                                     │
│    → jika player idle → player.play()                           │
│    → kirim response + update websocket                          │
│                                                                 │
│  jika lagu tidak ditemukan:                                     │
│    → kirim error 404: "Track not found"                         │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
              (saat lagu benar-benar diputar)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  RESOLUSI PEMUTARAN — MewslinkTrack.ts                          │
│                                                                 │
│  fase 1: coba uri langsung (spotify:track:...)                  │
│    → berhasil? → putar lagunya ✓                                │
│                                                                 │
│  fase 2: cari ulang di spotify ("spsearch:artis - judul")       │
│    → berhasil? → putar lagunya ✓                                │
│                                                                 │
│  fase 3: fallback ke youtube ("ytsearch:artis - judul")         │
│    → berhasil? → putar lagunya ✓                                │
│                                                                 │
│  semua gagal? → error, skip ke lagu berikutnya                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### diagram untuk "top tracks today" (sedikit berbeda)

```
klik lagu → onAddToQueue(["https://open.spotify.com/track/abc123"])
          → PATCH { add: ["https://open.spotify.com/track/abc123"] }

patchControl.ts:
  1. input adalah url → cek akses sumber
     → spotify = "Member" (gratis) → diizinkan ✓
  2. cocok regex spotify url → normalisasi:
     "https://open.spotify.com/track/abc123" → "spotify:track:abc123"
  3. engine = "spotify" (eksplisit, karena spotify uri terdeteksi)
  4. search("spotify:track:abc123", {engine: "spotify"})
     → spotify plugin searchDirect → resolve langsung dari spotify api

  jika gagal:
  5. fallback: search("spsearch:abc123", {engine: "spotify"})
     → cari di spotify menggunakan track id sebagai query
```

---

## 7. daftar file penting dan perannya

### frontend

| file | peran |
|------|-------|
| `frontend/src/components/dashboard/PersonalRecommendations.tsx` | komponen "picked for you". ketika pengguna klik lagu, memanggil `onAddToQueue([track.searchQuery])` di mana `searchQuery` berformat `"artis - judul"` |
| `frontend/src/components/dashboard/GenreCharts.tsx` | komponen "discover genres". sama — mengirim `searchQuery` berformat `"artis - judul"` |
| `frontend/src/components/dashboard/RecommendedSection.tsx` | komponen "top tracks today". mengirim `track.spotify_url` (url spotify langsung) |
| `frontend/src/pages/PlayerPage.tsx` | halaman utama player. berisi fungsi `handleSearchAdd()` yang menghubungkan klik lagu ke `controls.addToQueue()` |
| `frontend/src/hooks/usePlayer.ts` | hook player. `addToQueue(uris)` → `guardedPatch({add: uris})` → `PATCH /api/player/:guildId` |
| `frontend/src/lib/api.ts` | instance axios dengan base url ke backend |

### backend — jalur permintaan

| file | peran |
|------|-------|
| `backend/src/web/dashboard/DashboardPlugin.ts` | plugin dashboard fastify. route `PATCH /api/player/:guildId` meneruskan request ke api internal `/v1/players/:guildId` |
| `backend/src/web/player.ts` | route internal player. memetakan `PATCH /:guildId` ke `PatchControl.main()` |
| `backend/src/web/route/patchControl.ts` | **file kunci**. menangani logika `add()` — validasi, normalisasi uri, cek akses sumber, pencarian lagu via mewslink, penambahan ke antrian, auto-play |
| `backend/src/web/route/resolveDashboardAccess.ts` | konfigurasi akses sumber per level (member/premium). berisi `DASHBOARD_SOURCES` dan `getDefaultSourceDashboardConfig()` |

### backend — pencarian lagu

| file | peran |
|------|-------|
| `backend/src/mewslink/Mewslink.ts` | kelas utama mewslink. berisi fungsi `search()` yang membangun query final (misal `spsearch:query`) dan mengirim ke lavalink node |
| `backend/src/mewslink/Plugin/Spotify/Plugin.ts` | plugin spotify. **mengganti** fungsi `search()` asli mewslink dengan pembungkus yang menambahkan fallback ke spotify web api jika lavalink gagal |
| `backend/src/mewslink/Interface/Constants.ts` | daftar semua source id: spotify=`sp`, youtube=`yt`, deezer=`dz`, apple=`am`, soundcloud=`sc`, youtube_music=`ytm`, dll |
| `backend/src/structures/Mewslink.ts` | inisialisasi mewslink. mengatur `defaultSearchEngine: "spotify"` dan `searchFallback: { enable: true, engine: "youtube" }`. juga mendaftarkan plugin: spotify, deezer, apple, nico |

### backend — resolusi pemutaran

| file | peran |
|------|-------|
| `backend/src/mewslink/Player/MewslinkTrack.ts` | resolusi lagu saat diputar. menjalankan 3 fase: uri langsung → cari di engine asal → fallback ke youtube. juga memilih lagu terbaik berdasarkan artis dan durasi |

### backend — pencarian alternatif (search bar, bukan add to queue)

| file | peran |
|------|-------|
| `backend/src/web/route/getSearch.ts` | route `GET /v1/search`. memiliki `FALLBACK_CHAIN` (spotify → deezer → apple → soundcloud). hanya digunakan oleh search bar, **bukan** oleh fitur picked for you/discover genres |

---

## 8. catatan teknis tambahan

### daftar semua sumber musik yang terdaftar di sistem

berdasarkan `Constants.ts`:

| nama | prefix pencarian | contoh query |
|------|-----------------|-------------|
| spotify | `spsearch:` | `spsearch:The Weeknd Blinding Lights` |
| youtube | `ytsearch:` | `ytsearch:The Weeknd Blinding Lights` |
| youtube music | `ytmsearch:` | `ytmsearch:The Weeknd Blinding Lights` |
| soundcloud | `scsearch:` | `scsearch:The Weeknd Blinding Lights` |
| deezer | `dzsearch:` | `dzsearch:The Weeknd Blinding Lights` |
| apple music | `amsearch:` | `amsearch:The Weeknd Blinding Lights` |
| tidal | `tdsearch:` | `tdsearch:The Weeknd Blinding Lights` |
| bandcamp | `bcsearch:` | `bcsearch:The Weeknd Blinding Lights` |
| jiosaavn | `jssearch:` | `jssearch:The Weeknd Blinding Lights` |
| yande music | `ymsearch:` | `ymsearch:The Weeknd Blinding Lights` |

### konfigurasi akses sumber di dashboard

berdasarkan `resolveDashboardAccess.ts`:

| sumber | level akses default |
|--------|-------------------|
| spotify | member (gratis) |
| soundcloud | member (gratis) |
| apple music | member (gratis) |
| deezer | member (gratis) |
| tidal | member (gratis) |
| youtube | premium (berbayar) |
| youtube music | premium (berbayar) |

### plugin yang didaftarkan di mewslink

berdasarkan `structures/Mewslink.ts`:

| plugin | kondisi |
|--------|---------|
| deezer | selalu aktif |
| nico (niconico) | selalu aktif (limit: 10 hasil) |
| apple music | selalu aktif (region: us) |
| youtube converter | aktif jika `CONVERT_LINK.Enable = true` |
| spotify | aktif jika `lavalink.SPOTIFY.enable = true` |

### retry logic (percobaan ulang)

`searchWithRetry()` di `patchControl.ts`:
- maksimal **3 percobaan**
- hanya retry jika error jaringan: "fetch failed", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "socket hang up"
- jeda antar percobaan: 600ms × nomor percobaan (600ms, 1200ms)
- jika bukan error jaringan → langsung berhenti, tidak retry

### cache di backend

| data | durasi cache | lokasi |
|------|-------------|--------|
| top tags (genre) | 1 jam | `DashboardPlugin.ts` (in-memory) |
| tag tracks (lagu per genre) | 30 menit | `DashboardPlugin.ts` (in-memory) |
| recommendations | 10 menit | `DashboardPlugin.ts` (in-memory) |
| top chart spotify | 6 jam | `SpotifyTopChartService.ts` (in-memory) |

---

## ringkasan

| pertanyaan | jawaban |
|------------|---------|
| berapa sumber yang dicari saat klik play? | **1 sumber: spotify** |
| apakah ada fallback ke sumber lain? | **tidak ada** pada saat pencarian awal (add to queue) |
| apakah youtube pernah digunakan? | **ya**, tapi hanya sebagai cadangan saat **pemutaran** (playback resolution), bukan saat pencarian |
| pencarian paralel atau berurutan? | **satu sumber saja**, jadi tidak ada paralel maupun fallback |
| bagaimana jika spotify tidak menemukan? | backend mengembalikan **error 404** ke frontend |
| apakah search bar berbeda? | **ya**, search bar punya fallback chain: spotify → deezer → apple → soundcloud (berurutan) |
