export function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
}

export function normalizeTopicTitle(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]+/g, " ")
    .replace(/\b(dan|atau|yang|untuk|dengan|pada|ke|di|dari|cara|apa|adalah|the|a|an|of|for|to)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getTopicTokenSet(title: string) {
  const normalized = normalizeTopicTitle(title);

  return new Set(
    normalized
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
  );
}

export function calculateTopicSimilarity(left: string, right: string) {
  const leftTokens = getTopicTokenSet(left);
  const rightTokens = getTopicTokenSet(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  return unionSize === 0 ? 0 : overlap / unionSize;
}

export function formatTopicCode(topicNumber: number) {
  return `TOP-${String(topicNumber).padStart(4, "0")}`;
}
