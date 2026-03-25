import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = 'https://g4z-cup-site.vercel.app';

export default function () {
  const pages = [
    '/',
    '/schedule',
    '/groups',
    '/playoff',
    '/teams',
  ];

  const page = pages[Math.floor(Math.random() * pages.length)];
  const res = http.get(`${BASE_URL}${page}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}