import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 10 },
    { duration: "30s", target: 30 },
    { duration: "10s", target: 5 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://45.77.23.140:3000";
const QUERIES = ["python", "javascript", "machine learning", "history", "physics", "web", "database", "algorithm"];

export default function () {
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const res = http.get(`${BASE_URL}/api/search?q=${q}`);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "has results field": (r) => JSON.parse(r.body).results !== undefined,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });
  sleep(0.2);
}
