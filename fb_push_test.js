// Envia um push de teste real para o token iOS registrado e mostra a resposta crua do FCM
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT = 'smart-tracker-2eba6';

function req(method, url, token, body) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const r = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res({ status: x.statusCode, body: d })); });
    r.on('error', rej);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function accessToken() {
  const candidates = [
    path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA, 'configstore', 'firebase-tools.json')
  ];
  const cfgPath = candidates.find(p => fs.existsSync(p));
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const body = new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    refresh_token: cfg.tokens.refresh_token,
    grant_type: 'refresh_token'
  }).toString();
  return new Promise((res, rej) => {
    const r = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(JSON.parse(d).access_token)); });
    r.on('error', rej); r.write(body); r.end();
  });
}

(async () => {
  const tok = await accessToken();
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const list = await req('GET', base + '/push_tokens?pageSize=10', tok);
  const docs = JSON.parse(list.body).documents || [];
  const iosDoc = docs.find(d => d.fields?.role?.stringValue === 'bruno');
  if (!iosDoc) { console.log('Nenhum token do role bruno encontrado'); return; }
  const fcmToken = iosDoc.fields.token.stringValue;
  console.log('Token alvo:', fcmToken.slice(0, 24) + '... (platform ' + (iosDoc.fields.platform?.stringValue || '?') + ')');

  // mesma forma de mensagem que o functions/index.js envia (data-only + webpush headers)
  const msg = {
    message: {
      token: fcmToken,
      data: {
        title: 'Teste de push ✅',
        body: 'Se você está vendo isso no iPhone, o push funciona! ' + new Date().toLocaleTimeString('pt-BR'),
        tag: 'diag-test',
        click_action: './index.html'
      },
      webpush: { headers: { Urgency: 'high', TTL: '3600' } }
    }
  };
  const send = await req('POST', `https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, tok, msg);
  console.log('FCM status:', send.status);
  console.log('FCM resposta:', send.body);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
