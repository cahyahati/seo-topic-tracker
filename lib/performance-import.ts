import { read, utils } from "xlsx";

export type PerformanceImportRow = Record<string, string>;

export type ParsedPerformanceWorkbook = {
  format: "FLAT" | "MONTHLY_RANKING_REPORT";
  rows: PerformanceImportRow[];
};

export function normalizeProjectDomain(value: string) {
  const text = value.trim();
  if (!text) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return text.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  }
}

function normalizeHeader(header: string) {
  return header.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function normalizeRow(row: Record<string, unknown>): PerformanceImportRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? "").trim()])
  );
}

function getReportProject(title: string, fallbackName: string) {
  const match = title.trim().match(/^(.*)\s+\(([^()]+)\)\s*$/);
  if (!match) return { name: fallbackName, domain: "" };
  return {
    name: match[1].trim() || fallbackName,
    domain: match[2].includes(".") ? normalizeProjectDomain(match[2]) : ""
  };
}

function findRankingHeaderRow(rows: unknown[][]) {
  return rows.findIndex((row) => {
    const headers = row.map((value) => normalizeHeader(String(value ?? "")));
    return ["term", "indexed_url", "engine", "rank"].every((header) => headers.includes(header));
  });
}

export function parsePerformanceWorkbook(bytes: Uint8Array, checkedAt = ""): ParsedPerformanceWorkbook {
  const workbook = read(bytes, { type: "array", dense: true });
  const reportRows: PerformanceImportRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
    const headerRow = findRankingHeaderRow(matrix);
    if (headerRow < 0) continue;

    const firstTitle = String(matrix[0]?.find((value) => String(value ?? "").trim()) ?? sheetName);
    const project = getReportProject(firstTitle, sheetName);
    const rows = utils
      .sheet_to_json<Record<string, unknown>>(sheet, { range: headerRow, defval: "", raw: false })
      .map(normalizeRow);

    for (const row of rows) {
      const keyword = String(row.keyword ?? row.term ?? "").trim();
      if (!keyword) continue;
      reportRows.push({
        ...row,
        project: project.name,
        project_domain: project.domain,
        keyword,
        checked_at: checkedAt,
        ranking_url: String(row.ranking_url ?? row.indexed_url ?? "").trim(),
        search_engine: String(row.search_engine ?? row.engine ?? "Google.com.sg").trim()
      });
    }
  }

  if (reportRows.length) {
    return { format: "MONTHLY_RANKING_REPORT", rows: reportRows };
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = firstSheet
    ? utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: false }).map(normalizeRow)
    : [];
  return { format: "FLAT", rows };
}

export function parseImportedRank(value: string) {
  const text = value.trim();
  if (!text || /^n\/?a$/i.test(text)) return { position: null, beyondRange: false };
  if (/101\+|>\s*100/i.test(text)) return { position: null, beyondRange: true };
  const position = Number(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(position) || position <= 0) return { position: null, beyondRange: false };
  if (position >= 101) return { position: null, beyondRange: true };
  return { position: Math.round(position), beyondRange: false };
}
