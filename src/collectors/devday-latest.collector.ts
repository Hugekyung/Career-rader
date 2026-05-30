import { DEV_DAY_LATEST_URL } from "../config/constants";
import type { Article } from "../types/article";
import { logger } from "../utils/logger";
import { collectDevDayListingArticles } from "./devday-listing.collector";

export async function collectDevDayLatestArticles(): Promise<Article[]> {
  const articles = await collectDevDayListingArticles(DEV_DAY_LATEST_URL, {
    warnOnEmpty: false,
  });

  if (articles.length === 0) {
    logger.info("DevDay latest page had no server-rendered article cards; skipping.");
  }

  return articles;
}
