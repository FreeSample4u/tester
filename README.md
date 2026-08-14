# Nimbus SSO — Login Page Template

Template halaman login SSO generik (branding fiktif), dibuat sebagai
alternatif latihan/portofolio — bukan tiruan dari situs instansi nyata.

## Isi
- `index.html` — halaman login lengkap (HTML + CSS + JS, satu file, tanpa dependency backend)

## Fitur
- Layout dua kolom: pitch/branding di kiri, form login di kanan (responsif, otomatis menjadi satu kolom di layar sempit)
- Toggle tampil/sembunyikan password
- Captcha matematika sederhana yang di-generate di sisi klien (hanya untuk demo, **bukan untuk keamanan produksi**)
- Form submit ditangani oleh JavaScript (`preventDefault`) — **tidak mengirim data ke server mana pun**

## Cara pakai
Buka `index.html` langsung di browser, atau upload ke GitHub Pages:

1. Buat repository baru di GitHub
2. Upload `index.html` (dan `README.md` ini) ke root repository
3. Masuk ke **Settings → Pages**, pilih branch `main` dan folder `/root`
4. Situs akan aktif di `https://<username>.github.io/<nama-repo>/`

## Menghubungkan ke backend sungguhan
File ini murni front-end. Untuk memakainya sebagai login sungguhan:
- Ganti `<form id="loginForm">` agar mengirim request (misalnya `fetch`) ke endpoint API otentikasi milik Anda sendiri
- Ganti captcha demo dengan captcha service sungguhan (reCAPTCHA, hCaptcha, dll.) yang divalidasi di server
- Tambahkan proteksi CSRF, rate limiting, dan hashing password di sisi backend

## Lisensi
Bebas dipakai dan dimodifikasi untuk keperluan pribadi maupun komersial.
