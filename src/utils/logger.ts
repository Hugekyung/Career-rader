function write(level: "info" | "warn" | "error", message: string, meta?: unknown): void {
  const payload = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${payload}`;

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info(message: string, meta?: unknown): void {
    write("info", message, meta);
  },
  warn(message: string, meta?: unknown): void {
    write("warn", message, meta);
  },
  error(message: string, meta?: unknown): void {
    write("error", message, meta);
  },
};
