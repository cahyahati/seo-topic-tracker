import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Rank = {
  checkedAt: string;
  position: number | null;
  beyondRange: boolean;
  rankingUrl: string | null;
  device: "DESKTOP";
};

type KeywordRecord = {
  phrase: string;
  targetUrl: string | null;
  location: string;
  searchEngine: string;
  sourcePath: string;
  rankings: Rank[];
};

const defaultBrainRoot = "C:\\Users\\ACER\\Documents\\iClick-SEO-Brain";
const brainRoot = process.env.OKF_BRAIN_PATH || defaultBrainRoot;
const outputPath = path.join(process.cwd(), "data", "okf-brain-snapshot.json");

function cleanCell(value: string) {
  return value
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrontmatterTitle(markdown: string) {
  return markdown.match(/^title:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? null;
}

function parseDomain(markdown: string) {
  const match = markdown.match(/https?:\/\/[^\s)]+/i)?.[0];
  if (!match) return null;
  try {
    const url = new URL(match.replace(/[.,]+$/, ""));
    return `${url.protocol}//${url.host}/`;
  } catch {
    return null;
  }
}

function parseTables(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const tables: string[][][] = [];
  let current: string[][] = [];

  const flush = () => {
    if (current.length >= 2) tables.push(current);
    current = [];
  };

  for (const line of lines) {
    if (/^\s*\|.*\|\s*$/.test(line)) {
      current.push(line.trim().slice(1, -1).split("|").map(cleanCell));
    } else {
      flush();
    }
  }
  flush();
  return tables.filter((table) => table[1]?.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, ""))));
}

function extractTargetUrl(value: string) {
  const absolute = value.match(/https?:\/\/[^\s)]+/i)?.[0];
  if (absolute) return absolute.replace(/[.,]+$/, "");
  const pathMatch = value.match(/\/[a-zA-Z0-9_./-]*\/?/g)?.find((candidate) => candidate.length > 1);
  if (pathMatch) return pathMatch;
  if (/homepage/i.test(value)) return "/";
  return null;
}

