import axios from "axios";
import * as cheerio from "cheerio";
import type { JobPosting } from "../types/job-posting";
import type { JobProvider } from "../types/job-source";
import { logger } from "../utils/logger";
import { normalizeWhitespace, truncate } from "../utils/text";

interface JobDetail {
  company?: string;
  detailText?: string;
}

const DETAIL_TEXT_LIMIT = 12_000;

const detailSelectorsByProvider: Record<JobProvider, string[]> = {
  JobKorea: [
    ".artReadJobSum",
    ".tbList",
    ".artReadDetail",
    ".devTplLyClick",
    ".job-detail",
    "#container",
    "body",
  ],
  Saramin: [
    ".jv_header",
    ".jv_cont",
    ".jv_summary",
    ".job_view_content",
    ".cont_recruit",
    "#sri_section",
    "body",
  ],
  Manual: ["body"],
};

const companySelectorsByProvider: Record<JobProvider, string[]> = {
  JobKorea: [
    ".coName",
    ".corp_name",
    ".company-name",
    "a[href*='Co_Read']",
  ],
  Saramin: [
    ".jv_header .company",
    ".jv_company_name",
    ".company",
    ".corp_name",
    "a.company",
  ],
  Manual: [],
};

function cleanDocument($: cheerio.CheerioAPI): void {
  $("script, style, noscript, nav, footer, header, iframe").remove();
}

function isSiteName(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  return ["잡코리아", "jobkorea", "사람인", "saramin"].includes(normalized);
}

function cleanCompanyName(company: string): string | undefined {
  const cleaned = normalizeWhitespace(company)
    .replace(/\s*(스크랩|북마크|관심기업 등록하기)\s*/g, " ")
    .trim();

  if (!cleaned || cleaned.length > 80) {
    return undefined;
  }

  return cleaned;
}

function extractCompanyFromText(text?: string): string | undefined {
  if (!text) {
    return undefined;
  }

  const normalized = normalizeWhitespace(text);
  const bracketMatch = normalized.match(/^\[([^\]]+)\]/)?.[1];
  const parenMatch = normalized.match(/^\(([^)]+)\)/)?.[1];
  const prefixMatch = normalized.match(/^([^,\-–|]+)/)?.[1];

  const candidates = [bracketMatch, parenMatch, prefixMatch];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const cleaned = cleanCompanyName(candidate);

    if (cleaned && !isSiteName(cleaned)) {
      return cleaned;
    }
  }

  return undefined;
}

function pickTextBySelectors(
  $: cheerio.CheerioAPI,
  selectors: string[],
  minLength = 20,
): string | undefined {
  for (const selector of selectors) {
    const element = $(selector).first();
    const content =
      selector.startsWith("meta") && element.attr("content")
        ? element.attr("content")
        : element.text();
    const text = normalizeWhitespace(content ?? "");

    if (text.length >= minLength || (selector.startsWith("meta") && text.length > 0)) {
      return text;
    }
  }

  return undefined;
}

async function collectJobDetail(job: JobPosting): Promise<JobDetail> {
  try {
    const response = await axios.get<string>(job.url, {
      timeout: 15_000,
      responseType: "text",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CareerRadar/1.0; +https://github.com/career-radar)",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });
    const $ = cheerio.load(response.data);
    const provider = job.provider ?? "Manual";
    cleanDocument($);

    const companyCandidates = [
      pickTextBySelectors($, companySelectorsByProvider[provider], 2),
      pickTextBySelectors($, ["meta[property='og:title']", "title"], 2),
      pickTextBySelectors($, ["meta[name='description']"], 2),
    ];
    const company = companyCandidates
      .map((candidate) => extractCompanyFromText(candidate))
      .find((candidate): candidate is string => candidate !== undefined);
    const detailText = pickTextBySelectors($, detailSelectorsByProvider[provider]);

    return {
      company: company ? truncate(company, 80) : undefined,
      detailText: detailText ? truncate(detailText, DETAIL_TEXT_LIMIT) : undefined,
    };
  } catch (error) {
    logger.warn("Failed to collect job detail. Keeping list-level data.", {
      source: job.source,
      url: job.url,
      error: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
}

export async function enrichJobPostingsWithDetails(jobs: JobPosting[]): Promise<JobPosting[]> {
  const enrichedJobs: JobPosting[] = [];

  for (const job of jobs) {
    const detail = await collectJobDetail(job);
    enrichedJobs.push({
      ...job,
      company: detail.company ?? job.company,
      detailText: detail.detailText,
    });
  }

  return enrichedJobs;
}
