"use server";

import {
  DataSource,
  ImportStatus,
  ImportType,
  KeywordDevice,
  UserRole
} from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hashPassword, requireAdmin, requireEditor, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toMonthDate } from "@/lib/performance";
import {
  normalizeProjectDomain,
  parseImportedRank,
  parsePerformanceWorkbook,
  type PerformanceImportRow
} from "@/lib/performance-import";

function optionalText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const parsed = Number(text.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function redirectMessage(path: string, type: "error" | "success", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Nama project minimal 2 karakter."),
  brainSlug: z.string().nullable(),
  domain: z.string().url("Domain harus berupa URL lengkap.").nullable(),
  market: z.string().min(2, "Market wajib diisi."),
  rankTrackingFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  organicSessionsTarget: z.number().int().nonnegative().nullable(),
  conversionsTarget: z.number().nonnegative().nullable(),
  isActive: z.boolean()
});

function projectPayload(formData: FormData) {
  return projectSchema.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    name: String(formData.get("name") ?? "").trim(),
    brainSlug: optionalText(formData.get("brainSlug")),
    domain: optionalText(formData.get("domain")),
    market: String(formData.get("market") ?? "Singapore").trim(),
    rankTrackingFrequency: String(formData.get("rankTrackingFrequency") ?? "WEEKLY"),
    organicSessionsTarget: optionalNumber(formData.get("organicSessionsTarget")),
    conversionsTarget: optionalNumber(formData.get("conversionsTarget")),
    isActive: formData.get("isActive") !== "false"
  });
}

