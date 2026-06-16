import { test, expect } from '@playwright/test';

test.describe('Adversarial Feature 2: Modal & UI State Resilience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('bt-v5', '[]');
      localStorage.setItem('bt-cats', '[]');
      localStorage.setItem('bt-log', '[]');
    });
    
    await page.reload();
    
    await page.addStyleTag({ content: `
      #loginScreen { display: none !important; }
      .shell { display: flex !important; }
      #fab { display: flex !important; }
    ` });

    await page.evaluate(() => {
      (window as any).currentUser = { uid: 'test-uid', displayName: 'Test User' };
      (window as any)._fbReady = false;
      (window as any)._fbInitDone = false;
      
      const modal = document.getElementById('modal');
      if (modal) modal.classList.remove('open');
      document.body.classList.remove('modal-open');
    });

    await page.waitForTimeout(500);
  });

  test('1. Input persistence after cancellation: form should be cleared when modal is closed and reopened', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);

    const testText = 'Unsaved Task Data';
    await page.locator('#fT').fill(testText);
    
    await page.locator('#mCancel').click();
    await expect(page.locator('#modal')).not.toHaveClass(/open/);

    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);

    const currentInputValue = await page.locator('#fT').inputValue();
    expect(currentInputValue).not.toEqual(testText);
    expect(currentInputValue).toEqual('');
  });

  test('2. Input persistence on clicking outside', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);

    const testText = 'Unsaved Task Data 2';
    await page.locator('#fT').fill(testText);
    
    // click outside
    const overlay = page.locator('#ov');
    await overlay.click({ position: { x: 10, y: 10 }, force: true });
    await expect(page.locator('#modal')).not.toHaveClass(/open/);

    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);

    const currentInputValue = await page.locator('#fT').inputValue();
    expect(currentInputValue).toEqual('');
  });

  test('3. Input persistence on Escape key', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);

    const testText = 'Unsaved Task Data 3';
    await page.locator('#fT').fill(testText);
    
    // Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal')).not.toHaveClass(/open/);

    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);

    const currentInputValue = await page.locator('#fT').inputValue();
    expect(currentInputValue).toEqual('');
  });

  test('4. Opening an existing item modal and checking if it pollutes a new task modal', async ({ page }) => {
    // add task 1
    await page.locator('#btnAdd').click();
    await page.locator('#fT').fill('Task 1');
    await page.locator('#modal button[type="submit"]').click();
    await expect(page.locator('#modal')).not.toHaveClass(/open/);
    await page.waitForTimeout(300);
    
    // click on the item to open its modal
    const itemBodies = page.locator('.item-body');
    await itemBodies.nth(0).click();
    await expect(page.locator('#modal')).toHaveClass(/open/);
    
    // modal has "Task 1"
    const currentInputValue = await page.locator('#fT').inputValue();
    expect(currentInputValue).toEqual('Task 1');
    
    // close modal
    await page.locator('#mCancel').click();
    await expect(page.locator('#modal')).not.toHaveClass(/open/);

    // click ADD new task
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);

    // the new task modal should be EMPTY, not polluted with "Task 1"
    const newInputValue = await page.locator('#fT').inputValue();
    expect(newInputValue).toEqual('');
  });
});
