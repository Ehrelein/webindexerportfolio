import { CircuitBreaker, RetryStrategy, STATES } from "../src/circuit";
import { AppError, DatabaseError, FetchError, CircuitOpenError } from "../src/errors";

interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenMax?: number;
  monitorInterval?: number;
}

interface RetryStrategyOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  factor?: number;
  jitter?: boolean;
}

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker & {
    currentState: string;
    failureCount: number;
    destroy: () => void;
    execute: <T>(fn: () => Promise<T>, fallback?: (err?: Error) => T) => Promise<T>;
    getStatus: () => { name: string; state: string; failureCount: number; lastFailure: number | null; uptime: number };
  };

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: "test",
      failureThreshold: 3,
      resetTimeout: 1000,
      halfOpenMax: 2,
    } as CircuitBreakerOptions) as typeof breaker;
  });

  afterEach(() => { breaker.destroy(); });

  test("starts in CLOSED state", () => {
    expect(breaker.currentState).toBe(STATES.CLOSED);
  });

  test("transitions to OPEN after threshold failures", async () => {
    const failingFn = jest.fn().mockRejectedValue(new Error("fail"));

    for (let i = 0; i < 3; i++) {
      await breaker.execute(failingFn).catch(() => {});
    }
    expect(breaker.currentState).toBe(STATES.OPEN);
  });

  test("rejects calls when OPEN", async () => {
    const failingFn = jest.fn().mockRejectedValue(new Error("fail"));

    for (let i = 0; i < 3; i++) {
      await breaker.execute(failingFn).catch(() => {});
    }

    const okFn = jest.fn().mockResolvedValue("ok");
    await expect(breaker.execute(okFn)).rejects.toThrow("OPEN");
    expect(okFn).not.toHaveBeenCalled();
  });

  test("uses fallback when OPEN", async () => {
    const failingFn = jest.fn().mockRejectedValue(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await breaker.execute(failingFn).catch(() => {});
    }

    const result = await breaker.execute(
      jest.fn().mockResolvedValue("ok"),
      () => "fallback"
    );
    expect(result).toBe("fallback");
  });

  test("transitions to HALF_OPEN after reset timeout", async () => {
    const failingFn = jest.fn().mockRejectedValue(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await breaker.execute(failingFn).catch(() => {});
    }

    await new Promise<void>((r) => setTimeout(r, 1100));
    expect(breaker.currentState).toBe(STATES.HALF_OPEN);
  });

  test("transitions to CLOSED on success in HALF_OPEN", async () => {
    const failingFn = jest.fn().mockRejectedValue(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await breaker.execute(failingFn).catch(() => {});
    }

    await new Promise<void>((r) => setTimeout(r, 1100));
    const okFn = jest.fn().mockResolvedValue("ok");
    await breaker.execute(okFn);
    await breaker.execute(okFn);
    expect(breaker.currentState).toBe(STATES.CLOSED);
  });

  test("resets failure count on success", async () => {
    const okFn = jest.fn().mockResolvedValue("ok");
    const failFn = jest.fn().mockRejectedValue(new Error("fail"));

    await breaker.execute(failFn).catch(() => {});
    await breaker.execute(failFn).catch(() => {});
    expect(breaker.failureCount).toBe(2);

    await breaker.execute(okFn);
    expect(breaker.failureCount).toBe(1);
  });

  test("getStatus returns correct info", () => {
    const status = breaker.getStatus();
    expect(status.name).toBe("test");
    expect(status.state).toBe(STATES.CLOSED);
    expect(status.failureCount).toBe(0);
  });
});

describe("RetryStrategy", () => {
  test("retries on failure", async () => {
    const retry = new RetryStrategy({ maxRetries: 2, baseDelay: 10, jitter: false } as RetryStrategyOptions);
    let attempts = 0;
    const result = await retry.execute(async () => {
      attempts++;
      if (attempts < 3) throw new Error("not yet");
      return "done";
    });
    expect(result).toBe("done");
    expect(attempts).toBe(3);
  });

  test("throws after max retries", async () => {
    const retry = new RetryStrategy({ maxRetries: 2, baseDelay: 10, jitter: false } as RetryStrategyOptions);
    await expect(
      retry.execute(async () => { throw new Error("always fail"); })
    ).rejects.toThrow("always fail");
  });

  test("respects jitter", async () => {
    const retry = new RetryStrategy({ maxRetries: 1, baseDelay: 100, jitter: true } as RetryStrategyOptions);
    const delays: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        await retry.execute(async () => { throw new Error("fail"); });
      } catch {}
      delays.push(Date.now() - start);
    }
    const unique = new Set(delays);
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe("Error classes", () => {
  test("AppError has correct properties", () => {
    const err = new AppError("test", "TEST_CODE", 400);
    expect(err.message).toBe("test");
    expect(err.code).toBe("TEST_CODE");
    expect(err.statusCode).toBe(400);
    expect(err.toJSON()).toHaveProperty("error", "test");
  });

  test("DatabaseError extends AppError", () => {
    const err = new DatabaseError("db fail");
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("DATABASE_ERROR");
    expect(err.statusCode).toBe(503);
  });

  test("FetchError includes URL", () => {
    const err = new FetchError("timeout", "http://example.com");
    expect(err.url).toBe("http://example.com");
    expect(err.code).toBe("FETCH_ERROR");
  });

  test("CircuitOpenError includes service", () => {
    const err = new CircuitOpenError("http-fetch");
    expect(err.service).toBe("http-fetch");
    expect(err.code).toBe("CIRCUIT_OPEN");
  });
});
