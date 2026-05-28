import axios from "axios";
import * as cheerio from "cheerio";
import { DEV_DAY_ARCHIVE_URL } from "../config/constants";
import type { Article } from "../types/article";
import { createHashId } from "../utils/hash";
import { logger } from "../utils/logger";
import { normalizeWhitespace } from "../utils/text";

export async function collectDevDayArticles(): Promise<Article[]> {
  try {
    const response = await axios.get<string>(DEV_DAY_ARCHIVE_URL, {
      timeout: 15_000,
      responseType: "text",
    });
    const $ = cheerio.load(response.data);
    const seenUrls = new Set<string>();
    const collectedAt = new Date().toISOString();
    const articles: Article[] = [];

    $("a").each((_, element) => {
      const href = $(element).attr("href");
      const title = normalizeWhitespace($(element).text());

      if (!href || title.length < 8) {
        return;
      }

      const url = new URL(href, "https://devday.kr").toString();

      if (seenUrls.has(url)) {
        return;
      }

      seenUrls.add(url);
      articles.push({
        id: createHashId(url),
        source: "DevDay",
        title,
        url,
        collectedAt,
        tags: ["Tech"],
      });
    });

    if (articles.length === 0) {
      logger.warn("DevDay archive parsing returned no candidates.");
    }

    return articles;
  } catch (error) {
    logger.warn("Failed to collect DevDay archive. Skipping source.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
