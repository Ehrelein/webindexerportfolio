import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 10 },
    { duration: "30s", target: 50 },
    { duration: "10s", target: 10 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<200", "p(99)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://45.77.23.140:3000";

export default function () {
  const res = http.get(`${BASE_URL}/api/stats`);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "has total field": (r) => JSON.parse(r.body).total !== undefined,
    "response time < 200ms": (r) => r.timings.duration < 200,
  });
  sleep(0.1);
}
