import logger from "./logger";
import { CircuitBreakerOptions, CircuitBreakerStatus, RetryOptions } from "./types";

const STATES = { CLOSED: "CLOSED", OPEN: "OPEN", HALF_OPEN: "HALF_OPEN" } as const;

type State = typeof STATES[keyof typeof STATES];

class CircuitBreaker {
  name: string;
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMax: number;
  monitorInterval: number;

  state: State;
  failureCount: number;
  successCount: number;
  halfOpenAttempts: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  _monitor: ReturnType<typeof setInterval>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.name = options.name || "default";
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.halfOpenMax = options.halfOpenMax || 3;
    this.monitorInterval = options.monitorInterval || 10000;

    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();

    this._monitor = setInterval(() => this._checkState(), this.monitorInterval);
  }

  get currentState(): State {
    if (this.state === STATES.OPEN) {
      if (Date.now() - this.lastFailureTime! >= this.resetTimeout) {
        this._transition(STATES.HALF_OPEN);
      }
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T> | T, fallback?: (err?: Error) => T | Promise<T>): Promise<T> {
    if (this.currentState === STATES.OPEN) {
      logger.warn({ circuit: this.name, state: this.state }, "Circuit is OPEN, rejecting call");
      if (fallback) return fallback();
      throw new Error(`Circuit breaker '${this.name}' is OPEN`);
    }

    if (this.state === STATES.HALF_OPEN) {
      if (this.halfOpenAttempts >= this.halfOpenMax) {
        this._transition(STATES.OPEN);
        if (fallback) return fallback();
        throw new Error(`Circuit breaker '${this.name}' rejected during HALF_OPEN`);
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      if (fallback) return fallback(err as Error);
      throw err;
    }
  }

  _onSuccess(): void {
    if (this.state === STATES.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenMax) {
        this._transition(STATES.CLOSED);
      }
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  _onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === STATES.HALF_OPEN) {
      this._transition(STATES.OPEN);
    } else if (this.failureCount >= this.failureThreshold) {
      this._transition(STATES.OPEN);
    }
  }

  _transition(newState: State): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === STATES.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      this.halfOpenAttempts = 0;
    } else if (newState === STATES.HALF_OPEN) {
      this.halfOpenAttempts = 0;
      this.successCount = 0;
    }

    logger.info({ circuit: this.name, from: oldState, to: newState }, "Circuit state changed");
  }

  _checkState(): void {
    if (this.state === STATES.OPEN) {
      this.currentState;
    }
  }

  getStatus(): CircuitBreakerStatus {
    return {
      name: this.name,
      state: this.currentState,
      failureCount: this.failureCount,
      lastFailure: this.lastFailureTime,
      uptime: Date.now() - this.lastStateChange,
    };
  }

  destroy(): void {
    clearInterval(this._monitor);
  }
}

class RetryStrategy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  factor: number;
  jitter: boolean;

  constructor(options: RetryOptions = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.factor = options.factor || 2;
    this.jitter = options.jitter !== false;
  }

  async execute<T>(fn: (attempt: number) => Promise<T> | T): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries) {
          const delay = this._calculateDelay(attempt);
          logger.debug({ attempt, delay, error: (err as Error).message }, "Retry attempt");
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  _calculateDelay(attempt: number): number {
    let delay = this.baseDelay * Math.pow(this.factor, attempt);
    delay = Math.min(delay, this.maxDelay);
    if (this.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    return Math.floor(delay);
  }
}

const breakers = new Map<string, CircuitBreaker>();

function getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker({ name, ...options }));
  }
  return breakers.get(name)!;
}

function getAllBreakers(): CircuitBreakerStatus[] {
  return [...breakers.values()].map(b => b.getStatus());
}

export { CircuitBreaker, RetryStrategy, getBreaker, getAllBreakers, STATES };
