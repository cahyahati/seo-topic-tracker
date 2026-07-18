import { DataSource, KeywordDevice, MonthlyMetric } from "@prisma/client";

import { db } from "@/lib/db";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function toMonthDate(value?: string) {
  if (value && MONTH_PATTERN.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1));
  }

  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
}

export function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function shiftMonth(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

export function formatMetric(value: number | null | undefined, maximumFractionDigits = 0) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(value);
}

export function calculatePercentChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

type MetricField =
  | "organicSessions"
  | "conversions"
  | "gscClicks"
  | "gscImpressions"
  | "gscCtr"
  | "gscAveragePosition";

const SOURCE_PRIORITY: Record<MetricField, DataSource[]> = {
  organicSessions: [DataSource.GA4, DataSource.MANUAL, DataSource.IMPORT, DataSource.OKF_BRAIN],
  conversions: [DataSource.GA4, DataSource.MANUAL, DataSource.IMPORT, DataSource.OKF_BRAIN],
  gscClicks: [DataSource.GSC, DataSource.MANUAL, DataSource.IMPORT, DataSource.OKF_BRAIN],
  gscImpressions: [DataSource.GSC, DataSource.MANUAL, DataSource.IMPORT, DataSource.OKF_BRAIN],
  gscCtr: [DataSource.GSC, DataSource.MANUAL, DataSource.IMPORT, DataSource.OKF_BRAIN],
  gscAveragePosition: [DataSource.GSC, DataSource.MANUAL, DataSource.IMPORT, DataSource.OKF_BRAIN]
};

export function resolveMonthlyMetrics(rows: MonthlyMetric[]) {
  const pick = (field: MetricField) => {
    for (const source of SOURCE_PRIORITY[field]) {
      const row = rows.find((candidate) => candidate.source === source && candidate[field] !== null);
      if (row && row[field] !== null) return row[field] as number;
    }

    const fallback = rows.find((candidate) => candidate[field] !== null);
    return fallback && fallback[field] !== null ? (fallback[field] as number) : null;
  };

  return {
    organicSessions: pick("organicSessions"),
    conversions: pick("conversions"),
    gscClicks: pick("gscClicks"),
    gscImpressions: pick("gscImpressions"),
    gscCtr: pick("gscCtr"),
    gscAveragePosition: pick("gscAveragePosition")
  };
}

function latestRankForKeyword(
  rankings: Array<{
    position: number | null;
    beyondRange: boolean;
    checkedAt: Date;
    device: KeywordDevice;
    rankingUrl: string | null;
  }>
) {
  return [...rankings].sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())[0] ?? null;
}

