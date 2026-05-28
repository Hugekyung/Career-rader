import { collectDevDayArticles } from "./collectors/devday-archive.collector";
import { collectJobSourcePostings, collectManualJobs } from "./collectors/job-source.collector";
import { collectRssArticles } from "./collectors/rss-article.collector";
import { MAX_DAILY_ARTICLES, MAX_DAILY_JOBS } from "./config/constants";
import { formatArticleMessage, formatJobMessage } from "./formatter/slack-message.formatter";
import { sendSlackMessage } from "./notifier/slack.notifier";
import {
  filterNewArticles,
  filterNewJobs,
  loadState,
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

function sortArticlesByPublishedAt(items: Article[]): Article[] {
  try {
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
  const rssArticles = await collectRssArticles();
  const devDayArticles = await collectDevDayArticles();
  const collectedArticles = uniqueByUrl([...rssArticles, ...devDayArticles]);
  const newArticles = sortArticlesByPublishedAt(filterNewArticles(collectedArticles, state)).slice(
    0,
    MAX_DAILY_ARTICLES,
  );

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

  await sendSlackMessage({
    webhookEnvName: "ARTICLE_SLACK_WEBHOOK_URL",
    text: articleMessage,
  });
  await sendSlackMessage({
    webhookEnvName: "JOB_SLACK_WEBHOOK_URL",
    text: jobMessage,
  });

  if (process.env.SKIP_STATE_SAVE === "true") {
    logger.info("SKIP_STATE_SAVE is enabled. Seen state was not updated.");
  } else {
    state.seenArticleUrls = [
      ...state.seenArticleUrls,
      ...newArticles.map((article) => article.url),
    ];
    state.seenJobUrls = [...state.seenJobUrls, ...newJobs.map((job) => job.url)];

    await saveState(state);
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
