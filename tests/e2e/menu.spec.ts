import { test, expect } from '@playwright/test';
import { bootApp } from './_firebase-mock';

/**
 * O menu lateral era fixo no HTML. Agora é configurável (o que aparece e em
 * que ordem) e a configuração acompanha a conta.
 */
test.use({ serviceWorkers: 'block' });
const user={uid:'uid-B',email:'b@x.com',displayName:'Bruno'};

const abrir=async(page:any,menu?:any[])=>{
  const doc:any={tasks:'[]',cats:'[]',log:'[]'};
  if(menu)doc.menu=JSON.stringify(menu);
  await bootApp(page,{user,store:{users:{'uid-B':doc}}});
  await page.waitForSelector('.shell',{state:'visible'});
  await page.waitForTimeout(900);
};

test('menu vem completo por padrão', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#navItems .nav-item, #navItems .nav-action')).toHaveCount(6);
  await expect(page.locator('#navItems')).toContainText('Tarefas');
  await expect(page.locator('#navItems')).toContainText('Quadro de Notas');
});

test('esconder um item o tira do menu e a escolha vai para o servidor', async ({ page }) => {
  await abrir(page);
  await page.locator('#menuCfgBtn').click();
  await expect(page.locator('#menuCfg')).toHaveClass(/open/);
  await page.locator('[data-mctg="med"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#navItems')).not.toContainText('Saúde');
  await expect(page.locator('#navItems .nav-item, #navItems .nav-action')).toHaveCount(5);

  const salvo=await page.evaluate(()=>JSON.parse(JSON.parse(sessionStorage.getItem('__mockStore')||'{}').users['uid-B'].menu||'[]'));
  expect(salvo.find((c:any)=>c.id==='med').visivel).toBe(false);
});

test('reordenar muda a posição no menu', async ({ page }) => {
  await abrir(page);
  await page.locator('#menuCfgBtn').click();
  await page.locator('[data-mcup="canvas"]').click();   // Quadros sobe uma posição
  await page.waitForTimeout(300);
  await page.locator('[data-mcup="canvas"]').click();
  await page.waitForTimeout(300);
  const ordem=await page.evaluate(()=>[...document.querySelectorAll('#navItems button')].map(b=>b.textContent?.trim().replace(/\d+$/,'')));
  expect(ordem[1]).toContain('Quadros');
});

test('esconder a view aberta leva para outra', async ({ page }) => {
  await abrir(page);
  await page.evaluate(()=>(eval('switchView') as any)('med'));
  await page.waitForTimeout(300);
  expect(await page.evaluate(()=>eval('curView'))).toBe('med');
  await page.locator('#menuCfgBtn').click();
  await page.locator('[data-mctg="med"]').click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(()=>eval('curView'))).not.toBe('med');
  await expect(page.locator('#medView')).not.toHaveClass(/active/);
});

test('não deixa esconder o último item visível', async ({ page }) => {
  await abrir(page,[
    {id:'tasks',visivel:true},{id:'dash',visivel:false},{id:'med',visivel:false},
    {id:'canvas',visivel:false},{id:'fabric',visivel:false},{id:'notes',visivel:false}
  ]);
  await page.locator('#menuCfgBtn').click();
  await expect(page.locator('[data-mctg="tasks"]')).toBeDisabled();
  await expect(page.locator('#navItems .nav-item, #navItems .nav-action')).toHaveCount(1);
});

test('configuração antiga sem um item novo continua válida', async ({ page }) => {
  // salva sem 'canvas', como se a configuração fosse anterior a essa view
  await abrir(page,[{id:'tasks',visivel:true},{id:'dash',visivel:true}]);
  // os que faltavam entram visíveis no fim, sem quebrar o que já existia
  await expect(page.locator('#navItems')).toContainText('Quadros');
  await expect(page.locator('#navItems')).toContainText('Tarefas');
  const ordem=await page.evaluate(()=>(eval('menuCfg') as any[]).map(c=>c.id));
  expect(ordem.slice(0,2)).toEqual(['tasks','dash']);
});

test('o Fabric Advisor entra no menu configurável como os demais', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#navItems')).toContainText('Fabric Advisor');
  await page.locator('#menuCfgBtn').click();
  await page.locator('[data-mctg="fabric"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#navItems')).not.toContainText('Fabric Advisor');
});

test('cada item do menu abre a sua view', async ({ page }) => {
  await abrir(page);
  for(const [view,marca] of [['dash','#dashView'],['med','#medView'],['canvas','#canvasView'],['fabric','#fabricView']]){
    await page.locator(`#navItems [data-view="${view}"]`).click();
    await page.waitForTimeout(350);
    await expect(page.locator(marca)).toHaveClass(/active/);
  }
});
