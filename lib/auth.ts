import "server-only";

import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";

const SESSION_COOKIE = "seo_dashboard_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is required.");
  }

  return new TextEncoder().encode(secret);
}

type SessionPayload = {
  userId: string;
  email: string;
  username?: string | null;
  role: UserRole;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify<SessionPayload>(token, getSecret());
    return verified.payload;
  } catch {
    return null;
  }
});

export async function requireUser() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId }
  });

  if (!user || !user.isActive) {
    await clearSession();
    redirect("/login");
  }

  return user;
}

export async function requireEditor() {
  const user = await requireUser();

  if (!user.isActive || user.role === UserRole.VIEWER) {
    redirect("/performance?error=" + encodeURIComponent("Akun ini hanya memiliki akses melihat data."));
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!user.isActive || user.role !== UserRole.ADMIN) {
    redirect("/performance?error=" + encodeURIComponent("Aksi ini hanya tersedia untuk admin."));
  }

  return user;
}

export async function redirectIfAuthenticated() {
  const session = await getSession();

  if (session) {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, isActive: true }
    });

    if (user?.isActive) {
      redirect("/performance");
    }
  }
}
