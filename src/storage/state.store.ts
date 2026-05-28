import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { STATE_FILE_PATH } from "../config/constants";
import type { SeenState } from "../types/state";
import { logger } from "../utils/logger";

const defaultState: SeenState = {
  seenArticleUrls: [],
  seenJobUrls: [],
  updatedAt: "",
};

export async function loadState(): Promise<SeenState> {
  try {
    const content = await readFile(STATE_FILE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<SeenState>;

    return {
      seenArticleUrls: Array.isArray(parsed.seenArticleUrls) ? parsed.seenArticleUrls : [],
      seenJobUrls: Array.isArray(parsed.seenJobUrls) ? parsed.seenJobUrls : [],
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
  const nextState: SeenState = {
    ...state,
    seenArticleUrls: Array.from(new Set(state.seenArticleUrls)),
    seenJobUrls: Array.from(new Set(state.seenJobUrls)),
    updatedAt: new Date().toISOString(),
  };

  await mkdir(dirname(STATE_FILE_PATH), { recursive: true });
  await writeFile(STATE_FILE_PATH, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
}

export function filterNewArticles<T extends { url: string }>(items: T[], state: SeenState): T[] {
  const seen = new Set(state.seenArticleUrls);
  return items.filter((item) => item.url && !seen.has(item.url));
}

export function filterNewJobs<T extends { url: string }>(items: T[], state: SeenState): T[] {
  const seen = new Set(state.seenJobUrls);
  return items.filter((item) => item.url && !seen.has(item.url));
}