export async function createPerformanceProjectAction(formData: FormData) {
  await requireEditor();

  try {
    const payload = projectPayload(formData);
    const project = await db.project.create({ data: payload });
    redirect(`/performance/projects/${project.id}?success=${encodeURIComponent("Project berhasil ditambahkan.")}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirectMessage("/performance/projects/new", "error", error.issues[0]?.message ?? "Data project tidak valid.");
    }
    throw error;
  }
}

export async function updatePerformanceProjectAction(formData: FormData) {
  await requireEditor();

  try {
    const payload = projectPayload(formData);
    if (!payload.id) redirectMessage("/performance", "error", "Project tidak ditemukan.");
    const { id, ...data } = payload;
    await db.project.update({ where: { id }, data });
    redirectMessage(`/performance/projects/${id}`, "success", "Project berhasil diperbarui.");
  } catch (error) {
    if (error instanceof z.ZodError) {
      const id = String(formData.get("id") ?? "");
      redirectMessage(id ? `/performance/projects/${id}` : "/performance", "error", error.issues[0]?.message ?? "Data project tidak valid.");
    }
    throw error;
  }
}

const keywordSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1, "Project wajib dipilih."),
  phrase: z.string().min(2, "Keyword minimal 2 karakter."),
  targetUrl: z.string().nullable(),
  location: z.string().min(2, "Lokasi wajib diisi."),
  searchEngine: z.string().min(2, "Search engine wajib diisi."),
  isActive: z.boolean()
});

function keywordPayload(formData: FormData) {
  return keywordSchema.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    projectId: String(formData.get("projectId") ?? "").trim(),
    phrase: String(formData.get("phrase") ?? "").trim(),
    targetUrl: optionalText(formData.get("targetUrl")),
    location: String(formData.get("location") ?? "Singapore").trim(),
    searchEngine: String(formData.get("searchEngine") ?? "Google.com.sg").trim(),
    isActive: formData.get("isActive") !== "false"
  });
}

export async function createKeywordAction(formData: FormData) {
  await requireEditor();
  const projectId = String(formData.get("projectId") ?? "");

  try {
    const payload = keywordPayload(formData);
    await db.keyword.create({
      data: {
        projectId: payload.projectId,
        phrase: payload.phrase,
        targetUrl: payload.targetUrl,
        location: payload.location,
        searchEngine: payload.searchEngine,
        isActive: payload.isActive,
        source: DataSource.MANUAL
      }
    });
    redirectMessage(`/performance/projects/${payload.projectId}`, "success", "Keyword berhasil ditambahkan.");
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirectMessage(`/performance/projects/${projectId}`, "error", error.issues[0]?.message ?? "Data keyword tidak valid.");
    }
    throw error;
  }
}

export async function updateKeywordAction(formData: FormData) {
  await requireEditor();
  const projectId = String(formData.get("projectId") ?? "");

  try {
    const payload = keywordPayload(formData);
    if (!payload.id) redirectMessage(`/performance/projects/${projectId}`, "error", "Keyword tidak ditemukan.");
    const existing = await db.keyword.findUnique({ where: { id: payload.id }, select: { id: true } });
    if (!existing) redirectMessage(`/performance/projects/${projectId}`, "error", "Keyword tidak ditemukan.");
    await db.keyword.update({
      where: { id: payload.id },
      data: {
        phrase: payload.phrase,
        targetUrl: payload.targetUrl,
        location: payload.location,
        searchEngine: payload.searchEngine,
        isActive: payload.isActive
      }
    });
    redirectMessage(`/performance/projects/${payload.projectId}`, "success", "Keyword berhasil diperbarui.");
  } catch (error) {
    if (error instanceof z.ZodError) {
      const id = String(formData.get("id") ?? "");
      redirectMessage(id ? `/performance/keywords/${id}/edit` : `/performance/projects/${projectId}`, "error", error.issues[0]?.message ?? "Data keyword tidak valid.");
    }
    throw error;
  }
}

export async function saveMonthlyMetricAction(formData: FormData) {
  const user = await requireEditor();
  const projectId = String(formData.get("projectId") ?? "");
  const month = String(formData.get("month") ?? "");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    redirectMessage(`/performance/projects/${projectId}`, "error", "Bulan tidak valid.");
  }

  const values = {
    organicSessions: optionalNumber(formData.get("organicSessions")),
    conversions: optionalNumber(formData.get("conversions")),
    gscClicks: optionalNumber(formData.get("gscClicks")),
    gscImpressions: optionalNumber(formData.get("gscImpressions")),
    gscCtr: optionalNumber(formData.get("gscCtr")),
    gscAveragePosition: optionalNumber(formData.get("gscAveragePosition"))
  };

  if (Object.values(values).every((value) => value === null)) {
    redirectMessage(`/performance/projects/${projectId}`, "error", "Isi minimal satu metrik.");
  }

  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) {
    redirectMessage("/performance", "error", "Project tidak ditemukan.");
  }

  const importLog = await db.dataImport.create({
    data: {
      projectId,
      importedById: user.id,
      type: ImportType.MONTHLY_METRICS,
      source: DataSource.MANUAL,
      rowsTotal: 1,
      rowsImported: 1,
      notes: `Input manual untuk ${month}`
    }
  });

  await db.monthlyMetric.upsert({
    where: {
      projectId_month_source: {
        projectId,
        month: toMonthDate(month),
        source: DataSource.MANUAL
      }
    },
    update: { ...values, importId: importLog.id, sourceNote: "Input manual" },
    create: {
      projectId,
      month: toMonthDate(month),
      source: DataSource.MANUAL,
      sourceNote: "Input manual",
      importId: importLog.id,
      ...values
    }
  });

  redirectMessage(`/performance/projects/${projectId}`, "success", `Metrik ${month} berhasil disimpan.`);
}

export async function addProjectAnnotationAction(formData: FormData) {
  const user = await requireEditor();
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "");

  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    redirectMessage(`/performance/projects/${projectId}`, "error", "Judul dan tanggal anotasi wajib diisi.");
  }

  await db.projectAnnotation.create({
    data: {
      projectId,
      createdById: user.id,
      title,
      note: optionalText(formData.get("note")),
      eventDate: new Date(`${eventDate}T00:00:00.000Z`)
    }
  });

  redirectMessage(`/performance/projects/${projectId}`, "success", "Anotasi berhasil ditambahkan.");
}

async function loadProjectResolver() {
  const projects = await db.project.findMany();
  const byDomain = new Map<string, (typeof projects)[number]>();
  const byName = new Map<string, (typeof projects)[number]>();
  for (const project of projects) {
    const host = normalizeProjectDomain(project.domain ?? "");
    if (host && !byDomain.has(host)) byDomain.set(host, project);
    byName.set(project.name.toLowerCase(), project);
  }

  return async function findOrCreateProject(name: string, domain = "") {
    const normalizedDomain = normalizeProjectDomain(domain);
    const existing = (normalizedDomain ? byDomain.get(normalizedDomain) : undefined) ?? byName.get(name.toLowerCase());
    if (existing) return existing;
    const created = await db.project.create({
      data: { name, domain: normalizedDomain ? `https://${normalizedDomain}/` : null }
    });
    if (normalizedDomain) byDomain.set(normalizedDomain, created);
    byName.set(created.name.toLowerCase(), created);
    return created;
  };
}

