import pino from "pino";

export const createLogger = (name?: string) =>
  pino({
    name: name || "ai-lib",
    level: process.env.LOG_LEVEL || "info",
    transport: process.env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" }
  });

export type Logger = ReturnType<typeof createLogger>;
