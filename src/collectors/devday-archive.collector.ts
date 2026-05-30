import { DEV_DAY_ARCHIVE_URL } from "../config/constants";
import type { Article } from "../types/article";
import { collectDevDayListingArticles } from "./devday-listing.collector";

export async function collectDevDayArticles(): Promise<Article[]> {
  return collectDevDayListingArticles(DEV_DAY_ARCHIVE_URL);
}
