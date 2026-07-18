# SEO Portfolio Dashboard

Dashboard internal untuk memantau performa project SEO dan mengelola topic ideas lintas project.

## Fitur

- Portfolio performance untuk ranking, organic sessions, conversions, MoM, dan YoY
- Detail project dengan distribusi Top 3/10/20/100, keyword movement, target URL, lokasi, dan perangkat
- Tambah atau ubah project dan keyword
- Input manual serta import CSV/Excel untuk keyword, ranking, dan metrik bulanan
- Sinkronisasi snapshot project, keyword mapping, dan ranking dari iClick SEO Brain
- Data freshness, coverage, anotasi perubahan, dan riwayat import
- Akun individual dengan role Admin, Editor, dan Viewer
- Login admin dan setup akun admin pertama
- Dashboard dengan summary total topic, belum didelegasikan, sedang dikerjakan, selesai, dan published
- Status workflow: `Belum didelegasikan`, `Didelegasikan`, `Draft diterima`, `Selesai`, `Published`, `Dibatalkan`
- Setiap topik terkait ke satu project SEO
- Simpan `judul`, `brief`, `primary keywords`, `secondary keywords`, `writer`, `deadline bulan`, `URL publish`, `prioritas`, dan `content type`
- Filter berdasarkan project, status, writer, prioritas, content type, dan deadline bulan
- Search judul dan keyword
- Duplicate warning otomatis untuk topik yang mirip
- Riwayat perubahan status per topik
- Halaman detail per project
- Export CSV sesuai filter aktif
- Import CSV / Excel untuk topic ideas dalam jumlah besar
- Validasi `URL publish` wajib saat status `Published`
- Ubah password admin dari dashboard

## Stack

- Next.js App Router
- PostgreSQL
- Prisma ORM
- Custom cookie auth

## Menjalankan Secara Lokal

1. Salin `.env.example` menjadi `.env` lalu isi `DATABASE_URL` dan `AUTH_SECRET`.
2. Install dependency:

```bash
npm install
```

3. Generate Prisma client dan push schema:

```bash
npm run db:push
```

4. Opsional, isi project default:

```bash
npm run db:seed
```

5. Jalankan development server:

```bash
npm run dev
```

6. Buka `http://localhost:3000`, lalu buat akun admin pertama di halaman setup.

## Snapshot OKF Brain

Set `OKF_BRAIN_PATH` bila repo Brain tidak berada di lokasi default mesin ini, lalu jalankan:

```bash
npm run brain:export
```

Perintah tersebut memperbarui `data/okf-brain-snapshot.json`. Admin atau Editor kemudian dapat mengimpornya melalui halaman **Import & Sinkronisasi**.

## Deploy ke Vercel

1. Push project ini ke Git repository.
2. Deploy ke Vercel.
3. Tambahkan environment variables:
   - `DATABASE_URL`
   - `AUTH_SECRET`
4. Jalankan `prisma db push` terhadap database production Anda.

Pada deployment production Netlify, `scripts/netlify-build.mjs` menjalankan `prisma db push` sebelum build dan berhenti jika `DATABASE_URL` tidak tersedia.

Untuk database PostgreSQL, opsi yang paling praktis adalah Neon, Supabase, atau Railway.
