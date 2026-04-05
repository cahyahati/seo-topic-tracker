import Link from "next/link";
import { notFound } from "next/navigation";

import { HeaderActions, StatCards, TopicsTable } from "@/components/dashboard-view";
import { requireUser } from "@/lib/auth";
import { getProjectDetail } from "@/lib/queries";
import { calculateTopicSimilarity } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const data = await getProjectDetail(id);

  if (!data) {
    notFound();
  }

  const duplicateMap = new Map<
    string,
    Array<{ id: string; topicNumber: number; title: string; projectName: string; score: number }>
  >();

  for (const topic of data.topics) {
    duplicateMap.set(
      topic.id,
      data.topics
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
        .slice(0, 3)
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="headline">
          <div>
            <h1>{data.project.name}</h1>
            <p className="muted">Ringkasan topic ideas dan progress delegasi untuk project SEO ini.</p>
          </div>
          <HeaderActions />
        </div>
      </div>

      <StatCards stats={data.stats} />

      <div className="card">
        <div className="headline">
          <div>
            <h2>Topic dalam project</h2>
            <p className="muted">Semua topic idea pada project ini tampil lengkap dengan duplicate warning.</p>
          </div>
          <Link href="/dashboard" className="button-secondary">
            Kembali ke Dashboard
          </Link>
        </div>
        <TopicsTable topics={data.topics} duplicateMap={duplicateMap} />
      </div>
    </div>
  );
}
