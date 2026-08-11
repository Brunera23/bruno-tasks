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

/**
 * Cenário multi-aparelho: o documento pessoal é gravado inteiro, então outro
 * computador aberto com a lista antiga em memória regravava o item apagado e a
 * exclusão "voltava". Os tombstones (campos `deleted`/`catsDeleted` do
 * documento) fazem todo cliente filtrar o excluído ao carregar e ao gravar.
 */
test('tarefa regravada por outro aparelho continua excluída', async ({ page }) => {
  await bootApp(page,{user,store:{users:{'uid-B':{tasks:JSON.stringify(tarefas),cats:JSON.stringify(cats),log:'[]'}}}});
  await page.waitForSelector('.shell',{state:'visible'});
  await page.waitForTimeout(900);

  await page.evaluate(()=>(eval('askDel') as any)('t1'));
  await page.locator('#cfYes').click();
  await page.waitForTimeout(300);

  // tombstone chegou ao servidor junto com a exclusão
  const doc=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('__mockStore')||'{}').users['uid-B']);
  expect(Object.keys(JSON.parse(doc.deleted||'{}'))).toContain('t1');

  // "outro aparelho" com a lista antiga grava o documento por cima
  // (só o campo tasks — como faria uma sessão atrasada)
  await page.evaluate(ts=>{ 
    return (window as any).firebase.firestore().collection('users').doc('uid-B')
      .set({tasks:ts},{merge:true});
  }, JSON.stringify(tarefas));
  await page.waitForTimeout(1500);

  // o app não pode re-exibir a tarefa...
  expect(await page.evaluate(()=>(eval('tasks') as any[]).map(t=>t.id))).not.toContain('t1');

  // ...e a próxima gravação limpa o servidor de novo
  await page.evaluate(()=>{(eval('fbSaveNow') as any)()});
  await page.waitForTimeout(400);
  const depois=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('__mockStore')||'{}').users['uid-B']);
  expect(JSON.parse(depois.tasks).map((t:any)=>t.id)).not.toContain('t1');
});

test('categoria regravada por outro aparelho continua excluída', async ({ page }) => {
  await bootApp(page,{user,store:{users:{'uid-B':{tasks:JSON.stringify(tarefas),cats:JSON.stringify(cats),log:'[]'}}}});
  await page.waitForSelector('.shell',{state:'visible'});
  await page.waitForTimeout(900);

  await page.evaluate(()=>(eval('delCat') as any)('financeiro'));
  await page.locator('#cfYes').click();
  await page.waitForTimeout(300);

  await page.evaluate(cs=>{
    return (window as any).firebase.firestore().collection('users').doc('uid-B')
      .set({cats:cs},{merge:true});
  }, JSON.stringify(cats));
  await page.waitForTimeout(1500);

  expect(await page.evaluate(()=>(eval('cats') as any[]).map(c=>c.id))).not.toContain('financeiro');
});

/**
 * Servidor recusando gravações (regra de segurança, chave de API, conta sem
 * permissão): a exclusão não pode evaporar no F5 — o tombstone local segura o
 * item fora da tela — e a falha tem que aparecer NA TELA, não num console.
 */
test('com o servidor recusando gravações, a exclusão sobrevive ao F5 e o erro fica visível', async ({ page }) => {
  await bootApp(page,{user,failWrites:true,
    store:{users:{'uid-B':{tasks:JSON.stringify(tarefas),cats:JSON.stringify(cats),log:'[]'}}}});
  await page.waitForSelector('.shell',{state:'visible'});
  await page.waitForTimeout(900);

  await page.evaluate(()=>(eval('askDel') as any)('t1'));
  await page.locator('#cfYes').click();

  // o aviso de falha aparece na tela, com o código do erro
  await expect(page.locator('#syncProblem')).toBeVisible({timeout:5000});
  await expect(page.locator('#syncProblem')).toContainText('permission-denied');

  // F5: o servidor ainda tem t1, mas o tombstone local mantém a exclusão
  await page.reload();
  await page.waitForSelector('.shell',{state:'visible'});
  await page.waitForTimeout(1200);
  const server=await page.evaluate(()=>JSON.parse(JSON.parse(sessionStorage.getItem('__mockStore')||'{}').users['uid-B'].tasks).map((t:any)=>t.id));
  expect(server).toContain('t1'); // gravação de fato falhou
  expect(await page.evaluate(()=>(eval('tasks') as any[]).map(t=>t.id))).not.toContain('t1');
  await expect(page.locator('body')).not.toContainText('Tarefa Um');
});
