import { Keyword, Project, UserRole } from "@prisma/client";
import Link from "next/link";

import {
  addProjectAnnotationAction,
  createUserAction,
  createKeywordAction,
  createPerformanceProjectAction,
  importBrainSnapshotAction,
  importPerformanceDataAction,
  resetPerformanceDataAction,
  saveMonthlyMetricAction,
  updateKeywordAction,
  updateOwnUsernameAction,
  updatePerformanceProjectAction,
  updateUserAccessAction
} from "@/app/performance/actions";
import { formatMetric } from "@/lib/performance";
import { formatDate, formatMonthLabel } from "@/lib/utils";

function domainHostname(domain: string) {
  try {
    return new URL(domain).hostname;
  } catch {
    return domain;
  }
}

export function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="metric-delta neutral">—</span>;
  const className = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
  return <span className={`metric-delta ${className}`}>{value > 0 ? "+" : ""}{value.toFixed(1)}%</span>;
}

export function PortfolioStats({
  totals,
  month
}: {
  totals: {
    projects: number;
    keywords: number;
    top10: number;
    sessions: number | null;
    conversions: number | null;
    trafficCoverage: number;
    conversionCoverage: number;
  };
  month: string;
}) {
  const items = [
    { label: "Project aktif", value: formatMetric(totals.projects), note: "portfolio" },
    { label: "Keyword aktif", value: formatMetric(totals.keywords), note: "semua project" },
    { label: "Keyword Top 10", value: formatMetric(totals.top10), note: "snapshot ranking terbaru" },
    { label: "Organic sessions", value: formatMetric(totals.sessions), note: `${formatMonthLabel(month)} · ${totals.trafficCoverage}/${totals.projects} project` },
    { label: "Conversions", value: formatMetric(totals.conversions, 2), note: `${formatMonthLabel(month)} · ${totals.conversionCoverage}/${totals.projects} project` }
  ];

  return (
    <div className="grid-5">
      {items.map((item) => (
        <div className="card stat-card" key={item.label}>
          <div className="stat-label">{item.label}</div>
          <div className="stat-value">{item.value}</div>
          <div className="meta-text">{item.note}</div>
        </div>
      ))}
    </div>
  );
}

type PortfolioRow = {
  id: string;
  name: string;
  domain: string | null;
  market: string;
  keywordCount: number;
  rankedCount: number;
  top3: number;
  top10: number;
  top20: number;
  improved: number;
  declined: number;
  sessions: number | null;
  conversions: number | null;
  sessionsMom: number | null;
  sessionsYoy: number | null;
  conversionsMom: number | null;
  conversionsYoy: number | null;
  sessionsTarget: number | null;
  conversionsTarget: number | null;
  latestRankDate: Date | null;
  latestMetricDate: Date | null;
};