function keywordCandidates(value: string) {
  return value
    .split(/\s*[·;]\s*/)
    .map((part) => part.replace(/\([^)]*\)/g, "").replace(/^['"]|['"]$/g, "").trim())
    .filter((part) => part.length >= 2)
    .filter((part) => !/[\/]|\betc\b|\bterms?\b|\bvariants?\b|\bper-crystal\b/i.test(part))
    .filter((part) => !/^(cluster|same page|create|homepage)$/i.test(part));
}

function parsePosition(value: string) {
  const text = cleanCell(value);
  if (/101\+|>\s*100/i.test(text)) return { position: null, beyondRange: true };
  if (!text || /^n\/?a$/i.test(text)) return null;
  const numeric = Number(text.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return { position: Math.round(numeric), beyondRange: false };
}

function parseHeaderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || !/\d{4}/.test(value)) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function dateFromFileName(fileName: string) {
  const match = fileName.match(/analytics-(\d{4}-\d{2}-\d{2})/);
  return match ? `${match[1]}T00:00:00.000Z` : null;
}

function addKeyword(map: Map<string, KeywordRecord>, record: KeywordRecord) {
  const key = record.phrase.toLocaleLowerCase("en");
  const existing = map.get(key);
  if (!existing) {
    map.set(key, record);
    return;
  }

  if (!existing.targetUrl && record.targetUrl) existing.targetUrl = record.targetUrl;
  if (existing.sourcePath.endsWith("keyword-mapping.md") && !record.sourcePath.endsWith("keyword-mapping.md")) {
    existing.sourcePath = record.sourcePath;
  }
  for (const rank of record.rankings) {
    if (!existing.rankings.some((candidate) => candidate.checkedAt === rank.checkedAt && candidate.device === rank.device)) {
      existing.rankings.push(rank);
    }
  }
}

function parseKeywordMapping(markdown: string, sourcePath: string, map: Map<string, KeywordRecord>) {
  for (const table of parseTables(markdown)) {
    const headers = table[0].map((header) => header.toLowerCase());
    const keywordIndex = headers.findIndex((header) => ["keyword", "keywords", "term", "terms"].includes(header));
    if (keywordIndex < 0) continue;
    const targetIndex = headers.findIndex((header) => /target|page/.test(header));

    for (const row of table.slice(2)) {
      for (const phrase of keywordCandidates(row[keywordIndex] ?? "")) {
        addKeyword(map, {
          phrase,
          targetUrl: targetIndex >= 0 ? extractTargetUrl(row[targetIndex] ?? "") : null,
          location: "Singapore",
          searchEngine: "Google.com.sg",
          sourcePath,
          rankings: []
        });
      }
    }
  }
}

function parseRankingAnalytics(markdown: string, fileName: string, sourcePath: string, map: Map<string, KeywordRecord>) {
  const snapshotDate = dateFromFileName(fileName);

  for (const table of parseTables(markdown)) {
    const headers = table[0].map((header) => header.toLowerCase());
    const keywordIndex = headers.findIndex((header) => header === "keyword" || header === "term");
    if (keywordIndex < 0) continue;
    const engineIndex = headers.findIndex((header) => /search engine|term combination/.test(header));
    const urlIndex = headers.findIndex((header) => /indexed url|ranking url/.test(header));
    const currentRankIndex = headers.findIndex((header) => /current rank/.test(header));
    const plainRankIndex = headers.findIndex((header) => header === "rank");
    const datedColumns = headers
      .map((header, index) => ({ index, date: parseHeaderDate(table[0][index]) }))
      .filter((column): column is { index: number; date: string } => Boolean(column.date));

    for (const row of table.slice(2)) {
      const phrase = cleanCell(row[keywordIndex] ?? "");
      if (!phrase) continue;
      const engine = cleanCell(row[engineIndex] ?? "Google.com.sg").split(",")[0] || "Google.com.sg";
      const rankingUrl = urlIndex >= 0 ? extractTargetUrl(row[urlIndex] ?? "") : null;
      const rankings: Rank[] = [];

      for (const column of datedColumns) {
        const rank = parsePosition(row[column.index] ?? "");
        if (rank) rankings.push({ checkedAt: column.date, rankingUrl, device: "DESKTOP", ...rank });
      }

      const currentIndex = currentRankIndex >= 0 ? currentRankIndex : plainRankIndex;
      if (currentIndex >= 0 && snapshotDate) {
        const rank = parsePosition(row[currentIndex] ?? "");
        if (rank) rankings.push({ checkedAt: snapshotDate, rankingUrl, device: "DESKTOP", ...rank });
      }

      addKeyword(map, {
        phrase,
        targetUrl: rankingUrl,
        location: /google\.com$/i.test(engine) ? "Global" : "Singapore",
        searchEngine: engine,
        sourcePath,
        rankings
      });
    }
  }
}

async function main() {
  const clientEntries = await readdir(path.join(brainRoot, "clients"), { withFileTypes: true });
  const projects = [];

  for (const entry of clientEntries.filter((candidate) => candidate.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const clientRoot = path.join(brainRoot, "clients", entry.name);
    const profilePath = path.join(clientRoot, "profile.md");
    const profile = await readFile(profilePath, "utf8");
    const files = await readdir(clientRoot);
    const keywordMap = new Map<string, KeywordRecord>();

    if (files.includes("keyword-mapping.md")) {
      const fileName = "keyword-mapping.md";
      const sourcePath = `clients/${entry.name}/${fileName}`;
      parseKeywordMapping(await readFile(path.join(clientRoot, fileName), "utf8"), sourcePath, keywordMap);
    }

    for (const fileName of files.filter((file) => /^analytics-.*(?:keyword-ranking|rank-snapshot).*\.md$/i.test(file))) {
      const sourcePath = `clients/${entry.name}/${fileName}`;
      parseRankingAnalytics(await readFile(path.join(clientRoot, fileName), "utf8"), fileName, sourcePath, keywordMap);
    }

    projects.push({
      brainSlug: entry.name,
      name: parseFrontmatterTitle(profile) ?? entry.name,
      domain: parseDomain(profile),
      market: entry.name === "hl-equipment" ? "Global" : "Singapore",
      keywords: Array.from(keywordMap.values())
        .map((keyword) => ({ ...keyword, rankings: keyword.rankings.sort((a, b) => a.checkedAt.localeCompare(b.checkedAt)) }))
        .sort((a, b) => a.phrase.localeCompare(b.phrase))
    });
  }

  await writeFile(
    outputPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), sourceRepository: "iClick-SEO-Brain", projects }, null, 2)}\n`,
    "utf8"
  );
  const keywordCount = projects.reduce((sum, project) => sum + project.keywords.length, 0);
  console.log(`Exported ${projects.length} projects and ${keywordCount} keywords to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
