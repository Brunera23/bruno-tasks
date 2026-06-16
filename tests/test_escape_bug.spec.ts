import { test, expect } from '@playwright/test';

test('Escape unfreezes body when secondary modal is closed', async ({ page }) => {
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html');
    
    // Evaluate in page
    const result = await page.evaluate(() => {
        // Mock functions if they are not exposed, but they are global in index.html
        window.openM();
        window.openNoteForm();
        
        // Dispatch Escape
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
        
        // After escape, noteSheet should be closed, but modal should be open.
        const noteOpen = document.getElementById('noteSheet').classList.contains('open');
        const modalOpen = document.getElementById('modal').classList.contains('open');
        const bodyHasModalOpen = document.body.classList.contains('modal-open');
        
        return { noteOpen, modalOpen, bodyHasModalOpen };
    });
    
    console.log(result);
    expect(result.noteOpen).toBe(false);
    expect(result.modalOpen).toBe(true);
    expect(result.bodyHasModalOpen).toBe(true);
});
