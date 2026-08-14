# Nimbus SSO — Demo Login (dengan backend sungguhan)

Template login SSO yang **benar-benar berfungsi** secara lokal: ada satu akun
demo, password di-hash (bukan disimpan polos), dan session dikelola via
cookie `HttpOnly`. Dibangun sebagai proyek belajar/portofolio — bukan tiruan
situs instansi mana pun.

## Menjalankan (tidak perlu `npm install`)

Server hanya memakai modul bawaan Node.js (`http`, `crypto`, `fs`), jadi
langsung bisa dijalankan:

```bash
node server.js
```

Lalu buka **http://localhost:3000** di browser.

**Akun demo:**
| Username | Password    |
|----------|-------------|
| `demo`   | `Demo#1234` |

Setelah login berhasil, Anda diarahkan ke `dashboard.html` yang hanya bisa
diakses kalau sesi login valid (dicoba akses langsung tanpa login → otomatis
dilempar balik ke halaman login).

## Struktur proyek

```
nimbus-sso-backend/
├── server.js         # server Node.js (routing, auth, session)
├── users.json        # "database" sederhana berbasis file (1 akun demo)
├── public/
│   ├── index.html     # halaman login (front-end)
│   └── dashboard.html # halaman setelah login (protected)
└── README.md
```

## Cara kerja autentikasi

1. Password demo di-hash pakai `crypto.scryptSync` + salt acak — bukan MD5/plain text.
2. `POST /api/login` mencocokkan hash secara *timing-safe* (`crypto.timingSafeEqual`), lalu membuat token sesi acak (32 byte) dan menyimpannya di memori server.
3. Token dikirim ke browser sebagai cookie `HttpOnly` (`nimbus_session`) — tidak bisa dibaca JavaScript di sisi klien, sedikit mengurangi risiko XSS mencuri sesi.
4. `GET /api/me` dan halaman dashboard memeriksa cookie ini untuk tahu siapa yang sedang login.
5. `POST /api/logout` menghapus sesi dari memori dan cookie di browser.
6. Ada rate limiting sederhana per-IP (maks 8 percobaan / 5 menit) untuk memperlambat brute-force.

## Menambah akun baru

Buka `users.json`, lalu generate salt+hash baru dengan:

```bash
node -e "
const crypto = require('crypto');
const password = 'PasswordBaruAnda';
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
console.log(JSON.stringify({ username: 'user_baru', displayName: 'Nama Tampilan', salt, hash }, null, 2));
"
```

Tempel hasilnya ke array `users` di `users.json`.

## ⚠️ Batasan — ini demo, bukan produksi

Sebelum dipakai untuk hal sungguhan (bukan sekadar belajar), Anda perlu menambahkan:
- **Database sungguhan** (PostgreSQL/MySQL/SQLite) — `users.json` tidak aman untuk banyak pengguna atau akses bersamaan.
- **Session store persisten** (Redis, database) — saat ini sesi hilang setiap server di-restart karena hanya disimpan di memori.
- **HTTPS** — cookie `HttpOnly` saja tidak cukup tanpa koneksi terenkripsi; tambahkan flag `Secure` dan jalankan di belakang HTTPS saat deploy.
- **Captcha sungguhan** (misal hCaptcha/reCAPTCHA) — captcha matematika di front-end saat ini hanya kosmetik, gampang dilewati lewat request langsung ke API.
- **Kebijakan password & verifikasi email**, proteksi CSRF tambahan, logging, dan monitoring percobaan login mencurigakan.

## Deploy

Karena ini server Node biasa (bukan static site), **tidak bisa** di-host di
GitHub Pages (itu hanya untuk file statis). Opsi hosting yang mendukung
Node.js: Render, Railway, Fly.io, atau VPS sendiri.
