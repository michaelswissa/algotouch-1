
import { test, expect } from '@playwright/test';

test.describe('Dashboard Performance Tests', () => {
  test('should load dashboard within performance budget', async ({ page }) => {
    // Start tracking performance metrics
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    // Navigate to dashboard
    const navigationStart = Date.now();
    await page.goto('/dashboard');
    
    // Wait for dashboard components to be visible
    await page.waitForSelector('[data-testid="stock-indices"]', { state: 'visible' });
    await page.waitForSelector('[data-testid="blog-section"]', { state: 'visible' });
    
    const navigationEnd = Date.now();
    const navigationTime = navigationEnd - navigationStart;
    
    // Get performance metrics
    const perfMetrics = await client.send('Performance.getMetrics');
    
    // Calculate metrics
    const domContentLoaded = perfMetrics.metrics.find(m => m.name === 'DOMContentLoaded').value;
    const firstPaint = perfMetrics.metrics.find(m => m.name === 'FirstPaint').value;
    
    // Assert on performance
    expect(navigationTime).toBeLessThan(2000); // Page loads in under 2 seconds
    expect(domContentLoaded).toBeLessThan(1000); // DOM content loaded in under 1 second
    expect(firstPaint).toBeLessThan(800); // First paint in under 800ms
    
    // Verify stock data loads quickly
    const stockDataLoadingStart = Date.now();
    await page.waitForSelector('[data-testid="stock-indices-item"]', { state: 'visible' });
    const stockDataLoadTime = Date.now() - stockDataLoadingStart;
    
    expect(stockDataLoadTime).toBeLessThan(200); // Stock data loads in under 200ms
    
    // Check for layout shifts
    const layoutShifts = await page.evaluate(() => {
      if ('layoutShift' in performance) {
        return performance
          .getEntriesByType('layout-shift')
          .map(entry => entry.value)
          .reduce((sum, value) => sum + value, 0);
      }
      return 0;
    });
    
    expect(layoutShifts).toBeLessThan(0.1); // CLS should be under 0.1
  });
});
