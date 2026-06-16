import { test, expect } from '@playwright/test';

test('click after selection event order', async ({ page }) => {
  await page.setContent(`
    <div id="text1">Some text to select</div>
    <div id="btn">Click me</div>
    <script>
      window.selDuringClick = "NOT_SET";
      document.getElementById('btn').addEventListener('click', () => {
        window.selDuringClick = window.getSelection().toString();
      });
    </script>
  `);

  // Select text
  await page.evaluate(() => {
    const el = document.getElementById('text1');
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  // Verify it is selected
  let sel = await page.evaluate(() => window.getSelection().toString());
  expect(sel).toBe('Some text to select');

  // Click the button
  await page.locator('#btn').click();

  const selDuringClick = await page.evaluate(() => window.selDuringClick);
  console.log("selDuringClick:", selDuringClick);
});
