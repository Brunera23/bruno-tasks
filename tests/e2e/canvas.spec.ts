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
  await expect(page.locator('#modal')).toHaveClass(/\bopen\b/);
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
  const porta=page.locator('[data-cvport="a"][data-cvlado="right"]');
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
  expect(salvo[0].fromSide).toBe('right');   // saiu pela porta da direita
  expect(salvo[0].toSide).toBeTruthy();      // e chegou pelo lado mais próximo do ponto solto
});

test('a ligação sai pelo lado de onde foi puxada', async ({ page }) => {
  await abrir(page,[
    {id:'a',board:'ideias',kind:'note',x:200,y:300,w:190,h:112,text:'Base'},
    {id:'b',board:'ideias',kind:'note',x:200,y:60,w:190,h:112,text:'Acima'}
  ]);
  const porta=page.locator('[data-cvport="a"][data-cvlado="top"]');
  const alvo=page.locator('[data-cv="b"]');
  const p=await porta.boundingBox(), q=await alvo.boundingBox();
  await page.mouse.move(p!.x+p!.width/2,p!.y+p!.height/2);
  await page.mouse.down();
  await page.mouse.move(q!.x+q!.width/2,q!.y+q!.height-4,{steps:10}); // solta na base do alvo
  await page.mouse.up();
  await page.waitForTimeout(500);
  const salvo=await page.evaluate(()=>JSON.parse(JSON.parse(sessionStorage.getItem('__mockStore')||'{}').users['uid-B'].canvasEdges||'[]'));
  expect(salvo[0].fromSide).toBe('top');
  expect(salvo[0].toSide).toBe('bottom');
});

