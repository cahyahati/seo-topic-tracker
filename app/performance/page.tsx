import Link from "next/link";

import { LogoutForm } from "@/components/forms";
import { PortfolioStats, PortfolioTable, canEdit } from "@/components/performance-dashboard";
import { requireUser } from "@/lib/auth";
import { getPortfolioPerformance, monthKey } from "@/lib/performance";
import { formatMonthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PerformancePage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const data = await getPortfolioPerformance(params.month);
  const selectedMonth = monthKey(data.selectedMonth);

  return (
    <div className="stack">
      <section className="card portfolio-hero">
        <div className="headline">
          <div>
            <span className="eyebrow">SEO portfolio</span>
            <h1>Performance 15 Project</h1>
            <p className="muted">Ranking terbaru serta traffic dan conversion untuk {formatMonthLabel(selectedMonth)}.</p>
          </div>
          <div className="actions">
            {canEdit(user.role) ? <Link href="/performance/projects/new" className="button">Tambah Project</Link> : null}
            {canEdit(user.role) ? <Link href="/performance/import" className="button-secondary">Import Data</Link> : null}
            <Link href="/dashboard" className="button-secondary">Topic Tracker</Link>
            <LogoutForm />
          </div>
        </div>
        <form className="period-control">
          <label htmlFor="portfolio-month">Bulan laporan</label>
          <input className="input" id="portfolio-month" name="month" type="month" defaultValue={selectedMonth} />
          <button className="button-secondary" type="submit">Tampilkan</button>
        </form>
      </section>

      {params.error ? <div className="error-box">{params.error}</div> : null}
      {params.success ? <div className="success-box">{params.success}</div> : null}

      <PortfolioStats totals={data.totals} month={selectedMonth} />

      <section className="card">
        <div className="headline section-heading">
          <div>
            <h2>Ringkasan per project</h2>
            <p className="muted">MoM membandingkan bulan sebelumnya; YoY membandingkan bulan yang sama tahun sebelumnya. Tanda — berarti data pembanding belum tersedia.</p>
          </div>
          <span className="freshness-note">Ranking memakai snapshot terbaru per keyword</span>
        </div>
        {data.rows.length ? <PortfolioTable rows={data.rows} /> : <div className="empty-state">Belum ada project. Tambahkan project atau tarik snapshot OKF Brain.</div>}
      </section>
    </div>
  );
}
