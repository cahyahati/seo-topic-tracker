import { TopicForm } from "@/components/forms";
import { requireUser } from "@/lib/auth";
import { getTopicFormOptions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewTopicPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const [projects, params] = await Promise.all([getTopicFormOptions(), searchParams]);

  return (
    <div className="stack">
      <div className="card">
        <h1>Tambah Topic Idea</h1>
        <p className="muted">Simpan judul, brief, keyword, assignment writer, dan deadline dalam satu tempat.</p>
      </div>

      <div className="card">
        {params.error ? <div className="error-box">{params.error}</div> : null}
        <TopicForm projects={projects} />
      </div>
    </div>
  );
}
