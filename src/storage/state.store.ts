import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  ARTICLE_SEEN_RETENTION_DAYS,
  JOB_SEEN_RETENTION_DAYS,
  MAX_SEEN_ARTICLES,
  MAX_SEEN_JOBS,
  STATE_FILE_PATH,
} from "../config/constants";
import type { SeenItem, SeenState } from "../types/state";
import { logger } from "../utils/logger";

const defaultState: SeenState = {
  seenArticles: [],
  seenJobs: [],
  updatedAt: "",
};

function isSeenItem(value: unknown): value is SeenItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "url" in value &&
    "seenAt" in value &&
    typeof value.url === "string" &&
    typeof value.seenAt === "string"
  );
}

function migrateLegacyUrls(urls: unknown, fallbackSeenAt: string): SeenItem[] {
  if (!Array.isArray(urls)) {
    return [];
  }

  return urls
    .filter((url): url is string => typeof url === "string" && url.length > 0)
    .map((url) => ({
      url,
      seenAt: fallbackSeenAt,
    }));
}

function parseSeenItems(
  currentItems: unknown,
  legacyUrls: unknown,
  fallbackSeenAt: string,
): SeenItem[] {
  if (Array.isArray(currentItems)) {
    const items = currentItems.filter(isSeenItem);

    if (items.length > 0 || currentItems.length === 0) {
      return items;
    }
  }

  return migrateLegacyUrls(legacyUrls, fallbackSeenAt);
}

function pruneSeenItems(
  items: SeenItem[],
  options: {
    now: Date;
    retentionDays: number;
    maxItems: number;
  },
): SeenItem[] {
  const cutoffTime = options.now.getTime() - options.retentionDays * 24 * 60 * 60 * 1000;
  const deduped = new Map<string, SeenItem>();

  for (const item of items) {
    const seenTime = Date.parse(item.seenAt);

    if (!item.url || Number.isNaN(seenTime) || seenTime < cutoffTime) {
      continue;
    }

    const existing = deduped.get(item.url);

    if (!existing || Date.parse(existing.seenAt) < seenTime) {
      deduped.set(item.url, item);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => Date.parse(b.seenAt) - Date.parse(a.seenAt))
    .slice(0, options.maxItems);
}

export function markArticlesSeen<T extends { url: string }>(
  state: SeenState,
  items: T[],
  seenAt = new Date().toISOString(),
): SeenState {
  return {
    ...state,
    seenArticles: [
      ...state.seenArticles,
      ...items.map((item) => ({
        url: item.url,
        seenAt,
      })),
    ],
  };
}

export function markJobsSeen<T extends { url: string }>(
  state: SeenState,
  items: T[],
  seenAt = new Date().toISOString(),
): SeenState {
  return {
    ...state,
    seenJobs: [
      ...state.seenJobs,
      ...items.map((item) => ({
        url: item.url,
        seenAt,
      })),
    ],
  };
}

export async function loadState(): Promise<SeenState> {
  try {
    const content = await readFile(STATE_FILE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<
      SeenState & {
        seenArticleUrls: string[];
        seenJobUrls: string[];
      }
    >;
    const fallbackSeenAt = parsed.updatedAt || new Date().toISOString();

    return {
      seenArticles: parseSeenItems(parsed.seenArticles, parsed.seenArticleUrls, fallbackSeenAt),
      seenJobs: parseSeenItems(parsed.seenJobs, parsed.seenJobUrls, fallbackSeenAt),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch (error) {
    logger.warn("Failed to load seen state. Falling back to default state.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...defaultState };
  }
}

export async function saveState(state: SeenState): Promise<void> {
  const now = new Date();
  const nextState: SeenState = {
    ...state,
    seenArticles: pruneSeenItems(state.seenArticles, {
      now,
      retentionDays: ARTICLE_SEEN_RETENTION_DAYS,
      maxItems: MAX_SEEN_ARTICLES,
    }),
    seenJobs: pruneSeenItems(state.seenJobs, {
      now,
      retentionDays: JOB_SEEN_RETENTION_DAYS,
      maxItems: MAX_SEEN_JOBS,
    }),
    updatedAt: now.toISOString(),
  };

  await mkdir(dirname(STATE_FILE_PATH), { recursive: true });
  await writeFile(STATE_FILE_PATH, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
}

export function filterNewArticles<T extends { url: string }>(items: T[], state: SeenState): T[] {
  const seen = new Set(state.seenArticles.map((item) => item.url));
  return items.filter((item) => item.url && !seen.has(item.url));
}

export function filterNewJobs<T extends { url: string }>(items: T[], state: SeenState): T[] {
  const seen = new Set(state.seenJobs.map((item) => item.url));
  return items.filter((item) => item.url && !seen.has(item.url));
}
