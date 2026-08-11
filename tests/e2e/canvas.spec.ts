import { test, expect } from '@playwright/test';
import { bootApp } from './_firebase-mock';
test.use({ serviceWorkers: 'block' });
const user={uid:'uid-B',email:'b@x.com',displayName:'Bruno'};

const abrir = async (page:any, canvas:any[]=[]) => {
  await bootApp(page,{user,store:{users:{'uid-B':{tasks:'[]',cats:'[]',log:'[]',canvas:JSON.stringify(canvas)}}}});
  await page.waitForSelector('.shell',{state:'visible'});
  await page.waitForTimeout(900);
  await page.evaluate(()=>(eval('switchView') as any)('canvas'));
  await page.waitForTimeout(400);
};

test('duplo clique cria post-it e o texto sincroniza', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('.cv-empty')).toBeVisible();
  await page.locator('#cvStage').dblclick({position:{x:300,y:200}});
  await expect(page.locator('.cv-note')).toHaveCount(1);
  await page.locator('.cv-node-txt').fill('Ideia de produto novo');
  await page.waitForTimeout(1200);
  const salvo=await page.evaluate(()=>{
    const d=JSON.parse(sessionStorage.getItem('__mockStore')||'{}').users['uid-B'];
    return JSON.parse(d.canvas||'[]');
  });
  expect(salvo).toHaveLength(1);
  expect(salvo[0].text).toContain('Ideia de produto novo');
});

test('post-it existente carrega do servidor e some ao apagar', async ({ page }) => {
  await abrir(page,[{id:'n1',x:60,y:40,text:'Anotação antiga',color:'#FFE58A'}]);
  await expect(page.locator('.cv-note')).toHaveCount(1);
  await expect(page.locator('.cv-node-txt')).toContainText('Anotação antiga');
  await page.locator('[data-cvdel="n1"]').click();
  await expect(page.locator('.cv-note')).toHaveCount(0);
  await page.waitForTimeout(600);
  const salvo=await page.evaluate(()=>JSON.parse(JSON.parse(sessionStorage.getItem('__mockStore')||'{}').users['uid-B'].canvas||'[]'));
  expect(salvo).toHaveLength(0);
});

test('post-it vira tarefa com o texto preenchido', async ({ page }) => {
  await abrir(page,[{id:'n1',x:60,y:40,text:'Renegociar contrato do servidor',color:'#B6E3FF'}]);
  await page.locator('[data-cvtask="n1"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#modal')).toBeVisible();
  expect(await page.locator('#fT').inputValue()).toBe('Renegociar contrato do servidor');
});

test('arrastar move o post-it e a posição persiste', async ({ page }) => {
  await abrir(page,[{id:'n1',x:100,y:100,text:'Mover',color:'#C8F2D4'}]);
  const nota=page.locator('.cv-note');
  const cx=await nota.boundingBox();
  await page.mouse.move(cx!.x+90,cx!.y+80);
  await page.mouse.down();
  await page.mouse.move(cx!.x+240,cx!.y+180,{steps:8});
  await page.mouse.up();
  await page.waitForTimeout(700);
  const salvo=await page.evaluate(()=>JSON.parse(JSON.parse(sessionStorage.getItem('__mockStore')||'{}').users['uid-B'].canvas||'[]'));
  expect(salvo[0].x).toBeGreaterThan(180);
  expect(salvo[0].y).toBeGreaterThan(160);
});

/** Quadros, formas e ligações (dependências) */

test('post-it antigo, sem quadro nem tipo, continua aparecendo', async ({ page }) => {
  // formato anterior a esta versão: sem board, sem kind, sem w/h
  await abrir(page,[{id:'velho',x:50,y:50,text:'Nota do formato antigo',color:'#FFE58A'}]);
  await expect(page.locator('.cv-node')).toHaveCount(1);
  await expect(page.locator('.cv-node-txt')).toContainText('Nota do formato antigo');
  const migrado=await page.evaluate(()=>(eval('canvasItems') as any[])[0]);
  expect(migrado.kind).toBe('note');
  expect(migrado.board).toBeTruthy();
});

test('cria quadro novo e os itens ficam separados por quadro', async ({ page }) => {
  await abrir(page,[{id:'n1',board:'ideias',kind:'note',x:50,y:50,w:190,h:112,text:'Do quadro Ideias'}]);
  await expect(page.locator('.cv-node')).toHaveCount(1);
  page.on('dialog',d=>d.accept('Marketing'));
  await page.locator('#cvBoardAdd').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.cv-node')).toHaveCount(0);          // quadro novo, vazio
  await expect(page.locator('.cv-tab.active')).toContainText('Marketing');
  await page.evaluate(()=>(eval('cvAdd') as any)('rect',40,40));
  await expect(page.locator('.cv-node.cv-rect')).toHaveCount(1);
  // volta para o primeiro quadro: o item de la continua intacto
  await page.locator('[data-cvb="ideias"]').click();
  await expect(page.locator('.cv-node')).toHaveCount(1);
  await expect(page.locator('.cv-node-txt')).toContainText('Do quadro Ideias');
});

test('paleta cria as quatro formas e o texto', async ({ page }) => {
  await abrir(page);
  for(const k of ['rect','ellipse','diamond','text']){
    await page.locator(`[data-cvk="${k}"]`).click();
    await page.waitForTimeout(150);
  }
  await expect(page.locator('.cv-rect')).toHaveCount(1);
  await expect(page.locator('.cv-ellipse')).toHaveCount(1);
  await expect(page.locator('.cv-diamond')).toHaveCount(1);
  await expect(page.locator('.cv-text')).toHaveCount(1);
});

test('arrastar a bolinha de um item até outro cria a dependência', async ({ page }) => {
  await abrir(page,[
    {id:'a',board:'ideias',kind:'note',x:60,y:60,w:190,h:112,text:'Primeiro'},
    {id:'b',board:'ideias',kind:'note',x:420,y:60,w:190,h:112,text:'Depende do primeiro'}
  ]);
  const porta=page.locator('[data-cvport="a"]');
  const alvo=page.locator('[data-cv="b"]');
  const p=await porta.boundingBox(), q=await alvo.boundingBox();
  await page.mouse.move(p!.x+p!.width/2,p!.y+p!.height/2);
  await page.mouse.down();
  await page.mouse.move(q!.x+q!.width/2,q!.y+q!.height/2,{steps:10});
  await page.mouse.up();
  await page.waitForTimeout(500);
  await expect(page.locator('.cv-edge')).toHaveCount(1);
  const salvo=await page.evaluate(()=>JSON.parse(JSON.parse(sessionStorage.getItem('__mockStore')||'{}').users['uid-B'].canvasEdges||'[]'));
  expect(salvo).toHaveLength(1);
  expect(salvo[0].from).toBe('a');
  expect(salvo[0].to).toBe('b');
});

test('apagar um item leva junto as ligações dele', async ({ page }) => {
  await abrir(page,[
    {id:'a',board:'ideias',kind:'note',x:60,y:60,w:190,h:112,text:'A'},
    {id:'b',board:'ideias',kind:'note',x:420,y:60,w:190,h:112,text:'B'}
  ]);
  await page.evaluate(()=>{(eval('canvasEdges') as any[]).push({id:'e1',board:'ideias',from:'a',to:'b'});(eval('renderCanvas') as any)()});
  await expect(page.locator('.cv-edge')).toHaveCount(1);
  await page.locator('[data-cvdel="a"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.cv-node')).toHaveCount(1);
  await expect(page.locator('.cv-edge')).toHaveCount(0);
});
