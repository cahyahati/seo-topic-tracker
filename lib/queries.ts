import { ArticleStatus, Prisma, TopicContentType, TopicPriority } from "@prisma/client";

import { db } from "@/lib/db";
import { calculateTopicSimilarity, formatMonthValue } from "@/lib/utils";

export type DashboardFilters = {
  search?: string;
  status?: ArticleStatus | "";
  projectId?: string;
  writer?: string;
  priority?: TopicPriority | "";
  contentType?: TopicContentType | "";
  dueMonth?: string;
};

function buildTopicWhere(filters: DashboardFilters): Prisma.ArticleWhereInput {
  const search = filters.search?.trim();
  const where: Prisma.ArticleWhereInput = {};

  if (search) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive"
        }
      },
      {
        primaryKeywords: {
          contains: search,
          mode: "insensitive"
        }
      },
      {
        secondaryKeywords: {
          contains: search,
          mode: "insensitive"
        }
      }
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.projectId?.trim()) {
    where.projectId = filters.projectId.trim();
  }

  if (filters.writer?.trim()) {
    where.writerName = {
      contains: filters.writer.trim(),
      mode: "insensitive"
    };
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.contentType) {
    where.contentType = filters.contentType;
  }

  if (filters.dueMonth?.trim()) {
    where.dueMonth = filters.dueMonth.trim();
  }

  return where;
}

export async function findSimilarTopics(title: string, excludeId?: string) {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    return [];
  }

  const candidates = await db.article.findMany({
    where: excludeId
      ? {
          NOT: {
            id: excludeId
          }
        }
      : undefined,
    include: {
      project: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return candidates
    .map((topic) => ({
      id: topic.id,
      topicNumber: topic.topicNumber,
      title: topic.title,
      status: topic.status,
      projectName: topic.project.name,
      score: calculateTopicSimilarity(normalizedTitle, topic.title)
    }))
    .filter((topic) => topic.score >= 0.45)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function buildSummaryStats(topics: Array<{ status: ArticleStatus }>) {
  const stats = {
    total: topics.length,
    notAssigned: 0,
    inProgress: 0,
    completed: 0,
    published: 0
  };

  for (const topic of topics) {
    if (topic.status === ArticleStatus.NOT_ASSIGNED) stats.notAssigned += 1;
    if (topic.status === ArticleStatus.ASSIGNED || topic.status === ArticleStatus.DRAFT_RECEIVED) stats.inProgress += 1;
    if (topic.status === ArticleStatus.COMPLETED) stats.completed += 1;
    if (topic.status === ArticleStatus.PUBLISHED) stats.published += 1;
  }

  return stats;
}

export async function getDashboardData(filters: DashboardFilters) {
  const where = buildTopicWhere(filters);

  const [projects, topics, allTopics] = await Promise.all([
    db.project.findMany({
      orderBy: { name: "asc" }
    }),
    db.article.findMany({
      where,
      include: {
        project: true,
        statusHistory: {
          orderBy: {
            changedAt: "desc"
          },
          take: 5
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    }),
    db.article.findMany({
      include: {
        project: true
      }
    })
  ]);

  const dueMonthOptions = Array.from(
    new Set(allTopics.map((topic) => topic.dueMonth).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b));

  const writerOptions = Array.from(
    new Set(allTopics.map((topic) => topic.writerName?.trim()).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b));

  const duplicateMap = new Map<
    string,
    Array<{ id: string; topicNumber: number; title: string; projectName: string; score: number }>
  >();

  for (const topic of topics) {
    const matches = allTopics
      .filter((candidate) => candidate.id !== topic.id)
      .map((candidate) => ({
        id: candidate.id,
        topicNumber: candidate.topicNumber,
        title: candidate.title,
        projectName: candidate.project.name,
        score: calculateTopicSimilarity(topic.title, candidate.title)
      }))
      .filter((candidate) => candidate.score >= 0.45)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    duplicateMap.set(topic.id, matches);
  }

  return {
    projects,
    topics,
    stats: buildSummaryStats(topics),
    dueMonthOptions,
    writerOptions,
    duplicateMap
  };
}

export async function getProjectDetail(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      topics: {
        include: {
          project: true,
          statusHistory: {
            orderBy: {
              changedAt: "desc"
            },
            take: 5
          }
        },
        orderBy: {
          updatedAt: "desc"
        }
      }
    }
  });

  if (!project) {
    return null;
  }

  return {
    project,
    topics: project.topics,
    stats: buildSummaryStats(project.topics)
  };
}

export async function getTopicFormOptions() {
  return db.project.findMany({
    orderBy: {
      name: "asc"
    },
    select: {
      id: true,
      name: true
    }
  });
}

export async function getTopicById(id: string) {
  return db.article.findUnique({
    where: { id },
    include: {
      project: true,
      statusHistory: {
        orderBy: {
          changedAt: "desc"
        }
      }
    }
  });
}

export async function getImportTemplateRows() {
  const sampleMonth = formatMonthValue(new Date());

  return [
    {
      project: "SEO Klinik Gigi",
      title: "Biaya Scaling Gigi di Jakarta",
      brief: "Buat artikel informatif yang menjelaskan faktor harga, proses, dan kapan pasien perlu scaling.",
      primaryKeywords: "biaya scaling gigi",
      secondaryKeywords: "harga scaling gigi, scaling gigi jakarta",
      priority: "HIGH",
      contentType: "INFORMATIONAL",
      writerName: "Dina",
      dueMonth: sampleMonth
    }
  ];
}
