import { test, expect } from '@playwright/test';

test.describe('Feature 3: Categories & Projects', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.route('**/sw.js*', route => route.abort());
    await page.route('**/*.gstatic.com/**', route => route.abort());

    const initialCats = [
      {id:'familia',name:'Família',icon:'i-heart',color:'#FF2D55'},
      {id:'solvay',name:'Solvay',icon:'i-building',color:'#32ADE6'},
      {id:'manual',name:'Manual do Óleo',icon:'i-droplet',color:'#FF9500'},
      {id:'revviu',name:'Revviu',icon:'i-rocket',color:'#AF52DE'},
      {id:'imobiliario',name:'Imobiliário',icon:'i-home',color:'#34C759'},
      {id:'financeiro',name:'Financeiro',icon:'i-wallet',color:'#FF3B30'},
      {id:'pessoal',name:'Pessoal',icon:'i-user',color:'#8E8E93'}
    ];
    const initialProjects = [
      {id:'bruno',name:'Bruno',icon:'i-user',color:'#007AFF',gradient:'linear-gradient(135deg,#007AFF,#5AC8FA)',type:'personal',visible:true,order:0},
      {id:'nos',name:'Nós',icon:'i-heart',color:'#FF2D55',gradient:'linear-gradient(135deg,#FF2D55,#FF6482)',type:'shared',visible:true,order:1}
    ];

    await page.addInitScript(({ uid, catsJson, projectsJson }) => {
      window.location.reload = () => {};

      const mockFb = {};
      mockFb.initializeApp = () => {};
      mockFb.firestore = () => {
        const collectionMock = {
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({ tasks: "[]", cats: catsJson, log: "[]", projects: projectsJson })
            }),
            set: async () => {},
            delete: async () => {},
            update: async () => {},
            onSnapshot: (cb) => {
              setTimeout(() => cb({
                exists: true,
                data: () => ({ tasks: "[]", cats: catsJson, log: "[]", projects: projectsJson })
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
    }, { 
      uid: `mock-${testInfo.workerIndex}-${Date.now()}`,
      catsJson: JSON.stringify(initialCats),
      projectsJson: JSON.stringify(initialProjects)
    });

    await page.goto('/');

    await page.waitForSelector('#tasksView', { state: 'visible' });
    await page.waitForSelector('#btnAdd', { state: 'visible' });
  });

  test('TC1: Create and verify a new Project', async ({ page }) => {
    await expect(page.locator('#addProjBtn')).toBeVisible();

    await page.locator('#addProjBtn').click();
    await expect(page.locator('#addProjWrap')).toBeVisible();
    
    const projName = `My Test Project ${Date.now()}`;
    await page.locator('#apName').fill(projName);
    await page.locator('#apIcons .ap-opt').first().click();
    await page.locator('#apColors .ap-c-opt').first().click();
    
    await page.locator('#apSave').click();
    
    // Verify it appears in sidebar
    const projectItem = page.locator('.proj-item').filter({ hasText: projName });
    await expect(projectItem).toBeVisible();

    // Verify it is available in the task form
    await page.locator('#btnAdd').click();
    await expect(page.locator('#fProj button', { hasText: projName })).toBeVisible();
  });

  test('TC2: Create and Edit a Category', async ({ page }) => {
    await expect(page.locator('#catMgrBtn')).toBeVisible();
    await page.locator('#catMgrBtn').click();
    
    await expect(page.locator('#catMgrView')).toBeVisible();
    
    await page.locator('#catAddBtn').click();
    await expect(page.locator('#catEditView')).toBeVisible();
    
    const catName = `New Test Cat ${Date.now()}`;
    await page.locator('#ceN').fill(catName);
    await page.locator('#ceIcons .icon-opt').first().click();
    await page.locator('#ceColors .color-opt').first().click();
    await page.locator('#ceSave').click();
    
    // Verify it appears in the Category Manager
    const newCatItem = page.locator('.cat-mgr-item').filter({ hasText: catName });
    await expect(newCatItem).toBeVisible();

    // Edit it
    await newCatItem.locator('.a-btn').first().click();
    await expect(page.locator('#catEditView')).toBeVisible();
    
    const editedCatName = `Edited Test Cat ${Date.now()}`;
    await page.locator('#ceN').fill(editedCatName);
    await page.locator('#ceSave').click();
    
    // Verify edited
    const editedCatItem = page.locator('.cat-mgr-item').filter({ hasText: editedCatName });
    await expect(editedCatItem).toBeVisible();
    await expect(newCatItem).toHaveCount(0);
  });

  test('TC3: Project Visibility Toggle', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await page.waitForSelector('#modal.open', { state: 'visible' });
    const tc3Task = `Visibility Test Task ${Date.now()}`;
    await page.locator('#fT').fill(tc3Task);
    await page.locator('#form button[type="submit"]').click();
    await page.waitForSelector('#modal.open', { state: 'hidden' });
    
    const taskItem = page.locator('.item').filter({ hasText: tc3Task }).first();
    await expect(taskItem).toBeVisible();
    
    const brunoToggle = page.locator('.proj-toggle[data-proj-toggle="bruno"]');
    await expect(brunoToggle).toHaveClass(/on/);
    
    // Toggle off
    await brunoToggle.click();
    await expect(brunoToggle).not.toHaveClass(/on/);
    await expect(taskItem).toBeHidden();
    
    // Toggle on
    await brunoToggle.click();
    await expect(brunoToggle).toHaveClass(/on/);
    await expect(taskItem).toBeVisible();
  });

  test('TC4: Category Scoping by Project (Bruno vs Nós)', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.waitForTimeout(500);
    
    // Check Bruno (default) categories
    await expect(page.locator('#fProj button', { hasText: 'Bruno' })).toHaveClass(/active/);
    await page.locator('#fCWrap').evaluate(node => (node as HTMLElement).click());
    
    // Família is a DEF_CATS category
    await expect(page.locator('#fCMenu')).toContainText('Família');
    await expect(page.locator('#fCMenu')).not.toContainText('Casa'); // NOS_CATS
    
    await page.locator('body').click({ position: { x: 0, y: 0 } });
    
    // Select Nós
    await page.waitForTimeout(500);
    await page.locator('#fProj button', { hasText: 'Nós' }).evaluate(node => (node as HTMLElement).click());
    await expect(page.locator('#fProj button', { hasText: 'Nós' })).toHaveClass(/active/);
    
    await page.locator('#fCWrap').evaluate(node => (node as HTMLElement).click());
    
    // Now it should have 'Casa' and not 'Família'
    await expect(page.locator('#fCMenu')).toContainText('Casa');
    await expect(page.locator('#fCMenu')).not.toContainText('Família');
  });

  test('TC5: Delete Category and Project', async ({ page }) => {
    const delProjName = `Project to Delete ${Date.now()}`;
    await page.locator('#addProjBtn').click();
    await expect(page.locator('#addProjWrap')).toBeVisible();
    await page.locator('#apName').fill(delProjName);
    await page.locator('#apSave').click();
    
    const projItem = page.locator('.proj-item').filter({ hasText: delProjName }).first();
    await expect(projItem).toBeVisible();
    
    await projItem.hover();
    await projItem.locator('.a-btn[data-proj-more]').click();
    
    await expect(page.locator('#pActionSheet')).toBeVisible();
    await page.locator('#pActionSheet button', { hasText: 'Excluir Projeto' }).click();
    
    await expect(page.locator('#cfWrap')).toBeVisible();
    await page.locator('#cfYes').click();
    
    await expect(projItem).toHaveCount(0);
    
    // 2. Delete Category
    const delCatName = `Cat to Delete ${Date.now()}`;
    await page.locator('#catMgrBtn').click();
    await expect(page.locator('#catMgrView')).toBeVisible();
    
    await page.locator('#catAddBtn').click();
    await expect(page.locator('#catEditView')).toBeVisible();
    await page.locator('#ceN').fill(delCatName);
    await page.locator('#ceSave').click();
    
    const catItem = page.locator('.cat-mgr-item').filter({ hasText: delCatName }).first();
    await expect(catItem).toBeVisible();
    
    await catItem.locator('.a-btn.del').click();
    
    await expect(page.locator('#cfWrap')).toBeVisible();
    await page.locator('#cfYes').click();
    
    await expect(catItem).toHaveCount(0);
  });
});