test('a seta é uma curva, não uma reta', async ({ page }) => {
  await abrir(page,[
    {id:'a',board:'ideias',kind:'note',x:60,y:60,w:190,h:112,text:'A'},
    {id:'b',board:'ideias',kind:'note',x:460,y:300,w:190,h:112,text:'B'}
  ]);
  await page.evaluate(()=>{(eval('canvasEdges') as any[]).push({id:'e1',board:'ideias',from:'a',to:'b',fromSide:'right',toSide:'left'});(eval('renderCanvas') as any)()});
  const d=await page.locator('.cv-edge-line').getAttribute('d');
  expect(d).toContain('C');       // cúbica de Bézier
  expect(d).toMatch(/^M /);
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

/** Atalhos de teclado e seleção */

test('teclas criam cada tipo de objeto', async ({ page }) => {
  await abrir(page);
  const st=await page.locator('#cvStage').boundingBox();
  const tipos:[string,string][]=[['n','cv-note'],['r','cv-rect'],['o','cv-ellipse'],['d','cv-diamond'],['t','cv-text']];
  let i=0;
  for(const [tecla,cls] of tipos){
    // cada um num ponto diferente: o objeto nasce sob o cursor e o foco vai
    // para o texto dele, entao criar tudo no mesmo lugar se atropelaria
    await page.mouse.move(st!.x+120+i*230, st!.y+120);
    await page.waitForTimeout(80);
    await page.evaluate(()=>(document.activeElement as HTMLElement)?.blur());
    await page.locator('body').press(tecla);
    await page.waitForTimeout(220);
    await expect(page.locator('.'+cls)).toHaveCount(1);
    i++;
  }
  await expect(page.locator('.cv-node')).toHaveCount(5);
});

test('atalho NÃO dispara enquanto se digita num objeto', async ({ page }) => {
  await abrir(page,[{id:'n1',board:'ideias',kind:'note',x:60,y:60,w:190,h:112,text:''}]);
  const txt=page.locator('.cv-node-txt');
  await page.locator('[data-cv="n1"]').dblclick();   // entra em edição
  await txt.pressSequentially('nota rodando');
  await page.waitForTimeout(300);
  // continua um só objeto: as letras viraram texto, não novos objetos
  await expect(page.locator('.cv-node')).toHaveCount(1);
  await expect(txt).toContainText('nota rodando');
});

test('Delete apaga o objeto selecionado e Esc desmarca', async ({ page }) => {
  await abrir(page,[
    {id:'a',board:'ideias',kind:'note',x:60,y:60,w:190,h:112,text:'A'},
    {id:'b',board:'ideias',kind:'rect',x:400,y:60,w:180,h:100,text:'B'}
  ]);
  await page.locator('[data-cv="a"]').click({position:{x:5,y:5}});
  await expect(page.locator('[data-cv="a"]')).toHaveClass(/sel/);
  await page.locator('body').press('Escape');
  await expect(page.locator('.cv-node.sel')).toHaveCount(0);

  await page.locator('[data-cv="a"]').click({position:{x:5,y:5}});
  await page.locator('body').press('Delete');
  await page.waitForTimeout(400);
  await expect(page.locator('.cv-node')).toHaveCount(1);
  await expect(page.locator('[data-cv="b"]')).toBeVisible();
});

test('atalho do quadro não abre o formulário de tarefa', async ({ page }) => {
  await abrir(page);
  await page.locator('body').press('n');
  await page.waitForTimeout(400);
  await expect(page.locator('#modal')).not.toHaveClass(/\bopen\b/);
  await expect(page.locator('.cv-note')).toHaveCount(1);
});

test('objeto nasce onde o cursor está, não no centro', async ({ page }) => {
  await abrir(page);
  const st=await page.locator('#cvStage').boundingBox();
  // leva o cursor para o canto superior esquerdo do quadro e cria pelo atalho
  await page.mouse.move(st!.x+140, st!.y+120);
  await page.waitForTimeout(120);
  await page.locator('body').press('t');
  await page.waitForTimeout(300);

  const it=await page.evaluate(()=>(eval('canvasItems') as any[])[0]);
  const esperado=await page.evaluate(([cx,cy])=>(eval('cvParaMundo') as any)(cx,cy),[st!.x+140,st!.y+120]);
  // centro do objeto cai sobre o cursor (tolerância de alguns px)
  expect(Math.abs((it.x+it.w/2)-esperado.x)).toBeLessThan(6);
  expect(Math.abs((it.y+it.h/2)-esperado.y)).toBeLessThan(6);
});

test('a paleta anuncia o atalho de cada ferramenta', async ({ page }) => {
  await abrir(page);
  const esperado:Record<string,string>={note:'Post-it · N',rect:'Retângulo · R',ellipse:'Elipse · O',diamond:'Losango · D',text:'Texto · T'};
  for(const [k,dica] of Object.entries(esperado)){
    await expect(page.locator(`[data-cvk="${k}"]`)).toHaveAttribute('data-dica',dica);
  }
});

/** Arrastar x editar, bordas, reações e renomear quadro */

test('um clique arrasta; só o duplo clique entra no texto', async ({ page }) => {
  await abrir(page,[{id:'n1',board:'ideias',kind:'note',x:120,y:120,w:190,h:112,text:'Arrasta pelo meio'}]);
  const no=page.locator('[data-cv="n1"]');
  const b=await no.boundingBox();
  // pressiona EM CIMA DO TEXTO e arrasta — antes isso virava cursor de digitação
  await page.mouse.move(b!.x+90,b!.y+30);
  await page.mouse.down();
  await page.mouse.move(b!.x+290,b!.y+230,{steps:8});
  await page.mouse.up();
  await page.waitForTimeout(600);
  const it=await page.evaluate(()=>(eval('canvasItems') as any[])[0]);
  expect(it.x).toBeGreaterThan(280);
  expect(await page.evaluate(()=>document.activeElement?.isContentEditable||false)).toBe(false);

  // duplo clique entra em edição
  await no.dblclick();
  await expect(no).toHaveClass(/editando/);
  expect(await page.evaluate(()=>document.activeElement?.isContentEditable||false)).toBe(true);
});

test('borda liga e desliga no shape e no texto', async ({ page }) => {
  await abrir(page,[
    {id:'r1',board:'ideias',kind:'rect',x:60,y:60,w:180,h:100,text:'R',bordered:true},
    {id:'t1',board:'ideias',kind:'text',x:60,y:220,w:200,h:44,text:'T'}
  ]);
  await expect(page.locator('[data-cv="r1"]')).toHaveClass(/\bbd\b/);
  await page.locator('[data-cvbd="r1"]').click();
  await expect(page.locator('[data-cv="r1"]')).not.toHaveClass(/\bbd\b/);
  await page.locator('[data-cvbd="t1"]').click();
  await expect(page.locator('[data-cv="t1"]')).toHaveClass(/\bbd\b/);
});

test('reação marca e desmarca o objeto', async ({ page }) => {
  await abrir(page,[{id:'n1',board:'ideias',kind:'note',x:60,y:60,w:190,h:112,text:'Prioridade'}]);
  await page.locator('[data-cvreact="n1"][data-em="🔥"]').click();
  await expect(page.locator('.cv-reacts')).toContainText('🔥');
  await page.locator('[data-cvreact="n1"][data-em="🔥"]').click();
  await expect(page.locator('.cv-reacts')).toHaveCount(0);
});

test('duplo clique na aba renomeia o quadro', async ({ page }) => {
  await abrir(page,[{id:'n1',board:'ideias',kind:'note',x:60,y:60,w:190,h:112,text:'x'}]);
  page.on('dialog',d=>d.accept('Planejamento 2026'));
  await page.locator('[data-cvb="ideias"]').dblclick();
  await page.waitForTimeout(400);
  await expect(page.locator('.cv-tab.active')).toContainText('Planejamento 2026');
  const salvo=await page.evaluate(()=>JSON.parse(JSON.parse(sessionStorage.getItem('__mockStore')||'{}').users['uid-B'].canvasBoards||'[]'));
  expect(salvo[0].name).toBe('Planejamento 2026');
});
