# Notificações (nova tarefa + vencimento) — Setup

O código já está pronto. Faltam só os passos de configuração abaixo para o **push com app fechado** funcionar. Enquanto isso, as notificações com **app aberto** já funcionam após o deploy do front-end (passo 4).

## Visão geral
- **Nova tarefa** → o app grava na fila `push_queue` no Firestore → a Function `processPushQueue` envia o push para o parceiro (funciona com o app dele fechado).
- **Vencimento** → a Function agendada `dueTodayReminder` roda **toda manhã às 08:00 (horário de SP)** e avisa as tarefas que vencem no dia.
- As mensagens são *data-only*; o `sw.js` monta a notificação (sem duplicar).

---

## 1) Gerar a chave VAPID
Firebase Console → ⚙️ **Configurações do projeto** → aba **Cloud Messaging** → **Certificados push da Web** → **Gerar par de chaves** → copie a chave (começa com `B...`).

## 2) Colar a chave no app
No `index.html`, ache a linha:
```js
const VAPID_KEY=''; // >>> COLE AQUI ...
```
e cole entre as aspas:
```js
const VAPID_KEY='BPxAbc123...suachave';
```

## 3) Ativar o plano Blaze
Cloud Functions + Cloud Scheduler exigem o plano **Blaze** (pago por uso, mas com cota gratuita generosa — 2 functions + 1 disparo/dia + alguns pushes ≈ custo zero).
Firebase Console → **Faturamento/Upgrade** → Blaze.

## 4) Deploy
No terminal, dentro da pasta do projeto:
```bash
# Functions (push)
cd functions
npm install
cd ..
firebase login            # se ainda não estiver logado
firebase use smart-tracker-2eba6
firebase deploy --only functions
# (na 1ª vez ele pede para habilitar algumas APIs — aceite)

# Front-end (GitHub Pages) — com a VAPID já colada
git add index.html sw.js firebase.json functions
git commit -m "feat: notificacoes de nova tarefa e vencimento (push FCM)"
git push
```

## 5) Ativar notificações em CADA aparelho
Abra o app → menu **Mais** → tocar em **Notificações** (toggle) → **Permitir**. Isso salva o token FCM no Firestore. Repita no seu celular, no da Clara e no PC.

> **iPhone:** primeiro **Compartilhar → Adicionar à Tela Inicial**, abra pelo ícone instalado e então permita as notificações (precisa iOS 16.4+). Sem instalar como app, o iOS não entrega push com o app fechado.

## 6) Testar
- **Nova tarefa:** com o app da Clara fechado, crie uma tarefa para ela (projeto "Nós") → ela recebe o push. E vice-versa.
- **Vencimento:** crie uma tarefa com vencimento **hoje**. Às 08:00 o lembrete chega. Para testar **na hora**, sem esperar: Google Cloud Console → **Cloud Scheduler** → no job `firebase-schedule-dueTodayReminder-...` clique em **Run now**.

---

## Comportamento atual (ajustável)
- "Nova tarefa" avisa **o parceiro**. Em tarefas do projeto "Nós", respeita a atribuição (quem está marcado em "Atribuído a"). Se quiser limitar só às tarefas compartilhadas, é só pedir.
- "Vencimento" dispara **uma vez**, de manhã, no dia do prazo.
- Tokens inválidos são limpos automaticamente da coleção `push_tokens`.

## Se algo não chegar
- Confirme que a **VAPID** foi colada e o front-end foi re-deployado (passo 4).
- Confirme que cada aparelho **permitiu** notificações (passo 5) — veja a coleção `push_tokens` no Firestore.
- Veja os logs: Firebase Console → **Functions** → Logs (`processPushQueue` / `dueTodayReminder` / `alertReminders`).

---

## Saúde: formulário de Remédio / Consulta / Exame
Na aba **Saúde** agora tem o botão **+ Adicionar** (e o "+" também abre esse formulário quando você está nessa aba).

- **Remédio:** nome, dose, horário e "Lembrar todo dia" → cria um lembrete diário que **notifica no horário** (no celular fechado, via a function `alertReminders`, que roda a cada 15 min).
- **Consulta / Exame:** nome, data, hora, local e médico (opcional) + "Lembrar no dia e na véspera" → a function `dueTodayReminder` (08:00) avisa **no dia e um dia antes**.

Os itens são marcados com `medType` (`med` / `consulta` / `exam`), então a Saúde não depende mais de adivinhar por palavra-chave.

### Sobre a coleção `push_log`
A `alertReminders` grava um doc por lembrete enviado (id `tarefa_data`) para não repetir no mesmo dia. Para não crescer pra sempre, dá pra ligar um **TTL** no Firestore: Console → Firestore → TTL → campo `at` na coleção `push_log` (ex: expira em 7 dias). Opcional.

### Deploy (mesmo de antes — já inclui as 3 functions)
```bash
cd functions && npm install && cd ..
firebase deploy --only functions
git add index.html sw.js firebase.json functions && git commit -m "feat: formulario Saude + lembretes de remedio/exame" && git push
```
