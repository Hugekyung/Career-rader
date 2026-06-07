import { truncate, normalizeWhitespace } from "./text";

const MAX_SUMMARY_BULLETS = 2;
const MAX_SUMMARY_BULLET_LENGTH = 96;

function normalizeSummaryText(input?: string): string | undefined {
  const text = normalizeWhitespace(input ?? "");
  return text.length > 0 ? text : undefined;
}

function splitSummarySentences(text: string): string[] {
  return text
    .replace(/\s*[\u2022•·|]\s*/g, ". ")
    .split(/(?<=[.!?。！？])\s+/)
    .map((part) => normalizeWhitespace(part))
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
