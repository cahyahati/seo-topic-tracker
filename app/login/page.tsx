import { redirect } from "next/navigation";

import { loginAction } from "@/app/actions";
import { redirectIfAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await redirectIfAuthenticated();

  const userCount = await db.user.count();
  const params = await searchParams;

  if (userCount === 0) {
    redirect("/setup");
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Login Admin</h1>
        <p className="muted">
          Masuk untuk mengelola artikel SEO, melihat ringkasan per status, dan export laporan CSV.
        </p>
        {params.error ? <div className="error-box">{params.error}</div> : null}
        <form action={loginAction} className="form-grid">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required />
          </div>
          <button className="button" type="submit">
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}
