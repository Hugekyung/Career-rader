import { truncate, normalizeWhitespace } from "./text";

const MAX_SUMMARY_BULLETS = 2;
const MAX_SUMMARY_BULLET_LENGTH = 96;
const ARTICLE_SUMMARY_MAX_BYTES = 2 * 1024 * 1024;

function normalizeSummaryText(input?: string): string | undefined {
  const text = normalizeWhitespace(input ?? "");
  return text.length > 0 ? text : undefined;
}

function stripLeadingBulletPunctuation(input: string): string {
  return input.replace(/^[\s.!?。！？·•|]+/, "");
}

function splitSummarySentences(text: string): string[] {
  return text
    .replace(/[\u2022•·|]/g, "\n")
    .split(/(?:\n+|(?<=[.!?。！？])\s+)/)
    .map((part) => normalizeWhitespace(part))
    .map((part) => stripLeadingBulletPunctuation(part))
    .filter((part) => part.length > 0);
}

export function buildArticleSummaryBullets(input?: string): string[] {
  const normalized = normalizeSummaryText(input);

  if (!normalized) {
    return [];
  }

  const candidates = splitSummarySentences(normalized);
  const bullets =
    candidates.length > 0 ? candidates : [truncate(normalized, MAX_SUMMARY_BULLET_LENGTH)];

  return bullets
    .slice(0, MAX_SUMMARY_BULLETS)
    .map((bullet) => truncate(bullet, MAX_SUMMARY_BULLET_LENGTH));
}

export function summarizeArticleText(input?: string): string | undefined {
  return normalizeSummaryText(input);
}

export function isSupportedArticleSummaryUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildArticleSummaryFetchOptions(): {
  readonly timeout: number;
  readonly responseType: "text";
  readonly maxContentLength: number;
  readonly maxBodyLength: number;
  readonly headers: {
    readonly "User-Agent": string;
    readonly "Accept-Language": string;
  };
} {
  return {
    timeout: 12_000,
    responseType: "text",
    maxContentLength: ARTICLE_SUMMARY_MAX_BYTES,
    maxBodyLength: ARTICLE_SUMMARY_MAX_BYTES,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CareerRadar/1.0; +https://github.com/career-radar)",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
  };
}
