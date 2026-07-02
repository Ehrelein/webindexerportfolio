import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 20 },
    { duration: "30s", target: 100 },
    { duration: "10s", target: 20 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<300", "p(99)<600"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://45.77.23.140:3000";

export default function () {
  const res = http.get(`${BASE_URL}/`, {
    headers: { "Accept-Encoding": "gzip" },
  });
  check(res, {
    "status is 200": (r) => r.status === 200,
    "content-type html": (r) => r.headers["Content-Type"]?.includes("text/html"),
    "response time < 300ms": (r) => r.timings.duration < 300,
  });
  sleep(0.5);
}
