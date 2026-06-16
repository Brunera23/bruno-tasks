import { test, expect } from '@playwright/test';

test('Selection is cleared on mousedown before click', async ({ page }) => {
    await page.setContent(`
        <div id="target">Click me</div>
        <div id="text">Select this text</div>
        <script>
            let selectionAtClick = -1;
            document.getElementById('target').addEventListener('click', () => {
                selectionAtClick = window.getSelection().toString().length;
            });
            window.selectionAtClick = () => selectionAtClick;
        </script>
    `);

    // Select text
    const textEl = await page.locator('#text');
    await textEl.evaluate(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });

    // Verify selection is present
    const selLen = await page.evaluate(() => window.getSelection().toString().length);
    expect(selLen).toBeGreaterThan(0);

    // Click target
    await page.locator('#target').click();

    // Check selection length at click time
    const clickLen = await page.evaluate(() => window.selectionAtClick());
    console.log("Selection length at click:", clickLen);
});
