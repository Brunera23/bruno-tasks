import { test, expect } from '@playwright/test';
import { bootApp } from './_firebase-mock';

/**
 * Regressões das notificações:
 *
 * 1. `new Notification()` é ilegal numa página controlada por Service Worker
 *    (Chrome Android lança "Illegal constructor", iOS nem implementa). Como as
 *    chamadas ficavam em try/catch vazio, nada aparecia e nada era logado.
 * 2. Os avisos locais eram suprimidos quando `btPushEnabled==='1'` — mas essa
 *    flag só diz que o aparelho se inscreveu, não que as Cloud Functions estão
 *    publicadas. Com push "ativo" e functions fora do ar, ninguém recebia nada.
 * 3. Alertas sem `assignedTo` (lembrete pessoal) nunca disparavam localmente.
 * 4. As tags do aviso local e do push do servidor eram diferentes, então o
 *    mesmo evento apareceria duas vezes em vez de se substituir.
 */

test.use({ serviceWorkers: 'block' });

const user = { uid: 'uid-B', email: 'brunohsantos00@gmail.com', displayName: 'Bruno' };

// Substitui Notification e registra um Service Worker falso, para observar por
// qual caminho a notificação foi emitida.
async function stubNotifications(page: any, opts: { withSW: boolean; permission?: string }) {
  await page.addInitScript((o: { withSW: boolean; permission?: string }) => {
    const shown: any[] = [];
    (window as any).__shown = shown;
    (window as any).__ctorCalls = 0;

    class FakeNotification {
      static permission = o.permission || 'granted';
      static requestPermission() { return Promise.resolve(FakeNotification.permission); }
      constructor(title: string, options: any) {
        (window as any).__ctorCalls++;
        if (o.withSW) {
          // Reproduz o comportamento real do Chrome numa página com SW
          throw new TypeError("Failed to construct 'Notification': Illegal constructor.");
        }
        shown.push({ via: 'constructor', title, options });
      }
    }
    (window as any).Notification = FakeNotification;

    if (o.withSW) {
      const reg = {
        showNotification: (title: string, options: any) => {
          shown.push({ via: 'sw', title, options });
          return Promise.resolve();
        },
        pushManager: {
          getSubscription: () => Promise.resolve(null),
          subscribe: () => Promise.resolve(null)
        },
        update: () => {}
      };
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistration: () => Promise.resolve(reg),
          ready: Promise.resolve(reg),
          register: () => Promise.resolve(reg),
          addEventListener: () => {},
          controller: null
        }
      });
    }
  }, opts);
}

const dueToday = (extra: any = {}) => {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { id: 'due1', title: 'Pagar a conta de luz', category: 'financeiro', priority: 'alta', status: 'todo', project: 'bruno', date, subtasks: [], createdAt: 1, updatedAt: 1, ...extra };
};

test('notificação de vencimento usa o Service Worker em vez do construtor ilegal', async ({ page }) => {
  await stubNotifications(page, { withSW: true });
  const t = dueToday();
  await bootApp(page, {
    user,
    store: { users: { 'uid-B': { tasks: JSON.stringify([t]), cats: '[]', log: '[]' } } }
  });
  await expect(page.locator('.shell')).toBeVisible();

  // Força a checagem sem esperar o timer de 6s (e sem depender da hora do dia)
  await page.evaluate(() => {
    const d = new Date();
    (Date.prototype as any).getHours = function () { return 9; };
    (eval('checkDueToday') as any)();
    return d;
  });

  await expect.poll(() => page.evaluate(() => (window as any).__shown.length)).toBeGreaterThan(0);
  const shown = await page.evaluate(() => (window as any).__shown);
  expect(shown[0].via).toBe('sw');
  expect(shown[0].title).toContain('Vence hoje');
  expect(shown[0].options.body).toBe('Pagar a conta de luz');
});

test('avisos locais continuam funcionando com push marcado como ativo', async ({ page }) => {
  await stubNotifications(page, { withSW: true });
  const t = dueToday({ id: 'due2' });
  await bootApp(page, {
    user,
    store: { users: { 'uid-B': { tasks: JSON.stringify([t]), cats: '[]', log: '[]' } } },
    // btPushEnabled=1 antes suprimia todo aviso local
    localStorage: { 'bt-account-uid': 'uid-B', btPushEnabled: '1' }
  });
  await expect(page.locator('.shell')).toBeVisible();

  await page.evaluate(() => {
    (Date.prototype as any).getHours = function () { return 9; };
    (eval('checkDueToday') as any)();
  });

  await expect.poll(() => page.evaluate(() => (window as any).__shown.length)).toBeGreaterThan(0);
});

