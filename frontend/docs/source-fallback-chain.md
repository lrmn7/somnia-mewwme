# penjelasan proses pencarian & pemutaran lagu dari "picked for you" dan "discover genres"

---

## bagaimana fallback chain bekerja

```
pengguna klik play
      │
      ▼
spotify → deezer → youtube music → apple music → soundcloud → error 404
   │         │           │              │             │
 success   success     success        success       success
   └─────────── jika ditemukan langsung diputar ───────────┘
```

---

## urutan pencarian (fallback chain)

| urutan | sumber | engine name | search prefix |
|--------|--------|-------------|---------------|
| 1 | spotify | `spotify` | `spsearch:` |
| 2 | deezer | `deezer` | `dzsearch:` |
| 3 | youtube music | `youtube_music` | `ytmsearch:` |
| 4 | apple music | `apple` | `amsearch:` |
| 5 | soundcloud | `soundcloud` | `scsearch:` |

pencarian berhenti begitu salah satu sumber mengembalikan hasil. jika semua sumber gagal, baru dikembalikan error.

---

## kapan fallback chain aktif

fallback chain **hanya aktif** untuk **pencarian teks biasa** (plain text query), yaitu:

- lagu dari "picked for you" → format: `"artis - judul lagu"`
- lagu dari "discover genres" → format: `"artis - judul lagu"`

fallback chain **tidak aktif** untuk:

- url langsung (misal `https://open.spotify.com/track/...`) → langsung dicari di sumber url-nya
- spotify uri (misal `spotify:track:abc123`) → tetap dicari di spotify dengan fallback spotify-nya sendiri

---

## path file

### 1. `backend/src/web/route/patchControl.ts`

**peran:** menangani request `PATCH /api/player/:guildId` dengan body `{ add: [...] }` ini adalah jalur yang digunakan oleh "picked for you", "discover genres", dan "top tracks today" ketika pengguna menekan play.

**perubahan:** ditambahkan blok fallback chain setelah pencarian utama (spotify) gagal untuk query teks biasa. blok ini:

1. mengecek apakah hasil kosong dan input bukan url / bukan spotify uri
2. jika ya, mencoba sumber alternatif secara berurutan: deezer → youtube music → apple music → soundcloud
3. menggunakan fungsi `searchWithRetry()` yang sudah ada (termasuk retry 3x untuk error jaringan)
4. menggunakan `DASHBOARD_SOURCES` dari `resolveDashboardAccess.ts` untuk memetakan nama sumber ke engine name

### 2. `backend/src/web/route/getSearch.ts`

**peran:** menangani request `GET /api/search` ini adalah jalur yang digunakan oleh **search bar** di dashboard.

**perubahan:** ditambahkan `youtube_music` ke dalam fallback chain untuk semua sumber utama. sebelumnya youtube music hanya menjadi fallback untuk youtube. sekarang:

- spotify → deezer → **youtube music** → apple → soundcloud
- deezer → spotify → **youtube music** → apple → soundcloud
- apple → spotify → deezer → **youtube music** → soundcloud
- soundcloud → spotify → deezer → **youtube music** → apple
- tidal → spotify → deezer → **youtube music** → apple → soundcloud
- youtube → **youtube music** → spotify → deezer
- youtube music → youtube → spotify → deezer

---

## diagram alur setelah perubahan

```
pengguna klik play di "picked for you" / "discover genres"
    │
    ▼
frontend mengirim: PATCH /api/player/:guildId { add: ["artis - judul"] }
    │
    ▼
patchControl.ts → add()
    │
    ├─ input = teks biasa (bukan url, bukan spotify uri)
    │  engine = undefined → default = spotify
    │
    ▼
searchWithRetry("artis - judul", {requester})
    │ → mewslink.search() → "spsearch:artis - judul" → lavalink → spotify
    │
    ├─ hasil > 0? → selesai, tambahkan ke antrian ✓
    │
    ├─ hasil = 0 atau error?
    │  │
    │  ▼ fallback chain dimulai
    │
    ├─ coba deezer: searchWithRetry(query, {engine: "deezer"})
    │  │ → "dzsearch:artis - judul" → lavalink → deezer
    │  ├─ hasil > 0? → selesai ✓
    │  │
    │  ├─ coba youtube music: searchWithRetry(query, {engine: "youtube_music"})
    │  │  │ → "ytmsearch:artis - judul" → lavalink → youtube music
    │  │  ├─ hasil > 0? → selesai ✓
    │  │  │
    │  │  ├─ coba apple music: searchWithRetry(query, {engine: "apple"})
    │  │  │  │ → "amsearch:artis - judul" → lavalink → apple music
    │  │  │  ├─ hasil > 0? → selesai ✓
    │  │  │  │
    │  │  │  ├─ coba soundcloud: searchWithRetry(query, {engine: "soundcloud"})
    │  │  │  │  │ → "scsearch:artis - judul" → lavalink → soundcloud
    │  │  │  │  ├─ hasil > 0? → selesai ✓
    │  │  │  │  │
    │  │  │  │  └─ semua gagal → error 404 "Track not found"
```

---

## catatan penting
- fallback chain ditambahkan sebagai blok baru setelah pencarian utama
- setiap percobaan fallback juga mendapat **retry 3x** untuk error jaringan (menggunakan `searchWithRetry()` yang sudah ada)
- fallback chain menggunakan **`DASHBOARD_SOURCES`** dari `resolveDashboardAccess.ts` sehingga konsisten dengan konfigurasi sumber yang ada
- pencarian berjalan **secara berurutan (sequential)**, bukan paralel — begitu satu sumber berhasil, sisanya dilewati
