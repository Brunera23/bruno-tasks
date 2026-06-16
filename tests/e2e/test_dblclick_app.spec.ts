import { test, expect } from '@playwright/test';

test('Double click text selection is broken by the fix', async ({ page }) => {
    // Navigate to the local index.html
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html');
    
    // Bypass Firebase login and initialize app state
    await page.evaluate(() => {
        const ls = document.getElementById('loginScreen');
        if (ls) ls.style.display = 'none';
        if (typeof (window as any).showApp === 'function') (window as any).showApp();
        
        (window as any).tasks = [{
            id: 'task-1',
            title: 'Doubleclickthisword',
            status: 'todo',
            project: 'bruno',
            category: 'manual',
            priority: 'media'
        }];
        if (typeof (window as any).render === 'function') (window as any).render();
    });

    // Wait for render
    await page.waitForTimeout(100);

    // Double click the title
    const title = page.locator('.item-title').first();
    await title.dblclick();

    // The modal will be open, which means double-click selection failed to stay on the item!
    // We expect it to be true because it's a bug.
    const isModalOpen = await page.evaluate(() => document.body.classList.contains('modal-open'));
    expect(isModalOpen).toBe(true);
});
