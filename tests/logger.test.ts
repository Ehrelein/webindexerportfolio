import logger from "../src/logger";

describe("logger", () => {
  test("exports a pino logger", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  test("has correct level", () => {
    expect(logger.level).toBe("info");
  });

  test("does not throw on logging", () => {
    expect(() => logger.info({ test: true }, "test message")).not.toThrow();
    expect(() => logger.error({ err: "test" }, "error message")).not.toThrow();
    expect(() => logger.warn("warn message")).not.toThrow();
  });
});
