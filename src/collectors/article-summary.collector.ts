import axios from "axios";
import * as cheerio from "cheerio";
import type { Article } from "../types/article";
import { logger } from "../utils/logger";
import { normalizeWhitespace, truncate } from "../utils/text";
import { summarizeArticleText } from "../utils/article-summary";

const SUMMARY_FETCH_TIMEOUT_MS = 12_000;
const SUMMARY_TEXT_LIMIT = 800;
const SUMMARY_BATCH_SIZE = 4;

function cleanDocument($: cheerio.CheerioAPI): void {
  $("script, style, noscript, nav, footer, header, iframe").remove();
}

function pickTextBySelectors(
  $: cheerio.CheerioAPI,
  selectors: string[],
): string | undefined {
  for (const selector of selectors) {
    const element = $(selector).first();
    const content = selector.startsWith("meta") ? element.attr("content") : element.text();
    const text = normalizeWhitespace(content ?? "");

    if (text.length > 0) {
      return text;
    }
  }

  return undefined;
}

function extractParagraphSummary($: cheerio.CheerioAPI): string | undefined {
  const paragraphSelectors = [
    "article p",
    "main p",
    ".article-content p",
    ".post-content p",
    ".entry-content p",
    "body p",
  ];

  const paragraphs: string[] = [];

  for (const selector of paragraphSelectors) {
    $(selector)
      .toArray()
      .forEach((element) => {
        const text = normalizeWhitespace($(element).text());

        if (text.length > 0 && !paragraphs.includes(text)) {
          paragraphs.push(text);
        }
      });

    if (paragraphs.length >= 2) {
      break;
    }
  }

  if (paragraphs.length === 0) {
    return undefined;
  }

  return truncate(paragraphs.slice(0, 2).join(" "), SUMMARY_TEXT_LIMIT);
}

async function collectArticleSummary(article: Article): Promise<string | undefined> {
  const existingSummary = summarizeArticleText(article.summary ?? article.description);

  if (existingSummary) {
    return existingSummary;
  }

  try {
    const response = await axios.get<string>(article.url, {
      timeout: SUMMARY_FETCH_TIMEOUT_MS,
      responseType: "text",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CareerRadar/1.0; +https://github.com/career-radar)",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });

    const $ = cheerio.load(response.data);
    cleanDocument($);

    const summaryCandidate =
      pickTextBySelectors($, [
        "meta[property='og:description']",
        "meta[name='description']",
        "meta[name='twitter:description']",
      ]) ?? extractParagraphSummary($);

    return summarizeArticleText(truncate(summaryCandidate ?? "", SUMMARY_TEXT_LIMIT));
  } catch (error) {
    logger.warn("Failed to collect article summary. Keeping list-level data.", {
      source: article.source,
      url: article.url,
      error: error instanceof Error ? error.message : String(error),
    });

    return existingSummary;
  }
}

export async function enrichArticlesWithSummary(articles: Article[]): Promise<Article[]> {
  const enrichedArticles: Article[] = [];

  for (let index = 0; index < articles.length; index += SUMMARY_BATCH_SIZE) {
    const batch = articles.slice(index, index + SUMMARY_BATCH_SIZE);
    const batchSummaries = await Promise.all(batch.map((article) => collectArticleSummary(article)));

    batch.forEach((article, batchIndex) => {
      enrichedArticles.push({
        ...article,
        summary: batchSummaries[batchIndex] ?? summarizeArticleText(article.summary ?? article.description),
      });
    });
  }

  return enrichedArticles;
}
