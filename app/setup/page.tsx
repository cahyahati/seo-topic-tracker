import { redirect } from "next/navigation";

import { setupAdminAction } from "@/app/actions";
import { redirectIfAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await redirectIfAuthenticated();

  const userCount = await db.user.count();
  const params = await searchParams;

  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Setup Admin Pertama</h1>
        <p className="muted">
          Halaman ini hanya muncul sekali untuk membuat akun admin pertama dashboard Anda.
        </p>
        {params.error ? <div className="error-box">{params.error}</div> : null}
        <form action={setupAdminAction} className="form-grid">
          <div className="field">
            <label htmlFor="username">Username admin</label>
            <input className="input" id="username" name="username" minLength={3} autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="email">Email admin</label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" minLength={8} required />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Konfirmasi password</label>
            <input
              className="input"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              required
            />
          </div>
          <button className="button" type="submit">
            Buat Admin
          </button>
        </form>
      </div>
    </div>
  );
}
