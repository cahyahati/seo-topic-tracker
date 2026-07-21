"use server";

import { ArticleStatus, TopicContentType, TopicPriority, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { read, utils } from "xlsx";

import {
  clearSession,
  createSession,
  hashPassword,
  requireUser,
  verifyPassword
} from "@/lib/auth";
import { db } from "@/lib/db";
import { findSimilarTopics } from "@/lib/queries";
import { normalizeTopicTitle } from "@/lib/utils";

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

const loginSchema = z.object({
  identity: z.string().min(3, "Username atau email wajib diisi."),
  password: z.string().min(8, "Password minimal 8 karakter.")
});

const setupSchema = z
  .object({
    username: z.string().min(3, "Username minimal 3 karakter.").regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung."),
    email: z.string().email("Email tidak valid."),
    password: z.string().min(8, "Password minimal 8 karakter."),
    confirmPassword: z.string().min(8, "Konfirmasi password minimal 8 karakter.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"]
  });

const topicSchema = z
  .object({
    id: z.string().optional(),
    projectId: z.string().min(1, "Project wajib dipilih."),
    title: z.string().min(3, "Judul topik minimal 3 karakter."),
    brief: z.string().min(10, "Brief untuk writer minimal 10 karakter."),
    primaryKeywords: z.string().min(2, "Primary keyword wajib diisi."),
    secondaryKeywords: z.string().nullable(),
    writerName: z.string().nullable(),
    delegatedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal delegasi tidak valid.")
      .nullable(),
    dueMonth: z.string().regex(/^\d{4}-\d{2}$/, "Format deadline bulan harus YYYY-MM.").nullable(),
    publishUrl: z.string().url("URL publish tidak valid.").nullable(),
    status: z.nativeEnum(ArticleStatus),
    priority: z.nativeEnum(TopicPriority),
    contentType: z.nativeEnum(TopicContentType),
    publishedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal publish tidak valid.")
      .nullable()
  })
  .superRefine((value, ctx) => {
    const assignedStatuses: ArticleStatus[] = [
      ArticleStatus.ASSIGNED,
      ArticleStatus.DRAFT_RECEIVED,
      ArticleStatus.PENDING_APPROVAL,
      ArticleStatus.APPROVED,
      ArticleStatus.PUBLISHED
    ];

    if (value.status === ArticleStatus.PUBLISHED && !value.publishUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publishUrl"],
        message: "URL publish wajib diisi saat status Publish."
      });
    }

    if (assignedStatuses.includes(value.status) && !value.writerName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["writerName"],
        message: "Nama writer wajib diisi saat topik sudah didelegasikan."
      });
    }
  });

function toTopicPayload(formData: FormData) {
  return topicSchema.parse({
    id: normalizeOptionalString(formData.get("id")) ?? undefined,
    projectId: String(formData.get("projectId") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    brief: String(formData.get("brief") ?? "").trim(),
    primaryKeywords: String(formData.get("primaryKeywords") ?? "").trim(),
    secondaryKeywords: normalizeOptionalString(formData.get("secondaryKeywords")),
    writerName: normalizeOptionalString(formData.get("writerName")),
    delegatedAt: normalizeOptionalString(formData.get("delegatedAt")),
    dueMonth: normalizeOptionalString(formData.get("dueMonth")),
    publishUrl: normalizeOptionalString(formData.get("publishUrl")),
    status: formData.get("status"),
    priority: formData.get("priority"),
    contentType: formData.get("contentType"),
    publishedAt: normalizeOptionalString(formData.get("publishedAt")),
  });
}

function getDelegatedAtValue(status: ArticleStatus, delegatedAt: string | null) {
  if (status === ArticleStatus.NOT_ASSIGNED) {
    return delegatedAt ? new Date(delegatedAt) : null;
  }

  return delegatedAt ? new Date(delegatedAt) : new Date();
}

function buildDuplicateMessage(
  similarTopics: Array<{ topicNumber: number; title: string; projectName: string }>
) {
  if (!similarTopics.length) {
    return "";
  }

  const preview = similarTopics
    .slice(0, 3)
    .map((topic) => `TOP-${String(topic.topicNumber).padStart(4, "0")} (${topic.projectName})`)
    .join(", ");

  return ` Topik mirip terdeteksi: ${preview}.`;
}

async function upsertStatusHistory(params: {
  articleId: string;
  fromStatus?: ArticleStatus | null;
  toStatus: ArticleStatus;
  writerName?: string | null;
}) {
  await db.topicStatusHistory.create({
    data: {
      articleId: params.articleId,
      fromStatus: params.fromStatus ?? null,
      toStatus: params.toStatus,
      writerName: params.writerName ?? null
    }
  });
}

function redirectWithMessage(path: string, type: "error" | "success", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export async function loginAction(formData: FormData) {
  try {
    const payload = loginSchema.parse({
      identity: String(formData.get("identity") ?? "").trim(),
      password: String(formData.get("password") ?? "")
    });

    const user = await db.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { email: { equals: payload.identity, mode: "insensitive" } },
          { username: { equals: payload.identity, mode: "insensitive" } }
        ]
      }
    });

    if (!user) {
      redirectWithMessage("/login", "error", "Username/email atau password salah.");
    }

    const valid = await verifyPassword(payload.password, user.passwordHash);

    if (!valid) {
      redirectWithMessage("/login", "error", "Username/email atau password salah.");
    }

    await createSession({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    });

    redirect("/performance");
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirectWithMessage("/login", "error", error.issues[0]?.message ?? "Data login tidak valid.");
    }

    throw error;
  }
}

