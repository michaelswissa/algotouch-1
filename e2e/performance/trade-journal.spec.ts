
import { test, expect } from '@playwright/test';

test.describe('Trade Journal Performance Tests', () => {
  test('should load and submit questionnaire within performance budget', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await page.waitForURL('**/dashboard');
    
    // Navigate to trade journal
    const navigationStart = Date.now();
    await page.goto('/trade-journal');
    
    // Wait for questionnaire to be visible
    await page.waitForSelector('[data-testid="questionnaire-form"]', { state: 'visible' });
    const navigationTime = Date.now() - navigationStart;
    
    expect(navigationTime).toBeLessThan(1500); // Page loads in under 1.5 seconds
    
    // Start measuring form interaction performance
    await page.evaluate(() => {
      window.performance.mark('form-interaction-start');
    });
    
    // Fill out the questionnaire
    await page.click('[data-testid="emotion-button-confidence"]');
    await page.fill('[data-testid="intensity-input"]', '4');
    await page.click('[data-testid="next-button"]');
    
    await page.fill('[data-testid="market-surprise-input"]', 'Unexpected news');
    await page.click('[data-testid="next-button"]');
    
    // Continue filling the form
    await page.click('[data-testid="intervention-checkbox-stick_to_plan"]');
    await page.click('[data-testid="next-button"]');
    
    // Complete and submit
    await page.fill('[data-testid="insight-textarea"]', 'Performance test insight');
    await page.click('[data-testid="submit-button"]');
    
    // Mark end of form interaction
    await page.evaluate(() => {
      window.performance.mark('form-interaction-end');
      window.performance.measure('form-interaction', 'form-interaction-start', 'form-interaction-end');
    });
    
    // Check form interaction time
    const interactionTime = await page.evaluate(() => {
      const measure = window.performance.getEntriesByName('form-interaction')[0];
      return measure ? measure.duration : null;
    });
    
    expect(interactionTime).toBeLessThan(10000); // Form interaction completes in under 10 seconds
    
    // Check results rendering time
    await page.waitForSelector('[data-testid="questionnaire-results"]');
    const resultsLoadStart = Date.now();
    await page.waitForSelector('[data-testid="metrics-overview"]', { state: 'visible' });
    const resultsLoadTime = Date.now() - resultsLoadStart;
    
    expect(resultsLoadTime).toBeLessThan(500); // Results load in under 500ms
  });
});