export async function getPortfolioPerformance(monthValue?: string) {
  const selectedMonth = toMonthDate(monthValue);
  const previousMonth = shiftMonth(selectedMonth, -1);
  const previousYear = shiftMonth(selectedMonth, -12);

  const projects = await db.project.findMany({
    where: { isActive: true },
    include: {
      keywords: {
        where: { isActive: true },
        include: {
          rankings: {
            orderBy: { checkedAt: "desc" },
            take: 4
          }
        },
        orderBy: { phrase: "asc" }
      },
      monthlyMetrics: {
        where: { month: { in: [selectedMonth, previousMonth, previousYear] } },
        orderBy: { updatedAt: "desc" }
      }
    },
    orderBy: { name: "asc" }
  });

  const rows = projects.map((project) => {
    const current = resolveMonthlyMetrics(project.monthlyMetrics.filter((row) => monthKey(row.month) === monthKey(selectedMonth)));
    const momBase = resolveMonthlyMetrics(project.monthlyMetrics.filter((row) => monthKey(row.month) === monthKey(previousMonth)));
    const yoyBase = resolveMonthlyMetrics(project.monthlyMetrics.filter((row) => monthKey(row.month) === monthKey(previousYear)));
    const latestRanks = project.keywords.map((keyword) => latestRankForKeyword(keyword.rankings)).filter(Boolean);
    const knownRanks = latestRanks.filter((rank) => rank?.position !== null && !rank?.beyondRange);
    const latestRankDate = latestRanks.reduce<Date | null>((latest, rank) => {
      if (!rank) return latest;
      return !latest || rank.checkedAt > latest ? rank.checkedAt : latest;
    }, null);
    const latestMetricDate = project.monthlyMetrics.reduce<Date | null>((latest, metric) => {
      return !latest || metric.updatedAt > latest ? metric.updatedAt : latest;
    }, null);

    return {
      id: project.id,
      name: project.name,
      domain: project.domain,
      market: project.market,
      keywordCount: project.keywords.length,
      rankedCount: knownRanks.length,
      top3: knownRanks.filter((rank) => (rank?.position ?? 999) <= 3).length,
      top10: knownRanks.filter((rank) => (rank?.position ?? 999) <= 10).length,
      top20: knownRanks.filter((rank) => (rank?.position ?? 999) <= 20).length,
      sessions: current.organicSessions,
      conversions: current.conversions,
      sessionsMom: calculatePercentChange(current.organicSessions, momBase.organicSessions),
      sessionsYoy: calculatePercentChange(current.organicSessions, yoyBase.organicSessions),
      conversionsMom: calculatePercentChange(current.conversions, momBase.conversions),
      conversionsYoy: calculatePercentChange(current.conversions, yoyBase.conversions),
      sessionsTarget: project.organicSessionsTarget,
      conversionsTarget: project.conversionsTarget,
      latestRankDate,
      latestMetricDate
    };
  });

  const sessionValues = rows.map((row) => row.sessions).filter((value): value is number => value !== null);
  const conversionValues = rows.map((row) => row.conversions).filter((value): value is number => value !== null);

  return {
    selectedMonth,
    rows,
    totals: {
      projects: rows.length,
      keywords: rows.reduce((sum, row) => sum + row.keywordCount, 0),
      top10: rows.reduce((sum, row) => sum + row.top10, 0),
      sessions: sessionValues.length ? sessionValues.reduce((sum, value) => sum + value, 0) : null,
      conversions: conversionValues.length ? conversionValues.reduce((sum, value) => sum + value, 0) : null,
      trafficCoverage: sessionValues.length,
      conversionCoverage: conversionValues.length
    }
  };
}

export async function getPerformanceProject(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      keywords: {
        include: {
          rankings: {
            orderBy: { checkedAt: "desc" },
            take: 24
          }
        },
        orderBy: { phrase: "asc" }
      },
      monthlyMetrics: {
        orderBy: [{ month: "asc" }, { updatedAt: "desc" }]
      },
      annotations: {
        orderBy: { eventDate: "desc" },
        take: 20
      },
      imports: {
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });

  if (!project) return null;

  const rankingRows = project.keywords.map((keyword) => {
    const rankings = [...keyword.rankings].sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime());
    const current = rankings[0] ?? null;
    const previous = rankings.find((rank) => rank.device === current?.device && rank.checkedAt < (current?.checkedAt ?? new Date(0))) ?? null;
    const movement = current?.position != null && previous?.position != null ? previous.position - current.position : null;

    return { keyword, current, previous, movement };
  });

  const knownCurrentRanks = rankingRows.filter((row) => row.current?.position !== null && !row.current?.beyondRange);
  const monthGroups = new Map<string, MonthlyMetric[]>();
  for (const metric of project.monthlyMetrics) {
    const key = monthKey(metric.month);
    monthGroups.set(key, [...(monthGroups.get(key) ?? []), metric]);
  }
  const timeline = Array.from(monthGroups.entries())
    .map(([month, metrics]) => ({ month, ...resolveMonthlyMetrics(metrics) }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-24);

  return {
    project,
    rankingRows,
    timeline,
    rankDistribution: {
      top3: knownCurrentRanks.filter((row) => (row.current?.position ?? 999) <= 3).length,
      top10: knownCurrentRanks.filter((row) => (row.current?.position ?? 999) <= 10).length,
      top20: knownCurrentRanks.filter((row) => (row.current?.position ?? 999) <= 20).length,
      top100: knownCurrentRanks.filter((row) => (row.current?.position ?? 999) <= 100).length,
      beyond100: rankingRows.filter((row) => row.current?.beyondRange).length,
      noData: rankingRows.filter((row) => !row.current).length
    }
  };
}

export async function getPerformanceProjectOptions() {
  return db.project.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
}
