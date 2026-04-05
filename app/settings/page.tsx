import Link from "next/link";

import { PasswordForm } from "@/components/forms";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  return (
    <div className="stack">
      <div className="card">
        <div className="headline">
          <div>
            <h1>Pengaturan</h1>
            <p className="muted">Kelola akun admin dan password dashboard.</p>
          </div>
          <Link href="/dashboard" className="button-secondary">
            Kembali
          </Link>
        </div>
      </div>

      <div className="card">
        <p className="muted">Email admin aktif: {user.email}</p>
        {params.error ? <div className="error-box">{params.error}</div> : null}
        {params.success ? <div className="success-box">{params.success}</div> : null}
        <PasswordForm />
      </div>
    </div>
  );
}
