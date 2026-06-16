import { test, expect } from '@playwright/test';

test.describe('Double Click Regression Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html');
    
    await page.evaluate(() => {
        const ls = document.getElementById('loginScreen');
        if (ls) ls.style.display = 'none';
        if (typeof (window as any).showApp === 'function') (window as any).showApp();
        
        (window as any).tasks = [{
            id: 'task-1',
            title: 'Double click this specific word',
            status: 'todo',
            project: 'bruno',
            category: 'manual',
            priority: 'media'
        }];
        if (typeof (window as any).render === 'function') (window as any).render();
    });
  });

  test('Hypothesis 5: Double-clicking text selects it and does NOT open edit modal', async ({ page }) => {
    let editCalled = 0;
    await page.exposeFunction('markEditCalled', (id: string) => {
        editCalled++;
    });

    await page.evaluate(() => {
        const originalEdit = (window as any).edit;
        (window as any).edit = (id: any) => {
            (window as any).markEditCalled(id);
            if (originalEdit) originalEdit(id);
        };
    });

    await page.waitForTimeout(100);

    // Perform double click on the title
    const titleLocator = page.locator('.item-title').first();
    await titleLocator.dblclick();

    // Check if text is selected
    const selectedText = await page.evaluate(() => window.getSelection()?.toString() || '');
    console.log('Selected text:', selectedText);

    // Wait a little bit to see if edit modal triggered
    await page.waitForTimeout(300);

    // Edit should NOT be called
    expect(editCalled).toBe(0);
    expect(selectedText.length).toBeGreaterThan(0);
  });
});
