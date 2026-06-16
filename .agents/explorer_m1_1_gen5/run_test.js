const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html');
  
  await page.evaluate(() => {
      const ls = document.getElementById('loginScreen');
      if (ls) ls.style.display = 'none';
      if (typeof window.showApp === 'function') window.showApp();
      
      window.tasks = [{
          id: 'task-1',
          title: 'Double click this specific word',
          status: 'todo',
          project: 'bruno',
          category: 'manual',
          priority: 'media'
      }];
      if (typeof window.render === 'function') window.render();
  });

  let editCalled = 0;
  await page.exposeFunction('markEditCalled', (id) => {
      editCalled++;
  });

  await page.evaluate(() => {
      const originalEdit = window.edit;
      window.edit = (id) => {
          window.markEditCalled(id);
          if (originalEdit) originalEdit(id);
      };
  });

  await page.waitForTimeout(100);

  const titleLocator = page.locator('.item-title').first();
  await titleLocator.dblclick();

  const selectedText = await page.evaluate(() => window.getSelection()?.toString() || '');
  console.log('Selected text:', selectedText);

  await page.waitForTimeout(300);

  console.log('Edit called:', editCalled);
  if (editCalled > 0) {
      console.log('TEST FAILED: edit was called');
      process.exit(1);
  } else if (selectedText.length === 0) {
      console.log('TEST FAILED: nothing was selected');
      process.exit(1);
  } else {
      console.log('TEST PASSED');
      process.exit(0);
  }
})();
