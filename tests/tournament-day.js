import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    tournamentDay: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 80 },
        { duration: '3m', target: 120 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500'],
  },
};

const BASE_URL = 'https://g4z-cup.ru';

const pages = [
  { name: 'home', path: '/', weight: 15 },
  { name: 'schedule', path: '/schedule', weight: 30 },
  { name: 'playoff', path: '/playoff', weight: 15 },
  { name: 'match1', path: '/matches/1', weight: 20 },
  { name: 'match2', path: '/matches/4', weight: 10 },
  { name: 'match3', path: '/matches/2', weight: 10 },
];

function pickPage() {
  const total = pages.reduce((sum, p) => sum + p.weight, 0);
  const rand = Math.random() * total;
  let current = 0;

  for (const page of pages) {
    current += page.weight;
    if (rand < current) return page;
  }

  return pages[0];
}

export default function () {
  const page = pickPage();
  const res = http.get(`${BASE_URL}${page.path}`, {
    tags: { page: page.name },
  });

  check(res, {
    [`${page.path} status 200`]: (r) => r.status === 200,
  });

  sleep(1);
}