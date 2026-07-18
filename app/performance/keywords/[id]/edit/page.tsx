import Link from "next/link";
import { notFound } from "next/navigation";

import { KeywordForm } from "@/components/performance-dashboard";
import { requireEditor } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditKeywordPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireEditor();
  const { id } = await params;
  const messages = await searchParams;
  const keyword = await db.keyword.findUnique({ where: { id }, include: { project: true } });
  if (!keyword) notFound();

  return (
    <div className="stack narrow-page">
      <div className="card">
        <div className="headline"><div><span className="eyebrow">{keyword.project.name}</span><h1>Edit Keyword</h1></div><Link className="button-secondary" href={`/performance/projects/${keyword.projectId}`}>Kembali</Link></div>
      </div>
      <div className="card">
        {messages.error ? <div className="error-box">{messages.error}</div> : null}
        <KeywordForm keyword={keyword} projectId={keyword.projectId} />
      </div>
    </div>
  );
}
