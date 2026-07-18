import Link from "next/link";

import { BrainImportForm, PerformanceImportForm } from "@/components/performance-dashboard";
import { requireEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
// Import multi-sheet menyentuh banyak baris; beri waktu lebih dari default serverless.
export const maxDuration = 60;

export default async function PerformanceImportPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireEditor();
  const params = await searchParams;
  const recentImports = await db.dataImport.findMany({
    include: { project: { select: { name: true } }, importedBy: { select: { username: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  return (
    <div className="stack">
      <div className="card">
        <div className="headline">
          <div><span className="eyebrow">Sumber data</span><h1>Import & Sinkronisasi</h1><p className="muted">Setiap proses dicatat agar sumber dan tanggal pembaruan dapat dilacak.</p></div>
          <Link href="/performance" className="button-secondary">Kembali</Link>
        </div>
      </div>
      {params.error ? <div className="error-box">{params.error}</div> : null}
      {params.success ? <div className="success-box">{params.success}</div> : null}
      <div className="grid-2 balanced-grid">
        <section className="card">
          <h2>OKF Brain</h2>
          <p className="muted">Jalankan <code>npm run brain:export</code> di komputer yang memiliki repository Brain, lalu upload file <code>data/okf-brain-snapshot.json</code> di sini. File tersebut tidak disimpan di repository publik.</p>
          <BrainImportForm />
        </section>
        <section className="card">
          <h2>CSV / Excel</h2>
          <PerformanceImportForm />
        </section>
      </div>
      <section className="card">
        <h2>Header yang didukung</h2>
        <div className="import-guides">
          <div><strong>Keyword</strong><code>project, keyword, target_url, location, search_engine, active</code></div>
          <div><strong>Ranking</strong><code>project, keyword, checked_at, position, ranking_url, location, search_engine, device</code></div>
          <div><strong>Metrik bulanan</strong><code>project, month, organic_sessions, conversions, gsc_clicks, gsc_impressions, gsc_ctr, gsc_average_position, source</code></div>
        </div>
      </section>
      <section className="card">
        <h2>Riwayat import</h2>
        {recentImports.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tanggal</th><th>Jenis</th><th>Project</th><th>Sumber</th><th>Hasil</th><th>Pengguna</th></tr></thead>
              <tbody>{recentImports.map((item) => <tr key={item.id}><td>{formatDate(item.createdAt)}</td><td>{item.type.replaceAll("_", " ")}</td><td>{item.project?.name ?? "Lintas project"}</td><td>{item.source}</td><td>{item.rowsImported}/{item.rowsTotal} · {item.status}</td><td>{item.importedBy?.username ?? item.importedBy?.email ?? "—"}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <div className="empty-state">Belum ada riwayat import.</div>}
      </section>
    </div>
  );
}
