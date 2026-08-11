import { test, expect } from '@playwright/test';
import { bootApp } from './_firebase-mock';

/**
 * Regressões de acesso à conta Google:
 *
 * 1. Com mais de uma conta Google logada no navegador, o Google escolhia sozinho
 *    a sessão "padrão" e o app entrava numa conta aleatória.
 * 2. O cache local (localStorage) é do navegador, não da conta — dados de uma
 *    conta apareciam (e eram gravados) na conta de outra.
 * 3. O documento legado `data/bruno-main` era único para todo mundo: a primeira
 *    conta a logar puxava o banco antigo para si e apagava a origem.
 */

// O service worker do app recarrega a página e intercepta os scripts do SDK,
// o que impediria o mock de ser aplicado no reload.
test.use({ serviceWorkers: "block" });

const taskA = { id: 'a1', title: 'TAREFA DA CONTA A', category: 'pessoal', priority: 'alta', status: 'todo', project: 'bruno', subtasks: [], createdAt: 1, updatedAt: 1 };
const userA = { uid: 'uid-A', email: 'aleatoria@gmail.com', displayName: 'Conta Aleatoria' };
const userB = { uid: 'uid-B', email: 'brunohsantos00@gmail.com', displayName: 'Bruno' };

test('o seletor de contas do Google é sempre exibido (prompt=select_account)', async ({ page }) => {
  await bootApp(page, { user: null });
  await expect(page.locator('#loginScreen')).toBeVisible();
  const params = await page.evaluate(() => (window as any).__mockProviderParams);
  expect(params).toEqual({ prompt: 'select_account' });
});

test('popup bloqueado cai para o fluxo de redirect em vez de travar o login', async ({ page }) => {
  await bootApp(page, { user: null, popupError: 'auth/popup-blocked' });
  await expect(page.locator('#loginScreen')).toBeVisible();
  await page.locator('#loginBtn').click();
  await expect.poll(() => page.evaluate(() => (window as any).__mockRedirects || 0)).toBe(1);
});

test('conta nova não herda o cache local da conta anterior', async ({ page }) => {
  await bootApp(page, {
    user: userB,
    localStorage: { 'bt-account-uid': 'uid-A', 'bt-v5': JSON.stringify([taskA]) }
  });
  await expect(page.locator('.shell')).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('bt-account-uid')))
    .toBe('uid-B');
  const titles = await page.evaluate(() => (eval('tasks') as any[]).map(t => t.title));
  expect(titles).not.toContain('TAREFA DA CONTA A');
  await expect(page.locator('body')).not.toContainText('TAREFA DA CONTA A');
});

test('dados de uma conta nunca são gravados no documento de outra', async ({ page }) => {
  const projetoDaContaA = [{ id: 'secreto', name: 'PROJETO DA CONTA A', icon: 'i-heart', color: '#FF2D55', gradient: 'linear-gradient(135deg,#FF2D55,#FF6482)', type: 'personal', visible: true, order: 0 }];
  await bootApp(page, {
    user: userB,
    // Documento do uid-B sem os campos `projects`/`agents` — é aqui que o estado
    // da conta anterior sobrevivia em memória e era gravado por cima.
    store: { users: { 'uid-B': { tasks: JSON.stringify([{ id: 'b9', title: 'Tarefa do Bruno', project: 'bruno', updatedAt: 2 }]), cats: '[]', log: '[]' } } },
    localStorage: {
      'bt-account-uid': 'uid-A',
      'bt-v5': JSON.stringify([taskA]),
      'bt-projects': JSON.stringify(projetoDaContaA)
    }
  });
  await expect(page.locator('.shell')).toBeVisible();
  await page.waitForTimeout(600);

  // Simula uma edição do usuário logado (uid-B) e força a gravação
  await page.evaluate(() => {
    const t = eval('tasks') as any[];
    t.push({ id: 'b1', title: 'Tarefa da conta B', category: 'pessoal', priority: 'media', status: 'todo', project: 'bruno', subtasks: [], createdAt: Date.now(), updatedAt: Date.now() });
    (eval('sT') as any)();
  });

  await expect
    .poll(() => page.evaluate(() => {
      const s = JSON.parse(sessionStorage.getItem('__mockStore') || '{}');
      return s.users && s.users['uid-B'] ? s.users['uid-B'].tasks : null;
    }))
    .toContain('Tarefa da conta B');

  const written = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__mockStore') || '{}'));
  expect(written.users['uid-B'].tasks).not.toContain('TAREFA DA CONTA A');
  expect(written.users['uid-B'].projects).not.toContain('PROJETO DA CONTA A');
  expect(written.users['uid-A']).toBeUndefined();
});

