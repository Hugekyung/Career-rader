# Article Content Summary

## Summary
Add a `내용` section to article Slack output so each article shows source, link, and 1-2 short summary bullets. Reuse existing RSS `description` data where available, and enrich non-RSS articles with a lightweight detail fetch so DevDay items also have usable summary text.

## Key Changes
- Extend article ingestion so `Article` keeps an optional summary text field end-to-end without breaking current fields.
- Add an article-detail enrichment step for articles that do not already have summary text, using page metadata/body text and a short timeout/fail-open policy.
- Update `formatArticleMessage` to render:
  - `출처`
  - `링크`
  - `내용`
    - 1-2 nested bullets, derived from the summary text
- Keep fallback behavior deterministic:
  - if a summary cannot be extracted, still send the article with `내용` omitted or a single fallback bullet instead of blocking delivery.
  - never change job output or state-saving behavior.

## Test Plan
- Add a focused formatter test for article message shape:
  - one article with summary text renders `내용` plus two bullets
  - one article without summary text still renders source/link and a safe fallback
- Add a unit test for summary splitting/truncation so one long description becomes at most two short bullets.
- Verify with `npm run typecheck`.
- Verify with `npm run run:mock` and inspect the printed article payload for the new `내용` section.

## Assumptions
- The summary bullets are extractive, not AI-generated.
- Two bullets is an upper bound, not a hard requirement when source text is too short.
- Summary extraction should fail open so article delivery still works if an upstream page is missing metadata.
- Existing RSS description data is sufficient for RSS items; DevDay needs detail-page enrichment to reach the same output quality.
