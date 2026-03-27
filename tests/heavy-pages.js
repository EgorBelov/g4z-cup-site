import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    heavyPages: {
      executor: 'constant-vus',
      vus: 80,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{page:match1}': ['p(95)<1500'],
    'http_req_duration{page:match2}': ['p(95)<1500'],
    'http_req_duration{page:match3}': ['p(95)<1500'],
    'http_req_duration{page:teamDetails}': ['p(95)<1500'],
  },
};

const BASE_URL = 'https://g4z-cup.ru';

const pages = [
  { name: 'match1', path: '/matches/1' },
  { name: 'match2', path: '/matches/4' },
  { name: 'match3', path: '/matches/2' },
  { name: 'teamDetails', path: '/teams/mid-destroyers' },
];

export default function () {
  const page = pages[Math.floor(Math.random() * pages.length)];

  const res = http.get(`${BASE_URL}${page.path}`, {
    tags: { page: page.name },
  });

  check(res, {
    [`${page.path} status 200`]: (r) => r.status === 200,
  });

  sleep(1);
}