This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Pendaftaran Privat

1. Pastikan proyek Supabase sudah memiliki tabel `public.profiles` yang dipakai dashboard, dengan kolom `id` (UUID yang merujuk ke `auth.users`), `role`, dan `full_name`.
2. Buka **SQL Editor** di Supabase dan jalankan seluruh isi [`supabase/pendaftaran.sql`](supabase/pendaftaran.sql).
3. Buat akun admin pertama dari **Authentication > Users > Add user** di Supabase, lalu ambil UUID akun tersebut. Jalankan perintah berikut dengan UUID akun admin:

	```sql
	update public.profiles
	set role = 'admin'
	where id = 'UUID-AKUN-AUTH';
	```

4. Tambahkan `SUPABASE_SERVICE_ROLE_KEY` ke environment server lokal dan hosting. Jangan beri awalan `NEXT_PUBLIC_` dan jangan pernah mengekspos nilainya ke browser.
5. Nonaktifkan **Allow new users to sign up** di pengaturan Authentication Supabase. Akun siswa selanjutnya dibuat admin dari dashboard; akun diberi ID `BC-n` unik oleh database.
6. Masuk melalui `/login`. Dashboard admin dapat membuat akun siswa, mengaktifkan atau memperpanjang masa belajar berdasarkan jumlah bulan, membuat paket privat, dan membagikan tautan pendaftaran.
7. Atur `NEXT_PUBLIC_SITE_URL` ke alamat publik aplikasi (contoh `https://domain-anda.id`) agar tautan yang ditampilkan admin siap dibagikan. Tanpa nilai ini, dashboard menggunakan alamat host permintaan saat ini.

Tanggal akhir masa belajar dihitung inklusif: misalnya mulai 1 Oktober selama 1 bulan berarti aktif sampai 31 Oktober. Login dan setiap akses dashboard siswa memeriksa masa aktif melalui RPC; setelah tanggal akhir lewat, akses langsung ditolak dan profil ditandai nonaktif pada percobaan login/akses pertama. Pengingat perpanjangan muncul pada dashboard admin dan siswa saat sisa masa aktif 10 hari atau kurang, termasuk setelah tanggal berakhir; admin wajib mengonfirmasi pembayaran saat memperpanjang, lalu pengingat hilang otomatis saat tanggal akhir baru lebih dari 10 hari ke depan. Jalankan ulang [`supabase/pendaftaran.sql`](supabase/pendaftaran.sql) untuk memasang RPC pengecekan akses yang baru. Form publik hanya dapat membaca detail paket melalui RPC dengan token tautan aktif. Data pendaftaran tidak dapat dibaca atau ditulis langsung oleh pengguna anonim; fungsi database memvalidasi tautan dan memasukkan pendaftar, sementara RLS membatasi daftar pendaftar kepada admin.

Pendaftar memilih tanggal, jam mulai, dan jam selesai untuk setiap pertemuan paket dalam bulan yang sama. Kalender admin menampilkan seluruh sesi dalam zona waktu Asia/Jakarta; batasan exclusion PostgreSQL mencegah jadwal bertabrakan. Hubungkan pendaftaran publik saat admin membuat akun siswa agar jadwal tampil di dashboard siswa. Reschedule tersedia jika sesi masih sekurangnya 24 jam lagi, dan batas tersebut juga divalidasi server serta database.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
