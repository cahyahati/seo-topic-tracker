import { UserRole } from "@prisma/client";
import Link from "next/link";

import { PasswordForm } from "@/components/forms";
import { CreateUserForm, ResetPerformanceDataForm, UserAccessForm, UsernameForm } from "@/components/performance-dashboard";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const users = user.role === UserRole.ADMIN
    ? await db.user.findMany({
        select: { id: true, username: true, email: true, role: true, isActive: true },
        orderBy: [{ isActive: "desc" }, { username: "asc" }]
      })
    : [];

  return (
    <div className="stack">
      <div className="card">
        <div className="headline">
          <div>
            <h1>Pengaturan</h1>
            <p className="muted">Kelola password dan akses pengguna dashboard.</p>
          </div>
          <Link href="/performance" className="button-secondary">
            Kembali
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Akun saya</h2>
        <p className="muted">{user.username ?? "Username belum diatur"} · {user.email} · {user.role}</p>
        {params.error ? <div className="error-box">{params.error}</div> : null}
        {params.success ? <div className="success-box">{params.success}</div> : null}
        <div className="grid-2 balanced-grid">
          <UsernameForm username={user.username} />
          <PasswordForm />
        </div>
      </div>

      {user.role === UserRole.ADMIN ? (
        <>
          <div className="card">
            <h2>Tambah pengguna</h2>
            <p className="muted">Admin dapat mengelola semuanya, Editor dapat mengubah data, dan Viewer hanya dapat melihat dashboard.</p>
            <CreateUserForm />
          </div>
          <div className="card">
            <h2>Pengguna</h2>
            <div className="user-list">{users.map((item) => <UserAccessForm key={item.id} user={item} />)}</div>
          </div>
          <div className="card">
            <h2>Reset data</h2>
            <p className="muted">Tindakan di bawah tidak dapat dibatalkan. Akun pengguna tidak pernah ikut terhapus.</p>
            <div className="grid-2 balanced-grid">
              <div>
                <h3>SEO Portfolio</h3>
                <p className="muted">
                  Menghapus semua keyword, ranking, metrik bulanan, anotasi, riwayat import, dan project yang tidak
                  memiliki topic. Topic Tracker tidak tersentuh.
                </p>
                <ResetPerformanceDataForm scope="PORTFOLIO" buttonLabel="Reset SEO Portfolio" />
              </div>
              <div>
                <h3>Topic Tracker</h3>
                <p className="muted">
                  Menghapus semua topic/article beserta riwayat statusnya. Project dan data SEO portfolio tetap ada.
                </p>
                <ResetPerformanceDataForm scope="TOPICS" buttonLabel="Reset Topic Tracker" />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
