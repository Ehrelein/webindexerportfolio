export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details: any;
  public timestamp: string;

  constructor(message: string, code: string, statusCode: number = 500, details: any = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, "DATABASE_ERROR", 503, details);
  }
}

export class FetchError extends AppError {
  public url: string;

  constructor(message: string, url: string, details: any = null) {
    super(message, "FETCH_ERROR", 502, { url, ...details });
    this.url = url;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, "RATE_LIMIT", 429);
  }
}

export class CircuitOpenError extends AppError {
  public service: string;

  constructor(service: string) {
    super(`Circuit breaker open for ${service}`, "CIRCUIT_OPEN", 503, { service });
    this.service = service;
  }
}
