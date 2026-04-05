import Link from "next/link";
import { Article, Project, TopicStatusHistory } from "@prisma/client";

import { DeleteTopicForm, LogoutForm } from "@/components/forms";
import { CONTENT_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatMonthLabel, formatTopicCode } from "@/lib/utils";

type DashboardTopic = Article & {
  project: Project;
  statusHistory: TopicStatusHistory[];
};

export function HeaderActions() {
  return (
    <div className="actions">
      <Link href="/topics/new" className="button">
        Tambah Topic
      </Link>
      <Link href="/settings" className="button-secondary">
        Pengaturan
      </Link>
      <LogoutForm />
    </div>
  );
}

export function StatCards({
  stats
}: {
  stats: {
    total: number;
    notAssigned: number;
    inProgress: number;
    completed: number;
    published: number;
  };
}) {
  const items = [
    { label: "Total Topic", value: stats.total },
    { label: "Belum didelegasikan", value: stats.notAssigned },
    { label: "Sedang dikerjakan", value: stats.inProgress },
    { label: "Selesai", value: stats.completed },
    { label: "Published", value: stats.published }
  ];

  return (
    <div className="grid-5">
      {items.map((item) => (
        <div key={item.label} className="card stat-card">
          <div className="stat-label">{item.label}</div>
          <div className="stat-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function TopicsTable({
  topics,
  duplicateMap
}: {
  topics: DashboardTopic[];
  duplicateMap: Map<string, Array<{ id: string; topicNumber: number; title: string; projectName: string; score: number }>>;
}) {
  if (!topics.length) {
    return <div className="empty-state">Belum ada topik yang cocok dengan filter ini.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Topic ID</th>
            <th>Judul & Brief</th>
            <th>Project</th>
            <th>Status</th>
            <th>Writer</th>
            <th>Deadline</th>
            <th>Prioritas</th>
            <th>Content Type</th>
            <th>Duplicate Check</th>
            <th>Publish</th>
            <th>Riwayat</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {topics.map((topic) => {
            const similarTopics = duplicateMap.get(topic.id) ?? [];
            const latestHistory = topic.statusHistory[0];

            return (
              <tr key={topic.id}>
                <td>
                  <strong>{formatTopicCode(topic.topicNumber)}</strong>
                </td>
                <td>
                  <div className="topic-cell">
                    <strong>{topic.title}</strong>
                    <span className="muted line-clamp">{topic.brief}</span>
                    <span className="meta-text">Primary: {topic.primaryKeywords}</span>
                    {topic.secondaryKeywords ? (
                      <span className="meta-text">Secondary: {topic.secondaryKeywords}</span>
                    ) : null}
                  </div>
                </td>
                <td>
                  <Link href={`/projects/${topic.project.id}`} className="project-tag">
                    {topic.project.name}
                  </Link>
                </td>
                <td>
                  <span className="badge">{STATUS_LABELS[topic.status]}</span>
                </td>
                <td>{topic.writerName ?? <span className="muted">-</span>}</td>
                <td>
                  <div className="topic-cell">
                    <span>{formatMonthLabel(topic.dueMonth)}</span>
                    <span className="meta-text">Delegasi: {formatDate(topic.delegatedAt)}</span>
                  </div>
                </td>
                <td>
                  <span className="badge badge-soft">{PRIORITY_LABELS[topic.priority]}</span>
                </td>
                <td>
                  <span className="badge badge-soft">{CONTENT_TYPE_LABELS[topic.contentType]}</span>
                </td>
                <td>
                  {similarTopics.length ? (
                    <div className="topic-cell warning-text">
                      <strong>{similarTopics.length} topik mirip</strong>
                      {similarTopics.map((similarTopic) => (
                        <span key={similarTopic.id} className="meta-text">
                          {formatTopicCode(similarTopic.topicNumber)} • {similarTopic.projectName} •{" "}
                          {Math.round(similarTopic.score * 100)}%
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="muted">Aman</span>
                  )}
                </td>
                <td>
                  <div className="topic-cell">
                    {topic.publishUrl ? (
                      <a href={topic.publishUrl} target="_blank" rel="noreferrer">
                        Buka URL
                      </a>
                    ) : (
                      <span className="muted">Belum ada</span>
                    )}
                    <span className="meta-text">Publish: {formatDate(topic.publishedAt)}</span>
                  </div>
                </td>
                <td>
                  <div className="topic-cell">
                    <span>{latestHistory ? formatDate(latestHistory.changedAt) : "-"}</span>
                    <span className="meta-text">
                      {latestHistory?.writerName ? `Writer saat ini: ${latestHistory.writerName}` : "Belum ada writer"}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="inline-actions">
                    <Link href={`/topics/${topic.id}/edit`} className="button-secondary">
                      Edit
                    </Link>
                    <DeleteTopicForm topicId={topic.id} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
