
import http from 'k6/http';
import { sleep, check } from 'k6';
import { options, BASE_URL, SLEEP_DURATION } from './config.js';

export default function() {
  // Simulate user browsing the dashboard
  const dashboardRes = http.get(`${BASE_URL}/dashboard`);
  
  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard time OK': (r) => r.timings.duration < 1000,
  });
  
  sleep(Math.random() * (SLEEP_DURATION.MAX - SLEEP_DURATION.MIN) + SLEEP_DURATION.MIN);
  
  // Simulate fetching stock data
  const stockDataRes = http.get(`${BASE_URL}/api/stock-data`);
  
  check(stockDataRes, {
    'stock data status is 200': (r) => r.status === 200,
    'stock data response time OK': (r) => r.timings.duration < 200,
  });
  
  sleep(Math.random() * (SLEEP_DURATION.MAX - SLEEP_DURATION.MIN) + SLEEP_DURATION.MIN);
  
  // Simulate fetching blog posts
  const blogRes = http.get(`${BASE_URL}/api/blog-posts`);
  
  check(blogRes, {
    'blog posts status is 200': (r) => r.status === 200,
    'blog posts response time OK': (r) => r.timings.duration < 200,
  });
  
  sleep(Math.random() * (SLEEP_DURATION.MAX - SLEEP_DURATION.MIN) + SLEEP_DURATION.MIN);
}
