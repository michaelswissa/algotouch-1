
import http from 'k6/http';
import { sleep, check } from 'k6';
import { options, BASE_URL, SLEEP_DURATION } from './config.js';

export default function() {
  // Login flow test
  const loginPayload = JSON.stringify({
    email: 'performance_test@example.com',
    password: 'test_password',
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Simulate login attempt
  const loginRes = http.post(
    `${BASE_URL}/api/login`,
    loginPayload,
    loginParams
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => r.json('token') !== undefined,
    'login time OK': (r) => r.timings.duration < 300,
  });

  sleep(Math.random() * (SLEEP_DURATION.MAX - SLEEP_DURATION.MIN) + SLEEP_DURATION.MIN);

  // Get user data with auth token
  const authToken = loginRes.json('token');
  
  if (authToken) {
    const authParams = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    };

    // Simulate fetching user profile with auth token
    const profileRes = http.get(
      `${BASE_URL}/api/profile`,
      authParams
    );

    check(profileRes, {
      'profile status is 200': (r) => r.status === 200,
      'profile time OK': (r) => r.timings.duration < 200,
    });
  }

  sleep(Math.random() * (SLEEP_DURATION.MAX - SLEEP_DURATION.MIN) + SLEEP_DURATION.MIN);
}
