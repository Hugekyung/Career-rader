import { collectDevDayArticles } from "./collectors/devday-archive.collector";
import { collectDevDayLatestArticles } from "./collectors/devday-latest.collector";
import { collectJobSourcePostings, collectManualJobs } from "./collectors/job-source.collector";
import { collectRssArticles } from "./collectors/rss-article.collector";
import { MAX_DAILY_ARTICLES, MAX_DAILY_JOBS } from "./config/constants";
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

function interleaveJobsBySource(items: JobPosting[]): JobPosting[] {
  const grouped = new Map<string, JobPosting[]>();

  for (const item of items) {
    const group = grouped.get(item.source) ?? [];
    group.push(item);
    grouped.set(item.source, group);
  }

  const interleaved: JobPosting[] = [];
  let hasRemainingItems = true;

  while (hasRemainingItems) {
    hasRemainingItems = false;

    for (const group of grouped.values()) {
      const item = group.shift();

      if (item) {
        interleaved.push(item);
        hasRemainingItems = true;
      }
    }
  }

  return interleaved;
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
  const newJobs = interleaveJobsBySource(filterNewJobs(collectedJobs, state)).slice(
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
