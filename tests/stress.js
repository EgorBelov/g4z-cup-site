import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    stressTraffic: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 250 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = 'https://g4z-cup.ru';

const pages = [
  '/',
  '/schedule',
  '/groups',
  '/playoff',
  '/teams',
  '/matches/1',
  '/matches/4',
  '/matches/2',
  '/teams/mid-destroyers',
];

function randomPage() {
  return pages[Math.floor(Math.random() * pages.length)];
}

export default function () {
  const path = randomPage();

  const res = http.get(`${BASE_URL}${path}`);
  check(res, {
    [`${path} status ok`]: (r) => r.status === 200,
  });

  sleep(1);
}