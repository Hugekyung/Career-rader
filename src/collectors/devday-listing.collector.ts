import axios from "axios";
import * as cheerio from "cheerio";
import type { Article } from "../types/article";
import { createHashId } from "../utils/hash";
import { logger } from "../utils/logger";
import { normalizeWhitespace } from "../utils/text";
import { normalizeUrl } from "../utils/url";

function toArticleCard(
  $: cheerio.CheerioAPI,
  element: Parameters<cheerio.CheerioAPI>[0],
  baseUrl: string,
): Article | undefined {
  const anchor = $(element);
  const href = anchor.attr("href");
  const collectedAt = new Date().toISOString();

  if (!href || href === "/article/ranking") {
    return undefined;
  }

  const title = normalizeWhitespace(anchor.find("h2").first().text());
  const source = normalizeWhitespace(anchor.find("div span").first().text());
  const publishedAt = anchor.find("time").attr("datetime");
  const url = normalizeUrl(href, baseUrl);

  if (!url || title.length < 8) {
    return undefined;
  }

  return {
    id: createHashId(url),
    source: source || "DevDay",
    title,
    url,
    publishedAt,
    collectedAt,
    tags: ["Tech"],
  };
}

export async function collectDevDayListingArticles(
  listingUrl: string,
  options: {
    warnOnEmpty?: boolean;
  } = {},
): Promise<Article[]> {
  try {
    const response = await axios.get<string>(listingUrl, {
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
    const articles: Article[] = [];

    $("a[href^='/article/']").each((_, element) => {
      const article = toArticleCard($, element, listingUrl);

      if (!article || seenUrls.has(article.url)) {
        return;
      }

      seenUrls.add(article.url);
      articles.push(article);
    });

    if (articles.length === 0 && options.warnOnEmpty !== false) {
      logger.warn("DevDay listing parsing returned no article cards.", {
        url: listingUrl,
      });
    }

    return articles;
  } catch (error) {
    logger.warn("Failed to collect DevDay listing. Skipping source.", {
      url: listingUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