function keywordImportKey(phrase: string, location: string, searchEngine: string) {
  return JSON.stringify([phrase, location, searchEngine]);
}

export async function importPerformanceDataAction(formData: FormData) {
  const user = await requireEditor();
  const file = formData.get("file");
  const type = String(formData.get("type") ?? "") as ImportType;
  const checkedAtFallback = String(formData.get("checkedAt") ?? "").trim();

  if (!(file instanceof File) || !file.size) redirectMessage("/performance/import", "error", "Pilih file CSV atau Excel.");
  const allowedImportTypes: ImportType[] = [ImportType.KEYWORDS, ImportType.RANKINGS, ImportType.MONTHLY_METRICS];
  if (!allowedImportTypes.includes(type)) {
    redirectMessage("/performance/import", "error", "Jenis import tidak valid.");
  }

  const parsedWorkbook = parsePerformanceWorkbook(new Uint8Array(await file.arrayBuffer()), checkedAtFallback);
  if (
    type === ImportType.RANKINGS &&
    parsedWorkbook.format === "MONTHLY_RANKING_REPORT" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(checkedAtFallback)
  ) {
    redirectMessage("/performance/import", "error", "Isi tanggal pengecekan untuk monthly ranking report.");
  }
  const rows = parsedWorkbook.rows;
  if (!rows.length) redirectMessage("/performance/import", "error", "File tidak berisi data.");

  const importLog = await db.dataImport.create({
    data: {
      importedById: user.id,
      type,
      source: DataSource.IMPORT,
      fileName: file.name,
      rowsTotal: rows.length,
      status: ImportStatus.FAILED,
      notes: "Import sedang diproses."
    }
  });

  let imported = 0;
  let skipped = 0;
  const findOrCreateProject = await loadProjectResolver();
  const resolvedRows: Array<{
    row: PerformanceImportRow;
    project: Awaited<ReturnType<typeof findOrCreateProject>>;
  }> = [];

  for (const row of rows) {
    const projectName = String(row.project ?? row.project_name ?? "").trim();
    const projectDomain = normalizeProjectDomain(String(row.project_domain ?? row.domain ?? ""));
    if (!projectName) {
      skipped += 1;
      continue;
    }

    const project = await findOrCreateProject(projectName, projectDomain);
    resolvedRows.push({ row, project });
  }

  try {
    if (type === ImportType.KEYWORDS && parsedWorkbook.format === "MONTHLY_RANKING_REPORT") {
      const projectRows = new Map<string, { projectId: string; rows: PerformanceImportRow[] }>();

      for (const { row, project } of resolvedRows) {
        const phrase = String(row.keyword ?? row.phrase ?? "").trim();
        if (!phrase) {
          skipped += 1;
          continue;
        }
        const entry = projectRows.get(project.id) ?? { projectId: project.id, rows: [] };
        entry.rows.push(row);
        projectRows.set(project.id, entry);
      }

      for (const { projectId, rows: groupedRows } of projectRows.values()) {
        const keywordRows = groupedRows.map((row) => ({
          projectId,
          phrase: String(row.keyword ?? row.phrase ?? "").trim(),
          location: String(row.location ?? "Singapore").trim(),
          searchEngine: String(row.search_engine ?? "Google.com.sg").trim(),
          source: DataSource.IMPORT
        }));
        const created = await db.keyword.createMany({ data: keywordRows, skipDuplicates: true });
        imported += created.count;
        skipped += keywordRows.length - created.count;
      }
    } else if (type === ImportType.KEYWORDS) {
      for (const { row, project } of resolvedRows) {
      const phrase = String(row.keyword ?? row.phrase ?? "").trim();
      if (!phrase) {
        skipped += 1;
        continue;
      }
      const location = String(row.location ?? "Singapore").trim();
      const searchEngine = String(row.search_engine ?? "Google.com.sg").trim();
      await db.keyword.upsert({
        where: { projectId_phrase_location_searchEngine: { projectId: project.id, phrase, location, searchEngine } },
        update: { targetUrl: String(row.target_url ?? "").trim() || null, isActive: String(row.active ?? "true").toLowerCase() !== "false" },
        create: { projectId: project.id, phrase, targetUrl: String(row.target_url ?? "").trim() || null, location, searchEngine, source: DataSource.IMPORT }
      });
      imported += 1;
      }
    }

    if (type === ImportType.RANKINGS) {
      const rankingRowsByProject = new Map<
        string,
        Array<{
          phrase: string;
          location: string;
          searchEngine: string;
          checkedAt: Date;
          device: KeywordDevice;
          position: number | null;
          beyondRange: boolean;
          rankingUrl: string | null;
        }>
      >();

      for (const { row, project } of resolvedRows) {
        const phrase = String(row.keyword ?? row.phrase ?? "").trim();
        const checkedAt = new Date(String(row.checked_at ?? row.date ?? "").trim());
        if (!phrase || Number.isNaN(checkedAt.getTime())) {
          skipped += 1;
          continue;
        }
        const rank = parseImportedRank(String(row.position ?? row.rank ?? ""));
        const rankingUrlText = String(row.ranking_url ?? row.indexed_url ?? "").trim();
        const prepared = {
          phrase,
          location: String(row.location ?? "Singapore").trim(),
          searchEngine: String(row.search_engine ?? "Google.com.sg").trim(),
          checkedAt,
          device: String(row.device ?? "DESKTOP").toUpperCase() === "MOBILE" ? KeywordDevice.MOBILE : KeywordDevice.DESKTOP,
          position: rank.position,
          beyondRange: rank.beyondRange,
          rankingUrl: rankingUrlText && !/^n\/?a$/i.test(rankingUrlText) ? rankingUrlText : null
        };
        const group = rankingRowsByProject.get(project.id) ?? [];
        group.push(prepared);
        rankingRowsByProject.set(project.id, group);
      }

      const projectResults = await Promise.all(
        Array.from(rankingRowsByProject.entries()).map(async ([projectId, projectRankings]) => {
        let projectImported = 0;
        let projectSkipped = 0;
        const uniqueKeywordRows = Array.from(
          new Map(
            projectRankings.map((row) => [
              keywordImportKey(row.phrase, row.location, row.searchEngine),
              {
                projectId,
                phrase: row.phrase,
                location: row.location,
                searchEngine: row.searchEngine,
                source: DataSource.IMPORT
              }
            ])
          ).values()
        );

        await db.keyword.createMany({ data: uniqueKeywordRows, skipDuplicates: true });
        const keywords = await db.keyword.findMany({
          where: {
            projectId,
            OR: uniqueKeywordRows.map(({ phrase, location, searchEngine }) => ({ phrase, location, searchEngine }))
          },
          select: { id: true, phrase: true, location: true, searchEngine: true }
        });
        const keywordIds = new Map(
          keywords.map((keyword) => [keywordImportKey(keyword.phrase, keyword.location, keyword.searchEngine), keyword.id])
        );
        const snapshots = new Map<
          string,
          {
            keywordId: string;
            checkedAt: Date;
            device: KeywordDevice;
            source: DataSource;
            position: number | null;
            beyondRange: boolean;
            rankingUrl: string | null;
            importId: string;
          }
        >();

        for (const row of projectRankings) {
          const keywordId = keywordIds.get(keywordImportKey(row.phrase, row.location, row.searchEngine));
          if (!keywordId) {
            projectSkipped += 1;
            continue;
          }
          snapshots.set(`${keywordId}|${row.checkedAt.toISOString()}|${row.device}`, {
            keywordId,
            checkedAt: row.checkedAt,
            device: row.device,
            source: DataSource.IMPORT,
            position: row.position,
            beyondRange: row.beyondRange,
            rankingUrl: row.rankingUrl,
            importId: importLog.id
          });
        }

        const snapshotsByDateAndDevice = new Map<string, typeof snapshots>();
        for (const [key, snapshot] of snapshots) {
          const groupKey = `${snapshot.checkedAt.toISOString()}|${snapshot.device}`;
          const group = snapshotsByDateAndDevice.get(groupKey) ?? new Map();
          group.set(key, snapshot);
          snapshotsByDateAndDevice.set(groupKey, group);
        }

        for (const snapshotGroup of snapshotsByDateAndDevice.values()) {
          const data = Array.from(snapshotGroup.values());
          const { checkedAt, device } = data[0];
          await db.$transaction([
            db.rankingSnapshot.deleteMany({
              where: {
                keywordId: { in: data.map((snapshot) => snapshot.keywordId) },
                checkedAt,
                device,
                source: DataSource.IMPORT
              }
            }),
            db.rankingSnapshot.createMany({ data })
          ]);
          projectImported += data.length;
        }

        return { imported: projectImported, skipped: projectSkipped };
        })
      );

      for (const result of projectResults) {
        imported += result.imported;
        skipped += result.skipped;
      }
    }

    if (type === ImportType.MONTHLY_METRICS) {
      for (const { row, project } of resolvedRows) {
      const month = String(row.month ?? "").trim();
      if (!/^\d{4}-\d{2}$/.test(month)) {
        skipped += 1;
        continue;
      }
      const requestedSource = String(row.source ?? "IMPORT").toUpperCase();
      const source = requestedSource === "GA4" ? DataSource.GA4 : requestedSource === "GSC" ? DataSource.GSC : DataSource.IMPORT;
      const values = {
        organicSessions: optionalNumber(String(row.organic_sessions ?? "")),
        conversions: optionalNumber(String(row.conversions ?? "")),
        gscClicks: optionalNumber(String(row.gsc_clicks ?? "")),
        gscImpressions: optionalNumber(String(row.gsc_impressions ?? "")),
        gscCtr: optionalNumber(String(row.gsc_ctr ?? "")),
        gscAveragePosition: optionalNumber(String(row.gsc_average_position ?? ""))
      };
      await db.monthlyMetric.upsert({
        where: { projectId_month_source: { projectId: project.id, month: toMonthDate(month), source } },
        update: { ...values, importId: importLog.id, sourceNote: file.name },
        create: { projectId: project.id, month: toMonthDate(month), source, sourceNote: file.name, importId: importLog.id, ...values }
      });
      imported += 1;
      }
    }

    const unaccounted = rows.length - imported - skipped;
    if (unaccounted > 0) skipped += unaccounted;

    const importStatus =
      imported === 0
        ? ImportStatus.FAILED
        : skipped > 0
          ? ImportStatus.PARTIAL
          : ImportStatus.COMPLETED;
    const importNotes =
      imported === 0
        ? "Tidak ada baris yang berhasil disimpan. Periksa jenis import, kolom wajib, dan tanggal ranking."
        : skipped > 0
          ? `${skipped} baris dilewati karena data wajib tidak lengkap atau tidak valid.`
          : null;

    await db.dataImport.update({
      where: { id: importLog.id },
      data: {
        rowsImported: imported,
        rowsSkipped: skipped,
        status: importStatus,
        notes: importNotes
      }
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Performance import failed", { errorName });
    await db.dataImport
      .update({
        where: { id: importLog.id },
        data: {
          rowsImported: imported,
          rowsSkipped: rows.length - imported,
          status: ImportStatus.FAILED,
          notes: `Import gagal di server (${errorName}).`
        }
      })
      .catch(() => undefined);
    redirectMessage(
      "/performance/import",
      "error",
      "Import gagal di server. Tidak ada data yang ditandai selesai; coba ulang setelah memeriksa koneksi database."
    );
  }

  redirectMessage(
    "/performance/import",
    imported === 0 ? "error" : "success",
    `${imported} baris berhasil diimport; ${skipped} dilewati.`
  );
}

type BrainSnapshot = {
  generatedAt: string | null;
  projects: Array<{
    brainSlug: string;
    name: string;
    domain: string | null;
    market: string;
    keywords: Array<{
      phrase: string;
      targetUrl: string | null;
      location: string;
      searchEngine: string;
      sourcePath: string;
      rankings: Array<{
        checkedAt: string;
        position: number | null;
        beyondRange: boolean;
        rankingUrl: string | null;
        device: "DESKTOP" | "MOBILE";
      }>;
    }>;
  }>;
};

export async function importBrainSnapshotAction(formData: FormData) {
  const user = await requireEditor();
  const file = formData.get("file");

  if (!(file instanceof File) || !file.size) {
    redirectMessage("/performance/import", "error", "Pilih file snapshot JSON dari exporter OKF Brain.");
  }

  let snapshot: BrainSnapshot;
  try {
    snapshot = JSON.parse(await file.text()) as BrainSnapshot;
  } catch {
    redirectMessage("/performance/import", "error", "File snapshot OKF Brain bukan JSON yang valid.");
  }

  if (!snapshot.generatedAt || !Array.isArray(snapshot.projects) || !snapshot.projects.length) {
    redirectMessage("/performance/import", "error", "Snapshot OKF Brain tidak memiliki project atau tanggal pembuatan.");
  }

  let imported = 0;
  for (const brainProject of snapshot.projects) {
    const brainDomainHost = normalizeProjectDomain(brainProject.domain ?? "");
    const brainDomain = brainDomainHost ? `https://${brainDomainHost}/` : null;
    const existingProject = await db.project.findFirst({
      where: {
        OR: [
          { brainSlug: brainProject.brainSlug },
          { name: { equals: brainProject.name, mode: "insensitive" } }
        ]
      }
    });
    const project = existingProject
      ? await db.project.update({
          where: { id: existingProject.id },
          data: {
            brainSlug: brainProject.brainSlug,
            name: brainProject.name,
            domain: brainDomain,
            market: brainProject.market,
            brainSyncedAt: new Date(snapshot.generatedAt)
          }
        })
      : await db.project.create({
          data: {
            brainSlug: brainProject.brainSlug,
            name: brainProject.name,
            domain: brainDomain,
            market: brainProject.market,
            brainSyncedAt: new Date(snapshot.generatedAt)
          }
        });
    const projectImport = await db.dataImport.create({
      data: {
        projectId: project.id,
        importedById: user.id,
        type: ImportType.OKF_BRAIN,
        source: DataSource.OKF_BRAIN,
        fileName: "okf-brain-snapshot.json",
        rowsTotal: brainProject.keywords.length,
        notes: `Snapshot dibuat ${snapshot.generatedAt}`
      }
    });

    for (const brainKeyword of brainProject.keywords) {
      const keyword = await db.keyword.upsert({
        where: {
          projectId_phrase_location_searchEngine: {
            projectId: project.id,
            phrase: brainKeyword.phrase,
            location: brainKeyword.location,
            searchEngine: brainKeyword.searchEngine
          }
        },
        update: {
          targetUrl: brainKeyword.targetUrl,
          source: DataSource.OKF_BRAIN,
          brainSourcePath: brainKeyword.sourcePath
        },
        create: {
          projectId: project.id,
          phrase: brainKeyword.phrase,
          targetUrl: brainKeyword.targetUrl,
          location: brainKeyword.location,
          searchEngine: brainKeyword.searchEngine,
          source: DataSource.OKF_BRAIN,
          brainSourcePath: brainKeyword.sourcePath
        }
      });

      for (const rank of brainKeyword.rankings) {
        const checkedAt = new Date(rank.checkedAt);
        const device = rank.device === "MOBILE" ? KeywordDevice.MOBILE : KeywordDevice.DESKTOP;
        await db.rankingSnapshot.upsert({
          where: {
            keywordId_checkedAt_device_source: {
              keywordId: keyword.id,
              checkedAt,
              device,
              source: DataSource.OKF_BRAIN
            }
          },
          update: {
            position: rank.position,
            beyondRange: rank.beyondRange,
            rankingUrl: rank.rankingUrl,
            importId: projectImport.id
          },
          create: {
            keywordId: keyword.id,
            checkedAt,
            device,
            source: DataSource.OKF_BRAIN,
            position: rank.position,
            beyondRange: rank.beyondRange,
            rankingUrl: rank.rankingUrl,
            importId: projectImport.id
          }
        });
      }
      imported += 1;
    }
    await db.dataImport.update({
      where: { id: projectImport.id },
      data: { rowsImported: brainProject.keywords.length }
    });
  }

  redirectMessage("/performance/import", "success", `${snapshot.projects.length} project dan ${imported} keyword ditarik dari OKF Brain.`);
}

export async function resetPerformanceDataAction(formData: FormData) {
  await requireAdmin();
  const scope = String(formData.get("scope") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== "HAPUS") {
    redirectMessage("/settings", "error", 'Ketik "HAPUS" untuk mengonfirmasi reset data.');
  }

  if (scope === "TOPICS") {
    const result = await db.article.deleteMany({});
    redirectMessage("/settings", "success", `${result.count} topic Topic Tracker berhasil dihapus. Data SEO portfolio tidak tersentuh.`);
  }

  if (scope !== "PORTFOLIO") {
    redirectMessage("/settings", "error", "Jenis reset tidak dikenali.");
  }

  // Hapus seluruh data SEO portfolio; project yang masih punya topic
  // dipertahankan agar Topic Tracker tetap utuh.
  const [importResult, , , keywordResult, projectResult] = await db.$transaction([
    db.dataImport.deleteMany({}),
    db.projectAnnotation.deleteMany({}),
    db.monthlyMetric.deleteMany({}),
    db.keyword.deleteMany({}),
    db.project.deleteMany({ where: { topics: { none: {} } } })
  ]);

  redirectMessage(
    "/settings",
    "success",
    `SEO portfolio direset: ${projectResult.count} project, ${keywordResult.count} keyword beserta ranking, metrik, anotasi, dan ${importResult.count} riwayat import dihapus. Topic Tracker tidak tersentuh.`
  );
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "VIEWER") as UserRole;

  if (!/^[a-zA-Z0-9._-]{3,}$/.test(username) || !z.string().email().safeParse(email).success || password.length < 8) {
    redirectMessage("/settings", "error", "Username, email, atau password tidak valid.");
  }
  if (![UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER].includes(role)) {
    redirectMessage("/settings", "error", "Role tidak valid.");
  }

  await db.user.create({
    data: { username, email, passwordHash: await hashPassword(password), role }
  });
  redirectMessage("/settings", "success", "Pengguna berhasil ditambahkan.");
}

export async function updateOwnUsernameAction(formData: FormData) {
  const user = await requireUser();
  const username = String(formData.get("username") ?? "").trim();

  if (!/^[a-zA-Z0-9._-]{3,}$/.test(username)) {
    redirectMessage("/settings", "error", "Username minimal 3 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.");
  }

  await db.user.update({ where: { id: user.id }, data: { username } });
  redirectMessage("/settings", "success", "Username berhasil diperbarui.");
}

export async function updateUserAccessAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "VIEWER") as UserRole;
  const isActive = formData.get("isActive") === "true";

  if (id === currentUser.id && (!isActive || role !== UserRole.ADMIN)) {
    redirectMessage("/settings", "error", "Anda tidak dapat menonaktifkan atau menurunkan role akun admin sendiri.");
  }

  await db.user.update({ where: { id }, data: { role, isActive } });
  redirectMessage("/settings", "success", "Akses pengguna berhasil diperbarui.");
}
