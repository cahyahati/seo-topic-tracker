import Link from "next/link";

import { ProjectForm } from "@/components/performance-dashboard";
import { requireEditor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewPerformanceProjectPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireEditor();
  const params = await searchParams;
  return (
    <div className="stack narrow-page">
      <div className="card">
        <div className="headline">
          <div><span className="eyebrow">Portfolio</span><h1>Tambah Project</h1></div>
          <Link href="/performance" className="button-secondary">Kembali</Link>
        </div>
      </div>
      <div className="card">
        {params.error ? <div className="error-box">{params.error}</div> : null}
        <ProjectForm />
      </div>
    </div>
  );
}
