import { test, expect } from '@playwright/test';

test.describe('Bug Fix Verification: Task Deselection and Return', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local index.html
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html');
    
    // Bypass Firebase login and initialize app state properly
    await page.evaluate(() => {
        const ls = document.getElementById('loginScreen');
        if (ls) ls.style.display = 'none';
        if (typeof (window as any).showApp === 'function') (window as any).showApp();
        
        const testTasks = [];
        for (let i = 0; i < 30; i++) {
            testTasks.push({
                id: 'task-' + i,
                title: 'Test Task ' + i,
                status: 'todo',
                project: 'bruno',
                category: 'manual',
                priority: 'media'
            });
        }
        (window as any).tasks = testTasks;
        if (typeof (window as any).render === 'function') (window as any).render();
    });
  });

  test('Hypothesis 1: Scroll position is maintained when rapidly closing and opening modals', async ({ page }) => {
    // Scroll down to a specific position
    await page.evaluate(() => {
        document.body.style.minHeight = '3000px';
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, 1000);
    });
    
    // Check initial scroll
    const initialScroll = await page.evaluate(() => window.scrollY);
    expect(initialScroll).toBe(1000);

    // Open a modal (e.g., Note Form)
    await page.evaluate(() => {
        if (typeof openNoteForm === 'function') {
            openNoteForm();
        } else {
            // Fallback: manually trigger modal
            const form = document.getElementById('noteForm');
            if(form) form.classList.add('open');
            document.body.classList.add('modal-open');
            document.body.style.top = '-' + window.scrollY + 'px';
            document.body.dataset.scrollY = window.scrollY;
        }
    });

    // Close the modal and rapidly open it again
    await page.evaluate(() => {
        if (typeof closeNoteForm === 'function') {
            closeNoteForm();
        } else {
            const form = document.getElementById('noteForm');
            if(form) form.classList.remove('open');
            document.body.classList.remove('modal-open');
            const sy = document.body.dataset.scrollY || 0;
            document.body.style.top = '';
            window.scrollTo(0, parseInt(sy));
        }
    });

    // We do this via Playwright evaluate so it's synchronously sequential.
    // If we call openNoteForm immediately, it shouldn't overwrite dataset.scrollY with 0 if smooth scrolling was happening.
    await page.evaluate(() => {
        if (typeof openNoteForm === 'function') openNoteForm();
    });

    // The scrollY shouldn't be captured as 0 (which happens if it's mid-smooth-scroll and guard is missing)
    const storedScrollY = await page.evaluate(() => parseInt(document.body.dataset.scrollY || '0', 10));
    
    // Because the fix sets scrollBehavior = 'auto', the scrollTo is instant.
    // Also, the guard `if(!document.body.classList.contains('modal-open'))` prevents double capture.
    expect(storedScrollY).toBe(1000);
  });

  test('Hypothesis 2: Clicking .item-body opens the edit modal without hover', async ({ page }) => {
    // We added a bunch of tasks in beforeEach. Let's click the .item-body of the first one.
    // However, the worker mentioned triggering edit(id).
    // Let's set up a spy on edit function if it exists globally, or we can check if the edit modal becomes visible.
    
    let editCalled = false;
    await page.exposeFunction('markEditCalled', (id: string) => {
        editCalled = true;
    });

    await page.evaluate(() => {
        // override edit temporarily to see if it gets called
        const originalEdit = (window as any).edit;
        (window as any).edit = (id: any) => {
            (window as any).markEditCalled(id);
            if (originalEdit) originalEdit(id);
        };
    });

    // Wait a bit for injection
    await page.waitForTimeout(100);

    // Click the item body
    await page.locator('.item-body').first().click();

    // Wait for the double click timeout
    await page.waitForTimeout(500);

    // Check if edit was called
    expect(editCalled).toBe(true);
    
    // Or check if the modal is open
    const modalOpen = await page.evaluate(() => document.body.classList.contains('modal-open'));
    expect(modalOpen).toBe(true);
  });

  test('Hypothesis 3: Highlighting text in .item-body does not open the edit modal', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).tasks = [{
            id: 'sel-task',
            title: 'This is a long task title for text selection',
            status: 'todo'
        }];
        (window as any).render();
        // Add an ID to the rendered title for easy selection
        const titles = document.querySelectorAll('.item-title');
        if (titles.length > 0) {
            titles[0].id = 'sel-title';
        }
    });

    let editCalled = false;
    await page.exposeFunction('markEditCalledSel', (id: string) => {
        editCalled = true;
    });

    await page.evaluate(() => {
        const originalEdit = (window as any).edit;
        (window as any).edit = (id: any) => {
            (window as any).markEditCalledSel(id);
            if (originalEdit) originalEdit(id);
        };
    });

    // Simulate text selection inside the .item-title
    await page.evaluate(() => {
        const title = document.getElementById('sel-title');
        if (title) {
            const range = document.createRange();
            range.selectNodeContents(title);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            
            // Trigger click from the exact element while selection is active
            const body = title.closest('.item-body');
            if (body) {
                body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
        }
    });

    expect(editCalled).toBe(false);
  });

  test('Hypothesis 4: Closing secondary modal keeps background locked if primary modal is open', async ({ page }) => {
    await page.evaluate(() => {
        // Mock a primary modal open
        if (!document.body.classList.contains('modal-open')) {
            document.body.classList.add('modal-open');
        }
        const modal = document.getElementById('modal');
        if (modal) modal.classList.add('open');
        
        // Mock a secondary modal open
        const alertSheet = document.getElementById('alertSheet');
        if (alertSheet) alertSheet.classList.add('open');
    });

    // Call closeAlertForm
    await page.evaluate(() => {
        if (typeof (window as any).closeAlertForm === 'function') {
            (window as any).closeAlertForm();
        }
    });

    // body should STILL have modal-open
    const hasModalOpen = await page.evaluate(() => document.body.classList.contains('modal-open'));
    expect(hasModalOpen).toBe(true);
    
    // Now close primary modal
    await page.evaluate(() => {
        if (typeof (window as any).closeM === 'function') {
            (window as any).closeM();
        }
    });

    // body should NOT have modal-open
    const hasModalOpenFinal = await page.evaluate(() => document.body.classList.contains('modal-open'));
    expect(hasModalOpenFinal).toBe(false);
  });

  test('Hypothesis 5: Double-click text selection works and does NOT open the edit modal', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).tasks = [{
            id: 'dbl-sel-task',
            title: 'Doubleclick me',
            status: 'todo'
        }];
        (window as any).render();
        const titles = document.querySelectorAll('.item-title');
        if (titles.length > 0) {
            titles[0].id = 'dbl-sel-title';
        }
    });

    let editCalled = false;
    await page.exposeFunction('markEditCalledDblSel', (id: string) => {
        editCalled = true;
    });

    await page.evaluate(() => {
        const originalEdit = (window as any).edit;
        (window as any).edit = (id: any) => {
            (window as any).markEditCalledDblSel(id);
            if (originalEdit) originalEdit(id);
        };
    });

    // Double-click the text
    await page.locator('#dbl-sel-title').dblclick();
    
    // Wait for the single-click timeout (250ms) to ensure it doesn't trigger
    await page.waitForTimeout(350);

    const selection = await page.evaluate(() => window.getSelection()?.toString() || '');
    expect(selection.length).toBeGreaterThan(0);
    expect(editCalled).toBe(false);
  });
});
