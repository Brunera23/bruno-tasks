import { test, expect } from '@playwright/test';

test.describe('Task Deselection Bugfix Empirical Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the local page
    await page.goto('http://127.0.0.1:8080/index.html', { waitUntil: 'networkidle' });
  });

  test('Hypothesis 1: scroll jumps due to smooth scrolling and modal close', async ({ page }) => {
    // 1. Create a lot of tasks to make the page scrollable
    for (let i = 0; i < 20; i++) {
      await page.evaluate((idx) => {
        // @ts-ignore
        tasks.push({
          id: 'test_task_' + idx,
          title: 'Test Task ' + idx,
          status: 'todo',
          category: 'casa',
          project: 'bruno',
          assignedTo: 'bruno',
          priority: 'media',
          date: '2026-06-05',
          createdAt: Date.now() - idx * 1000,
          updatedAt: Date.now() - idx * 1000
        });
      }, i);
    }
    await page.evaluate(() => {
      // @ts-ignore
      sT(); render();
    });

    // Scroll down to the middle of the list
    await page.evaluate(() => window.scrollTo(0, 500));
    const initialScrollY = await page.evaluate(() => window.scrollY);

    // 2. Open a task modal
    await page.click('.item[style*="--i:10"] .item-body');
    await expect(page.locator('#modal')).toHaveClass(/open/);

    // Ensure the body has stored the scrollY
    const storedScrollY = await page.evaluate(() => document.body.dataset.scrollY);
    expect(parseInt(storedScrollY || '0')).toBe(initialScrollY);

    // 3. Click outside the modal to close it quickly
    await page.click('#ov', { position: { x: 10, y: 10 } });
    await expect(page.locator('#modal')).not.toHaveClass(/open/);

    // Verify scroll position is instantly restored and scroll-behavior was temporarily auto
    // Because scroll restoration uses setTimeout(10), we wait a bit
    await page.waitForTimeout(50);
    const postScrollY = await page.evaluate(() => window.scrollY);
    
    // Expect scroll to be exactly what it was before opening
    expect(postScrollY).toBe(initialScrollY);

    // 4. Quickly click another task (before the animation could have finished in the old code)
    await page.click('.item[style*="--i:12"] .item-body');
    await expect(page.locator('#modal')).toHaveClass(/open/);

    // Verify it didn't capture a mid-animation scroll position
    const secondStoredScrollY = await page.evaluate(() => document.body.dataset.scrollY);
    expect(parseInt(secondStoredScrollY || '0')).toBe(initialScrollY);
  });

  test('Hypothesis 2: Click on task body opens edit modal (touch device bypass)', async ({ page }) => {
    // Simulate touch/mobile device
    await page.evaluate(() => {
      // @ts-ignore
      tasks.push({
        id: 'touch_task_1',
        title: 'Touch Task',
        status: 'todo',
        category: 'casa',
        project: 'bruno',
        assignedTo: 'bruno',
        priority: 'media',
        date: '2026-06-05',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      // @ts-ignore
      sT(); render();
    });

    // Tap the task body directly (without hovering to show the edit button)
    await page.tap('.item-body');
    
    // The modal should open
    await expect(page.locator('#modal')).toHaveClass(/open/);
    
    // The task title should be in the input field
    const titleVal = await page.inputValue('#fT');
    expect(titleVal).toBe('Touch Task');
  });
});
