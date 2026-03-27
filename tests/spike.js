import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    spikeTraffic: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '30s', target: 150 },
        { duration: '1m', target: 150 },
        { duration: '30s', target: 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500'],
  },
};

const BASE_URL = 'https://g4z-cup.ru';

const pages = [
  { name: 'home', path: '/', weight: 20 },
  { name: 'schedule', path: '/schedule', weight: 20 },
  { name: 'groups', path: '/groups', weight: 10 },
  { name: 'playoff', path: '/playoff', weight: 10 },
  { name: 'teams', path: '/teams', weight: 10 },
  { name: 'match1', path: '/matches/1', weight: 12 },
  { name: 'match2', path: '/matches/4', weight: 8 },
  { name: 'match3', path: '/matches/2', weight: 5 },
  { name: 'teamDetails', path: '/teams/mid-destroyers', weight: 5 },
];

function pickWeightedPage() {
  const total = pages.reduce((sum, p) => sum + p.weight, 0);
  const rand = Math.random() * total;
  let acc = 0;

  for (const page of pages) {
    acc += page.weight;
    if (rand < acc) return page;
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