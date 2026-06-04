import pino from "pino";

const level: string = process.env.LOG_LEVEL || "info";

const logger = pino({
  level,
  transport: process.env.NODE_ENV !== "production" ? {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
  } : undefined,
});

export default logger;
