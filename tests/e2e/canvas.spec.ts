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
  await page.locator('.cv-note-txt').fill('Ideia de produto novo');
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
  await expect(page.locator('.cv-note-txt')).toContainText('Anotação antiga');
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
