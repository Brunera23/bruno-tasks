import { test, expect } from '@playwright/test';

test('Hypothesis 3 diagnose with login screen', async ({ page }) => {
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html');
    await page.waitForTimeout(500);
    
    // Inject directly without rendering to mimic original test
    await page.evaluate(() => {
        const list = document.getElementById('list');
        if (list) {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <div class="item-row">
                    <div class="ck-wrap"><button class="ck" data-id="sel-task"></button></div>
                    <div class="item-body">
                        <div class="item-title" id="sel-title">This is a long task title for text selection</div>
                    </div>
                </div>
            `;
            list.appendChild(item);
        }
    });

    let editCalled = false;
    await page.exposeFunction('markEditCalledSel', () => { editCalled = true; });

    await page.evaluate(() => {
        const originalEdit = (window as any).edit;
        (window as any).edit = (id: any) => {
            (window as any).markEditCalledSel();
            if (originalEdit) originalEdit(id);
        };
    });

    await page.evaluate(() => {
        const title = document.getElementById('sel-title');
        if (title) {
            const range = document.createRange();
            range.selectNodeContents(title);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            
            console.log('Selection length:', window.getSelection()?.toString().length);
            
            const body = title.closest('.item-body');
            if (body) {
                body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
        }
    });

    console.log('editCalled:', editCalled);
});
