import axios from "axios";
import * as cheerio from "cheerio";
import { DEV_DAY_LATEST_URL } from "../config/constants";
import type { Article } from "../types/article";
import { createHashId } from "../utils/hash";
import { logger } from "../utils/logger";
import { normalizeWhitespace } from "../utils/text";
import { normalizeUrl } from "../utils/url";

function isLikelyArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (parsed.hostname !== "devday.kr") {
      return true;
    }

    return !["/", "/archive"].includes(parsed.pathname);
  } catch {
    return false;
  }
}

export async function collectDevDayLatestArticles(): Promise<Article[]> {
  try {
    const response = await axios.get<string>(DEV_DAY_LATEST_URL, {
      timeout: 15_000,
      responseType: "text",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CareerRadar/1.0; +https://github.com/career-radar)",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
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

      const url = normalizeUrl(href, DEV_DAY_LATEST_URL);

      if (!url || !isLikelyArticleUrl(url) || seenUrls.has(url)) {
        return;
      }

      seenUrls.add(url);
      articles.push({
        id: createHashId(url),
        source: "DevDay Latest",
        title,
        url,
        collectedAt,
        tags: ["Tech"],
      });
    });

    if (articles.length === 0) {
      logger.warn("DevDay latest parsing returned no candidates.");
    }

    return articles;
  } catch (error) {
    logger.warn("Failed to collect DevDay latest. Skipping source.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
