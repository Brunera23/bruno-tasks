import { test, expect } from '@playwright/test';

test('Double click to select text triggers first click before selection', async ({ page }) => {
    await page.setContent(`
        <div id="target" style="padding: 20px;">Select this word</div>
        <script>
            let clickCount = 0;
            let selectionAtClick = [];
            document.getElementById('target').addEventListener('click', () => {
                clickCount++;
                selectionAtClick.push(window.getSelection().toString().length);
            });
            window.getClickData = () => ({ clickCount, selectionAtClick });
        </script>
    `);

    // Perform double click
    await page.locator('#target').dblclick();

    // Check what clicks were fired and what the selection was
    const data = await page.evaluate(() => window.getClickData());
    console.log("Click data:", data);
});
