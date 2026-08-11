# Conta abrindo vazia — como descobrir onde os dados estão

Teste relatado: entrar com **brunohsantos00@gmail.com** em outro computador e o app
abrir sem nenhuma atividade.

> Um computador novo não tem cache local, então o que aparece na tela é
> **exatamente** o que o Firestore devolveu para aquele uid. Tela vazia significa
> que o documento daquela conta está vazio — ou que as tarefas existem mas estão
> sendo filtradas antes de renderizar.

## Antes de qualquer coisa

As correções deste branch **ainda não estão no ar**. O app publicado é a versão
antiga, com todos os bugs descritos abaixo. O teste acima rodou contra ela.
Veja "Como publicar" no fim.

## Três causas possíveis, em ordem de probabilidade

### 1. Todos os projetos ficaram ocultos (mais provável)

Era possível desligar **todos** os projetos no menu lateral. A lista `projects` é
salva no documento da conta no Firestore, então esse estado **acompanha a conta**
para qualquer computador — e `getVisibleTasks()` devolvia lista vazia. O app abre
em branco mesmo com todas as tarefas intactas no banco.

**Como confirmar agora, sem publicar nada:** abra o app, tecle F12 → Console e rode:

```js
// quantas tarefas vieram do servidor vs. quantas a tela mostra
console.table(projects.map(p => ({projeto: p.name, visivel: p.visible})));
console.log('tarefas no estado:', tasks.length, '| visíveis:', getVisibleTasks().length);
```

Se `tarefas no estado` for maior que zero e `visíveis` for zero, é isto. Correção
imediata sem esperar deploy:

```js
projects.forEach(p => p.visible = true); saveUI(); render();
```

Já corrigido no branch: não dá mais para desligar o último projeto visível, e se
uma conta já estiver nesse estado o app mostra tudo em vez de abrir em branco.

### 2. O documento legado foi levado por outra conta

`data/bruno-main` era um documento **único para todos**. A primeira conta que
logasse migrava ele para si e **apagava a origem**. Se uma conta aleatória entrou
antes de você (que é justamente o bug do seletor de contas), os dados foram para
`users/<uid-daquela-conta>`.

> No branch corrigido a migração **copia e nunca apaga**: o documento legado
> continua no lugar, só ganha um campo `migratedBy` com o uid de quem importou.
> No pior caso alguém leva uma cópia; o original permanece para o dono.

**Como confirmar:** Firebase Console → Firestore →

- a coleção `data` ainda tem o doc `bruno-main`? Se **sim**, os dados estão lá e o
  branch corrigido migra automaticamente no seu próximo login (a migração agora só
  acontece se a conta ainda não tiver dados próprios).
- se **não**, abra a coleção `users` e veja quantos documentos existem. Cada um é
  um uid. O que tiver `taskCount` alto é onde os dados estão. O campo `device` e o
  `updatedAt` ajudam a identificar.

Para saber qual uid é o seu: no Console → Authentication → Users, procure
brunohsantos00@gmail.com e copie o **User UID**. Compare com os documentos de `users`.

### 3. O celular está logado em outra conta

Se o app do celular mostra os dados e o navegador não, vale confirmar que os dois
estão na **mesma** conta. Depois do deploy o app passa a mostrar um aviso
"Conectado como \<email\>" no login e o e-mail fica visível na barra lateral.

## Recuperando dados que foram para outro uid (caso 2)

Se você encontrar as tarefas em `users/<outro-uid>`, dá para copiar o conteúdo do
campo `tasks` (é um JSON em texto) e colar no documento do seu uid pelo próprio
Console. Faça isso com o app **fechado** em todos os aparelhos, senão uma aba
aberta pode sobrescrever de volta.

## Como publicar as correções

O push para o GitHub está bloqueado: a instalação do GitHub App não tem permissão
de escrita neste repositório (`Resource not accessible by integration`). O commit
está feito localmente neste branch. Para liberar, um admin precisa conceder acesso
em https://claude.ai/admin-settings/claude-in-slack — depois disso o push funciona.

Publicando o app (depois que o código chegar na sua máquina):

```bash
firebase use smart-tracker-2eba6
firebase deploy --only hosting        # front-end
firebase deploy --only functions      # push (exige plano Blaze + secret VAPID_PRIVATE)
```

> Se as Cloud Functions nunca foram publicadas, o push com o app fechado nunca
> funcionou. Agora isso não deixa mais você sem aviso nenhum: os avisos locais
> voltaram a rodar mesmo com o push marcado como ativo, usando as mesmas tags do
> servidor — se os dois chegarem juntos, aparece uma notificação só.
>
> Ressalva honesta: a tag só funde notificações que ainda estão **na tela**. O
> aviso local sai na hora e o push do servidor pode chegar até 15 min depois
> (o cron do `alertReminders` roda a cada 15 min); se você já tiver dispensado o
> primeiro, o segundo aparece de novo. Preferi correr o risco de um aviso
> repetido a manter o cenário atual, em que você não recebe nada. Publicando as
> functions o intervalo some na prática.

### Um aparelho antigo pode estar inscrito no papel errado

Todo aparelho já registrado gravou a inscrição de push como `bruno_<uid>`, porque
o `btUserRole` nunca era escrito e caía no default. Se o celular da Clara estiver
assim, ela recebia os push destinados a você. O código corrigido apaga a inscrição
do papel anterior ao registrar a nova — basta cada aparelho abrir o app uma vez
depois do deploy. Dá para conferir na coleção `push_tokens`: deve existir **um**
documento por aparelho, com o papel certo.

## Um ponto que precisa da sua decisão

`getMyRole()` decide quem é quem pelo e-mail: qualquer endereço que **não** contenha
"clara" é tratado como `bruno`. Se o e-mail da Clara não tiver "clara", vocês dois
viram o mesmo papel e o push de "nova tarefa" é enviado para um papel sem nenhum
aparelho inscrito — sai da fila e não chega em ninguém.

Me diga o e-mail da conta dela que eu troco a detecção por uma lista explícita de
e-mails, que é o certo.
