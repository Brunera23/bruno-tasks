// Teste fim-a-fim do pipeline real: cria um doc em push_queue (como o app faz)
// e deixa a Cloud Function processPushQueue enviar o push.
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
  const doc = {
    fields: {
      targetRole: { stringValue: 'bruno' },
      title: { stringValue: 'Teste da fila ✅' },
      body: { stringValue: 'Pipeline completo OK — ' + new Date().toLocaleTimeString('pt-BR') },
      sentBy: { stringValue: 'diagnostico' },
      processed: { booleanValue: false },
      createdAt: { timestampValue: new Date().toISOString() }
    }
  };
  const r = await req('POST', base + '/push_queue', tok, doc);
  console.log('push_queue criado:', r.status, r.status === 200 ? JSON.parse(r.body).name.split('/').pop() : r.body.slice(0, 200));
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
