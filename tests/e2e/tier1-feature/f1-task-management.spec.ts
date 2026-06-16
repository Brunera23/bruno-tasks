import { test, expect } from '@playwright/test';

test.describe('Feature 1 - Task Management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.route('**/sw.js*', route => route.abort());
    await page.route('**/*.gstatic.com/**', route => route.abort());

    await page.addInitScript((uid) => {
      window.location.reload = () => {};

      const mockFb = {};
      mockFb.initializeApp = () => {};
      mockFb.firestore = () => {
        const collectionMock = {
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({ tasks: '[{"id":"dummy1","text":"Dummy Task","st":0}]', cats: "[]", log: "[]" })
            }),
            set: async () => {},
            delete: async () => {},
            update: async () => {},
            onSnapshot: (cb) => {
              setTimeout(() => cb({
                exists: true,
                data: () => ({ tasks: '[{"id":"dummy1","text":"Dummy Task","st":0}]', cats: "[]", log: "[]" })
              }), 10);
              return () => {};
            }
          }),
          add: async () => {}
        };
        return {
          enablePersistence: async () => {},
          collection: () => collectionMock
        };
      };
      mockFb.auth = () => ({
        getRedirectResult: async () => ({}),
        signInWithPopup: async () => {},
        signOut: async () => {},
        onAuthStateChanged: (cb) => {
          const fire = () => cb({ uid: uid, displayName: 'Test', email: 't@t.com' });
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fire);
          } else {
            setTimeout(fire, 10);
          }
          return () => {};
        }
      });
      mockFb.messaging = () => ({
        getToken: async () => 'test-token',
        onMessage: () => {}
      });
      mockFb.messaging.isSupported = () => false;
      mockFb.auth.GoogleAuthProvider = function() {};
      mockFb.firestore.FieldValue = {
        serverTimestamp: () => Date.now()
      };

      Object.defineProperty(window, 'firebase', {
        value: mockFb,
        writable: false,
        configurable: false
      });
    }, `mock-${testInfo.workerIndex}-${Date.now()}`);

    await page.goto('/');

    await page.waitForSelector('#tasksView', { state: 'visible' });
    await page.waitForSelector('#btnAdd', { state: 'visible' });
  });

  test('Create a task', async ({ page }) => {
    const taskName = `Task Create ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });
    await page.waitForTimeout(400);

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();
  });

  test('Update a task', async ({ page }) => {
    const taskName = `Task Update ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });
    await page.waitForTimeout(400);

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();

    const item = page.locator('.item').filter({ has: itemTitle });
    await item.hover();
    
    const editBtn = item.locator('.a-btn:has(svg use[href="#i-edit"])').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    
    await page.waitForSelector('#modal.open', { state: 'visible' });

    const updatedName = `${taskName} Updated`;
    await page.fill('#fT', updatedName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });
    await page.waitForTimeout(400);

    const updatedItemTitle = page.getByText(updatedName, { exact: true });
    await expect(updatedItemTitle).toBeVisible();
  });

  test('Change status to Doing', async ({ page }) => {
    const taskName = `Task Doing ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });
    await page.waitForTimeout(400);

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();

    const item = page.locator('.item').filter({ has: itemTitle });
    const checkbox = item.locator('.ck').first();
    
    await item.hover();
    await checkbox.click();
    
    const stPop = page.locator('#stPop');
    await expect(stPop).toHaveClass(/show/);
    
    const optDoing = page.locator('.st-opt[data-st="doing"]').first();
    await optDoing.click();

    await expect(checkbox).toHaveClass(/doing-st/);
  });

  test('Change status to Done', async ({ page }) => {
    const taskName = `Task Done ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });
    await page.waitForTimeout(400);

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();

    const item = page.locator('.item').filter({ has: itemTitle });
    const checkbox = item.locator('.ck').first();
    
    await item.hover();
    await checkbox.click();
    
    const stPop = page.locator('#stPop');
    await expect(stPop).toHaveClass(/show/);
    
    const optDone = page.locator('.st-opt[data-st="done"]').first();
    await optDone.click();

    await expect(async () => {
      const taskHasCompleted = await item.evaluate(el => el.classList.contains('completed'));
      const ckHasOn = await checkbox.evaluate(el => el.classList.contains('on'));
      expect(taskHasCompleted).toBe(true);
      expect(ckHasOn).toBe(true);
    }).toPass();
  });

  test('Delete a task', async ({ page }) => {
    const taskName = `Task Delete ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });
    await page.waitForTimeout(400);

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();

    const item = page.locator('.item').filter({ has: itemTitle });
    await item.hover();

    const delBtn = item.locator('.del').first();
    await expect(delBtn).toBeVisible();
    await delBtn.click();
    
    const cfWrap = page.locator('#cfWrap');
    await expect(cfWrap).toHaveClass(/open|show/);
    
    const cfYes = page.locator('#cfYes');
    await cfYes.click();

    await expect(itemTitle).toBeHidden();
  });
});
