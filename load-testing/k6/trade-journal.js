
import http from 'k6/http';
import { sleep, check } from 'k6';
import { options, BASE_URL, SLEEP_DURATION } from './config.js';

export default function() {
  // Simulate fetching trade journal data
  const journalRes = http.get(`${BASE_URL}/api/trade-journal/entries`);
  
  check(journalRes, {
    'journal entries status is 200': (r) => r.status === 200,
    'journal entries time OK': (r) => r.timings.duration < 300,
  });
  
  sleep(Math.random() * (SLEEP_DURATION.MAX - SLEEP_DURATION.MIN) + SLEEP_DURATION.MIN);
  
  // Simulate submitting a new trade journal entry
  const journalEntryPayload = JSON.stringify({
    emotional: {
      state: 'confidence',
      intensity: 4
    },
    market: {
      surprise: 'none',
      volatility: 3
    },
    insight: 'Performance testing journal entry',
    interventions: ['stick_to_plan'],
    riskManagement: 4,
    confidence: 3
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const submitRes = http.post(
    `${BASE_URL}/api/trade-journal/submit`,
    journalEntryPayload,
    params
  );
  
  check(submitRes, {
    'journal submit status is 200': (r) => r.status === 200 || r.status === 201,
    'journal submit time OK': (r) => r.timings.duration < 500,
  });
  
  sleep(Math.random() * (SLEEP_DURATION.MAX - SLEEP_DURATION.MIN) + SLEEP_DURATION.MIN);
}
