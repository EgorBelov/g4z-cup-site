import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // home: {
    //   executor: 'constant-vus',
    //   exec: 'homePage',
    //   vus: 50,
    //   duration: '1m',
    // },
    // schedule: {
    //   executor: 'constant-vus',
    //   exec: 'schedulePage',
    //   vus: 50,
    //   duration: '1m',
    //   startTime: '1m10s',
    // },
    // groups: {
    //   executor: 'constant-vus',
    //   exec: 'groupsPage',
    //   vus: 50,
    //   duration: '1m',
    //   startTime: '2m20s',
    // },
    // playoff: {
    //   executor: 'constant-vus',
    //   exec: 'playoffPage',
    //   vus: 50,
    //   duration: '1m',
    //   startTime: '3m30s',
    // },
    // teams: {
    //   executor: 'constant-vus',
    //   exec: 'teamsPage',
    //   vus: 50,
    //   duration: '1m',
    //   startTime: '4m40s',
    // },
    matchDetails1: {
      executor: 'constant-vus',
      exec: 'matchPage1',
      vus: 50,
      duration: '1m',
      
    },
      matchDetails2: {
      executor: 'constant-vus',
      exec: 'matchPage2',
      vus: 50,
      duration: '1m',
      startTime: '1m10s',
    },
      matchDetails3: {
      executor: 'constant-vus',
      exec: 'matchPage3',
      vus: 50,
      duration: '1m',
      startTime: '2m20s',
    },
    // teamDetails: {
    //   executor: 'constant-vus',
    //   exec: 'teamPage',
    //   vus: 50,
    //   duration: '1m',
    //   startTime: '7m00s',
    // },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:home}': ['p(95)<1200'],
    'http_req_duration{scenario:schedule}': ['p(95)<1200'],
    'http_req_duration{scenario:groups}': ['p(95)<1200'],
    'http_req_duration{scenario:playoff}': ['p(95)<1200'],
    'http_req_duration{scenario:teams}': ['p(95)<1200'],
    'http_req_duration{scenario:matchDetails1}': ['p(95)<1200'],
    'http_req_duration{scenario:matchDetails2}': ['p(95)<1200'],
    'http_req_duration{scenario:matchDetails3}': ['p(95)<1200'],
    'http_req_duration{scenario:teamDetails}': ['p(95)<1200'],
  },
};

const BASE_URL = 'https://g4z-cup-site.vercel.app';

function request(path) {
  const res = http.get(`${BASE_URL}${path}`);
  check(res, {
    [`${path} status 200`]: (r) => r.status === 200,
  });
  sleep(1);
}

// export function homePage() {
//   request('/');
// }

// export function schedulePage() {
//   request('/schedule');
// }

// export function groupsPage() {
//   request('/groups');
// }

// export function playoffPage() {
//   request('/playoff');
// }

// export function teamsPage() {
//   request('/teams');
// }

export function matchPage1() {
  request('/matches/1');
}

export function matchPage2() {
  request('/matches/4');
}

export function matchPage3() {
  request('/matches/2');
}

// export function teamPage() {
//   request('/teams/mid-destroyers');
// }