# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tier1-feature\f1-task-management.spec.ts >> Feature 1 - Task Management >> Update a task
- Location: tests\e2e\tier1-feature\f1-task-management.spec.ts:88:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#form button[type="submit"]')
    - locator resolved to <button type="submit" class="btn btn-primary">…</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying
    - locator resolved to <button type="submit" class="btn btn-primary">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <main class="main">…</main> from <div class="shell">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <main class="main">…</main> from <div class="shell">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    42 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <main class="main">…</main> from <div class="shell">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - img [ref=e7]
          - text: Bruno Tasks
        - button "Alternar tema claro/escuro" [ref=e9] [cursor=pointer]:
          - img [ref=e10]
      - generic [ref=e12]:
        - generic [ref=e13]: Menu
        - button "Tarefas 2" [ref=e14] [cursor=pointer]:
          - img [ref=e15]
          - text: Tarefas
          - generic [ref=e17]: "2"
        - button "Dashboard" [ref=e18] [cursor=pointer]:
          - img [ref=e19]
          - text: Dashboard
        - button "Saúde" [ref=e21] [cursor=pointer]:
          - img [ref=e22]
          - text: Saúde
        - button "Quadro de Notas" [ref=e24] [cursor=pointer]:
          - img [ref=e25]
          - text: Quadro de Notas
      - generic [ref=e27]:
        - generic [ref=e28]:
          - text: Projetos
          - button "Novo Projeto" [ref=e29] [cursor=pointer]:
            - img [ref=e30]
        - generic [ref=e32]:
          - generic [ref=e33] [cursor=pointer]:
            - img [ref=e35]
            - generic [ref=e38]: Bruno
            - button "Mais" [ref=e40]:
              - img [ref=e41]
            - generic [ref=e43]: "2"
            - button [ref=e44]
          - generic [ref=e45] [cursor=pointer]:
            - img [ref=e47]
            - generic [ref=e50]: Nós
            - button "Mais" [ref=e52]:
              - img [ref=e53]
            - button [ref=e55]
      - generic [ref=e56]:
        - generic [ref=e57]:
          - text: Categorias
          - button "Gerenciar" [ref=e58] [cursor=pointer]:
            - img [ref=e59]
        - button "Todas 2" [ref=e62] [cursor=pointer]:
          - text: Todas
          - generic [ref=e64]: "2"
      - generic [ref=e65]:
        - generic [ref=e66]: T
        - generic [ref=e67]:
          - generic [ref=e68]: Test
          - generic [ref=e69]: t@t.com
        - button "Sair" [ref=e70] [cursor=pointer]:
          - img [ref=e71]
    - main [ref=e74]:
      - generic [ref=e75]:
        - generic [ref=e77]:
          - generic [ref=e78]: Boa noite, Test · Sexta-feira, 5 de junho
          - heading "Tarefas" [level=1] [ref=e79]
        - generic [ref=e80]:
          - generic [ref=e81]:
            - img [ref=e82]
            - textbox "Buscar ou filtrar (hoje, alta, atrasada...)" [ref=e84]
            - button "Filtros rápidos" [ref=e85] [cursor=pointer]:
              - img [ref=e86]
            - generic:
              - generic:
                - img
                - text: Hoje
              - generic:
                - img
                - text: Amanhã
              - generic:
                - img
                - text: Atrasadas
              - generic:
                - img
                - text: Alta Prioridade
          - generic [ref=e87]:
            - button "Todas" [ref=e88] [cursor=pointer]
            - button "A fazer" [ref=e89] [cursor=pointer]
            - button "Fazendo" [ref=e90] [cursor=pointer]
            - button "Feitas" [ref=e91] [cursor=pointer]
          - button "Nova tarefa" [ref=e92] [cursor=pointer]:
            - img [ref=e93]
            - text: Nova tarefa
        - generic [ref=e95]:
          - generic [ref=e96]: "Agrupar por:"
          - generic [ref=e97]:
            - button "Padrão" [ref=e98] [cursor=pointer]:
              - generic [ref=e99]: Padrão
              - img [ref=e100]
            - generic:
              - generic:
                - img
                - text: Padrão
              - generic:
                - img
                - text: Categoria
              - generic:
                - img
                - text: Prioridade
              - generic:
                - img
                - text: Hoje
              - generic:
                - img
                - text: Tempo estimado
          - generic [ref=e102]: "Ordenar:"
          - generic [ref=e103]:
            - button "Prioridade" [ref=e104] [cursor=pointer]:
              - generic [ref=e105]: Prioridade
              - img [ref=e106]
            - generic:
              - generic:
                - img
                - text: Prioridade
              - generic:
                - img
                - text: Prazo
              - generic:
                - img
                - text: A-Z
              - generic:
                - img
                - text: Recentes
              - generic:
                - img
                - text: Tempo
        - generic [ref=e110]:
          - button [ref=e112] [cursor=pointer]:
            - img [ref=e113]
          - generic [ref=e115]:
            - generic [ref=e116]: undefined
            - generic [ref=e118] [cursor=pointer]:
              - img [ref=e119]
              - text: undefined
          - generic [ref=e121]:
            - generic [ref=e122] [cursor=pointer]:
              - img [ref=e123]
              - text: Prazo
            - generic:
              - button "Adicionar subtarefa" [ref=e125] [cursor=pointer]:
                - img [ref=e126]
              - button [ref=e128] [cursor=pointer]:
                - img [ref=e129]
              - button [ref=e131] [cursor=pointer]:
                - img [ref=e132]
    - button "Widgets" [ref=e134] [cursor=pointer]:
      - img [ref=e135]
      - text: Widgets
    - generic:
      - generic:
        - generic:
          - generic "Arrastar":
            - img
          - generic:
            - generic: ⚠️
          - generic: Tarefas Atrasadas
          - button "Filtrar tarefas":
            - img
          - generic:
            - img
        - generic:
          - generic:
            - generic: Você não possui pendências atrasadas.
      - generic:
        - generic:
          - generic "Arrastar":
            - img
          - generic:
            - generic: 📅
          - generic: Carga da Semana
          - button "Filtrar tarefas":
            - img
          - generic:
            - img
        - generic:
          - generic:
            - generic:
              - generic:
                - img
                - generic:
                  - generic: "5"
                  - generic: sex
              - generic:
                - generic: Hoje
                - generic:
                  - generic: Livre
            - generic:
              - generic:
                - img
                - generic:
                  - generic: "6"
                  - generic: sáb
              - generic:
                - generic: Amanhã
                - generic:
                  - generic: Livre
            - generic:
              - generic:
                - img
                - generic:
                  - generic: "7"
                  - generic: dom
              - generic:
                - generic: Domingo
                - generic:
                  - generic: Livre
            - generic:
              - generic:
                - img
                - generic:
                  - generic: "8"
                  - generic: seg
              - generic:
                - generic: Segunda
                - generic:
                  - generic: Livre
            - generic:
              - generic:
                - img
                - generic:
                  - generic: "9"
                  - generic: ter
              - generic:
                - generic: Terça
                - generic:
                  - generic: Livre
            - generic:
              - generic:
                - img
                - generic:
                  - generic: "10"
                  - generic: qua
              - generic:
                - generic: Quarta
                - generic:
                  - generic: Livre
            - generic:
              - generic:
                - img
                - generic:
                  - generic: "11"
                  - generic: qui
              - generic:
                - generic: Quinta
                - generic:
                  - generic: Livre
      - generic:
        - generic:
          - generic "Arrastar":
            - img
          - generic:
            - generic: 📋
          - generic: Foco do Dia
          - button "Filtrar tarefas":
            - img
          - generic:
            - img
        - generic:
          - generic:
            - generic:
              - generic:
                - img
                - generic: 0%
              - generic:
                - generic: 0/0 concluídas
                - generic: Tudo concluído! 🎉
            - generic: Nenhuma tarefa para hoje
      - generic:
        - generic:
          - generic "Arrastar":
            - img
          - generic:
            - generic: ⚡
          - generic: Próximas Prioridades
          - button "Filtrar tarefas":
            - img
          - generic:
            - img
        - generic:
          - generic:
            - generic:
              - generic: Nenhuma tarefa pendente. Tudo em dia! 🎉
      - generic:
        - generic:
          - generic "Arrastar":
            - img
          - generic:
            - generic: 📊
          - generic: Progresso Semanal
          - generic: 0%
          - button "Filtrar tarefas":
            - img
          - generic:
            - img
        - generic:
          - generic:
            - generic:
              - generic: 0 concluídas / 0 total
              - generic: 0%
            - generic:
              - generic:
                - generic: S
              - generic:
                - generic: D
              - generic:
                - generic: S
              - generic:
                - generic: T
              - generic:
                - generic: Q
              - generic:
                - generic: Q
              - generic:
                - generic: S
            - generic:
              - generic: "Hoje: 0 ✓"
              - generic: "= vs ontem: 0"
            - generic: Comece pelo mais fácil — momentum importa.
      - generic:
        - generic:
          - generic "Arrastar":
            - img
          - generic:
            - generic: 🚫
          - generic: Bloqueadas
          - button "Filtrar tarefas":
            - img
          - generic:
            - img
        - generic:
          - generic:
            - generic:
              - generic:
                - img
              - generic:
                - generic: 0 bloqueadas
                - generic: Nenhuma bloqueada 🎉
          - generic:
            - generic:
              - generic: Nenhuma tarefa bloqueada
      - generic:
        - generic:
          - generic "Arrastar":
            - img
          - generic:
            - generic: 🔄
          - generic: Hábitos & Rotinas
          - button "Filtrar tarefas":
            - img
          - generic:
            - img
        - generic:
          - generic:
            - generic:
              - generic:
                - text: Nenhuma tarefa recorrente.
                - text: Use o botão "Repetir" ao criar uma tarefa.
  - generic:
    - generic:
      - generic:
        - generic:
          - generic: Nosso Quadro 0
          - generic: Lembretes do casal
        - button:
          - img
      - generic:
        - button "Todas"
        - button "Bruno"
        - button "Clara"
      - generic:
        - generic:
          - button "3d"
          - button "1sem"
          - button "1d"
          - button "∞"
          - button "Outro"
        - generic:
          - textbox "Escreva uma notinha..."
          - button "Enviar":
            - img
  - generic:
    - button "Nova Tarefa":
      - generic: Nova Tarefa
      - img
    - button "Novo Alerta":
      - generic: Novo Alerta
      - img
  - generic:
    - generic: Nova Tarefa
    - generic:
      - generic:
        - generic: Projeto
        - generic:
          - button "Bruno": Bruno
          - button "Nós 💑": Nós 💑
      - generic:
        - generic: O que vamos fazer?
        - 'textbox "Ex: Pagar a conta de luz..."'
      - generic:
        - generic: Onde se encaixa?
        - generic:
          - generic:
            - generic: Selecione
            - img
      - generic:
        - generic:
          - generic: Qual a urgência?
          - generic:
            - button "Alta": Alta
            - button "Média": Média
            - button "Baixa": Baixa
        - generic:
          - generic: Em que pé está?
          - generic:
            - button "A Fazer"
            - button "Fazendo"
            - button "Feita"
      - generic:
        - generic: Até quando?
        - textbox
        - generic:
          - button "Repetir":
            - img
            - generic: Repetir
          - generic:
            - generic:
              - button "Diário"
              - button "Dias úteis"
              - button "Semanal"
              - button "Mensal"
              - button "Nenhum"
            - generic:
              - generic: "Até:"
              - textbox
      - generic:
        - generic: Tempo estimado
        - generic:
          - button "5min"
          - button "15min"
          - button "30min"
          - button "1h"
          - button "2h"
          - button "4h"
          - button "Outro"
      - generic:
        - generic: Subtarefas
        - button "Adicionar subtarefa":
          - img
          - text: Adicionar subtarefa
      - generic:
        - generic: Depende de
        - generic:
          - textbox "Buscar tarefa..."
      - generic:
        - generic: Notas
        - textbox "Detalhes, links, anotações..."
      - generic:
        - button "Cancelar"
        - button "Salvar ⌘↵":
          - text: Salvar
          - generic: ⌘↵
  - generic:
    - generic: Categorias
    - generic:
      - button "Nova categoria":
        - img
        - text: Nova categoria
      - generic:
        - button "Fechar"
  - generic:
    - generic:
      - generic: Opções do Projeto
      - button "Cancelar"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Feature 1 - Task Management', () => {
  4   |   test.beforeEach(async ({ page }, testInfo) => {
  5   |     await page.route('**/sw.js*', route => route.abort());
  6   |     await page.route('**/*.gstatic.com/**', route => route.abort());
  7   | 
  8   |     await page.addInitScript((uid) => {
  9   |       window.location.reload = () => {};
  10  | 
  11  |       const mockFb = {};
  12  |       mockFb.initializeApp = () => {};
  13  |       mockFb.firestore = () => {
  14  |         const collectionMock = {
  15  |           doc: () => ({
  16  |             get: async () => ({
  17  |               exists: true,
  18  |               data: () => ({ tasks: '[{"id":"dummy1","text":"Dummy Task","st":0}]', cats: "[]", log: "[]" })
  19  |             }),
  20  |             set: async () => {},
  21  |             delete: async () => {},
  22  |             update: async () => {},
  23  |             onSnapshot: (cb) => {
  24  |               setTimeout(() => cb({
  25  |                 exists: true,
  26  |                 data: () => ({ tasks: '[{"id":"dummy1","text":"Dummy Task","st":0}]', cats: "[]", log: "[]" })
  27  |               }), 10);
  28  |               return () => {};
  29  |             }
  30  |           }),
  31  |           add: async () => {}
  32  |         };
  33  |         return {
  34  |           enablePersistence: async () => {},
  35  |           collection: () => collectionMock
  36  |         };
  37  |       };
  38  |       mockFb.auth = () => ({
  39  |         getRedirectResult: async () => ({}),
  40  |         signInWithPopup: async () => {},
  41  |         signOut: async () => {},
  42  |         onAuthStateChanged: (cb) => {
  43  |           const fire = () => cb({ uid: uid, displayName: 'Test', email: 't@t.com' });
  44  |           if (document.readyState === 'loading') {
  45  |             document.addEventListener('DOMContentLoaded', fire);
  46  |           } else {
  47  |             setTimeout(fire, 10);
  48  |           }
  49  |           return () => {};
  50  |         }
  51  |       });
  52  |       mockFb.messaging = () => ({
  53  |         getToken: async () => 'test-token',
  54  |         onMessage: () => {}
  55  |       });
  56  |       mockFb.messaging.isSupported = () => false;
  57  |       mockFb.auth.GoogleAuthProvider = function() {};
  58  |       mockFb.firestore.FieldValue = {
  59  |         serverTimestamp: () => Date.now()
  60  |       };
  61  | 
  62  |       Object.defineProperty(window, 'firebase', {
  63  |         value: mockFb,
  64  |         writable: false,
  65  |         configurable: false
  66  |       });
  67  |     }, `mock-${testInfo.workerIndex}-${Date.now()}`);
  68  | 
  69  |     await page.goto('/');
  70  | 
  71  |     await page.waitForSelector('#tasksView', { state: 'visible' });
  72  |     await page.waitForSelector('#btnAdd', { state: 'visible' });
  73  |   });
  74  | 
  75  |   test('Create a task', async ({ page }) => {
  76  |     const taskName = `Task Create ${Date.now()}`;
  77  |     await page.click('#btnAdd');
  78  |     await page.waitForSelector('#modal.open', { state: 'visible' });
  79  |     await page.fill('#fT', taskName);
  80  |     await page.click('#form button[type="submit"]');
  81  |     await page.waitForSelector('#modal.open', { state: 'hidden' });
  82  |     await page.waitForTimeout(400);
  83  | 
  84  |     const itemTitle = page.getByText(taskName, { exact: true });
  85  |     await expect(itemTitle).toBeVisible();
  86  |   });
  87  | 
  88  |   test('Update a task', async ({ page }) => {
  89  |     const taskName = `Task Update ${Date.now()}`;
  90  |     await page.click('#btnAdd');
  91  |     await page.waitForSelector('#modal.open', { state: 'visible' });
  92  |     await page.fill('#fT', taskName);
> 93  |     await page.click('#form button[type="submit"]');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  94  |     await page.waitForSelector('#modal.open', { state: 'hidden' });
  95  |     await page.waitForTimeout(400);
  96  | 
  97  |     const itemTitle = page.getByText(taskName, { exact: true });
  98  |     await expect(itemTitle).toBeVisible();
  99  | 
  100 |     const item = page.locator('.item').filter({ has: itemTitle });
  101 |     await item.hover();
  102 |     
  103 |     const editBtn = item.locator('.a-btn:has(svg use[href="#i-edit"])').first();
  104 |     await expect(editBtn).toBeVisible();
  105 |     await editBtn.click();
  106 |     
  107 |     await page.waitForSelector('#modal.open', { state: 'visible' });
  108 | 
  109 |     const updatedName = `${taskName} Updated`;
  110 |     await page.fill('#fT', updatedName);
  111 |     await page.click('#form button[type="submit"]');
  112 |     await page.waitForSelector('#modal.open', { state: 'hidden' });
  113 |     await page.waitForTimeout(400);
  114 | 
  115 |     const updatedItemTitle = page.getByText(updatedName, { exact: true });
  116 |     await expect(updatedItemTitle).toBeVisible();
  117 |   });
  118 | 
  119 |   test('Change status to Doing', async ({ page }) => {
  120 |     const taskName = `Task Doing ${Date.now()}`;
  121 |     await page.click('#btnAdd');
  122 |     await page.waitForSelector('#modal.open', { state: 'visible' });
  123 |     await page.fill('#fT', taskName);
  124 |     await page.click('#form button[type="submit"]');
  125 |     await page.waitForSelector('#modal.open', { state: 'hidden' });
  126 |     await page.waitForTimeout(400);
  127 | 
  128 |     const itemTitle = page.getByText(taskName, { exact: true });
  129 |     await expect(itemTitle).toBeVisible();
  130 | 
  131 |     const item = page.locator('.item').filter({ has: itemTitle });
  132 |     const checkbox = item.locator('.ck').first();
  133 |     
  134 |     await item.hover();
  135 |     await checkbox.click();
  136 |     
  137 |     const stPop = page.locator('#stPop');
  138 |     await expect(stPop).toHaveClass(/show/);
  139 |     
  140 |     const optDoing = page.locator('.st-opt[data-st="doing"]').first();
  141 |     await optDoing.click();
  142 | 
  143 |     await expect(checkbox).toHaveClass(/doing-st/);
  144 |   });
  145 | 
  146 |   test('Change status to Done', async ({ page }) => {
  147 |     const taskName = `Task Done ${Date.now()}`;
  148 |     await page.click('#btnAdd');
  149 |     await page.waitForSelector('#modal.open', { state: 'visible' });
  150 |     await page.fill('#fT', taskName);
  151 |     await page.click('#form button[type="submit"]');
  152 |     await page.waitForSelector('#modal.open', { state: 'hidden' });
  153 |     await page.waitForTimeout(400);
  154 | 
  155 |     const itemTitle = page.getByText(taskName, { exact: true });
  156 |     await expect(itemTitle).toBeVisible();
  157 | 
  158 |     const item = page.locator('.item').filter({ has: itemTitle });
  159 |     const checkbox = item.locator('.ck').first();
  160 |     
  161 |     await item.hover();
  162 |     await checkbox.click();
  163 |     
  164 |     const stPop = page.locator('#stPop');
  165 |     await expect(stPop).toHaveClass(/show/);
  166 |     
  167 |     const optDone = page.locator('.st-opt[data-st="done"]').first();
  168 |     await optDone.click();
  169 | 
  170 |     await expect(async () => {
  171 |       const taskHasCompleted = await item.evaluate(el => el.classList.contains('completed'));
  172 |       const ckHasOn = await checkbox.evaluate(el => el.classList.contains('on'));
  173 |       expect(taskHasCompleted).toBe(true);
  174 |       expect(ckHasOn).toBe(true);
  175 |     }).toPass();
  176 |   });
  177 | 
  178 |   test('Delete a task', async ({ page }) => {
  179 |     const taskName = `Task Delete ${Date.now()}`;
  180 |     await page.click('#btnAdd');
  181 |     await page.waitForSelector('#modal.open', { state: 'visible' });
  182 |     await page.fill('#fT', taskName);
  183 |     await page.click('#form button[type="submit"]');
  184 |     await page.waitForSelector('#modal.open', { state: 'hidden' });
  185 |     await page.waitForTimeout(400);
  186 | 
  187 |     const itemTitle = page.getByText(taskName, { exact: true });
  188 |     await expect(itemTitle).toBeVisible();
  189 | 
  190 |     const item = page.locator('.item').filter({ has: itemTitle });
  191 |     await item.hover();
  192 | 
  193 |     const delBtn = item.locator('.del').first();
```