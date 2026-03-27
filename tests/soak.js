import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    soakTraffic: {
      executor: 'constant-vus',
      vus: 40,
      duration: '30m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200'],
  },
};

const BASE_URL = 'https://g4z-cup.ru';

const pages = [
  { path: '/', pause: 1 },
  { path: '/schedule', pause: 1 },
  { path: '/groups', pause: 1 },
  { path: '/playoff', pause: 1 },
  { path: '/teams', pause: 1 },
  { path: '/matches/1', pause: 2 },
  { path: '/matches/4', pause: 2 },
  { path: '/matches/2', pause: 2 },
  { path: '/teams/mid-destroyers', pause: 2 },
];

export default function () {
  const page = pages[Math.floor(Math.random() * pages.length)];

  const res = http.get(`${BASE_URL}${page.path}`);

  check(res, {
    [`${page.path} status 200`]: (r) => r.status === 200,
  });

  sleep(page.pause);
}