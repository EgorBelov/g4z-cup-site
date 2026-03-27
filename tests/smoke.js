import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
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

export default function () {
  for (const path of pages) {
    const res = http.get(`${BASE_URL}${path}`);

    check(res, {
      [`${path} status 200`]: (r) => r.status === 200,
      [`${path} not too slow`]: (r) => r.timings.duration < 3000,
    });
  }
}