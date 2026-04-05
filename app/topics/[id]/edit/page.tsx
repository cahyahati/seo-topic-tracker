import { notFound } from "next/navigation";

import { TopicForm } from "@/components/forms";
import { requireUser } from "@/lib/auth";
import { getTopicById, getTopicFormOptions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditTopicPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [query, projects, topic] = await Promise.all([searchParams, getTopicFormOptions(), getTopicById(id)]);

  if (!topic) {
    notFound();
  }

  return (
    <div className="stack">
      <div className="card">
        <h1>Edit Topic</h1>
        <p className="muted">Perbarui status workflow, writer, deadline, dan URL publish topik ini.</p>
      </div>

      <div className="card">
        {query.error ? <div className="error-box">{query.error}</div> : null}
        <TopicForm projects={projects} topic={topic} />
      </div>
    </div>
  );
}
