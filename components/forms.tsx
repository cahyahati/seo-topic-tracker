import Link from "next/link";
import { Article, ArticleStatus, Project, TopicContentType, TopicPriority, TopicStatusHistory } from "@prisma/client";

import {
  createProjectAction,
  createTopicAction,
  deleteTopicAction,
  importTopicsAction,
  logoutAction,
  updatePasswordAction,
  updateTopicAction
} from "@/app/actions";
import { CONTENT_TYPE_OPTIONS, PRIORITY_OPTIONS, STATUS_LABELS, STATUS_OPTIONS } from "@/lib/constants";
import { formatDate, formatMonthLabel } from "@/lib/utils";

type ProjectList = Pick<Project, "id" | "name">[];

type TopicWithHistory = Article & {
  statusHistory?: TopicStatusHistory[];
};

export function LogoutForm() {
  return (
    <form action={logoutAction}>
      <button className="button-secondary" type="submit">
        Logout
      </button>
    </form>
  );
}

export function CreateProjectForm() {
  return (
    <form action={createProjectAction} className="form-grid">
      <div className="field">
        <label htmlFor="project-name">Nama project</label>
        <input className="input" id="project-name" name="name" placeholder="Contoh: SEO Klinik Gigi" required />
      </div>
      <button className="button" type="submit">
        Tambah Project
      </button>
    </form>
  );
}

export function ImportTopicsForm() {
  return (
    <form action={importTopicsAction} className="form-grid" encType="multipart/form-data">
      <div className="field">
        <label htmlFor="topic-import-file">Import CSV atau Excel</label>
        <input
          className="input file-input"
          id="topic-import-file"
          name="file"
          type="file"
          accept=".csv,.xlsx,.xls"
          required
        />
      </div>
      <p className="muted compact-text">
        Header yang didukung: `project`, `title`, `brief`, `primary_keywords`, `secondary_keywords`, `priority`,
        `content_type`, `writer_name`, `due_month`, `status`, `publish_url`, `delegated_at`, `published_at`.
      </p>
      <button className="button" type="submit">
        Import Topic Ideas
      </button>
    </form>
  );
}

export function PasswordForm() {
  return (
    <form action={updatePasswordAction} className="form-grid">
      <div className="field">
        <label htmlFor="current-password">Password saat ini</label>
        <input className="input" id="current-password" name="currentPassword" type="password" required />
      </div>
      <div className="field">
        <label htmlFor="new-password">Password baru</label>
        <input className="input" id="new-password" name="newPassword" type="password" minLength={8} required />
      </div>
      <button className="button" type="submit">
        Simpan Password Baru
      </button>
    </form>
  );
}

export function TopicForm({
  projects,
  topic
}: {
  projects: ProjectList;
  topic?: TopicWithHistory;
}) {
  const action = topic ? updateTopicAction : createTopicAction;

  return (
    <form action={action} className="form-grid">
      {topic ? <input type="hidden" name="id" value={topic.id} /> : null}

      <div className="two-columns">
        <div className="field">
          <label htmlFor="projectId">Project SEO</label>
          <select className="select" id="projectId" name="projectId" defaultValue={topic?.projectId ?? ""} required>
            <option value="">Pilih project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="status">Status workflow</label>
          <select className="select" id="status" name="status" defaultValue={topic?.status ?? ArticleStatus.NOT_ASSIGNED}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="title">Judul topik</label>
        <input className="input" id="title" name="title" defaultValue={topic?.title} required />
      </div>

      <div className="field">
        <label htmlFor="brief">Brief untuk content writer</label>
        <textarea className="textarea" id="brief" name="brief" defaultValue={topic?.brief} rows={6} required />
      </div>

      <div className="two-columns">
        <div className="field">
          <label htmlFor="primaryKeywords">Primary keywords</label>
          <input
            className="input"
            id="primaryKeywords"
            name="primaryKeywords"
            defaultValue={topic?.primaryKeywords}
            placeholder="contoh: biaya scaling gigi"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="secondaryKeywords">Secondary keywords</label>
          <input
            className="input"
            id="secondaryKeywords"
            name="secondaryKeywords"
            defaultValue={topic?.secondaryKeywords ?? ""}
            placeholder="contoh: harga scaling gigi, scaling gigi jakarta"
          />
        </div>
      </div>

      <div className="three-columns">
        <div className="field">
          <label htmlFor="priority">Prioritas</label>
          <select className="select" id="priority" name="priority" defaultValue={topic?.priority ?? TopicPriority.MEDIUM}>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="contentType">Content type</label>
          <select
            className="select"
            id="contentType"
            name="contentType"
            defaultValue={topic?.contentType ?? TopicContentType.INFORMATIONAL}
          >
            {CONTENT_TYPE_OPTIONS.map((contentType) => (
              <option key={contentType.value} value={contentType.value}>
                {contentType.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="writerName">Writer</label>
          <input className="input" id="writerName" name="writerName" defaultValue={topic?.writerName ?? ""} />
        </div>
      </div>

      <div className="three-columns">
        <div className="field">
          <label htmlFor="delegatedAt">Tanggal delegasi</label>
          <input
            className="input"
            id="delegatedAt"
            name="delegatedAt"
            type="date"
            defaultValue={topic?.delegatedAt ? topic.delegatedAt.toISOString().slice(0, 10) : ""}
          />
        </div>

        <div className="field">
          <label htmlFor="dueMonth">Deadline bulan</label>
          <input className="input" id="dueMonth" name="dueMonth" type="month" defaultValue={topic?.dueMonth ?? ""} />
        </div>

        <div className="field">
          <label htmlFor="publishedAt">Tanggal publish</label>
          <input
            className="input"
            id="publishedAt"
            name="publishedAt"
            type="date"
            defaultValue={topic?.publishedAt ? topic.publishedAt.toISOString().slice(0, 10) : ""}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="publishUrl">URL publish</label>
        <input
          className="input"
          id="publishUrl"
          name="publishUrl"
          type="url"
          placeholder="https://domain.com/artikel"
          defaultValue={topic?.publishUrl ?? ""}
        />
      </div>

      <div className="inline-actions">
        <button className="button" type="submit">
          {topic ? "Update Topic" : "Simpan Topic"}
        </button>
        <Link href="/dashboard" className="button-secondary">
          Kembali
        </Link>
      </div>

      {topic?.statusHistory?.length ? (
        <div className="history-panel">
          <h3>Riwayat status</h3>
          <div className="history-list">
            {topic.statusHistory.map((history) => (
              <div key={history.id} className="history-item">
                <strong>{STATUS_LABELS[history.toStatus]}</strong>
                <span className="muted">
                  {history.fromStatus ? `${STATUS_LABELS[history.fromStatus]} → ` : ""}
                  {formatDate(history.changedAt)}
                  {history.writerName ? ` • ${history.writerName}` : ""}
                </span>
              </div>
            ))}
          </div>
          <p className="muted compact-text">
            Deadline saat ini: <strong>{formatMonthLabel(topic.dueMonth)}</strong>
          </p>
        </div>
      ) : null}
    </form>
  );
}

export function DeleteTopicForm({ topicId }: { topicId: string }) {
  return (
    <form action={deleteTopicAction}>
      <input type="hidden" name="id" value={topicId} />
      <button className="button-danger" type="submit">
        Hapus
      </button>
    </form>
  );
}
