import Link from "next/link";
import { ArticleStatus, TopicContentType, TopicPriority } from "@prisma/client";

import { HeaderActions, StatCards, TopicsTable } from "@/components/dashboard-view";
import { CreateProjectForm, ImportTopicsForm } from "@/components/forms";
import { requireUser } from "@/lib/auth";
import { CONTENT_TYPE_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import { formatMonthLabel } from "@/lib/utils";
import { getDashboardData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{
    search?: string;
    status?: ArticleStatus | "";
    projectId?: string;
    writer?: string;
    priority?: TopicPriority | "";
    contentType?: TopicContentType | "";
    dueMonth?: string;
    error?: string;
    success?: string;
  }>;
}) {
  await requireUser();
  const params = await searchParams;

  const data = await getDashboardData({
    search: params.search,
    status: params.status,
    projectId: params.projectId,
    writer: params.writer,
    priority: params.priority,
    contentType: params.contentType,
    dueMonth: params.dueMonth
  });

  const exportParams = new URLSearchParams();
  if (params.search) exportParams.set("search", params.search);
  if (params.status) exportParams.set("status", params.status);
  if (params.projectId) exportParams.set("projectId", params.projectId);
  if (params.writer) exportParams.set("writer", params.writer);
  if (params.priority) exportParams.set("priority", params.priority);
  if (params.contentType) exportParams.set("contentType", params.contentType);
  if (params.dueMonth) exportParams.set("dueMonth", params.dueMonth);

  return (
    <div className="stack">
      <div className="card">
        <div className="headline">
          <div>
            <h1>Dashboard Topic Tracker SEO</h1>
            <p className="muted">
              Track topic ideas per project SEO, pantau status delegasi ke writer, dan cegah topik ganda.
            </p>
          </div>
          <HeaderActions />
        </div>
      </div>

      {params.error ? <div className="error-box">{params.error}</div> : null}
      {params.success ? <div className="success-box">{params.success}</div> : null}

      <StatCards stats={data.stats} />

      <div className="grid-2">
        <div className="card">
          <h2>Filter & Export</h2>
          <form className="stack">
            <div className="filters">
              <div className="field">
                <label htmlFor="search">Cari judul / keyword</label>
                <input
                  className="input"
                  id="search"
                  name="search"
                  placeholder="Cari topic idea..."
                  defaultValue={params.search ?? ""}
                />
              </div>
              <div className="field">
                <label htmlFor="status">Status</label>
                <select className="select" id="status" name="status" defaultValue={params.status ?? ""}>
                  <option value="">Semua status</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="projectId">Project</label>
                <select className="select" id="projectId" name="projectId" defaultValue={params.projectId ?? ""}>
                  <option value="">Semua project</option>
                  {data.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="writer">Writer</label>
                <input
                  className="input"
                  id="writer"
                  name="writer"
                  list="writer-options"
                  defaultValue={params.writer ?? ""}
                  placeholder="Semua writer"
                />
                <datalist id="writer-options">
                  {data.writerOptions.map((writer) => (
                    <option key={writer} value={writer} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label htmlFor="priority">Prioritas</label>
                <select className="select" id="priority" name="priority" defaultValue={params.priority ?? ""}>
                  <option value="">Semua prioritas</option>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="contentType">Content type</label>
                <select className="select" id="contentType" name="contentType" defaultValue={params.contentType ?? ""}>
                  <option value="">Semua type</option>
                  {CONTENT_TYPE_OPTIONS.map((contentType) => (
                    <option key={contentType.value} value={contentType.value}>
                      {contentType.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="dueMonth">Deadline bulan</label>
                <select className="select" id="dueMonth" name="dueMonth" defaultValue={params.dueMonth ?? ""}>
                  <option value="">Semua deadline</option>
                  {data.dueMonthOptions.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="actions">
              <button className="button" type="submit">
                Terapkan Filter
              </button>
              <Link href="/dashboard" className="button-secondary">
                Reset
              </Link>
              <a className="button-secondary" href={`/api/export?${exportParams.toString()}`}>
                Export CSV
              </a>
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Tambah Project</h2>
          <p className="muted">Setiap topic idea akan terkait ke satu project SEO.</p>
          <CreateProjectForm />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Import Topic Ideas</h2>
          <p className="muted">
            Upload CSV atau Excel untuk menambahkan ratusan topik sekaligus. Project yang belum ada akan dibuat
            otomatis.
          </p>
          <ImportTopicsForm />
        </div>

        <div className="card">
          <h2>Ringkasan Workflow</h2>
          <div className="stack compact-stack">
            <div className="summary-row">
              <span>Belum didelegasikan</span>
              <strong>{data.stats.notAssigned}</strong>
            </div>
            <div className="summary-row">
              <span>Sedang dikerjakan</span>
              <strong>{data.stats.inProgress}</strong>
            </div>
            <div className="summary-row">
              <span>Disetujui</span>
              <strong>{data.stats.approved}</strong>
            </div>
            <div className="summary-row">
              <span>Published</span>
              <strong>{data.stats.published}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="headline">
          <div>
            <h2>Daftar Topic Ideas</h2>
            <p className="muted">Klik nama project untuk membuka ringkasan topic khusus project tersebut.</p>
          </div>
          <Link href="/topics/new" className="button">
            Tambah Topic
          </Link>
        </div>
        <TopicsTable topics={data.topics} duplicateMap={data.duplicateMap} />
      </div>
    </div>
  );
}
