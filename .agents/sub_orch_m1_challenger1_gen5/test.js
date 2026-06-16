const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setContent(`
    <html>
      <body>
        <div id="list">
          <div class="item">
            <div class="ck" data-id="123"></div>
            <div class="item-body">
              <span>This is some task text that we want to select.</span>
            </div>
          </div>
        </div>
        <div id="modal" style="display:none;">MODAL OPEN</div>
        <script>
          let _itemClickTimeout;
          let modalOpenCount = 0;
          function edit(id) {
            document.getElementById('modal').style.display = 'block';
            modalOpenCount++;
            console.log('edit called for', id);
          }
          
          document.getElementById('list').addEventListener('click', e => {
            const b = e.target.closest('.item-body');
            if (b) {
              if (window.getSelection().toString().length > 0) return;
              const item = b.closest('.item');
              if (item) {
                const id = item.querySelector('.ck')?.dataset.id;
                if (id) {
                  e.stopPropagation();
                  if (e.detail === 1) {
                    _itemClickTimeout = setTimeout(() => {
                      if (window.getSelection().toString().length === 0) edit(id);
                    }, 250);
                  } else if (e.detail === 2) {
                    clearTimeout(_itemClickTimeout);
                  }
                  return;
                }
              }
            }
          });
        </script>
      </body>
    </html>
  `);

  let logs = [];
  page.on('console', msg => logs.push(msg.text()));

  // 1. Single click -> should open modal
  const textLocator = page.locator('.item-body span');
  await textLocator.click();
  await page.waitForTimeout(300); // wait for timeout
  
  let isModalVisible = await page.locator('#modal').isVisible();
  console.log('Single click -> modal visible?', isModalVisible);

  // Close modal
  await page.evaluate(() => { 
    document.getElementById('modal').style.display = 'none'; 
  });

  // 2. Double click -> should NOT open modal, text should be selected
  await textLocator.dblclick();
  await page.waitForTimeout(300);

  isModalVisible = await page.locator('#modal').isVisible();
  const selectedText = await page.evaluate(() => window.getSelection().toString());
  console.log('Double click -> modal visible?', isModalVisible);
  console.log('Double click -> selected text:', selectedText);

  // Close modal just in case
  await page.evaluate(() => { 
    document.getElementById('modal').style.display = 'none'; 
  });

  // 3. Rapid clicking (Triple click)
  await textLocator.click({ clickCount: 3 });
  await page.waitForTimeout(300);
  isModalVisible = await page.locator('#modal').isVisible();
  console.log('Triple click -> modal visible?', isModalVisible);

  await browser.close();
})();
