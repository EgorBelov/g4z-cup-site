import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    mixedTrafficRamp: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '2m', target: 50 },
        { duration: '2m', target: 75 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200'],
  },
};

const BASE_URL = 'https://g4z-cup.ru';

const pages = [
  { name: 'home', path: '/', weight: 20 },
  { name: 'schedule', path: '/schedule', weight: 15 },
  { name: 'groups', path: '/groups', weight: 15 },
  { name: 'playoff', path: '/playoff', weight: 10 },
  { name: 'teams', path: '/teams', weight: 10 },
  { name: 'match1', path: '/matches/1', weight: 10 },
  { name: 'match2', path: '/matches/4', weight: 7 },
  { name: 'match3', path: '/matches/2', weight: 7 },
  { name: 'teamDetails', path: '/teams/mid-destroyers', weight: 6 },
];

function pickWeightedPage() {
  const totalWeight = pages.reduce((sum, page) => sum + page.weight, 0);
  const random = Math.random() * totalWeight;

  let current = 0;
  for (const page of pages) {
    current += page.weight;
    if (random < current) return page;
  }

  return pages[0];
}

export default function () {
  const page = pickWeightedPage();

  const res = http.get(`${BASE_URL}${page.path}`, {
    tags: { page: page.name },
  });

  check(res, {
    [`${page.path} status 200`]: (r) => r.status === 200,
  });

  sleep(1);
}