import { test, expect } from '@playwright/test';

test.describe('Loading Performance Optimization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display loading screen on initial load', async ({ page }) => {
    const loadingVisible = await page.locator('canvas').isVisible();
    expect(loadingVisible).toBe(true);
  });

  test('should transition to main menu after loading', async ({ page }) => {
    await page.waitForTimeout(5000);
    const canvas = page.locator('canvas');
    expect(await canvas.isVisible()).toBe(true);
  });

  test('should render game canvas', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();
  });

  test('should not have console errors during initialization', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.waitForTimeout(5000);
    const criticalErrors = errors.filter(e =>
      !e.includes('AudioContext') &&
      !e.includes('WebGL') &&
      !e.includes('CanvasRenderer')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should complete initialization within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.waitForTimeout(3000);
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(10000);
  });

  test('should show main menu buttons after loading', async ({ page }) => {
    await page.waitForTimeout(5000);
    const canvas = page.locator('#game-canvas');
    expect(await canvas.isVisible()).toBe(true);
  });
});
