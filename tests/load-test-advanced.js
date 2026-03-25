import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  scenarios: {
    fan_journey: {
      executor: 'ramping-vus',
      stages: [
  { duration: '30s', target: 50 },
  { duration: '1m', target: 100 },
  { duration: '1m', target: 200 },
  { duration: '1m', target: 300 },
  { duration: '1m', target: 500 },
  { duration: '30s', target: 0 },
],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200'],
  },
};

const BASE_URL = 'https://g4z-cup-site.vercel.app';

const MATCH_IDS = ['1', '2', '3'];
const TEAM_SLUGS = ['mid-destroyers', 'dire-wolves', 'ancient-guardians'];

export default function () {
  group('landing', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, { 'landing 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('schedule', () => {
    const res = http.get(`${BASE_URL}/schedule`);
    check(res, { 'schedule 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('match details', () => {
    const matchId = MATCH_IDS[Math.floor(Math.random() * MATCH_IDS.length)];
    const res = http.get(`${BASE_URL}/matches/${matchId}`);
    check(res, { 'match 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('team details', () => {
    const teamSlug = TEAM_SLUGS[Math.floor(Math.random() * TEAM_SLUGS.length)];
    const res = http.get(`${BASE_URL}/teams/${teamSlug}`);
    check(res, { 'team 200': (r) => r.status === 200 });
    sleep(1);
  });
}