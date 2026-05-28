import { manualJobUrls } from "../config/manual-job-urls";
import type { JobPosting } from "../types/job-posting";
import { createHashId } from "../utils/hash";
import { normalizeWhitespace } from "../utils/text";

export async function collectManualJobs(): Promise<JobPosting[]> {
  const collectedAt = new Date().toISOString();

  return manualJobUrls
    .filter((job) => job.title && job.url)
    .map((job) => ({
      id: createHashId(job.url),
      source: job.source ?? "Manual",
      title: normalizeWhitespace(job.title),
      company: job.company ? normalizeWhitespace(job.company) : undefined,
      url: job.url,
      collectedAt,
    }));
}
