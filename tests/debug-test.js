import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = 'https://g4z-cup-site.vercel.app';

const URLS = [
  '/',
  '/schedule',
  '/groups',
  '/playoff',
  '/teams',
  '/matches/1',
  '/teams/team-1',
];

export default function () {
  for (const path of URLS) {
    const res = http.get(`${BASE_URL}${path}`);

    console.log(
      `${path} -> status=${res.status}, redirected_url=${res.url}`
    );

    check(res, {
      [`${path} status ok`]: (r) => r.status === 200,
    });
  }
}