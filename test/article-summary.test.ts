import assert from "node:assert/strict";
import test from "node:test";

import { formatArticleMessage } from "../src/formatter/slack-message.formatter";
import type { Article } from "../src/types/article";
import {
  buildArticleSummaryBullets,
  isSupportedArticleSummaryUrl,
  buildArticleSummaryFetchOptions,
} from "../src/utils/article-summary";

test("formatArticleMessage renders a 내용 section with two summary bullets", () => {
  const articles: Article[] = [
    {
      id: "article-1",
      source: "DevDay",
      title: "Cloudflare adds new Vite ecosystem support",
      url: "https://example.com/articles/cloudflare-vite",
      summary:
        "Cloudflare announced new investment in Vite. The update focuses on ecosystem growth and developer tooling.",
      collectedAt: "2026-06-07T00:00:00.000Z",
    },
  ];

  const message = formatArticleMessage({ articles });

  assert.match(message, /- 내용/);
  assert.match(message, /  - Cloudflare announced new investment in Vite\./);
  assert.match(message, /  - The update focuses on ecosystem growth and developer tooling\./);
});

test("formatArticleMessage renders a safe fallback when summary is missing", () => {
  const articles: Article[] = [
    {
      id: "article-2",
      source: "DevDay",
      title: "Article without summary",
      url: "https://example.com/articles/no-summary",
      collectedAt: "2026-06-07T00:00:00.000Z",
    },
  ];

  const message = formatArticleMessage({ articles });

  assert.match(message, /- 내용/);
  assert.match(message, /  - 요약 정보 없음/);
  assert.match(message, /- 출처: DevDay/);
  assert.match(message, /- 링크: https:\/\/example.com\/articles\/no-summary/);
});

test("formatArticleMessage uses description when summary is missing", () => {
  const articles: Article[] = [
    {
      id: "article-3",
      source: "DevDay",
      title: "Article with description",
      url: "https://example.com/articles/description",
      description:
        "Summary from description. Supporting detail from RSS metadata.",
      collectedAt: "2026-06-07T00:00:00.000Z",
    },
  ];

  const message = formatArticleMessage({ articles });

  assert.match(message, /  - Summary from description\./);
  assert.match(message, /  - Supporting detail from RSS metadata\./);
});

test("buildArticleSummaryBullets returns at most two concise bullets", () => {
  const bullets = buildArticleSummaryBullets(
    "First sentence gives the main point. Second sentence adds a supporting detail. Third sentence should not appear. Fourth sentence should also be ignored.",
  );

  assert.equal(bullets.length, 2);
  assert.equal(bullets[0], "First sentence gives the main point.");
  assert.equal(bullets[1], "Second sentence adds a supporting detail.");
});

test("buildArticleSummaryBullets trims leading bullet punctuation", () => {
  const bullets = buildArticleSummaryBullets("• Cloudflare announced new investment in Vite. Another detail follows.");

  assert.equal(bullets[0], "Cloudflare announced new investment in Vite.");
  assert.equal(bullets[1], "Another detail follows.");
});

test("buildArticleSummaryBullets splits bullet lists without punctuation", () => {
  const bullets = buildArticleSummaryBullets("• First bullet • Second bullet • Third bullet");

  assert.deepEqual(bullets, ["First bullet", "Second bullet"]);
});

test("article summary fetch helpers allow only http and https URLs and cap response size", () => {
  assert.equal(isSupportedArticleSummaryUrl("https://example.com/article"), true);
  assert.equal(isSupportedArticleSummaryUrl("http://example.com/article"), true);
  assert.equal(isSupportedArticleSummaryUrl("ftp://example.com/article"), false);
  assert.equal(isSupportedArticleSummaryUrl("javascript:alert(1)"), false);

  const options = buildArticleSummaryFetchOptions();

  assert.equal(options.maxContentLength, 2 * 1024 * 1024);
  assert.equal(options.maxBodyLength, 2 * 1024 * 1024);
});
