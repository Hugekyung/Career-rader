import Parser from "rss-parser";
import { rssArticleSources } from "../config/article-sources";
import type { Article } from "../types/article";
import { createHashId } from "../utils/hash";
import { logger } from "../utils/logger";
import { normalizeWhitespace, stripHtml, truncate } from "../utils/text";

const parser = new Parser();

export async function collectRssArticles(): Promise<Article[]> {
  const articles: Article[] = [];

  for (const source of rssArticleSources) {
    try {
      const feed = await parser.parseURL(source.url);
      const collectedAt = new Date().toISOString();

      for (const item of feed.items) {
        if (!item.title || !item.link) {
          continue;
        }

        const descriptionSource = item.contentSnippet ?? item.content ?? "";
        const description = truncate(normalizeWhitespace(stripHtml(descriptionSource)), 200);

        articles.push({
          id: createHashId(item.guid ?? item.link),
          source: source.name,
          title: normalizeWhitespace(item.title),
          url: item.link,
          description,
          publishedAt: item.isoDate ?? item.pubDate,
          collectedAt,
          tags: source.tags,
        });
      }
    } catch (error) {
      logger.warn("Failed to collect RSS source. Skipping source.", {
        source: source.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return articles;
}
