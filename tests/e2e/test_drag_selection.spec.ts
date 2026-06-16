import { test, expect } from '@playwright/test';

test('click after selecting text within the same element', async ({ page }) => {
  await page.setContent(`
    <div id="text1">Some text to select</div>
    <script>
      window.selDuringClick = "NOT_SET";
      document.getElementById('text1').addEventListener('click', () => {
        window.selDuringClick = window.getSelection().toString();
      });
    </script>
  `);

  // Simulate drag selection
  await page.evaluate(() => {
    const el = document.getElementById('text1');
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    // Simulate the click that happens after mouseup
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  const selDuringClick = await page.evaluate(() => window.selDuringClick);
  console.log("selDuringClick:", selDuringClick);
});
