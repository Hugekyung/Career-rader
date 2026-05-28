import axios from "axios";
import * as cheerio from "cheerio";
import { jobSources } from "../config/job-sources";
import { manualJobUrls } from "../config/manual-job-urls";
import type { JobPosting } from "../types/job-posting";
import type { JobSource } from "../types/job-source";
import { createHashId } from "../utils/hash";
import { logger } from "../utils/logger";
import { normalizeWhitespace } from "../utils/text";
import { getUrlMatchTarget, normalizeUrl } from "../utils/url";

function isCandidateUrl(url: string, source: JobSource): boolean {
  const target = getUrlMatchTarget(url);
  const includes = source.includeUrlPatterns.some((pattern) => target.includes(pattern));
  const excludes = source.excludeUrlPatterns?.some((pattern) => target.includes(pattern)) ?? false;

  return includes && !excludes;
}

function cleanJobTitle(title: string): string {
  return normalizeWhitespace(title)
    .replace(/\s*(스크랩|북마크|관심기업 등록하기)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function upsertByBetterTitle(items: Map<string, JobPosting>, next: JobPosting): void {
  const previous = items.get(next.url);

  if (!previous || next.title.length > previous.title.length) {
    items.set(next.url, next);
  }
}

async function collectSingleJobSource(source: JobSource): Promise<JobPosting[]> {
  const response = await axios.get<string>(source.url, {
    timeout: 15_000,
    responseType: "text",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CareerRadar/1.0; +https://github.com/career-radar)",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
  });
  const $ = cheerio.load(response.data);
  const collectedAt = new Date().toISOString();
  const items = new Map<string, JobPosting>();

  $("a").each((_, element) => {
    const href = $(element).attr("href");
    const title = cleanJobTitle($(element).text());

    if (!href || title.length < 4) {
      return;
    }

    const url = normalizeUrl(href, source.url);

    if (!url || !isCandidateUrl(url, source)) {
      return;
    }

    upsertByBetterTitle(items, {
      id: createHashId(url),
      source: source.name,
      title,
      company: source.company,
      url,
      sourceUrl: source.url,
      collectedAt,
    });
  });

  const postings = Array.from(items.values()).slice(0, source.maxItems ?? 30);

  if (postings.length === 0) {
    logger.warn("Job source returned no job posting candidates.", {
      source: source.name,
      url: source.url,
    });
  }

  return postings;
}

export async function collectJobSourcePostings(): Promise<JobPosting[]> {
  const collectedJobs: JobPosting[] = [];

  for (const source of jobSources) {
    try {
      const sourceJobs = await collectSingleJobSource(source);
      collectedJobs.push(...sourceJobs);
    } catch (error) {
      logger.warn("Failed to collect job source. Skipping source.", {
        source: source.name,
        url: source.url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return collectedJobs;
}

export async function collectManualJobs(): Promise<JobPosting[]> {
  const collectedAt = new Date().toISOString();

  return manualJobUrls
    .filter((job) => job.title && job.url)
    .map((job) => {
      const normalizedUrl = normalizeUrl(job.url) ?? job.url;

      return {
        id: createHashId(normalizedUrl),
        source: job.source ?? "Manual",
        title: cleanJobTitle(job.title),
        company: job.company ? normalizeWhitespace(job.company) : undefined,
        url: normalizedUrl,
        collectedAt,
      };
    });
}
