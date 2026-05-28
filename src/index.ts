import { analyzeJobPostings } from "./analyzers/job-fit.analyzer";
import { collectDevDayArticles } from "./collectors/devday-archive.collector";
import { collectDevDayLatestArticles } from "./collectors/devday-latest.collector";
import { enrichJobPostingsWithDetails } from "./collectors/job-detail.collector";
import { collectJobSourcePostings, collectManualJobs } from "./collectors/job-source.collector";
import { collectRssArticles } from "./collectors/rss-article.collector";
import { MAX_DAILY_ARTICLES, MAX_DAILY_JOBS } from "./config/constants";
import {
  excludedNonBackendKeywords,
  fallbackBackendKeywords,
  requiredBackendKeywords,
} from "./config/job-sources";
import { formatArticleMessage, formatJobMessage } from "./formatter/slack-message.formatter";
import { sendSlackMessage } from "./notifier/slack.notifier";
import {
  filterNewArticles,
  filterNewJobs,
  loadState,
  markArticlesSeen,
  markJobsSeen,
  saveState,
} from "./storage/state.store";
import type { Article } from "./types/article";
import type { JobPosting } from "./types/job-posting";
import { limitJobsByProvider, matchesJobKeywords, uniqueJobsByCompany } from "./utils/job-keywords";
import { logger } from "./utils/logger";

function uniqueByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const uniqueItems: T[] = [];

  for (const item of items) {
    if (!item.url || seen.has(item.url)) {
      continue;
    }

    seen.add(item.url);
    uniqueItems.push(item);
  }

  return uniqueItems;
}

function sortArticlesByPublishedAtIfAvailable(items: Article[]): Article[] {
  try {
    const hasComparableDates = items.some((item) => {
      return item.publishedAt !== undefined && !Number.isNaN(Date.parse(item.publishedAt));
    });

    if (!hasComparableDates) {
      return items;
    }

    return [...items].sort((a, b) => {
      const aTime = a.publishedAt ? Date.parse(a.publishedAt) : Number.NaN;
      const bTime = b.publishedAt ? Date.parse(b.publishedAt) : Number.NaN;

      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return 0;
      }

      return bTime - aTime;
    });
  } catch (error) {
    logger.warn("Failed to sort articles by publishedAt. Keeping original order.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return items;
  }
}

function matchesBackendTarget(job: JobPosting): boolean {
  return matchesJobKeywords(`${job.title} ${job.company ?? ""} ${job.detailText ?? ""}`, {
    requiredKeywords: requiredBackendKeywords,
    excludeKeywords: excludedNonBackendKeywords,
  });
}

function matchesFallbackBackendTarget(job: JobPosting): boolean {
  return matchesJobKeywords(`${job.title} ${job.company ?? ""} ${job.detailText ?? ""}`, {
    requiredKeywords: fallbackBackendKeywords,
    excludeKeywords: excludedNonBackendKeywords,
  });
}

function fillJobsWithFallback(primaryJobs: JobPosting[], fallbackJobs: JobPosting[]): JobPosting[] {
  const selected = [...primaryJobs];
  const selectedUrls = new Set(selected.map((job) => job.url));

  for (const job of fallbackJobs) {
    if (selected.length >= MAX_DAILY_JOBS) {
      break;
    }

    if (selectedUrls.has(job.url)) {
      continue;
    }

    selected.push(job);
    selectedUrls.add(job.url);
  }

  return selected;
}

async function main(): Promise<void> {
  logger.info("Daily Career Radar started.");

  const state = await loadState();
  let nextState = state;
  const rssArticles = await collectRssArticles();
  const devDayLatestArticles = await collectDevDayLatestArticles();
  const devDayArticles = await collectDevDayArticles();
  const collectedArticles = uniqueByUrl([
    ...devDayLatestArticles,
    ...devDayArticles,
    ...rssArticles,
  ]);
  const newArticles = sortArticlesByPublishedAtIfAvailable(
    filterNewArticles(collectedArticles, state),
  ).slice(0, MAX_DAILY_ARTICLES);

  const sourceJobs = await collectJobSourcePostings();
  const manualJobs = await collectManualJobs();
  const collectedJobs = uniqueByUrl<JobPosting>([...sourceJobs, ...manualJobs]);
  const candidateJobs = limitJobsByProvider(filterNewJobs(collectedJobs, state), 15);
  const detailedJobs = await enrichJobPostingsWithDetails(candidateJobs);
  const primaryJobs = uniqueJobsByCompany(detailedJobs.filter(matchesBackendTarget));
  const fallbackJobs = uniqueJobsByCompany(
    detailedJobs.filter((job) => !matchesBackendTarget(job) && matchesFallbackBackendTarget(job)),
  );
  const analyzedPrimaryJobs = analyzeJobPostings(primaryJobs).sort(
    (a, b) => (b.fit?.score ?? 0) - (a.fit?.score ?? 0),
  );
  const analyzedFallbackJobs = analyzeJobPostings(fallbackJobs).sort(
    (a, b) => (b.fit?.score ?? 0) - (a.fit?.score ?? 0),
  );
  const newJobs = fillJobsWithFallback(analyzedPrimaryJobs, analyzedFallbackJobs).slice(
    0,
    MAX_DAILY_JOBS,
  );

  const articleMessage = formatArticleMessage({
    articles: newArticles,
  });
  const jobMessage = formatJobMessage({
    jobs: newJobs,
  });

  const articleDelivery = sendSlackMessage({
    webhookEnvName: "ARTICLE_SLACK_WEBHOOK_URL",
    text: articleMessage,
  });
  const jobDelivery = sendSlackMessage({
    webhookEnvName: "JOB_SLACK_WEBHOOK_URL",
    text: jobMessage,
  });
  const [articleResult, jobResult] = await Promise.allSettled([articleDelivery, jobDelivery]);

  if (articleResult.status === "fulfilled") {
    nextState = markArticlesSeen(nextState, newArticles);
  }

  if (jobResult.status === "fulfilled") {
    nextState = markJobsSeen(nextState, newJobs);
  }

  const hasSuccessfulDelivery =
    articleResult.status === "fulfilled" || jobResult.status === "fulfilled";

  if (process.env.SKIP_STATE_SAVE === "true") {
    logger.info("SKIP_STATE_SAVE is enabled. Seen state was not updated.");
  } else if (!hasSuccessfulDelivery) {
    logger.warn("All Slack deliveries failed. Seen state was not updated.");
  } else {
    await saveState(nextState);
  }

  const failures = [
    articleResult.status === "rejected" ? "article slack delivery" : undefined,
    jobResult.status === "rejected" ? "job slack delivery" : undefined,
  ].filter((failure): failure is string => failure !== undefined);

  if (failures.length > 0) {
    throw new Error(`Partial delivery failure: ${failures.join(", ")}`);
  }

  logger.info("Daily Career Radar completed.", {
    articlesSent: newArticles.length,
    jobsSent: newJobs.length,
  });
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Daily Career Radar failed.", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
