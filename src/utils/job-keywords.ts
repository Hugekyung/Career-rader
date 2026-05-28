import type { JobPosting } from "../types/job-posting";

export function normalizeForKeyword(input: string): string {
  return input
    .toLowerCase()
    .replace(/node\s*\.?\s*js/g, "node.js")
    .replace(/nest\s*\.?\s*js/g, "nest.js")
    .replace(/type\s*script/g, "typescript")
    .replace(/\s+/g, " ")
    .trim();
}

export function includesAnyKeyword(text: string, keywords?: string[]): boolean {
  if (!keywords || keywords.length === 0) {
    return true;
  }

  const normalizedText = normalizeForKeyword(text);

  return keywords.some((keyword) => normalizedText.includes(normalizeForKeyword(keyword)));
}

export function includesNoExcludedKeyword(text: string, keywords?: string[]): boolean {
  if (!keywords || keywords.length === 0) {
    return true;
  }

  const normalizedText = normalizeForKeyword(text);

  return !keywords.some((keyword) => normalizedText.includes(normalizeForKeyword(keyword)));
}

export function matchesJobKeywords(
  text: string,
  options: {
    requiredKeywords?: string[];
    excludeKeywords?: string[];
  },
): boolean {
  return (
    includesAnyKeyword(text, options.requiredKeywords) &&
    includesNoExcludedKeyword(text, options.excludeKeywords)
  );
}

export function normalizeCompanyName(company?: string): string {
  if (!company) {
    return "";
  }

  return company
    .toLowerCase()
    .replace(/\(주\)|㈜|\binc\.?\b|\bcorp\.?\b|\bco\.?\b|주식회사/g, "")
    .replace(/[^a-z0-9가-힣]/g, "")
    .trim();
}

export function uniqueJobsByCompany(items: JobPosting[]): JobPosting[] {
  const seenCompanies = new Set<string>();
  const result: JobPosting[] = [];

  for (const item of items) {
    const companyKey = normalizeCompanyName(item.company);

    if (!companyKey) {
      result.push(item);
      continue;
    }

    if (seenCompanies.has(companyKey)) {
      continue;
    }

    seenCompanies.add(companyKey);
    result.push(item);
  }

  return result;
}

export function limitJobsByProvider(items: JobPosting[], maxPerProvider: number): JobPosting[] {
  const counts = new Map<string, number>();
  const result: JobPosting[] = [];

  for (const item of items) {
    const provider = item.provider ?? item.source;
    const currentCount = counts.get(provider) ?? 0;

    if (currentCount >= maxPerProvider) {
      continue;
    }

    counts.set(provider, currentCount + 1);
    result.push(item);
  }

  return result;
}