test('a tag do aviso local casa com a das Cloud Functions (não duplica)', async ({ page }) => {
  await stubNotifications(page, { withSW: true });
  const t = dueToday({ id: 'due3' });
  await bootApp(page, {
    user,
    store: { users: { 'uid-B': { tasks: JSON.stringify([t]), cats: '[]', log: '[]' } } }
  });
  await expect(page.locator('.shell')).toBeVisible();
  await page.evaluate(() => {
    (Date.prototype as any).getHours = function () { return 9; };
    (eval('checkDueToday') as any)();
  });
  await expect.poll(() => page.evaluate(() => (window as any).__shown.length)).toBeGreaterThan(0);

  // dueTodayReminder (functions/index.js) usa "due-" + t.id + "-" + t.date
  const shown = await page.evaluate(() => (window as any).__shown);
  expect(shown[0].options.tag).toBe('due-due3-' + t.date);
});

test('alerta pessoal sem destinatário dispara no aparelho do dono', async ({ page }) => {
  await stubNotifications(page, { withSW: true });
  const alerta = {
    id: 'al1', title: 'Tomar remédio', type: 'alert', medType: 'med', status: 'todo',
    project: 'bruno', nextFireAt: Date.now() - 60000, notes: '1 comprimido',
    subtasks: [], createdAt: 1, updatedAt: 1
    // sem assignedTo — antes o processAlerts descartava
  };
  await bootApp(page, {
    user,
    store: { users: { 'uid-B': { tasks: JSON.stringify([alerta]), cats: '[]', log: '[]' } } }
  });
  await expect(page.locator('.shell')).toBeVisible();
  await page.waitForTimeout(400);
  await page.evaluate(() => (eval('processAlerts') as any)());

  await expect.poll(() => page.evaluate(() => (window as any).__shown.length)).toBeGreaterThan(0);
  const shown = await page.evaluate(() => (window as any).__shown);
  expect(shown[0].via).toBe('sw');
  expect(shown[0].title).toContain('Tomar remédio');
  // alertReminders (functions/index.js) usa "alert-" + t.id
  expect(shown[0].options.tag).toBe('alert-al1');
});

test('sem permissão concedida nada é emitido', async ({ page }) => {
  await stubNotifications(page, { withSW: true, permission: 'default' });
  const t = dueToday({ id: 'due4' });
  await bootApp(page, {
    user,
    store: { users: { 'uid-B': { tasks: JSON.stringify([t]), cats: '[]', log: '[]' } } }
  });
  await expect(page.locator('.shell')).toBeVisible();
  await page.evaluate(() => {
    (Date.prototype as any).getHours = function () { return 9; };
    (eval('checkDueToday') as any)();
  });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__shown.length)).toBe(0);
});

/**
 * Tela vazia: dava para desligar TODOS os projetos, e como `projects` é
 * sincronizado no documento da conta, o estado seguia o usuário para qualquer
 * aparelho — o app abria em branco mesmo com tarefas no Firestore.
 */
test('conta com todos os projetos ocultos ainda mostra as tarefas', async ({ page }) => {
  const t = { id: 'x1', title: 'Tarefa que sumia', category: 'pessoal', priority: 'alta', status: 'todo', project: 'bruno', subtasks: [], createdAt: 1, updatedAt: 1 };
  const todosOcultos = [
    { id: 'bruno', name: 'Bruno', icon: 'i-user', color: '#007AFF', gradient: 'g', type: 'personal', visible: false, order: 0 },
    { id: 'nos', name: 'Nós', icon: 'i-heart', color: '#FF2D55', gradient: 'g', type: 'shared', visible: false, order: 1 }
  ];
  await bootApp(page, {
    user,
    store: { users: { 'uid-B': { tasks: JSON.stringify([t]), cats: '[]', log: '[]', projects: JSON.stringify(todosOcultos) } } }
  });
  await expect(page.locator('.shell')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (eval('getVisibleTasks') as any)().length)).toBe(1);
  await expect(page.locator('body')).toContainText('Tarefa que sumia');
});
