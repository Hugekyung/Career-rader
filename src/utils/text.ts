import * as cheerio from "cheerio";

export function stripHtml(input?: string): string {
  if (!input) {
    return "";
  }

  return cheerio.load(input).text();
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }

  if (maxLength <= 1) {
    return input.slice(0, maxLength);
  }

  return `${input.slice(0, maxLength - 1)}…`;
}
