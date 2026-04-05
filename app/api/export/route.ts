import { ArticleStatus, TopicContentType, TopicPriority } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { CONTENT_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { getDashboardData } from "@/lib/queries";
import { formatMonthLabel, formatTopicCode } from "@/lib/utils";

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const contentType = searchParams.get("contentType");

  const data = await getDashboardData({
    search: searchParams.get("search") ?? "",
    projectId: searchParams.get("projectId") ?? "",
    writer: searchParams.get("writer") ?? "",
    dueMonth: searchParams.get("dueMonth") ?? "",
    priority: priority ? (priority as TopicPriority) : "",
    contentType: contentType ? (contentType as TopicContentType) : "",
    status: status ? (status as ArticleStatus) : ""
  });

  const rows = [
    [
      "Topic ID",
      "Project",
      "Judul",
      "Brief",
      "Primary Keywords",
      "Secondary Keywords",
      "Status",
      "Writer",
      "Deadline Bulan",
      "Prioritas",
      "Content Type",
      "URL Publish",
      "Tanggal Delegasi",
      "Tanggal Publish"
    ]
  ];

  for (const topic of data.topics) {
    rows.push([
      formatTopicCode(topic.topicNumber),
      topic.project.name,
      topic.title,
      topic.brief,
      topic.primaryKeywords,
      topic.secondaryKeywords ?? "",
      STATUS_LABELS[topic.status],
      topic.writerName ?? "",
      formatMonthLabel(topic.dueMonth),
      PRIORITY_LABELS[topic.priority],
      CONTENT_TYPE_LABELS[topic.contentType],
      topic.publishUrl ?? "",
      topic.delegatedAt ? topic.delegatedAt.toISOString().slice(0, 10) : "",
      topic.publishedAt ? topic.publishedAt.toISOString().slice(0, 10) : ""
    ]);
  }

  const csv = rows.map((row) => row.map((value) => escapeCsv(String(value))).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="seo-topic-tracker-export.csv"'
    }
  });
}
