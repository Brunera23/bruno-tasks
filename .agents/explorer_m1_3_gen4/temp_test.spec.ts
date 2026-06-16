import { test, expect } from '@playwright/test';

test('diagnose visibility', async ({ page }) => {
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html');
    await page.waitForTimeout(1000);
    const loginVisible = await page.evaluate(() => {
        const ls = document.getElementById('loginScreen');
        return ls ? window.getComputedStyle(ls).display !== 'none' : false;
    });
    console.log('Login visible:', loginVisible);
    
    // forcefully hide it
    await page.evaluate(() => {
        const ls = document.getElementById('loginScreen');
        if (ls) ls.style.display = 'none';
        
        // hide overlay if any
        const ov = document.getElementById('ov');
        if (ov) ov.style.display = 'none';
    });
    
    // Now try to click
    const itemBody = page.locator('.item-body').first();
    const isVisible = await itemBody.isVisible();
    console.log('item-body visible:', isVisible);
});