test('trocar de conta na mesma sessão reinicia o estado', async ({ page }) => {
  await bootApp(page, {
    user: userA,
    store: { users: { 'uid-A': { tasks: JSON.stringify([taskA]), cats: '[]', log: '[]' } } },
    localStorage: { 'bt-account-uid': 'uid-A' }
  });
  await expect(page.locator('.shell')).toBeVisible();
  // A conta A sincroniza e deixa suas tarefas no cache do navegador
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('bt-v5') || ''))
    .toContain('TAREFA DA CONTA A');

  // A sessão do Google passa a ser outra conta com o app já aberto:
  // o app tem que se reiniciar limpo, sem carregar nada da conta anterior.
  const navigated = page.waitForEvent('framenavigated');
  await page.evaluate(u => (window as any).__mock.setUser(u), userB);
  await navigated;
  await page.waitForLoadState('domcontentloaded');

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('bt-account-uid')), { timeout: 10000 })
    .toBe('uid-B');
  expect(await page.evaluate(() => localStorage.getItem('bt-v5') || '')).not.toContain('TAREFA DA CONTA A');
});

test('documento legado não é sequestrado por uma conta que já tem dados', async ({ page }) => {
  await bootApp(page, {
    user: userB,
    store: {
      data: { 'bruno-main': { tasks: JSON.stringify([{ id: 'l1', title: 'TAREFA LEGADA', updatedAt: 1 }]), cats: '[]', log: '[]' } },
      users: { 'uid-B': { tasks: JSON.stringify([{ id: 'b9', title: 'Tarefa do Bruno', project: 'bruno', updatedAt: 2 }]), cats: '[]', log: '[]' } }
    }
  });
  await expect(page.locator('.shell')).toBeVisible();
  await page.waitForTimeout(800);

  const store = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__mockStore') || '{}'));
  // O doc legado continua de pé e não foi absorvido por esta conta
  expect(store.data['bruno-main']).toBeTruthy();
  expect(store.users['uid-B'].tasks).not.toContain('TAREFA LEGADA');
});

/**
 * Achados da revisão de código — cada um destes já quebrou uma vez.
 */

test('migração do documento legado copia, mas nunca destrói o original', async ({ page }) => {
  await bootApp(page, {
    user: userB, // conta vazia: é o caso em que a migração realmente roda
    store: {
      data: { 'bruno-main': { tasks: JSON.stringify([{ id: 'l1', title: 'TAREFA LEGADA', updatedAt: 1 }]), cats: '[]', log: '[]' } }
    }
  });
  await expect(page.locator('.shell')).toBeVisible();

  // importou para a conta
  await expect
    .poll(() => page.evaluate(() => {
      const s = JSON.parse(sessionStorage.getItem('__mockStore') || '{}');
      return (s.users && s.users['uid-B'] && s.users['uid-B'].tasks) || '';
    }))
    .toContain('TAREFA LEGADA');

  // e o original continua de pé para quem for o dono de direito
  const store = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__mockStore') || '{}'));
  expect(store.data['bruno-main']).toBeTruthy();
  expect(store.data['bruno-main'].tasks).toContain('TAREFA LEGADA');
  expect(store.data['bruno-main'].migratedBy).toBe('uid-B');
});

test('logout conclui mesmo quando a gravação nunca responde (offline)', async ({ page }) => {
  await bootApp(page, {
    user: userB,
    hangWrites: true,
    store: { users: { 'uid-B': { tasks: JSON.stringify([{ id: 'b1', title: 'Tarefa', project: 'bruno', updatedAt: 1 }]), cats: '[]', log: '[]' } } }
  });
  await expect(page.locator('.shell')).toBeVisible();
  await page.waitForTimeout(500);

  // deixa alterações pendentes e sai
  await page.evaluate(() => {
    const t = eval('tasks') as any[];
    t.push({ id: 'b2', title: 'Pendente', project: 'bruno', subtasks: [], createdAt: Date.now(), updatedAt: Date.now() });
    (eval('sT') as any)();
  });
  await page.evaluate(() => (eval('doLogout') as any)(false));

  // o flush tem prazo: a sessão precisa terminar de qualquer forma
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('__mockUser')), { timeout: 15000 })
    .toBeNull();
});

test('inscrição de push antiga do outro papel é removida', async ({ page }) => {
  const clara = { uid: 'uid-C', email: 'clara.silva@gmail.com', displayName: 'Clara' };
  await bootApp(page, {
    user: clara,
    // aparelho antigo: todo mundo ficou gravado como bruno_<uid>
    store: { push_tokens: { 'bruno_uid-C': { role: 'bruno', uid: 'uid-C', subscription: { endpoint: 'https://push/abc' } } } }
  });
  await expect(page.locator('.shell')).toBeVisible();

  await page.evaluate(() => (eval('savePushSub') as any)({ toJSON: () => ({ endpoint: 'https://push/abc' }) }));

  await expect
    .poll(() => page.evaluate(() => {
      const s = JSON.parse(sessionStorage.getItem('__mockStore') || '{}');
      return Object.keys(s.push_tokens || {});
    }))
    .toEqual(['parceira_uid-C']);
});
