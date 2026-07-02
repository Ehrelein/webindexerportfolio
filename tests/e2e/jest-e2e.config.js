module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests/e2e"],
  testMatch: ["**/*.test.ts"],
  globalSetup: "<rootDir>/tests/e2e/setup.ts",
  globalTeardown: "<rootDir>/tests/e2e/teardown.ts",
  testTimeout: 30000,
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};
