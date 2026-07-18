import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, userCount] = await Promise.all([getSession(), db.user.count()]);

  if (session) {
    redirect("/performance");
  }

  if (userCount === 0) {
    redirect("/setup");
  }

  redirect("/login");
}
