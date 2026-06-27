module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/db-integration.test.ts"],
  testTimeout: 15000,
  collectCoverage: false,
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};
