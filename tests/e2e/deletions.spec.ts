/**
 * Exclusões voltavam depois de um reload: fbSave() adia a gravação em 300ms
 * para agrupar edições. Se a página recarregasse dentro dessa janela, a escrita
 * nunca era iniciada e o servidor devolvia o item apagado.
 */
import { test, expect } from '@playwright/test';
import { bootApp } from './_firebase-mock';
test.use({ serviceWorkers: 'block' });
const user={uid:'uid-B',email:'b@x.com',displayName:'Bruno'};
const cats=[{id:'financeiro',name:'Financeiro',icon:'i-wallet',color:'#FF3B30'},{id:'solvay',name:'Solvay',icon:'i-building',color:'#32ADE6'}];
const tarefas=[
 {id:'t1',title:'Tarefa Um',category:'financeiro',priority:'alta',status:'todo',project:'bruno',subtasks:[],createdAt:1,updatedAt:1},
 {id:'t2',title:'Tarefa Dois',category:'financeiro',priority:'media',status:'todo',project:'bruno',subtasks:[],createdAt:2,updatedAt:2}];

const noServidor = (page:any) => page.evaluate(()=>{
  const s=JSON.parse(sessionStorage.getItem('__mockStore')||'{}');
  const d=(s.users&&s.users['uid-B'])||{};
  return {tarefas:JSON.parse(d.tasks||'[]').map((t:any)=>t.id), cats:JSON.parse(d.cats||'[]').map((c:any)=>c.id)};
});

test('exclusão de tarefa vai para o servidor sem esperar o debounce', async ({ page }) => {
  await bootApp(page,{user,store:{users:{'uid-B':{tasks:JSON.stringify(tarefas),cats:JSON.stringify(cats),log:'[]'}}}});
  await page.waitForSelector('.shell',{state:'visible'});
  await page.waitForTimeout(900);
  await page.evaluate(()=>(eval('askDel') as any)('t1'));
  await page.locator('#cfYes').click();
  await page.waitForTimeout(120);              // bem abaixo dos 300ms do debounce
  expect((await noServidor(page)).tarefas).not.toContain('t1');
});

test('exclusão de categoria vai para o servidor sem esperar o debounce', async ({ page }) => {
  await bootApp(page,{user,store:{users:{'uid-B':{tasks:JSON.stringify(tarefas),cats:JSON.stringify(cats),log:'[]'}}}});
  await page.waitForSelector('.shell',{state:'visible'});
  await page.waitForTimeout(900);
  await page.evaluate(()=>(eval('delCat') as any)('financeiro'));
  await page.locator('#cfYes').click();
  await page.waitForTimeout(120);
  expect((await noServidor(page)).cats).not.toContain('financeiro');
});

test('exclusão continua valendo depois de recarregar', async ({ page }) => {
  await bootApp(page,{user,store:{users:{'uid-B':{tasks:JSON.stringify(tarefas),cats:JSON.stringify(cats),log:'[]'}}}});
  await page.waitForSelector('.shell',{state:'visible'});
  await page.waitForTimeout(900);
  await page.evaluate(()=>(eval('askDel') as any)('t1'));
  await page.locator('#cfYes').click();
  await page.waitForTimeout(120);
  await page.reload();
  await page.waitForSelector('.shell',{state:'visible'});
  await page.waitForTimeout(1200);
  expect(await page.evaluate(()=>(eval('tasks') as any[]).map(t=>t.id))).not.toContain('t1');
});
