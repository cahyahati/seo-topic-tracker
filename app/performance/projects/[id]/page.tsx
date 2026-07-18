import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AnnotationForm,
  KeywordForm,
  MonthlyMetricForm,
  ProjectForm,
  RankDistribution,
  TrendLine,
  canEdit
} from "@/components/performance-dashboard";
import { requireUser } from "@/lib/auth";
import { formatMetric, getPerformanceProject } from "@/lib/performance";
import { formatDate, formatMonthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

function rankLabel(position: number | null | undefined, beyondRange?: boolean) {
  if (beyondRange) return "101+";
  return position ?? "—";
}

export default async function PerformanceProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const messages = await searchParams;
  const data = await getPerformanceProject(id);
  if (!data) notFound();
  const editable = canEdit(user.role);

  return (
    <div className="stack">
      <section className="card portfolio-hero">
        <div className="headline">
          <div>
            <span className="eyebrow">{data.project.market}</span>
            <h1>{data.project.name}</h1>
            <p className="muted">
              {data.project.domain ? <a className="meta-link" href={data.project.domain} target="_blank" rel="noreferrer">{data.project.domain}</a> : "Domain belum diisi"}
              {data.project.brainSlug ? ` · OKF Brain: ${data.project.brainSlug}` : ""}
            </p>
          </div>
          <div className="actions">
            <Link href="/performance" className="button-secondary">Portfolio</Link>
            {editable ? <Link href="/performance/import" className="button-secondary">Import Data</Link> : null}
          </div>
        </div>
      </section>

      {messages.error ? <div className="error-box">{messages.error}</div> : null}
      {messages.success ? <div className="success-box">{messages.success}</div> : null}

      <RankDistribution distribution={data.rankDistribution} />

      <section className="card">
        <div className="headline section-heading">
          <div><h2>Traffic & conversions</h2><p className="muted">Data bulanan mengutamakan GA4 untuk sessions/conversions dan GSC untuk search metrics.</p></div>
          {editable ? <a href="#input-metric" className="button-secondary">Input manual</a> : null}
        </div>
        <div className="grid-2 balanced-grid">
          <TrendLine
            title="Organic sessions"
            color="#2563eb"
            timeline={data.timeline.map((row) => ({ month: row.month, value: row.organicSessions }))}
          />
          <TrendLine
            title="Conversions"
            color="#16a34a"
            decimals={2}
            timeline={data.timeline.map((row) => ({ month: row.month, value: row.conversions }))}
          />
        </div>
        {data.timeline.length ? (
          <div className="table-wrap compact-table">
            <table>
              <thead><tr><th>Bulan</th><th>Organic sessions</th><th>Conversions</th><th>GSC clicks</th><th>Impressions</th><th>CTR</th><th>Avg. position</th></tr></thead>
              <tbody>{[...data.timeline].reverse().map((row) => (
                <tr key={row.month}><td>{formatMonthLabel(row.month)}</td><td>{formatMetric(row.organicSessions)}</td><td>{formatMetric(row.conversions, 2)}</td><td>{formatMetric(row.gscClicks)}</td><td>{formatMetric(row.gscImpressions)}</td><td>{row.gscCtr === null ? "—" : `${formatMetric(row.gscCtr, 2)}%`}</td><td>{formatMetric(row.gscAveragePosition, 2)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="headline section-heading">
          <div><h2>Keyword & ranking</h2><p className="muted">Posisi terbaru dibandingkan snapshot sebelumnya pada perangkat yang sama.</p></div>
          <span className="freshness-note">{data.project.keywords.length} keyword</span>
        </div>
        {data.rankingRows.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Keyword</th><th>Target URL</th><th>Posisi</th><th>Perubahan</th><th>Lokasi</th><th>Perangkat</th><th>Diperiksa</th>{editable ? <th>Aksi</th> : null}</tr></thead>
              <tbody>{data.rankingRows.map(({ keyword, current, movement }) => (
                <tr key={keyword.id} className={keyword.isActive ? "" : "row-muted"}>
                  <td><div className="topic-cell"><strong>{keyword.phrase}</strong><span className="meta-text">{keyword.source.replaceAll("_", " ")}{keyword.isActive ? "" : " · nonaktif"}</span></div></td>
                  <td>{keyword.targetUrl ? <span className="target-url">{keyword.targetUrl}</span> : <span className="muted">—</span>}</td>
                  <td><strong className="rank-number">{rankLabel(current?.position, current?.beyondRange)}</strong></td>
                  <td>{movement === null ? "—" : <span className={movement > 0 ? "movement-up" : movement < 0 ? "movement-down" : "muted"}>{movement > 0 ? `▲ ${movement}` : movement < 0 ? `▼ ${Math.abs(movement)}` : "0"}</span>}</td>
                  <td>{keyword.location}<div className="meta-text">{keyword.searchEngine}</div></td>
                  <td>{current?.device ?? "—"}</td>
                  <td>{formatDate(current?.checkedAt)}</td>
                  {editable ? <td><Link className="button-secondary compact-button" href={`/performance/keywords/${keyword.id}/edit`}>Edit</Link></td> : null}
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="empty-state">Belum ada keyword untuk project ini.</div>}
      </section>

      <div className="grid-2 balanced-grid">
        <section className="card">
          <h2>Anotasi</h2>
          {data.project.annotations.length ? <div className="annotation-list">{data.project.annotations.map((annotation) => <div key={annotation.id}><strong>{annotation.title}</strong><span>{formatDate(annotation.eventDate)}</span>{annotation.note ? <p>{annotation.note}</p> : null}</div>)}</div> : <div className="empty-state">Belum ada anotasi.</div>}
        </section>
        <section className="card">
          <h2>Riwayat data</h2>
          {data.project.imports.length ? <div className="annotation-list">{data.project.imports.map((item) => <div key={item.id}><strong>{item.type.replaceAll("_", " ")}</strong><span>{formatDate(item.createdAt)} · {item.rowsImported}/{item.rowsTotal} baris · {item.source}</span>{item.notes ? <p>{item.notes}</p> : null}</div>)}</div> : <div className="empty-state">Belum ada riwayat import untuk project ini.</div>}
        </section>
      </div>

      {editable ? (
        <section className="management-grid">
          <details className="card management-panel" open>
            <summary>Tambah keyword</summary>
            <KeywordForm projectId={data.project.id} />
          </details>
          <details className="card management-panel" id="input-metric">
            <summary>Input metrik manual</summary>
            <MonthlyMetricForm projectId={data.project.id} />
          </details>
          <details className="card management-panel">
            <summary>Tambah anotasi</summary>
            <AnnotationForm projectId={data.project.id} />
          </details>
          <details className="card management-panel">
            <summary>Pengaturan project</summary>
            <ProjectForm project={data.project} />
          </details>
        </section>
      ) : null}
    </div>
  );
}