export async function setupAdminAction(formData: FormData) {
  const existingUsers = await db.user.count();

  if (existingUsers > 0) {
    redirect("/login");
  }

  try {
    const payload = setupSchema.parse({
      username: String(formData.get("username") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? "")
    });

    const passwordHash = await hashPassword(payload.password);

    const user = await db.user.create({
      data: {
        username: payload.username,
        email: payload.email,
        passwordHash,
        role: UserRole.ADMIN
      }
    });

    await createSession({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    });

    redirect("/performance");
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirectWithMessage("/setup", "error", error.issues[0]?.message ?? "Data setup tidak valid.");
    }

    throw error;
  }
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function createProjectAction(formData: FormData) {
  await requireUser();

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirectWithMessage("/dashboard", "error", "Nama project wajib diisi.");
  }

  const exists = await db.project.findUnique({
    where: { name }
  });

  if (exists) {
    redirectWithMessage("/dashboard", "error", "Nama project sudah ada.");
  }

  await db.project.create({
    data: { name }
  });

  redirectWithMessage("/dashboard", "success", "Project berhasil ditambahkan.");
}

export async function createTopicAction(formData: FormData) {
  await requireUser();

  try {
    const payload = toTopicPayload(formData);
    const similarTopics = await findSimilarTopics(payload.title);

    const topic = await db.article.create({
      data: {
        projectId: payload.projectId,
        title: payload.title,
        titleNormalized: normalizeTopicTitle(payload.title),
        brief: payload.brief,
        primaryKeywords: payload.primaryKeywords,
        secondaryKeywords: payload.secondaryKeywords,
        writerName: payload.writerName,
        delegatedAt: getDelegatedAtValue(payload.status, payload.delegatedAt),
        dueMonth: payload.dueMonth,
        publishUrl: payload.publishUrl,
        status: payload.status,
        priority: payload.priority,
        contentType: payload.contentType,
        publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null,
      }
    });

    await upsertStatusHistory({
      articleId: topic.id,
      toStatus: payload.status,
      writerName: payload.writerName
    });

    redirectWithMessage(
      "/dashboard",
      "success",
      `Topik berhasil ditambahkan.${buildDuplicateMessage(similarTopics)}`
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirectWithMessage("/topics/new", "error", error.issues[0]?.message ?? "Data topik tidak valid.");
    }

    throw error;
  }
}

export async function updateTopicAction(formData: FormData) {
  await requireUser();

  try {
    const payload = toTopicPayload(formData);

    if (!payload.id) {
      redirectWithMessage("/dashboard", "error", "ID topik tidak ditemukan.");
    }

    const existingTopic = await db.article.findUnique({
      where: { id: payload.id }
    });

    if (!existingTopic) {
      redirectWithMessage("/dashboard", "error", "Topik tidak ditemukan.");
    }

    const similarTopics = await findSimilarTopics(payload.title, payload.id);

    await db.article.update({
      where: { id: payload.id },
      data: {
        projectId: payload.projectId,
        title: payload.title,
        titleNormalized: normalizeTopicTitle(payload.title),
        brief: payload.brief,
        primaryKeywords: payload.primaryKeywords,
        secondaryKeywords: payload.secondaryKeywords,
        writerName: payload.writerName,
        delegatedAt: getDelegatedAtValue(payload.status, payload.delegatedAt),
        dueMonth: payload.dueMonth,
        publishUrl: payload.publishUrl,
        status: payload.status,
        priority: payload.priority,
        contentType: payload.contentType,
        publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null,
      }
    });

    if (existingTopic.status !== payload.status || existingTopic.writerName !== payload.writerName) {
      await upsertStatusHistory({
        articleId: payload.id,
        fromStatus: existingTopic.status,
        toStatus: payload.status,
        writerName: payload.writerName
      });
    }

    redirectWithMessage(
      "/dashboard",
      "success",
      `Topik berhasil diperbarui.${buildDuplicateMessage(similarTopics)}`
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const topicId = String(formData.get("id") ?? "");
      redirectWithMessage(
        topicId ? `/topics/${topicId}/edit` : "/dashboard",
        "error",
        error.issues[0]?.message ?? "Data topik tidak valid."
      );
    }

    throw error;
  }
}