export function PortfolioTable({ rows }: { rows: PortfolioRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Ranking</th>
            <th>Organic sessions</th>
            <th>Conversions</th>
            <th>Data terakhir</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="topic-cell">
                  <Link className="table-link" href={`/performance/projects/${row.id}`}>{row.name}</Link>
                  <span className="meta-text">{row.market} · {row.keywordCount} keyword</span>
                  {row.domain ? <a className="meta-link" href={row.domain} target="_blank" rel="noreferrer">{domainHostname(row.domain)}</a> : null}
                </div>
              </td>
              <td>
                <div className="rank-pills">
                  <span>Top 3 <strong>{row.top3}</strong></span>
                  <span>Top 10 <strong>{row.top10}</strong></span>
                  <span>Top 20 <strong>{row.top20}</strong></span>
                </div>
                <div className="meta-text">
                  {row.rankedCount}/{row.keywordCount} memiliki data
                  {row.improved || row.declined ? (
                    <>
                      {" · "}
                      <span className="movement-up">▲ {row.improved}</span> <span className="movement-down">▼ {row.declined}</span>
                    </>
                  ) : null}
                </div>
              </td>
              <td>
                <div className="metric-cell">
                  <strong>{formatMetric(row.sessions)}</strong>
                  <span>MoM <Delta value={row.sessionsMom} /> · YoY <Delta value={row.sessionsYoy} /></span>
                  {row.sessionsTarget !== null ? <span className="meta-text">Target {formatMetric(row.sessionsTarget)}</span> : null}
                </div>
              </td>
              <td>
                <div className="metric-cell">
                  <strong>{formatMetric(row.conversions, 2)}</strong>
                  <span>MoM <Delta value={row.conversionsMom} /> · YoY <Delta value={row.conversionsYoy} /></span>
                  {row.conversionsTarget !== null ? <span className="meta-text">Target {formatMetric(row.conversionsTarget, 2)}</span> : null}
                </div>
              </td>
              <td>
                <div className="topic-cell">
                  <span>Rank: {formatDate(row.latestRankDate)}</span>
                  <span>Metrik: {formatDate(row.latestMetricDate)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProjectForm({ project }: { project?: Project }) {
  const action = project ? updatePerformanceProjectAction : createPerformanceProjectAction;
  return (
    <form action={action} className="form-grid">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <div className="two-columns">
        <div className="field">
          <label htmlFor="project-name-performance">Nama project</label>
          <input className="input" id="project-name-performance" name="name" defaultValue={project?.name} required />
        </div>
        <div className="field">
          <label htmlFor="brainSlug">Slug OKF Brain</label>
          <input className="input" id="brainSlug" name="brainSlug" defaultValue={project?.brainSlug ?? ""} placeholder="contoh: novena-ent" />
        </div>
      </div>
      <div className="two-columns">
        <div className="field">
          <label htmlFor="domain">Domain</label>
          <input className="input" id="domain" name="domain" type="url" defaultValue={project?.domain ?? ""} placeholder="https://example.com/" />
        </div>
        <div className="field">
          <label htmlFor="market">Market</label>
          <input className="input" id="market" name="market" defaultValue={project?.market ?? "Singapore"} required />
        </div>
      </div>
      <div className="three-columns">
        <div className="field">
          <label htmlFor="rankTrackingFrequency">Frekuensi ranking</label>
          <select className="select" id="rankTrackingFrequency" name="rankTrackingFrequency" defaultValue={project?.rankTrackingFrequency ?? "WEEKLY"}>
            <option value="DAILY">Harian</option>
            <option value="WEEKLY">Mingguan</option>
            <option value="MONTHLY">Bulanan</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="organicSessionsTarget">Target sessions/bulan</label>
          <input className="input" id="organicSessionsTarget" name="organicSessionsTarget" type="number" min="0" defaultValue={project?.organicSessionsTarget ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="conversionsTarget">Target conversions/bulan</label>
          <input className="input" id="conversionsTarget" name="conversionsTarget" type="number" min="0" step="0.01" defaultValue={project?.conversionsTarget ?? ""} />
        </div>
      </div>
      {project ? (
        <div className="field">
          <label htmlFor="project-active">Status project</label>
          <select className="select" id="project-active" name="isActive" defaultValue={String(project.isActive)}>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>
      ) : <input type="hidden" name="isActive" value="true" />}
      <button className="button" type="submit">{project ? "Simpan perubahan project" : "Tambah project"}</button>
    </form>
  );
}

export function KeywordForm({ keyword, projectId }: { keyword?: Keyword; projectId: string }) {
  const action = keyword ? updateKeywordAction : createKeywordAction;
  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="projectId" value={projectId} />
      {keyword ? <input type="hidden" name="id" value={keyword.id} /> : null}
      <div className="field">
        <label htmlFor={keyword ? `phrase-${keyword.id}` : "new-keyword-phrase"}>Keyword</label>
        <input className="input" id={keyword ? `phrase-${keyword.id}` : "new-keyword-phrase"} name="phrase" defaultValue={keyword?.phrase} required />
      </div>
      <div className="field">
        <label htmlFor={keyword ? `target-${keyword.id}` : "new-keyword-target"}>Target URL</label>
        <input className="input" id={keyword ? `target-${keyword.id}` : "new-keyword-target"} name="targetUrl" defaultValue={keyword?.targetUrl ?? ""} placeholder="/service-page/ atau URL penuh" />
      </div>
      <div className="three-columns">
        <div className="field">
          <label htmlFor={keyword ? `location-${keyword.id}` : "new-keyword-location"}>Lokasi</label>
          <input className="input" id={keyword ? `location-${keyword.id}` : "new-keyword-location"} name="location" defaultValue={keyword?.location ?? "Singapore"} required />
        </div>
        <div className="field">
          <label htmlFor={keyword ? `engine-${keyword.id}` : "new-keyword-engine"}>Search engine</label>
          <input className="input" id={keyword ? `engine-${keyword.id}` : "new-keyword-engine"} name="searchEngine" defaultValue={keyword?.searchEngine ?? "Google.com.sg"} required />
        </div>
        <div className="field">
          <label htmlFor={keyword ? `active-${keyword.id}` : "new-keyword-active"}>Status</label>
          <select className="select" id={keyword ? `active-${keyword.id}` : "new-keyword-active"} name="isActive" defaultValue={String(keyword?.isActive ?? true)}>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>
      </div>
      <button className="button" type="submit">{keyword ? "Simpan keyword" : "Tambah keyword"}</button>
    </form>
  );
}

export function MonthlyMetricForm({ projectId }: { projectId: string }) {
  return (
    <form action={saveMonthlyMetricAction} className="form-grid">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="field">
        <label htmlFor="metric-month">Bulan</label>
        <input className="input" id="metric-month" name="month" type="month" required />
      </div>
      <div className="three-columns">
        <div className="field"><label htmlFor="organicSessions">Organic sessions</label><input className="input" id="organicSessions" name="organicSessions" type="number" min="0" /></div>
        <div className="field"><label htmlFor="conversions">Conversions</label><input className="input" id="conversions" name="conversions" type="number" min="0" step="0.01" /></div>
        <div className="field"><label htmlFor="gscClicks">GSC clicks</label><input className="input" id="gscClicks" name="gscClicks" type="number" min="0" /></div>
      </div>
      <div className="three-columns">
        <div className="field"><label htmlFor="gscImpressions">GSC impressions</label><input className="input" id="gscImpressions" name="gscImpressions" type="number" min="0" /></div>
        <div className="field"><label htmlFor="gscCtr">GSC CTR (%)</label><input className="input" id="gscCtr" name="gscCtr" type="number" min="0" step="0.01" /></div>
        <div className="field"><label htmlFor="gscAveragePosition">GSC average position</label><input className="input" id="gscAveragePosition" name="gscAveragePosition" type="number" min="0" step="0.01" /></div>
      </div>
      <button className="button" type="submit">Simpan metrik manual</button>
    </form>
  );
}

export function AnnotationForm({ projectId }: { projectId: string }) {
  return (
    <form action={addProjectAnnotationAction} className="form-grid">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="two-columns">
        <div className="field"><label htmlFor="annotation-date">Tanggal</label><input className="input" id="annotation-date" name="eventDate" type="date" required /></div>
        <div className="field"><label htmlFor="annotation-title">Judul</label><input className="input" id="annotation-title" name="title" placeholder="Contoh: Homepage redesign" required /></div>
      </div>
      <div className="field"><label htmlFor="annotation-note">Catatan</label><textarea className="textarea compact-textarea" id="annotation-note" name="note" rows={3} /></div>
      <button className="button" type="submit">Tambah anotasi</button>
    </form>
  );
}

export function PerformanceImportForm() {
  return (
    <form action={importPerformanceDataAction} className="form-grid" encType="multipart/form-data">
      <div className="field">
        <label htmlFor="performance-import-type">Jenis data</label>
        <select className="select" id="performance-import-type" name="type" defaultValue="KEYWORDS">
          <option value="KEYWORDS">Keyword</option>
          <option value="RANKINGS">Ranking</option>
          <option value="MONTHLY_METRICS">Metrik bulanan</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="performance-import-file">CSV atau Excel</label>
        <input className="input file-input" id="performance-import-file" name="file" type="file" accept=".csv,.xlsx,.xls" required />
      </div>
      <div className="field">
        <label htmlFor="performance-import-date">Tanggal pengecekan ranking</label>
        <input className="input" id="performance-import-date" name="checkedAt" type="date" />
        <span className="muted">Wajib untuk monthly ranking report multi-sheet yang tidak memiliki kolom checked_at.</span>
      </div>
      <button className="button" type="submit">Import data</button>
    </form>
  );
}

export function BrainImportForm() {
  return (
    <form action={importBrainSnapshotAction} className="form-grid" encType="multipart/form-data">
      <div className="field">
        <label htmlFor="brain-snapshot-file">Snapshot OKF Brain (JSON)</label>
        <input className="input file-input" id="brain-snapshot-file" name="file" type="file" accept=".json,application/json" required />
      </div>
      <button className="button" type="submit">Import snapshot OKF Brain</button>
    </form>
  );
}

export function RankDistribution({ distribution }: { distribution: { top3: number; top10: number; top20: number; top100: number; beyond100: number; noData: number } }) {
  const buckets = [
    ["Top 3", distribution.top3],
    ["Top 10", distribution.top10],
    ["Top 20", distribution.top20],
    ["Top 100", distribution.top100],
    ["101+", distribution.beyond100],
    ["Belum ada data", distribution.noData]
  ];
  return <div className="rank-grid">{buckets.map(([label, value]) => <div className="rank-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

export function TrendBars({ timeline }: { timeline: Array<{ month: string; organicSessions: number | null; conversions: number | null }> }) {
  if (!timeline.length) return <div className="empty-state">Belum ada data GA4/GSC atau input manual.</div>;
  const maxSessions = Math.max(...timeline.map((item) => item.organicSessions ?? 0), 1);
  const maxConversions = Math.max(...timeline.map((item) => item.conversions ?? 0), 1);
  return (
    <div className="trend-chart" role="img" aria-label="Tren organic sessions dan conversions bulanan">
      {timeline.map((item) => (
        <div className="trend-column" key={item.month}>
          <div className="trend-bars">
            <span className="trend-bar sessions" style={{ height: `${Math.max(((item.organicSessions ?? 0) / maxSessions) * 100, item.organicSessions ? 4 : 0)}%` }} title={`Sessions ${formatMetric(item.organicSessions)}`} />
            <span className="trend-bar conversions" style={{ height: `${Math.max(((item.conversions ?? 0) / maxConversions) * 100, item.conversions ? 4 : 0)}%` }} title={`Conversions ${formatMetric(item.conversions, 2)}`} />
          </div>
          <span className="trend-label">{formatMonthLabel(item.month).replace(/\s\d{4}$/, "")}</span>
        </div>
      ))}
      <div className="chart-legend"><span><i className="legend-sessions" />Sessions</span><span><i className="legend-conversions" />Conversions</span></div>
    </div>
  );
}

export function TrendLine({
  title,
  color,
  decimals = 0,
  timeline,
  markers = []
}: {
  title: string;
  color: string;
  decimals?: number;
  timeline: Array<{ month: string; value: number | null }>;
  markers?: Array<{ month: string; title: string }>;
}) {
  const known = timeline
    .map((item, index) => ({ ...item, index }))
    .filter((item): item is { month: string; value: number; index: number } => item.value !== null);

  if (!known.length) {
    return (
      <div className="trend-line-block">
        <h3 className="trend-line-title">{title}</h3>
        <div className="empty-state">Belum ada data untuk grafik ini.</div>
      </div>
    );
  }

  const width = 720;
  const height = 220;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 36;
  const max = Math.max(...known.map((item) => item.value), 1);
  const x = (index: number) => padLeft + (index * (width - padLeft - padRight)) / Math.max(timeline.length - 1, 1);
  const y = (value: number) => padTop + (1 - value / max) * (height - padTop - padBottom);
  const path = known.map((item, i) => `${i === 0 ? "M" : "L"}${x(item.index).toFixed(1)},${y(item.value).toFixed(1)}`).join(" ");
  const labelStep = Math.max(1, Math.ceil(timeline.length / 8));
  const gridValues = [0, max / 2, max];

  return (
    <div className="trend-line-block">
      <h3 className="trend-line-title">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Grafik ${title} per bulan`} style={{ width: "100%", height: "auto" }}>
        {gridValues.map((value) => (
          <g key={value}>
            <line x1={padLeft} x2={width - padRight} y1={y(value)} y2={y(value)} stroke="currentColor" strokeOpacity={0.12} />
            <text x={padLeft - 8} y={y(value) + 4} textAnchor="end" fontSize={11} fill="currentColor" fillOpacity={0.6}>
              {formatMetric(value, decimals)}
            </text>
          </g>
        ))}
        {markers.map((marker) => {
          const index = timeline.findIndex((item) => item.month === marker.month);
          if (index < 0) return null;
          return (
            <g key={`${marker.month}-${marker.title}`}>
              <line x1={x(index)} x2={x(index)} y1={padTop} y2={height - padBottom} stroke="#b45309" strokeOpacity={0.55} strokeDasharray="4 4" />
              <circle cx={x(index)} cy={padTop} r={4.5} fill="#b45309">
                <title>{`${formatMonthLabel(marker.month)}: ${marker.title}`}</title>
              </circle>
            </g>
          );
        })}
        <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {known.map((item) => (
          <circle key={item.month} cx={x(item.index)} cy={y(item.value)} r={3.5} fill={color}>
            <title>{`${formatMonthLabel(item.month)}: ${formatMetric(item.value, decimals)}`}</title>
          </circle>
        ))}
        {timeline.map((item, index) =>
          index % labelStep === 0 || index === timeline.length - 1 ? (
            <text key={item.month} x={x(index)} y={height - 10} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.6}>
              {formatMonthLabel(item.month).replace(/\s(\d{2})(\d{2})$/, " '$2")}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

export function MovementSummary({ summary }: { summary: { up: number; down: number; stable: number; entered: number; lost: number } }) {
  const total = summary.up + summary.down + summary.stable + summary.entered + summary.lost;
  if (!total) return null;
  return (
    <div className="movement-summary">
      <span className="movement-up">▲ {summary.up} naik</span>
      <span className="movement-down">▼ {summary.down} turun</span>
      <span className="muted">= {summary.stable} stabil</span>
      {summary.entered ? <span className="movement-up">✚ {summary.entered} masuk ranking</span> : null}
      {summary.lost ? <span className="movement-down">✖ {summary.lost} keluar ranking</span> : null}
    </div>
  );
}

export function RankSparkline({ history }: { history: Array<{ position: number | null; beyondRange: boolean }> }) {
  if (history.length < 2) return <span className="muted">—</span>;
  // Posisi lebih kecil = lebih baik; nilai tanpa data/101+ dipetakan ke 101.
  const values = history.map((item) => item.position ?? 101);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const width = 110;
  const height = 30;
  const pad = 4;
  const x = (index: number) => pad + (index * (width - 2 * pad)) / (values.length - 1);
  const y = (value: number) => pad + ((value - min) / range) * (height - 2 * pad);
  const trend = values[values.length - 1] - values[0];
  const color = trend < 0 ? "#16a34a" : trend > 0 ? "#dc2626" : "#9ca3af";
  const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");

  return (
    <svg width={width} height={height} role="img" aria-label="Tren posisi keyword">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.8} fill={color} />
    </svg>
  );
}

export function ShareOfVoiceChart({
  data
}: {
  data: Array<{ month: string; tracked: number; top3Pct: number | null; top10Pct: number | null }>;
}) {
  const hasData = data.some((item) => item.tracked > 0);
  if (!hasData) {
    return <div className="empty-state">Belum ada data ranking dalam 6 bulan terakhir.</div>;
  }

  const width = 720;
  const height = 220;
  const padLeft = 48;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 36;
  const x = (index: number) => padLeft + (index * (width - padLeft - padRight)) / Math.max(data.length - 1, 1);
  const y = (value: number) => padTop + (1 - value / 100) * (height - padTop - padBottom);
  const series = [
    { key: "top10Pct" as const, label: "Top 10", color: "#2563eb" },
    { key: "top3Pct" as const, label: "Top 3", color: "#16a34a" }
  ];

  return (
    <div className="trend-line-block">
      <div className="sov-legend">
        {series.map((serie) => (
          <span key={serie.key}><span className="sov-dot" style={{ background: serie.color }} /> {serie.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Share of voice per bulan" style={{ width: "100%", height: "auto" }}>
        {[0, 50, 100].map((value) => (
          <g key={value}>
            <line x1={padLeft} x2={width - padRight} y1={y(value)} y2={y(value)} stroke="currentColor" strokeOpacity={0.12} />
            <text x={padLeft - 8} y={y(value) + 4} textAnchor="end" fontSize={11} fill="currentColor" fillOpacity={0.6}>{value}%</text>
          </g>
        ))}
        {series.map((serie) => {
          const known = data
            .map((item, index) => ({ value: item[serie.key], tracked: item.tracked, month: item.month, index }))
            .filter((item): item is { value: number; tracked: number; month: string; index: number } => item.value !== null);
          if (!known.length) return null;
          const path = known.map((item, i) => `${i === 0 ? "M" : "L"}${x(item.index).toFixed(1)},${y(item.value).toFixed(1)}`).join(" ");
          return (
            <g key={serie.key}>
              <path d={path} fill="none" stroke={serie.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {known.map((item) => (
                <circle key={item.month} cx={x(item.index)} cy={y(item.value)} r={3.5} fill={serie.color}>
                  <title>{`${formatMonthLabel(item.month)} · ${serie.label}: ${item.value.toFixed(0)}% dari ${item.tracked} keyword`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {data.map((item, index) => (
          <text key={item.month} x={x(index)} y={height - 10} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.6}>
            {formatMonthLabel(item.month).replace(/\s(\d{2})(\d{2})$/, " '$2")}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function ResetPerformanceDataForm({ scope, buttonLabel }: { scope: "PORTFOLIO" | "TOPICS"; buttonLabel: string }) {
  return (
    <form action={resetPerformanceDataAction} className="form-grid">
      <input type="hidden" name="scope" value={scope} />
      <div className="field">
        <label htmlFor={`reset-confirmation-${scope}`}>Ketik <strong>HAPUS</strong> untuk mengonfirmasi</label>
        <input className="input" id={`reset-confirmation-${scope}`} name="confirmation" autoComplete="off" placeholder="HAPUS" required />
      </div>
      <button className="button" type="submit">{buttonLabel}</button>
    </form>
  );
}

export function canEdit(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.EDITOR;
}

export function CreateUserForm() {
  return (
    <form action={createUserAction} className="form-grid">
      <div className="two-columns">
        <div className="field"><label htmlFor="new-user-username">Username</label><input className="input" id="new-user-username" name="username" minLength={3} required /></div>
        <div className="field"><label htmlFor="new-user-email">Email</label><input className="input" id="new-user-email" name="email" type="email" required /></div>
      </div>
      <div className="two-columns">
        <div className="field"><label htmlFor="new-user-password">Password awal</label><input className="input" id="new-user-password" name="password" type="password" minLength={8} required /></div>
        <div className="field"><label htmlFor="new-user-role">Role</label><select className="select" id="new-user-role" name="role" defaultValue="VIEWER"><option value="ADMIN">Admin</option><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option></select></div>
      </div>
      <button className="button" type="submit">Tambah pengguna</button>
    </form>
  );
}

export function UsernameForm({ username }: { username: string | null }) {
  return (
    <form action={updateOwnUsernameAction} className="form-grid">
      <div className="field">
        <label htmlFor="account-username">Username</label>
        <input className="input" id="account-username" name="username" defaultValue={username ?? ""} minLength={3} required />
      </div>
      <button className="button-secondary" type="submit">Simpan username</button>
    </form>
  );
}

export function UserAccessForm({ user }: { user: { id: string; username: string | null; email: string; role: UserRole; isActive: boolean } }) {
  return (
    <form action={updateUserAccessAction} className="user-access-row">
      <input type="hidden" name="id" value={user.id} />
      <div><strong>{user.username ?? "Username belum diatur"}</strong><span>{user.email}</span></div>
      <select className="select" name="role" defaultValue={user.role} aria-label={`Role ${user.username ?? user.email}`}><option value="ADMIN">Admin</option><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option></select>
      <select className="select" name="isActive" defaultValue={String(user.isActive)} aria-label={`Status ${user.username ?? user.email}`}><option value="true">Aktif</option><option value="false">Nonaktif</option></select>
      <button className="button-secondary" type="submit">Simpan</button>
    </form>
  );
}
