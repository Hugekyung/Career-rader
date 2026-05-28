import { createHash } from "node:crypto";

export function createHashId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}
