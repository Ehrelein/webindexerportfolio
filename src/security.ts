import crypto from "crypto";
import helmet from "helmet";
import { Request, Response, NextFunction } from "express";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://unpkg.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
  next();
}

function securityMiddleware(app: any): void {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }));
  app.use(securityHeaders);
  app.use(requestId);
}

function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[<>]/g, "")
    .replace(/['"]/g, "")
    .replace(/[()]/g, "")
    .replace(/[{}]/g, "")
    .replace(/[\[\]]/g, "")
    .replace(/[\\]/g, "")
    .replace(/[;|&$`]/g, "")
    .trim()
    .slice(0, 500);
}

let reqCounter = 0;
function generateRequestId(): string {
  return "r" + (++reqCounter) + "-" + Date.now().toString(36);
}

function requestId(req: Request, res: Response, next: NextFunction): void {
  (req as any).id = req.headers["x-request-id"] || generateRequestId();
  res.setHeader("X-Request-Id", (req as any).id);
  next();
}

export { SECURITY_HEADERS, securityHeaders, sanitizeInput, generateRequestId, requestId, securityMiddleware };
