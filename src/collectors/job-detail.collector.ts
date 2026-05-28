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

    const company = pickTextBySelectors($, companySelectorsByProvider[provider], 2);
    const detailText = pickTextBySelectors($, detailSelectorsByProvider[provider]);

    return {
      company: company && !isSiteName(company) ? truncate(company, 80) : undefined,
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
