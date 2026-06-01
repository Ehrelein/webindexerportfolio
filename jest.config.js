module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/*.test.js", "**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/tests/e2e/", "/tests/db-integration.test.js", "/tests/db-integration.test.ts"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coveragePathIgnorePatterns: ["/node_modules/", "/src/html.js"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testTimeout: 15000,
};