export async function deleteTopicAction(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirectWithMessage("/dashboard", "error", "ID topik tidak valid.");
  }

  await db.article.delete({
    where: { id }
  });

  redirectWithMessage("/dashboard", "success", "Topik berhasil dihapus.");
}

function normalizeImportHeader(header: string) {
  return header.toLowerCase().trim().replace(/\s+/g, "_");
}

function parseImportedRows(fileName: string, bytes: Uint8Array) {
  const workbook = read(bytes, {
    type: "array",
    dense: true
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    return [];
  }

  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false
  });

  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeImportHeader(key), String(value ?? "").trim()]))
  );
}

export async function importTopicsAction(formData: FormData) {
  await requireUser();

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirectWithMessage("/dashboard", "error", "File import wajib dipilih.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const rows = parseImportedRows(file.name, bytes);

  if (!rows.length) {
    redirectWithMessage("/dashboard", "error", "File import tidak berisi data.");
  }

  const existingProjects = await db.project.findMany({
    select: {
      id: true,
      name: true
    }
  });

  const projectMap = new Map(existingProjects.map((project) => [project.name.toLowerCase(), project.id]));
  let imported = 0;
  let duplicateWarnings = 0;

  for (const row of rows) {
    const title = String(row.title ?? "").trim();
    const projectName = String(row.project ?? "").trim();
    const brief = String(row.brief ?? "").trim();
    const primaryKeywords = String(row.primary_keywords ?? "").trim();

    if (!title || !projectName || !brief || !primaryKeywords) {
      continue;
    }

    let projectId = projectMap.get(projectName.toLowerCase());

    if (!projectId) {
      const project = await db.project.create({
        data: {
          name: projectName
        }
      });
      projectId = project.id;
      projectMap.set(projectName.toLowerCase(), projectId);
    }

    const statusValue = String(row.status ?? "").trim().toUpperCase();
    const priorityValue = String(row.priority ?? "").trim().toUpperCase();
    const contentTypeValue = String(row.content_type ?? "").trim().toUpperCase();
    const status = ArticleStatus[statusValue as keyof typeof ArticleStatus] ?? ArticleStatus.NOT_ASSIGNED;
    const priority = TopicPriority[priorityValue as keyof typeof TopicPriority] ?? TopicPriority.MEDIUM;
    const contentType =
      TopicContentType[contentTypeValue as keyof typeof TopicContentType] ?? TopicContentType.INFORMATIONAL;
    const writerName = String(row.writer_name ?? "").trim() || null;

    const similarTopics = await findSimilarTopics(title);
    if (similarTopics.length) {
      duplicateWarnings += 1;
    }

    const topic = await db.article.create({
      data: {
        projectId,
        title,
        titleNormalized: normalizeTopicTitle(title),
        brief,
        primaryKeywords,
        secondaryKeywords: String(row.secondary_keywords ?? "").trim() || null,
        writerName,
        delegatedAt: getDelegatedAtValue(status, String(row.delegated_at ?? "").trim() || null),
        dueMonth: String(row.due_month ?? "").trim() || null,
        publishUrl: String(row.publish_url ?? "").trim() || null,
        status,
        priority,
        contentType,
        publishedAt: String(row.published_at ?? "").trim() ? new Date(String(row.published_at)) : null
      }
    });

    await upsertStatusHistory({
      articleId: topic.id,
      toStatus: status,
      writerName
    });
    imported += 1;
  }

  redirectWithMessage(
    "/dashboard",
    "success",
    `${imported} topik berhasil diimport.${duplicateWarnings ? ` ${duplicateWarnings} baris memiliki topik mirip.` : ""}`
  );
}

export async function updatePasswordAction(formData: FormData) {
  const user = await requireUser();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) {
    redirectWithMessage("/settings", "error", "Password baru minimal 8 karakter.");
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);

  if (!valid) {
    redirectWithMessage("/settings", "error", "Password saat ini tidak sesuai.");
  }

  const passwordHash = await hashPassword(newPassword);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  redirectWithMessage("/settings", "success", "Password berhasil diperbarui.");
}
